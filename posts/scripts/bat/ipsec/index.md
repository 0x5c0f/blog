# Windows 本地安全策略设置


# 开机临时关闭本地安全策略(防止配置出错，导致无法登录)
{{&lt; highlight batch &gt;}}
netsh ipsec static set policy name=我的规则 assign=n
ping 127.0 -n 300 &gt;nul 2&gt;nul
netsh ipsec static set policy name=我的规则 assign=y
net start  PolicyAgent
{{&lt; /highlight &gt;}}

# 本地安全策略初始化设置脚本
{{&lt; highlight batch &gt;}}
@echo off
title DD-IP策略设置
color 0A
echo 				  一般配置为&#34;1&#34;即可(注:需要主动配置信任的远程ip)
echo                  设置ipsec前首先要关闭系统防火墙。
echo                  windows2003可以停止服务，但是2008下只能关闭，不能停止服务
echo                  确认之后按任意键继续
pause
:menu
cls
echo 1 公网服务器基本配置(基本端口)
echo 2 亚马逊内网网段信任(172.31.0.0/16)
echo 3 lefux机房内部服务器基本配置
echo 4 邮件服务器
echo 5 VPN服务器
echo 6 DNS服务器
echo 7 添加本机IP段
echo 8 FTP对外规则
echo 10 激活策略
echo q 退出
set /p convert=请选择    
if &#34;%CONVERT%&#34;==&#34;1&#34; goto a
if &#34;%CONVERT%&#34;==&#34;2&#34; goto b 
if &#34;%CONVERT%&#34;==&#34;3&#34; goto c
if &#34;%CONVERT%&#34;==&#34;4&#34; goto d 
if &#34;%CONVERT%&#34;==&#34;5&#34; goto e 
if &#34;%CONVERT%&#34;==&#34;6&#34; goto f
if &#34;%CONVERT%&#34;==&#34;7&#34; goto g
if &#34;%CONVERT%&#34;==&#34;8&#34; goto h
if &#34;%CONVERT%&#34;==&#34;10&#34; goto i
if &#34;%CONVERT%&#34;==&#34;q&#34; goto ext
echo 亲，你的选择无效，你只能选择1-10 或者 q才可以哟，再试试吧！
ping -n 5 127.0.0.1  &gt; null
echo.
goto menu
:a
echo 服务器IP策略基本配置
:: 建立一个名字叫“我的规则”的安全策略先
netsh ipsec static add policy name=我的规则
:: 建立2条操作动作
netsh ipsec static add filteraction name=Permit action=permit
netsh ipsec static add filteraction name=Block action=block

::对外端口访问规则
netsh ipsec static add filterlist name=80port description=&#34;与其他服务器80端口的交互&#34;
netsh ipsec static add filter filterlist=80port srcaddr=any dstaddr=me dstport=80 protocol=TCP description=&#34;允许其他服务器访问本机80端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=any dstaddr=me dstport=443 protocol=TCP description=&#34;允许其他服务器访问本机443端口&#34;

::允许本机访问其他服务器特定的端口，如果没有这条就只能访问信任IP
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=80 protocol=TCP description=&#34;允许本机访问其他服务器80&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=443 protocol=TCP description=&#34;允许本机访问其他服务器443端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=53 protocol=TCP description=&#34;允许本机访问其他服务器DNS端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=53 protocol=UDP description=&#34;允许本机访问其他服务器DNS端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any protocol=ICMP description=&#34;允许本机ping其他服务器&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=25 protocol=TCP description=&#34;允许本机访问其他服务器25&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=110 protocol=TCP description=&#34;允许本机访问其他服务器的110端口，110端口是为POP3（邮件协议3）服务开放的&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=143 protocol=TCP description=&#34;允许本机访问其他服务器143端口，143端口主要是用于IMAP）&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=465 protocol=TCP description=&#34;允许本机访问其他服务器465端口，465端口是为SMTPS(SMTP-over-SSL)协议服务开放的&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=995 protocol=TCP description=&#34;允许本机访问其他服务器995端口，995端口是为POP3S(POP3-over-SSL)协议服务开放的&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=993 protocol=TCP description=&#34;允许本机访问其他服务器993端口，993端口是为IMAPS(IMAP-over-SSL)协议服务开放的&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=123 protocol=UDP description=&#34;windows时间更新&#34;
::netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=123 protocol=TCP description=&#34;windows时间更新&#34;
netsh ipsec static add rule name=80port policy=我的规则 filterlist=80port  filteraction=Permit

:: 建立信任IP规则
netsh ipsec static add filterlist name=AllowIP description=&#34;信任IP&#34;

:: ############### 此处添加 远程信任的访问IP ###############
::公司网络出口ip
:: netsh ipsec static add filter filterlist=AllowIP srcaddr=xx.xx.xx.xx srcmask=255.255.255.255  dstaddr=me description=&#34;公司网络出口ip&#34;

::-----------------------------------其他外网服务器-------------------------
::VPN服务器
:: netsh ipsec static add filter filterlist=AllowIP srcaddr=xx.xx.xx.xx  dstaddr=me description=&#34;中转服务器&#34;

netsh ipsec static add rule name=AllowIP policy=我的规则 filterlist=AllowIP filteraction=Permit
:: 建立一条拒绝所有IP访问规则
netsh ipsec static add filterlist name=DenyIP description=&#34;拒绝所有IP&#34;
::拒绝所有IP地址访问本机--进限制
netsh ipsec static add filter filterlist=DenyIP srcaddr=any dstaddr=me description=&#34;拒绝所有IP访问&#34;
::拒绝本机访问其他IP---出限制
::netsh ipsec static add filter filterlist=DenyIP srcaddr=me dstaddr=any description=&#34;拒绝访问所有IP&#34;
::规则集合
netsh ipsec static add rule name=DenyIP policy=我的规则 filterlist=DenyIP filteraction=Block

goto menu

:b
title 亚马逊内网网段信任(172.31.0.0/16)
netsh ipsec static add filter filterlist=AllowIP srcaddr=me dstaddr=172.31.0.0  dstmask=255.255.0.0 description=&#34;172.31.0.0/16&#34;
goto menu

:c
echo 公司内部服务器基本配置
:: 建立一个名字叫“我的规则”的安全策略先
netsh ipsec static add policy name=我的规则
:: 建立2条操作动作
netsh ipsec static add filteraction name=Permit action=permit
netsh ipsec static add filteraction name=Block action=block

::对外端口访问规则
netsh ipsec static add filterlist name=80port description=&#34;与其他服务器80端口的交互&#34;
netsh ipsec static add filter filterlist=80port srcaddr=any dstaddr=me dstport=80 protocol=TCP description=&#34;允许其他服务器访问本机80端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=any dstaddr=me dstport=443 protocol=TCP description=&#34;允许其他服务器访问本机443端口&#34;
::允许本机访问其他服务器的端口，如果没有这条就只能访问信任IP
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=80 protocol=TCP description=&#34;允许本机访问其他服务器80&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=443 protocol=TCP description=&#34;允许本机访问其他服务器443端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=53 protocol=TCP description=&#34;允许本机访问其他服务器DNS端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=53 protocol=UDP description=&#34;允许本机访问其他服务器DNS端口&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any protocol=ICMP description=&#34;允许本机ping其他服务器&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=25 protocol=TCP description=&#34;允许本机访问其他服务器25&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=110 protocol=TCP description=&#34;允许本机访问其他服务器110&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=143 protocol=TCP description=&#34;允许本机访问其他服务器143&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=465 protocol=TCP description=&#34;允许本机访问其他服务器465&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=995 protocol=TCP description=&#34;允许本机访问其他服务器995&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=993 protocol=TCP description=&#34;允许本机访问其他服务器993&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=123 protocol=UDP description=&#34;windows时间更新&#34;
::netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=123 protocol=TCP description=&#34;windows时间更新&#34;
netsh ipsec static add rule name=80port policy=我的规则 filterlist=80port  filteraction=Permit

:: 建立信任IP规则
netsh ipsec static add filterlist name=AllowIP description=&#34;信任IP&#34;
::本地机房内网网段
netsh ipsec static add filter filterlist=AllowIP srcaddr=172.31.10.0 srcmask=255.255.255.0 dstaddr=me description=&#34;允许10段访问&#34;
::-----------------------------------其他外网服务器-------------------------

::中转服务器
netsh ipsec static add filter filterlist=AllowIP srcaddr=172.31.12.10  dstaddr=me description=&#34;允许中转机器&#34;

netsh ipsec static add rule name=AllowIP policy=我的规则 filterlist=AllowIP filteraction=Permit
:: 建立一条拒绝所有IP访问规则
netsh ipsec static add filterlist name=DenyIP description=&#34;拒绝所有IP&#34;
::拒绝所有IP地址访问本机--进限制
netsh ipsec static add filter filterlist=DenyIP srcaddr=any dstaddr=me description=&#34;拒绝所有IP访问&#34;
::拒绝本机访问其他IP---出限制
::netsh ipsec static add filter filterlist=DenyIP srcaddr=me dstaddr=any description=&#34;拒绝访问所有IP&#34;
::规则集合
netsh ipsec static add rule name=DenyIP policy=我的规则 filterlist=DenyIP filteraction=Block
goto menu
:d
echo 邮件服务器配置
netsh ipsec static add filterlist name=Mail description=&#34;邮件端口规则&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=any dstaddr=me dstport=25 protocol=TCP description=&#34;SMTP&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=any dstaddr=me dstport=110 protocol=TCP description=&#34;POP3&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=any dstaddr=me dstport=143 protocol=TCP description=&#34;IMAP&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=any dstaddr=me dstport=3000 protocol=TCP description=&#34;MDaemon-wordclient&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=any dstaddr=me dstport=10000 protocol=TCP description=&#34;MDaemon-admin&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=me dstaddr=any dstport=25 protocol=TCP description=&#34;允许本机访问其他服务器25&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=me dstaddr=any dstport=110 protocol=TCP description=&#34;允许本机访问其他服务器110&#34;
netsh ipsec static add filter filterlist=Mail srcaddr=me dstaddr=any dstport=143 protocol=TCP description=&#34;允许本机访问其他服务器143&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=465 protocol=TCP description=&#34;允许本机访问其他服务器465&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=995 protocol=TCP description=&#34;允许本机访问其他服务器995&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=993 protocol=TCP description=&#34;允许本机访问其他服务器993&#34;
netsh ipsec static add rule name=Mail policy=我的规则 filterlist=Mail  filteraction=Permit
goto menu
:e
::--VPN服务器----IP策略-----
netsh ipsec static add filterlist name=VPN description=&#34;VPN&#34;
netsh ipsec static add filter filterlist=VPN srcaddr=any dstaddr=me dstport=1723 protocol=TCP description=&#34;pptp&#34;
netsh ipsec static add filter filterlist=VPN srcaddr=any dstaddr=me protocol=47 description=&#34;gre协议&#34;
netsh ipsec static add rule name=VPN policy=我的规则 filterlist=VPN  filteraction=Permit
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=22 protocol=TCP description=&#34;SSH--22&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=3389 protocol=TCP description=&#34;RDP3389&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=8080 protocol=TCP description=&#34;tomcat8080&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=3306 protocol=TCP description=&#34;mysql3306&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=5900 protocol=TCP description=&#34;vnc5900&#34;
netsh ipsec static add filter filterlist=80port srcaddr=me dstaddr=any dstport=21 protocol=TCP description=&#34;ftp21&#34;
goto menu
:f
ehco 配置dns服务器端口
netsh ipsec static add filterlist name=DNS description=&#34;DNS&#34;
netsh ipsec static add filter filterlist=DNS srcaddr=any dstaddr=me dstport=53 protocol=TCP description=&#34;DNS-TCP&#34;
netsh ipsec static add filter filterlist=DNS srcaddr=any dstaddr=me dstport=53 protocol=UDP description=&#34;DNS-UDP&#34;
netsh ipsec static add rule name=DNS policy=我的规则 filterlist=DNS  filteraction=Permit
goto menu
:g
echo 添加本机IP段
set /p ipre=请输入ip段(如172.16.10.0)
netsh ipsec static add filter filterlist=AllowIP srcaddr=me dstaddr=%ipre% dstmask=255.255.255.0  description=&#34;local&#34;
netsh ipsec static add filter filterlist=AllowIP srcaddr=%ipre% dstaddr=me dstmask=255.255.255.0  description=&#34;local&#34;
goto menu
:h
echo ftp 规则添加（注意:默认是所有IP,如果需要只允许指定ip访问请修改源目标IP为具体IP，由于被动问题，清设置ftp被动端口
echo 打开ftp界面，设置--passive mode setting -选中use custom port fange-10000-10000 ）  
netsh ipsec static add filterlist name=ftp description=&#34;ftp规则&#34;
netsh ipsec static add filter filterlist=ftp srcaddr=any dstaddr=me dstport=20 protocol=TCP description=&#34;ftp&#34;
netsh ipsec static add filter filterlist=ftp srcaddr=any dstaddr=me dstport=21 protocol=TCP description=&#34;ftp&#34;
netsh ipsec static add filter filterlist=ftp srcaddr=any dstaddr=me dstport=10000 protocol=TCP description=&#34;ftp pav&#34;
netsh ipsec static add rule name=ftp policy=我的规则 filterlist=ftp  filteraction=Permit
goto menu
:i
:: 激活策略
netsh ipsec static set policy name=我的规则 assign=y
sc config PolicyAgent start= demand
net start PolicyAgent
goto menu
:ext
exit
{{&lt; /highlight &gt;}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/bat/ipsec/  

