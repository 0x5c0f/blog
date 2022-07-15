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

## 配置文件示例(ansible初始化示例)
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
port={{ MYSQL_PORT|default(3306) }}
default-character-set = utf8
socket = {{ DATA_ROOT }}/mysql.sock
; prompt = '\u@\h [\d] >\_'

[mysqld]
port={{ MYSQL_PORT|default(3306) }}
bind-address = 0.0.0.0

character-set-server = utf8
collation-server = utf8_general_ci

socket = {{ DATA_ROOT }}/mysql.sock
pid-file = {{ DATA_ROOT }}/mysql.pid

; 二进制安装配置
basedir = {{ BASEDIR }}
datadir = {{ DATA_ROOT }}/data
tmpdir = {{ DATA_ROOT }}/tmp

; 存在大量提交时建议关闭提交(默认开启)
autocommit=on

; 第一个ibdata 必定是一个固定大小的，若在启动后修改，则需要设置与实际大小一致，不能多也不能少，第二个则不受限制(默认是下12M)
innodb_data_file_path=ibdata1:512M;ibdata2:512M:autoextend

; 常规日志，记录所有成功的语句(默认关闭,不建议开启)
general_log=off
general_log_file={{ DATA_ROOT }}/logs/server2.log

; 错误日志,记录数据库的一般状态及报错信息,是我们对于数据库常规报错处理的常用日志
log-error={{ DATA_ROOT }}/logs/mysqld.log

; 禁用dns解析(只能使用ip)
skip-name-resolve

; 二进制日志控制 start
; 建议设置全备+1天
; expire_logs_days = 8

; 各个节点不一样 
server_id = {{ 65535 |random(1,9) }}

; sync_binlog 为1时, 每次提交都会向磁盘中写入数据(bin-log目录最好和数据目录分开),最安全但是性能损耗最大,不建议开启 
sync_binlog=0

master_info_repository=TABLE
log-bin = {{ DATA_ROOT }}/binlog/mysql-bin
binlog_format = row

; 关闭relay_log 自动清理功能 
relay_log_purge = 0
relay_log_info_repository=TABLE
relay-log = {{ DATA_ROOT }}/relaylog/mysql-relay-bin


; 主从同步重连时间(默认3600s)，从库多长时间未收到主库传来的Binary Logs events后从而判定超时,slaveIO线程重连,越频繁建议设置越小
slave_net_timeout = 5

; 启用GTID,不启用则为普通复制(单节点开启无意义) 
gtid-mode=on 
; 强制GTID的一致性
enforce-gtid-consistency=true
; slave更新是否记录日志 (多主环境必加) 
log-slave-updates=1
; 二进制日志控制 end

; 打开并记录慢日志
slow_query_log = OFF
slow_query_log_file = {{ DATA_ROOT }}/logs/slow.log
; 设定超过多少时间(s)的sql会被记录,一般不会超过1秒
long_query_time = 0.5
; 不使用索引的慢查询日志是否记录到索引
log_queries_not_using_indexes = on
; 查询结果小于多少行的将不会记录,此参数需要参考者设置  
; min_examined_row_limit=100


; mysql 优化 start
open_files_limit = 65535

; mysql 优化 end

[mysqldump]
quick
max_allowed_packet = 128M
; mysqldump -uroot -p -A -R --triggers --master-data=2 --single-transaction|gzip > /backup/all_$(date +"%F-%T").sql.gz 
; ignore-table=database.table
```
