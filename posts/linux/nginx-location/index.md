# Nginx Location 模块介绍



# 1. 前言  
个人整理,可参考
# 2. 优化  
## 2.1. 参数说明  

`worker_processes`      : 进程数  
`worker_connections`    : 最大连接数  
(最大并发连接=进程数x最大连接数)  
`autoindex`             : 当主页不存在的时候，显示目录结构  


## 2.2. nginx 状态说明  
配置方法:  
```
server {
    listen port;
    server_name status.example.com;
    location / {
        stub_status on;
        access_log off;
        allow 10.0.0.0/24;
        deny all;
    }        
}
```  
`Active connections`        :  单位时间内服务器正在处理的连接数   
`server`                    :  此启动到现在一共处理的连接     
`accepts`                   :  从启动到现在成功创建多少次握手(和server相同表示没有失败)  
`handled requests`          :  已经处理完毕的请求数  
`Reading:`                  :  nginx 读取到客户端的header信息数  
`Writing`                   :  返回给客户端的header信息数  
`Waiting`                   :  已经处理完等待下一次请求制定的驻留数(在开启keep-alive时，该值等于active-(reading&#43;writing))  

## 2.3. nginx 日志  
日志语法(配置于http标签内):  
log_format  name    string ...;   

日志参数说明:  
`$remote_addr`              :  访问网站的客户端地址  
`$remote_user `             :  访问网站的客户端名称  
`$time_local`               :  访问网站的时间和时区  
`$request`                  :  用户的http请求起始行信息(GET/HTTP/1.1)  
`$status `                  :  返回的http状态码  
`$body_bytes_sent`          :  服务器发送给客户端的想要body字节  
`$http_referer`             :  记录是从那个链接请求访问过来的，可以根据referer进行设置防盗链  
`$http_user_agent`          :  记录访问网站的访问信息，比如浏览器、手机客户端等  
`$http_x_forwarded_for`     ： 有代理服务器的时候， 设置web节点记录客户端的地址，此参数生效需在代理服务器设置x_forwarded_for  

## 2.4. nginx location  
### 2.4.1. location 作用  
&amp;emsp;根据用户请求的`URI`来执行不同的应用。  
- `uri` 只可意会，不可言传的东西  

### 2.4.2. location 语法:  
``` 
location [=|~|~*|^~] uri {
    ...
}
```
说明:  
`location`      : 指令   
`[=|~|~*|^~]`   ：匹配标识  
- `=`           : 精确匹配  
- `~`   : 用于区分大小写的匹配 
- `~*`  : 用于不区分大小写的匹配  
- `^~`  : 常规匹配，不做正则验证
- `!`   : 取反,如:`!~*`...  

`uri`           :  匹配的网址  
`{...}`         :  匹配uri后要执行的配置段  

示例:   
 ```
 location = / {
    [ configuration A]  
 }

 location / {
    [ configuration B]  
 }

 location /documents/ {
    [ configuration C]  
 }

 location ^~ /images/ {
    [ configuration D]  
 }

 location ~* \.(gif|jpg|jpeg)$ {
    [ configuration E]  
 }

```  

不同URI对应的配置:   
| 用户请求的URI            | 完整的URL地址                                 | 匹配的配置      |
| ------------------------ | --------------------------------------------- | --------------- |
| `/                     ` | `http://www.example.com/`                     | configuration A |
| `/index.html           ` | `http://www.example.com/`                     | configuration B |
| `/documents/index.html ` | `http://www.example.com/documents/index.html` | configuration C |
| `/images/1.jpg         ` | `http://www.example.com/images/1.jpg`         | configuration D |
| `/ducoments/1.jpg      ` | `http://www.example.com/documents/1.jpg`      | configuration E |


### 2.4.3 location 语法测试:  

```
location / {
    return 401;
}

location =/ {
    return 402;
}

location /documents/ {
    return 403;
}

location ^~ /images/ {
    return 404;
}

location ~* \.(gif|jpg|jpeg)$ {
    return 500;
}
```

请求结果:  
```bash
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com
402
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com/
402
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com/index.html
401
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com/documents/index.html
403
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com/images/1.jpg
404
[root@00 ~]# curl -s -o /dev/null -I -w &#34;%{http_code}\n&#34; http://www.example.com/documents/1.jpg
```

匹配优先级:

| 不用URI及特殊字符组合匹配顺序      | 匹配说明                                 |
| ---------------------------------- | ---------------------------------------- |
| `location = / { `                  | 精确匹配/                                |
| `location ^~ /images/ { `          | 匹配常规字符串，不做正则匹配检查         |
| `location ~ \.(gif\|JPG\|jpeg)$ {`  | 区分大小写的正则匹配                     |
| `location ~* \.(gif\|jpg\|jpeg)$ {` | 不区分大小写的正则匹配                   |
| `location /document/ { `           | 匹配常规字符串，如果有正则则优先匹配正则 |
| `location / {`                    | 所有location都不匹配后的默认匹配规则     |

注: 优先级为： `=` &gt; `完整路径` &gt; `^~` &gt; `~|~*` &gt; `部分起始路径` &gt; `/`

## 2.5. nginx Rewrite  
用于实现伪静态，URL改写，必须安装PCRE的软件的支持，nginx编译默认安装Rewrite模块
### 2.5.1. Rewrite 全局变量

| -                   | -                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `$remote_addr`        | 获取客户端ip                                                                                                              |
| `$binary_remote_addr` | 客户端ip（二进制)                                                                                                         |
| `$remote_port`        | 客户端port，如：50472                                                                                                     |
| `$remote_user`        | 已经经过Auth Basic Module验证的用户名                                                                                     |
| `$host`               | 请求主机头字段，否则为服务器名称，如:blog.sakmon.com                                                                      |
| `$request`            | 用户请求信息，如：GET ?a=1&amp;b=2 HTTP/1.1                                                                                   |
| `$request_filename`   | 当前请求的文件的路径名，由root或alias和URI request组合而成，如：/2013/81.html                                             |
| `$status`             | 请求的响应状态码,如:200                                                                                                   |
| `$body_bytes_sent`    | 响应时送出的body字节数数量。即使连接中断，这个数据也是精确的,如：40                                                       |
| `$content_length`     | 等于请求行的“Content_Length”的值                                                                                          |
| `$content_type`       | 等于请求行的“Content_Type”的值                                                                                            |
| `$http_referer`       | 引用地址                                                                                                                  |
| `$http_user_agent`    | 客户端agent信息,如：Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36 |
| `$args`               | 与$query_string相同 等于当中URL的参数(GET)，如a=1&amp;b=2                                                                     |
| `$document_uri`       | 与$uri相同 这个变量指当前的请求URI，不包括任何参数(见$args) 如:/2013/81.html                                              |
| `$document_root`      | 针对当前请求的根路径设置值                                                                                                |
| `$hostname`           | 如：centos53.localdomain                                                                                                  |
| `$http_cookie`        | 客户端cookie信息                                                                                                          |
| `$cookie_COOKIE`      | cookie COOKIE变量的值                                                                                                     |
| `$is_args`            | 如果有$args参数，这个变量等于”?”，否则等于”&#34;，空值，如?                                                                   |
| `$limit_rate`         | 这个变量可以限制连接速率，0表示不限速                                                                                     |
| `$query_string`       | 与$args相同 等于当中URL的参数(GET)，如a=1&amp;b=2                                                                             |
| `$request_body`       | 记录POST过来的数据信息                                                                                                    |
| `$request_body_file`  | 客户端请求主体信息的临时文件名                                                                                            |
| `$request_method`     | 客户端请求的动作，通常为GET或POST,如：GET                                                                                 |
| `$request_uri`        | 包含请求参数的原始URI，不包含主机名，如：/2013/81.html?a=1&amp;b=2                                                            |
| `$scheme`             | HTTP方法（如http，https）,如：http                                                                                        |
| `$uri`                | 这个变量指当前的请求URI，不包括任何参数(见$args) 如:/2013/81.html                                                         |
| `$request_completion` | 如果请求结束，设置为OK. 当请求未结束或如果该请求不是请求链串的最后一个时，为空(Empty)，如：OK                             |
| `$server_protocol`    | 请求使用的协议，通常是HTTP/1.0或HTTP/1.1，如：HTTP/1.1                                                                    |
| `$server_addr`        | 服务器IP地址，在完成一次系统调用后可以确定这个值                                                                          |
| `$server_name`        | 服务器名称，如：blog.sakmon.com                                                                                           |
| `$server_port`        | 请求到达服务器的端口号,如：80                                                                                             |


### 2.5.2. rewrite 语法
```
rewrite regex replacement [flag];
```
应用位置: server、location、if

示例:
```
rewrite ^/(.*) http://www.example.org/$1 permanent;
```
`rewrite`   : 固定关键字  
`^/(.*)`    : 正则表达式(开发正则，程序使用的，如java、php)，用于后面`$1`的匹配  
`$1`        : 小括号内的内容  
`permanent` ： 301 永久重定向标记    

flag 标记说明 :
| flag标记符号 | 说明                                                 |
| ------------ | ---------------------------------------------------- |
| last         | 本条规则匹配完成后，继续向下匹配新的location URI规则 |
| break        | 本条规则被匹配到后，就不在匹配后面的任何规则         |
| redirect     | 临时重定向 302，浏览器地址会显示跳转后的URL地址      |
| permanent    | 永久重定向 301,浏览器地址会显示跳转后的URL地址       |

### 2.5.3. rewrite 应用场景
 1. 可以调整用户浏览的URL，看起来更规范。(别名)  
 2. 让动态的url地址伪装成静态地址提供服务(伪静态)，可以让搜索引擎收录网站内容让用户体验更好  
 3. 网站更换域名后，让旧的域名访问跳转到新的域名上。  
 4. 根据特殊变量、目录、客户端的信息进行URL跳转。  


### 2.5.4. proxy_pass中 `带\` 和 `不带\` 的问题

直接看例子吧, 以下以请求 `http://10.0.3.10/api/values` 为例
```bash
# 1. 最终代理地址 http://10.0.3.10:81/values
location /api/ {
     proxy_pass http://10.0.3.10:81/;
}

# 2. 最终代理地址 http://10.0.3.10:81/api/values
location /api/ {
     proxy_pass http://10.0.3.10:81;
}

# 3. 最终代理地址 http://10.0.3.10:81/proxy/values
location /api/ {
     proxy_pass http://10.0.3.10:81/proxy/;
}

# 4. 最终代理地址 http://10.0.3.10:81/proxyvalues
location /api/ {
     proxy_pass http://10.0.3.10:81/proxy;
}

```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/nginx-location/  

