# Nginx常用骚操作


### nginx if else 实现  

```ini
set $is_matched 0;

if ($http_user_agent ~* &#34;wget&#34;) {
  set $is_matched &#34;${is_matched}1&#34;;
}

if ($remote_addr ~ &#34;127.0.0.1|172.16.11.10&#34;) {
  set $is_matched &#34;${is_matched}01&#34;;
}

# 满足条件: 

# 当 
http_user_agent == wget or remote_addr = ip 
# is_matched 值为 01 001   

# 当条件为 
http_user_agent == wget and remote_addr = ip 
# is_matched 值为  0101 

if ($is_matched = &#34;01&#34;){
  return 403;
}

```

### nginx 获取cdn ip 及 ip(段)访问限制

```ini
# http 
map $http_x_forwarded_for $client_real_ip {
	&#34;&#34; $remote_addr;
	# fix: 兼容ipv6
	~^(?P&lt;firstAddr&gt;[0-9a-fA-F:.]&#43;),?.*$ $firstAddr;
}

set $is_allow 0;
# location,server
if ( $client_real_ip ~* &#39;^(223)\.(193)\.(97)\.(.*)$&#39; ) {
	set $is_allow 1;
}

if ($client_real_ip ~ &#39;172.31.11.111|127.0.0.1&#39;){
	set $is_allow 1; 
}

if ( $client_real_ip ~* &#34;172\.31\.(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)&#34; ) {
	set $is_allow 1; 
}

# and 实现
if ( $is_allow = &#34;1&#34; ){
	return 200;
}

return 502;
```


### nginx 代理, 非根目录 到根目录 
```ini
location /frps/ {
  proxy_pass http://$host:$server_port/;
  proxy_set_header        Host $host:$server_port;
  proxy_set_header        X-Real-IP $remote_addr;
  proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_redirect / /frps/;
  #rewrite ^/frps/(.*)$ /$1 break;
}
```

### Nginx发布Alias虚拟目录及PHP支持配置方法  
```ini
	location /owa {
		alias /pathto/owa;
		index index.php index.html index.htm;
	}

	location ~ /owa/.&#43;.php.*$ {
		if ($fastcgi_script_name ~ /owa/(.&#43;.php.*)$) {
			set $valid_fastcgi_script_name $1;
		}
		fastcgi_pass   127.0.0.1:9000;
		fastcgi_index  index.php;
		fastcgi_connect_timeout 150;
		fastcgi_read_timeout 150;
		fastcgi_send_timeout 150;
		fastcgi_buffer_size 256k;
		fastcgi_buffers 16 256k;
		fastcgi_busy_buffers_size 512k;
		fastcgi_temp_file_write_size 512k;
		fastcgi_param  SCRIPT_FILENAME  /pathto/owa/$valid_fastcgi_script_name;
		#fastcgi_param  SCRIPT_FILENAME  /pathto/$fastcgi_script_name;
		include        fastcgi_params;
	}
```

### Nginx 任意域名匹配及root路径定位
```ini
# 这段配置的作用是 匹配任意域名，子域名(subdomain)、主域名(maindomain)、顶级域名(tld) , 子域名可有可无 
# 然后根据匹配值 将root路径设置为 匹配到的值($host)
	## server
	server_name ~^(?:(?&lt;subdomain&gt;.&#43;)\.)?(?&lt;maindomain&gt;[^\.]&#43;)\.(?&lt;tld&gt;.&#43;)$;

    set $root_path /data/wwwroot/$host;

    if (!-d $root_path){
        set $root_path /data/wwwroot/www.$host;
    }

    root $root_path;

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/nginx%E5%B8%B8%E7%94%A8%E9%AA%9A%E6%93%8D%E4%BD%9C/  

