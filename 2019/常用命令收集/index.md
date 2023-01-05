# 常用命令收集


<!--more-->

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

# 证书生成

```bash
## 自签证书
openssl req -newkey rsa:2048 -x509 -nodes -days 3560 -out server.crt -keyout server.key

## ssl key ，csr 生成
openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.csr

https://blog.csdn.net/cy_cai/article/details/54632671

#CA合并
#厂商提供的cer文件，全部合并为后缀为pem的文件，并将域的cer放在文件最前面,cat 在后面
#nginx导入key和pem即可
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
```

# linux 将时间戳转换为时间

```bash
date +"%F_%T" -d$timestamp
```

# linux 远程桌面连接

```bash
# freerdp-2.2.0-1.fc32.x86_64
xfreerdp /v:<hostip> /u:<username> /drive:shares,<本地目录>
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
```

# 临时移动工作路径执行命令
```
$> (cd /some/other/dir && other-command)
```

# mount --bind 
> 详解参见: https://www.modb.pro/db/248315

```bash

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

# systemd 守护桌面程序
```bash
# 以最新的QQ Linux版 3.0.0 为例，fedora33 下经常崩溃，用systemd守护其运行，在QQ崩溃时自动重启QQ
# 运行以下命令以启动systemd守护进程 
$> /usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 替换默认 /usr/share/applications/qq.desktop的执行命令 Exec=/usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 日志检查，可以定位当前用户的日志看(或者 systemctl --user list-units run-*|grep qq，查询到systemd-run启动的service，直接定位)
$> journalctl -f -u user@${UID}.service
```
