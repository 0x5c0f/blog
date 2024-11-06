# Mysql安装


# 版本选择  
选择`GA`版本 `6-12` 个月的产品(对于开发来说,单数版本一般为测试版本)

# 编译安装 
```bash
yum install -y ncurses-devel libaio-devel cmake openssl-devel

cmake . -DCMAKE_INSTALL_PREFIX=/opt/software/mysql-5.6.48 \
-DMYSQL_DATADIR=/opt/software/mysql-server/data \
-DMYSQL_UNIX_ADDR=/opt/software/mysql-server/mysql.sock \
-DDEFAULT_CHARSET=utf8 \
-DDEFAULT_COLLATION=utf8_general_ci \
-DWITH_EXTRA_CHARSETS=all \
-DWITH_INNOBASE_STORAGE_ENGINE=1 \
-DWITH_FEDERATED_STORAGE_ENGINE=1 \
-DWITH_BLACKHOLE_STORAGE_ENGINE=1 \
-DWITHOUT_EXAMPLE_STORAGE_ENGINE=1 \
-DWITH_ZLIB=bundled \
-DWITH_SSL=system \
-DENABLED_LOCAL_INFILE=1 \
-DWITH_EMBEDDED_SERVER=1 \
-DENABLE_DOWNLOADS=1 \
-DWITH_DEBUG=0 
```


# 初始化 
## 初始化数据目录
**以下是根据多实例配置来初始化一些信息的,可根据实际情况修改,另外程序是官方的二进制程序,如果是自己编译的,在指定了默认参数的情况下,下列描述的一些问题应该并不存在**  

```ini
# 简单示例
$&gt; mkdir /data/mysql56/3307/{data,logs,tmp} -p    # 注意修正权限

$&gt; cat /data/mysql56/3307/my.cnf    # 示例配置
[client]
default-character-set = utf8mb4
socket = /data/mysql56/3307/mysql.sock

[mysql]
default-character-set = utf8mb4
socket = /data/mysql56/3307/mysql.sock

[mysqld]
port=3307
bind-address = 0.0.0.0
socket = /data/mysql56/3307/mysql.sock
pid-file = /data/mysql56/3307/mysql.pid
basedir = /opt/mysql56
datadir = /data/mysql56/3307/data
tmpdir = /data/mysql56/3307/tmp

log-error=/data/mysql56/3307/logs/mysqld.log
skip-name-resolve
```

## 5.7 
*`5.7`已经没有`mysql_install_db`初始化脚本,现通过`mysqld`进行初始化,其他配置参考`5.6`的配置方案*
&gt; [https://dev.mysql.com/get/Downloads/MySQL-5.7/mysql-5.7.32-linux-glibc2.12-x86_64.tar.gz](https://dev.mysql.com/get/Downloads/MySQL-5.7/mysql-5.7.32-linux-glibc2.12-x86_64.tar.gz)  

```bash
# 建议使用定制的 my.cnf 来进行初始化
# $&gt; /opt/mysql57/bin/mysqld --defaults-file=/data/mysql57/3307/etc/my.cnf --initialize-insecure --user=mysql
$&gt; /opt/mysql57/bin/mysqld \
--initialize-insecure \
--user=mysql \
--basedir=/opt/mysql57 \
--datadir=/data/mysql57/3307/data
```

## 5.6 
&gt; [https://dev.mysql.com/get/Downloads/MySQL-5.6/mysql-5.6.50-linux-glibc2.12-x86_64.tar.gz](https://dev.mysql.com/get/Downloads/MySQL-5.6/mysql-5.6.50-linux-glibc2.12-x86_64.tar.gz)

```bash
# 建议使用定制的 my.cnf 来进行初始化(使用配置文件仍然需要指定basedir路径或者执行时切换到安装目录,他的这个值是从命令行读取的,没有读取到的话,basedir默认为&#39;.&#39;, mysql_install_db:426 行 )
$&gt; cd /opt/mysql56 &amp;&amp; /opt/mysql56/scripts/mysql_install_db --defaults-file=/data/mysql56/3307/etc/my.cnf  --user=mysql

# $&gt; /opt/mysql56/scripts/mysql_install_db --user=mysql --basedir=/opt/mysql56 --datadir=/data/mysql56/3307/data
```

# 启动管理  
```ini
$&gt; /opt/mysql56/bin/mysqld_safe --defaults-file=/data/mysql56/3307/etc/my.cnf   
# 在程序目录下 support-files/mysql.server 为官方的管理脚本， 将其复制到/etc/init.d/下，systemd重载配置后会自动生成对应名字的systemd管理单元 
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/mysql/mysql%E5%AE%89%E8%A3%85/  

