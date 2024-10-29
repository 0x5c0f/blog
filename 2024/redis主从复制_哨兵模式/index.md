# Redis主从复制+哨兵


# 1. 测试版本: redis 6.2.14 
```bash
$> make PREFIX=/opt/redis-server/6.2.14 install
$> mkdir -p /opt/redis-server/6.2.14/{data,logs,etc}
$> mkdir -p /opt/redis-server/6.2.14/sentinel_data/26379
```

## 1.1 配置文件额外修改以下参数(多少个节点，多少个独立配置文件)
```ini
# 配置  redis.conf 
masterauth <password>                       # 与redis.conf中密码一致(此项在每个节点都要配置)
slaveof <masterip> <masterport>         # 指定主节点ip和端口(此项只在从节点上进行配置)

# 配置 sentinel.conf 
port:     <port>                                  # 21
pidfile:  /pathto/sentinel_<port>.pid        # 31 
logfile:  /pathto/logs/sentinel_<port>.log   # 36
dir:      /path/sentinel_data/<port>         # 64 


##  <master-name> 主节点名称, 可以自定义
##  <master-ip> <master-port> 主节点ip和端口
##  <quorum> 指定需要有2个以上sentinel节点认为redis主节点失效, 才是真的失效, 一般为: sentinel总数/2+1
sentinel monitor <master-name> <master-ip> <master-port> <quorum>    # 84 , 此项每个节点都要配置 


sentinel auth-pass mymaster <password>               # 105 插入 此项, 与redis.conf中密码一致(此项在每个节点都要配置)
sentinel down-after-milliseconds mymaster 30000      # 125 此项是指定 主机节点多少毫秒无响应，则认为挂了, 默认30s

## 主备切换时, 最多有多少个slave同时对新的master进行同步, 这里设置为默认的1
sentinel parallel-syncs mymaster 1                   # 200 

## 故障转移的超时时间毫秒, 默认: 180000毫秒
sentinel failover-timeout mymaster 180000            # 225 

```

## 1.2 创建 systemd 管理单元 
```ini
[Unit]
Description=Redis Sentinel(%i)
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/opt/redis-server/6.2.14/bin/redis-server /opt/redis-server/6.2.14/etc/sentinel_%i.conf --sentinel
ExecStop=/usr/bin/redis-cli -p %i sentinel shutdown
Type=simple
User=redis
Group=redis
RuntimeDirectory=redis
RuntimeDirectoryMode=0755
LimitNOFILE=10240

[Install]
WantedBy=multi-user.target
```

## 1.3 其他
- 配置完成后提供给用户的是 sentinel 的端口, 而不是 redis 的端口
- sentinel 在启动后，会将哨兵集群的元数据信息写入所有sentinel的配置文件里去
- 主从切换后，sentinel 会自动更新配置文件，将新主机的信息写入到sentinel的配置文件中, 并且主动更新 redis 配置文件 
