# Mysql DBA运维(草稿)



# 1. 数据库

## 1.1. 什么是数据库 ？
一个存储数据的仓库  

## 1.2. 数据库种类

### 1.2.1. 关系型数据库  
- 关系型数据库是把复杂的数据结构归结为简单的二元关系(即二维表格形式)，在关系型数据中，对数据的操作几乎全部建立在一个或多个关系表格上，通过对这些关联的表格分类、合并、连接或选取等运算来实现数据的管理。常见的如MySql、Oracle   
- 种类  
    - Oracle  
    - Mysql  
    - Mariadb  
    - Sql Server  
    - Access  


### 1.2.2. 非关系型数据库  
- **非关系型数据库也被成为NoSQL(not only sql)数据库**，是针对特定场景，以高性能和使用便利为目的功能特异化的数据库产品，为了高性能、高并发而生。常见的 Amazon的Dynamo、Apache的HBase、memcache、redis、mongodb  
- 种类  
    - 键值(key-value)存储数据库: 类似java中的map，典型产品memcache、redis  
    - 面向文档的数据库: 典型产品 mongodb  
    - 面向图形数据库  


# 2. mysql 

## 2.1. 优点 
- 性能优越，服务稳定，很少出现异常宕机.  
- 开放源码且无版权制约，自主性及使用成本低。  
- 历史悠久，社区及用户非常活跃，遇到问题，可以寻求帮助。  
- 软件体积小，安装使用简单，且易于维护，安装及维护成本低。  
- 品牌口碑效应，使得企业无需考虑直接用，LAMP、LEMP流行架构。  
- 支持多种操作系统，提供多种api接口，支持多种开发语言  


## 2.2. mysql 分支线 
- 5.0.xx 到 5.1.xx : mysql 最正宗的后代  
- 5.4.xx 到 5.7.xx : 为了整合第三方公司开发的新的存储引擎，以及吸收新的实现算法等重构版本  
- 6.0.xx 到 7.1.xx : 为了集群推广的版本  


## 2.3. 安装  
1. 二进制  
2. 编译安装  


### 2.3.1. mysql 多实例 
就是在一台机器上同时开多个不同端口，同时运行多个mysql服务进程，mysql多实例共享一套安装程序，使用不同的my.cnf，启动程序不同，数据目录不同。从逻辑上来看是各自独立的，他根据配置文i就按的对应设定值，获取服务器相应书灵的硬件资源。 


### 2.3.2. 多实例配置方案 
1. 官网解决方案: 单一配置文件、单一启动程序。 缺点:耦合度太高，一个配置文件不好管理  
示例:  
```ini
[mysqld_multi]
....

[mysqld1]
....

[mysqld2]
....

; 启动执行
; mysqld_multi --config-file=/data/mysql/my_multi.cnf start 1 2 
```

2. 多配置文件，多启动程序部署方案  
示例:
```bash
/data 
| -- 3306   
|   | -- data   <- 3306 实例的数据文件
|   | -- my.cnf <- 3306 实例的配置文件 
|   | -- mysql  <- 3306 示例的启动文件 

| -- 3307   
|   | -- data   <- 3307 实例的数据文件
|   | -- my.cnf <- 3307 实例的配置文件 
|   | -- mysql  <- 3307 示例的启动文件 

```

### 2.3.3. 多实例安装(编译)  

#### 2.3.3.1. 安装 mysql 需要的依赖包  
```bash
[root@00 ~]# yum install ncurses-devel libaio-devel cmake -y 
```

#### 2.3.3.2. 编译 mysql 
官方参数释义: 
> [https://dev.mysql.com/doc/refman/5.6/en/source-configuration-options.html](https://dev.mysql.com/doc/refman/5.6/en/source-configuration-options.html)   


```bash
[root@00 ~]# useradd -s /sbin/nologin -M mysql
[root@00 ~]# wget https://cdn.mysql.com//Downloads/MySQL-5.6/MySQL-5.6.43-1.el7.src.rpm
[root@00 ~]# rpm -ivh MySQL-5.6.43-1.el7.src.rpm 
[root@00 ~]# mv ~/rpmbuild/SOURCES/mysql-5.6.43.tar.gz . 
[root@00 ~]# tar -xzf mysql-5.6.43.tar.gz 
[root@00 ~]# cd mysql-5.6.43 
[root@00 mysql-5.6.43]# cmake . -DCMAKE_INSTALL_PREFIX=/opt/mysql-5.6.43 \
-DMYSQL_DATADIR=/opt/mysql-5.6.43/data \
-DMYSQL_UNIX_ADDR=/opt/mysql-5.6.43/tmp/mysql.sock \
-DDEFAULT_CHARSET=utf8 \
-DDEFAULT_COLLATION=utf8_general_ci \
-DEXTRA_CHARSETS=gbk,gb2312,utf8,ascii \
-DENABLED_LOCAL_INFILE=ON \
-DWITH_INNOBASE_STORAGE_ENGINE=1 \
-DWITH_FEDERATED_STORAGE_ENGINE=1 \
-DWITH_BLACKHOLE_STORAGE_ENGINE=1 \
-DWITHOUT_EXAMPLE_STORAGE_ENGINE=1 \
-DWITHOUT_PARTITION_STORAGE_ENGINE=0 \
-DWITH_FAST_MUTEXES=1 \
-DWITH_ZLIB=bundled \
-DENABLED_LOCAL_INFILE=1 \
-DWITH_READLINE=1 \
-DWITH_EMBEDDED_SERVER=1 \
-DWITH_DEBUG=0 
[root@00 mysql-5.6.43]# ln -s /opt/mysql-5.6.43/ /opt/mysql-server
[root@00 mysql-5.6.43]# cd /opt/mysql-server 
[root@00 mysql-5.6.43]# mkdir /data/mysql/{3306,3307}/data -p 

```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/mysql/mysql-dba%E8%BF%90%E7%BB%B4/  

