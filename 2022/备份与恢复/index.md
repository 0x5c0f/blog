# Mysql 备份与恢复


# mysql 备份与恢复
数据更新过程，例如 `update` 语句  
1. 写`redo log`，进入 `prepare`阶段(`xtrabackup`备份最低应处于该阶段  )  
2. 写`binlog`落盘  
3. `redo log`完成 `commit`  

## 备份类型 
- 冷备份: 关闭数据，停止业务 
- 温备份: 加锁备份  
- 热备份: 在线备份，不影响业务

## 备份方式 
- 逻辑备份: 基于`sql`语句的备份
  - `mysqldump`: 建库、建表、数据插入语句
  - 基于二进制日志: 数据库的所有变化类的操作 
  - 基于复制的备份: 将二进制日志实时传送到另一台机器并且恢复  
- 物理备份: 
  - `xtrabackup`进行物理备份   
  - 拷贝数据文件(冷备)  

## 备份工具 
###  `mysqldump`  
`mysql`原生自带的逻辑备份工具 

优点是备份结果是sql语句，都是文本格式，便于查看即压缩, 缺点是效率较慢
`mysqldump -A -R --triggers --master-data=2 --single-transaction | gzip > /data/backup_all.sql.gz`  
参数:  
- `-A`: 全库备份(会备份`mysql`库)
  - `mysqldump -uroot -pxxx -A > backup.sql`
- `-B`： 增加建库(`create`)即"`use 库`"的语句，可以直接连接多个库名，同时备份多个库`-B 库1 库2`
- `-R`: 备份存储过程和函数数据  
- `--triggers`: 备份触发器数据 
- `-F`: 在备份是自动刷新一个二进制日志,方便将来二进制日志截取时的起点 
- `--master-data=2`: 告诉你备份时刻的binlog日志位置,一般选择2,以注释形式记录二进制日志的位置  
- `-x, --lock-all-tables`: 锁定所有表(锁表只会影响增删改,不会影响查询),保证整个数据库（所有schema）的数据具有一致性快照,一般不建议使用
- `-l, --lock-tables`: 保证各个`schema`具有数据一致性快照  
- `--single-transaction`: 对`innodb`引擎进行热备  

备份恢复:  
```sql
-- 方法一 
--- mysql -uroot < /data/backup_all.sql
-- 方法二(建议使用)
mysql> set sql_log_bin=0 
mysql> source /data/backup_all.sql 
...

mysql> 
``` 
`mysqldump`备份恢复案例: 
```sql
-- 每天晚上有全备份,第二天早上误删除一个表
-- 恢复思路
--- 1. 断开业务,防止二次伤害(挂出维护页面) 
--- 2. 搭建备用库 
--- 3. 截取昨天晚上全备时间到早上删除之前的日志 
--- 4. 恢复到备用库,验证数据完整性
--- 5. 两种方案恢复前端应用 
---- 5.1. 备用库导出误删表到生产库 
---- 5.2. 直接切换到备用库

-- 具体操作
--- 1. 获取全备时刻的binlog号(:22) 
--- -- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000039', MASTER_LOG_POS=183021;
--- 2. 截取binlog从全备到删除时刻的binlog号   此处不能和前面交错截取，不然可能会出问题
mysql> show binlog events in 'mysql-bin.000002';  -- end: 183014

$> mysqlbinlog --no-defaults --start-position=183021 --stop-position=183014 /data/mysql56/3307/data/mysql-bin/mysql-bin.000039 >> /data/binlog.sql


--- 临时关闭二进制日志信息 
mysql> set sql_log_bin=0
mysql> source /data/backup_all.sql 
mysql> source /data/binlog.sql
mysql> set sql_log_bin=1


--- binlog自动清理 
mysql> show variables like '%expire%';
mysql> set global expire_logs_days=8; -- 一般设置为全备+1天 
-- 永久生效 
-- /etc/my.cnf 
-- expire_logs_days=8 

-- 手动清理二进制文件
mysql> purge binary logs before now() - interval 3 day; -- 3 天前
mysql> purage binary logs to 'mysql-bin.000010'; -- 删除到

-- 不要手动 rm mysql-bin.00000x 文件，否则会出现问题，解决方案 
-- 1. 关闭 my.cnf binlog相关参数，删除mysql-bin.index文件,启动数据库
-- 2. 关闭数据库，开启binlog相关参数，启动数据库

-- 滚动一个新的日志(重启会自动滚动一个日志)  
mysql> flush logs;
```

### `mysqlbinlog`
实现`binlog`备份的原生命令
### `xtrabackup`
`precona`公司开发的性能很高的物理备份工具(热备)   
备份方式:  
1. 拷贝数据文件  
2. 拷贝数据页

备份原理(innoDB): 
1. 对于`innoDB`表,可以实现热备
    - 在数据还有修改操作的时候,直接将数据文件中的数据页备份(应该是相当于磁盘块),此时,备份走的数据对于当前`mysql`来讲是不一致的
    - 将备份过程中的`redo`和`undo`一并备走 
    - 为了恢复的时候,只要保证备份出来的数据页`LSN`能和`redo LSN`匹配,将来恢复的就是一致的数据. `redo`应用和`undo`的应用
2. 对于`myisam`表实现自动说表拷贝文件  


`xtrabackup` 安装使用:
- XtraBackup 2.4/8.0 版本区别  
- 通过查到可知 XtraBackup 2.4 与 8.0 版本备份记录信息有如下不同点：  
  - 2.4 备份生成的 xtrabackup_binlog_info 文件记录的 GTID 信息是准确的，但是备份恢复后 show master status 显示的 GTID 是不准确的；
  - 8.0 备份的实例中只有 InnoDB 表时，xtrabackup_binlog_info 文件记录的 GTID 信息不一定是准确的，但是备份恢复后 show master status 显示的 GTID 是准确的；
  - 8.0 备份的实例中有非 InnoDB 表时，xtrabackup_binlog_info 文件记录的 GTID 信息是准确的，备份恢复后 show master status 显示的 GTID 也是准确的

```bash
# 
$> wget https://downloads.percona.com/downloads/Percona-XtraBackup-2.4/Percona-XtraBackup-2.4.21/binary/redhat/7/x86_64/percona-xtrabackup-24-2.4.21-1.el7.x86_64.rpm

$> yum install -y percona-xtrabackup-24-2.4.21-1.el7.x86_64.rpm

# 备份测试(需指定配置文件my.cnf、用户名、密码) 
$> innobackupex  /data/backup/
/data/backup/
└── 2021-01-19_16-01-57
    ├── mysql
    ├── performance_schema
    ├── test
    ├── testdb01
    ├── testdb02
    └── world

# 全备份，不使用时间戳为备份目录 
$> innobackupex --no-timestamp /data/backup/full 
2 [error opening dir]
/data/backup/full
├── mysql
├── performance_schema
├── test
├── testdb01
├── testdb02
└── world

# 全备恢复示例  
# 1. 恢复数据前的准备(合并xtabackup_log_file和备份的物理文件) 
$> innobackupex --apply-log --use-memory=32M /data/backup/full/
# 2. 模拟故障 (停止数据库，删除数据)
# 3. 恢复数据
## 3.1 直接复制全备数据进去即可(恢复时，需要确认数据路径为空，且数据库必须停止),单库直接复制测试可行   
$> cp -a /data/backup/full/* /data/mysql56/3307/data/ 
## 3.2 命令复制 
$> innobackupex --copy-back /data/backup/full/

# 增量备份
## 增量备份是基于全备开始
## 1. 周一全备 
$> innobackupex --no-timestamp /data/backup/full
## 数据写入 
## 2. 周二增量备份 基于那个全备进行增量备份 
$> innobackupex --incremental --no-timestamp --incremental-basedir=/data/backup/full /data/backup/inc1
## 数据写入
## 3. 周三增量备份 基于那个备份(全备)进行增量备份
$> innobackupex --incremental --no-timestamp --incremental-basedir=/data/backup/inc1 /data/backup/inc2
## 数据损坏,准备恢复 

## 停止数据库 

## 数据恢复  --redo-only: 只将以提交的数据进行合并(除了最后一次不加外,每一次都需要添加)
$> innobackupex --apply-log --redo-only /data/backup/full/
$> innobackupex --apply-log --redo-only --incremental-dir=/data/backup/inc1 /data/backup/full
$> innobackupex --apply-log --incremental-dir=/data/backup/inc2 /data/backup/full
$> innobackupex --apply-log /data/backup/full/

$> innobackupex --copy-back /data/backup/full/

# 单表恢复案例(单库恢复目前查询到的方案是,需要目前库和库中的表结构,然后通过concat批量拼接断开和连接语句然后,按照单表恢复案例批量操作) 
## 误删除数据库中的一个表,需要恢复,不需要恢复整个数据库(或者mysql) 
## 具体操作 
### 1. 删除数据库中的某个表(模拟演示)show bin
### 2. 创建与删除的表结构一模一样的表 
### 3. 删除创建表的表空间数据库文件(*.ibd),此处只能在数据库中的删除 
### select concat('alter table ',table_name,' discard tablespace ;') from information_schema.tables where table_schema='<database_name>' into outfile '/tmp/<database_name>.sql' ;
#### into outfile '/tmp/<database_name>.sql' 
#### 需设置安全路径 /etc/my.cnf:[mysqld] secure-file-priv=/tmp ,重启 
mysql> alter table <table_name> discard tablespace; 
### 4. 复制全备中该删除表的*.ibd文件到mysql对应目录下,注意修正权限 
$> cp /data/backup/full/<database_name>/<table_name>.ibd /path/data/<database_name>/<table_name>.ibd
### 5. 重新连接表空间数据文件 
mysql> alter table <table_name> import tablespace; 
```


