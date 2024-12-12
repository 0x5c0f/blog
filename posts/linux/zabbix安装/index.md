# Zabbix安装(这是一个草稿)


#  pwgen 18 1
GRANT ALL PRIVILEGES ON *.* TO &#39;root&#39;@&#39;%&#39;  Identified by &#34;k22gve2rSgUTArEd&#34;;
GRANT ALL PRIVILEGES ON *.* TO &#39;root&#39;@&#39;127.0.0.1&#39;  Identified by &#34;k22gve2rSgUTArEd&#34; WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO &#39;root&#39;@&#39;localhost&#39;  Identified by &#34;k22gve2rSgUTArEd&#34; WITH GRANT OPTION;

wget &#34;https://cdn.zabbix.com/zabbix/sources/stable/4.0/zabbix-4.0.26.tar.gz&#34;

tar -xzf zabbix-4.0.26.tar.gz &amp;&amp; cd zabbix-4.0.26/

yum -y install curl libcurl-devel net-snmp net-snmp-devel perl-DBI libdbi-dbd-mysql mysql-devel gcc make libxml2 libxml2-devel libevent-devel

./configure --prefix=/opt/zabbix-3.4.15 --enable-server --enable-agent --enable-java --with-mysql --enable-ipv6 --with-net-snmp --with-libcurl --with-libxml2


# ./configure --prefix=/opt/zabbix-4.0.26 --enable-agent

make &amp;&amp; make install

ln -s /opt/zabbix-4.0.26 /opt/zabbix-server


# /misc/init.d/fedora/core/zabbix_server	 
# /misc/init.d/fedora/core/zabbix_agent


CREATE SCHEMA `zabbix` DEFAULT CHARACTER SET utf8 collate utf8_bin;  ;

source /data/softsrc/zabbix-4.0.26/database/mysql/schema.sql;

source /data/softsrc/zabbix-4.0.26/database/mysql/images.sql;

source /data/softsrc/zabbix-4.0.26/database/mysql/data.sql;

GRANT ALL PRIVILEGES ON zabbix.* TO &#39;zabbix&#39;@&#39;127.0.0.1&#39;  Identified by &#34;NQHWbkuyjpZ84dWt&#34;;
GRANT ALL PRIVILEGES ON zabbix.* TO &#39;zabbix&#39;@&#39;localhost&#39;  Identified by &#34;NQHWbkuyjpZ84dWt&#34;;



### zabbix monitor mysql 
# GRANT Process,Replication client ON *.* TO &#39;zabbixm&#39;@&#39;127.0.0.1&#39;  Identified by &#34;UJRBcnSjYwv6wn6k&#34;;
### zabbix monitor mysql 


useradd -M -u 1001 -d /opt/zabbix-server -s /sbin/nologin zabbix

#####
grep &#34;^[a-zA-Z]&#34; zabbix_server.conf
DBHost=127.0.0.1
DBName=zabbix
DBUser=zabbix
DBPassword=NQHWbkuyjpZ84dWt
DBPort=3306
######

#########
wget https://s3-us-west-2.amazonaws.com/grafana-releases/release/grafana-5.3.4-1.x86_64.rpm 

yum localinstall grafana-5.3.4-1.x86_64.rpm 

## 安装结束 
个人定制监控，此项不公开，内容包含 磁盘、mysql、nginx、tcp连接的监控脚本 ，包含emal和钉钉告警脚本,包含zabbix已配置的监控模板
├── lld-disks.py
├── mysql.status.conf
├── mysql.tools.sh
├── nginx.status.conf
├── nginx.tools.sh
├── sendDDing
├── sendMail
├── tcp.status.conf
├── tcp_status.sh
├── Template_Custom_monitor.xml
└── userparameter_diskstats.conf

## 告警配置: 
邮件告警: 管理 - 报警媒介类型 - 添加 -- 名称: sendMail; 类型:脚本 ; 脚本名称(alertscripts中对应脚本名): sendMail; 报警参数: {ALERT.SENDTO},{ALERT.SUBJECT},{ALERT.MESSAGE}

钉钉告警: 和邮件告警配置基本一致 

## 动作配置(配置 - 动作 - 创建动作): 
{{&lt; highlight markdown &gt;}}
# 邮件动作配置
操作: 
标题：Problem: {EVENT.NAME}
内容：故障{TRIGGER.STATUS} 服务器:{HOSTNAME1} 发生: {TRIGGER.NAME}故障 

告警主机：{HOST.NAME}
主机IP： {HOST.IP}
告警时间:{EVENT.DATE} {EVENT.TIME}  
告警等级:{TRIGGER.SEVERITY}  
告警信息: {TRIGGER.NAME}  
告警项目:{TRIGGER.KEY1}  
问题详情:{ITEM.NAME}:{ITEM.VALUE}  
当前状态:{TRIGGER.STATUS}:{ITEM.VALUE1}  
事件ID:{EVENT.ID}

操作： 根据实际配置发送给的用户 



恢复操作: 
标题: Resolved: {EVENT.NAME}

内容：故障{TRIGGER.STATUS} 服务器:{HOSTNAME1} 发生: {TRIGGER.NAME}故障 

告警主机：{HOST.NAME}
主机IP： {HOST.IP}
告警时间:{EVENT.DATE} {EVENT.TIME}  
告警等级:{TRIGGER.SEVERITY}  
告警信息: {TRIGGER.NAME}  
告警项目:{TRIGGER.KEY1}  
问题详情:{ITEM.NAME}:{ITEM.VALUE}  
当前状态:{TRIGGER.STATUS}:{ITEM.VALUE1}  
事件ID:{EVENT.ID}

操作： 根据实际配置发送给的用户 
{{&lt; /highlight &gt;}}



## 钉钉动作配置: 与邮件配置基本一致 
{{&lt; highlight markdown &gt;}}
操作模板: 
标题: Problem: {EVENT.NAME}
内容: 
故障{TRIGGER.STATUS} 服务器:{HOSTNAME1} 发生: {TRIGGER.NAME}故障 

告警主机：{HOST.NAME}
主机IP： {HOST.IP}
告警时间:{EVENT.DATE} {EVENT.TIME}  
告警等级:{TRIGGER.SEVERITY}  
告警信息: {TRIGGER.NAME}  
告警项目:{TRIGGER.KEY1}  
问题详情:{ITEM.NAME}:{ITEM.VALUE}  
当前状态:{TRIGGER.STATUS}:{ITEM.VALUE1}  
事件ID:{EVENT.ID}

恢复操作: 
标题: Resolved: {EVENT.NAME}
内容: 
故障{TRIGGER.STATUS} 服务器:{HOSTNAME1} 发生: {TRIGGER.NAME}故障 

告警主机：{HOST.NAME}
主机IP： {HOST.IP}
告警时间:{EVENT.DATE} {EVENT.TIME}  
告警等级:{TRIGGER.SEVERITY}  
告警信息: {TRIGGER.NAME}  
告警项目:{TRIGGER.KEY1}  
问题详情:{ITEM.NAME}:{ITEM.VALUE}  
当前状态:{TRIGGER.STATUS}:{ITEM.VALUE1}  
事件ID:{EVENT.ID}
{{&lt; /highlight &gt;}}


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/zabbix%E5%AE%89%E8%A3%85/  

