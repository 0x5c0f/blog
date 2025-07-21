# 那些杂七杂八的记录(三)


<!--more-->


## Nginx 安装 ModSecurity WAF 以增强网站安全
<details>
<summary> Nginx 安装 ModSecurity WAF 以增强网站安全 </summary>

### ModSecurity WAF 连接器扩展依赖
```bash
$> yum install -y libmodsecurity-devel
```

### 下载 ModSecurity WAF 连接器
```bash
$> git clone https://github.com/owasp-modsecurity/ModSecurity-nginx.git
```
### 编译安装
```bash
$> cd /data/softsrc/openresty-1.21.4.1
$> ./configure --prefix=/opt/nginxss --add-module=/pathto/ModSecurity-nginx && make && make install
```
### 创建配置文件目录
```bash
$> mkdir /opt/nginxssl/conf/modsec
```

### 核心规则配置
```bash
$> cd /opt/nginxssl/conf/modsec && git clone https://github.com/coreruleset/coreruleset.git
$> cd /opt/nginxssl/conf/modsec/coreruleset && cp -v crs-setup.conf.example crs-setup.conf
```

### 下载 ModSecurity 配置相关文件 
```bash
$> wget -O /opt/nginxssl/conf/modsec/modsecurity.conf https://raw.githubusercontent.com/SpiderLabs/ModSecurity/v3/master/modsecurity.conf-recommended
$> wget -O /opt/nginxssl/conf/modsec/unicode.mapping https://raw.githubusercontent.com/SpiderLabs/ModSecurity/v3/master/unicode.mapping
```

### 创建入口文件
```bash
$> vim /opt/nginxssl/conf/modsec/main.conf
Include /opt/nginxssl/conf/conf/modsec/modsecurity.conf
Include /opt/nginxssl/conf/modsec/coreruleset/crs-setup.conf
Include /opt/nginxssl/conf/modsec/coreruleset/rules/*.conf
```

### 修改配置文件 modsecurity.conf
```bash
$> vim /opt/nginxssl/conf/modsec/modsecurity.conf
## DetectionOnly 只记录，不拦截 
## On 拦截并记录
## Off 完全关闭
# SecRuleEngine DetectionOnly
SecRuleEngine On

# 以下为关键配置， 核心关注SecAuditLog 、 SecAuditLogFormat 配置
SecAuditEngine RelevantOnly
SecAuditLog /var/log/modsec_audit.log 
SecAuditLogParts ABIJDEFHZ
SecAuditLogType Serial
SecAuditLogFormat JSON      # 设置为 JSON 格式，方便查看
```

### 修改 nginx 配置文件启用 ModSecurity WAF
```bash
$> vim /opt/nginxssl/conf/nginx.conf
# http or server or location
modsecurity on;
modsecurity_rules_file /opt/nginxssl/conf/modsec/main.conf;
```

### 拦截测试
```bash
$> curl "http://127.0.0.1/?param=<script>alert(1)</script>"
# sql 注入
$> curl "http://127.0.0.1/?param=1' AND 1=1 UNION SELECT 1,2,3,4,5,6,7,8,9,10 FROM users WHERE '1'='1"
```


### 白名单添加方案 
```bash
$> vim /opt/nginxssl/conf/modsec/modsecurity.conf
# SecRuleEngine 之后配置， 其中id 字段唯一
# 跳过 192.168.1.100 的全部 ModSecurity 检查
SecRule REMOTE_ADDR "@ipMatch 192.168.1.100" "id:10000,phase:1,pass,nolog,ctl:ruleEngine=Off"

```
### 其他白名单方案(未测试)
```ini
# 限制某路径仅特定 IP 可访问
SecRule REQUEST_URI "^/admin" "phase:1,deny,id:20001,msg:'Forbidden access to /admin',chain"
    SecRule REMOTE_ADDR "!@ipMatch 192.168.1.100"

# 禁止某路径使用 GET 请求
SecRule REQUEST_URI "^/secure-action" "phase:1,deny,id:20002,msg:'GET not allowed here',chain"
    SecRule REQUEST_METHOD "@streq GET"

# 仅允许特定 Referer 或 User-Agent 访问某路径
SecRule REQUEST_URI "^/api/private" "phase:1,deny,id:20003,msg:'Blocked non-authorized client',chain"
    SecRule REQUEST_HEADERS:User-Agent "!@streq MyTrustedClient/1.0"

# 还可以在不同的location下单独设置启用不同规则，用以实现多元化
```
</details>

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E9%82%A3%E4%BA%9B%E6%9D%82%E4%B8%83%E6%9D%82%E5%85%AB%E7%9A%84%E8%AE%B0%E5%BD%95.3/  

