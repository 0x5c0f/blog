# Mysql监控指标


# 元数据获取
元数据存储于`information_schema`库中,其作用充当数据库元数据的中央系统信息库,使用表格形式以实现灵活的访问,另外他是`虚拟数据库`,其表非真实表,而是`系统视图`,其根据当前用户的特权动态填充表.只能进行查询.  
|列名|描述|
|-|-|
|table_schema|表所在的库|
|table_name|表名字|
|engine|表的引擎|
|table_rows|表的行数|
|avg_row_length|平均行长度|
|index_length|索引长度|


- 查看字符集默认校验规则 
`SELECT c.CHARACTER_SET_NAME ,c.COLLATION_NAME FROM INFORMATION_SCHEMA.COLLATIONS c WHERE c.IS_DEFAULT  = 'yes';`

- 利用`CONCAT`拼接逐表备份语句
```sql
select concat("mysqldump -uroot --default-character-set=utf8mb4 --single-transaction -R -E " ,t.TABLE_SCHEMA ," ",t.TABLE_NAME ," | gzip > /data/backup/",t.TABLE_SCHEMA ,"_" ,date_format(now(),'%Y%m%d%k%i') ,"/" ,t.TABLE_NAME ,".sql.gz") from information_schema.TABLES t where t.TABLE_SCHEMA = 'mysql' into outfile '/tmp/mysql.sql' ;
-- into outfile '/tmp/mysql.sql' 
-- 需设置安全路径 /etc/my.cnf:[mysqld] secure-file-priv=/tmp ,重启 
```

- 统计每个库下的每个表个数(监控)
```sql
select table_schema,count(table_name) from `TABLES` group by table_schema; 
```

- 统计某个库下的所有表的行数(监控)  
```sql
select table_name,table_rows from tables where table_schema='zabbix'
```

- 统计某个数据库的数据量 
```sql
select table_schema,sum(avg_row_length*table_rows+index_length)/1024/1024 as size_mb from information_schema.tables group by table_schema;

SELECT TABLE_SCHEMA, SUM(DATA_LENGTH)/1024/1024 as size_mb FROM TABLES GROUP BY TABLE_SCHEMA;
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/mysql%E7%9B%91%E6%8E%A7%E6%8C%87%E6%A0%87/  

