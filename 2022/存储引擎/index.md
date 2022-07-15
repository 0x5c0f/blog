# Mysql 存储引擎


# 1. mysql 存储引擎  
## 1.1. 引擎分类 
可以表述为`mysql`的`'文件系统'`, 存储引擎可以针对单表来进行设置。 
`mysql`提供的有(最常用的`InnoDB`、`MyISAM`) :  
- `InnoDB`
- `MyISAM`
- `MEMORY`
- `ARCHIVE`
- `FEDERATED`
- `EXAMPLE`
- `BLACKHOLE`
- `MERGE`
- `NDBCLUSTER`
- `CSV `

第三方: 
- `TokuDB`

## 1.2. InnoDB 
```sql
--- 查看默认的数据库引擎 
mysql> select @@default_storage_engine; 

--- 查看当前数据库支持的数据库引擎  
mysql> show engines;

--- 查看某个表所使用的存储引擎  
mysql> show create table city     --- show table status like 'city'\G --- select t.TABLE_NAME,t.TABLE_SCHEMA, t.ENGINE from `TABLES` t where t.TABLE_SCHEMA = 'world'

```
## 1.3. 引擎设置 
1. 编译时直接指定默认的存储引擎   
2. 在启动的配置文件中指定   
```ini
[mysqld]
default-storage-engine=InnoDB 
```
3. 使用`SET`命令为当前客户机会话设置  
```sql
mysql> SET @@storage-engine=InnoDB
```
4. 在建表语句(`CREATE TABLE`)中指定(开发规范)  
```sql
mysql> CREATE TABLE T(I INT) ENGINE = InnoDB 
```

## 1.4. 表空间 
- 共享表空间： 主要存放系统元数据等
- 独立表空间： 主要存放用户数据 

### 1.4.1. 表空间设置
查看: `show variables like 'innodb_data_file_path'`
```ini
[mysqld]
; 第一个ibdata 必定是一个固定大小的，若在启动后修改，则需要设置与实际大小一致，不能多也不能少，第二个则不受限制(默认是下12M)
innodb_data_file_path=ibdata1:512M;ibdata2:512M:autoextend
```

## 1.5. 表空间数据文件
从`5.6`开始，`mysql`会为每个新表配置独立的表空间，设置项为`innodb_file_per_table: ON`,此项修改仅会更改新建表的属性。   
- `*.frm`:  元数据,包含表结构等 
- `*.ibd`:  表的数据文件

## 1.6. 事务ACID
- `Atomic`(原子性): 所有语句作为一个单元全部成功执行或全部取消  
- `Consistent`(一致性): 如果数据库在事务开始时处于一致状态，则在执行改事务期间将保留一致状态。  
- `Isolated`(隔离性): 事务之间互不影响。  
- `Durable`(持久性): 事务成功个完成后，所做的所有更改都会准确的记录在数据库中，所做的更改不会丢失。 

### 1.6.1. 事务(SQL)控制语句
1. 标准的事务语句指的是`DML`语句  

- `BEGIN(START TRANSACTION)`: 开始一个新的事务   
- `COMMIT`： 永久提交当前事务的更改  
- `ROLLBACK`： 回滚当前事务更改   
- `SAVEPOINT`: 分配事务过程中的一个位置，以提供将来引用  
- `ROLLBACK TO SAVEPOINT`: 取消在`SAVEPOINT`之后执行的更改  
- `RELEASE SAVEPOINT`: 删除`SAVEPOINT`标识符  
- `SET AUTOCOMMIT=(OFF|ON)|(0|1)`: 为当前连接启用或禁用`autocommit`模式,默认`ON` ,未提交前其他人不能查看    TODO: 程序是否也需要自动执行commit(如果程序写了事务开始的,那么也需要写结束,那就是和服务器设置没有什么关系)
  - `my.cnf` 修改(存在频繁和大量数据修改时，建议关闭自动提交)  
    ```sh
    [mysqld]
    AUTOCOMMIT=0
    ```
2. 隐式提交   
> https://www.cnblogs.com/kerrycode/p/8649101.html  


- `START TRANSACTION` 
- `SET AUTOCOMMIT = 1`
- `DDL` 
  - `ALTER`、`CREATE`、`DROP`
- `DCL`
  - `GRANT`、`REVOKE`、`SET PASSWORD`
- `锁定语句`
  - `LOCK TABLES`、`UNLOCK TABLES`
- `TRUNCATE TABLE`  
- `LOAD DATA INFILE`  
- `SELECT FOR UPDATE` 


## 1.7. RODO 
- "重做日志",是事务日志的一种 ,在事务`ACID`中,实现的是`"D"`持久化的作用

## 1.8. UNDO 
- "回滚日志",是事务日志的一种,在事务`ACID`中,实现的是`"A"`、"`C`",原子性和一致性的作用

## 1.9. mysql 四种隔离级别
- `READ UNCOMMITTED`
  - 允许事务查看其他事务所进行的未提交更改 
- `READ COMMITTED`
  - 允许事务查看其他事务所进行的已提交更改
- `REPEATABLE READ***`
  - 确保每个事务的`SELECT`输出一致
  - `InnoDB`的默认级别(`show variables like '%iso%'`)
- `SERIALIZABLE`
  - 将一个事务的结果与其他事务完全隔离 

