# Sersync实时同步工具


{{< admonition type=info title="简介" open=true >}}
一个可以实时同步的工具，但不能单独运行，需要配合rsync使用，相当于inotify+rsync,但是比他们效率更高，基于块复制。
{{< /admonition >}}


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
execute：echo 50000000 > /proc/sys/fs/inotify/max_user_watches
execute：echo 327679 > /proc/sys/fs/inotify/max_queued_events
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
<!-- 就是一个xml文件 -->
<?xml version="1.0" encoding="ISO-8859-1"?>
<head version="2.5">
    <host hostip="localhost" port="8008"></host>
    <debug start="false"/>
    <fileSystem xfs="false"/> <!-- xfs 文件系统建议开启 -->
    <filter start="false"> <!-- start="true" 开启排除文件,默认关闭,不过开启时第一次不能进行初始同步，可能是bug，也可能本身是这么设定的  -->
		<exclude expression="(.*)\.svn"></exclude>
		<exclude expression="(.*)\.gz"></exclude>
		<exclude expression="^info/*"></exclude>
		<exclude expression="^static/*"></exclude>
		<exclude expression="(.*)/core\.[0-9]+$"></exclude>
    </filter>
    <inotify>
		<delete start="true"/>
		<createFolder start="true"/>
		<createFile start="true"/>
		<closeWrite start="true"/>
		<moveFrom start="true"/>
		<moveTo start="true"/>
		<attrib start="false"/>
		<modify start="false"/>
    </inotify>

    <sersync><!-- 实际上就是rsync的命令及相关参数 -->
	<localpath watch="/data/www"> <!-- 同步的源,本地同步路径 -->
	    <remote ip="172.16.10.11" name="demo"/> <!-- ip:rsync 服务的ip name:同步的模块(可跟上目录) -->
	    <!--<remote ip="192.168.8.39" name="tongbu"/>-->
	    <!--<remote ip="192.168.8.40" name="tongbu"/>-->
	</localpath>
	<rsync>
	    <commonParams params="-avz"/>
	    <auth start="true" users="rsync_backup" passwordfile="/etc/rsync.pas"/>
	    <userDefinedPort start="false" port="874"/><!--  port=874 -->
	    <timeout start="false" time="100"/><!-- timeout=100 -->
	    <ssh start="false"/>
	</rsync>
	<failLog path="/opt/sersync/logs/rsync_fail_log.sh" timeToExecute="60"/><!--default every 60mins execute once-->
	<crontab start="false" schedule="600"><!--600mins-->
	    <crontabfilter start="false">
		<exclude expression="*.php"></exclude>
		<exclude expression="info/*"></exclude>
	    </crontabfilter>
	</crontab>
	<plugin start="false" name="command"/>
    </sersync>

    <plugin name="command">
	<param prefix="/bin/sh" suffix="" ignoreError="true"/>	<!--prefix /opt/tongbu/mmm.sh suffix-->
	<filter start="false">
	    <include expression="(.*)\.php"/>
	    <include expression="(.*)\.sh"/>
	</filter>
    </plugin>

    <plugin name="socket">
	<localpath watch="/opt/tongbu">
	    <deshost ip="192.168.138.20" port="8009"/>
	</localpath>
    </plugin>
    <plugin name="refreshCDN">
	<localpath watch="/data0/htdocs/cms.xoyo.com/site/">
	    <cdninfo domainname="ccms.chinacache.com" port="80" username="xxxx" passwd="xxxx"/>
	    <sendurl base="http://pic.xoyo.com/cms"/>
	    <regexurl regex="false" match="cms.xoyo.com/site([/a-zA-Z0-9]*).xoyo.com/images"/>
	</localpath>
    </plugin>
</head>
```
