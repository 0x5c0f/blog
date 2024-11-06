# PPTP相关


{{&lt; admonition type=note title=&#34;前言&#34; open=true &gt;}}
- 本来是不想整理这篇内容的，gre协议在国内限制实际上已经很严格，所以现在使用也已经并不多了，虽然不多，但作为一个运维这玩意有时候又需要，很容易忘记，想了想还是记录一个。  
- 以下测试在腾讯云的主机上和`aws`的`lightsail`的主机上是不能拨号成功的,但在`aws`的`EC2`上是可以拨号成功的,很奇怪,pptp服务器日志显示的是说由于防火墙限制了gre协议包导致的。  
- 本内容为运维记事，切勿用于非法用途。
{{&lt; /admonition &gt;}}

# 1. linux 下 pptp 拨号 
```bash
$&gt; yum install ppp pptp-setup pptpd 

# 配置远程pptp连接的用户名和密码 
$&gt;  vim  /etc/ppp/chap-secrets
# 用户名  连接协议  密码 	连接ip 
&lt;用户名&gt; PPTPserver &lt;密码&gt; *

# 配置连接信息 
$&gt; vim /etc/ppp/peers/osppp 
pty &#34;pptp xxx.xxx.xxx.xxx --nolaunchpppd&#34;
name &lt;用户名&gt;		# 登陆用户名 
remotename PPTPserver
require-mppe-128
file /etc/ppp/options.pptp  # 这个必须加 
ipparam osppp			# 这个是vpn 的启动名称 

# 加载模块 : 
$&gt; modprobe ppp_mppe

# 创建管理命令 (注: 该命令由于pptp的版本不一样,位置可能不一样,注意检查命令. 另 改命令默认没有执行权限)
$&gt; ln -s /usr/share/doc/ppp-2.4.5/scripts/poff /usr/local/bin/ 
$&gt; ln -s /usr/share/doc/ppp-2.4.5/scripts/pon /usr/local/bin/

# 启动 :
$&gt; pppd call osppp   #或者 pon osppp

## 检查是否拨号成功
$&gt; ip a |grep ppp # 成功返回结果且存在绑定ip则代表拨号成功 ,否则失败,如果是云主机,可能并不支持,即使模块加载成功了

# 关闭:
$&gt; poff osppp

# 路由添加 
$&gt; route add -host &lt;需要代理的ip&gt; gw &lt;pptp启动后的默认网关路由ip&gt;
```


# 2. pptp 创建示例 
## 2.1. docker 创建
```bash
docker run -d --privileged --net=host -v /data/docker/ppp/chap-secrets:/etc/ppp/chap-secrets mobtitude/vpn-pptp

# /data/docker/ppp/chap-secrets 
# Secrets for authentication using PAP
# client    server      secret      acceptable local IP addresses
stan    *           smith    *
# 用户名、远程PPTP服务器的名称(options.pptpd中的name)、密码、该连接上的客户端用什么 IP（* 表示任意）

# 程序日志为/var/log/message 
# /etc/ppp/ip-up 登陆执行
# /etc/ppp/ip-down 退出执行
```

## 2.2. 直接创建
一般来说，服务器都支持pptp的搭建，这儿就不说怎么检查是否支持了(注意开启net.ipv4.ip_forward)。
```bash
[root@00 ~]# yum install epel-release -y
[root@00 ~]# yum install ppp pptpd net-tools iptables-services -y
[root@00 ~]# vim  /etc/pptpd.conf
option /etc/ppp/pptpd-options
#debug
#stimeout 10
logwtmp
#bcrelay eth0
#delegate
#connections 100
localip 10.99.10.1     # 服务器虚拟网卡的地址
remoteip 10.99.10.2-254    # 为拨入VPN的用户动态分配的IP地址池此为分配给用户的ip段 

[root@00 ~]# vim /etc/ppp/pptpd-options
name pptpd
refuse-pap
refuse-chap
refuse-mschap
require-mschap-v2
require-mppe-128
ms-dns 223.5.5.5
ms-dns 223.6.6.6
proxyarp
lock
nobsdcomp 
novj
novjccomp
nologfd

# configure firewall
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# 
# iptables -t nat -A POSTROUTING -s 10.99.10.0/24 ! -d 10.99.10.0/24 -j MASQUERADE
# iptables -A FORWARD -s 10.99.10.0/24 -p tcp -m tcp --tcp-flags FIN,SYN,RST,ACK SYN -j TCPMSS --set-mss 1356
# iptables -A INPUT -i ppp&#43; -j ACCEPT
# iptables -A OUTPUT -o ppp&#43; -j ACCEPT
# iptables -A FORWARD -i ppp&#43; -j ACCEPT
# iptables -A FORWARD -o ppp&#43; -j ACCEPT

## 单用户登陆实现
##  脚本 /etc/ppp/ip-up
##  在 exit 0 之前添加(日志之前)
## 实现原理和日志记录差不多
## 在用户登陆的时候，判断下是是否当前用户已经登陆，如果没有登陆，就记录下当前用户登陆的ip和用户名 echo &#34;${5}&#34; &gt; .$PEERNAME.lock
## 否则直接查询到上次登陆用户的ip所在的进程，直接kill


# 日志记录(由于我要发送记录到日志系统，以下记录为json格式)
########################################### 
## 登陆日志: /etc/ppp/ip-up
## 在脚本 exit 0 之前添加 
# LOG_DIR=&#34;/var/log/ppp&#34;
# curDay=$(date &#43;&#34;%Y%m%d&#34;)
# logFile=&#34;${LOG_DIR}/up-pptpd-${curDay}.log&#34;

# /usr/bin/cat &gt;&gt; ${logFile} &lt;&lt;EOF
# {&#34;username&#34;: &#34;$PEERNAME&#34;, &#34;time&#34;: &#34;$(date -d today &#43;%F_%T)&#34;, &#34;device&#34;: &#34;${1}&#34;, &#34;clientIP&#34;: &#34;${6}&#34;, &#34;vpnIP&#34;: &#34; ${4}&#34;, &#34;assignIP&#34;: &#34;${5}&#34;, &#34;status&#34;: &#34;Login&#34;, &#34;description&#34;: &#34;User ${PEERNAME} is connected&#34;}
# EOF

############################################# 
## 登出日志: /etc/ppp/ip-down
## 在exit 0 之前添加
# LOG_DIR=&#34;/var/log/ppp&#34;
# curDay=$(date &#43;&#34;%Y%m%d&#34;)
# logFile=&#34;${LOG_DIR}/down-pptpd-${curDay}.log&#34;

# /usr/bin/cat &gt;&gt; ${logFile} &lt;&lt;EOF
# {&#34;username&#34;: &#34;${PEERNAME}&#34;,&#34;connect time&#34;: &#34;${CONNECT_TIME} s&#34;,&#34;bytes sent&#34;: &#34;${BYTES_SENT} B&#34;,&#34;bytes rcvd&#34;: &#34;${BYTES_RCVD} B&#34;,&#34;bytes sum&#34;: &#34;$(echo &#34;scale=2;($BYTES_SENT &#43; $BYTES_RCVD)/1024/1024&#34; | bc) MB&#34;,&#34;average speed&#34;:&#34;$(echo &#34;scale=2;($BYTES_SENT &#43; $BYTES_RCVD)/1024/$CONNECT_TIME&#34; | bc) KB/s&#34;,&#34;time&#34;: &#34;$(date -d today &#43;%F_%T)&#34;,&#34;device&#34;: &#34;${1}&#34;,&#34;clientIP&#34;: &#34;${6}&#34;,&#34;vpnIP&#34;: &#34; ${4}&#34;,&#34;assignIP&#34;: &#34;${5}&#34;,&#34;status&#34;: &#34;Logout&#34;,&#34;description&#34;: &#34;User ${PEERNAME} is disconnected&#34;}
# EOF

############################################# 
```

## 2.3. 遇到过的故障
- 可以登陆 但是不能连接公网，或类似无法解析dns的情况(终端正常)
- 问题原因：一般是MTU设置不正确导致的。 
  - 方案一：在配置VPN的CentOS服务器中执行如下命令，此方案可以临时生效，如果您需要长期生效的方案，请参考 方案二。
  ```bash
  $&gt; ifconfig ppp0 mtu 1472
  ```
  - 方案二：执行vi /etc/ppp/ip-up命令，在/etc/ppp/ip-up文件中增加如下“ifconfig ppp0 mtu 1472”。
  ```bash
  /etc/ppp/ip-up.ipv6to4 ${LOGDEVICE}
  [ -x /etc/ppp/ip-up.local ] &amp;&amp; /etc/ppp/ip-up.local “$@”
  ifconfig ppp0 mtu 1472
  ```

# 3. 如何使用Shadowsocks 让 CentOS 实现上外网
首先，你需要一个shadowsocks帐号。  
然后 `CentOS` 安装 `shadowsocks`
通过 `pip` 安装 `shadowsocks`  

```bash
[root@00 ~]# pip install shadowsocks
# 随后，我们配置好帐号密码，新建`/etc/shadowsocks.json`文件:  
[root@00 ~]# cat /etc/shadowsocks.json
{
    &#34;server&#34;:&#34;your_server_ip&#34;,      #ss服务器IP
    &#34;server_port&#34;:your_server_port, #端口
    &#34;local_address&#34;: &#34;127.0.0.1&#34;,   #本地ip
    &#34;local_port&#34;:1080,              #本地端口
    &#34;password&#34;:&#34;your_server_passwd&#34;,#连接ss密码
    &#34;timeout&#34;:300,                  #等待超时
    &#34;method&#34;:&#34;rc4-md5&#34;,             #加密方式
    &#34;fast_open&#34;: false,             # true 或 false。如果你的服务器 Linux 内核在3.7&#43;，可以开启 fast_open 以降低延迟。开启方法： echo 3 &gt; /proc/sys/net/ipv4/tcp_fastopen 开启之后，将 fast_open 的配置设置为 true 即可
    &#34;workers&#34;: 1                    # 工作线程数
}

```  
启动：`sslocal -c /etc/shadowsocks.json`   

# 4. 终端代理(http代理) - Privoxy
- 直接使用yum安装即可`yum install privoxy`  
- 安装好后，修改一下配置`vim /etc/privoxy/config`  
- 搜索`forward-socks5t`，将`forward-socks5t / 127.0.0.1:9050` 取消注释并修改为`forward-socks5t / 127.0.0.1:1080`  
- 启动 `privoxy /etc/privoxy/config`(systemctl start privoxy)

配置 `/etc/profile`
```bash
export http_proxy=http://127.0.0.1:8118 
export https_proxy=https://127.0.0.1:8118
```

修改后使配置生效`source /etc/profile`  
执行`curl -I http://api.myip.la/json` 看看IP是否切换成功

备注：如果不需要代理，需要把`profile`中变量注释，重新`source /etc/profile`  

# 5. 终端代理 proxychains  
此处源码编译安装的使用方式略有不同,注意查看帮助即可  
详细说明 :   
&gt;[https://hl0rey.github.io/2018/02/03/proxychains配置详解](https://hl0rey.github.io/2018/02/03/proxychains%E9%85%8D%E7%BD%AE%E8%AF%A6%E8%A7%A3/)  

- `sudo dnf install proxychains-ng -y`  
- 修改配置文件,`vim /etc/proxychains.conf`
  - 配置文件默认查询顺序`./proxychains.conf`--&gt;`~/.proxychains/proxychains.conf` --&gt; `/etc/proxychains.conf` 
- 负载均衡    
    1. `dynamic_chain`　自动跳过不可用 
    2. `strict_chain`　每个代理都使用，不管是否可用
    3. `round_robin_chain` 轮询模式，自动跳过不可用的代理 
    4. `random_chain` 随机使用代理　（`chain_len` 是配置每次用的代理个数）
- 默认行修改或添加自己的`socks5  127.0.0.1 1080`地址 
- 使用:  
  - `proxychains4 curl -I http://api.myip.la/json`   


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/pptp%E7%9B%B8%E5%85%B3/  

