# Elk日志分析系统


elk日志收集系统，elasticsearch(存储+搜索)+logstash(收集)+kibana(展示)综合技术,简称elk  

搭建环境:  
- virtualbox5.1.26 
- centos 6.7 
- openjdk1.8 
- elasticsearch 2.x 

elasticsearch 部署需要安装jdk,openjdk和oraclejdk都可以,由于系统当中原来已经有openjdk了,我这儿就只把jdk升级了下  

```bash
[root@11 ~]# yum install java-1.8.0-openjdk -y
[root@11 ~]# java -version
openjdk version "1.8.0_141"
OpenJDK Runtime Environment (build 1.8.0_141-b16)
OpenJDK 64-Bit Server VM (build 25.141-b16, mixed mode) 
```

# Elasticsearch  
## 安装方式：

### 下载并安装GPG key，添加elasticsearch源 
```bash
[root@11 ~]# rpm --import https://packages.elastic.co/GPG-KEY-elasticsearch
[root@11 ~]# vim /etc/yum.repos.d/elasticsearch.repo 
[elasticsearch-2.x]
name=Elasticsearch repository for 2.x packages
baseurl=http://packages.elastic.co/elasticsearch/2.x/centos
gpgcheck=1
gpgkey=http://packages.elastic.co/GPG-KEY-elasticsearch
enabled=1 
```

### 安装，并修改配置信息  
```bash
[root@11 ~]# yum install -y elasticsearch
#-------过程省略-----------
[root@11 ~]# vim /etc/elasticsearch/elasticsearch.yml 
cluster.name: my-11                 #集群标识符
node.name: 67-11                    #节点名称（集群机器需要修改此节点名称）
path.data: /data/es-data            #数据存储的目录，这个目录的权限所属的用户和组为elasticsearch(多个逗号隔开)
path.logs: /var/log/elasticsearch   #日志文件位置
bootstrap.memory_lock: true         #保证数据不会写入交换分区，生产环境建议打开，保证性能(可能会导致启动失败，失败时关闭)
network.host: 172.16.67.11          #此参数配置的就是自己的ip，多个ip建议配置，默认0.0.0.0（集群机器需要修改此节点名称）
http.port: 9200                     #默认端口
#discovery.zen.ping.unicast.hosts: ["172.16.67.11", "172.16.67.12"] #集群配置项，elasticsearch分为组播和单播两种模式。组播所有集群机器的都在同一个组里面，单播
#表示让我们个告诉其他人，除了这台机器还有那些机器，一般默认就可以了（这个地方用virtualbox的nat网络模式作测试的时候，默认的组播模式是无法使用的，需要配置为单播
#模式），这儿可能对于这个组播和单播描述的不是很对，要想详细了解的，自己去查询相关资料吧。还有这个只需要有一台机器配置就可以了。

```
### 启动elasticsearch
```bash
[root@11 ~]#  service elasticsearch start #yum安装的，如果这儿启动如果出现了什么问题，一般就是因为防火墙或者对应目录的权限，
[root@11 ~]# netstat -lntp|grep java    #elasticsearch 主要使用的就是这两个端口 
tcp        0      0 ::ffff:172.16.67.11:9200    :::*                        LISTEN      30464/java          
tcp        0      0 ::ffff:172.16.67.11:9300    :::*                        LISTEN      30464/java 
```

### 使用方式:
elasticsearch 使用都是依赖插件，比较好用的有head、kopf  
```bash
[root@11 ~]# /usr/share/elasticsearch/bin/plugin install mobz/elasticsearch-head #主要是elasticsearch集群管理的插件 
[root@11 ~]# /usr/share/elasticsearch/bin/plugin install lmenezes/elasticsearch-kopf #相对于head功能更全的一个管理插件
```

插件安装后，存入目录是在elasticsearch的插件目录  
```bash
[root@11 ~]# ls -l /usr/share/elasticsearch/plugins/
总用量 8
drwxr-xr-x. 6 root root 4096 8月  17 03:09 head
drwxr-xr-x. 8 root root 4096 8月  17 03:12 kopf
```
浏览器访问：http://172.16.67.11:9200/_pulgin/head,http://172.16.67.11:9200/_pulgin/kopf

信息:  
添加方式：点击‘复合查询’-'查询'，  
第一栏，实际就是你的ip+端口，这个是默认填写好了的。  
第二栏，选择post,内容/index-demo/test  
第三栏，实际就是一个json串，随便录入后提交就可以了，然后提交就可以了。  
添加过后在重新刷新上述页面,就可以看到数据了,上图中的圈中,第一个代表的集群健康值,绿色代表健康,黄色代表警告-没有主分片丢失,红色代表存在数据丢失,  
第二个 绿色代表分片,粗线代表主分片,西线代表副本分片.  

## 集群 :
集群的话,配置就只需要改动下配置文件的节点名称,如果你是使用虚拟机模拟nat网络模式的主机,可能需要将主机模式更改为单波模式,这个前面有说明.  

# LogStash 
## 安装方式:
### 下载并安装GPG key、添加yum仓库
```bash
[root@11 ~]# rpm --import https://packages.elastic.co/GPG-KEY-elasticsearch
[root@11 ~]#  vim /etc/yum.repos.d/logstash.repo
[logstash-2.3]
name=Logstash repository for 2.3.x packages
baseurl=https://packages.elastic.co/logstash/2.3/centos
gpgcheck=1
gpgkey=https://packages.elastic.co/GPG-KEY-elasticsearch
enabled=1
```
### 安装及测试
```bash
[root@11 ~]# yum install -y logstash
#----------过程省略-----------
#----------测试模块start-----------
[root@11 ~]# /opt/logstash/bin/logstash -e "input { stdin{} } output { stdout{codec => rubydebug} }" # => 这儿表示的是等号；stdout {} 格式化输出到前台
Settings: Default pipeline workers: 4
Pipeline main started
hello logstash #输入内容
{
       "message" => "hello logstash",
      "@version" => "1",
    "@timestamp" => "2017-08-17T17:06:19.892Z",
          "host" => "11"
}
[root@11 ~]# /opt/logstash/bin/logstash -e 'input { stdin{} } output { elasticsearch { hosts => ["172.16.67.11:9200"] index => "logstash-%{+YYYY.MM.dd}" } }'
Settings: Default pipeline workers: 4
Pipeline main started
haha        # 读取并写入elasticsearch中,按照日期兴建索引,注意此处是不会打印的
123         # 若要既打印也输出,需要增加其他插件代码.如:output { stdout {} elasticsearch 
asdf        # { hosts => ["172.16.67.11:9200"] index => "logstash-%{+YYYY.MM.dd}" } }
eeeeeeeee   # 
# 访问 http://172.16.67.11:9200/_plugin/head 地址下的'数据浏览'查看是否添加成功 
#----------测试模块end----------- 
```
### 配置方式
注意/etc/logstash/conf.d 如果未指定配置文件，logstash默认会加载所有的配置文件
参考插件参数:https://www.elastic.co/guide/en/logstash/current/output-plugins.html

#### elasticsearch 前台读取
```bash
[root@11 ~]# vim /etc/logstash/conf.d/demo.conf #/etc/logstash/conf.d 这个目录是可以被更改的,修改logstash的程序文件(/etc/init.d/logstash)对应的配置就可以了
#input 和output 都可以是多个 
input {
    stdin {}
}
 
filter {
}
 
output {
    elasticsearch {
        hosts => ["172.16.67.11:9200"]
        index => "logstash-%{+YYYY.MM.dd}"
    }
    stdout {
        codec => rubydebug
    }
}
[root@11 ~]# /opt/logstash/bin/logstash -f /etc/logstash/conf.d/demo.conf  # 测试配置文件 
Settings: Default pipeline workers: 4
Pipeline main started
ceshi
{
       "message" => "ceshi",
      "@version" => "1",
    "@timestamp" => "2017-08-17T18:08:22.003Z",
          "host" => "11"
}
66666666
{
       "message" => "66666666",
      "@version" => "1",
    "@timestamp" => "2017-08-17T18:08:37.970Z",
          "host" => "11"
}
# 同样的访问 http://172.16.67.11:9200/_plugin/head 地址下的'数据浏览'查看是否添加成功  
```

#### elasticsearch 从文件读取
```bash
[root@11 ~]# vim /etc/logstash/conf.d/file.conf 
input {
    file {
        path => ["/var/log/messages","/var/log/secure"]
        type => "system-log"
        start_position => "beginning"
    }
}
 
filter {
}
 
output {
     elasticsearch {
        hosts => ["172.16.67.11:9200"]
        index => "system-log-%{+YYYY.MM}"   
    }
    stdout { 
        codec => rubydebug
    }
}
[root@11 ~]# /opt/logstash/bin/logstash -f /etc/logstash/conf.d/file.conf 
Settings: Default pipeline workers: 4
Pipeline main started 
{
       "message" => "Aug 16 23:27:41 11 kernel: pid_max: default: 32768 minimum: 301",
      "@version" => "1",
    "@timestamp" => "2017-08-17T19:19:34.437Z",
          "path" => "/var/log/messages",
          "host" => "11",
          "type" => "system-log"
}
#------省略很多很多数据------
#------ logstash if语法------
[root@11 ~]# vim /etc/logstash/conf.d/file.conf 
input {
    file {
        path => ["/var/log/messages","/var/log/secure"]
        type => "system-log"
        start_position => "beginning"
    }
    file {
        path => "/var/log/elasticsearch/myes.log"
        type => "es-log"
        start_position => "beginning"
    }
}
 
filter {
}
 
output {
    if [type] == "system-log" {
        elasticsearch {
            hosts => ["172.16.67.11:9200"]
            index => "system-log-%{+YYYY.MM}"
        }
    }
 
    if [type] == "es-log" {
        elasticsearch {
            hosts => ["172.16.67.11:9200"]
            index => "es-log-%{+YYYY.MM}"
        }
    }
}
[root@11 ~]# /opt/logstash/bin/logstash -f /etc/logstash/conf.d/file.conf 
Settings: Default pipeline workers: 4
Pipeline main started
#------省略很多很多数据------
#------multiline 逐行合并语法,当遇见正则表达式匹配规则的字符,就把前面所有的行全部合并起来---
#------------演示测试 start ------------------
[root@11 ~]# vim /etc/logstash/conf.d/codec.conf 
input {
    stdin {
        codec => multiline {
            pattern => "^\["            #正则表达式
            negate => true              #合并上级菜单
            what => "previous"          #
        }
    }
}
 
filter {
}
 
output {
    stdout {
        codec => rubydebug
    }
}
[root@11 conf.d]# /opt/logstash/bin/logstash -f /etc/logstash/conf.d/codec.conf 
Settings: Default pipeline workers: 4
Pipeline main started
[kjkjljlkjl
kl;k;k;hj
jlkjljl
kkkhhh
[                   # 当匹配到以[开头时候,合并前面的全部内容
{
    "@timestamp" => "2017-08-18T06:50:14.066Z",
       "message" => "[kjkjljlkjl\nkl;k;k;hj\njlkjljl\nkkkhhh",
      "@version" => "1",
          "tags" => [
        [0] "multiline"
    ],
          "host" => "11"
}
#------------演示测试 end ------------------
#------------加入具体搜集-----------
[root@11 ~]# vim /etc/logstash/conf.d/file.conf 
input {
    file {
        path => ["/var/log/messages","/var/log/secure"]
        type => "system-log"
        start_position => "beginning"
    }
    file {
        path => "/var/log/elasticsearch/myes.log"               #这个日志文件小了 好像是不会被收集的？
        type => "es-log"
        start_position => "beginning"
        codec => multiline {
            pattern => "^\["
            negate => true
            what => "previous"
        }
 
     }
}
 
filter {
}
 
output {
    if [type] == "system-log" {
        elasticsearch {
            hosts => ["172.16.67.11:9200"]
            index => "system-log-%{+YYYY.MM}"
        }
    }
 
    if [type] == "es-log" {
        elasticsearch {
            hosts => ["172.16.67.11:9200"]
            index => "es-log-%{+YYYY.MM}"
        }
    }
}
[root@11 conf.d]# /opt/logstash/bin/logstash -f /etc/logstash/conf.d/file.conf 
Settings: Default pipeline workers: 4
Pipeline main started
#-----此处省略万个数据----------- 
```

# Kibana
kibana 是专门为elasticsearch写的一个图形搜索界面  
## 安装方式:
### 下载并安装GPG key、添加yum仓库
```bash
[root@11 ~]# rpm --import https://packages.elastic.co/GPG-KEY-elasticsearch
[root@11 ~]# vim /etc/yum.repos.d/kibana.repo
[kibana-4.5]
name=Kibana repository for 4.5.x packages
baseurl=http://packages.elastic.co/kibana/4.5/centos
gpgcheck=1
gpgkey=http://packages.elastic.co/GPG-KEY-elasticsearch
enabled=1 
```
#### 安装及配置
```bash
[root@11 ~]# yum install -y kibana
 #----------过程省略-----------
 [root@12 ~]# vim /opt/kibana/config/kibana.yml 
 server.port: 5601                                  #默认端口
 server.host: "0.0.0.0"                             #主机地址
 elasticsearch.url: "http://172.16.67.11:9200"      #elasticsearch 地址
 kibana.index: ".kibana"                            #kibana 的索引 
 ```

#### 启动kibana
```bash
[root@12 ~]# /etc/init.d/kibana start
kibana started
[root@12 ~]# netstat -lntp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address               Foreign Address             State       PID/Program name   
tcp        0      0 0.0.0.0:5601                0.0.0.0:*                   LISTEN      321/node   
```

#### 可视化安装

打开访问：http://172.16.67.12:5601   

kibana 不会自动加载elasticsearch的索引，需要自己配置。这儿根据自己已经创建了的索引配置，如上面创建的logstash-%{+YYYY.MM.dd},下面勾选“Use event times to create index names [DEPRECATED]”

然后下面会自动匹配elasticsearch中存在的logstash-YYYY.MM.DD的索引，点击创建就可以了，如果需要显示其他的索引，左侧点击"add new "新增就可以了。


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/elk%E6%97%A5%E5%BF%97%E5%88%86%E6%9E%90%E7%B3%BB%E7%BB%9F/  

