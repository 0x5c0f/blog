# 常用web环境优化


{{&lt; admonition type=info title=&#34;前言&#34; open=true &gt;}}
一篇包含tomcat、nginx、php等相关参数及性能的优化文件，看了很多，但却不能完全记住，整理一篇用于备忘。  
{{&lt; /admonition &gt;}}

# 1. tomcat 服务调优  
- `tomcat: 8.5.59`  
## 1.1. 安全优化  
- 降权启动  
    - 新建普通用户，切换到普通用户，启动`tomcat`  
    
- `telnet`管理端口保护   
    - 修改配置文件`/pathto/tomcat/conf/server.xml`,22行左右的`&lt;Server port=&#34;8005&#34; shutdown=&#34;SHUTDOWN&#34;&gt;` `8005`端口和`SHUTDOWN`(区分大小写)关键字,防止`tomcat`被远程关闭   
    
- `ajp` 连接端口保护  
    - `ajp` 是`apache`和`tomcat`相互沟通的一个渠道，如果不使用，可以注释掉或者修改端口 `/pathto/tomcat/conf/server.xml: 123 `。  

- 禁用管理端   
    - 一般管理端用于测试使用,正式使用需要删除`/pathto/tomcat/webapps`下所有目录,新建的站点放到该目录的`ROOT`下即可,另删除`/pathto/tomcat/conf/tomcat-users.xml`下关于角色的配置(或者删掉这个文件,似乎也没有什么影响)。  

- 文件访问列表控制  
    - `web.xml: 121` 配置`listings`值为`false`， 默认`false`  

- 隐藏版本信息
    - 可修改`conf/web.xml`中关于`error-page`的相关配置(实际上个人在`5.8`中好像没有找到这块的),也可以修改站点中`WEB-INF/web.xml`中的错误页  

- 访问控制限制 
    - `conf/server.xml: Host` 下添加`&lt;Valve className=&#34;org.apache.catalina.valves.RemoteAddrValve&#34; allow=&#34;10.0.2.*&#34;/&gt;`
    
- 启动脚本权限修正`744`  

- 应用自动部署 
    - `conf/server.xml: 158` 修改参数`unpackWARs`和`autoDeploy`: `&lt;Host name=&#34;localhost&#34; appBase=&#34;webapps&#34; unpackWARs=&#34;false&#34; autoDeploy=&#34;false&#34;&gt;`  


## 1.2. 性能优化 
- 屏蔽dns查询  
    - `enableLookups=&#34;false&#34;`: `69 : /pathto/tomcat/conf/server.xml`(配置默认端口那儿)  

- jvm 调优  
    - `JAVA_OPTS=`根据监控协调参数。  

- 启用`nio2`(conf/server.xml)
***Nio2启用后zabbix带有的模板监控会出现大量的监控项无效，Object or attribute not found. 此问题暂时还未找到解决方案***    
```  
&lt;Connector executor=&#34;tomcatThreadPool&#34; port=&#34;8080&#34; enableLookups=&#34;false&#34; 
        protocol=&#34;org.apache.coyote.http11.Http11Nio2Protocol&#34;
        connectionTimeout=&#34;20000&#34;
        redirectPort=&#34;8443&#34; /&gt;  
```  

# 2. tmpfs 一种基于内存的文件系统
可用于挂载临时文件存放目录,挂载后操作目录相当于直接操作内存，umount后挂载目录数据会被直接清空。  
```bash
mount -t tmpfs -o size=1024M tmpfs /mnt/usb02 
```

# 3. nginx 优化

nginx 规则匹配优先级: `=` &gt; `完整路径` &gt; `^~` &gt; `~|~*` &gt; `部分起始路径` &gt; `/`    
&lt;span id=&#34;30&#34;&gt;&lt;/span&gt;
&lt;details&gt;
&lt;summary style=&#34;font-size:18px;color:blue&#34;&gt;防止SQL注入、XSS攻击的实践配置方法&lt;/summary&gt;

```bash
if ($request_method !~* GET|POST) { return 444; }
#使用444错误代码可以更加减轻服务器负载压力。
if ($query_string ~* &#34;(\$|&#39;|--|[&#43;|(%20|%2F)]union[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]insert[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]drop[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]truncate[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]update[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]from[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]grant[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]exec[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]where[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]select[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]and[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]or[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]count[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]exec[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]chr[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]mid[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]like[&#43;|(%20|%2F)]|[&#43;|(%20|%2F)]iframe[&#43;|(%20|%2F)]|[\&lt;|%3C]script[\&gt;|%3E]|javascript|alert|webscan|dbappsecurity|style|confirm\(|innerhtml|innertext)(.*)$&#34;) { return 555; }

if ($uri ~* &#34;(/~).*&#34;) { return 501; }
if ($uri ~* &#34;(\\x.)&#34;) { return 501; }

if ($query_string ~* &#34;[;&#39;&lt;&gt;].*&#34;) { return 509; }
if ($request_uri ~ &#34; &#34;) { return 509; }
if ($request_uri ~ &#34;(\/\.&#43;)&#34;) { return 509; }
if ($request_uri ~ &#34;(\.&#43;\/)&#34;) { return 509; }

# sql 注入
# if ($uri ~* &#34;(insert|select|delete|update|count|master|truncate|declare|exec|\*|\&#39;)(.*)$&#34; ) { return 508; }
if ($query_string ~ &#34;concat.*\(&#34;) { return 508; }
if ($query_string ~ &#34;union.*select.*\(&#34;) { return 508; }
if ($query_string ~ &#34;union.*all.*select.*&#34;) { return 508; }
if ($request_uri ~* &#34;(cost\()|(concat\()&#34;) { return 508; }

if ($request_uri ~* &#34;[&#43;|(%20|%2F)]union[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]and[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]select[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]or[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]delete[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]update[&#43;|(%20|%2F)]&#34;) { return 508; }
if ($request_uri ~* &#34;[&#43;|(%20|%2F)]insert[&#43;|(%20|%2F)]&#34;) { return 508; }

## 常见漏洞利用
if ($query_string ~ &#34;(&lt;|%3C).*script.*(&gt;|%3E)&#34;) { return 403; }
if ($query_string ~ &#34;GLOBALS(=|\[|\%[0-9A-Z]{0,2})&#34;) { return 403; }
if ($query_string ~ &#34;_REQUEST(=|\[|\%[0-9A-Z]{0,2})&#34;) { return 403; }
if ($query_string ~ &#34;proc/self/environ&#34;) { return 403; }
if ($query_string ~ &#34;mosConfig_[a-zA-Z_]{1,21}(=|\%3D)&#34;) { return 403; }
if ($query_string ~ &#34;base64_(en|de)code\(.*\)&#34;) { return 403; }

# 垃圾邮件字段
if ($query_string ~ &#34;\b(ultram|unicauca|valium|viagra|vicodin|xanax|ypxaieo)\b&#34;) { return 507; }
if ($query_string ~ &#34;\b(erections|hoodia|huronriveracres|impotence|levitra|libido)\b&#34;) { return 507; }
if ($query_string ~ &#34;\b(ambien|bluespill|cialis|cocaine|ejaculation|erectile)\b&#34;) { return 507; }
if ($query_string ~ &#34;\b(lipitor|phentermin|pro[sz]ac|sandyauer|tramadol|troyhamby)\b&#34;) { return 507; }

## 文件注入
if ($query_string ~ &#34;[a-zA-Z0-9_]=http://&#34;) { return 444; }
if ($query_string ~ &#34;[a-zA-Z0-9_]=(\.\.//?)&#43;&#34;) { return 444; }
if ($query_string ~ &#34;[a-zA-Z0-9_]=/([a-z0-9_.]//?)&#43;&#34;) { return 444; }

# if ($http_user_agent ~* &#34;spider&#34;) { return 508; } 
#if ($http_user_agent ~ &#34;Wget&#34;) {
#    return 508;
#}
# if ($http_user_agent ~* &#34;~17ce.com&#34;) { return 508; }

if ($http_user_agent ~* &#34;(YisouSpider|ApacheBench|Jmeter|JoeDog|Havij|masscan|mail2000|github|Java|python)&#34;) { return 508; }

if ($http_user_agent ~* &#34;WebBench*&#34;) { return 508; }
if ($http_user_agent ~* &#34;Nmap Scripting Engine&#34;) { return 508; }
if ($http_user_agent ~* &#34;Indy Library&#34;) { return 508; }
if ($http_user_agent ~ &#34;^$&#34;) { return 508; }
if ($http_user_agent ~ &#34;libwww-perl&#34;) { return 508; }
if ($http_user_agent ~ &#34;GetRight&#34;) { return 508; }
if ($http_user_agent ~ &#34;GetWeb!&#34;) { return 508; }
if ($http_user_agent ~ &#34;Go!Zilla&#34;) { return 508; }
if ($http_user_agent ~ &#34;Download Demon&#34;) { return 508; }
if ($http_user_agent ~ &#34;Go-Ahead-Got-It&#34;) { return 508; }
if ($http_user_agent ~ &#34;TurnitinBot&#34;) { return 508; }
if ($http_user_agent ~ &#34;GrabNet&#34;) { return 508; }

location ~* &#34;(&amp;pws=0|_vti_|\(null\)|\{\$itemURL\}|echo(.*)kae|boot\.ini|etc/passwd|eval\(|self/environ|(wp-)?config\.|cgi-|muieblack)&#34; { return 403; }
location ~* &#34;/(^$|mobiquo|phpinfo|shell|sqlpatch|thumb|thumb_editor|thumbopen|timthumb|webshell|config|configuration)\.php&#34; { return 403; }
location ~* &#34;(&#39;|\&#34;)(.*)(drop|insert|md5|select|union)&#34; { return 403; }
location ~* &#34;(https?|ftp|php):/&#34; { return 403; }
location ~* &#34;(=&#39;|=%27|/&#39;/?).&#34; { return 403; }
```
&lt;/details&gt;

## 3.1. 版本号隐藏  
1. 修改文件: 修改`nginx.conf`,在`http`标签中添加`server_tokens off;`参数,然后`reload`  
2. 编译修改:   
    - 修改`nginx`源码文件`/pathto/nginx-x.xx.x/src/core/nginx.h`,`nginx`版本号参数`NGINX_VERSION`，软件名称 `NGINX_VAR`，`NGINX_VER`   
    - 修改`nginx`源码文件`49: /pathto/nginx-x.xx.x/src/http/ngx_http_header_filter_module.c` ,值 `Server: xxxx`（curl 显示的页面）  
    - 修改`nginx`源码文件`36: /pathto/nginx-x.xx.x/src/http/ngx_http_special_response.c`,值 `&lt;hr&gt;&lt;center&gt;xxxx&lt;/center&gt;`(错误页面:例如502)   
    - 正常编译安装  

## 3.2. 更改nginx默认用户
1. 修改配置文件: `/pathto/nginx/conf/nginx.conf`,值 `user nobody` 为 `user &lt;user&gt; &lt;group&gt;`;  
2. 编译时指定默认用户: `--user=&lt;user&gt; --group=&lt;group&gt;`  

## 3.3. 优化wroker进程数  
```bash
# main
worker_processes  8;
worker_cpu_affinity 0001 0010 0100 1000 0001 0010 0100 1000;  # 掩码形式 分别代表1-8核
```

## 3.4. Nginx 事件模型优化
nginx是异步的网络io模型，epoll 工作模型是高性能高并发的设置。
1. 修改配置文件: `/pathto/nginx/conf/nginx.conf`  
```conf
# main
events {
    use epoll;
    # 开启的时候,将会对多个Nginx进程接受连接进行序列化,防止多个进程对连接的争抢,当服务器连接数不多时,开启这个参数会让负载有一定程度的降低. 但是当服务器的吞吐量很大时,为了效率,需要关闭. 并且关闭这个参数的时候也可以让请求在多个worker间的分配更均衡(默认关闭 off)
    # accept_mutex on; 
    multi_accept on;    # 告诉nginx收到一个新连接通知后接受尽可能多的连接，默认是on
    worker_connections 65535; # 单个worker的连接数(并发等于 worker_connections * worker_processes )
}
```

## 3.5. Nginx worker 进程最大打开文件数 
1. `main`标签下设置`worker_rlimit_nofile 65535` ，值可为系统优化后设置的`ulimit -HSn`的结果 。

## 3.6. Nginx 服务器域名hash表大小  
: main  
1. 参数1: `server_names_hash_max_size 512;` 设置存放域名(server_names)的最大hash表大小(如果nginx发出消息 应首选增大 max size)  
2. 参数2: `server_names_hash_bucket_size 64;` 此设置与`server_names_hash_max_size`共同控制保存服务器域名的hash表.  

## 3.7. 开启高效的文件传输模式  
; http/server/location/if in location 
1. `sendfile on;`, 作用于两个文件描述符之间的数据拷贝函数，这个拷贝操作是在内核中的。 
2. `tcp_nopush on;`,允许把http response header和文件的开始放在一个文件里面发布，积极的作用是减少网络报文段的数量。
3. `tcp_nodelay on;`, 提升io性能，默认情况下数据发送时，内核并不会马上发送，可能会等待更多的字节组成一个数据包，这样可以提高I/O性能，但是，每次只发送很少字节的业务场景，使用tcp_nodelay功能，等待时间会比较长.(高并发建议使用)  

## 3.8. 超时连接优化  
### 3.8.1. 作用 
1. 设置将无用的连接尽快超时,可以保护服务器的系统资源(cpu、内存、磁盘)  
2. 当连接很多时，及时断掉那些已经建立好但又长时间不做事的连接, 以减少其占用的服务器资源，应为服务器维护连接也是要消耗资源的。  
3. 有时黑客或恶意用户攻击网站，就会不断的和服务器建立多个连接，消耗连接数，但啥也不干，只是持续建立连接，这就会大量消耗服务器的资源，此时就应该及时断掉这些恶意占用资源的连接。  
4. LNMP环境中，如果用户请求了动态服务，则Nginx就会建立连接请求fastcgi服务以及mysql服务，此时这个Nginx连接就要设定一个超时时间，在用户容忍的是就按内反回数据，或者在多等一会后端服务器返回数据，具体的策略要具体业务分析。
### 3.8.2. 问题 
1. 超时时间若设置太短，并发很大的时候，就会导致服务器无法瞬间响应用户请求，导致体验下降 。

### 3.8.3. 建议 
1. php 网站建议短连接，php程序建立连接消耗的资源和时间少   
2. java网站建议长连接，java程序建立连接消耗的资源和时间多(连接重用，连接池..)   

### 3.8.4. 配置  
```bash
# http/server
keepalive_timeout 60; # 默认60秒 
# keepalive_time 可以使客户端到服务器端已经建立的连接一直工作而不退出，当服务器有持续请求的时候，keep-alive会使用正在建立的连接提供服务，从而避免服务器重新建立新的连接处理请求。 此参数生效需激活tcp_nodelay选项 

client_header_timeout 15; # 用于设置读取客户端请求头数据的超时时间，此处的数值15单位是秒，为经验参考值。如果超过此事件客户端还没有发送完整的header数据，服务端将返回 408错误 ，指定一个时间可以防止客户端利用http协议进行攻击 。

client_body_timeout 15; # 用于设置读取客户端请求主体的超时时间，这个超时仅仅为两次成功的读取操作之间的一个超时，非请求整个主体数据的超时时间，如果在这个超时时间内，客户端没有发送任何数据，则服务端返回 408 。 

send_timeout 25; # 设置服务器端传送http响应信息到客户端的超时时间(服务端发给客户端)，这个超时时间仅仅为两次成功握手后的一个超时，非请求整个响应数据的超时时间，如果这个超时时间内，客户端没有接受任何数据，连接将会被关闭。

# 上传文件大小 

client_max_body_size 8m;  # 上传文件大小，超过设置值反会413错误.
```
## 3.9. 动态参数引擎fastcgi
|Nginx Fastcgi参数(http) |说明|
|-|-|
|fastcgi_connect_timeout|表示Nginx服务器和后端FastCGI服务器连接的超时时间，默认60s,这个参数通常设置不要超过75s，因为建立的连接诶越多消耗的资源就越多。(Nginx请求php服务器多少时间内要拿到数据，否则断开连接502)|
|fastcgi_send_timeout|设置Nginx允许FastCGI服务端返回数据的超时时间，即在规定时间之内后端服务器必须传完所有数据，否则Nginx将断开这个连接,默认60s(PHP需要在多少时间内将数据全部发送完成给nginx，否则断开)|
|fastcgi_read_timeout|设置Nginx从FastCGI服务端读取响应信息的超时时间，表示连接成功建立后，Nginx等待后端服务器的响应时间，是Nginx已经进入后端的排队之中等候处理的时间。|
|fastcgi_buffer_size|这个是Nginx fastcgi的缓冲区大小参数，设定用来读取从fastcgi服务端收到的第一部分响应信息的缓冲区大小，这里的第一部分通常会包含一个小的响应头部，默认情况下大小是由fastcgi_buffers 指定的一个缓冲区的大小|
|fastcgi_buffers| 设定用来读取从Fastcgi服务端收到响应信息的缓冲区大小，已经缓冲区的数量。默认值：`fastcg_buffers 8 4|8k`; 指定本地需要用多少和多大的缓冲区来缓冲FastCGI的应答请求。如果一个PHP脚本所产生的页面大小为256kb,那么会为其分配4个64kb的缓冲区来缓存;如果页面大小大于256k，那么大于256k的部分会被缓存到fastcgi_temp指定的路径中，但这样不是最好的方法，应为内存中处理的速度肯定是要高于硬盘的，一般这个值设定应该为站点中php脚本所产生的页面大小的中间值。那么可以把这个值设置为`16 16k`、`4 64k`|
|fastcgi_busy_buffers_size|用于设置系统很繁忙的时候可以使用的fastcgi_buffers大小，官方推荐的大小为`fastcgi_buffers *2 `，默认值 `fastcgi_busy_buffers_size 8k|16k`|
|fastcgi_temp_file_write_size|fastcgi临时文件的大小，可设置128-256k|
|fastcgi_cache xxxx|表示开启fastcgi缓存并为其指定一个名称，开启缓存非常有用，可以有效的降低cpu负载，并且防止502错误的发生，但是开启缓存也有可能会引起其他问题，要根据具体情况来选择。|
|fastcgi_cache_path|例:`fastcgi_cache_path /data/ngx_fcgi_cache levels=2:2 keys_zone=ngx_fcgi_cache:521min active=1d max_size=40g` ,fastcgi_cache缓存目录，可以设置hash层级，比如2:2会生成256×256个子目录，keys_zone是这个缓存空间的名字，cache是用多少内存(这样热门的内容nginx直接存放内存，提高访问速度)，inactive表示默认失效的时间，max_size 表示最多用多少硬盘空间。需要注意的是fastcgi_cache缓存是先写在fastcgi_temp_path，在转移到fastcgi_cache_path，所以这两个目录最好是放在同一分区|
|fastcgi_cache_valid|例: `fastcgi_cache_valid 200 302 1h;`当状态码是200、302时候缓存一小时;`fastcgi_cache_valid 301 1d;` 当状态码是301时缓存一天;`fastcgi_cache_valid any 1m;` 当状态码是其他的时候缓存1分钟|
|fastcgi_cache_min_uses|设置请求几次响应被缓存  例: `fastcgi_cache_min_uses 1;` 表示1次请求即被缓存 |
|fastcgi_cache_use_stale|定义那些情况下使用过期缓存 例:`fastcgi_cache_use_stale error timeout invalid_header http_500;`|
|fastcgi_cache_key|例: `fastcgi_cache_key $request_method://$host$request_uri; fastcgi_cache_key http://$host$request_uri;` 定义fastcgi_cache的key，示例中就以请求的URI作为缓存的key，Nginx回去这个key的md5作为缓存文件，如果设置了缓存hash目录，nginx会从后向前取相应的位数作为目录。注意 一定要加上$request_method 作为cache key，否则如果HEAD类型的先请求会导致后面的GET请求返回为空。|

示例配置: 
```nginx
# fastcgi 缓冲区 和 超时时间 (http标签)
fastcgi_send_timeout 240;
fastcgi_read_timeout 240;
fastcgi_buffer_size 64k;
fastcgi_buffers 4 64k;
fastcgi_busy_buffers_size 128k;
fastcgi_temp_file_write_size 128k;
fastcgi_temp_path /opt/nginxssl/fastcgi_temp/tmp;
fastcgi_cache_path /opt/nginxssl/fastcgi_temp/cache levels=2:2 keys_zone=cache:128m inactive=1d max_size=6g; 

#fastcgi 缓存 (server标签)	 
fastcgi_cache cache;
fastcgi_cache_valid 200 1h;
fastcgi_cache_valid 301 1d;
fastcgi_cache_valid any 1m;
fastcgi_cache_min_uses 1;
fastcgi_cache_use_stale error timeout invalid_header http_500;
fastcgi_cache_key http://$host$request_uri; 

```

## 3.10. gzip 
### 3.10.1. 优点 
- 提升网站用户体验,提升网站用户访问速度 
- 节约网站宽带成本 
### 3.10.2. 需要和不需要压缩的对象  
- 纯文本内容压缩比很高，因此纯文本的内容最好要压缩(例如: html、js、css、xml、shtml等)  
- 被压缩的纯文本必须要大于1kb，否则由于压缩算法的原因，可能导致压缩反而是文件增大  
- 图片、视频(流媒体)等文件尽量不要压缩，因为这些文件大多都是经过压缩的，如果在压缩可能不会减少太多，或者可能增大，而在压缩还会消耗大量的cpu、内存资源  
### 3.10.3. 配置 
|参数|作用|
|-|-|
|`gzip on`|开启gzip压缩功能|
|`gzip_min_length 1k`|设置允许压缩页面的最小字节数，页面字节数从header头的Content-Length中获取，默认0，表示不管页面多大都进行压缩|
|`gzip_buffers 4 16k`|压缩区缓冲区大小，表示申请4个单位为16k的内存作为压缩结果流缓存，默认值是申请与原始数据大小相同的内存空间来存储gzip压缩结果|
|`gzip_http_version 1.1`|压缩版本，默认1.1，比如说前端访问的并不一定是用户，可能是cdn，这个时候就需要加一个版本，先大部分都支持gzip解压，设置默认即可|
|`gzip_comp_level 2;`|用来指定压缩比例，1 压缩最小，处理速度最快;9压缩比例最大，传输快，但处理速度慢，也比较消耗cpu资源|
|`gzip_types text/plan application/x-javascript`|指定需要压缩的文件类型|
|`gzip_vary on;`|vary header 支持，该选项可以让前端的缓存服务器缓存gzip压缩的页面，(让缓存服务器继续缓存，而不是解压，只有在浏览器的时候在解压)|


## 3.11. nginx expires 缓存 
### 3.11.1. 优点  
- expires 可以降低网站的宽带，节约成本  
- 加快用户访问网站的速度，提升用户体验  
- 减少服务器访问量，降低服务器压力，节约服务器成本  

### 3.11.2. 缺点 
- 当网站被缓存的页面存在更新时，用户看到的可能还是旧的数据  
    - 解决方案: 
        1. 缩短经常修改页面的缓存时间  
        2. 对于经常修改的页面文件名进行添加，或加上版本号，这样前端cdn以及用户端需要重新更新缓存内容  

### 3.11.3. 配置 
如果配置后导致前端无法正常访问，有可能是因为server标签中没有指定root目录有关  
示例: 
```nginx
# server / http 

location ~ .*\.(gif|jpg|jpeg|png|bmp|swf){
    expires 6d;
}

```

## 3.12. nginx 日志
### 3.12.1. 切割示例  
```bash
#!/bin/bash
# 40 23 * * * /bin/bash /opt/sh/cut_nginx_all.sh &gt;&gt; /dev/null 2&gt;&amp;1 
time=`date &#43;&#34;%Y-%m-%d&#34;`
log_path=&#34;/opt/nginxssl/logs&#34;
pid_path=&#34;/opt/nginxssl/logs/nginx.pid&#34;
new_dir=&#34;/opt/logs/nginxlogs&#34;
# nginx web 日志 (www.log) ，以空格隔开，无需后缀 
logs_names=(www www1)
cd $new_dir
num=${#logs_names[@]} 
for((i=0;i&lt;num ;i&#43;&#43;));do
  mv ${log_path}/${logs_names[i]}.log ${new_dir}/${logs_names[i]}_${time}.log
  tar czf ${logs_names[i]}_${time}.tar.gz ${logs_names[i]}_${time}.log
  rm ${logs_names[i]}_${time}.log
done

/opt/nginxssl/sbin/nginx -s reopen
```

### 3.12.2. 不记录不需要的日志 
1. 在实际工作中，对于负载均衡器的健康检查节点或某些特定文件(如图片、js、css等)的日志，一般不需要记录下来，因为在PV时是按照页面计算的。而且日志写入太频繁会大量消耗磁盘IO，降低服务器性能.   
   - 网络流量度量术语  
        1. 独立(公网)ip数: 指的是不同IP地址的计算机访问网站时被计算的总次数。独立IP书是衡量网站流量的一个重要指标。一般一天内相同IP地址的客户端访问网站页面只被计算为一次，记录独立IP的时间可以为一天或一个月，目前通常标准为一天;   
        2. PV 访问量: 即Page View 页面浏览，即页面浏览量或点击量，不管客户端是不是相同，也不管ip是不是相同，用户每次访问一个网站页面都会被计算一个PV。具体度量方法就是从客户浏览器发出一个对web服务器的请求，web服务器接到这个请求后，将该请求对应的一个网页发给浏览器，就产生了一个pv。但是只要这个请求发送给了浏览器，无论这个页面是否完全打开(或下载完成)，那么都会被(服务器日志)计数为一个PV，一般为了防止用户快速刷PV，都是把PV的统计程序放在页面的最下面。  
        3. UV 独立访客数: 同一个客户端(PC或移动端) 访问网站被计算为一个访客，一天内相同的客户端访问同一个网站只计算一次UV，UV一般是以客户端Cookie等计算作为统计依据，实际统计会有误差。一台客户端可能忽悠多人使用的情况，因此，UV实际上并不一定是独立的自然人访问。  
2. 配置方法:  
这里的location标签匹配不记录日志的元素扩展名，然后关掉了日志。  
```nginx
location ~ .*\.(js|jpg|JPG|jpeg|JPEG|css|bmp|gif|GIF)$ {
    access_log off;
}
```
### 3.12.3. 访问日志权限设置  
- 限制用户及组为root , 修改目录权限 600 ,nginx访问日志的权限即使是root，nginx也是可以读取的  

## 3.13. nginx 站点目录及文件URL控制  
### 3.13.1. 根据文件扩展名限制程序和文件访问  
- 示例: 
```nginx
location ~ ^/image/.*\.(php|php5|sh|pl|py)${
    deny all;
}

location ~ ^/static/.*\.(php|php5|sh|pl|py)${
    deny all;
}

location ~ ^/data/(attachment|avatar)/.*\.(php|php5)${
    deny all;
}

```
### 3.13.2. 限制网站来源IP访问 
```nginx
location ~ ^/admin/{
    allow xx.xx.xx.xx;
    allow xx.xx.xx.xx/xx;
#    deny xx.xx.xx.xx;
    deny all;
}
```
使用if来限制客户端ip  
```nginx

if ($remote_addr = 10.0.0.7 ) {
    return 403;
}
if ($remote_addr = xx.xx.xx.xx ) {
    set $allow_access_root &#39;true&#39;;
}
```
### 3.13.3. 配置nginx禁止非法域名解析  
1. 问题： 如何防止用户IP访问网站(恶意域名解析，也相当于ip访问网站)   
解决：让使用ip访问网站的用户，或者恶意解析域名的用户，收到501错误。(需要放到所有server之前)
```nginx
server {
    listen 80 default_server;
    server_name _;
    return 501;
}
```

## 3.14. 防盗链 
### 3.14.1. 解决方案 
1. 根据`http_referer`实现防盗链 
示例:
```nginx
# server 
location ~* ^.&#43;\.(jpg|png|swf|flv)$ {
   valid_referers none bloked *.example.com;
   if ($invalid_referer) {
       #rewrite ^/ https://www.example.com/daolian.png;
       return 403;
   }
}
```

2. 根据`cookie`防盗链  

## 3.15. 错误页面优雅显示 
示例:  
```nginx
# error_page 可以多行，每行对应一个状态码 
error_page  500 502 503 504 404  /50x_error.html;
# 若集群，建议选择域名跳转，统一分配
# error_page  500 502 503 504 404  http://www.example.com/erro_page;
```
`fastcgi_intercept_errors on;` 默认 `off` ,这个指令指定的是是否传递 `4xx`和 `5xx`信息到客户端，或允许`nginx` 使用`error_page`处理错误信息。  

## 3.16. 站点目录权限优化  
目录权限`755`,文件权限`644`，用户及组`root`，用户上传目录`nginx`服务用户.(减少文件上传目录权限)  

## 3.17. 防爬虫优化
### 3.17.1. robots.txt 机器人协议 
网站通过robots(网站根目录存放robots.txt)协议告诉搜索引擎哪些页面可以抓取，那些页面不能抓取。
示例: 
```ini
User-agent: *
Disallow: /
Sitemap: https://www.example.com/sitemap.xml
```

### 3.17.2. nginx 防爬虫优化配置 
示例:  
```nginx 
# server|location 
if ($http_user_agent ~* &#34;LWP::Simple|BBBike|wget&#34;) {
    return 403;
}
```

## 3.18. nginx 限制http请求方法  
示例:  
```nginx
# 屏蔽非GET|HEAD|POST的请求方法 
# server|location 
if ($request_method !~ ^(GET|HEAD|POST)$ ) {
    return 501;
}
```

## 3.19. 使用cdn做网站内容加速 
cdn全国或全球的分布式缓存集群  
## 3.20. 网站架构优化 
### 3.20.1. 为网站程序解耦 
指的是把一堆程序代码按照业务用途分开，然后提供服务。例如: 注册登陆、上传、下载、浏览列表、商品内容页面、订单支付等都应该是独立的程序服务。


## 3.21. nginx 监牢模式
### 3.21.1. nginx 服务降权解决方案 
解决方案:  
- 给`nginx` 服务降权，用普通用户(假设普通用户为`www` )跑`nginx` 服务，给开发和运维设置普通用户帐号，将开发和运维的帐号设置为与`www` 同组即可管理`nginx`，该方案解决了`nginx`管理问题，防止`root`分配权限过大。  
- 开发人员使用普通用户即可管理`nginx` 服务及站点下的程序和日志。  
- 采取项目负责制度，即谁负责的项目维护出了问题就是谁负责。  


## 3.22. 控制nginx并发连接数
示例:
```nginx
# 定义 
# http 
limit_conn_zone $binary_remote_addr zone=addr:10m;
#使用(seerver/location)
limit_conn addr 1;
```

## 3.23. 控制 nginx请求
```nginx
# 定义 
# http 
limit_req_zone $binary_remote_addr zone=one;10m rate=1r/s;
#使用(seerver/location)
limit_req zone=one burst=5;
```

# 4. php 优化
## 4.1. php 参数调优 
`php.ini-development`与`php.ini-production`的区别是日志的开启与隐藏  
### 4.1.1. php.ini 安全参数调优  
```ini
; 打开安全模式(防止system()函数可调用系统命令)，5.5以上已无该参数
safe_mode = On
; safe_mode 打开时，safe_mode_gid被关闭，那么php脚本能够对文件进行访问，而且同组的用户也能狗对文件进行访问。设置off进行关闭,5.5以上已无该参数
safe_mode_gid = Off
; 关闭危险函数(phpinfo,passthru,exec,shell_exec,system,popen,proc_open,proc_get_status,chroot,scandir,chgrp,chown,readdir,ls_dir,ini_set,ini_alter,ini_restore,dl,pfsockopen,fsocket,openlog,syslog,readlink,symlink,popepassthru,stream_socket_server,rmdir,chmod,closedir,opendir,dir,fileperms,copy,delfile),默认无限制
disable_functions = phpinfo
; 关闭php版本信息(默认On) 
expose_php = Off 
; 关闭注册全局变量,5.5以上已无该参数  
register_globals = Off
; 防止sql注入(打开后自动把用户体检对sql的查询进行转换,例如把&#39;转换为\),默认Off,5.5以上已无该参数
magic_quotes_gpc = On 
; 错误信息输出控制,默认On 
; 建议在关闭display_errors后能够把错误信息记录下来，便于查找服务器运行的原因: 
; log_errors = On 
; error_log = /var/log/php_error.log 
display_errors = Off
```
### 4.1.2. php.ini 优化参数调优 
```ini
; 每个脚本最大允许执行时间(s),0 表示没有限制 
max_execution_time = 30 
; 每个脚本使用的最大内存,要能够使用该指令编译时必须启用 --enable-memory-limit 选项 
memory_limit = 128M 
; 每个脚本等待输入数据的最长时间 ,-1 表示不限制 
max_input_time = 60 
; 上传文件的最大许可 
upload_max_filesize = 2M 
; 最大上传的文件数量(可同时上传多少个文件),默认20
max_file_uploads = 20 
; http post 数据的大小 (请求包的大小)，默认8M
post_max_size = 8M 
```
### 4.1.3. php.ini 安全优化
```ini
; 禁止打开远程地址,默认On
allow_url_fopen = Off 
; 防止nginx文件类型错误解析漏洞,默认1 
cgi.fix_pathinfo = 0
```
### 4.1.4. php session 会话保持 
集群环境，一般会将session存放于memcache中，多个集群节点连接同一个memcache，保证用户session处于在线状态  
php.ini 修改   
```ini
; 调整php session 信息存放类型,默认文件 files  
session.save_handler = memcache  
; session 保存位置,默认tmp 
session.save_path = &#34;tcp://10.0.0.18:11211&#34;
```
## 4.2. php-fpm 调优 
### 4.2.1. php-fpm.conf 调优
```ini
; 打开进程pid
pid = run/php-fpm.pid
; 打开php-fpm 进程错误日志 
error_log = log/php-fpm.log 
; 错误日志级别 ， 默认notice 
log_level = error 
; 最大的php-fpm进程数量(静态),默认128  
process.max = 128 
; 文件描述符，默认1024
rlimit_files = 10240
; 表示在emergency_restart_interval时间内，出现SIGEGV或者SIGBUS错误的php-cgi进程数如果超过了
; emergency_restart_threshold个，则php-cgi就会优雅重启
emergency_restart_interval = 60s
emergency_restart_threshold = 60

; 
; 池定义 
; 与nginx用户一样 
[www]
user = www
group = www
; 监听
listen = 127.0.0.1:9000 
; 控制允许访问的客户端
listen.allowed_clients = 127.0.0.1 
; 进程模式,默认动态,开启后需配合pm.max_children，pm.start_servers，pm.min_spare_servers，pm.max_spare_servers参数进行设置  
pm = dynamic
; 同一时间，最大可创建的子进程的数量(静态模式下由此参数固定进程数)
pm.max_children = 300
; 设置启动时创建的子进程数目
pm.start_servers = 20 
; pm.*_spare_servers 设置空闲服务进程的最低/最大数目
pm.min_spare_servers = 20 
pm.max_spare_servers = 300 
; 进程的超时时间，当进程不提供服务后，多少秒关闭,默认10s
pm.process_idle_timeout = 10s
; 一个子进程处理多少个请求后退出，默认 0  
pm.max_requests = 10240 
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E5%B8%B8%E7%94%A8web%E7%8E%AF%E5%A2%83%E4%BC%98%E5%8C%96/  

