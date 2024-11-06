# Mysql命令收集


# DBA 账号授权
```sql
GRANT ALL PRIVILEGES ON *.* TO &#39;root&#39;@&#39;ip&#39;  Identified by &#34;密码&#34; WITH GRANT OPTION;
```

# 检测mysql server是否正常提供服务
```bash
mysqladmin -u sky -ppwd -h localhost ping
```

# 获取mysql当前的几个状态值
```bash
mysqladmin -u sky -ppwd -h localhost status
```

# 获取数据库当前的连接信息
```bash
mysqladmin -u sky -ppwd -h localhost processlist
```

# 获取当前数据库的连接数
```bash
mysql -u root -ppwd -BNe &#34;select host,count(host) from processlist group by host;&#34; information_schema
```

# 显示mysql的uptime
```bash
mysql -e&#34;SHOW STATUS LIKE &#39;%uptime%&#39;&#34;|awk &#39;/ptime/{ calc = $NF / 3600;print $(NF-1), calc&#34;Hour&#34; }&#39;
```

# 查看数据库的大小
```bash
mysql -u root -ppwd-e &#39;select table_schema,round(sum(data_length&#43;index_length)/1024/1024,4) from information_schema.tables group by table_schema;&#39;
```

# 查看某个表的列信息
```bash
mysql -u &lt;user&gt; --password=&lt;password&gt; -e &#34;SHOW COLUMNS FROM &lt;table&gt;&#34; &lt;database&gt; | awk &#39;{print $1}&#39; | tr &#34;\n&#34; &#34;,&#34; | sed &#39;s/,$//g&#39;
```

# 执行mysql脚本
```bash
mysql -u user-name -p password &lt; script.sql
```

# mysql进程监控
```bash
ps -ef | grep &#34;mysqld_safe&#34; | grep -v &#34;grep&#34;
ps -ef | grep &#34;mysqld&#34; | grep -v &#34;mysqld_safe&#34;| grep -v &#34;grep&#34;

```

# 查看当前数据库的状态
```bash
mysql -u root -ppwd -e &#39;show status&#39;

```

# mysqlcheck 工具程序可以检查(check),修 复( repair),分 析( analyze)和优化(optimize)MySQL Server 中的表
```bash
mysqlcheck -u root -ppwd --all-databases
```

# mysql qps查询  QPS = Questions(or Queries) / Seconds
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Questions&#34;&#39;
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Queries&#34;&#39;
```

# mysql Key Buffer 命中率  key_buffer_read_hits = (1 - Key_reads / Key_read_requests) * 100%  key_buffer_write_hits= (1 - Key_writes / Key_write_requests) * 100%
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Key%&#34;&#39;
```

# mysql Innodb Buffer 命中率  innodb_buffer_read_hits=(1-Innodb_buffer_pool_reads/Innodb_buffer_pool_read_requests) * 100%
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Innodb_buffer_pool_read%&#34;&#39;
```

# mysql Query Cache 命中率 Query_cache_hits= (Qcache_hits / (Qcache_hits &#43; Qcache_inserts)) * 100%
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Qcache%&#34;&#39;
```

# mysql Table Cache 状态量
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Open%&#34;&#39;
```

# mysql Thread Cache 命中率  Thread_cache_hits = (1 - Threads_created / Connections) * 100%  正常来说,Thread Cache 命中率要在 90% 以上才算比较合理。
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Thread%&#34;&#39;  
```

# mysql 锁定状态:锁定状态包括表锁和行锁两种,我们可以通过系统状态变量获得锁定总次数,锁定造成其他线程等待的次数,以及锁定等待时间信息
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;%lock%&#34;&#39;
```

# mysql 复制延时量 在slave节点执行
```bash
mysql -u root -ppwd -e &#39;SHOW SLAVE STATUS&#39;
```

# mysql Tmp table 状况 Tmp Table 的状况主要是用于监控 MySQL 使用临时表的量是否过多,是否有临时表过大而不得不从内存中换出到磁盘文件上
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Created_tmp%&#34;&#39;
```

# mysql Binlog Cache 使用状况:Binlog Cache 用于存放还未写入磁盘的 Binlog 信 息 。
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Binlog_cache%&#34;&#39;
```

# mysql nnodb_log_waits 量:Innodb_log_waits 状态变量直接反应出 Innodb Log Buffer 空间不足造成等待的次数
```bash
mysql -u root -ppwd -e &#39;SHOW /*!50000 GLOBAL */ STATUS LIKE &#34;Innodb_log_waits&#39;
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/mysql/mysql%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/  

