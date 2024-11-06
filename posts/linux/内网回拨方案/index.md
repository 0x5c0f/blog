# 内网回拨方案

&lt;!--more--&gt;

{{&lt; admonition type=info title=&#34;前言&#34; open=true &gt;}}
&amp;emsp;&amp;emsp;记录本篇内容实际上是希望有人能知道有`badvpn_tun2socks` 这个东西可以将`socks`转化为`vpn`, 或者只有我不知道这个东西了。  

&amp;emsp;&amp;emsp;需求：公司有台服务器在国外,需要拨号到公司处理一些数据,现在用的是`pptp`,拨号也成功了,而且很稳定,但就是延迟130ms上下,上级要求降低延迟,经过多方面查询,在`ucloud`上找到了一个线路加速的方案,不过该加速并不支持`pptp`的加速,于是找到了另一种方案,用该线路加速`ssh`,在服务器上通过`ssh`动态端口转发建立`socks`,然后将`socks`转化为`vpn`来实现加速.   

{{&lt; /admonition &gt;}}


**如果有人处理过以上需求的，希望能交流下你们的解决方案。万分感谢！**  

参考资料： 

&gt; https://github.com/ambrop72/badvpn.git  

&gt; https://github.com/yangchuansheng/love-gfw


# 1. badvpn_tun2socks 编译 
```bash
$&gt; git clone https://github.com/ambrop72/badvpn.git 
$&gt; # 因为只需要vpn的，因此加上这些参数（其实我也先把全部功能加上看下有些什么东西，但是我编译不过去！），详细文档可以参看github的文档 
$&gt; cmake .. -DBUILD_NOTHING_BY_DEFAULT=1 -DBUILD_TUN2SOCKS=1 -DBUILD_UDPGW=1
$&gt; make &amp;&amp; make install 
```
1# 2. badvpn_tun2socks 使用 
```bash
# 创建tun接口
$&gt; ip tuntap add dev tun0 mode tun
# 为其分配ip 
$&gt; ip addr add 10.0.0.1/24 dev tun0
# 启动接口 
$&gt; ip link set tun0 up
# 启动 badvpn_tun2socks socks 转化为 vpn
$&gt; badvpn-tun2socks --tundev tun0 --netif-ipaddr 10.1.0.2 --netif-netmask 255.255.255.0 --socks-server-addr &#34;127.0.0.1:1080&#34;
# 下面操作就和vpn拨号成功后一样了 
# 添加默认路由 serverA 主机同网段的其他主机 
$&gt; ip route add 10.172.11.13 via 10.1.0.2
```
成功运行后就可以直接通过路由连接`socks`通往段的其他主机。

# 3. 完成过程 
## 3.1. 通过`ssh`动态端口转发,在远程主机上生成`socks`通道端口 
```bash
$&gt; ssh -4 -N -C -D 1080 &lt;user&gt;@&lt;remote_ip&gt;
```

## 3.2. 创建tun接口并添加ip(注意ip子网不要冲突) 
```bash
$&gt; ip tuntap add dev tun0 mode tun
$&gt; ip addr add 10.0.0.1/24 dev tun0
$&gt; ip link set tun0 up
```

### 3.2.1. 启动 badvpn_tun2socks socks 转化为 vpn 
```bash
$&gt; badvpn-tun2socks --tundev tun0 --netif-ipaddr 10.1.0.2 --netif-netmask 255.255.255.0 --socks-server-addr &#34;127.0.0.1:1080&#34;
```

## 3.3. 设置路由 
```bash
$&gt; ip route add &lt;other_ip&gt; via 10.1.0.2
```
## 3.4. 以下是整理出来的完成脚本和服务配置
### 3.4.1. badvpn-control 
```bash
$&gt; vim /usr/local/bin/badvpn-control # 注意执行权限 
#!/bin/bash
################################################# 
#   author      0x5c0f 
#   date        2019-08-13 
#   email       mail@0x5c0f.cc 
#   web         blog.0x5c0f.cc 
#   version     1.0.0
#   last update 2019-08-13
#   descript    Use : ./badvpn-control -h
################################################# 

PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

# SOCKS server IP 
SOCKS_SERVER=&#34;${SOCKS_HOST}&#34;
# SOCKS port
SOCKS_PORT=&#34;${SOCKS_PORT}&#34;
# tun dev 
TUN_NETWORK_DEV=&#34;tun0&#34;
# tun ip prefix 
TUN_NETWORK_PREFIX=&#34;10.1.0&#34;
# route ip
TUN_ROUTE_IP=($(eval echo ${SOCKS_ROUTE}))

badvpn_start(){
    ip tuntap add dev &#34;${TUN_NETWORK_DEV}&#34; mode tun
    ip addr add &#34;${TUN_NETWORK_PREFIX}.1/24&#34; dev &#34;${TUN_NETWORK_DEV}&#34;
    ip link set &#34;${TUN_NETWORK_DEV}&#34; up
    # add route 
    for _ip in ${TUN_ROUTE_IP[@]}; do
        ip route add &#34;${_ip}&#34; via &#34;${TUN_NETWORK_PREFIX}.2&#34;
    done
    # start badvpn_tun2socks (https://github.com/ambrop72/badvpn.git)
    badvpn-tun2socks --tundev &#34;${TUN_NETWORK_DEV}&#34; --netif-ipaddr &#34;${TUN_NETWORK_PREFIX}.2&#34; --netif-netmask 255.255.255.0 --socks-server-addr &#34;${SOCKS_SERVER}:${SOCKS_PORT}&#34;
}


badvpn_stop(){
    # delete route 
    for _ip in ${TUN_ROUTE_IP[@]}; do
        ip route del &#34;${_ip}&#34; via &#34;${TUN_NETWORK_PREFIX}.2&#34;
    done
    # delete network dev 
    ip link set &#34;${TUN_NETWORK_DEV}&#34; down
    ip addr del &#34;${TUN_NETWORK_PREFIX}.1/24&#34; dev &#34;${TUN_NETWORK_DEV}&#34;
    ip tuntap del dev &#34;${TUN_NETWORK_DEV}&#34; mode tun
}


main(){
    case &#34;$1&#34; in
        &#34;start&#34;) 
            badvpn_start
        ;;
        &#34;stop&#34;)
            badvpn_stop
        ;;
        *) 
            echo &#34;$0 start|stop&#34;
        ;;
    esac
    
}
main $@ 
```

### 3.4.2. socketssh-tun.service
用于管理`ssh`动态转发的`systemd`,其他方式请忽略此类 
```ini
$&gt; vim /usr/lib/systemd/system/socketssh-tun.service

[Unit]
Description=socketssh tun
After=network.target

[Service]
Type=simple
PIDFile=/run/socketssh-tun.pid
ExecStart=/usr/bin/ssh -4 -N -C -D 1080 &lt;user&gt;@&lt;remote_ip&gt;

[Install]
WantedBy=multi-user.target

$&gt; systemctl daemon-reload 
$&gt; systemctl status socketssh-tun.service
```

### 3.4.3. badvpn-tun2socks.service
用于管理`badvpn-tun2socks`启动关闭的`systemd`  
```ini
$&gt; vim /etc/sysconfig/badvpn
SOCKS_HOST=&#34;127.0.0.1&#34;
SOCKS_PORT=&#34;1090&#34;

# 只支持ipv4 
GOLANG_HOST=&#34;&#34;

# 支持配置多个 空格隔开   
SOCKS_ROUTE=&#34;${GOLANG_HOST}&#34;

$&gt; vim /usr/lib/systemd/system/badvpn-tun2socks.service
[Unit]
Description=badvpn-tun2socks
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/sysconfig/badvpn
PIDFile=/run/badvpn-tun2socks.pid
ExecStart=/usr/local/bin/badvpn-control start
ExecStopPost=/usr/local/bin/badvpn-control stop

[Install]
WantedBy=multi-user.target

$&gt; systemctl daemon-reload 
$&gt; systemctl status badvpn-tun2socks.service
```

至此,搞完了 !

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E5%86%85%E7%BD%91%E5%9B%9E%E6%8B%A8%E6%96%B9%E6%A1%88/  

