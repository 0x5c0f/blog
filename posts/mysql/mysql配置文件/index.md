# Mysql配置文件


# 修改配置文件(默认的/etc/my.cnf是mariadb的)
> https://blog.51cto.com/moerjinrong/2092791  


参数优先级: `命令行参数指定` > `配置文件 my.cnf(指定配置文件>数据目录下的配置文件>etc下的配置文件)` > `默认参数`  
## 标签配置分类
标签用某个特定的标签值来表示以下内容针对于某个程序(命令)体现的,一般可分文`[client]`、`[server]`两大类  
- `[client]`: 针对全部客户端 
  - `[mysql]`: 标签下内容针对`mysql`这个程序(命令)来设置的
  - `[mysqladmin]`: ...  
  - `[mysqldump]`: ...   

- `[server]`: 针对全部服务端 
  - `[mysqld_safe]`: 标签下内容针对`mysqld_safe`这个程序(命令)来设置的( ***`mysqld_safe`是用来管理`mysqld`的一个进程，其增加了一些安全特性*** )  
  - `[mysqld]`: 标签下内容针对`mysqld`这个程序(命令)来设置的  

## 配置文件示例
***注意配置文件每行后不能有空格,需直接换行***  
```ini
; 目录结构
; mysqldb
; └── 3306
;     ├── binlog
;     ├── data
;     ├── logs
;     ├── relaylog
;     └── tmp

[client]
port=3306
default_character_set = utf8
socket = /data/mysqldb/3306/mysql.sock
; prompt = '\u@\h [\d] >\_'

[mysqld]
port=3306
bind-address = 0.0.0.0

character_set_server = utf8
collation_server = utf8_general_ci

socket = /data/mysqldb/3306/mysql.sock
pid_file = /data/mysqldb/3306/mysql.pid

; 二进制安装配置
basedir = ${MYSQL_BIN_DIR}
datadir = /data/mysqldb/3306/data
tmpdir = /data/mysqldb/3306/tmp

; 存在大量提交时建议关闭提交(默认开启)
autocommit=on

; 第一个ibdata 必定是一个固定大小的，若在启动后修改，则需要设置与实际大小一致，不能多也不能少，第二个则不受限制(默认是下12M)
innodb_data_file_path=ibdata1:512M;ibdata2:512M:autoextend

; 常规日志，记录所有成功的语句(默认关闭,不建议开启)
general_log=off
general_log_file=/data/mysqldb/3306/logs/server2.log

; 错误日志,记录数据库的一般状态及报错信息,是我们对于数据库常规报错处理的常用日志
log_error=/data/mysqldb/3306/logs/mysqld.log

; 禁用dns解析(只能使用ip)
skip_name_resolve

; 二进制日志控制 start
; 建议设置全备+1天
; expire_logs_days = 8

; 各个节点不一样 
server_id = $((RANDOM % (65535 - 1) + 1))

; sync_binlog 为1时, 每次提交都会向磁盘中写入数据(bin-log目录最好和数据目录分开),最安全但是性能损耗最大,不建议开启 
sync_binlog=0

master_info_repository=TABLE
log_bin = /data/mysqldb/3306/binlog/mysql-bin
binlog_format = row

; 关闭relay_log 自动清理功能 
relay_log_purge = 0
relay_log_info_repository=TABLE
relay_log = /data/mysqldb/3306/relaylog/mysql-relay-bin


; 主从同步重连时间(默认3600s), 从库多长时间未收到主库传来的Binary Logs events后从而判定超时,slaveIO线程重连,越频繁建议设置越小
slave_net_timeout = 5

; 启用GTID,不启用则为普通复制(单节点开启无意义) 
gtid_mode=on 
; 强制GTID的一致性
enforce_gtid_consistency=true
; slave更新是否记录日志 (多主环境必加) 
log_slave_updates=1
; 二进制日志控制 end

; 打开并记录慢日志
slow_query_log = OFF
slow_query_log_file = /data/mysqldb/3306/logs/slow.log
; 设定超过多少时间(s)的sql会被记录,一般不会超过1秒
long_query_time = 0.5
; 不使用索引的慢查询日志是否记录到索引
log_queries_not_using_indexes = on
; 查询结果小于多少行的将不会记录,此参数需要参考者设置  
; min_examined_row_limit=100

; 0: 区分大小写(linux默认) 1: 不区分大小写(windows默认) 2: 存储时区分，但比较时不区分(mac默认)
lower_case_table_names = 0

; mysql 优化 start
open_files_limit = 65535

thread_cache_size = 256

tmp_table_size = 256M
max_heap_table_size = 64M 

innodb_flush_log_at_trx_commit = 2

; fix: Got an error reading communication packets 
max_allowed_packet = 16M

; 以下参数请根据实际内存和CPU情况调整
; INITMEMORY: 系统总内存大小 (MB)
; INITCPU: 系统总CPU个数

; 以下信息根据云数据库高性能模板统计而来 
; INITMEMORY 为 MB 、INITCPU 为 个
; 范围应在 [{INITMEMORY*262144}-{INITMEMORY*943718}] 单位字节
innodb_buffer_pool_size = $((${INITMEMORY} * 786432))

; {MIN(INITMEMORY/2000,16)}
innodb_buffer_pool_instances = $((${INITMEMORY} / 2000 < 16 ? ${INITMEMORY} / 2000 : 16))

; {MAX(INITCPU/2,4)}	
innodb_read_io_threads = $(($INITCPU / 2 < 4 ? 4 : $INITCPU / 2))

; {MAX(INITCPU/2,4)}	
innodb_write_io_threads = $(($INITCPU / 2 < 4 ? 4 : $INITCPU / 2))

; {MIN(INITMEMORY*128,262144)}	
join_buffer_size = $((${INITMEMORY} * 128 < 262144 ? ${INITMEMORY} * 128 : 262144))

; {MIN(INITMEMORY/4+500,100000)}	 
max_connections = $((${INITMEMORY} / 4 + 500 < 100000 ? ${INITMEMORY} / 4 + 500 : 100000))

; {MAX(INITMEMORY*512/1000,2048)}	
table_definition_cache = $((${INITMEMORY} * 512 / 1000 > 2048 ? ${INITMEMORY} * 512 / 1000 : 2048))

; {MAX(INITMEMORY*512/1000,2048)}	
table_open_cache = $((${INITMEMORY} * 512 / 1000 > 2048 ? ${INITMEMORY} * 512 / 1000 : 2048))

; {MIN(INITMEMORY/1000,16)}	
table_open_cache_instances = $((${INITMEMORY} / 1000 < 16 ? ${INITMEMORY} / 1000 : 16))

; mysql 优化 end


[mysqldump]
quick
max_allowed_packet = 128M
; mysqldump -uroot -p -A -R --triggers --master-data=2 --single-transaction|gzip > /backup/all_\$(date +"%F-%T").sql.gz 
; mysqldump -q -uroot --set-gtid-purged=OFF --master-data=2 --default-character-set=utf8 --single-transaction -R -E -B database | gzip > database_\$(date +"%F-%T").sql.gz
; ignore-table=database.table
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/mysql%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6/  

