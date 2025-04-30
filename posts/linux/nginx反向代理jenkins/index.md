# Nginx反向代理jenkins


参考文献 :  
>  [https://wiki.jenkins.io/display/JENKINS/Jenkins+behind+an+NGinX+reverse+proxy](https://wiki.jenkins.io/display/JENKINS/Jenkins+behind+an+NGinX+reverse+proxy)  


以下为个人解决方案 :  
`jenkins` 配置:  
- 添加启动参数 `--prefix=/jenkins`，`docker`启动添加环境变量`JENKINS_OPTS="--prefix=/jenkins"`    
- 前端修改(`Jenkins` > `Manage Jenkins` > `Jenkins Location` > `Jenkins URL`) 或者修改配置文件`/var/jenkins_home/jenkins.model.JenkinsLocationConfiguration.xml`中的`jenkinsUrl`，修改为`http(s)://www.example.com/jenkins/`,配置文件修改后需重启。  

`nginx`配置:  
```bash
    location /jenkins {
 
        proxy_pass http://10.0.0.100:8080/;
         
        proxy_redirect http:// https://;
 
        sendfile off;
 
        proxy_set_header   Host             $host:$server_port;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_max_temp_file_size 0;
 
        # This is the maximum upload size
        client_max_body_size       10m;
        client_body_buffer_size    128k;
 
        proxy_connect_timeout      90;
        proxy_send_timeout         90;
        proxy_read_timeout         90;
 
        proxy_temp_file_write_size 64k;
  
        proxy_http_version 1.1;
        proxy_request_buffering off;
        proxy_buffering off;
  }

```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/nginx%E5%8F%8D%E5%90%91%E4%BB%A3%E7%90%86jenkins/  

