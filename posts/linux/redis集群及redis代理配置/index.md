# Redis集群及redis代理配置


<!--more-->

# 1. 测试版本: redis 5.0.9 

```bash
make PREFIX=/opt/redis-5.0.10 install 
mkdir -p /opt/redis-5.0.10/{data,logs,etc}
```

## 1.1. 配置文件额外修改以下参数(多少个节点，多少个独立配置文件)
```bash
masterauth 123456   # 与requirepass密码一致 
cluster-enabled yes
cluster-config-file /data/cacheDB/redis-server/etc/nodes-6370.conf
cluster-node-timeout 15000
```

## 1.2. 启动 
```bash
/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6370.conf
/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6371.conf
/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6372.conf

/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6375.conf
/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6376.conf
/data/cacheDB/redis-server/bin/redis-server /data/cacheDB/redis-server/etc/redis_6377.conf
```

## 1.3. 激活集群连接 
```bash
/data/cacheDB/redis-server/bin/redis-cli \
--cluster create \
192.16.10.200:6371 \
192.16.10.200:6372 \
192.16.10.200:6373 \
192.16.10.201:6375 \
192.16.10.201:6376 \
192.16.10.201:6377 \
--cluster-replicas 1 \
-a 123456 
# -cluster-replicas 1 从节点个数，以上为3主3从 
```


## 1.4. redis 代理(一个服务器上部署，看需要部署多节点)
> https://juejin.im/post/6863701563685371917
 
```bash
yum install libstdc++-static gcc gcc-c++ -y

git clone https://github.com/joyieldInc/predixy.git

make MT=true
cp -v ./conf/auth.conf /opt/redis-server/conf/auth.conf  
cp -v ./conf/cluster.conf /opt/redis-server/conf/cluster.conf  
cp -v ./conf/latency.conf /opt/redis-server/conf/latency.conf  
cp -v ./conf/predixy.conf /opt/redis-server/conf/predixy.conf
cp -v ./src/predixy /opt/redis-server/bin/

##  /opt/redis-server/conf/predixy.conf
# 修改指示节点名
Name Predixy_192.16.10.200

# 可以修改端口
Bind 192.16.10.200:6370
# 修改内容 
Include try.conf
# 为 
Include cluster.conf

## /opt/redis-server/conf/auth.conf
# 移除所有可写权限
# 设置管理权限密码为redis一致
# 

## /opt/redis-server/conf/cluster.conf 
# 修改或添加内容为 
ClusterServerPool {
   Password i4ZHIJNDYvndeZOh
   MasterReadPriority 60
   StaticSlaveReadPriority 50
   DynamicSlaveReadPriority 50
   RefreshInterval 1
   ServerTimeout 1
   ServerFailureLimit 10
   ServerRetryTimeout 1
   KeepAlive 120
   Servers {
       + 192.16.10.200:6371
       + 192.16.10.200:6372
       + 192.16.10.200:6373
       + 192.16.10.201:6375
       + 192.16.10.201:6376
       + 192.16.10.201:6377
   }
}

# 启动 
/opt/redis-server/bin/predixy /opt/redis-server/conf/predixy.conf 
# 连接 
/opt/redis-server/bin/redis-cli -h 172.16.80.31 -p 6370


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/redis%E9%9B%86%E7%BE%A4%E5%8F%8Aredis%E4%BB%A3%E7%90%86%E9%85%8D%E7%BD%AE/  

