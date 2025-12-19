# Clickhouse集群


{{< admonition type=info title="" open=true >}}
当前测试环境:
- `Debian 13` 
- `ClickHouse server version 25.11.2.24 (official build)`
{{< /admonition >}}

# ClickHouse 安装 
> [官方安装文档](https://clickhouse.com/docs/zh/install)
```bash
# Install prerequisite packages
$> apt-get install -y apt-transport-https ca-certificates curl gnupg

# Download the ClickHouse GPG key and store it in the keyring
$> curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' |  gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg

# Get the system architecture
$> ARCH=$(dpkg --print-architecture)

# Add the ClickHouse repository to apt sources
$> echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg arch=${ARCH}] https://packages.clickhouse.com/deb stable main" |  tee /etc/apt/sources.list.d/clickhouse.list

# Update apt package lists
$> apt-get update

# Install ClickHouse server
$> apt-get install -y clickhouse-server clickhouse-client
```






1. 如果单节点以集群模式运行，那么在使用CREATE DATABASE xxx ON CLUSTER default_cluster 创建内容时候，后续增加节点是否会直接开启复制呢
2. 对于不同环境来说，分区挂载是不一样的，我应该如何将他的默认数据存储目录指向到大空间挂载的位置呢
3. 作为运维我应该如何备份集群数据，又该如何恢复集群数据呢

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/clickhouse%E9%9B%86%E7%BE%A4/  

