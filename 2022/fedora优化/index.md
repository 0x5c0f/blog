# FEDORA优化


{{< admonition type=info title="前言" open=true >}}
***以下的一些优化应该是我还在用`fedora26`的时候记录的，虽然现在我已经都更新到`33`了，不过这些优化还是有点用的，可以参考着改, 后续遇到的问题我也在慢慢更新上来***   
{{< /admonition >}}

# 2. 安装鼠标右键“在终端中打开”，33中默认好像已经有了 
```bash
[root@cxd ~]$ sudo dnf install nautilus-open-terminal
```
# 3. 安装 `GNOME-tweak-tool`
```bash
$> sudo dnf install gnome-tweak-tool 
## 扩展库安装
### Dash to dock (可选:Dash to panel)
### system-monitor 
### Recent(Item)s 
### Topicons plus git  
### Drop down terminal
### Clipboard indicator 
### Bottompanel(将任务栏放到下面,与windows list 和 Dash to panel 扩展冲突)


## 扩展字体修正
# Drop down terminal: FONT_NAME_SETTING_KEY == monospace-font-name
# org.gnome.desktop.interface
# gsettings set org.gnome.desktop.interface monospace-font-name 'Source Code Pro 15'

```

# 4. 安装一些好用的额外工具和包
```bash
$> sudo dnf install flameshot  # 火焰截图,很好用,拥有win下面截图软件的一些功能 
$> sudo dnf install audacity   # 声音处理工具,实际好像没啥用   
$> sudo dnf install peek       # gif 图像录制工具 
$> sudo dnf install inkscape       # 矢量图画画工具 
$> sudo dnf install libreoffice-langpack-zh-Hans.x86_64   # libreoffice的中文语言包 
$> sudo pip3 install qtodotxt    # 任务列表
$> sudo pip3 install bpython
# https://linux.cn/article-11434-1.html
# sudo dnf install SDL2 android-tools # 安卓投屏工具 
```

# 5. 安装`ficx`输入法
> https://blog.csdn.net/qq23425352/article/details/107379335
```bash
$> 
$> sudo dnf install fcitx fcitx-{ui-light,qt{4,5},table,gtk{2,3},table-chinese,configtool,sunpinyin}
$> 
```

# 6. `fedroa`下多`jdk`切换方案  
```bash
[cxd@0x5c0f opt]$ sudo update-alternatives --install /usr/bin/java java /opt/jdk1.8.0_121/bin/java 1070
[cxd@0x5c0f opt]$ sudo update-alternatives --install /usr/bin/javac javac /opt/jdk1.8.0_121/bin/javac 1070
[cxd@0x5c0f opt]$ sudo update-alternatives --install /usr/bin/jar jar /opt/jdk1.8.0_121/bin/jar 1070
[cxd@0x5c0f opt]$ sudo update-alternatives --install /usr/bin/javah javah /opt/jdk1.8.0_121/bin/javah 1070
[cxd@0x5c0f opt]$ sudo update-alternatives --install /usr/bin/javap javap /opt/jdk1.8.0_121/bin/javap 1070
[cxd@0x5c0f opt]$ sudo update-alternatives --config java

共有 3 个提供“java”的程序。
  选项 命令
-----------------------------------------------
* 1 java-1.8.0-openjdk.x86_64 (/usr/lib/jvm/java-1.8.0-openjdk-1.8.0.121-10.b14.fc25.x86_64/jre/bin/java)
  2 /opt/jdk1.8.0_121/bin/java

按 Enter 保留当前选项[+]，或者键入选项编号：2
```

# 7. 系统bug优化-显卡  
此方法解决了nouveau 对于nvidia显卡支持不好从而导致了gnome在锁屏状态卡死,从而无法登陆桌面,只能重启操作系统 (双显卡电脑).  
```bash
# 1. 修改文件 /etc/default/grub
# 2. 修改行 GRUB_CMDLINE_LINUX 在末尾添加 nouveau.modeset=0 
# 3. 更新gurb:  grub2-mkconfig -o /boot/grub2/grub.cfg
# 4. 重启 
```

# 8. 系统bug优化-蓝牙 
这也可能不是一个bug,具体问题是蓝牙鼠标连接后一段时间未使用电脑和鼠标,蓝牙将会自动被断开,但系统仍然显示连接中,手动断开后也无法在进行连接,只能删除原有连接然后重新配对, 多次查询相关无果后对蓝牙的相关配置文件进行检查,发现系统设置里面对于蓝牙有`DiscoverableTimeout`这么一个参数,此参数作用是设置蓝牙保持发现的最长时间,默认180秒. 修改此参数后问题解决.  
```python
# 解决方案 
# 1. 修改配置文件 /etc/bluetooth/main.conf
# 2. 修改 DiscoverableTimeout=0 

# 另: fedora官网wiki提供了另一种解决方案,说的大概是大部分的自动断开都是因为蓝牙服务未以守护进程方式运行,解决方案是 
## https://fedoraproject.org/wiki/How_to_debug_Bluetooth_problems#Simple_debugging 
# 1. 修改配置文件 /usr/lib/systemd/system/bluetooth.service
# 2. 修改参数  ExecStart 在末尾添加 -d 

# 重启 systemctl restart bluetooth.service 
```

# 9. systemd 添加后无权限启动问题 .service: Failed to execute command: Permission denied
此问题实际上是由于`selinux`开启`enforcing`(强制模式)导致的,一般的`fedora`用户应该都不会去关闭`selinux`吧，只有在服务器上为了方便才会去关闭,解决这个问题的方法有两种，一种是关闭`selinux`,或者将`selinux`设置为`permissive`(宽容模式),第二种就是直接修正上下文权限为`bin_t`,这个具体可以看下系统中其他可执行文件的上下文权限是什么(`ls -Z`),修改命令是`chcon -t bin_t <binaryfile>`,另外`.service`命名在`systemd`配置目录中了，`systemctl status`时却看不到,也是这个问题，这个问题也是我直接复制`v2ray`的时候发现的，这儿记录下.

# 10. fedora 32 启用 docker  
> https://linux.cn/article-12433-1.html   

# 11. fedora 33 下修改Wayland桌面为x11
```bash
$> vim /etc/gdm/custom.conf
[daemon]
# Uncomment the line below to force the login screen to use Xorg
WaylandEnable=false
DefaultSession=gnome-xorg.desktop
#AutomaticLoginEnable=true
#AutomaticLogin=cxd

```

# 12. fedora 无法连接pptp(已解决) 
原因是防火墙需要开启gre协议放行,以下是firewalld配置，可能linux用户都有这种情况,若其他类型vpn也出现无法连接情况，可能也是这个原因   
```bash
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p gre -j ACCEPT 
firewall-cmd --permanent --direct --add-rule ipv6 filter INPUT 0 -p gre -j ACCEPT 
```

# 13. fedora 升级到指定版本
```bash
## 更新系统
$> sudo dnf upgrade --refresh
## 安装dnf-plugin-system-upgrade包
$> sudo dnf install dnf-plugin-system-upgrade
## 下载最新的 Fedora 更新包
$> sudo dnf system-upgrade download --releasever=35
## 重启升级
$> sudo dnf system-upgrade reboot
```
