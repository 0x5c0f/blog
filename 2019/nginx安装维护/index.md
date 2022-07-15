# Nginx安装维护


# 搭建环境：  
- nginx：1.14.2  
- 服务器：centos7  
# 依赖安装  
```bash
[root@00 software]# yum install -y gcc glibc gcc-c++ pcre-devel openssl-devel git #安装依赖关系 
[root@00 software]# mkdir /opt/software
[root@00 software]# cd /opt/software
[root@00 software]# wget http://nginx.org/download/nginx-1.14.2.tar.gz
# nginx 负载均衡检测模块 
# [root@00 software]# git clone https://github.com/yaoweibin/nginx_upstream_check_module.git
# vts-status 模块用于替换默认的 http_stub_status_module 启用vts时可以不启用默认的
# [root@00 nginx-1.14.2]# git clone https://github.com/vozlt/nginx-module-vts.git
# 
```
# 编译安装（安装过程若差包直接装上就可以了） 
```bash
[root@00 software]# tar xzvf nginx-1.14.2.tar.gz
[root@00 software]# cd nginx-1.14.2
[root@00 nginx-1.14.2]# useradd -d /var/ftproot -s /sbin/nologin www  -u 1002
# 负载均衡模块添加,添加对应版本的补丁
# [root@00 nginx-1.14.2]# patch -p1 < ../nginx_upstream_check_module/check_1.14.0+.patch
# 
# 隐藏默认版本号，隐藏默认标识 
# sed -i 's#"1.14.2"#""#g' ./src/core/nginx.h
# sed -i 's#"NGINX"#"0x5c0f"#g' ./src/core/nginx.h
# sed -i 's#"nginx/"#"0x5c0f/"#g' ./src/core/nginx.h
# sed -i 's#"Server: nginx"#"Server: 0x5c0f"#g' ./src/http/ngx_http_header_filter_module.c
# sed -i 's#<center>nginx</center>#<center>0x5c0f</center>#g' ./src/http/ngx_http_special_response.c
# grep "0x5c0f" ./src/http/ngx_http_header_filter_module.c ./src/http/ngx_http_special_response.c ./src/core/nginx.h 


[root@00 nginx-1.14.2]# ./configure --user=www --group=www --with-http_ssl_module --with-http_stub_status_module --prefix=/opt/nginx-1.14.2 
#--with-http_realip_module （建议添加用于日志分析）
# --add-module=../nginx_upstream_check_module/ (负载均衡模块编译，新增时注意保留原有参数)
# --add-module=../nginx-module-vts/ (负载均衡模块编译，新增时注意保留原有参数)
# 
checking for OS
 + Linux 2.6.32-71.el6.i686 i686
checking for C compiler ... found
 + using GNU C compiler
 + gcc version: 4.4.4 20100726 (Red Hat 4.4.4-13) (GCC)
checking for gcc -pipe switch ... found
checking for -Wl,-E switch ... found
checking for gcc builtin atomic operations ... found
checking for C99 variadic macros ... found
checking for gcc variadic macros ... found
-----忽略部分内容-----
 nginx path prefix: "/opt/nginx-1.14.2"
 nginx binary file: "/opt/nginx-1.14.2/sbin/nginx"
 nginx modules path: "/opt/nginx-1.14.2/modules"
 nginx configuration prefix: "/opt/nginx-1.14.2/conf"
 nginx configuration file: "/opt/nginx-1.14.2/conf/nginx.conf"
 nginx pid file: "/opt/nginx-1.14.2/logs/nginx.pid"
 nginx error log file: "/opt/nginx-1.14.2/logs/error.log"
 nginx http access log file: "/opt/nginx-1.14.2/logs/access.log"
 nginx http client request body temporary files: "client_body_temp"
 nginx http proxy temporary files: "proxy_temp"
 nginx http fastcgi temporary files: "fastcgi_temp"
 nginx http uwsgi temporary files: "uwsgi_temp"
 nginx http scgi temporary files: "scgi_temp"
[root@00 software]# make
make -f objs/Makefile
make[1]: Entering directory `/opt/software/nginx-1.14.2'
cc -c -pipe  -O -W -Wall -Wpointer-arith -Wno-unused-parameter -Werror -g  -I src/core -I src/event -I src/event/modules -I src/os/unix -I objs \
        -o objs/src/core/nginx.o \
        src/core/nginx.c
-----忽略部分内容-----
sed -e "s|%%PREFIX%%|/opt/nginx-1.14.2|" \
        -e "s|%%PID_PATH%%|/opt/nginx-1.14.2/logs/nginx.pid|" \
        -e "s|%%CONF_PATH%%|/opt/nginx-1.14.2/conf/nginx.conf|" \
        -e "s|%%ERROR_LOG_PATH%%|/opt/nginx-1.14.2/logs/error.log|" \
        < man/nginx.8 > objs/nginx.8
make[1]: Leaving directory `/opt/software/nginx-1.14.2'
[root@00 nginx-1.14.2]# make install
make -f objs/Makefile install
make[1]: Entering directory `/opt/software/nginx-1.14.2'
test -d '/opt/nginx-1.14.2' || mkdir -p '/opt/nginx-1.14.2'
test -d '/opt/nginx-1.14.2/sbin' \
        || mkdir -p '/opt/nginx-1.14.2/sbin'
----忽略部分内容-----
make[1]: Leaving directory `/opt/software/nginx-1.14.2'
[root@00 nginx-1.14.2]# ln -s /opt/nginx-1.14.2/ /opt/nginxssl #创建软连接,用于版本控制,此步骤可以不做
# 负载均衡模块显示配置  
# 1. 需要在 upstream 模块中添加检测 # check interval=3000 rise=2 fall=5 timeout=1000 type=http;(每隔3秒检测一次,请求2次正常则标记realserver状态为up,如果检测5次都失败,则标记realserver的状态为down,超过时间为1秒，检查协议为http)
# 2. server中添加location (可合并)
# location /status {
#   check_status;
#   access_log off;
# }
```

## 启动  
```bash
[root@00 Desktop]# /opt/nginx/sbin/nginx -t #检查nginx配置是否正确
nginx: the configuration file /opt/nginx-1.14.2/conf/nginx.conf syntax is ok
nginx: configuration file /opt/nginx-1.14.2/conf/nginx.conf test is successful
[root@00 Desktop]# /opt/nginx/sbin/nginx
[root@00 Desktop]# netstat -lntup|grep 80
tcp 0 0 0.0.0.0:80 0.0.0.0:* LISTEN 5181/nginx 
```


