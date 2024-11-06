# Haproxy部署与常用操作


{{&lt; admonition type=quote title=&#34;本文参考以下内容, 由本站重新整理验证发布&#34; open=true &gt;}}
&gt; [https://zhang.ge/5125.html](https://zhang.ge/5125.html)  

&gt; [https://www.kancloud.cn/tuna_dai_/day01/369367](https://www.kancloud.cn/tuna_dai_/day01/369367 )
{{&lt; /admonition &gt;}}  

# 1. 简介 
- HAProxy提供高可用性、负载均衡以及基于TCP和HTTP应用的代理，支持虚拟主机，它是免费、快速并且可靠的一种解决方案。  
- HAProxy特别适用于那些负载特大的web站点，这些站点通常又需要会话保持或七层处理。  
- HAProxy运行在当前的硬件上，完全可以支持数以万计的并发连接。并且它的运行模式使得它可以很简单安全的整合进您当前的架构中， 同时可以保护你的web服务器不被暴露到网络上。  
- HAProxy实现了一种事件驱动, 单一进程模型，此模型支持非常大的并发连接数。多进程或多线程模型受内存限制 、系统调度器限制以及无处不在的锁限制，很少能处理数千并发连接。事件驱动模型因为在有更好的资源和时间管理的用户空间(User-Space) 实现所有这些任务，所以没有这些问题。此模型的弊端是，在多核系统上，这些程序通常扩展性较差。这就是为什么他们必须进行优化以 使每个CPU时间片(Cycle)做更多的工作。  

# 2. 安装 
```bash
[root@00 software]# wget https://www.haproxy.org/download/1.8/src/haproxy-1.8.19.tar.gz
[root@00 software]# tar -xzvf haproxy-1.8.19.tar.gz
[root@00 software]# cd haproxy-1.8.19/
# 安装 
# 内核版本，使用uname -r查看内核，如：2.6.18-371.el5，此时该参数就为linux26；kernel 大于2.6.28的用：TARGET=linux2628 
[root@00 haproxy-1.8.19]# make TARGET=linux2628 ARCH=x86_64 PREFIX=/opt/haproxy  # PREFIX=/opt/haproxy-1.8.19
[root@00 haproxy-1.8.19]# make install PREFIX=/opt/haproxy  # PREFIX=/opt/haproxy-1.8.19
[root@00 haproxy-1.8.19]# useradd -u 1012 -M -s /sbin/nologin -d /opt/haproxy haproxy
[root@00 haproxy-1.8.19]# chown -R haproxy.haproxy /opt/haproxy-1.8.19
# [root@00 haproxy-1.8.19]# ln -s /opt/haproxy-1.8.19 /opt/haproxy
```

# 3. 配置 
## 3.1. 规划目录
```bash
# haproxy chroot,需要设置所有用户均不具有写权限
[root@00 haproxy-1.8.19]# mkdir /opt/haproxy/chroot &amp;&amp; chmod 440 /opt/haproxy/chroot 
# 主配置文件目录
[root@00 haproxy-1.8.19]# mkdir /opt/haproxy/etc
# 子配置文件目录，规划enabled 目录为 ready目录内正式启用的软连接文件
[root@00 haproxy-1.8.19]# mkdir /opt/haproxy/etc/{enabled,ready}/{tcp,http} -p 
# 完整目录结构 
[root@00 haproxy-1.8.19]#  tree /opt/haproxy/etc/
/opt/haproxy/etc/
├── enabled
│   ├── http
│   │   └── example.cfg -&gt; ../../ready/http/example.cfg
│   └── tcp
├── haproxy.cfg
└── ready
    ├── http
    │   └── example.cfg
    └── tcp

6 directories, 3 files
```
## 3.2. 主配置文件 
```bash
# current config: /opt/haproxy/etc/haproxy.cfg 
###### haproxy 进程信息设置 ######
global
    log 172.10.10.   local0
    maxconn 4096              #最大连接数
    chroot /opt/haproxy/chroot #chroot装录
    pidfile /opt/haproxy/haproxy.pid #haproxy pid
    stats socket /opt/haproxy/haproxy.sock mode 660 level admin #定义统计信息保存的位置,设置权限660，等级设置为管理,防止使用socat与sock通信是权限不够
    user    haproxy           #用户nobody
    group   haproxy           #组nobody
    daemon                    #守护进程运行
    nbproc 1                  #进程数量
 
##### 默认配置，均可通过后续设置覆盖当前设置 ######
defaults
   log     global
   mode    http               #7层 http;4层tcp,如果要让haproxy支持虚拟主机，mode 必须设为http 
   option  httplog            #记录haproxy 访问日志, http 日志格式
   option  httpclose          #每次请求完毕后主动关闭http通道,haproxy不支持keep-alive,只能模拟这种模式的实现
   option  redispatch         #serverId对应的服务器挂掉后,强制定向到其他健康的服务器
   retries 3                  #3次连接失败就认为是服务器不可用
   option  dontlognull        #日志中不记录空连接,比如健康检查日志信息
   option forwardfor header X-REAL-IP   # 转发用户真实ip
   maxconn 2000                     #最大连接数，受系统ulimit 设置影响
   timeout connect      3600000     #连接超时(毫秒)
   timeout client      3600000      #客户端超时(毫秒)
   timeout server      3600000      #服务器超时(毫秒)
 
listen stats
    bind 0.0.0.0:8888
    stats enable                # 显示状态页面
    stats hide-version          # 隐藏 haproxy 版本号
    stats refresh       30s     # 页面自动刷新时间
    stats uri   /haproxy-status # 统计页面url
    stats realm hello\ haproxy  #统计页面密码框上提示文本
    stats auth  haproxy:haproxy # 设置监控页面的用户和密码，可以设置多个
    #stats auth  haproxy:haproxy
```
## 3.3. 子配置
```bash
# current config: /opt/haproxy/etc/ready/http/example.cfg 
###### 前端配置 ###### 
frontend frontend_www.example.com_1 
    # 
    bind 0.0.0.0:5000
    mode http
#    acl url_static       path_beg       -i /static /images /javascript /stylesheets
#    acl url_static       path_end       -i .jpg .gif .png .css .js
#    use_backend static          if url_static
    # 请求转发到那个后端
    default_backend             backend_www.example.com_1

#---------------------------------------------------------------------
# static backend for serving up images, stylesheets and such
#---------------------------------------------------------------------

###### 后端配置 ###### 
backend backend_www.example.com_1
    option forwardfor header X-REAL-IP
    # 健康检查，发送一个HEAD请求，验证节点是否存活
    option httpchk HEAD / HTTP/1.0
    # 负载均衡模式roundrobin(轮询);source(ip hash);static-rr(权重轮询);leastconn(以服务器连接数轮询，连接数最低的优先连接)
    balance     roundrobin
    # check: 启用健康检查 
    # inter 默认2秒检查 
    # rise 检查连续可以的次数，当超过该次数,加入该节点，可用次数一般设置稍大
    # 1fall 检查连续不可用的次数，当超过该次数,剔除该节点 
    server      node1 172.10.10.11:8081 check inter 2000 rise 30 fall 15
    server      node2 172.10.10.12:8081 check inter 2000 rise 30 fall 15
```
## 3.4. 详细配置说明 

```ini
###########全局配置#########
global
　　log 127.0.0.1 local0 #[日志输出配置，所有日志都记录在本机，通过local0输出]
　　log 127.0.0.1 local1 notice #定义haproxy 日志级别[error warringinfo debug]
　　daemon #以后台形式运行harpoxy
　　nbproc 1 #设置进程数量
　　maxconn 4096 #默认最大连接数,需考虑ulimit-n限制
　　#user haproxy #运行haproxy的用户
　　#group haproxy #运行haproxy的用户所在的组
　　#pidfile /var/run/haproxy.pid #haproxy 进程PID文件
　　#ulimit-n 819200 #ulimit 的数量限制
　　#chroot /usr/share/haproxy #chroot运行路径
　　#debug #haproxy 调试级别，建议只在开启单进程的时候调试
　　#quiet

########默认配置############
defaults
　　log global
　　mode http #默认的模式mode { tcp|http|health }，tcp是4层，http是7层，health只会返回OK
　　option httplog #日志类别,采用httplog
　　option dontlognull #不记录健康检查日志信息
　　retries 2 #两次连接失败就认为是服务器不可用，也可以通过后面设置
　　#option forwardfor #如果后端服务器需要获得客户端真实ip需要配置的参数，可以从Http Header中获得客户端ip
　　option httpclose #每次请求完毕后主动关闭http通道,haproxy不支持keep-alive,只能模拟这种模式的实现
　　#option redispatch #当serverId对应的服务器挂掉后，强制定向到其他健康的服务器，以后将不支持
　　option abortonclose #当服务器负载很高的时候，自动结束掉当前队列处理比较久的链接
　　maxconn 4096 #默认的最大连接数
　　timeout connect 5000ms #连接超时
　　timeout client 30000ms #客户端超时
　　timeout server 30000ms #服务器超时
　　#timeout check 2000 #心跳检测超时
　　#timeout http-keep-alive10s #默认持久连接超时时间
　　#timeout http-request 10s #默认http请求超时时间
　　#timeout queue 1m #默认队列超时时间
　　balance roundrobin #设置默认负载均衡方式，轮询方式
　　#balance source #设置默认负载均衡方式，类似于nginx的ip_hash
　　#balnace leastconn #设置默认负载均衡方式，最小连接数

########统计页面配置########
listen stats
　　bind 0.0.0.0:1080 #设置Frontend和Backend的组合体，监控组的名称，按需要自定义名称
　　mode http #http的7层模式
　　option httplog #采用http日志格式
　　#log 127.0.0.1 local0 err #错误日志记录
　　maxconn 10 #默认的最大连接数
　　stats refresh 30s #统计页面自动刷新时间
　　stats uri /stats #统计页面url
　　stats realm XingCloud\ Haproxy #统计页面密码框上提示文本
　　stats auth admin:admin #设置监控页面的用户和密码:admin,可以设置多个用户名
　　stats auth Frank:Frank #设置监控页面的用户和密码：Frank
　　stats hide-version #隐藏统计页面上HAProxy的版本信息
　　stats admin if TRUE #设置手工启动/禁用，后端服务器(haproxy-1.4.9以后版本)

########设置haproxy 错误页面#####
#errorfile 403 /home/haproxy/haproxy/errorfiles/403.http
#errorfile 500 /home/haproxy/haproxy/errorfiles/500.http
#errorfile 502 /home/haproxy/haproxy/errorfiles/502.http
#errorfile 503 /home/haproxy/haproxy/errorfiles/503.http
#errorfile 504 /home/haproxy/haproxy/errorfiles/504.http

########frontend前端配置##############
frontend main
　　bind *:80 #这里建议使用bind *:80的方式，要不然做集群高可用的时候有问题，vip切换到其他机器就不能访问了。
　　acl web hdr(host) -i www.abc.com  #acl后面是规则名称，-i为忽略大小写，后面跟的是要访问的域名，如果访问www.abc.com这个域名，就触发web规则，。
　　acl img hdr(host) -i img.abc.com  #如果访问img.abc.com这个域名，就触发img规则。
　　use_backend webserver if web   #如果上面定义的web规则被触发，即访问www.abc.com，就将请求分发到webserver这个作用域。
　　use_backend imgserver if img   #如果上面定义的img规则被触发，即访问img.abc.com，就将请求分发到imgserver这个作用域。
　　default_backend dynamic #不满足则响应backend的默认页面

###### &gt;&gt; ################################# ACL ################################# &lt;&lt; ######
########ACL策略定义#########################
#如果请求的域名满足正则表达式返回true -i是忽略大小写
acl denali_policy hdr_reg(host) -i ^(www.inbank.com|image.inbank.com)$
#如果请求域名满足www.inbank.com 返回 true -i是忽略大小写
acl tm_policy hdr_dom(host) -i www.inbank.com
#在请求url中包含sip_apiname=，则此控制策略返回true,否则为false
acl invalid_req url_sub -i sip_apiname=#定义一个名为invalid_req的策略
#在请求url中存在timetask作为部分地址路径，则此控制策略返回true,否则返回false
acl timetask_req url_dir -i timetask
#当请求的header中Content-length等于0时返回 true
acl missing_cl hdr_cnt(Content-length) eq 0
#########acl策略匹配相应###################
#当请求中header中Content-length等于0 阻止请求返回403
block if missing_cl
#block表示阻止请求，返回403错误，当前表示如果不满足策略invalid_req，或者满足策略timetask_req，则阻止请求。
block if !invalid_req || timetask_req
#当满足denali_policy的策略时使用denali_server的backend
use_backend denali_server if denali_policy
#当满足tm_policy的策略时使用tm_server的backend
use_backend tm_server if tm_policy
#reqisetbe关键字定义，根据定义的关键字选择backend
reqisetbe ^Host:\ img dynamic
reqisetbe ^[^\ ]*\ /(img|css)/ dynamic
reqisetbe ^[^\ ]*\ /admin/stats stats
#以上都不满足的时候使用默认mms_server的backend
default_backend mms
###### &gt;&gt; ################################# ACL ################################# &lt;&lt; ######


########backend后端配置##############
backend webserver #webserver作用域
　　mode http
　　balance roundrobin #balance roundrobin 负载轮询，balance source 保存session值，支持static-rr，leastconn，first，uri等参数
　　option httpchk /index.html HTTP/1.0 #健康检查, 检测文件，如果分发到后台index.html访问不到就不再分发给它
　　server web1 10.16.0.9:8085 cookie 1 weight 5 check inter 2000 rise 2 fall 3
　　server web2 10.16.0.10:8085 cookie 2 weight 3 check inter 2000 rise 2 fall 3
　　#cookie 1表示serverid为1，check inter 1500 是检测心跳频率 
　　#rise 2是2次正确认为服务器可用，fall 3是3次失败认为服务器不可用，weight代表权重

backend imgserver
　　mode http
　　option httpchk /index.php
　　balance roundrobin 
　　server img01 192.168.137.101:80 check inter 2000 fall 3
　　server img02 192.168.137.102:80 check inter 2000 fall 3

backend dynamic 
　　balance roundrobin 
　　server test1 192.168.1.23:80 check maxconn 2000 
　　server test2 192.168.1.24:80 check maxconn 2000


listen tcptest 
　　bind 0.0.0.0:5222 
　　mode tcp 
　　option tcplog #采用tcp日志格式 
　　balance source 
　　#log 127.0.0.1 local0 debug 
　　server s1 192.168.100.204:7222 weight 1 
　　server s2 192.168.100.208:7222 weight 1
```
## 3.5. 启动管理  
- 参考 [https://zhang.ge/5125.html](https://zhang.ge/5125.html) 中脚本微调适应个人需求  

- **haproxy.init.sh**   
```bash
#!/bin/sh
#
# chkconfig: - 85 15
# description: HAProxy is a TCP/HTTP reverse proxy which is particularly suited \
#              for high availability environments.
# processname: haproxy
# config: /opt/haproxy/etc/haproxy.cfg
# pidfile: /opt/haproxy/haproxy.pid

# Script Author: 0x5c0f(初版作者https://zhang.ge/5125.html)
# Version: 2004060600

PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
export PATH

PROCESS_NAME=haproxy
BASE_DIR=/opt/haproxy
EXEC=$BASE_DIR/sbin/haproxy
PID_FILE=$BASE_DIR/haproxy.pid
DEFAULT_CONF=$BASE_DIR/etc/haproxy.cfg

# COLOR print
COLOR_RED=$(echo -e &#34;\e[31;49m&#34;)
COLOR_GREEN=$(echo -e &#34;\e[32;49m&#34;)
COLOR_RESET=$(echo -e &#34;\e[0m&#34;)
info() { echo &#34;${COLOR_GREEN}$*${COLOR_RESET}&#34;; }
warn() { echo &#34;${COLOR_RED}$*${COLOR_RESET}&#34;; }

print_usage() {
    info &#34; Usage: $(basename $0) [start|stop|restart|status|test]&#34;
}

#get Expanding configuration
ext_configs() {
    CONFIGS=
    if [[ -d $BASE_DIR/etc/enabled ]]; then
        for FILE in $(find $BASE_DIR/etc/enabled -type l | sort -n); do
            CONFIGS=&#34;$CONFIGS -f $FILE&#34;
        done
        echo $CONFIGS
    else
        echo
    fi
}
# check process status
check_process() {
    PID=$(get_pid)
    if ps aux | awk &#39;{print $2}&#39; | grep -qw $PID 2&gt;/dev/null; then
        true
    else
        false
    fi

}
# check Configuration file
check_conf() {
    $EXEC -c -f $DEFAULT_CONF $(ext_configs) &gt;/dev/null 2&gt;&amp;1
    return $?
}
get_pid() {
    if [[ -f $PID_FILE ]]; then
        cat $PID_FILE
    else
        warn &#34; $PID_FILE not found!&#34;
        exit 1
    fi
}
start() {
    if check_process; then
        warn &#34; ${PROCESS_NAME} is already running!&#34;
    else
        $EXEC -f $DEFAULT_CONF $(ext_configs) &amp;&amp;
            echo -e &#34; ${PROCESS_NAME} start                        [ $(info OK) ]&#34; ||
            echo -e &#34; ${PROCESS_NAME} start                        [ $(warn Failed) ]&#34;
    fi
}

stop() {
    if check_process; then
        PID=$(get_pid)
        kill -9 $PID &gt;/dev/null 2&gt;&amp;1
        echo -e &#34; ${PROCESS_NAME} stop                         [ $(info OK) ]&#34;
    else
        warn &#34; ${PROCESS_NAME} is not running!&#34;
    fi
}

restart() {
    if ! check_process ; then
        warn &#34; ${PROCESS_NAME} is not running! Starting Now...&#34;
    fi
    if $(check_conf); then
        PID=$(get_pid)
        $EXEC -f $DEFAULT_CONF $(ext_configs) -st $PID &amp;&amp;
            echo -e &#34; ${PROCESS_NAME} restart                      [ $(info OK) ]&#34; ||
            echo -e &#34; ${PROCESS_NAME} restart                      [ $(warn Failed) ]&#34;
    else
        warn &#34; ${PROCESS_NAME} Configuration file is not valid, plz check!&#34;
        echo -e &#34; ${PROCESS_NAME} restart                      [ $(warn Failed) ]&#34;
    fi
}

if [[ $# != 1 ]]; then
    print_usage
    exit 1
else
    case $1 in
    &#34;start&#34; | &#34;START&#34;)
        start
        ;;
    &#34;stop&#34; | &#34;STOP&#34;)
        stop
        ;;
    &#34;restart&#34; | &#34;RESTART&#34; | &#34;-r&#34;)
        restart
        ;;
    &#34;status&#34; | &#34;STATUS&#34;)
        if check_process; then
            info &#34;${PROCESS_NAME} is running OK!&#34;
        else
            warn &#34; ${PROCESS_NAME} not running, plz check&#34;
        fi
        ;;
    &#34;test&#34; | &#34;TEST&#34; | &#34;-t&#34;)
        if check_conf; then
            info &#34; Configuration file test Successfully.&#34;
        else
            warn &#34; Configuration file test failed.&#34;
        fi
        ;;
    *)
        print_usage
        exit 1
        ;;
    esac
fi

```

# 4. 访问管理
## 4.1. 前端 
- 负载均衡vip 访问地址: http://0.0.0.0:5000   
- haproxy 管理访问地址: http://0.0.0.0:8888/haproxy-status  

## 4.2. 后端
1. 后端与haproxy socket 通信操作(需要socat支持)  
```bash
#  节点启用维护模式
#  echo &#34;disable server backend_www.example.com_1/node1&#34; |socat stdio /opt/haproxy/haproxy.sock
#  节点关闭维护模式
#  echo &#34;enable server backend_www.example.com_1/node1&#34; |socat stdio /opt/haproxy/haproxy.sock
```




---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/haproxy%E9%83%A8%E7%BD%B2%E4%B8%8E%E5%B8%B8%E7%94%A8%E6%93%8D%E4%BD%9C/  

