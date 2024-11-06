# Centos7修改网卡名称


{{&lt; admonition type=info open=true &gt;}}
CentOS 7的默认网卡和设备名称都是随机的，根据需要有时候需要修改网卡为以`eth`开头的。以下整理了两种比较靠谱的。  
{{&lt; /admonition &gt;}}


## 1. 安装过程中修改  
在加载镜像后出现安装选项卡的时候，键盘敲击`tab`，打开内核启动选项，增加内核参数 `net.ifnames=0` `biosdevname=0`,回车，然后正常安装即可。
## 2. 安装之后修改 
1. 打开并修改`/etc/sysconfig/network-scripts/ifcfg-ensxxx`中的`name`和`DEVICE`修改为`eth0`,并重命名文件为`ifcfg-eth0`   
2. 修改配置文件`/etc/default/grub`,在`GRUB_CMDLINE_LINUX`这个参数后面添加`net.ifnames=0` `biosdevname=0` ,然后重新重新申城grub配置 `grub2-mkconfig -o /boot/grub2/grub.cfg` ，重启操作系统即可

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/centos7%E4%BF%AE%E6%94%B9%E7%BD%91%E5%8D%A1%E5%90%8D%E7%A7%B0/  

