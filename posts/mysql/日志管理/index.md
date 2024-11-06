# Mysql 日志管理


# 1. Mysql 日志管理
## 1.1. 类型
|日志文件|选项|文件名(表名称)|程序|
|-|-|-|-|
|错误|`--log-error`|`host_name.err`|`N/A`|
|常规|`--general_log`|`host_name.log`&lt;br/&gt;`general_log`|`N/A`|
|慢(速)查询|`--slow_query_log`&lt;br/&gt;`--long_query_time`|`host_name-show.log`&lt;br/&gt;`show_log`|`mysqldumpslow`|
|二进制|`--log-bin`&lt;br/&gt;`--expire-logs-days`|`host_name-bin.000001`|`mysqlbinlog`|
|审计|`--audit_log`&lt;br/&gt;`--audit_log_file`|`audit.log`|`N/A`|

## 1.2. 错误日志 
- 配置方法: 
  ```ini
  [mysqld]
  log-error=/var/log/mysql/mysql.log
  ```
- 查看方法  
  - `mysql&gt; show variables like &#39;%log_error%`
- 作用  
  - 记录`mysql`数据库的一般状态及报错信息,是我们对于数据库常规报错处理的常用日志 

## 1.3. 常规日志
- 配置方法  
```ini
[mysqld]
general_log=on
general_log_file=/var/log/mysql/server2.log
```
- 查看方法   
  - `show variables like &#39;%gen%&#39;`  
- 作用  
  - 记录`mysql`所有执行成功的语句,可以作审计用,但很少开启  

## 1.4. 二进制日志(binlog)
- 二进制日志会记录已提交的数据,以`event`的形式记录到二进制文件中,其常用的记录格式有:  
  - `row`: 行模式,即数据行的变化过程,将某一个值修改到另一个值的过程(建议及常用模式)     TODO: mysql 配置文件中是否区分大小写(这个需要根据官方建议核查) 

  - `statement`: 语句模式,直接记录执行过的语句,其优点是记录的数据好分析,数据量级小,比如批量修改,缺点就是记录函数(如:`now()`)类操作不是特别准确(默认模式`show variables like &#39;%binlog_format%&#39; `);   

  - `mixed`: 以上两种的混合模式  

- 开启、关闭及记录格式
```ini

[mysqld]
# 开启
log-bin = /data/mysql56/3307/data/mysql-bin/mysql-bin
binlog_format = row

# 关闭注释上面两个配置即可 
# 临时关闭 set sql_log_bin=0
# 命令行修改 set global binlog_format = &#39;row&#39;

```

- `sync_binlog` 值为`1`时，每次事务提交时就向磁盘进行写入

## 1.5. binlog 管理  
`pos`: 开始位置号
`End_log_pos`: 结束位置号 
- 查看当前所有二进制日志可用信息: `show binary logs; `  
- 当前正在使用的`binlog`日志: `show master status`  
- 查看二进制日志中记录的事件: `show binlog events in &#39;mysql-bin.000002&#39;;`  
```
&#43;------------------&#43;-----&#43;-------------&#43;-----------&#43;-------------&#43;---------------------------------------&#43;
| Log_name         | Pos | Event_type  | Server_id | End_log_pos | Info                                  |
&#43;------------------&#43;-----&#43;-------------&#43;-----------&#43;-------------&#43;---------------------------------------&#43;
| mysql-bin.000004 | 4   | Format_desc | 10        | 120         | Server ver: 5.6.50-log, Binlog ver: 4 |
| mysql-bin.000004 | 120 | Query       | 10        | 192         | BEGIN                                 |
| mysql-bin.000004 | 192 | Table_map   | 10        | 248         | table_id: 72 (test.test_table)        |
| mysql-bin.000004 | 248 | Write_rows  | 10        | 292         | table_id: 72 flags: STMT_END_F        |
| mysql-bin.000004 | 292 | Xid         | 10        | 323         | COMMIT /* xid=36 */                   |
&#43;------------------&#43;-----&#43;-------------&#43;-----------&#43;-------------&#43;---------------------------------------&#43;
```

- 查看二进制文件内容(`mysqlbinlog`可能不会识别`default-character-set=utf8`这个指令,报错为`unknown variable`,解决指定参数`--no-defaults`)    TODO: unknown variable &#39;default-character-set=utf8&#39;(这个不识别就不识别吧,具体不是很清楚,也没有咨询到解决方案)
```bash
# 查看binlog内容(仅包含DDL操作) 
$&gt; /opt/mysql56/bin/mysqlbinlog --no-defaults /data/mysql56/3307/data/mysql-bin/mysql-bin/mysql-bin.000004
# 查看binlog详细内容(注释中包含大概的详细语句)  
$&gt; /opt/mysql56/bin/mysqlbinlog --no-defaults --base64-output=decode-rows -v mysql-bin.000004 
# @1: 代表第一列 @2: 代表第二列 
### INSERT INTO `test`.`test_table`
### SET
###   @1=6
###   @2=&#39;333&#39;
# at 292

# 范围截取 
$&gt; /opt/mysql56/bin/mysqlbinlog --no-defaults --start-position=192 --stop-position=323 --base64-output=decode-rows -v ./data/mysql-bin/mysql-bin.000004

# 导出为数据库可恢复文件(恢复执行 source ./binlog.sql) 
$&gt; /opt/mysql56/bin/mysqlbinlog --no-defaults --start-position=192 --stop-position=323 ./data/mysql-bin/mysql-bin.000004 &gt; ./binlog.sql 


# 刷新日志(重新生成一个binlog日志)  
mysql&gt; flush logs;

# 设置二进制日志保存天数,默认永久保留(建议永久保留) 
mysql&gt; set global expire_logs_days = 90;

# 手动删除(删除3天前)
mysql&gt; purge binary logs before now() - interval 3 day;

# 删除到那个日志文件 
mysql&gt; purge binary logs to &#39;mysql-bin.000020&#39;;
```
## 1.6. 慢日志管理   (my.cnf 中配置无顺序要求)
- `show variables like &#39;%slow%&#39;`   
- `show variables like &#39;%long%`   
- `show variables like &#39;%indexes%&#39;`  
- 查询   
  1. 是将`mysql`服务中影响数据库性能的相关sql语句记录到日志文件中  
  2. 通过对这些特殊的sql语句分析,改进以达到提高数据库性能的目的  
- 设置  
  1. `long_query_time`: 设定慢查询的阀值,超出设定值的sql即被记录到慢查询日志,缺省值为`10s`  
  2. `show_query_log` : 指定是否开启慢查询日志 
  3. `slow_query_log_file`: 指定慢日志文件存放位置,可以为空,系统会给一个缺省的文件`host_name-slow.log`   
  4. `min_examined_row_limit`: 查询检查返回少于改参数指定行的sql不会记录到慢查询日志  
  5. `log_queries_not_using_indexes`: 不使用索引的慢查询日志是否记录到索引  

- `mysqldumpslow`(扩展命令 `mysqlsla`、`pt-query-diagest percona-toolkit`)  
 导出`host_name-slow.log`日志中执行次数最多的前10条数据 
`mysqldumpslow -s c -t 10 host_name-slow.log `
- 导出`host_name-slow.log`日志中平均执行时间的前10条数据 
`mysqldumpslow -s at -t 10 host_name-slow.log`



---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/mysql/%E6%97%A5%E5%BF%97%E7%AE%A1%E7%90%86/  

