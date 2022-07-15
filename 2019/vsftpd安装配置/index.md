# Vsftpd安装配置


{{< admonition type=note title="" open=true >}}
文章于最后提交日修改过一次，但没有测试，不知道有没有改错   
{{< /admonition >}}

包含虚拟用户和本地用户配置，另还有一个[`pure-ftp`](#1),据说配置便捷不过没有用过  
此篇内容就是完全的一个个人记录了，其他人估计是看不懂的。  
基础环境:  
- Fedora 25  
- vsftd 3.0.3  

# 1. 安装 vsftpd  
## 1.1. 虚拟用户
```bash
[root@00 ~]# dnf install -y vsftpd 
依赖关系解决。
-----省略部分内容-----
运行事务
  安装: vsftpd-3.0.3-2.fc25.x86_64                                         1/1
  验证: vsftpd-3.0.3-2.fc25.x86_64                                         1/1

已安装:
  vsftpd.x86_64 3.0.3-2.fc25                                                   

完毕！

[root@00 vsftpd]# cp -v /etc/vsftpd/vsftpd.conf /etc/vsftpd/vsftpd.conf.default 
[root@00 vsftpd]# grep -v "#" /etc/vsftpd/vsftpd.conf.default >/etc/vsftpd/vsftpd.conf # 清空文件注释 此步骤可以不做
```

### 1.1.1. 创建虚拟用户配置文件
```bash
[root@00 vsftpd]# cd /etc/vsftpd
[root@00 vsftpd]# vim .vsftpd_login.list #单数行用户名 偶数行密码
vsftpd01
pw01
vsftpd02
pw02
[root@00 vsftpd]# db_load -T -t hash -f .vsftpd_login.list vsftpd_login.db  
# 加密配置文件 (原配置文件.vsftpd_login.list可以删除，但如果该配置的用户名密码比较重要且不可更改，建议保留备份至其他地方或增加000权限，以备后续增删改用户时无法知道原配已配置用户名密码；/usr/bin/db_dump -d a /etc/vsftpd/vsftpd_login.db 可以反向查询密码,注意执行前最好先将db文件备个份,不要问我为什么,当你把参数写错了的时候你就知道了)
[root@00 vsftpd]# file vsftpd_login.db
vsftpd_login.db: Berkeley DB (Hash, version 9, native byte-order)
[root@00 vsftpd]# chmod 600 vsftpd_login.db
```
### 1.1.2. 创建用于FTP服务存储文件的根目录以及虚拟用户映射的系统本地用户   
```bash
[root@00 vsftpd]# useradd -u 1010 -d /var/ftproot -s /sbin/nologin www  # 指定uid是为了sync使用
[root@00 vsftpd]# chmod -Rf 755 /var/ftproot/
[root@00 vsftpd]# ls -ld /var/ftproot/  
drwxr-xr-x. 3 www www 4096 4月  29 11:50 /var/ftproot/  
```
### 1.1.3. 建立用于支持虚拟用户的PAM认证文件 
```bash
[root@00 vsftpd]# cd /etc/vsftpd 
[root@00 vsftpd]# vim /etc/pam.d/vsftpd
auth       required     pam_userdb.so db=/etc/vsftpd/vsftpd_login 
account    required     pam_userdb.so db=/etc/vsftpd/vsftpd_login
[root@00 vsftpd]# vi vsftpd.conf
anonymous_enable=NO
local_enable=YES
write_enable=NO
anon_upload_enable=NO
anon_mkdir_write_enable=NO
anon_other_write_enable=NO
anon_world_readable_only=NO
reverse_lookup_enable=NO
chroot_local_user=YES
allow_writeable_chroot=YES
guest_enable=YES
guest_username=www
pam_service_name=/etc/pam.d/vsftpd
user_config_dir=/etc/vsftpd/user_conf
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
listen=YES
listen_port=21
pasv_min_port=30000
pasv_max_port=30020
use_localtime=YES
data_connection_timeout=180

[root@00 vsftpd]# mkdir /etc/vsftpd/user_conf  
[root@00 vsftpd]# vim ./user_conf/vsftpd01
local_root=/var/ftproot
write_enable=YES
anon_world_readable_only=NO
anon_upload_enable=YES
anon_mkdir_write_enable=YES
anon_other_write_enable=YES
[root@00 vsftpd]# touch ./user_conf/vsftpd02
```
### 1.1.4. 修改selinux安全上下文(如果关闭selinux 忽略此步)
```bash
[root@00 vsftpd]# getsebool -a|grep ftp
ftpd_anon_write --> off
ftpd_connect_all_unreserved --> off
ftpd_connect_db --> off
ftpd_full_access --> off
ftpd_use_cifs --> off
ftpd_use_fusefs --> off
ftpd_use_nfs --> off
ftpd_use_passive_mode --> off
httpd_can_connect_ftp --> off
httpd_enable_ftp_server --> off
tftp_anon_write --> off
tftp_home_dir --> off
[root@00 vsftpd]# setsebool -P ftpd_full_access=on  
```
### 1.1.5. 取消防火墙对于ftp的限制(firewalld ，iptables 请自行参考相关配置) 
```bash
[root@00 ~]# firewall-cmd --add-service=ftp
success 
[root@00 ~]# firewall-cmd --add-service=ftp --permanent
success
```
### 1.1.6. 重启vsftpd
```bash
[root@00 vsftpd]# systemctl restart vsftpd #redhat7.x以下是service vsftpd restart 
[root@00 ~]# systemctl enable vsftpd # 将vsftpd加入开机启动 redhat7.x以下应该是chkconfig vsftpd add 
Created symlink /etc/systemd/system/multi-user.target.wants/vsftpd.service → /usr/lib/systemd/system/vsftpd.service.
```

# 2. 本地用户  
本地用户和虚拟用户的区别只是在于配置文件和建设用户的区别  
## 2.1. 安装vsftpd ：
```bash
[root@cloud ~]# yum install vsftpd
已加载插件：fastestmirror, langpacks
Repository base is listed more than once in the configuration
Repository updates is listed more than once in the configuration
Repository extras is listed more than once in the configuration
Repository centosplus is listed more than once in the configuration
Loading mirror speeds from cached hostfile
 * base: mirrors.cqu.edu.cn
 * extras: mirror.lzu.edu.cn
 * updates: mirrors.sohu.com
正在解决依赖关系
..........省部分内容............
  正在安装    : vsftpd-3.0.2-21.el7.x86_64                                                                                                                                                                     1/1 
  验证中      : vsftpd-3.0.2-21.el7.x86_64                                                                                                                                                                     1/1 
已安装:
  vsftpd.x86_64 0:3.0.2-21.el7   
            
完毕！
[root@cloud ~]# mv /etc/vsftpd/vsftpd.conf /etc/vsftpd/vsftpd.conf.bak  #情况文件注释 此步骤可以不做
[root@cloud ~]# grep -v "#" /etc/vsftpd/vsftpd.conf.bak >/etc/vsftpd/vsftpd.conf # 清空文件注释 此步骤可以不做 
```

### 2.1.1. 修改配置文件
```bash
[root@cloud vsftpd]# cat /etc/vsftpd/vsftpd.conf
anonymous_enable=NO  # 禁止匿名用户登录 
local_enable=YES     # 允许本地用户可登录ftp
write_enable=YES     # 允许上传写入
local_umask=022      #新建文件按权限
dirmessage_enable=NO     #当使用者进入某个目录时，会显示该目录需要的注意内容，显示的档案预设信息是.message
xferlog_enable=YES       # 是否开启上传下载记录
xferlog_file=/var/log/xferlog     # 日志位置
connect_from_port_20=YES          # 启用默认端口
xferlog_std_format=YES            # 好像是分析日志用的，具体不清楚
listen=NO
listen_ipv6=YES
chroot_local_user=YES             #锁定用户在自己的家目录
allow_writeable_chroot=YES        #让用户对主目录拥有可写权限（自2.3.5之后，vsftp增强了安全检查，如果用户被锁定在其主目录下，则该用户的主目录将不再具有写权限）

pam_service_name=vsftpd           # 限制file=/etc/vsftpd/ftpusers(具体文件位置，查看pam中的配置)中用户不允许登录ftp，此设置是在输入密码验证后判定
userlist_enable=YES               #是否允许/etc/vsftpd/user_list 访问vsftpd服务，此设置是在用户输入用户名后判定
tcp_wrappers=YES                  #限制访问（/etc/hosts.allow,/etc/hosts.deny） 
```

### 2.1.2. 修改selinux安全上下文，关闭的就不用管他了
```bash
[root@cloud vsftpd]# getsebool -a|grep ftp
ftpd_anon_write --> off
ftpd_connect_all_unreserved --> off
ftpd_connect_db --> off
ftpd_full_access --> off
ftpd_use_cifs --> off
ftpd_use_fusefs --> off
ftpd_use_nfs --> off
ftpd_use_passive_mode --> off
httpd_can_connect_ftp --> off
httpd_enable_ftp_server --> off
tftp_anon_write --> off
tftp_home_dir --> off
[root@cloud vsftpd]# setsebool -P ftpd_full_access=on   
```

### 2.1.3. 取消防火墙对于ftp的限制  
```bash
[root@cloud vsftpd]# firewall-cmd --add-service=ftp
success 
[root@cloud vsftpd]# firewall-cmd --add-service=ftp --permanent
success 
第五步：建立测试用户
[root@cloud vsftpd]# useradd -d /cloud_data/ftproot/7x24 -s /sbin/nologin 7x24 
```

### 2.1.4. 重启vsftpd并加入开机启动
```bash
[root@cloud vsftpd]# systemctl restart vsftpd #redhat7.x以下是service vsftpd restart 
[root@cloud vsftpd]# systemctl enable vsftpd # 将vsftpd加入开机启动 redhat7.x以下应该是chkconfig vsftpd add 
Created symlink /etc/systemd/system/multi-user.target.wants/vsftpd.service → /usr/lib/systemd/system/vsftpd.service. 
```

# 3. 此处记录下pure-ftp的相关信息,以备查验  

> [https://github.com/jedisct1/pure-ftpd](https://github.com/jedisct1/pure-ftpd)  

## 3.1. 编译参数 
```
PureFTPd有很多的编译配置选项，下面就列出部分主要的配置

--prefix =PREFIX
--with-sysquotas        使用系统磁盘配额 ( 非虚拟) 
--with-altlog           支持选择日志格式( 类似Apache) 
--with-puredb           支持虚拟用户 ( FTP登陆用户而非系统用户) 
--with-extauth          支持扩展验证模块
--with-pam              启用PAM验证支持 ( 默认=禁用) 
--with-cookie           启用Cookie支持 ( -F 选项) 
--with-throttling       支持带宽控制 ( 默认=禁用) 
--with-ratios           支持 上传/ 下载 速度控制
--with-quotas           支持 .ftpquota 文件（指定磁盘配额使用）
--with-ftpwho           支持pure-ftpwho（查看在线用户的程序）
--with-largefile        支持大于2G的文件
--with-welcomemsg       支持 welcome.msg 向后兼容（已经过时）
--with-uploadscript     上传后允许执行外部脚本 ( 测试阶段) 
--with-virtualhosts     在不同的IP地址提供虚拟服务器功能
--with-virtualchroot    允许在chroot 的环境下通过符合连接跳转到外部
--with-diraliases       启用目录别名
--with-nonroot          普通模式或者说是限制模式. 如果你在该服务器上没有root权限
那只有启用该项
--with-peruserlimits    支持每个用户的并发限制
--with-language =        语言支持< english | traditional-chinese | simplified-chinese> 
--with-ldap             在LDAP目录中提供用户数据库
--with-mysql            在MySQL数据库中存放用户数据
--with-pgsql            在PostgreSQL数据库中存放用户数据
```

## 3.2. 配置文件 
```ini
# 限制所有用户在其主目录中

ChrootEveryone yes
 
# 如果前一个指令被设置为了 "no"，下面组的成员(GID)就不受主目录的限制了。而其他的用户还是
# 会被限制在自己的主目录里。如果你不想把任何用户限制在自己的主目录里，只要注释掉 ChrootEveryone
# 和 TrustedGID 就可以了。

# TrustedGID 100

# 兼容ie等比较非正规化的ftp客户端

BrokenClientsCompatibility no

# 服务器总共允许同时连接的最大用户数

MaxClientsNumber 50

# 做为守护(doemon)进程运行(Fork in background)

Daemonize yes

# 同一IP允许同时连接的用户数（Maximum number of sim clients with the same IP address）

MaxClientsPerIP 8

# 如果你要记录所有的客户命令，设置这个指令为 "yes"。
# This directive can be duplicated to also log server responses.

VerboseLog no

# 即使客户端没有发送 '-a' 选项也列出隐藏文件( dot-files )。

DisplayDotFiles yes

# 不允许认证用户 - 仅作为一个公共的匿名FTP。

AnonymousOnly no

# 不允许匿名连接，仅允许认证用户使用。

NoAnonymous no

# Syslog facility (auth, authpriv, daemon, ftp, security, user, local*)
# 缺省的功能( facility )是 "ftp"。 "none" 将禁止日志。

SyslogFacility ftp

# 定制用户登陆后的显示信息（Display fortune cookies）

# FortunesFile /usr/share/fortune/zippy

# 在日志文件中不解析主机名。日志没那么详细的话，就使用更少的带宽。在一个访问量很大 
# 的站点中，设置这个指令为 "yes" ，如果你没有一个能工作的DNS的话。

DontResolve yes

# 客户端允许的最大的空闲时间（分钟，缺省15分钟）

MaxIdleTime 15

# LDAP 配置文件 (参考 README.LDAP)

# LDAPConfigFile /etc/pureftpd-ldap.conf

# MySQL 配置文件 (参考 README.MySQL)

# MySQLConfigFile /etc/pureftpd-mysql.conf

# Postgres 配置文件 (参考 README.PGSQL)

# PGSQLConfigFile /etc/pureftpd-pgsql.conf

# PureDB 用户数据库 (参考 README.Virtual-Users)

# PureDB /etc/pureftpd.pdb

# pure-authd 的socket 路径(参考 README.Authentication-Modules)

# ExtAuth /var/run/ftpd.sock

# 如果你要启用 PAM 认证方式, 去掉下面行的注释。

# PAMAuthentication yes

# 如果你要启用 简单的 Unix系统 认证方式(/etc/passwd), 去掉下面行的注释。

# UnixAuthentication yes

# 请注意，LDAPConfigFile, MySQLConfigFile, PAMAuthentication 和
# UnixAuthentication 这些指令只能被使用一次，不过，他们能被混合在一起用。例如：如果你使用了
# MySQLConfigFile 和 UnixAuthentication，那么 SQL 服务器将被访问。如果因为用户名未找
# 到而使 SQL 认证失败的话，就会在/etc/passwd 和 /etc/shadow 中尝试另外一种认证，如果因
# 为密码错误而使 SQL 认证失败的话，认证就会在此结束了。认证方式由它们被给出来的顺序而被链
# 接了起来。

# 'ls' 命令的递归限制。第一个参数给出文件显示的最大数目。第二个参数给出最大的子目录深度。

LimitRecursion 2000 8

# 允许匿名用户创建新目录？

AnonymousCanCreateDirs no

# 如果系统被 loaded 超过下面的值，匿名用户会被禁止下载。

MaxLoad 4

# 被动连接响应的端口范围。- for firewalling.

# PassivePortRange 30000 50000

# 强制一个IP地址使用被动响应（ PASV/EPSV/SPSV replies）。 - for NAT.
# Symbolic host names are also accepted for gateways with dynamic IP
# addresses.

# ForcePassiveIP 192.168.0.1

# 匿名用户的上传/下载的比率。

# AnonymousRatio 1 10

# 所有用户的上传/下载的比率。
# This directive superscedes the previous one.

# UserRatio 1 10

# 不接受所有者为 "ftp" 的文件的下载。例如：那些匿名用户上传后未被本地管理员验证的文件。

AntiWarez yes

# 客户端登录的时候的默认编码，开启这个选项的话，windows登录时就不会显示不了中文的了

ClientCharset gbk
 
# 服务监听的IP 地址和端口。(缺省是所有IP地址和21端口)

# Bind 127.0.0.1,21

# 匿名用户的最大带宽（KB/s）。

# AnonymousBandwidth 8

# 所有用户的最大带宽（KB/s），包括匿名用户。
# Use AnonymousBandwidth *or* UserBandwidth, both makes no sense.

# UserBandwidth 8

# 新建目录及文件的属性掩码值。<文件掩码>;:<目录掩码>; .
# 177:077 if you feel paranoid.

Umask 133:022

# 认证用户允许登陆的最小组ID（UID） 。

MinUID 100

# 仅允许认证用户进行 FXP 传输。

AllowUserFXP yes

# 对匿名用户和非匿名用户允许进行匿名 FXP 传输。

AllowAnonymousFXP no

# 用户不能删除和写点文件（文件名以 '.' 开头的文件），即使用户是文件的所有者也不行。
# 如果 TrustedGID 指令是 enabled ，文件所属组用户能够访问点文件(dot-files)。

ProhibitDotFilesWrite no

# 禁止读点文件（文件名以 '.' 开头的文件） (.history, .ssh...)

ProhibitDotFilesRead no

# 永不覆盖文件。当上传的文件，其文件名已经存在时，自动重命名，如： file.1, file.2, file.3, ...

AutoRename no

# 不接受匿名用户上传新文件( no = 允许上传)

AnonymousCantUpload no

# 仅允许来自以下IP地址的非匿名用户连接。你可以使用这个指令来打开几个公网IP来提供匿名FTP，
# 而保留一个私有的防火墙保护的IP来进行远程管理。你还可以只允许一内网地址进行认证，而在另外
# 一个IP上提供纯匿名的FTP服务。

#TrustedIP 10.1.1.1


# 如果你要为日志每一行添加 PID 去掉下面行的注释。

# LogPID yes

# 使用类似于Apache的格式创建一个额外的日志文件，如：
# fw.c9x.org - jedi [13/Dec/1975] "GET /ftp/linux.tar.bz2" 200 21809338
# 这个日志文件能被 www 流量分析器处理。

# AltLog clf:/var/log/pureftpd.log


# 使用优化过的格式为统计报告创建一个额外的日志文件。

# AltLog stats:/var/log/pureftpd.log


# 使用标准的W3C格式创建一个额外的日志文件。（与大部分的商业日志分析器兼容）

# AltLog w3c:/var/log/pureftpd.log

# 不接受 CHMOD 命令。用户不能更改他们文件的属性。

# NoChmod yes


# 允许用户恢复和上传文件，却不允许删除他们。

# KeepAllFiles yes


# 用户主目录不存在的话，自动创建。

# CreateHomeDir yes

# 启用虚拟的磁盘限额。第一个数字是最大的文件数。
# 第二个数字是最大的总的文件大小(单位：Mb)。
# 所以，1000:10 就限制每一个用户只能使用 1000 个文件，共10Mb。

# Quota 1000:10

# 如果你的 pure-ftpd 编译时加入了独立服务器( standalone )支持，你能够改变 pid 文件
# 的位置。缺省位置是 /var/run/pure-ftpd.pid 。

# PIDFile /var/run/pure-ftpd.pid

# 如果你的 pure-ftpd 编译时加入了 pure-uploadscript 支持，这个指令将会使 pure-ftpd
# 发送关于新上传的情况信息到 /var/run/pure-ftpd.upload.pipe，这样 pure-uploadscript
# 就能读然后调用一个脚本去处理新的上传。

# CallUploadScript yes

# 这个选项对允许匿名上传的服务器是有用的。当 /var/ftp 在 /var 里时，需要保留一定磁盘空间
# 来保护日志文件。当所在磁盘分区使用超过百分之 X 时，将不在接受新的上传。

MaxDiskUsage 99

# 如果你不想要你的用户重命名文件的话，就设置为 'yes' 。

# NoRename yes

# 是 'customer proof' : 工作区(workaround)反对普通的客户错误，类似于：'chmod 0 public_html' 的错误。
# 那是一个有效的命令，不过，将导致无知的客户所定他们自己的文件，将使你的技术支持忙于愚蠢的的问题中。
# 如果你确信你所有的用户都有基本的Unix知识的话，这个特性将没什么用了。不过，如果你是一个主机提供商
# 的话，启用它。

CustomerProof yes

# 每一个用户的并发限制。只有在添加了 --with-peruserlimits 编译选项进行编译后，这个指令才起
# 作用。(大部分的二进制的发布版本就是例子)
# 格式是 : <每一个用户最大允许的进程>;:<最大的匿名用户进程>;
# 例如： 3:20 意思是同一个认证用户最大可以有3个同时活动的进程。而且同时最多只能有20个匿名用户进程。

# PerUserLimits 3:20
```
