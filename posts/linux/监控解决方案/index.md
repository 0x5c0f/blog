# 监控解决方案


# 1. tomcat 监控方案 (jmx)
`zabbix javaGetway`  
1. zabbix_server 编译安装需增加`-enable-java`，yum安装的需要安装`java java-devel zabbix-java-gateway`
2. `Tomcat`开启远程监控功能, `/pathto/tomcat/bin/catalina.sh` 大概97行添加`CATALINA_OPTS=&#34;$CATALINA_OPTS -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=12345 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=&lt;tomcat主机ip&gt;&#34; `配置，并解析`&lt;tomcat主机ip&gt; tomcat`  
2. 启动`/pathto/zabbix/sbin/zabbix_java/startup.sh`   端口: `10052`
3. 修改`zabbix_server.conf`配置文件，启用`javaPollers`,指定`javaGateway`地址,  
    - 217 行: `JavaGateway=127.0.0.1`  # ip  
    - 225 行: `JavaGatewayPort=10052`  # 本地的端口  
    - 235 行: `StartJavaPollers=5`  # 启动的进程书  
4. zabbix 创建主机，添加`jmx`接口监控，添加模版`JMX`的`Template JMX Generic`/`Template JMX Tomcat` 


# 2. mysql 监控方案 (percona &#43; zabbix)

&gt; [https://www.percona.com/doc/percona-monitoring-plugins/LATEST/zabbix/index.html#installation-instructions](https://www.percona.com/doc/percona-monitoring-plugins/LATEST/zabbix/index.html#installation-instructions)  

```bash
安装依赖包
yum install -y php php-mysql
# 注意  安装php 会默认安装httpd,建议手动编译 
wget &#39;https://www.percona.com/downloads/percona-monitoring-plugins/percona-monitoring-plugins-1.1.8/binary/redhat/7/x86_64/percona-zabbix-templates-1.1.8-1.noarch.rpm&#39;

rpm -ivh percona-zabbix-templates-1.1.8-1.noarch.rpm
cp /var/lib/zabbix/percona/templates/userparameter_percona_mysql.conf /usr/local/zabbix/etc/zabbix/zabbix_agentd.d/

修改php脚本配置
vim /var/lib/zabbix/percona/scripts/ss_get_mysql_stats.php                                                                                                     
$mysql_user = &#39;&#39;;
$mysql_pass = &#39;&#39;;
```
# 3. docker 监控解决方案

## zabbix  &#43; docker 

&gt; https://segmentfault.com/a/1190000007568413
```bash
useradd zabbix -M -s /sbin/nologin
sudo usermod -aG docker zabbix
/opt/soft 
mkdir zabbix32 
cd zabbix32 
svn co svn://svn.zabbix.com/branches/3.2 . 
./bootstrap.sh 
./configure --enable-agent --prefix=/opt/zabbix.docker
make install

mkdir src/modules/zabbix_module_docker
cd src/modules/zabbix_module_docker
wget https://raw.githubusercontent.com/monitoringartist/Zabbix-Docker-Monitoring/master/src/modules/zabbix_module_docker/zabbix_module_docker.c
wget https://raw.githubusercontent.com/monitoringartist/Zabbix-Docker-Monitoring/master/src/modules/zabbix_module_docker/Makefile
make
mkdir /opt/zabbix.docker/module/
cp zabbix_module_docker.so /opt/zabbix.docker/module/ 

# zabbix_agentd.conf

LoadModulePath=/opt/zabbix.docker/module/
LoadModule=zabbix_module_docker.so

```

## cAvisor&#43;InfluxDB&#43;Grafana
```bash
### influxdb ###
[root@00 ~]# docker run -d --name influxdb --net monitor -p 8083:8083 -p 8086:8086 tutum/influxdb
# 管理页面
# http://&lt;ip&gt;:8083/ 

##
# 以下可输入命令在选择框中均有提示 
# 创建cadvisor 数据库 ,在输入栏中输入:CREATE DATABASE &#34;cadvisor&#34; 然后回车
# 查看创建的数据,在输入栏中输入: SHOW DATABASES 然后回车
# 创建grafana 连接用户,在输入栏中输入: CREATE USER &#34;grafana&#34; WITH PASSWORD &#39;xxxxxx&#39; 然后回车
# 查看创建的用户,在输入栏输入: SHOW USERS 然后回车，
##

### cadvisor ### 
[root@00 ~]#  docker run -d --name=cadvisor --net monitor -p 8084:8080 -v /:/rootfs:ro  -v /var/run:/var/run -v /sys:/sys:ro -v /var/lib/docker:/var/lib/docker:ro google/cadvisor -storage_driver=influxdb -storage_driver_db=cadvisor -storage_driver_host=influxdb:8086

# [root@00 ~]# docker run -d --name=cadvisor --net monitor -p 8084:8080 --mount type=bind,src=/,dst=/rootfs,ro --mount type=bind,src=/var/run,dst=/var/run --mount type=bind,src=/sys,dst=/sys,ro --mount type=bind,src=/var/lib/docker,dst=/var/lib/docker,ro google/cadvisor -storage_driver=influxdb -storage_driver_db=cadvisor -storage_driver_host=influxdb:8086
#管理页面
#http://&lt;ip&gt;:8084/

### grafana ### 
[root@00 ~]# docker run -d --name grafana --net monitor -p 3000:3000 grafana/grafana 
#管理页面
# http://&lt;ip&gt;:3000/
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E7%9B%91%E6%8E%A7%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88/  

