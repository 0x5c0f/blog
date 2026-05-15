# MongoDB单机环境搭建


{{< admonition type=note title="前言" open=true >}}
本文内容基于 `Alibaba CloudLinux 3` 操作系统部署、测试 
- [`MongoDB Community Server 6.0.19`](https://www.mongodb.com/try/download/community) 
{{< /admonition >}}

{{< admonition type=warning title="" open=true >}}
**注: 此项测试未通过，但整体步骤应该不会有什么问题**
{{< /admonition >}}

# `MongoDB`单机环境搭建
## `MongoDB` 安装 
- 打开 [`https://www.mongodb.com/try/download/community`](https://www.mongodb.com/try/download/community), 下载需要的版本，本文使用`RPM`方式安装  
    ```bash
    $> dnf install mongodb-org-server-6.0.19-1.el8.x86_64.rpm
    ```

## 配置 
- 编辑 `/etc/mongod.conf`
```bash
# https://www.mongodb.com/zh-cn/docs/manual/reference/configuration-options/
$> vim /etc/mongod.conf             # 一般默认即可，以下为初始配置，建议修改下存储路径，绑定IP等
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# Where and how to store data.
storage:
  dbPath: /var/lib/mongo
  journal:
    enabled: true
#  engine:
#  wiredTiger:

# how the process runs
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Enter 0.0.0.0,:: to bind to all IPv4 and IPv6 addresses or, alternatively, use the net.bindIpAll setting.


#security:

#operationProfiling:

#replication:

#sharding:

## Enterprise-Only Options

#auditLog:

#snmp:

```

## 启动 
```bash
$> systemctl start mongod.service
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/mongodb%E5%8D%95%E6%9C%BA%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/  

