# Docker 部署与常用操作


&amp;emsp;&amp;emsp;Docker 是通过内核虚拟化技术(namespaces及cgroups等)来提供容器的资源隔离与安全保障等.由于docker通过操作系统层的虚拟化实现隔离,所以Dociker容器在运行时,不需要虚拟机(VM)额外的操作系统开销,提高资源利用率.  
安装环境:  
- CentOS 7 
- docker: 17.09.0-ce   
- virtualbox: 5.1.30
# 1. 前言
 docker 能干什么?
  1.  简化配置  
  2. 代码流水线管理  
  3. 环境一致性,提高开发效率  
  4. 快速部署  
   ...  
# 2. 安装并启动docker  
```bash
[root@00 ~]# yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo  #导入docker源以便于安装最新版docker
[root@00 ~]# yum install docker-ce -y 
#########忽略安装过程#############
[root@00 ~]# systemctl start docker         #启动docker
● docker.service - Docker Application Container Engine
   Loaded: loaded (/usr/lib/systemd/system/docker.service; disabled; vendor preset: disabled)
   Active: active (running) since 三 2017-10-25 01:30:27 EDT; 4min 2s ago
     Docs: https://docs.docker.com
 Main PID: 2788 (dockerd)
   Memory: 21.3M
   CGroup: /system.slice/docker.service
           ├─2788 /usr/bin/dockerd
           └─2793 docker-containerd -l unix:///var/run/docker/libcontainerd/docker-containerd.sock --metrics-interval=0 --start-time...
#############省略部分数据###################

[root@00 ~]# ifconfig docker0 # docker 安装成功后默认创建一个docker0默认的网桥 
docker0: flags=4099&lt;UP,BROADCAST,MULTICAST&gt; mtu 1500
 inet 172.17.0.1 netmask 255.255.0.0 broadcast 0.0.0.0
 ether 02:42:72:b8:2a:55 txqueuelen 0 (Ethernet)
 RX packets 0 bytes 0 (0.0 B)
 RX errors 0 dropped 0 overruns 0 frame 0
 TX packets 0 bytes 0 (0.0 B)
 TX errors 0 dropped 0 overruns 0 carrier 0 collisions 0﻿​
 
```
# 3. docker的使用  
## 3.1. 镜像的增、删、查  
```bash
# &gt;&gt;&gt; 镜像查询 
[root@00 ~]# docker search centos           #镜像搜索
INDEX       NAME                                         DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
docker.io   docker.io/centos                             The official build of CentOS.                   3732      [OK]       
docker.io   docker.io/ansible/centos7-ansible            Ansible on Centos7                              102                  [OK]
docker.io   docker.io/jdeathe/centos-ssh                 CentOS-6 6.9 x86_64 / CentOS-7 7.4.1708 x8...   87                   [OK]
#------------------省略部分数据---------------------
# &gt;&gt;&gt; 镜像下载 
[root@00 default]# docker pull docker.io/centos  #镜像远程下载
#关于docker的加速器的配置，这个阿里云也有相关配置方法，具体不多说，下面是具体的配置文件和格式
# /etc/docker/daemon.json
#{
#  &#34;registry-mirrors&#34;: [&#34;你的加速地址&#34;]
#}
#
Using default tag: latest
Trying to pull repository docker.io/library/centos ... 
latest: Pulling from docker.io/library/centos
d9aaf4d82f24: Pull complete 
Digest: sha256:eba772bac22c86d7d6e72421b4700c3f894ab6e35475a34014ff8de74c10872e

# &gt;&gt;&gt; 镜像查看 
[root@00 ~]# docker images              #查看已安装镜像
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
docker.io/centos    latest              196e0ce0c9fb        5 weeks ago         196.6 MB

# &gt;&gt;&gt; 镜像导出
[root@00 ~]# docker save -o centos.tar docker.io/centos # 导出镜像到本地
[root@00 default]# docker rmi 196e0ce0c9fb              # 镜像删除，使用镜像id进行删除
Untagged: docker.io/centos:latest
Untagged: docker.io/centos@sha256:eba772bac22c86d7d6e72421b4700c3f894ab6e35475a34014ff8de74c10872e
Deleted: sha256:196e0ce0c9fbb31da595b893dd39bc9fd4aa78a474bbdc21459a3ebe855b7768
Deleted: sha256:cf516324493c00941ac20020801553e87ed24c564fb3f269409ad138945948d4

# &gt;&gt;&gt; 镜像导入 
[root@00 ~]# docker load --input centos.tar  # 导入本的镜像或者docker load &lt; centos.tar，关于docker命令，如果你是普通用户，只需要把你的用户加入到docker组当中就不需要sudo才可以执行命令了 sudo usermod -aG docker zabbix
cf516324493c: Loading layer [==================================================&gt;] 205.2 MB/205.2 MB
Loaded image: docker.io/centos:latest
[root@00 ~]# docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
docker.io/centos    latest              196e0ce0c9fb        5 weeks ago         196.6 MB
```

## 3.2. 容器的添加、删除、登陆
```bash 
[root@00 ~]# docker run centos /bin/echo &#39;hello word&#39; # centos 为镜像名称，命令格式:docker run [参数] [镜像名称] [运行命令] (注：进程结束即代表容器结束)
hello word
############ 新建一个mydocker的容器，他的镜像是centos                         ########
############ --name：指定容器名称  -t：让docker分配一个伪终端，-i：表示打开标准输入  ########
[root@00 ~]# docker run --name mydocker -t -i centos /bin/bash  
[root@8679d53c43c4 /]# ls  #&lt;=======注意看主机名已经改变 
anaconda-post.log  bin  dev  etc  home  lib  lib64  lost&#43;found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
[root@8679d53c43c4 /]# uname -a  
Linux 8679d53c43c4 3.10.0-327.el7.x86_64 #1 SMP Thu Nov 19 22:10:57 UTC 2015 x86_64 x86_64 x86_64 GNU/Linux
[root@8679d53c43c4 /]# exit     # 退出容器，则进程关闭，代表此容器已完全关闭
exit
[root@00 ~]# docker ps -a           # 查看已有容器
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS                      PORTS               NAMES
8679d53c43c4        centos           &#34;/bin/bash&#34;              16 minutes ago      Exited (0) 5 seconds ago                        mydocker
5ae63174779d        centos           &#34;/bin/echo &#39;hello wor&#34;   23 minutes ago      Exited (0) 23 minutes ago                       infallible_swirles
[root@00 ~]# docker start mydocker      # 重新启动容器，启动对象可以是id，也可以是名称
mydocker
[root@00 ~]# docker ps -a
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                      PORTS               NAMES
dbf1c20e7229        centos              &#34;/bin/echo &#39;hello wor&#34;   23 minutes ago      Exited (0) 23 minutes ago                       infallible_swirles
8679d53c43c4        centos              &#34;/bin/bash&#34;              16 minutes ago      Up 6 minutes                                    mydocker
[root@00 ~]# docker attach mydocker     #重新连接到容器
[root@8679d53c43c4 /]#          #&lt;=================
[root@8679d53c43c4 /]#exit      #&lt;=================此处退出会直接退出容器
exit
[root@00 ~]# docker start mydocker      #重新启动
mydocker
##########如果你是真的认真看了前面的话，那么下面的东西应该就是你现在很想知道的############
##########第一种退出不关闭容器的方法#############
[root@00 ~]# docker inspect -f &#34;{{ .State.Pid }}&#34; mydocker      #获取mydocker进程的pid
6076
[root@00 ~]# nsenter -t 6076 -m -u -i -n -p     #nsenter 一个用于进入docker容器的一个命令，命令包含于包：util-linux中
######-t:指定pid -m、-u、-i、-p 表示进入不同的namespace，这个我还没有理解到是什么意思？
[root@8679d53c43c4 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 09:44 ?        00:00:00 /bin/bash       #容器执行的第一个进程
root        13     0  0 09:55 ?        00:00:00 -bash           #nsenter 执行运行的bash，若退出，则退出的是此bash，运行的容器不会被关闭
root        30    13  0 09:58 ?        00:00:00 ps -ef
[root@8679d53c43c4 /]# exit         #&lt;======================此处退出，不会关闭容器
logout
[root@00 ~]# docker ps -a
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS                      PORTS               NAMES
dbf1c20e7229        centos           &#34;/bin/echo &#39;hello wor&#34;   32 minutes ago      Exited (0) 29 minutes ago                       infallible_swirles
8679d53c43c4        centos           &#34;/bin/bash&#34;              52 minutes ago      Up 15 minutes                                   mydocker

[root@00 ~]# vim docker_start.sh        #创建docker 连接脚本 ，传入参数为名称或id
#!/bin/bash
# user nsenter to access docker

docker_in(){
  NAME_ID=$1
  PID=$(docker inspect -f &#34;{{ .State.Pid }}&#34; $NAME_ID)
  nsenter -t $PID -m -u -i -n -p
}

docker_in $1
######第二种退出不关闭容器的方法#######
[root@00 sh]# docker exec -it mydocker /bin/bash
[root@ec3b3acd0611 /]# ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0  11776  1664 ?        Ss&#43;  05:39   0:00 /bin/bash
root        28  0.1  0.0  11776  1884 ?        Ss   05:41   0:00 /bin/bash      #&lt;=======这一个是exec进入使用的bash
root        42  0.0  0.0  47448  1668 ?        R&#43;   05:42   0:00 ps aux
[root@ec3b3acd0611 /]# exit             #&lt;===========退出后不会关闭容器
exit
[root@00 sh]# docker ps -a          
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS                     PORTS               NAMES
ec3b3acd0611        centos           &#34;/bin/bash&#34;              5 minutes ago       Up 4 minutes                                   mydocker
f7d281e95ab7        centos           &#34;/bin/echo &#39;hello wor&#34;   5 minutes ago       Exited (0) 5 minutes ago                       clever_ritchie
[root@00 sh]# docker exec mydocker ps -aux          #docker exec  还有个功能，不进入容器执行命令
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0  11776  1664 ?        Ss&#43;  05:39   0:00 /bin/bash
root        55  0.0  0.0  47448  1664 ?        Rs   05:45   0:00 ps -aux
[root@00 sh]# docker rm f7d281e95ab7    #   删除容器，
f7d281e95ab7
[root@00 sh]# docker ps -a
CONTAINER ID        IMAGE            COMMAND             CREATED             STATUS              PORTS               NAMES
ec3b3acd0611        centos           &#34;/bin/bash&#34;         30 minutes ago      Up 29 minutes                           mydocker
[root@00 sh]# docker ps -a
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS                      PORTS               NAMES
ec3b3acd0611        centos           &#34;/bin/bash&#34;              30 minutes ago      Up 29 minutes                                   mydocker
f7d281e95ab7        centos           &#34;/bin/echo &#39;hello wor&#34;   30 minutes ago      Exited (0) 30 minutes ago                       clever_ritchie
[root@00 sh]# docker rm f7d281e95ab7        #删除容器，(docker rm -f xxxxx:删除正在运行的容器)
f7d281e95ab7
[root@00 sh]# docker ps -a
CONTAINER ID        IMAGE            COMMAND             CREATED             STATUS              PORTS               NAMES
ec3b3acd0611        centos           &#34;/bin/bash&#34;         30 minutes ago      Up 29 minutes                           mydocker
[root@00 sh]# docker run --rm centos /bin/echo &#34;hello&#34;          #临时在一个容器下执行，及执行后立即删除该容器
hello
[root@00 sh]# docker ps -a
CONTAINER ID        IMAGE            COMMAND             CREATED             STATUS              PORTS               NAMES
ec3b3acd0611        centos           &#34;/bin/bash&#34;         About an hour ago   Up About an hour                        mydocker
```
## 3.3. docker 的网络访问  
网络访问类型：
### 3.3.1. 随即映射：随机指定端口
```bash
[root@00 ~]# docker run --name mynginx -d -P nginx       # -d：运行至后台 -P：随机指定端口
b9d892abd87e2df6a0b5ff5c79a82d4de885a22a97359f6cf0a38e25ed4b2665
[root@00 ~]# docker ps -a   #从进程中看到本地32768映射到主机容器的80端口
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS              PORTS                   NAMES
b9d892abd87e        nginx            &#34;nginx -g &#39;daemon ...&#34;   25 seconds ago      Up 24 seconds       0.0.0.0:32768-&gt;80/tcp   mynginx
[root@00 ~]# curl -I 127.0.0.1:32768       #请求地址，可以看到映射是成功的
HTTP/1.1 200 OK
Server: nginx/1.13.5
Date: Wed, 25 Oct 2017 11:59:45 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 08 Aug 2017 15:25:00 GMT
Connection: keep-alive
ETag: &#34;5989d7cc-264&#34;
Accept-Ranges: bytes

[root@00 docker]# iptables -t nat -nvL|grep -i dnat         
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:32768 to:172.17.0.2:80
```
### 3.3.2. 指定映射:指定端口(IP)映射  
```bash
[root@00 ~]# docker run -d -p 81:80 --name nginx-81 nginx       # -p(小写): 格式 ip:映射端口:容器端口,可指定多个映射，格式不变，多个-p 加映射
7937cd85d6af922defba7d39ed579ca517f33de2241ffea06ad19bec874064aa
[root@00 ~]# docker ps -a
CONTAINER ID        IMAGE            COMMAND                  CREATED             STATUS              PORTS                   NAMES
7937cd85d6af        nginx            &#34;nginx -g &#39;daemon ...&#34;   31 seconds ago      Up 30 seconds       0.0.0.0:81-&gt;80/tcp      nginx-81
b9d892abd87e        nginx            &#34;nginx -g &#39;daemon ...&#34;   24 minutes ago      Up 24 minutes       0.0.0.0:32768-&gt;80/tcp   mynginx

# 映射到指定地址的指定端口 ip:hostPort:containerPort(-p 127.0.0.1:80:80)
# 映射到指定地址的任意端口 ip::containerPort(-p 127.0.0.1::0)
# 查看映射端口配置 docker port [dockername]
```
# 4. docker 数据管理  
## 4.1. 数据卷  
数据持久化配置，类似于linux下的mount，将容器内部目录挂载出来  
```bash
[root@00 ~]# docker run -d --name nginx1 -v /opt/sh/:/opt/sh/ nginx 
77ea81965a73905cb677c0d93a337579e510f731e1de00d5e25c3462211cdf24
# -v src:dst&lt;:ro&gt; (-v 本地目录：映射目录:挂载方式(ro只读,默认rw)),挂载时，本地内容将覆盖容器内的内容
#  同样,-v的挂载也可以挂载文件，书写方式与挂载目录一样
```
## 4.2. 数据卷容器
 用于多个容器之间的数据共享(其实就是个人感觉就是-v的升级版)  
 ```bash
[root@00 ~]# docker run -d --name nginx2 --volumes-from nginx1 nginx # --volumes-from跟的是需要挂载数据卷的容器名称
0bbd96890b19d7256dd9e668f0810d84fb45339fe05ed80a8e60ec3754fcefd5 
#  挂载的数据卷容器停止时也可以实现数据共享
 ```
# 5. docker镜像构建与dockerfile  
## 5.1. 手动构建
手动构建实际上就是在原有的官方基础镜像上安装自己所需要的东西  
```bash
[root@00 ~]# docker run --name mynginx -it centos       #先启动一个基础镜像
shaode #安装完成后可删除下载的缓存,可进一步缩小镜像的大小
[root@2ab2639cdff2 /]# yum install nginx -y             
Loaded plugins: fastestmirror, ovl
#----------------- 略过过程---------------------
[root@2ab2639cdff2 /]# vi /etc/nginx/nginx.conf
daemon off;             #在首行添加参数,让nginx运行到前台
[root@00 ~]# docker commit -m &#34;mynginx-test&#34; 2ab2639cdff2 store/mynginx:v1   #提交仓库到本地镜像
sha256:3febcd06010093dacdde2de49822d63819ff41003d87e732416798bbc36bd685
[root@00 ~]# docker images
REPOSITORY              TAG            IMAGE ID            CREATED             SIZE
store/mynginx           v1             3febcd060100        54 seconds ago      374MB     #此镜像就修改后的镜像,可以看出镜像的大小与基础镜像centos不一样
centos                  latest         196e0ce0c9fb        4 months ago        197MB
nginx                   latest         1e5ab59102ce        3 months ago        108MB
[root@00 ~]# docker run --name mynginxv1 -it store/mynginx:v1 nginx #store/mynginx:v1 一定加上TAG 否则他无法识别,将会在仓库中下载最后一个版本的
[root@00 ~]#
```

## 5.2. Dockerfile 
### 5.2.1. 一个简单的Dockerfile示例  
```bash
[root@00 ~]# cd /data/docker/Dockerfile 
[root@00 Dockerfile]# vim Dockerfile 
# This Dockerfile
# 基础镜像
FROM centos

# 维护者
MAINTAINER blog.cx115.me 

# 命令
RUN yum install -y epel-release
RUN yum install -y nginx &amp;&amp; yum clean all

# 设置nginx运行到前台
RUN echo &#34;daemon off;&#34; &gt;&gt; /etc/nginx/nginx.conf

# 添加一个文件到一个目录下
ADD index.html /usr/share/nginx/html/index.html

# 对外开放80端口
EXPOSE 80


# 启动的命令
CMD [&#34;nginx&#34;]
[root@00 Dockerfile]# echo &#34;hello docker&#34; &gt;&gt; index.html
```
### 5.2.2. 构建镜像  
```bash
[root@00 Dockerfile]# docker build -t nginx_f:v2 .
# 构建时候可以通过 --build-arg 来指定运行时候的环境变量 
# docker build --build-arg &#34;HTTP_PROXY=http://proxy.example.com:8080/&#34; \
#   --build-arg &#34;HTTPS_PROXY=http://proxy.example.com:8080/&#34; \
#   --build-arg &#34;NO_PROXY=localhost,127.0.0.1,.example.com&#34; -t nginx_f:v2 .

Sending build context to Docker daemon  3.072kB
Step 1/8 : FROM centos
........
Successfully built 955bbe2213cc
Successfully tagged nginx_f:v2
[root@00 Dockerfile]# docker images 
REPOSITORY           TAG                 IMAGE ID            CREATED             SIZE
nginx_f              v2                  955bbe2213cc        34 seconds ago      357MB
```

### 5.2.3. 启动镜像
```bash
[root@00 Dockerfile]# docker run -d -p 88:80 nginx_f:v2 
6e878cfe032e83091840ff8b7bb5142293131ff1b98e5c5b2bc80379b50a68e8
[root@00 Dockerfile]# docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                NAMES
6e878cfe032e        nginx_f:v2          &#34;nginx&#34;             3 seconds ago       Up 1 second         0.0.0.0:88-&gt;80/tcp   dazzling_gauss
[root@00 Dockerfile]# curl http://127.0.0.1:88
hello docker
```
### 5.2.4. Dockerfile 命令  
&gt; https://www.cnblogs.com/dazhoushuoceshi/p/7066041.html  

|命令|描述|
|-|-|
|FROM|指定基础镜像(Dockerfile第一条命令必须是FROM)|
|MAINTAINER|指定信息维护者(描述)|
|RUN|需要让他执行什么命令|
|ADD|copy文件，会自动解压|
|WORKDIR|设置当前工作目录|
|VOLUME|设置卷，挂载主机目录|
|EXPOSE|指定对外的端口(镜像启动时-P随机映射的端口)|
|CMD|镜像启动后要做什么事情(启动命令，只能有一条，多条执行最后一条，镜像启动指定命令，则会覆盖这条)|
|ENTRYPOINT|与CMD命令一样，但如果镜像启动指定命令，则不会被覆盖|

## 5.3. Dcokerfile 生产实践
1. 一般先根据基础镜像构建适合自己的基础镜像(包含需要使用的一些工具等)，再由自己构建的基础镜像构建实际需要使用的环境(如php、nginx等)。  
2. Dockerfile在被修改时，镜像重新构建将从修改位置进行重建，因此把执行过程较长的放在前面可以让重新构建的时间减少很多。  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/docker%E9%83%A8%E7%BD%B2%E4%B8%8E%E5%B8%B8%E7%94%A8%E6%93%8D%E4%BD%9C/  

