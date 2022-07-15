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
`Waiting`                   :  已经处理完等待下一次请求制定的驻留数(在开启keep-alive时，该值等于active-(reading+writing))  

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
&emsp;根据用户请求的`URI`来执行不同的应用。  
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
| 用户请求的URI| 完整的URL地址| 匹配的配置|  
|-|-|-|  
| /| `http://www.example.com/`| configuration A|  
| /index.html  | `http://www.example.com/`| configuration B|  
| /documents/index.html| `http://www.example.com/documents/index.html`| configuration C|  
| /images/1.jpg| `http://www.example.com/images/1.jpg`| configuration D|  
| /ducoments/1.jpg | `http://www.example.com/documents/1.jpg`| configuration E|  


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
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com
402
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com/
402
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com/index.html
401
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com/documents/index.html
403
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com/images/1.jpg
404
[root@00 ~]# curl -s -o /dev/null -I -w "%{http_code}\n" http://www.example.com/documents/1.jpg
```

匹配优先级:

|不用URI及特殊字符组合匹配顺序 | 匹配说明|
|-|-|
|`location = / { `| 精确匹配/|
|`location ^~ /images/ { `| 匹配常规字符串，不做正则匹配检查|
|`location ~ \.(gif|JPG|jpeg)$ { `| 区分大小写的正则匹配|
|`location ~* \.(gif|jpg|jpeg)$ { `| 不区分大小写的正则匹配|
|`location /document/ { `| 匹配常规字符串，如果有正则则优先匹配正则|
|`location / { `| 所有location都不匹配后的默认匹配规则|

注: 优先级为： `=` > `完整路径` > `^~` > `~|~*` > `部分起始路径` > `/`

## 2.5. nginx Rewrite  
用于实现伪静态，URL改写，必须安装PCRE的软件的支持，nginx编译默认安装Rewrite模块
### 2.5.1. rewrite 语法
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
|flag标记符号|说明|  
|-|-|  
|last|本条规则匹配完成后，继续向下匹配新的location URI规则|  
|break|本条规则被匹配到后，就不在匹配后面的任何规则|  
|redirect|临时重定向 302，浏览器地址会显示跳转后的URL地址|  
|permanent|永久重定向 301,浏览器地址会显示跳转后的URL地址|  

### 2.5.2. rewrite 应用场景
 1. 可以调整用户浏览的URL，看起来更规范。(别名)  
 2. 让动态的url地址伪装成静态地址提供服务(伪静态)，可以让搜索引擎收录网站内容让用户体验更好  
 3. 网站更换域名后，让旧的域名访问跳转到新的域名上。  
 4. 根据特殊变量、目录、客户端的信息进行URL跳转。  

