# Nginx主配置文件nginx.conf超详细中文详解


{{&lt; admonition type=note open=true &gt;}}
本文原文出自老男孩微信公众号:`oldboyedu`, 原文连接已经丢失，现收集于网络转载文本，用于个人整理记录  
{{&lt; /admonition &gt;}}

# 1. 作者简介
老男孩，北京老男孩IT教育创始人，畅销图书作者，51CTO金牌讲师，16年运维经验及培训经验， IT界顶级Linux集群架构实战与教育专家。  
国内IT教育实战心理学运维思想体系创始人，将心理学运维思想大量应用于教学培训实践，成就屌丝无数。所教学生平均就业工资及后期发展速度连续多年在国内同行业排名第一！  
老男孩老师个人博客：  
&gt; http://oldboy.blog.51cto.com  
&gt; http://blog.oldboyedu.com  


# 2. Nginx核心配置文件nginx.conf史上最细中文详解

## 2.1. 定义Nginx运行的用户和用户组
```nginx
    user nginx nginx; #改为特殊的用户和组
    nginxworker 进程数，即处理请求的进程（熟称负责接客的服务员）  
    worker_processes 8;  #初始可设置为CPU总核数
```

## 2.2. cpu亲和力配置，让不同的进程使用不同的cpu
```nginx
worker_cpu_affinity 0001 0010 0100 1000 0001 00100100 1000;
```

## 2.3. 全局错误日志定义类型，[ debug|info|notice|warn|error|crit]
```nginx
error_log logs/error.log error;  #一定要设置warn级别以上  
```

## 2.4. 把进程号记录到文件
```nginx
pid logs/nginx.pid; #用于管理nginx进程
```

## 2.5. Nginxworker最大打开文件数，可设置为系统优化后的ulimit -HSn的结果
```nginx
worker_rlimit_nofile 65535;
```

## 2.6. IO事件模型与worker进程连接数设置
```nginx
events {
    #epoll模型是Linux 2.6以上版本内核中的高性能网络I/O模型
    use epoll;
    #单个worker进程最大连接数
    worker_connections 10240; #nginx最大连接数=worker连接数*worker进程数
}
```

## 2.7. http模块设置部分
```nginx
http{
    server_tokens off;   #隐藏响应header和错误通知中的版本号
    include mime.types;  #文件扩展名与文件类型映射表
    default_type application/octet-stream;#默认文件类型
    server_names_hash_max_size 512;     #服务域名的最大hash表大小
    server_names_hash_bucket_size 128;#服务域名的hash表大小
    #开启高效文件传输模式，实现内核零拷贝
    sendfile on;
    #激活tcp_nopush参数可以允许把httpresponse header和文件的开始放在一个文件里发布，积极的作用是减少网络报文段的数量
    tcp_nopush on;
    #激活tcp_nodelay，内核会等待将更多的字节组成一个数据包，从而提高I/O性能
    tcp_nodelay on;
    #连接超时时间，单位是秒
    keepalive_timeout 120;
    #目录列表访问参数，合适http下载，默认关闭。
    autoindex off;
    #读取客户端请求头的超时时间（参看老男孩的书籍理解http协议原理）
    client_header_timeout 15s;
    #读取客户端请求主体的超时时间（参看老男孩的书籍理解http协议原理）
    client_body_timeout 60s;
    #设定读取客户端请求主体的最大大小。（参看老男孩的书籍理解http协议原理）
    client_max_body_size 8m;
    #设置服务器端传送http响应信息到客户端的超时时间
    send_timeout 60s;
    #设定访问日志的日志记录格式，每列细节参考《跟老男孩学linux运维》:Web集群实战
    log_format main  &#39;$remote_addr - $remote_user$time_local] &#34;$request&#34; &#39; &#39;$status $body_bytes_sent &#34;$http_referer&#34; &#39;  &#39;&#34;$http_user_agent&#34;$http_x_forwarded_for&#34;&#39;;

    #FastCGI参数是和动态服务器交互起作用的参数
    #设定Nginx服务器和后端FastCGI服务器连接的超时时间
    fastcgi_connect_timeout 60;
    #设定Nginx允许FastCGI服务端返回数据的超时时间
    fastcgi_send_timeout 60;
    #设定Nginx从FastCGI服务端读取响应信息的超时时间
    fastcgi_read_timeout 60;
    #设定用来读取从FastCGI服务端收到的第一部分响应信息的缓冲区大小
    fastcgi_buffer_size 64k;
    #设定用来读取从FastCGI服务端收到的响应信息的缓冲区大小以及缓冲区数量
    fastcgi_buffers 4 64k;
    #设定系统很忙时可以使用的fastcgi_buffers大小，推荐大小为fastcgi_buffers *2。
    fastcgi_busy_buffers_size 128k;
    #fastcti临时文件的大小，可设置128-256K
    fastcgi_temp_file_write_size 128k;
    #gzip压缩模块部分（此部分对于网站优化极其重要）

    #开启gzip压缩功能。
    gzip on;
    #设置允许压缩的页面最小字节数，页面字节数从header头的Content-Length中获取。默认值是0，表示不管页面多大都进行压缩。建议设置成大于1K。如果小于1K可能会越压越大。
    gzip_min_length 1k;
    #压缩缓冲区大小。表示申请4个单位为16K的内存作为压缩结果流缓存，默认值是申请与原始数据大小相同的内存空间来存储gzip压缩结果。
    gzip_buffers    4 16k;
    #压缩版本（默认1.1，前端为squid2.5时使用1.0）用于设置识别HTTP协议版本，默认是1.1，目前大部分浏览器已经支持GZIP解压，使用默认即可。
    gzip_http_version 1.1;
    #压缩比率。用来指定GZIP压缩比，1压缩比最小，处理速度最快；9压缩比最大，传输速度快，但处理最慢，也比较消耗cpu资源。
    gzip_comp_level 2;
    #用来指定压缩的类型，“text/html”类型总是会被压缩，这个就是HTTP原理部分讲的媒体类型。
    gzip_typestext/plain application/x-javascript text/css application/xml;
    #vary header支持。该选项可以让前端的缓存服务器缓存经过GZIP压缩的页面，例如用Squid缓存经过Nginx压缩的数据。
    gzip_vary on;

    #反向代理负载均衡设定部分（可选）
    #upstream表示负载服务器池，定义名字为blog.oldboyedu.com的服务器池
    upstream blog.oldboyedu.com {
        #server是服务器节点起始标签，其后是节点地址，可为域名或IP，weight是权重，可以根据机器配置定义权重。weigth参数表示权值，权值越高被分配到的几率越大。
        ip_hash; #调度算法，默认是rr轮询。
        server 172.16.1.7:80 weight=1;
        server 172.16.1.8:80 weight=1;
        server 172.16.1.9:80 weight=1 backup; #backup表示热备
    }

    ## 设定基于域名的虚拟主机部分
    ###oldboy www web php server
    server {
        listen       80; #监听的端口，也可以是172.16.1.7:80形式

        server_name  www.oldboyedu.comoldboyedu.com; #域名

        root   html/blog; #站点根目录，即网站程序放的目录

        location / {  #默认访问的location标签段

            index  index.php index.htmlindex.htm; #首页排序

        }

        location ~.*.(php|php5)?$ { #符合php扩展名的请求调度到fcgi server

            fastcgi_pass 127.0.0.1:9000; #抛给本机的9000端口(php fastcgi server)

            fastcgi_index index.php; #设定动态首页

            include fastcgi.conf; #设定和fastcgi交互的相关参数包含文件

        }

        ### 将符合静态文件的图片视频流媒体等设定expries缓存参数，要求浏览器缓存。
        location~ .*\.(gif|jpg|jpeg|png|bmp|swf)$ {

            expires      10y; #客户端缓存上述静态数据10年

        }

        ### 将符合js,css文件的等设定expries缓存参数，要求浏览器缓存。

        location~ .*\.(js|css)?$ {

            expires      30d; #客户端缓存上述js,css数据30天

        }

    access_log /app/logs/www_access.log  main; #根据日志格式记录用户访问的日志

}
```

 

## 2.8. 反向代理负载均衡配置（代理blog.oldboyedu.com服务）
```nginx
server {

       listen       80; #监听的端口，也可以是172.16.1.7:80形式

       server_name  blog.oldboyedu.com; #代理的服务域名

    location / {

       #将访问blog.oldboyedu.com的所有请求都发送到upstream定义的服务器节点池。

        proxy_passhttp://blog.oldboyedu.com;

        #在代理向后端服务器发送的http请求头中加入host字段信息，用于当后端服务器配置有多个虚拟主机时，可以识别代理的是哪个虚拟主机。这是节点服务器多虚拟主机时的关键配置。

        proxy_set_headerHost  $host;

        #在代理向后端服务器发送的http请求头中加入X-Forwarded-For字段信息，用于后端服务器程序、日志等接收记录真实用户的IP，而不是代理服务器的IP。

        proxy_set_header X-Forwarded-For$remote_addr;

        #设定反向代理与后端节点服务器连接的超时时间，即发起握手等候响应的超时时间。

        proxy_connect_timeout60;

        #设定代理后端服务器的数据回传时间

        proxy_send_timeout 60;

        #设定Nginx从代理的后端服务器获取信息的时间

        proxy_read_timeout 60;

        #设定缓冲区的大小

        proxy_buffer_size 4k;

        #设定缓冲区的数量和大小。nginx从代理的后端服务器获取的响应信息，会放置到缓冲区。

        proxy_buffers 4 32k;

        #设定系统很忙时可以使用的proxy_buffers大小

       proxy_busy_buffers_size 64k;

        #设定proxy缓存临时文件的大小

       proxy_temp_file_write_size 64k;

        #对于以上参数的详细理解可见本文开头图解。

    }

    access_log off; #反向代理如果并发大，务必要关闭日志，否则IO吃紧。
}
```
 

## 2.9. 设定查看Nginx状态的地址
```nginx
location /status {

    stub_status on; #开启状态功能

    access_log off; #关闭记录日志

    auth_basic “Oldboy Server Status”; #设置基本认证提示

    auth_basic_user_file conf/htpasswd; #校验密码文件

}
```

## 2.10. 设定java程序动静分离反向代理负载均衡配置
```nginx
#Oldboy Bbs server

 server {

    listen       80; #监听的端口，也可以是172.16.1.7:80形式
    server_name  bbs.oldboyedu.com; #代理的域名

    root  html/bbs; #程序目录
    index index.php index.html index.htm;
    #所有静态文件由nginx服务处理
    location ~.*.(htm|html|gif|jpg|jpeg|png|swf|flv)$ {
        expires 3650d;
    }

    location ~ .*.(js|css)?$ {
        expires 30d;
    }

    #所有java相关扩展名均交由tomcat或resin服务处理。
    location ~ .(jsp|jspx|do)?$ {
        #将访问blog.oldboyedu.com的所有请求都发送到upstream定义的服务器节点池。
        proxy_pass http://127.0.0.1:8080;
        #在代理向后端服务器发送的http请求头中加入host字段信息，用于当后端服务器配置有多个虚拟主机时，可以识别代理的是哪个虚拟主机。这是节点服务器多虚拟主机时的关键配置。
        proxy_set_header Host  $host;
        #在代理向后端服务器发送的http请求头中加入X-Forwarded-For字段信息，用于后端服务器程序、日志等接收记录真实用户的IP，而不是代理服务器的IP。
        proxy_set_headerX-Forwarded-For $remote_addr;
    }
    access_log /app/logs/bbs_access.log  main; #记录日志
    }
}
```




---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/nginx.conf%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6%E8%AF%A6%E8%A7%A3/  

