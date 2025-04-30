# Cobbler无人值守安装


{{< admonition type=quote title="文章来源" open=true >}}
> [https://www.linuxprobe.com/cobbler-installation-server.html](https://www.linuxprobe.com/cobbler-installation-server.html)
{{< /admonition >}}

# 1. Cobbler 运行流程

- Server 端：  
    - 第一步：启动 Cobbler 服务  
    - 第二步：进行 Cobbler 错误检查，执行 Cobbler check 命令  
    - 第三步：进行配置同步，执行 Cobbler sync 命令  
    - 第四步：复制相关启动文件文件到 TFTP 目录中  
    - 第五步：启动 DHCP 服务，提供地址分配  
    - 第六步：DHCP 服务分配 IP 地址  
    - 第七步：TFTP 传输启动文件  
    - 第八步：Server 端接收安装信息  
    - 第九步：Server 端发送 ISO 镜像不 Kickstart 文件  

- Client 端：
    -  第一步：客户端以 PXE 模式启动  
    -  第二步：客户端获取 IP 地址  
    -  第三步：通过 TFTP 服务器获取启动文件  
    -  第四步：进入 Cobbler 安装选择界面  
    -  第五步：客户端确定加载信息  
    -  第六步：根据配置信息准备安装系统  
    -  第七步：加载 Kickstart 文件  
    -  第八步：传输系统安装的其它文件  
    -  第九步：进行安装系统   

# 2. 搭建 Cobbler 无人值守安装服务器 
## 2.1. 安装配置 Cobbler

### 2.1.1. 首先安装 epel-release，Cobbler 和 tftp-server 在 base 源中是没有的  
```bash
$> yum install -y epel-release
```

### 2.1.2. 安装 Cobbler 其实有一部分软件会被当做依赖进行安装上去，比如 tftp 和 httpd 服务，我们这里为了方便可以一并安装，避免后续出现相关问题。  
```bash
$> yum install -y cobbler cobbler-web dhcp tftp-server pykickstart httpd rsync xinetd 
```
**注意: 必须把yum源配好，否则无法全部安装以上软件！**
```bash
$> vim /etc/yum.repos.d/CentOS-Base.repo
#在CentOS-Base.repo配置文件中添加以下源
[aliyun-os]
name=aliyun-os
baseurl=https://mirrors.aliyun.com/centos/7/os/x86_64/
enabled=1
gpgcheck=0

[aliyun-epel]
name=aliyun-epel
baseurl=https://mirrors.aliyun.com/epel/7/x86_64/
enabled=1
gpgcheck=0

[aliyun-extra]
name=aliyun-extra
baseurl=https://mirrors.aliyun.com/centos/7/extras/x86_64/
enabled=1
gpgcheck=0
```

### 2.1.3. 软件作用说明  
```bash
cobbler #Cobbler 程序包
cobbler-web #Cobbler 的 Web 服务包
pykickstart #Cobbler 检查 kickstart 语法错误
httpd #Apache Web 服务
```

### 2.1.4. Cobbler 工作目录介绍
```bash
$> ls /etc/cobbler/
auth.conf         genders.template        named.template  secondary.template  zone.template
cheetah_macros    import_rsync_whitelist  power           settings            zone_templates
cobbler_bash      iso                     pxe             tftpd.template
completions       ldap                    reporting       users.conf
dhcp.template     modules.conf            rsync.exclude   users.digest
dnsmasq.template  mongodb.conf            rsync.template  version
```
```bash
/etc/cobbler # 配置文件目录
/etc/cobbler/settings # Cobbler 主配置文件，这个文件是 YAML 栺式，Cobbler 是 python 写的程序。
/etc/cobbler/dhcp.template # DHCP服务的配置模板
/etc/cobbler/tftpd.template # tftp 服务的配置模板
/etc/cobbler/rsync.template # rsync 服务的配置模板
/etc/Cobbler/iso # iso 模板配置文件目录
/etc/cobbler/pxe # pxe 模板文件目录
/etc/cobbler/power # 电源的配置文件目录
/etc/cobbler/users.conf # Web 服务授权配置文件
/etc/cobbler/users.digest # 用于 Web 访问的用户名密码配置文件
/etc/cobbler/dnsmasq.template # DNS 服务的配置模板
/etc/cobbler/modules.conf # Cobbler 模块配置文件
/var/lib/cobbler # Cobbler 数据目录
/var/lib/cobbler/config # 配置文件
/var/lib/cobbler/kickstarts # 默认存放 kickstart 文件
/var/lib/cobbler/loaders # 存放的各种引导程序
/var/www/cobbler # 系统安装镜像目录
/var/www/cobbler/ks_mirror # 导入的系统镜像列表
/var/www/cobbler/images # 导入的系统镜像启动文件
/var/www/cobbler/repo_mirror # yum 源存储目录
/var/log/cobbler # 日志目录
/var/log/cobbler/install.log # 客户端系统安装日志
/var/log/cobbler/cobbler.log # Cobbler 日志
```
### 2.1.5. 首先启动 Cobbler 和 httpd 服务
```bash
$> systemctl start cobblerd httpd
```

### 2.1.6. 检查配置
```bash
$> cobbler check
The following are potential configuration items that you may want to fix:

1 : The 'server' field in /etc/cobbler/settings must be set to something other than localhost, or kickstarting features will not work.  This should be a resolvable hostname or IP for the boot server as reachable by all machines that will use it.
2 : For PXE to be functional, the 'next_server' field in /etc/cobbler/settings must be set to something other than 127.0.0.1, and should match the IP of the boot server on the PXE network.
3 : change 'disable' to 'no' in /etc/xinetd.d/tftp
4 : Some network boot-loaders are missing from /var/lib/cobbler/loaders, you may run 'cobbler get-loaders' to download them, or, if you only want to handle x86/x86_64 netbooting, you may ensure that you have installed a *recent* version of the syslinux package installed and can ignore this message entirely.  Files in this directory, should you want to support all architectures, should include pxelinux.0, menu.c32, elilo.efi, and yaboot. The 'cobbler get-loaders' command is the easiest way to resolve these requirements.
5 : enable and start rsyncd.service with systemctl
6 : debmirror package is not installed, it will be required to manage debian deployments and repositories
7 : The default password used by the sample templates for newly installed machines (default_password_crypted in /etc/cobbler/settings) is still set to 'cobbler' and should be changed, try: "openssl passwd -1 -salt 'random-phrase-here' 'your-password-here'" to generate new one
8 : fencing tools were not found, and are required to use the (optional) power management features. install cman or fence-agents to use them

Restart cobblerd and then run 'cobbler sync' to apply changes.
```

以上问题我们需要逐步解决。  

- 问题 1：修改 `server` 地址为 `192.168.1.7`
```bash
$> vim /etc/cobbler/settings
改：390 server: 127.0.1
为：390 server: 192.168.1.7
```
- 问题 2：修改 `next_server` 地址为 `192.168.1.7`
```bash
$> vim /etc/cobbler/settings
改：278 next_server: 127.0.1
为：278 next_server: 192.168.1.7
```
- 问题 3：修改 `tftp` 服务被 `xinetd` 服务管理
```bash
$> vim /etc/xinetd.d/tftp
改：14 disable = yes
为：14 disable = no
顺便修改 xinetd 和 tftpd 服务开机启动
$> systemctl start xinetd tftp && systemctl enable xinetd tftp
```

- 问题 4：下载操作系统引导文件
```bash
$> cobbler get-loaders
task started: 2020-01-04_031204_get_loaders
task started (id=Download Bootloader Content, time=Sat Jan  4 03:12:04 2020)
downloading https://cobbler.github.io/loaders/README to /var/lib/cobbler/loaders/README
downloading https://cobbler.github.io/loaders/COPYING.elilo to /var/lib/cobbler/loaders/COPYING.elilo
downloading https://cobbler.github.io/loaders/COPYING.yaboot to /var/lib/cobbler/loaders/COPYING.yaboot
downloading https://cobbler.github.io/loaders/COPYING.syslinux to /var/lib/cobbler/loaders/COPYING.syslinux
downloading https://cobbler.github.io/loaders/elilo-3.8-ia64.efi to /var/lib/cobbler/loaders/elilo-ia64.efi
downloading https://cobbler.github.io/loaders/yaboot-1.3.17 to /var/lib/cobbler/loaders/yaboot
downloading https://cobbler.github.io/loaders/pxelinux.0-3.86 to /var/lib/cobbler/loaders/pxelinux.0
downloading https://cobbler.github.io/loaders/menu.c32-3.86 to /var/lib/cobbler/loaders/menu.c32
downloading https://cobbler.github.io/loaders/grub-0.97-x86.efi to /var/lib/cobbler/loaders/grub-x86.efi
downloading https://cobbler.github.io/loaders/grub-0.97-x86_64.efi to /var/lib/cobbler/loaders/grub-x86_64.efi
*** TASK COMPLETE ***
```
- 问题 5：修改 `rsyncd` 服务为开机自启动状态并启用它。
```bash
$> systemctl start rsyncd && systemctl enable rsyncd
```

- 问题 6：关于 `debian` 相关部署管理配置，忽略。
```bash
debmirror package is not installed, it will be required to manage debian
deployments and repositories # debmirror 包尚未安装，需要它来管理 debian 部署和存储库
```
- 问题 7：修改操作系统默认密码
```bash
$> openssl passwd -1 -salt 'root' '123456'
$1$root$j0bp.KLPyr.u9kgQ428D10
$> vim /etc/cobbler/settings
改：101 default_password_crypted: "$1$mF86/UHC$WvcIcX2t6crBz2onWxyac."
为：101 default_password_crypted: "$1$root$j0bp.KLPyr.u9kgQ428D10"
注：root 为用户描述，123456 为密码
```

- 问题 8：电源管理相关服务，忽略。
```bash
fencing tools were not found, and are required to use the (optional) power
management features. install cman or fence-agents to use them
```

修改完以上配置就可以检查 `DHCP` 配置了，由于 `Cobbler` 自动管理 `DHCP` 服务，我们只需要修改 `Cobbler` 中的模板配置文件即可。
```bash
$> vim /etc/cobbler/dhcp.template
改：22 option routers 192.168.1.5; #修改默认网关地址
为：22 option routers 192.168.1.1; #以实际的网关为准
改：23 option domain-name-servers 192.168.1.1; #修改 DNS 地址
为：23 option domain-name-servers 114.114.114.114;
如下：

 21 subnet 192.168.1.0 netmask 255.255.255.0 {
 22      option routers             192.168.1.1;
 23      option domain-name-servers 114.114.114.114;
 24      option subnet-mask         255.255.255.0;
 25      range dynamic-bootp        192.168.1.100 192.168.1.254;
 26      default-lease-time         21600;
 27      max-lease-time             43200;
 28      next-server                $next_server;
 ```
**注：配置默认为 `192.168.1.0` 网段，具体要看你的装机 `vlan` 划分，现在是实验环境所以保持配不变。**  
**注：默认网关地址为 `192.168.1.5`，这里需要改成你自己局域网中的网关。**  
`$next_server` 为变量值为我们前面修改的主配置文件中的地址 `192.168.1.7`

### 2.1.7. 修改 Cobbler 管理 dhcp 服务
```bash
$> vim /etc/cobbler/settings
改：242 manage_dhcp: 0
为：242 manage_dhcp: 1
```
### 2.1.8. 同步配置文件，需要先重启 Cobblerd
```bash
$> systemctl restart cobblerd
$> cobbler sync
task started: 2020-01-04_032552_sync
task started (id=Sync, time=Sat Jan  4 03:25:52 2020)
running pre-sync triggers
cleaning trees
removing: /var/lib/tftpboot/grub/images
copying bootloaders
trying hardlink /var/lib/cobbler/loaders/pxelinux.0 -> /var/lib/tftpboot/pxelinux.0
trying hardlink /var/lib/cobbler/loaders/menu.c32 -> /var/lib/tftpboot/menu.c32
trying hardlink /var/lib/cobbler/loaders/yaboot -> /var/lib/tftpboot/yaboot
trying hardlink /usr/share/syslinux/memdisk -> /var/lib/tftpboot/memdisk
trying hardlink /var/lib/cobbler/loaders/grub-x86.efi -> /var/lib/tftpboot/grub/grub-x86.efi
trying hardlink /var/lib/cobbler/loaders/grub-x86_64.efi -> /var/lib/tftpboot/grub/grub-x86_64.efi
copying distros to tftpboot
copying images
generating PXE configuration files
generating PXE menu structure
rendering DHCP files
generating /etc/dhcp/dhcpd.conf
rendering TFTPD files
generating /etc/xinetd.d/tftp
cleaning link caches
running post-sync triggers
running python triggers from /var/lib/cobbler/triggers/sync/post/*
running python trigger cobbler.modules.sync_post_restart_services
running: dhcpd -t -q
received on stdout: 
received on stderr: 
running: service dhcpd restart
received on stdout: 
received on stderr: Redirecting to /bin/systemctl restart dhcpd.service

running shell triggers from /var/lib/cobbler/triggers/sync/post/*
running python triggers from /var/lib/cobbler/triggers/change/*
running python trigger cobbler.modules.manage_genders
running python trigger cobbler.modules.scm_track
running shell triggers from /var/lib/cobbler/triggers/change/*
*** TASK COMPLETE ***
```
注意观察 DHCP 服务是否启动。  
重新检查，剩下 2 个可以忽略的问题。  

```bash
$> cobbler check
The following are potential configuration items that you may want to fix:

1 : debmirror package is not installed, it will be required to manage debian deployments and repositories
2 : fencing tools were not found, and are required to use the (optional) power management features. install cman or fence-agents to use them

Restart cobblerd and then run 'cobbler sync' to apply changes.
```

### 2.1.9. 挂载光驱
```bash
$> mount /dev/sr0 /mnt
```
### 2.1.10. 导入镜像
```bash
$> cobbler import --path=/mnt/ --name=CentOS-7.6 --arch=x86_64
task started: 2020-01-04_033346_import
task started (id=Media import, time=Sat Jan 4 03:33:46 2020)
Found a candidate signature: breed=redhat, version=rhel6
Found a matching signature: breed=redhat, version=rhel6
Adding distros from path /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64:
creating new distro: CentOS-7.6-x86_64
trying symlink: /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64 -> /var/www/cobbler/links/CentOS-7.6-x86_64
creating new profile: CentOS-7.6-x86_64
associating repos
checking for rsync repo(s)
checking for rhn repo(s)
checking for yum repo(s)
starting descent into /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64 for CentOS-7.6-x86_64
processing repo at : /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64
need to process repo/comps: /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64
looking for /var/www/cobbler/ks_mirror/CentOS-7.6-x86_64/repodata/*comps*.xml
Keeping repodata as-is :/var/www/cobbler/ks_mirror/CentOS-7.6-x86_64/repodata
*** TASK COMPLETE ***
```

### 2.1.11. 查看镜像，上面是镜像名称，下面是启动菜单。
```bash
$> cobbler list
distros:
CentOS-7.6-x86_64

profiles:
CentOS-7.6-x86_64
```
### 2.1.12. 同步 Cobbler 配置
```bash
$> systemctl restart cobblerd
$> cobbler sync
```

至此，搭建 Cobbler 无人值守安装服务器完成！


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/cobbler%E6%97%A0%E4%BA%BA%E5%80%BC%E5%AE%88%E5%AE%89%E8%A3%85/  
> 转载 URL: https://www.linuxprobe.com/cobbler-installation-server.html
