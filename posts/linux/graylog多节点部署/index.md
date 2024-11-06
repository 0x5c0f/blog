# Graylog多节点部署


以下记录下graylog多节点部署的过程。附带一个几个日志搜集的配置方法。     

&amp;emsp;&amp;emsp;此次部署是也是采用dokcer加物理机器混合部署的，各个核心组件均为两个节点。

&amp;emsp;&amp;emsp;*mongodb集群说的是至少需要3个节点才算是对的，不过这块我也不是很懂，我就只处理了两个节点，另外为什么用docker混合部署，因为mongodb我特么在服务器上直接安装搞不定(所有搞不定的我都会用docker混用！)。这两个问题有了解的希望能指导一下(TODO:应该没有人回来逛我这个站吧，虽然如此，但还是要假装有人说一下的)*    

# 1. mongo 集群分片配置(docker)  
1. 创建每个成员要使用的副本集密钥文件  
```bash
$&gt; mkdir -p /data/docker/mongodb  &amp;&amp; cd /data/docker/mongodb
$&gt; mkdir .keyfile 
$&gt; cd .keyfile 
$&gt; openssl rand -base64 746 &gt;  mongodb-keyfile
$&gt; chmod 600  mongodb-keyfile
$&gt; cd ..
$&gt; chown -R 999.999 .keyfile # 999 是为docker内部的mongo用户及其组id 
```
 
2. mongodb docker-compose 配置文件(分发到每个节点上面,包含第一步生成的密钥文件) 
保存并修改以下数据   
```yaml
version: &#39;2&#39;
services:
  # MongoDB: https://hub.docker.com/_/mongo/
  mongodb:
    image: mongo:3
    volumes:
      - /data/docker/mongodb/.keyfile:/data/keyfile:ro
      - /data/docker/mongodb/db:/data/db
      - /etc/localtime:/etc/localtime:ro
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: &lt;passwd&gt;
    command: mongod --auth --keyFile /data/keyfile/mongodb-keyfile --bind_ip_all --wiredTigerCacheSizeGB 1.5 --replSet rs0
    ports:
      - &#34;27017:27017&#34;
    networks: 
      - mongodb

networks:
  mongodb:
    driver: bridge
```

3. 初始化副本集、创建用户、授权(一个节点上执行就可以了)
```bash
$&gt; docker exec -it mongodb_mongodb_1 bash
rs0:SECONDARY&gt; mongo -u root -p &lt;passwd&gt;
rs0:SECONDARY&gt; rs.initiate({_id : &#39;rs0&#39;,members: [{ _id : 0, host : &#34;192.16.10.200:27017&#34; },{ _id : 1, host : &#34;192.16.10.201:27017&#34; }]})    # 此处在后续测试中，两个节点处于非同一网段，或同一网关下出现过`no host described in new configuration 1 for replica set rs0 maps to this node docker`,但未解决，后来换到自己新建的测试机器又正常了  
rs0:SECONDARY&gt; rs.status()
rs0:SECONDARY&gt; use graylog
rs0:PRIMARY&gt; db.createUser( { user: &#34;graylog&#34;, pwd: &#34;JlQy8fKAvpPMfLAf&#34;, roles: [ { role: &#34;readWrite&#34;, db: &#34;graylog&#34; } ]});
Successfully added user: {
	&#34;user&#34; : &#34;graylog&#34;,
	&#34;roles&#34; : [
		{
			&#34;role&#34; : &#34;readWrite&#34;,
			&#34;db&#34; : &#34;graylog&#34;
		}
	]
}
rs0:PRIMARY&gt; db.grantRolesToUser( &#34;graylog&#34; , [ { role: &#34;dbAdmin&#34;, db: &#34;graylog&#34; } ]) 
rs0:PRIMARY&gt; show users 
{
	&#34;_id&#34; : &#34;graylog.graylog&#34;,
	&#34;userId&#34; : UUID(&#34;94720c5f-ddca-4dfb-8252-57e84ba86280&#34;),
	&#34;user&#34; : &#34;graylog&#34;,
	&#34;db&#34; : &#34;graylog&#34;,
	&#34;roles&#34; : [
		{
			&#34;role&#34; : &#34;dbAdmin&#34;,
			&#34;db&#34; : &#34;graylog&#34;
		},
		{
			&#34;role&#34; : &#34;readWrite&#34;,
			&#34;db&#34; : &#34;graylog&#34;
		}
	]
}
rs0:PRIMARY&gt; db.auth(&#34;graylog&#34;,&#34;JlQy8fKAvpPMfLAf&#34;) 
1 

```
以上mongodb部署完成了。

# 2. elasticserach 安装配置 
1. 导入`elasticsearch-oss yum` 源 ,安装 (多节点)
```bash
$&gt; cat /etc/yum.repo.d/elasticsearch.repo  
[elasticsearch-6.x]
name=Elasticsearch repository for 6.x packages
baseurl=https://artifacts.elastic.co/packages/oss-6.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md 

$&gt; yum install elasticsearch-oss -y   # 注意安装jdk并导入环境变量
```
2. 修改`elasticsearch` 配置文件以下参数    
```bash
$&gt; grep &#34;^[a-Z]&#34; /etc/elasticsearch/elasticsearch.yml 
cluster.name: graylog         # 集群名
node.name: es-node-01         # 节点名(节点名唯一，其他节点注意修改)
network.host: 192.16.10.200   # 当前服务器IP
discovery.zen.ping.unicast.hosts: [&#34;192.16.10.200&#34;, &#34;192.16.10.201&#34;] # 各个节点
discovery.zen.minimum_master_nodes: 2 
```

3. 启动程序  
```bash
# yum安装默认也是没有创建elasticsearch默认账号的，需要创建
$&gt; useradd -d /usr/share/elasticsearch -s /sbin/nologin elasticsearch  
$&gt; systemctl start elasticsearch.service
$&gt; systemctl enable elasticsearch.service
```

# 3. graylog-server 安装配置  
1. 安装  
```bash
$&gt; rpm -Uvh https://packages.graylog2.org/repo/packages/graylog-2.2-repository_latest.rpm
$&gt; sudo yum install graylog-server
```

2. 修改配置文件  
```bash
$&gt; vim /etc/graylog/server/server.conf  
is_master = true # 非主节点需要修改为false 
password_secret = &lt;secret&gt;      # token ， 64位以上随机值，每个节点需要一致，运行中，不可修改 
root_username = admin 
root_password_sha2 = &lt;sha256&gt;   # 登陆密码, sha256 加密 &lt;echo -n &#34;Enter Password: &#34; &amp;&amp; head -1 &lt;/dev/stdin | tr -d &#39;\n&#39; | sha256sum | cut -d&#34; &#34; -f1&gt;
root_email = &lt;example@mail.com&gt;  # 主账号邮箱
root_timezone = Asia/Shanghai   # 时区 
http_bind_address = 192.16.10.200:9900  # http 代理访问地址,建议绑定网卡ip
elasticsearch_hosts = http://192.16.10.200:9200,http://192.16.10.201:9200  # elasticsearch地址，多个逗号隔开 
allow_highlighting = true   # 搜索结果高亮，默认关闭状态，需要可打开
mongodb_uri = mongodb://graylog:JlQy8fKAvpPMfLAf@192.16.10.200:27017,192.16.10.201:27017/graylog?replicaSet=rs0  # mongodb地址，注意看格式
# transport_email_**** 邮件的相关配置，是前端用来配置告警用的，必须在这儿配置，不过我配置了打死生不了效  
```

3. 启动 
```bash
$&gt; systemctl start graylog-server.service
$&gt; systemctl enable graylog-server.service
```

# 4. 前端代理配置(nginx)
官方参考：  
&gt; [https://docs.graylog.org/en/3.0/pages/configuration/web_interface.html#configuring-webif-nginx](https://docs.graylog.org/en/3.0/pages/configuration/web_interface.html#configuring-webif-nginx)  

```conf
# upstream 
upstream graylog_server {
    ip_hash;
    server 192.16.10.200:9900 weight=2;
    server 192.16.10.201:9900 weight=1;
}

# location 模块
   location /graylog/{
      access_log  logs/graylog.access.log  main;
      proxy_set_header Host $http_host;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Server $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Graylog-Server-URL https://$server_name/graylog/;
      rewrite          ^/graylog/(.*)$  /$1  break;
      proxy_pass       http://graylog_server;
   }

```

# 5. 使用示例 
本来是想写一些使用示例的，但似乎也没有什么好写的，官方的市场上有很多    
1. nginx  
  - [https://github.com/paulbarfuss/graylog3-content-pack-nginx-json](https://github.com/paulbarfuss/graylog3-content-pack-nginx-json) 将此`json`导入到`graylog`中就可以了(`System`-`Content Packs`-`Upload`)，然后最好是自己创建根据这个模板自己创建一个(默认的会安装太多了，我个人是用不了那么多的)，当然也可以直接安装，然后给将文档配置`nginx`即可。  
2. java  
  - `java` 我是直接让开发推送到`graylog-server`中的，这个同样可以在官方的市场中收到相关的开源插件的。  


# 6. 后记  
个人非常建议尝试`graylog-server` 维护简单，没有`ELK`系列那么笨重。 支持多种传输,`json`自动格式化, 同时兼容`ELK`系列其他组件    


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/graylog%E5%A4%9A%E8%8A%82%E7%82%B9%E9%83%A8%E7%BD%B2/  

