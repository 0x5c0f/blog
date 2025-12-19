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

## Rsync 同步的软链接出现，同步结果指向目标会多一个 /rsyncd-munged/ 
```ini
# /rsyncd-munged/ 是为了防止客户端通过上传的链接跳出模块目录（安全保护）
# rsyncd.conf 添加配置，重启服务
use chroot = yes        # 建议开启此项，如果同时关闭 munge ，可能造成额外的安全隐患 
munge symlinks = no
```

## emqx 迁移 
`emqx`迁移只需要备份 `etc` 和 `data` 目录，保持迁移前后版本一致, 然后在新节点加载这两个目录即可。
```ini
# 当前迁移示例为win到linux
# windows 备份
# 先停掉服务 ， 然后直接打包 etc 和 data 目录 
$> emqx stop

# linux 恢复
## 创建目录 
$> mkdir -p data/{etc,data,log}

# 解压备份文件  data 到 data ， etc 到 etc

# 调整权限
$> chown -R 1000:1000  data

# 容器方式运行， 创建compose文件 (注意: 物理环境部署迁移到容器环境，可能导致 node 信息不一致，导致迁移失败，如果是此情况，建议重新部署)
$> vim docker-compose.yml
services:
  emqx:
    image: emqx/emqx:5.3.2
    container_name: emqx
    restart: always
    environment:
      - EMQX_NODE_NAME=emqx@localhost
    ports:
      - "1883:1883"     # MQTT
      - "8883:8883"     # MQTT over TLS
      - "8083:8083"     # MQTT over WebSocket
      - "8084:8084"     # MQTT over WSS
      - "18083:18083"   # Dashboard
    volumes:
      - ./data/etc:/opt/emqx/etc
      - ./data/data:/opt/emqx/data
      - ./data/log:/opt/emqx/log

# 启动服务
$> docker-compose up -d
```

## Fedora 系统界面默认字体是 Adwaita sans，Ubuntu 默认是 Ubuntu sans， 看起来还是有些差异的， 感觉还是 Adwaita sans 好看一些 

## logrotate 日志轮转示例
```bash
$> vim /etc/logrotate.d/app-logs 
/var/log/myapp/*.log {
    daily                   # 每天轮转
    rotate 30               # 保留 30 个归档
    missingok               # 文件不存在不报错
    notifempty              # 空文件不轮转
    compress                # 压缩归档（gzip）
    delaycompress           # 延迟压缩（下次轮转时压缩）
    dateext                 # 使用日期后缀（如 .20251024）
    dateformat -%Y%m%d      # 日期格式
    create 0640 appuser appgroup  # 创建新文件权限
    sharedscripts           # 所有日志轮转完后只执行一次脚本
    postrotate              # 轮转后执行
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

# 测试配置（不实际执行）
$> logrotate -d /etc/logrotate.d/app-logs

# 强制轮转（调试用）
$> logrotate -f /etc/logrotate.d/app-logs

# 查看 logrotate 状态
$> cat /var/lib/logrotate/status
```

## jumpserver 常用配置参数记录
```ini
# 配置文件路径(默认): /opt/jumpserver/config/config.txt
# 参考连接
## https://docs.jumpserver.org/zh/v2/admin-guide/env/ 
## https://docs.jumpserver.org/zh/v3/installation/setup_linux_standalone/offline_install/
## https://github.com/jumpserver/jumpserver/issues/8697

# 是否开启本地转发 (目前仅对 vscode remote ssh 有效果) 
ENABLE_LOCAL_PORT_FORWARD=True
# 是否开启 针对 vscode 的 remote-ssh 远程开发支持 ( 前置条件: 必须开启 ENABLE_LOCAL_PORT_FORWARD ) v2.11 新增。( 注意: vscode 的连接操作，无审计功能 )
ENABLE_VSCODE_SUPPORT=True

# 磁盘监控
DISK_CHECK_ENABLED=False

# client token 连接过期时间 (koko magnus 等组件) v2.23 添加，默认 300 秒
# 另一个似乎是关于复用连接的，但我已经找不到官方配置说明地址了 
CONNECTION_TOKEN_EXPIRATION=540
CONNECTION_TOKEN_REUSABLE=true

# 使用内置SLB，如果网页获取的客户端IP地址不正确，请将USE_LB设置为0
# 当 USE_LB 设置为 1 时，使用配置 proxy_set_header X-Forwarded-For $remote_addr
# 当 USE_LB 设置为 0 时，使用配置 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for
USE_LB=1

# sftp 是否显示隐藏文件 
SFTP_SHOW_HIDDEN_FILE=true
```

## jumpserver 文件管理设计
1. 堡垒机设置 
    - 创建一个新的平台`LINUX_SFTP_DEFAULT`, 支持协议 `sftp`, 端口默认，点开支持协议设置, `SFTP` 根路径 设置为 `/var/ftproot/${USER}`, 关闭`自动化`, 然后保存
    - 创建一个资产， 平台选择 `LINUX_SFTP_DEFAULT`, 其他信息按照实际信息填写，然后保存即可 
2. 服务器设置 
    - 在服务器上创建`web`用户(以`www`为例), `useradd -m -k $(mktemp -d) -d /var/ftproot -s /sbin/nologin www`
    - 修改`/etc/ssh/sshd_config`文件,添加并重启`ssh` 
      ```ini
      Match User www
          ForceCommand internal-sftp -l INFO -f AUTH
          PasswordAuthentication no
          PermitTunnel no
          AllowAgentForwarding no
          AllowTcpForwarding no
      ```
    - 创建 `jumpserver` 文件管理用户目录, `mkdir /var/ftproot/{{ USER }}`, 这个目录对应的是`jumpserver`登陆后的目录，可以不创建，`jumpserver`在进行文件管理登陆的时候会自动创建他,`{{ USER }}` 是`jumpserver`登陆用户名
    - 使用 `mount --bind` 绑定实际目录到 `/var/ftp/{{ USER }}/` 下， 例如 `mount --bind /data/wwwroot /var/ftproot/{{ USER }}/wwwroot` , 或修改 `/etc/fstab: /data/wwwroot /var/ftproot/{{ USER }}/wwwroot none defaults,rw,bind 0 0`

## 一些可能会用到的内核参数 
```ini
# 开启非root启动1024以下端口
net.ipv4.ip_unprivileged_port_start = 0

# # 禁用整个系统所有接口的IPv6
# net.ipv6.conf.all.disable_ipv6 = 1
# # 禁用某一个指定接口的IPv6(例如：eth0, lo)
# net.ipv6.conf.lo.disable_ipv6 = 1
# net.ipv6.conf.enp0s31f6.disable_ipv6 = 1
# net.ipv6.conf.eth0.disable_ipv6 = 1
# 内存使用率(100-vm.swappiness)时,开始使用交换分区 
vm.swappiness = 0
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E9%82%A3%E4%BA%9B%E6%9D%82%E4%B8%83%E6%9D%82%E5%85%AB%E7%9A%84%E8%AE%B0%E5%BD%95.3/  

