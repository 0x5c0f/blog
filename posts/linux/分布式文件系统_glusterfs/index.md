# 分布式文件系统_GlusterFS


# 1. 前言  
 分布式文件存储
实验环境：  
&emsp; 1. `centos7.x` 2台 (node11，node12)  
&emsp; 2. `glusterfs 4.1.6`  


# 2. 安装  

## 2.1. 基础环境配置  
1. 关闭**防火墙**  
2. 关闭**selinux**  
3. 统一**主机名称**(保证唯一主机名)  
4. 添加**hosts解析**  


## 2.2. 安装  
每个节点机器均需要安装并启动：  
```bash
[root@node11 ~]# yum install epel-release                 # epel 源
[root@node11 ~]# yum install centos-release-gluster40     # 安装gluster 源  
[root@node11 ~]# yum install glusterfs-server glusterfs-geo-replication     #安装gluster   
[root@node11 ~]# glusterfs -V               # 查看版本信息  
glusterfs 4.1.6
Repository revision: git://git.gluster.org/glusterfs.git
Copyright (c) 2006-2016 Red Hat, Inc. <https://www.gluster.org/>
GlusterFS comes with ABSOLUTELY NO WARRANTY.
It is licensed to you under your choice of the GNU Lesser
General Public License, version 3 or any later version (LGPLv3
or later), or the GNU General Public License, version 2 (GPLv2),
in all cases as published by the Free Software Foundation.
[root@node11 ~]# systemctl start glusterd   # 启动  
[root@node11 ~]# systemctl enable glusterd  # 加入开机启动项  
```

# 3. 配置  

## 3.1. 将存储主机加入存储信任池  

```bash
# 将存储主机加入存储信任池，任意一个节点添加非当前节点的节点即可
# 如：node11,node12,node13(主机别名) ,在node11 添加 node12,node13。或在node12 添加 node11,node13 ...
[root@node11 ~]# gluster peer probe node12
peer probe: success. 
```

## 3.2. 查看状态  
```bash
[root@node11 ~]# gluster peer status    
Number of Peers: 1

Hostname: node12
Uuid: 1bf6ec90-7130-48db-86e8-acb38abc6b40
State: Peer in Cluster (Connected)
############
[root@node12 ~]# gluster peer status
Number of Peers: 1

Hostname: node11
Uuid: 4f2833b8-a117-4540-8e29-691a6849737e
State: Peer in Cluster (Connected)
```

## 3.3. 创建volume 卷  
1. 创建volume 及其他操作  
2. 分布卷(Distributed)： 文件通过hash算法随机的分布到有bricks组成的卷上,是文件分散存储  
3. 复制卷(Replicated) :  类似raid1, replica 数必须登录volume中birck所包含的存储服务器数，可高可用  
4. 条带卷(Striped)    :  类似raid0，stripe数必须等于volume中brick所包含的存储服务器数，文件被分成数据块，以round robin的方式存储在bricks中，并发粒度是数据块，大文件性能好。  
5. 分布式卷、分布式复制卷(主要使用)、分布式条带卷(不建议使用)即组合  

### 3.3.1. 分布式挂载卷  
类似raid0,但是是文件分散存储，而不是文件被拆分为块分散存储

#### 3.3.1.1. 创建    
```bash
# 创建挂载目录(这个目录就是数据盘的挂载目录,我但服务器总共挂载了6块盘，用来测试)
[root@node11 ~]# mkdir -p /data/node1{1..3} /data/node{1..3}1 

## store: 相当于逻辑卷的那个别名
## node11、node12 就是主机名称,也可以是ip
## /data/node1 是挂载的目录，应该是相当于nfs远程挂载的本地路径(此处指的是存储磁盘，建议每个节点服务器的存储名称一致，方便区分)
[root@node11 ~]# gluster volume create store1 node11:/data/node1 node12:/data/node1 force  # 创建分布卷  
volume create: store1: success: please start the volume to access data
```

#### 3.3.1.2. 启动  
```bash
[root@node11 ~]# gluster volume start store1  # 启动卷  
volume start: store1: success
```

#### 3.3.1.3. 查看  
```bash
[root@node11 ~]# gluster volume info store1  # 查看卷(node1)
 
Volume Name: store1
Type: Distribute
Volume ID: 686e4c24-bded-4552-8c08-259b9e1c74b6
Status: Started
Snapshot Count: 0
Number of Bricks: 2
Transport-type: tcp
Bricks:
Brick1: node11:/data/node1
Brick2: node12:/data/node1
Options Reconfigured:
transport.address-family: inet
nfs.disable: on


####################################################
[root@node12 ~]# gluster volume info store1 # 查看卷(node2)
 
Volume Name: store1
Type: Distribute
Volume ID: 686e4c24-bded-4552-8c08-259b9e1c74b6
Status: Started
Snapshot Count: 0
Number of Bricks: 2
Transport-type: tcp
Bricks:
Brick1: node11:/data/node1
Brick2: node12:/data/node1
Options Reconfigured:
transport.address-family: inet
nfs.disable: on
####################################################
```

#### 3.3.1.4. 挂载  
`/etc/fstab`: `localhost:/store1 /mnt glusterfs defaults,_netdev 0 0`
```bash
# 以glusterfs的形式挂载(node1可以是任意一个节点的名称或ip，另外还有一种是nfs形式挂载，但该方法挂载未测试成功过，
# 此处就不说明了，如果有遇到过同样问题并解决了，欢迎指出)
[root@node1 ~]# mount -t glusterfs node1:/store1 /mnt    
[root@node1 ~]# df -h           
# 我是一个200g的盘，一个20G的盘，合并卷后可以看到总共220G，因为我是两个盘下面的一个目录来做的实验，所有存在较大的使用空间(实际空盘创建后只会有卷的缓存目录存在,大概几十M左右)
Filesystem               Size  Used Avail Use% Mounted on
## 省略 ##
node1:/store          218G   11G  207G   6% /mnt
# 在挂载目录下创建多个(如：100个)测试文件，那么/mnt(即挂载目录)文件总个数100，实际node1的/data/node1目录90个，node2的/data/node1目录10个，
# 他是通过hash算法分配文件存放位置的，以上仅是我个人的测试数据结果
```

### 3.3.2. 分布式复制卷  
近似raid1：

#### 3.3.2.1. 创建
```bash
[root@node1 ~]# mkdir /data/node2   # 和分布卷描述一样，假装他是一个独立的盘，用来测试的

# replica 2: 代表复制卷的个数，这个值需要和后面node节点配置的节点个数一致
[root@node1 ~]# gluster volume create store2 replica 2 node1:/data/node2 node2:/data/node2 force
volume create: store2: success: please start the volume to access data
``` 

#### 3.3.2.2. 启动
```bash
[root@node1 ~]# gluster volume start store2    # 启动卷
volume start: store2: success
```

#### 3.3.2.3. 查看  
```bash
[root@node1 ~]# gluster volume info store2  # 查看卷
 
Volume Name: store2
Type: Replicate
Volume ID: 771df90e-4745-46c0-b763-1e155b163db0
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 2 = 2
Transport-type: tcp
Bricks:
Brick1: node1:/data/node2
Brick2: node2:/data/node2
Options Reconfigured:
transport.address-family: inet
nfs.disable: on
performance.client-io-threads: off


####################################################
[root@node2 ~]# gluster volume info store2  # 查看卷
 
Volume Name: store2
Type: Replicate
Volume ID: 771df90e-4745-46c0-b763-1e155b163db0
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 2 = 2
Transport-type: tcp
Bricks:
Brick1: zabbix02:/data/node2
Brick2: monitor:/data/node2
Options Reconfigured:
transport.address-family: inet
nfs.disable: on
performance.client-io-threads: off
####################################################
```

#### 3.3.2.4. 挂载
```bash
#  描述同分布式挂载一样 
[root@node1 ~]# mount -t glusterfs node1:/store2 /mnt    
[root@node1 ~]# df -h           
# 同上 我一个是 200G的盘，一个为20G的盘，但分布式复制卷和raid1一样，都是以最小盘空间为最大空间，所以合并后是最小的盘的空间 
# 因为我是两个盘下面的一个目录来做的实验，所有存在较大使用空间(实际空盘创建后只会存在几十M的卷的缓存占用)
Filesystem       Size  Used Avail Use% Mounted on
## 省略 ##
node1:/store2   18G  8.9G  8.7G  51% /mnt
# 由于是复制卷，因此同上分部卷的测试，结果为 挂载mnt目录中文件个数100,实际node1的/data/node3目录文件个数100,实际node2的/data/node3目录文件个数100
```

### 3.3.3. 分布式条带卷 

#### 3.3.3.1. 创建  
近似read0 :
```bash
[root@node1 ~]# mkdir /data/node3   # 和分布卷描述一样，假装他是一个独立的盘，用来测试的
[root@node1 ~]# gluster volume create store3 stripe 2 node1:/data/node3 node2:/data/node3 force
volume create: store3: success: please start the volume to access data
```

#### 3.3.3.2. 启动  
```bash
[root@node1 ~]# gluster volume start store3         # 启动卷
volume start: store3: success
```

#### 3.3.3.3. 查看
```bash
[root@node1 ~]# gluster volume info store3          # 查看卷
 
Volume Name: store3
Type: Stripe
Volume ID: a0f49a74-2e89-4d06-bbdb-195032908a7e
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 2 = 2
Transport-type: tcp
Bricks:
Brick1: node1:/data/node4
Brick2: node2:/data/node4
Options Reconfigured:
transport.address-family: inet
nfs.disable: on

####################################################
[root@node2 ~]#  gluster volume info store3         # 查看卷
 
Volume Name: store3
Type: Stripe
Volume ID: a0f49a74-2e89-4d06-bbdb-195032908a7e
Status: Started
Snapshot Count: 0
Number of Bricks: 1 x 2 = 2
Transport-type: tcp
Bricks:
Brick1: node1:/data/node4
Brick2: node2:/data/node4
Options Reconfigured:
transport.address-family: inet
nfs.disable: on
####################################################
```

#### 3.3.3.4. 挂载
```bash
[root@node1 ~]# mount -t glusterfs node1:/store3 /mnt   
[root@node1 ~]#  df -h
# 同上 我一个是 200G的盘，一个为20G的盘，由于类似raid0，合并后不存在空间变化，所以总共220G
# 因为我是两个盘下面的一个目录来做的实验，所有存在较大的使用空间(实际空盘创建后占用只有几十M的缓存)
Filesystem         Size  Used Avail Use% Mounted on
## 省略 ##
127.0.0.1:/store3  218G   11G  207G   6% /mnt

# 数据测试：用dd写入(dd if=/dev/zero bs=1M count=5 of=/mnt/5M.file)一个5M大小的文件到挂载目录，结果挂载目录文件占用大小5M，
# 实际node1 目录文件大小2.5M占用, 实际node2 目录文件大小2.5M占用
```

# 4. 优化


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E5%88%86%E5%B8%83%E5%BC%8F%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F_glusterfs/  

