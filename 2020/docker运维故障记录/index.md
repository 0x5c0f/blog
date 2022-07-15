# Docker运维故障记录


## docker centos7 镜像 systemctl 报错  Failed to get D-Bus connection: Operation not permitted  
> https://blog.csdn.net/xiaochonghao/article/details/64438246  
```bash
docker run --privileged  -itd  -v /sys/fs/cgroup:/sys/fs/cgroup  centos  /usr/sbin/init
```

## docker DOCKER-USER 规则链丢失 
> https://blog.csdn.net/Liv2005/article/details/112850208  

> https://docs.docker.com/network/iptables/

`DOCKER-USER` 是用于控制外部网络与 `docker`容器网络通信使用的，一般来说重置防火墙会删除所有的自定义规则链，所以重置后，`iptables`就不会在包含`docker`创建的那些规则链了。此时，只要主动重启`docker`服务就可以了。但是这样可能就会产生另一个问题，那就是`DOCKER-USER`规则链丢失，这个时候只需要主动创建一个网桥，然后删除就可以了(此问题处理可能会导致容器内网络无法正常访问外部网络，见下一个问题)。然后测试下容器内访问外部网络是否正常, 比如容器内需要连接远程数据库。
```bash
$> docker network create net-host
$> docker network rm net-host
```

## docker 容器内无法访问远程服务器网络
当前记录问题产生原因可能是由于上述的`DOCKER-USER`规则链丢失处理后而产生的新的问题，部署为`docker-compose`，解决先是`down`容器，然后重启`docker`，再重新`up`容器。后测试容器内网络访问正常。
