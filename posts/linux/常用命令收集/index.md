# 常用命令收集


引入一个更为专业的命令收集站点 :

&gt; [https://www.commandlinefu.com/commands/browse](https://www.commandlinefu.com/commands/browse)

# 统计第一列相同，第二列平均值

```bash
cat xxx |awk &#39;{a[$1]&#43;=$2;c[$1]&#43;&#43;}END{l=asorti(a,b);for(i=1;i&lt;=l;i&#43;&#43;)print b[i],a[b[i]]/c[b[i]]}&#39;
```

# 时间段统计日志：

```bash
sed -n &#39;/2018:02:30/,/2018:03:00/p&#39; www.log |awk &#39;{a[$1]&#43;=1;} END {for(i in a){print a[i]&#34; &#34;i;}}&#39; |sort -t &#34; &#34; -k 1 -n
sed -n &#39;/2018:01:50/,/2018:02:00/p&#39; www.log |grep &#34;list?&#34; |awk &#39;{a[$1]&#43;=1;} END {for(i in a){print a[i]&#34; &#34;i;}}&#39; |sort -t &#34; &#34; -k 1 -n
```

# 按照 ip 排序

```bash
# 升序
sort -t&#39;.&#39; -k1,1n -k2,2n -k3,3n -k4,4n ip.txt
# 降序
sort -t&#39;.&#39; -k1,1nr -k2,2nr -k3,3nr -k4,4nr ip.txt
```

# shell 中获取脚本绝对路径

```bash
SHELL_DIR=$(dirname $(readlink -f &#34;$0&#34;))
SHELL_DIR=$(cd `dirname $0`; pwd)
```

# tailf 显示高亮

```bash
 tail -f www.log | perl -pe &#39;s/(\/pattern1\/pattern2)/\e[1;31m$1\e[0m/g&#39;

 tail -f www.log |grep --color -E &#39;pattern|$&#39;
```

# openssl 通过证书加密解密大文件

```bash
mkdir /etc/encrypt &amp;&amp; cd /etc/encrypt

openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
openssl rand -base64 32 &gt; key.bin   # 远程传输建议每次都新建

# 加密
openssl rsautl -encrypt -pubin -inkey /etc/encrypt/public.pem -in /etc/encrypt/key.bin -out /etc/encrypt/key.bin.enc
openssl aes-256-cfb -a -pbkdf2 -salt -in  filename.gz -out filename.gz.enc -k $(cat /etc/encrypt/key.bin)

# 解密
openssl rsautl -decrypt -inkey private.pem -in key.bin.enc -out key.bin
openssl aes-256-cfb -d -a -pbkdf2 -in filename.gz.enc -out filename.gz -k $(cat key.bin)


# 加密
tar -czf - * |  openssl aes-256-cfb -salt -k &#34;8CASiU6zxAWy9QZ8wj&#43;MgIzqHsBnXjgkHNvWeJ0urHw=&#34; -out ssh.key.pem.enc

openssl aes-256-cfb -d -salt -in ssh.key.pem.enc -out ssh_key.pem.tar.gz

```

# 免密登陆

```bash
# 172.16.10.11 无密码登陆 172.16.10.12
# 172.16.10.11 生成秘钥
# rsa 默认 2048
ssh-keygen -t rsa -b 2048
#  然后一直回车，可以设置认证密码
# id_rsa 私钥(不要外传)
# id_rsa.pub (公钥导入本地authorized_keys(600)中，将私钥传给客户端，客户端即可通过私钥连接当前服务器)
# 将本地的秘钥复制到服务器上就可以了,或者拷贝追加到服务器的authorized_keys文件中，即可本地登陆远程主机
ssh-copy-id -i ~/.ssh/id_rsa.pub root@172.16.10.12
```

# 手动检测: 每分钟连接次数

```bash
netstat -ntu | awk &#39;{print $5}&#39; |cut -d: -f1|sort|uniq -c |sort -n
netstat -an |grep ^tcp.*:80|egrep -v &#39;LISTEN|127.0.0.1&#39;|awk -F&#34;[ ]&#43;|[:]&#34; &#39;{print $6}&#39;|sort|uniq -c|sort -rn
```

# linux 用 tcpdump 查看 80 端口访问有哪些 IP

```bash
tcpdump -i eth0 -tnn dst port 80 -c 1000|awk -F&#34;.&#34; &#39;{print $1&#34;.&#34;$2&#34;.&#34;$3&#34;.&#34;$4}&#39;|sort|uniq -c|sort -rn|head -n20
```

# 查看 linux 内存占用最高的 10 个进程

```bash
ps aux|head -1 &amp;&amp; ps aux|grep -v PID|sort -rn -k &#43;4|head
```

# linux 查看 cpu 占用最高的 10 个进程

```bash
ps aux|head -1;ps aux|grep -v PID|sort -rn -k &#43;3|head
```

# linux 查看命令来源于那个包(yum 也适用)

```bash
dnf provides htop
```

# linux 查看已安装的命令原来于那个包

```bash
rpm -qf /usr/bin/htop
```

# linux 查看 rpm 包信息

```bash
rpm -qpi xxx.rpm
```

# linux 查看 rpm 包内容

```bash
rpm -qpl xxx.rpm
```

# linux 查看 rpm 包依赖

```bash
rpm -qpR xxx.rpm
```

# linux 查看 rpm 包带的执行脚本

```bash
rpm -qp --scripts xxx.rpm
```

# linux 自动安装 rpm 包依赖(dnf 默认已存在该功能)

```bash
yum -y localinstall xxx.rpm
```

# linux rpm 循环安装包依赖

```bash
# 关于循环安装是指的是主rpm包的所有的依赖包在同一目录下，会自动安装其依赖后在安装主rpm包，(此方法缺陷较大)
rpm -ivh --aid  *.rpm
```

# 清除僵死进程

```bash
ps -eal | awk &#39;{ if ($2 == &#34;Z&#34;) {print $4}}&#39; | kill -9
```

# LNMP/LAMP 环境查看编译参数

```bash
# nginx
/pathto/nginx/sbin/nginx -V
# apache
/pathto/apache/build/config.nice
# mysql
grep CONFIGURE_LINE /usr/bin/mysqlbug
# php
/pathto/php/bin/php -i|grep configure
```

# 让不同的进程使用不同的 cpu

```bash
# taskset -c,--cpu-list command
taskset -c 0,1,2,3 /etc/init.d/mysql start
```

# watch 监测命令运行结果

```bash
# 类似tailf,但是针对命令
# 查看当前目录内容变化
# watch ls
# watch &#34;netstat -ntu | awk &#39;{print $5}&#39; |cut -d: -f1|sort|uniq -c |sort -n&#34;
```

# 创建一个具有特定权限的空文件

```bash
#install -b -m &lt;权限&gt; &lt;来源&gt; &lt;目标&gt;
install -b -m 777 /dev/null file.txt
```

# 创建一个具有特定权限的目录

```bash
# install -d -o &lt;用户名&gt; -g &lt;用户组&gt; -m &lt;权限&gt; &lt;目标地址&gt;
install -d -o www -g www -m 755  /run/php-fpm
```

# 通过 sshfs 远程挂载目录

```bash
yum install sshfs
# mount
sshfs -o reconnect,_netdev,user,idmap=user,identityfile=/pathto/id_rsa,default_permissions  user@host:/path  /mnt/pathto
# /etc/fstab
user@host:/path /mnt/pathto fuse.sshfs noauto,x-systemd.automount,reconnect,_netdev,user,idmap=user,identityfile=/pathto/id_rsa,allow_other,default_permissions 0 0
```

# tmpfs 一种基于内存的文件系统

```bash
mount -t tmpfs -o size=1024M tmpfs /mnt/usb02
```

# 文件描述符相关

&lt;details&gt;
&lt;summary&gt;点击展开详细内容&lt;/summary&gt;

1.  系统最大打开的文件描述符数量

    ```bash
    cat /proc/sys/fs/file-nr
    10848	0	6815744
    # 第一个值: 当前系统已分配使用的打开文件描述符数
    # 第二个值: 为分配后已释放的（目前已不再使用）
    # 第三个值: 等于/proc/sys/fs/file-max(打开的最大fd数量)
    ```

2.  获取打开的文件数量

    - 获取整个系统打开的文件数量
      ```bash
      lsof | wc -l
      ```
    - 获取某个用户打开的文件数量

      ```bash
      lsof -u test |wc -l
      ```

    - 获取某个程序打开的文件数量
      ```bash
      for i in `pidof dotnet`; do
          lsof -p &#34;$i&#34; | wc -l ;
      done
      ```
    - 获取某个程序打开的文件描述符数量
      ```bash
      for i in `pidof dotnet` ; do
          echo -n &#34;$i : &#34;$(ll /proc/$i/fd|wc -l)
      done
      ```

3.  查看系统里占用 fd 最多的进程

```bash
    lsof -n | awk &#39;{print $2}&#39; | sort | uniq -c | sort -nr |head -n 10
    #第一列是占用的fd数量，第二列是进程的pid
```

&lt;/details&gt;

# 字符串拆分

```bash
echo &#34;hello&#34; |awk -F &#39;&#39; &#39;{for(i=1;i&lt;=NF;i&#43;&#43;)print $i}&#39;
#echo &#34;hello&#34; |awk &#39;{split($0,a,&#34;&#39;&#39;&#34;);for(v in a)print a[v]}&#39;
```

# 去除文本第一行和最后一行

```bash
seq 5 |awk&#39;NR&gt;2{print s}{s=$0}&#39;
```

# 查看当前主机类型

```
cat /sys/class/dmi/id/product_name
```

# find 查看特定后缀的文件

```bash
# find ./ -regex &#34;.*\.tar.gz\|.*\.7z&#34;
# find ./ -type f -regextype posix-extended -regex &#34;.*\.(tar.gz|7z)&#34;
```

# shell 范围随机数

```bash
# echo $((RANDOM % (max - min) &#43; min))
echo $((RANDOM % (99 - 80) &#43; 80))

# shuf -i min-max -n 1
shuf -i 0-8 -n 1
```

# linux 将时间戳转换为时间

```bash
date &#43;&#34;%F_%T&#34; -d$timestamp
```

# linux 远程桌面连接

```bash
# freerdp-2.2.0-1.fc32.x86_64
xfreerdp /v:&lt;hostip&gt; /u:&lt;username&gt; /drive:shares,&lt;本地目录&gt;
```

# linux 打包文件夹为 ISO 文件

```bash
mkisofs -o file.iso -J -R -V 01 file/

```

# Docker 与 iptables 只允许特定 ip 访问 Docker 的服务(DOCKER-USER)

&gt; https://blog.csdn.net/Liv2005/article/details/112850208

&gt; https://docs.docker.com/network/iptables/

```bash
# 允许172.31.10.0/24网段访问docker网络，eth0 为服务器对外通信网卡 
iptables -I DOCKER-USER -i eth0 ! -s 172.31.10.0/24 -j DROP
```



# openssl 公钥提取

```bash
# 从证书中提取
openssl x509 -in domain.pem -pubkey  -noout &gt; public.pem
# 从私钥中提取
openssl rsa -in private.key -pubout &gt; public.pem
```

# 查看本地监听信息

```bash
cat /proc/net/tcp | grep &#34; 0A &#34; | sed &#39;s/^[^:]*: \(..\)\(..\)\(..\)\(..\):\(....\).*/echo $((0x\4)).$((0x\3)).$((0x\2)).$((0x\1)):$((0x\5))/g&#39; | bash
```

# 获取 ping 域名的 ip

```bash
ping www.baidu.com -c 1 -w 1 | sed &#39;1{s/[^(]*(//;s/).*//;q}&#39;
```

# 检查用户是否有操作 docker 权限

```bash
sudo -u zabbix curl --unix-socket /var/run/docker.sock --no-buffer -XGET v1.24/_ping
```

# 分段压缩 
```bash
# 压缩
$&gt; tar czf - /pathto/dir01 /pathto/dir02 |split -d -b 2G - file.tgz.
# 解压
$&gt; cat file.tgz* | tar xz 

# 压缩
$&gt; zip -s 100m -r myarchive.zip myfolder/
# 解压
$&gt; unzip myarchive.zip
```

# 临时移动工作路径执行命令
```
$&gt; (cd /some/other/dir &amp;&amp; other-command)
```

# mount --bind 
```bash
# 将 olddir 绑定到  newdir
$&gt; mount -o bind olddir newdir

# /etc/fstab
# ro: 只读  rw: 只写
olddir newdir none defaults,ro,bind 0 0

# systemd
# /etc/systemd/system/sftpdir-mnt.mount
[Unit]
SourcePath=/etc/fstab
Documentation=man:fstab(5) man:systemd-fstab-generator(8)
Before=local-fs.target

[Mount]
What=olddir
Where=newdir
Type=none
Options=defaults,rw,bind

[Install]
WantedBy=multi-user.target

```

# systemd 守护桌面程序
```bash
# 以最新的QQ Linux版 3.0.0 为例，fedora33 下经常崩溃，用systemd守护其运行，在QQ崩溃时自动重启QQ
# 运行以下命令以启动systemd守护进程 
$&gt; /usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 替换默认 /usr/share/applications/qq.desktop的执行命令 Exec=/usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 日志检查，可以定位当前用户的日志看(或者 systemctl --user list-units run-*|grep qq，查询到systemd-run启动的service，直接定位)
$&gt; journalctl -f -u user@${UID}.service
```

# 证书相关操作 
```bash
#CA合并
#厂商提供的cer文件，全部合并为后缀为pem的文件，并将域的cer放在文件最前面,crt 在后面
#nginx导入key和pem即可

## 查看远程证书相关信息  
$&gt; echo | openssl s_client -connect tools.example.com:443 2&gt;&amp;- | sed -ne &#39;/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p&#39; &gt; remote-cert.pem \
        &amp;&amp; openssl x509 -in remote-cert.pem -text \
        &amp;&amp; rm remote-cert.pem
#     查看证书到期时间       
#     &amp;&amp; openssl x509 -in remote-cert.pem -enddate -noout      

## 
$&gt; openssl s_client -showcerts -connect tools.example.com:443 &lt;/dev/null | openssl x509 -inform PEM -noout -text     

##  CA证书取消密码
$&gt; openssl rsa -in &lt;ca-private-key-file&gt; -out &lt;ca-private-key-file&gt;.enc
##  CA证书添加密码
$&gt; openssl rsa -des3 -in &lt;ca-private-key-file&gt; -out &lt;ca-private-key-file&gt;.enc

# 证书生成 
## 创建ca私钥
$&gt; openssl genrsa -des3 -out ca.key 4096

## 创建ca证书
### /C=CN：证书持有者所在国家的两字母代码
### /ST=CQ：证书持有者所在省/直辖市/自治区的名称或缩写
### /O=example：证书持有者的组织或公司名称
### /CN=example：证书持有者的通用名称（Common Name），一般为服务器的域名或客户端的用户名
### /emailAddress=mail@example.com：证书持有者的电子邮件地址。
$&gt; openssl req -utf8 -x509 -new -nodes -key ca.key -sha512 -days 18250 -out ca.pem -subj &#34;/C=CN/ST=CQ/O=example/CN=example/emailAddress=mail@example.com&#34;

# 创建服务器私钥
$&gt; openssl genrsa -out server.key 4096

# 创建域名csr
$&gt; openssl req -new -key server.key -out server.csr -subj &#34;/C=CN/ST=CQ/O=0x5c0f/CN=example.com/emailAddress=mail@example.com&#34;


# 创建扩展
$&gt; cat &gt; server.ext &lt;&lt;EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth, codeSigning
subjectAltName = @alt_names
[alt_names]
DNS.1 = *.example.com
DNS.2 = *.example.cn
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# 生成域名证书
$&gt; openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 1825 -sha512 -extfile server.ext
```

# linux 端口转发
```bash
# linux 下端口转发
$&gt; echo 1 &gt;/proc/sys/net/ipv4/ip_forward

$&gt; iptables -t nat -A POSTROUTING -j MASQUERADE
$&gt; iptables -A FORWARD -i [内网网卡名称] -j ACCEPT
$&gt; iptables -t nat -A POSTROUTING -s [内网网段] -o [外网网卡名称] -j MASQUERADE
$&gt; iptables -t nat -A PREROUTING -p tcp -m tcp --dport [外网端口] -j DNAT --to-destination [内网地址]:[内网端口]
```

# linux 下实现内网上公网
```bash
# 允许NAT功能和网络包的转发(eth0 为可以连接公网的网卡)
$&gt; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# 允许从内网到公网的数据包转发
$&gt; sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
# sudo iptables -A FORWARD -i eth1 -s 10.0.2.33 -o eth0 -j ACCEPT
# 允许已经建立连接的流量转发
$&gt; sudo iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
# sudo iptables -A FORWARD -i eth0 -d 10.0.2.33 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

# linux 查询cpu占用过高的php-fpm进程,正在执行的php脚本或者处理的事
```bash
# 1. 通过top找到正在消耗 CPU 的 php-fpm 进程的 PID 
# 2. 使用 strace 命令跟踪该进程：
$&gt; strace -p &lt;PID&gt; -e trace=open,execve,stat
# 3. 在输出中查找正在执行的 PHP 脚本
$&gt; strace -p &lt;PID&gt; -e trace=open,execve,stat 2&gt;&amp;1 | grep &#39;\.php&#39;
```

# 查询当前目录下 `md5` 相同的文件 
```bash
$&gt; find . -type f -exec md5sum {} &#43; | sort | uniq -w32 -dD
# uniq -w32 -dD：找到重复的MD5哈希，并只打印重复的行
```

# 查询当前目录下 `md5` 等于某个值并删除/移动
```bash
# 删除
$&gt; find . -type f -exec md5sum {} &#43; | grep &#39;your_md5_value&#39; | cut -d &#39; &#39; -f 2- | xargs rm
# 移动
$&gt; find . -type f -exec md5sum {} &#43; | grep &#39;your_md5_value&#39; | cut -d &#39; &#39; -f 2- | xargs -I {} mv {} /path/to/destination/
```

# 通过 `skopeo` 命令查询 `docker` 仓库中特定容器存在那些版本，也可以用于管理
```bash
# 查询 
$&gt; skopeo list-tags docker://hub.example.com/0x5c0f/sshx
# 删除
$&gt; skopeo delete docker://hub.example.com/0x5c0f/sshx:2023121505
# ...
```

# 查询 `docker` 运行容器的 `cpu` 占用信息，并按照 `cpu` 占用排序
```bash
$&gt; watch -n 3 &#39;docker stats --no-stream --format &#34;table {{.Name}}\t{{.CPUPerc}}&#34; | sort -k 2 -r&#39;
```

# docker-compose 同时查询`服务名`、`容器名`、`容器id`  
```bash
# 需要 docker-compose v2
$&gt; docker compose ps --format &#34;table {{.Service}}:{{.Name}}\t{{.ID}}&#34; 
```

# 实时写入的大文件压缩切割 
```bash
$&gt; gzip -c a.log &gt;/tmp/a.log.gz &amp;&amp; &gt; a.log
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E5%B8%B8%E7%94%A8%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/  

