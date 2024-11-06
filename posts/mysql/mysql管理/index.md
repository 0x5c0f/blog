# Mysql管理


# 用户管理 
```sql
-- 授权语法
mysql&gt; grant &lt;权限&gt; on &lt;库名.表名&gt; to &lt;用户名&gt;@&#39;&lt;可连接主机(名|ip)&gt;&#39; identified by &#39;&lt;密码&gt;&#39;;
-- 权限: SELECT,INSERT,UPDATE,DELETE,CREATE,DROP,RELOAD,SHUTDOWN,PROCESS,FILE,REFERENCES,INDEX,ALTER,SHOW DATABASES,SUPER,CREATE TEMPORARY TABLES,LOCK TABLES,EXECUTE,REPLICATION SLAVE,REPLICATION CLIENT,CREATE VIEW,SHOW VIEW,CREATE ROUTINE,ALTER ROUTINE,CREATE USER,EVENT,TRIGGER,CREATE TABLESPACE 
-- 用户创建
mysql&gt; create user monitor@&#39;10.0.2.2%&#39; identified by &#39;Aa@@123456&#39;;

-- 用户授权: 授权后用户也可以创建数据库,但仅限创建授权了的库.
mysql&gt; grant SELECT,INSERT,UPDATE,DELETE,CREATE,DROP on testdb.* to monitor@&#39;10.0.2.26&#39;; 

-- 用户删除
mysql&gt; drop user root@&#39;node26&#39;;
mysql&gt; drop user &#39;&#39;@&#39;node26&#39;;

-- 查询用户权限
mysql&gt; show grants for root@&#39;localhost&#39;;

-- 取消权限
mysql&gt; revoke create,drop on testdb.* from monitor@&#39;10.0.2.26&#39;;
mysql&gt; revoke all on testdb.* from monitor@&#39;10.0.2.26&#39;;

```


# 操作方式
## 分类
- `DDL`:  数据定义语言
 - `alert`
 - 库定义: 创建库定义
 - 开发规范: 
    1. 库名不能出现大写(`win`和`linux`区分大小写)
    2. 库名不能以数字开头
    3. 库名要和有业务功能相关 
    4. 建库要加字符集 
    

- `DCL`:  数据控制语言
  - `grant`/`revoke` 
- `DML`:  数据操作语言
  - `insert`/`update`/`delete` 
- `DQL`:  数据查询语言
  - `select` 

帮助命令: `mysql&gt; help create database`
- 常用的`show`语句  
```sql
-- 显示所有数据库
show databases;
-- 显示当前数据库中的默认表
show tables;
-- 显示指定数据库中的表信息
show tables from world;
-- 显示表列结构
show columns from world.city;
-- 显示表中有关索引和索引列的信息
show index from world.city;
-- 显示可用字符集和默认校验规则
show character set;
-- 显示可用校验规则
show collation;
-- 显示数据库状态
show status;
-- 显示数据库中的参数定义值
show variables
```

- 非交互式   
`$&gt; mysql -u&lt;用户名&gt; -p&lt;密码&gt; -e &#34;select user,host,password from mysql.user&#34; `
- 交互式 - SQL结构化的查询语言   
`$&gt; mysql -u&lt;用户名&gt; -p&lt;密码&gt; `  
`mysql&gt; show databases;`  
- `\G`: 将数据转`key-value`的形式显示,`table_name:value`,`\G`时不能使用 ; 结  尾   
`mysql&gt; show databases\G`  

- 记录操作日志到某个文件(类似script和screen记录日志的功能)  
`mysql&gt; tee /tmp/test.log`  
`mysql&gt; show databases;`  

- 结束上一条命令(正常情况下mysql&gt; 下不能使用ctrl&#43;c)  
`mysql&gt; sssss\c`  

- 查看当前数据库基本状态   
`mysql&gt; \s     # status`   

- 执行外部sql脚本  
`mysql&gt; source &lt;filename&gt;    # \. &lt;filename&gt;`  

- 切换到某一个数据库   
`mysql&gt; use mysql  # \u mysql`  

- 创建数据库 `character set`: 字符集  `collate`: 校验规则   
`mysql&gt; create {database|schema} testdb02 default {charset|character set} utf8 collate utf8_bin;`  

- 查询建库语句   
`mysql&gt; show create {database|schema} testdb02;`  

- 修改数据库字符集(修改时需要注意,字符集一定是从小往大改,后者必定是前者的严格超集,一般生产不建议改动,如`uft8`可以改成`utf8mb4`)  
`mysql&gt; alter {database|schema} testdb02 {charset|character set} utf8mb4; # collate utf8mb4_bin`

- 修改数据库表字符集   
`mysql&gt; alter table t1 character set latin1`

- 删除数据库   
`mysql&gt; drop {database|schema} testdb02;`   

---
- 创建表  
`mysql&gt; create table t1(id int(10))engine=innodb charset=utf8;`   
`mysql&gt; create table t1 like t2`
`mysql&gt; create table t1_bak select * from t1` # 忽略外键/主键    


- 修改表名  
`mysql&gt; rename table t1 to student;`  
`mysql&gt; alter table student rename to stu;`  

- 查看建表语句  
`mysql&gt; show create table stu;`   

- 添加列  
`mysql&gt; alter table stu add c1 int,add num int;`   
- 在指定列后添加列  
`mysql&gt; alter table stu add stuid int after id;`   
- 添加列到最前  
`mysql&gt; alter table stu add sid int first;`  
- 删除列  
`mysql&gt; alter table stu drop stuid;`  
- 修改列(可同时修改数据类型)  
`mysql&gt; alter table stu change c1 stu_name varchar(12);`  
- 修改列  
`mysql&gt; alter table stu modify stu_name varchar(33);`  
- 查看列结构  
`mysql&gt; desc stu;`  
- 删除表  
`mysql&gt; drop table stu;`  

- 查看`mysql`支持的字符集和校验规则
`show CHARACTER set`
`show collation`

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/mysql%E7%AE%A1%E7%90%86/  

