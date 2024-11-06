# Sersync实时同步工具


{{&lt; admonition type=info title=&#34;简介&#34; open=true &gt;}}
一个可以实时同步的工具，但不能单独运行，需要配合rsync使用，相当于inotify&#43;rsync,但是比他们效率更高，基于块复制。
{{&lt; /admonition &gt;}}


## 1.1. 程序说明
```
# 文件下载解压后实际上就只有两个文件
.
└── GNU-Linux-x86
    ├── confxml.xml
    └── sersync2
```
## 1.2. 下载
```
# 代码更新地址 
https://code.google.com/archive/p/sersync/downloads
# 下载
wget https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/sersync/sersync2.5.4_64bit_binary_stable_final.tar.gz
```
## 1.3. 规划目录
```bash
mkdir -p /opt/sersync/{bin,logs,etc}
cp  ./GNU-Linux-x86/confxml.xml /opt/sersync/etc
cp ./GNU-Linux-x86/sersync2 /opt/sersync/bin 
```
## 1.4. 参数说明
### 1.4.1. 主程序
```
[root@11 bin]# /opt/sersync/bin/sersync2 -h # 中文帮助文档，很清晰
set the system param
execute：echo 50000000 &gt; /proc/sys/fs/inotify/max_user_watches
execute：echo 327679 &gt; /proc/sys/fs/inotify/max_queued_events
parse the command param
_______________________________________________________
参数-d:启用守护进程模式
参数-r:在监控前，将监控目录与远程主机用rsync命令推送一遍
c参数-n: 指定开启守护线程的数量，默认为10个
参数-o:指定配置文件，默认使用confxml.xml文件
参数-m:单独启用其他模块，使用 -m refreshCDN 开启刷新CDN模块
参数-m:单独启用其他模块，使用 -m socket 开启socket模块
参数-m:单独启用其他模块，使用 -m http 开启http模块
不加-m参数，则默认执行同步程序
________________________________________________________________
```

### 1.4.2. 配置文件
```xml
&lt;!-- 就是一个xml文件 --&gt;
&lt;?xml version=&#34;1.0&#34; encoding=&#34;ISO-8859-1&#34;?&gt;
&lt;head version=&#34;2.5&#34;&gt;
    &lt;host hostip=&#34;localhost&#34; port=&#34;8008&#34;&gt;&lt;/host&gt;
    &lt;debug start=&#34;false&#34;/&gt;
    &lt;fileSystem xfs=&#34;false&#34;/&gt; &lt;!-- xfs 文件系统建议开启 --&gt;
    &lt;filter start=&#34;false&#34;&gt; &lt;!-- start=&#34;true&#34; 开启排除文件,默认关闭,不过开启时第一次不能进行初始同步，可能是bug，也可能本身是这么设定的  --&gt;
		&lt;exclude expression=&#34;(.*)\.svn&#34;&gt;&lt;/exclude&gt;
		&lt;exclude expression=&#34;(.*)\.gz&#34;&gt;&lt;/exclude&gt;
		&lt;exclude expression=&#34;^info/*&#34;&gt;&lt;/exclude&gt;
		&lt;exclude expression=&#34;^static/*&#34;&gt;&lt;/exclude&gt;
		&lt;exclude expression=&#34;(.*)/core\.[0-9]&#43;$&#34;&gt;&lt;/exclude&gt;
    &lt;/filter&gt;
    &lt;inotify&gt;
		&lt;delete start=&#34;true&#34;/&gt;
		&lt;createFolder start=&#34;true&#34;/&gt;
		&lt;createFile start=&#34;true&#34;/&gt;
		&lt;closeWrite start=&#34;true&#34;/&gt;
		&lt;moveFrom start=&#34;true&#34;/&gt;
		&lt;moveTo start=&#34;true&#34;/&gt;
		&lt;attrib start=&#34;false&#34;/&gt;
		&lt;modify start=&#34;false&#34;/&gt;
    &lt;/inotify&gt;

    &lt;sersync&gt;&lt;!-- 实际上就是rsync的命令及相关参数 --&gt;
	&lt;localpath watch=&#34;/data/www&#34;&gt; &lt;!-- 同步的源,本地同步路径 --&gt;
	    &lt;remote ip=&#34;172.16.10.11&#34; name=&#34;demo&#34;/&gt; &lt;!-- ip:rsync 服务的ip name:同步的模块(可跟上目录) --&gt;
	    &lt;!--&lt;remote ip=&#34;192.168.8.39&#34; name=&#34;tongbu&#34;/&gt;--&gt;
	    &lt;!--&lt;remote ip=&#34;192.168.8.40&#34; name=&#34;tongbu&#34;/&gt;--&gt;
	&lt;/localpath&gt;
	&lt;rsync&gt;
	    &lt;commonParams params=&#34;-avz&#34;/&gt;
	    &lt;auth start=&#34;true&#34; users=&#34;rsync_backup&#34; passwordfile=&#34;/etc/rsync.pas&#34;/&gt;
	    &lt;userDefinedPort start=&#34;false&#34; port=&#34;874&#34;/&gt;&lt;!--  port=874 --&gt;
	    &lt;timeout start=&#34;false&#34; time=&#34;100&#34;/&gt;&lt;!-- timeout=100 --&gt;
	    &lt;ssh start=&#34;false&#34;/&gt;
	&lt;/rsync&gt;
	&lt;failLog path=&#34;/opt/sersync/logs/rsync_fail_log.sh&#34; timeToExecute=&#34;60&#34;/&gt;&lt;!--default every 60mins execute once--&gt;
	&lt;crontab start=&#34;false&#34; schedule=&#34;600&#34;&gt;&lt;!--600mins--&gt;
	    &lt;crontabfilter start=&#34;false&#34;&gt;
		&lt;exclude expression=&#34;*.php&#34;&gt;&lt;/exclude&gt;
		&lt;exclude expression=&#34;info/*&#34;&gt;&lt;/exclude&gt;
	    &lt;/crontabfilter&gt;
	&lt;/crontab&gt;
	&lt;plugin start=&#34;false&#34; name=&#34;command&#34;/&gt;
    &lt;/sersync&gt;

    &lt;plugin name=&#34;command&#34;&gt;
	&lt;param prefix=&#34;/bin/sh&#34; suffix=&#34;&#34; ignoreError=&#34;true&#34;/&gt;	&lt;!--prefix /opt/tongbu/mmm.sh suffix--&gt;
	&lt;filter start=&#34;false&#34;&gt;
	    &lt;include expression=&#34;(.*)\.php&#34;/&gt;
	    &lt;include expression=&#34;(.*)\.sh&#34;/&gt;
	&lt;/filter&gt;
    &lt;/plugin&gt;

    &lt;plugin name=&#34;socket&#34;&gt;
	&lt;localpath watch=&#34;/opt/tongbu&#34;&gt;
	    &lt;deshost ip=&#34;192.168.138.20&#34; port=&#34;8009&#34;/&gt;
	&lt;/localpath&gt;
    &lt;/plugin&gt;
    &lt;plugin name=&#34;refreshCDN&#34;&gt;
	&lt;localpath watch=&#34;/data0/htdocs/cms.xoyo.com/site/&#34;&gt;
	    &lt;cdninfo domainname=&#34;ccms.chinacache.com&#34; port=&#34;80&#34; username=&#34;xxxx&#34; passwd=&#34;xxxx&#34;/&gt;
	    &lt;sendurl base=&#34;http://pic.xoyo.com/cms&#34;/&gt;
	    &lt;regexurl regex=&#34;false&#34; match=&#34;cms.xoyo.com/site([/a-zA-Z0-9]*).xoyo.com/images&#34;/&gt;
	&lt;/localpath&gt;
    &lt;/plugin&gt;
&lt;/head&gt;
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/sersync%E5%AE%9E%E6%97%B6%E5%90%8C%E6%AD%A5%E5%B7%A5%E5%85%B7/  

