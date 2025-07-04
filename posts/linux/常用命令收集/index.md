# 常用命令收集


引入一个更为专业的命令收集站点 :

> [https://www.commandlinefu.com/commands/browse](https://www.commandlinefu.com/commands/browse)

# 统计第一列相同，第二列平均值

```bash
cat xxx |awk '{a[$1]+=$2;c[$1]++}END{l=asorti(a,b);for(i=1;i<=l;i++)print b[i],a[b[i]]/c[b[i]]}'
```

# 时间段统计日志：

```bash
sed -n '/2018:02:30/,/2018:03:00/p' www.log |awk '{a[$1]+=1;} END {for(i in a){print a[i]" "i;}}' |sort -t " " -k 1 -n
sed -n '/2018:01:50/,/2018:02:00/p' www.log |grep "list?" |awk '{a[$1]+=1;} END {for(i in a){print a[i]" "i;}}' |sort -t " " -k 1 -n
```

# 按照 ip 排序

```bash
# 升序
sort -t'.' -k1,1n -k2,2n -k3,3n -k4,4n ip.txt
# 降序
sort -t'.' -k1,1nr -k2,2nr -k3,3nr -k4,4nr ip.txt
```

# shell 中获取脚本绝对路径

```bash
SHELL_DIR=$(dirname $(readlink -f "$0"))
SHELL_DIR=$(cd `dirname $0`; pwd)
```

# tailf 显示高亮

```bash
 tail -f www.log | perl -pe 's/(\/pattern1\/pattern2)/\e[1;31m$1\e[0m/g'

 tail -f www.log |grep --color -E 'pattern|$'
```

# openssl 通过证书加密解密大文件

```bash
mkdir /etc/encrypt && cd /etc/encrypt

openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -outform PEM -pubout -out public.pem
openssl rand -base64 32 > key.bin   # 远程传输建议每次都新建

# 加密
openssl rsautl -encrypt -pubin -inkey /etc/encrypt/public.pem -in /etc/encrypt/key.bin -out /etc/encrypt/key.bin.enc
openssl aes-256-cfb -a -pbkdf2 -salt -in  filename.gz -out filename.gz.enc -k $(cat /etc/encrypt/key.bin)

# 解密
openssl rsautl -decrypt -inkey private.pem -in key.bin.enc -out key.bin
openssl aes-256-cfb -d -a -pbkdf2 -in filename.gz.enc -out filename.gz -k $(cat key.bin)


# 加密
tar -czf - * |  openssl aes-256-cfb -salt -k "8CASiU6zxAWy9QZ8wj+MgIzqHsBnXjgkHNvWeJ0urHw=" -out ssh.key.pem.enc

openssl aes-256-cfb -d -salt -in ssh.key.pem.enc -out ssh_key.pem.tar.gz

```

# 手动检测: 每分钟连接次数

```bash
netstat -ntu | awk '{print $5}' |cut -d: -f1|sort|uniq -c |sort -n
netstat -an |grep ^tcp.*:80|egrep -v 'LISTEN|127.0.0.1'|awk -F"[ ]+|[:]" '{print $6}'|sort|uniq -c|sort -rn
```

# linux 用 tcpdump 查看 80 端口访问有哪些 IP

```bash
tcpdump -i eth0 -tnn dst port 80 -c 1000|awk -F"." '{print $1"."$2"."$3"."$4}'|sort|uniq -c|sort -rn|head -n20
```

# 查看 linux 内存占用最高的 10 个进程

```bash
ps aux|head -1 && ps aux|grep -v PID|sort -rn -k +4|head
```

# linux 查看 cpu 占用最高的 10 个进程

```bash
ps aux|head -1;ps aux|grep -v PID|sort -rn -k +3|head
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
ps -eal | awk '{ if ($2 == "Z") {print $4}}' | kill -9
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
# watch "netstat -ntu | awk '{print $5}' |cut -d: -f1|sort|uniq -c |sort -n"
```

# 创建一个具有特定权限的空文件

```bash
#install -b -m <权限> <来源> <目标>
install -b -m 777 /dev/null file.txt
```

# 创建一个具有特定权限的目录

```bash
# install -d -o <用户名> -g <用户组> -m <权限> <目标地址>
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

<details>
<summary>点击展开详细内容</summary>

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
          lsof -p "$i" | wc -l ;
      done
      ```
    - 获取某个程序打开的文件描述符数量
      ```bash
      for i in `pidof dotnet` ; do
          echo -n "$i : "$(ll /proc/$i/fd|wc -l)
      done
      ```

3.  查看系统里占用 fd 最多的进程

```bash
    lsof -n | awk '{print $2}' | sort | uniq -c | sort -nr |head -n 10
    #第一列是占用的fd数量，第二列是进程的pid
```

</details>

# 字符串拆分

```bash
echo "hello" |awk -F '' '{for(i=1;i<=NF;i++)print $i}'
#echo "hello" |awk '{split($0,a,"''");for(v in a)print a[v]}'
```

# 去除文本第一行和最后一行

```bash
seq 5 |awk'NR>2{print s}{s=$0}'
```

# 查看当前主机类型

```
cat /sys/class/dmi/id/product_name
```

# find 查看特定后缀的文件

```bash
# find ./ -regex ".*\.tar.gz\|.*\.7z"
# find ./ -type f -regextype posix-extended -regex ".*\.(tar.gz|7z)"
```

# shell 范围随机数

```bash
# echo $((RANDOM % (max - min) + min))
echo $((RANDOM % (99 - 80) + 80))

# shuf -i min-max -n 1
shuf -i 0-8 -n 1
```

# linux 将时间戳转换为时间

```bash
date +"%F_%T" -d$timestamp
```

# linux 远程桌面连接

```bash
# freerdp-2.2.0-1.fc32.x86_64
xfreerdp /cert:ignore /size:1920x1080 +clipboard /drive:share,<本地目录> /u:<用户名>  /v:<targetip> /p:<password>
```

# linux 打包文件夹为 ISO 文件

```bash
mkisofs -o file.iso -J -R -V 01 file/

```

# Docker 与 iptables 只允许特定 ip 访问 Docker 的服务(DOCKER-USER)

> https://blog.csdn.net/Liv2005/article/details/112850208

> https://docs.docker.com/network/iptables/

```bash
# 允许172.31.10.0/24网段访问docker网络，eth0 为服务器对外通信网卡 
iptables -I DOCKER-USER -i eth0 ! -s 172.31.10.0/24 -j DROP
```



# openssl 公钥提取

```bash
# 从证书中提取
openssl x509 -in domain.pem -pubkey  -noout > public.pem
# 从私钥中提取
openssl rsa -in private.key -pubout > public.pem
```

# 查看本地监听信息

```bash
cat /proc/net/tcp | grep " 0A " | sed 's/^[^:]*: \(..\)\(..\)\(..\)\(..\):\(....\).*/echo $((0x\4)).$((0x\3)).$((0x\2)).$((0x\1)):$((0x\5))/g' | bash
```

# 获取 ping 域名的 ip

```bash
ping www.baidu.com -c 1 -w 1 | sed '1{s/[^(]*(//;s/).*//;q}'
```

# 检查用户是否有操作 docker 权限

```bash
sudo -u zabbix curl --unix-socket /var/run/docker.sock --no-buffer -XGET v1.24/_ping
```

# 分段压缩 
```bash
# 压缩
$> tar czf - /pathto/dir01 /pathto/dir02 |split -d -b 2G - file.tgz.
# 解压
$> cat file.tgz* | tar xz 

# 压缩
$> zip -s 100m -r myarchive.zip myfolder/
# 解压
$> unzip myarchive.zip
```

# 临时移动工作路径执行命令
```
$> (cd /some/other/dir && other-command)
```

# mount --bind 
```bash
# 将 olddir 绑定到  newdir
$> mount -o bind olddir newdir

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

# 证书相关操作 
```bash
#CA合并
#厂商提供的cer文件，全部合并为后缀为pem的文件，并将域的cer放在文件最前面,crt 在后面
#nginx导入key和pem即可

## 查看远程证书相关信息  
$> echo | openssl s_client -connect tools.example.com:443 2>&- | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > remote-cert.pem \
        && openssl x509 -in remote-cert.pem -text \
        && rm remote-cert.pem
#     查看证书到期时间       
#     && openssl x509 -in remote-cert.pem -enddate -noout      

## 
$> openssl s_client -showcerts -connect tools.example.com:443 </dev/null | openssl x509 -inform PEM -noout -text     

##  CA证书取消密码
$> openssl rsa -in <ca-private-key-file> -out <ca-private-key-file>.enc
##  CA证书添加密码
$> openssl rsa -des3 -in <ca-private-key-file> -out <ca-private-key-file>.enc

# 证书生成 
## 创建ca私钥
$> openssl genrsa -des3 -out ca.key 4096

## 创建ca证书
### /C=CN：证书持有者所在国家的两字母代码
### /ST=CQ：证书持有者所在省/直辖市/自治区的名称或缩写
### /O=example：证书持有者的组织或公司名称
### /CN=example：证书持有者的通用名称（Common Name），一般为服务器的域名或客户端的用户名
### /emailAddress=mail@example.com：证书持有者的电子邮件地址。
$> openssl req -utf8 -x509 -new -nodes -key ca.key -sha512 -days 18250 -out ca.pem -subj "/C=CN/ST=CQ/O=example/CN=example/emailAddress=mail@example.com"

# 创建服务器私钥
$> openssl genrsa -out server.key 4096

# 创建域名csr
$> openssl req -new -key server.key -out server.csr -subj "/C=CN/ST=CQ/O=0x5c0f/CN=example.com/emailAddress=mail@example.com"


# 创建扩展
$> cat > server.ext <<EOF
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
$> openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 1825 -sha512 -extfile server.ext
```

# linux 端口转发
```bash
# linux 下端口转发
$> echo 1 >/proc/sys/net/ipv4/ip_forward

$> iptables -t nat -A POSTROUTING -j MASQUERADE
$> iptables -A FORWARD -i [内网网卡名称] -j ACCEPT
$> iptables -t nat -A POSTROUTING -s [内网网段] -o [外网网卡名称] -j MASQUERADE
$> iptables -t nat -A PREROUTING -p tcp -m tcp --dport [外网端口] -j DNAT --to-destination [内网地址]:[内网端口]
```

# linux 下实现内网上公网
```bash
# 允许NAT功能和网络包的转发(eth0 为可以连接公网的网卡)
$> iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# 允许从内网到公网的数据包转发
$> sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
# sudo iptables -A FORWARD -i eth1 -s 10.0.2.33 -o eth0 -j ACCEPT
# 允许已经建立连接的流量转发
$> sudo iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
# sudo iptables -A FORWARD -i eth0 -d 10.0.2.33 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

# linux 查询cpu占用过高的php-fpm进程,正在执行的php脚本或者处理的事
```bash
# 1. 通过top找到正在消耗 CPU 的 php-fpm 进程的 PID 
# 2. 使用 strace 命令跟踪该进程：
$> strace -p <PID> -e trace=open,execve,stat
# 3. 在输出中查找正在执行的 PHP 脚本
$> strace -p <PID> -e trace=open,execve,stat 2>&1 | grep '\.php'
```

# 查询当前目录下 `md5` 相同的文件 
```bash
$> find . -type f -exec md5sum {} + | sort | uniq -w32 -dD
# uniq -w32 -dD：找到重复的MD5哈希，并只打印重复的行
```

# 查询当前目录下 `md5` 等于某个值并删除/移动
```bash
# 删除
$> find . -type f -exec md5sum {} + | grep 'your_md5_value' | cut -d ' ' -f 2- | xargs rm
# 移动
$> find . -type f -exec md5sum {} + | grep 'your_md5_value' | cut -d ' ' -f 2- | xargs -I {} mv {} /path/to/destination/
```

# 通过 `skopeo` 命令查询 `docker` 仓库中特定容器存在那些版本，也可以用于管理
```bash
# 查询 
$> skopeo list-tags docker://hub.example.com/0x5c0f/sshx
# 删除
$> skopeo delete docker://hub.example.com/0x5c0f/sshx:2023121505
# ...
```

# 查询 `docker` 运行容器的 `cpu` 占用信息，并按照 `cpu` 占用排序
```bash
$> watch -n 3 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}" | sort -k 2 -r'
```

# docker-compose 同时查询`服务名`、`容器名`、`容器id`  
```bash
# 需要 docker-compose v2
$> docker compose ps --format "table {{.Service}}:{{.Name}}\t{{.ID}}" 
```

# 实时写入的大文件压缩切割 
```bash
$> gzip -c a.log >/tmp/a.log.gz && > a.log
```

# 将图片转化为指定大小，并且在图片高宽度不够时候，用透明背景填充 
```bash
$> ffmpeg -i input.(png|svg|..) -vf "scale=944:944:force_original_aspect_ratio=decrease,pad=944:944:(944-iw)/2:(944-ih)/2:color=0x00000000" output.png
```

# Pwgen 创建密码, 忽略特定字符串
```bash
$> alias pwgen="pwgen -s -r \\\`\\~\\!\\#\\$\\&\\(\\)\\_\\-\\+\\=\\{\\}\\[\\]\\\\\\|\\;\\:\\'\\\"\\,\\<\\>\\?\\/"
```

## tee 为每一条日志记录插入时间戳
```bash
$> command 2>&1 | tee >(awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0 }' >> user/stdout_output.log)
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E5%B8%B8%E7%94%A8%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/  

