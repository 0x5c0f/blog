# Fedora优化


{{< admonition type=info title="前言" open=true >}}

*以下的一些优化应该是我还在用`fedora26`的时候记录的，虽然现在我已经都更新到`33`了，不过这些优化还是有点用的，可以参考着改, 后续遇到的问题我也在慢慢更新上来。* **目前已更新到fedora 38**  
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
### Recent(Item)s (fedora 38 已无，暂为找到替代方案)
### Topicons plus git(fedora 38 已无,切换为 AppIndicator and KStatusNotifierItem Support)
### Drop down terminal(fedora 38 已无)
### Clipboard indicator(可以切换为 Clipboard History 或者 Pano 、 或者使用 copyq (推荐) ) 
### Todo.txt 
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
$> sudo dnf install sleek      # todo 任务(https://github.com/ransome1/sleek)
$> sudo dnf install libreoffice-langpack-zh-Hans.x86_64   # libreoffice的中文语言包 
$> sudo pip3 install bpython

# https://flathub.org/zh-Hans/apps/io.github.flattool.Warehouse             # flatpak 管理工具
# https://flathub.org/zh-Hans/apps/com.github.tchx84.Flatseal               # flatpak 权限管理工具
# https://flathub.org/zh-Hans/apps/io.github.giantpinkrobots.flatsweep      # flatpak 卸载残留清理工具(fedora38下运行不稳定)
```

# 5. 安装`ficx`输入法
> https://blog.csdn.net/qq23425352/article/details/107379335
```bash
$> 
# fcitx 
$> sudo dnf install fcitx fcitx-{ui-light,qt{4,5},table,gtk{2,3},table-chinese,configtool,sunpinyin}
# fcitx5 
$> sudo dnf install fcitx5 fcitx5-{qt{5,6},configtool,gtk{2,3,4},lua,rime,table-extra,table-other,chinese-addons}

$> sudo vim /etc/profile.d/fcitx.sh
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS="@im=fcitx"
# 开机启动项 添加fcitx ，然后重启
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
$> firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 0 -p gre -j ACCEPT 
$> firewall-cmd --permanent --direct --add-rule ipv6 filter INPUT 0 -p gre -j ACCEPT 

# 如果上述配置仍然无效,那么你可能需要在连接高级中勾选"使用点到点加密(MPPE)(P)"选项
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

# 14. fedora下登陆密钥环未被解锁问题
- 默认情况下，系统安装后，密钥环密码和基础帐号安装时候的密码一致，这个东西个人电脑感觉没什么用，可以通过以下方式进行取消
```bash
# fedora 下默认是没有安装seahorse的(本来我原来也没有找到解决方案，无意间测试ubuntu才发现这个)
$> sudo dnf install seahorse
# 活动栏中找到"密码和密钥"(及"seahorse"), 打开后找到登陆, 右键登陆，设置为空密码即可。
```

# 15. `flatpak` 应用如何挂载指定目录到应用环境中 
- 以 [`微信(Universal)`](https://flathub.org/zh-Hans/apps/com.tencent.WeChat) 为例, 由于`flatpak`默认的沙盒保护机制，只有部分目录映射到了沙盒中。根据作者[`(web1n)`](https://github.com/web1n)打包的仓库[`issue #14`](https://github.com/web1n/wechat-universal-flatpak/issues/14)可有多种解决方案，本站仅记录一种，其他请直接查看[`issue #14`](https://github.com/web1n/wechat-universal-flatpak/issues/14)。
```bash
# 安装 Flatseal 
## https://flathub.org/apps/com.github.tchx84.Flatseal 
$> flatpak install flathub com.github.tchx84.Flatseal
```

# 16. fedroa 取消关机时候提示`安装挂起的软件更新`的默认勾选  
```bash
# https://discussion.fedoraproject.org/t/disable-gnome-software-update-notifications/78209/2 
$> gsettings set org.gnome.software allow-updates false
```

# 17. gnome 桌面 alt+tab 切换窗口，浏览器多窗口被视为同一组的问题
- 在系统中的`键盘`-`键盘快捷键`-`导航` 中，将`切换应用程序`的快捷键删了，将`切换窗口`快捷键改为`alt+tab`即可解决 

# 18. fedora 38 没有声音/音频设置
- `OP`电脑体现是, 系统设置里面没有声音设置(应该是看不到输入和输出的设备管理)，蓝牙连接声音传递正常，但无法加减音量, 耳机线连接异常  
- 解决方案: 注释掉 `/etc/pulse/default.pa: 110` 中 `load-module module-suspend-on-idle` , 然后`pulseaudio -k`、`pulseaudio --start` 一下(重启应该也可以), 具体可以看一下 [`https://discussion.fedoraproject.org/t/no-sound-audio-in-fedora-38/81903`](https://discussion.fedoraproject.org/t/no-sound-audio-in-fedora-38/81903)

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/fedora%E4%BC%98%E5%8C%96/  

