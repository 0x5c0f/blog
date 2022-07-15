# Docker进阶


# volume(卷挂载) 与 bind mount (目录挂载)
```bash
# 创建卷 
[root@00 ~]# docker volume create docker_data 
docker_data
# 查看已有卷 
[root@00 ~]# docker volume ls
DRIVER              VOLUME NAME
local               docker_data

# 产看卷详细信息
[root@00 ~]# docker volume inspect docker_data
[
    {
        "CreatedAt": "2019-03-04T14:20:40+08:00",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/docker_data/_data",
        "Name": "docker_data",
        "Options": {},
        "Scope": "local"
    }
]
# 挂载卷 
# 当src值以非/开头时，如果不存在该名字的volume，则自动创建使用，存在则直接使用，若值以/开头，则使用对应当前操作系统对应目录进行挂载,不存在目录会抛出一个错误(但若使用-v参数，则会自动创建对应目录)  
# 另 volume，若volume为新建，当容器内挂载目录存在数据时，则会将数据挂载到volume中，而bind mount(目录挂载)则会清空容器内挂载目录。   
# 若volume为非新建，volume中已经存在数据时，则会将容器内挂载目录数据隐藏并将volume的数据挂载进入容器内目录。   
[root@00 ~]# docker run -td --name centos01 --mount src=docker_data,dst=/data centos # docker run -td --name centos01 --v docker_data:/data centos
#  docker run -td --name centos01 --mount type=bind,src=/data,dst=/data centos # docker run -td --name centos01 --v /data:/data centos
3efe72134d7c796db548f343e5a8b11436271b9bbea2a9b07c2f868257a47247
[root@00 ~]# docker exec -it centos01 ls -d /data
/data
[root@00 ~]# docker exec -it centos01 touch /data/test{1..4}
[root@00 ~]# docker exec -it centos01 ls  /data
test1  test2  test3  test4
[root@00 ~]# ls -l /var/lib/docker/volumes/docker_data/_data/
总用量 0
-rw-r--r--. 1 root root 0 3月   4 14:32 test1
-rw-r--r--. 1 root root 0 3月   4 14:32 test2
-rw-r--r--. 1 root root 0 3月   4 14:32 test3
-rw-r--r--. 1 root root 0 3月   4 14:32 test4 
# 删除卷(只有删除卷的时候，卷中的数据才会被删除，删除容器不会删除卷数据)
[root@00 ~]# docker volume rm docker_data
```
# 网络模式
- bridge   
`-net=bridge` 默认网络，docker启动后创建一个docker0的网桥，默认创建容器也是添加到此网桥中  
- host  
`-net=host` 容器不会获得一个独立的网络空间，而是与宿主机共用一个,这就意味着容器不会有自己的网卡信息，而是使用宿主及的，容器除了网络，其他都是隔离的。  
- none  
`-net=none`  获取独立的网络空间，但不为容器进行任何网络配置，需要手动配置 
- container 
`-net=container:name/id` 与指定容器使用同一个网络空间，具有同样的网络配置信息，两个容器除了网络，其他都是隔离的。  
- 自定义网络   
 与默认的`bridge`原理一样
