# Fedora视频桌面


**！！！终于让我找到了一个视频桌面工具，还是能用的 [`Hidamari`](https://flathub.org/apps/io.github.jeffshee.Hidamari)，三年！你知道这三年我是怎么过的么！！！**
--- 

# -
&emsp;&emsp;想了一下，网络上关于`fedora`桌面的美化似乎还是很少的,这对于我大`fedora`发展似乎是很不利的，凭什么`ubuntu`就可以有那么多的好东西。  

目前正常来说，我们能做的似乎只有简单的修改下壁纸，我记得不知道是那个`fedora`版本，在设置里面就是可以直接设置壁纸轮换的，但是现在似乎没有这个功能了(至少`fedora 32`是不能直接设置轮换了),不过可以通过另外的方式解决。这就是下面要说的第一种美化。 

# 壁纸轮换  
**`Dynamic Wallpaper Editor`这个工具可以通过`gui`界面完成轮换壁纸的设置**  
&emsp;&emsp;壁纸轮换实际上在32中默认不能直接设置了(忘记了以前是不是可以)，但是如果你仔细的话，在设置那儿你可以看到有一个壁纸不一样，那个壁纸右下角有一个表一样的小图标，那个就是一个轮换壁纸，虽然不能直接设置轮换，但gnome仍然是支持的，那个壁纸的配置文件是`/usr/share/backgrounds/gnome/adwaita-timed.xml`,具体引用配置文件的地方是`/usr/share/gnome-background-properties/adwaita.xml`,因此我们只需要按照他的格式配置一个就可以实现壁纸轮换的功能了。  

```xml
$> sudo cp /usr/share/backgrounds/gnome/adwaita-timed.xml /home/cxd/.backgrounds/stars-timed.xml  
$> sudo vim /home/cxd/.backgrounds/stars-timed.xml 

<background>
    <starttime>
        <year>2020</year>
        <month>8</month>
        <day>17</day>
        <hour>1</hour>
        <minute>00</minute>
        <second>00</second>
    </starttime>

    <static>
        <duration>4000.0</duration>
        <file>/home/cxd/.backgrounds/stars/00001.jpg</file>
    </static>
    
    <transition type="overlay">
        <duration>847.0</duration>
        <from>/home/cxd/.backgrounds/stars/00001.jpg</from>
        <to>/home/cxd/.backgrounds/stars/00050.jpg</to>
    </transition>

    <static>
        <duration>4000.0</duration>
        <file>/home/cxd/.backgrounds/stars/00050.jpg</file>
    </static>

</background>
```
&emsp;&emsp;以上是我自己配置的一部分,`static`是指定某一张壁纸展示的时间(秒)和文件位置, `transition`是指定从那一张壁纸轮换到那一张壁纸，轮换需要多少时间(秒),这个设置可以让轮换的时候看起来比较平滑，过渡的时候有点朦胧的感觉。当然也可以不用设置，不过切换的时候感觉有点怪异就是了,另外时间需要总和为`86400`即一天,似乎也可以不用，每怎么详细测试过。 
```xml
$> vim /home/cxd/.backgrounds/stars.xml
<?xml version="1.0"?>
<!DOCTYPE wallpapers SYSTEM "gnome-wp-list.dtd">
<!-- /usr/share/gnome-background-properties -->
<wallpapers>
  <wallpaper deleted="false">
    <name>Default Background</name>
    <filename>/home/cxd/.backgrounds/stars-timed.xml</filename>
    <options>zoom</options>
    <shade_type>solid</shade_type>
    <pcolor>#3465a4</pcolor>
    <scolor>#000000</scolor>
  </wallpaper>
</wallpapers>
$> sudo ln -s /home/cxd/.backgrounds/stars.xml /usr/share/gnome-background-properties/stars.xml # 不行的话直接copy到后面的那个目录里面区就可以了
```
这个配置文件是用来接入系统的，如果你没有分离两个`/usr`和`/home`的话，直接做个软链接应该就可以了，或者直接`copy`到`/usr/share/gnome-background-properties/`里面区也行。 一般上面两步处理完就可以直接在`设置 > 背景` 就可以看到你刚刚配置的那个轮换壁纸了，如果看不到，你可以注销登陆或者`alt+f2`然后输入 `r` 重启 `gnome`也可以。  

&emsp;&emsp;***实际上关于壁纸轮换还有个骚操作，就是用定时任务***
```bash
$> 0 */5 * * * /bin/bash -c 'DISPLAY=:0 GSETTINGS_BACKEND=dconf /usr/bin/gsettings set org.gnome.desktop.background picture-uri "file:///home/<User>/.local/share/backgrounds/0$(shuf -i 0-8 -n 1).png"'
## 需要注意的事，这个切换时间不能太短，否则容易导致桌面崩溃 
```


# 视频壁纸  
> https://www.linuxuprising.com/2019/05/livestream-wallpaper-for-your-gnome.html  

关于视频壁纸，这应该是很多人想要的，但网络上似乎没有很明确的安装方法，以下我根据多方资料整理出来了一个可用的方案.

以下为具体实现:  
- 环境需要  
  - `mplayer`用来播放视频用的   
  - `xwinwrap` 核心工具  
  - `supervisord` 用来管理程序的  
  
`mplayer`需要启用`rpmfusion`库，安装完后直接`dnf`安装就可以了    
```bash
$> sudo dnf install https://mirrors.ustc.edu.cn/rpmfusion/free/fedora/rpmfusion-free-release-38.noarch.rpm
$> sudo dnf install mplayer
```

源码位置:   
>[https://github.com/ujjwal96/xwinwrap#installing](https://github.com/ujjwal96/xwinwrap#installing)  

安装编译: 
```bash
$> git clone https://github.com/r00tdaemon/xwinwrap.git
$> cd xwinwrap

# fedora 38 
$> sudo dnf install libX11-devel libXext-devel libXrender-devel libXrandr-dev gcc -y
$> make 
```

将编译后产生的文件`xwinwrap`复制到`/usr/local/bin/`下，并赋执行权限即可。  

`supervisord` 可以不安装，不装的话`xwinwrap`支持直接以守护进程形式运行。  

以上环境准备完成。下面简述下我的配置。    
`xwinwrap`启动方式(实际命令说明不做说明了，自己`-h`就了解了，东西不多)  
```bash
$> /usr/local/bin/xwinwrap -ni -o 1 -fdt -fs -s -st -sp -b -nf -- mplayer -nolirc -framedrop -nosound -loop 0 -wid WID -quiet /home/cxd/.backgrounds/stars/00000.mp4
```
以上命令终端执行后实际上桌面就已经可以看到效果了  

我的`supervisor`管理配置  
```ini
[program:xwinwrap]
command=/usr/local/bin/xwinwrap -ni -o 1 -fdt -fs -s -st -sp -b -nf -- mplayer -framedrop -nosound -loop 0 -wid WID -quiet /home/cxd/.backgrounds/stars/00000.mp4
directory=/home/cxd/.backgrounds
autostart=false
autorestart=false
user=cxd            # 这个是你当前登陆的用户 
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=/var/log/supervisor/xwinwrap.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=10
environment=DISPLAY=:1      # 注意: 这个极其重要，必须配置，不然他会找不到显示器，不知道可以用env命令查看下对应用的是那个
```

**注：`fedora 32` 默认是`wayland`桌面，`xwinwrap`似乎也是不支持的，需要切换为`X11`** 


文件下载下来后解压到`~/.backgrounds/`下，复制`stars.xml`到`/usr/share/gnome-background-properties/`目录下就可以了，另外里面还包含一个视频。    



---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/fedora%E8%A7%86%E9%A2%91%E6%A1%8C%E9%9D%A2/  

