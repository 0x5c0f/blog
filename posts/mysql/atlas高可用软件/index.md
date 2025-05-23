# Mysql Atlas高可用软件


# Atlas

{{< admonition type=tip title="主要功能" open=true >}}
- 读写分离
- 从库负载均衡
- IP 过滤
- SQL 语句黑白名单
- 自动分表
{{< /admonition >}}

> https://github.com/Qihoo360/Atlas

- 接 MHA 高可用集群后，软件也可单独使用
- 注意事项:
  - Atlas 只能运行在 x64 系统上
  - Mysql 版本应大于 5.1,建议使用 5.6 以上

## 安装

```bash
$> yum install Atlas-2.2.1.el6.x86_64.rpm
# 配置文件(可动态修改，不用重启)

$> cd /usr/local/mysql-proxy/conf && cp -v test.cnf instance.cnf
$> vim /usr/local/mysql-proxy/conf/instance.cnf
[mysql-proxy]

# 带#号的为非必需的配置项目
# 管理接口的用户名
admin-username = user

# 管理接口的密码
admin-password = pwd

# Atlas后端连接的MySQL主库的IP和端口，可设置多项，用逗号分隔
## 提供写入服务(一般为主库)的地址，建议VIP的地址
proxy-backend-addresses = 10.0.2.9:3306

#Atlas后端连接的MySQL从库的IP和端口，@后面的数字代表权重，用来作负载均衡，若省略则默认为1，可设置多项，用逗号分隔
## 只读(从库)库的地址
proxy-read-only-backend-addresses = 10.0.2.25:3305@1,10.0.2.27:3305@1

#用户名与其对应的加密过的MySQL密码，密码使用PREFIX/bin目录下的加密程序encrypt加密，下行的user1和user2为示例，将其替换为你的MySQL的用户名和加密密码！
# 此处配的的密码为前端DBA、程序等用户连接mysql的用户名密码，必须在此处声明一下
pwds = user1:+jKsgB3YAG8=, user2:GS+tr4TPgqc=

#设置Atlas的运行方式，设为true时为守护进程方式，设为false时为前台方式，一般开发调试时设为false，线上运行时设为true,true后面不能有空格。
daemon = true

#设置Atlas的运行方式，设为true时Atlas会启动两个进程，一个为monitor，一个为worker，monitor在worker意外退出后会自动将其重启，设为false时只有worker，没有monitor，一般开发调试时设为false，线上运行时设为true,true后面不能有空格。
keepalive = true

#工作线程数，对Atlas的性能有很大影响，可根据情况适当设置
event-threads = 8

#日志级别，分为message、warning、critical、error、debug五个级别
log-level = message

#日志存放的路径
log-path = /usr/local/mysql-proxy/log

#SQL日志的开关，可设置为OFF、ON、REALTIME，OFF代表不记录SQL日志，ON代表记录SQL日志，REALTIME代表记录SQL日志且实时写入磁盘，默认为OFF
## 用于记录实时的sql操作日志，用于审计
#sql-log = OFF

#慢日志输出设置。当设置了该参数时，则日志只输出执行时间超过sql-log-slow（单位：ms)的日志记录。不设置该参数则输出全部日志。
#sql-log-slow = 10

#实例名称，用于同一台机器上多个Atlas实例间的区分
#instance = test

# Atlas监听的工作接口IP和端口
proxy-address = 0.0.0.0:33060

# Atlas监听的管理接口IP和端口
## 用于管理atlas的端口 
admin-address = 0.0.0.0:2345

#分表设置，此例中person为库名，mt为表名，id为分表字段，3为子表数量，可设置多项，以逗号分隔，若不分表则不需要设置该项
#tables = person.mt.id.3

#默认字符集，设置该项后客户端不再需要执行SET NAMES语句
## 此项一定要和数据库字符集一致 
#charset = utf8

#允许连接Atlas的客户端的IP，可以是精确IP，也可以是IP段，以逗号分隔，若不设置该项则允许所有IP连接，否则只允许列表中的IP连接
#client-ips = 127.0.0.1, 192.168.1

#Atlas前面挂接的LVS的物理网卡的IP(注意不是虚IP)，若有LVS且设置了client-ips则此项必须设置，否则可以不设置
#lvs-ips = 192.168.1.1

```
## 基本管理
登陆

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/atlas%E9%AB%98%E5%8F%AF%E7%94%A8%E8%BD%AF%E4%BB%B6/  

