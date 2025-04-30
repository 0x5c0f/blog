# Ssh隧道相关


# 1. 记录一个草稿 

参考文献 : 
> [http://www.zsythink.net/archives/2450](http://www.zsythink.net/archives/2450)  

> [http://codelife.me/blog/2012/12/09/three-types-of-ssh-turneling/](http://codelife.me/blog/2012/12/09/three-types-of-ssh-turneling/) 

> [https://www.ibm.com/developerworks/cn/linux/l-cn-sshforward/index.html](https://www.ibm.com/developerworks/cn/linux/l-cn-sshforward/index.html)  


主机定义 :  
1. serverA: 10.0.1.11   
2. serverB: 10.0.1.12  
3. serverC: 172.16.110.11  
4. serverD: 172.16.110.12  

# 2. 本地转发
## 命令格式 
```bash
ssh -L <local port>:<remote host>:<remote port> <SSH hostname>
```

## 2.1. 隧道搭建(serverA 执行) 
```bash
# -L 表示使用本地转发建立隧道  
# -N 表示不执行远程命令 
# -f 表示运行到后台
# -g 开启网关功能,serverA中的所有ip都将会被监控 
# 整段意思表示 在本地(serverA)主机上建设一个到serverB的隧道,使用本地端口转发模式,监听本地(serverA)的9022端口,当访问本地(serverA)的9022端口时,会将通信数据转发到serverB的22端口  
[root@00 ~]# ssh -N -f -L 9022:10.0.1.12:22 root@10.0.1.12  # ssh -N -f -L 127.0.0.1:9022:10.0.1.12:22 root@10.0.1.12 
```
## 2.2. 隧道连接(serverA 执行) 
```bash
ssh root@127.0.0.1 -P9022 
```

# 3. 远程端口转发
(内网穿透)  
例如: serverB 可以连接serverC, 但serverC 不能访问serverB , serverC 和 serverD 可以相互访问,若 serverD(或serverC) 需要访问serverB的ssh服务  
## 命令格式 
```bash
ssh -R <local port>:<remote host>:<remote port> <SSH hostname> 
```
## 3.1. 隧道搭建(serverB 执行) 
```bash
# -N 表示不执行远程命令 
# -R 表示创建远程转发的ssh隧道 
# serverB(10.0.1.12)上执行 ,将会在远程主机serverC(172.16.110.11)上生成隧道端口(9022)的监听
ssh -N -R 9022:10.0.1.12:22 root@172.16.110.11
# serverB(10.0.1.12)上执行 ,将会在远程主机serverC(172.16.110.11)上生成隧道端口(9023)的监听
ssh -N -R 9023:10.0.1.11:22 root@172.16.110.11
```
## 3.2. 隧道连接
```bash
# 在serverC(172.16.110.11) 上执行,将会登陆serverB(10.0.1.12)主机
ssh root@127.0.0.1 -P9022 
# 在serverC(172.16.110.11) 上执行,将会登陆serverA(10.0.1.11)主机
ssh root@127.0.0.1 -P9023 
```

# 4. 动态端口转发
有点类似`shadowsocks`
## 命令格式
```bash
ssh -D <local port> <SSH Server>
```
## 4.1. 隧道搭建(serverA 执行) 
```bash
[root@00 ~]# ssh -N -D 9000 root@serverC # ssh -N -D 127.0.0.1:9000 root@serverC
```
## 4.2. 隧道连接 (serverA 执行)
(若`serverC`为公网ip,也可通过其ip访问公网网络)  
然后通过 ProxyChains-NG或其他程序配置 socks4或socks5即可通过`serverC` 连接`serverC`同网段的其他主机(`serverD`)  


# 5. windows 端口转发 
`plink.exe`是`putty`的附属工具 .
```bat
$> plink.exe -ssh -i sshrsa.ppk 9022:10.0.1.12:22 root@10.0.1.12  
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/ssh%E9%9A%A7%E9%81%93%E7%9B%B8%E5%85%B3/  

