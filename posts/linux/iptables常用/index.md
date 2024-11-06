# Iptables常用


# 1. iptables  工作流程 
1. 防火墙是一层一层过滤的，实际是按照配置规则的顺序从上到下，从前到后进行过滤的。  
2. 如果匹配上规则，即明确表明是阻止还是通过，此时数据包就不在向下进行新的匹配规则了。  
3. 如果所有规则中没有明确表明是阻止还是通过这个数据包，也就是没有匹配上的规则，向下进行匹配，直到匹配默认规则得到明确的阻止还是通过.  
4. 防火墙的默认规则是对应链的所有的规则执行完成后才会执行。  

# 2. iptables 表和链  
- 4 表:  

|||
|-|-|
|filter|包过滤，用于防火墙规则。|
|net|地址转换，用于网关路由器。|
|mangle|数据包修改（QOS），用于实现服务质量。|
|raw | 高级功能，如：网址过滤。|
- 5链:  

|||
|-|-|
|INPUT链|处理输入数据包。|
|OUTPUT链|处理输出数据包。|
|PORWARD链|处理转发数据包。|
|PREROUTING链|用于目标地址转换（DNAT）。|
|POSTOUTING链|用于源地址转换（SNAT）。|

# 3. iptables 命令
|参数|作用|
|-|-|
|`-F`|清空所有规则，不会处理默认规则|
|`-X`|删除用户自定义的链|
|`-Z`|清空链的计数器|
|`-t`|指定表(默认filter)|
|`-A`|添加规则到指定链的结尾(查找对应链，做什么处理)|
|`-I`|添加规则到指定链的开头(查找对应链，做什么处理)|
|`-P`|指定协议: all(默认)、tcp、udp、icmp|
|`--dport`|指定目的端口(端口范围冒号分割,如:80:89)|
|`--sport`|指定源端口(端口范围冒号分割,如:80:89)|
|`-m multiport  --dport/--sport`|指定匹配多个端口,需配合(`--dport`|`-sport`)使用|
|`-j`|行为 ACCEPT(接受)、DROP(丢弃)、REJECT(拒绝:REJECT会反馈给拒绝对象信息)|
|`-s`|指定源ip地址|
|`-i`|指定进入的网卡|
|`-o`|指定出去的网卡|
|`-n`|以数字形式显示ip和端口(默认主机名、网络名),需配合`-L`使用|
|`-L`|列出所有规则|
|`-D`|删除单条规则|
|`--line-number`|显示序号|
|`-m state --state `|new: 已经或将启动新的连接、ESTABLISHED:已建立的连接、 RELATED: 正在启动的新连接、INVALID: 非法或无法识别的 |
|`-m limit --limit n/{second/minute/hour}`|限制指定时间包的允许通过数量及并发数|
|`--limit-burst [n]`|在同一时间内允许通过的请求`n`个|


# 4. 示例
1. 清空规则、用户自定义链、链的计数器  
```bash
[root@00 ~]# iptables -F 
[root@00 ~]# iptables -X 
[root@00 ~]# iptables -Z 
```

2. 拒绝规则  
```bash
[root@00 ~]# iptables -t filter -A INPUT -p tcp --dport 22 -j DROP
[root@00 ~]# iptables -t filter -A INPUT -s 172.16.80.0/24 -j DROP 
[root@00 ~]# iptables -t filter -A INPUT -i eth0 -s 172.16.80.0/24 -j DROP 
[root@00 ~]# iptables -t filter -A INPUT ! -s 172.16.80.0/24 -j DROP  # 拒绝非 172.16.80.0/24 网段进行连接(6.x后!放在-s前面)
```

3. 匹配ICMP类型
```bash
[root@00 ~]# iptables -A INPUT -p icmp --icmp-type 8 -j DROP         # 8 代表ping
[root@00 ~]# iptables -A INPUT -p icmp --icmp-type 8 -s 172.18.80.0/24 -j DROP 
[root@00 ~]# 
```

4. 允许关联的状态包(如vsftpd服务)
```bash
[root@00 ~]# iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
[root@00 ~]# iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

5. nat 共享网络
```bash
# 存在固定的外网地址
[root@00 ~]# iptables -t nat -A POSTROUTING -s 10.0.1.0/24 -o eth1 -j SNAT --to-source 172.16.110.131  
# -s 10.0.1.0/24 为办公室或IDC内网网段;-o eth1 为网关的外网网卡接口;-j SNAT --to-source 172.16.110.131 是外网网卡的ip地址 
# 存在变化的外网地址(伪装)
[root@00 ~]# iptables -t nat -A POSTROUTING -s 10.0.1.0/24 -j MASQUERADE 
```
6. nat 端口转发(一对一映射)
```bash
# 访问 172.16.80.31:2121转发到 172.16.110.131:22
[root@00 ~]# iptables -t nat -A PREROUTING -p tcp -i eth0 -d 172.16.80.31 --dport 2121 -j DNAT --to 172.16.110.131:22
[root@00 ~]# iptables -t nat -I POSTROUTING -d 172.16.110.131 -j SNAT --to-source 172.16.80.31
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/iptables%E5%B8%B8%E7%94%A8/  

