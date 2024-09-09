# 持续集成和自动化部署


{{< admonition type=info title="自动化部署流程设计" open=true >}}
1. 获取代码  
2. 编译(可选)  
3. 配置文件更新  
4. 打包(加快传输)  
5. SCP到服务器  
6. 将目标服务器移出集群  
7. 解压  
8. 更新wwwroot  
9. scp 差异文件  
10. 重启 
{{< /admonition >}}


# 1. gitlab 
## 1.1. 从源代码安装  
> https://docs.gitlab.com/ee/install/installation.html#clone-the-source    


```bash
yum install curl policycoreutils openssh-server openssh-clients postfix
systemctl start postfix 
curl -sS https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.rpm.sh | sudo bash
yum install -y gitlab-ce-10.8.7

# 国内源安装方式
vim /etc/yum.repos.d/gitlab-ce.repo
[gitlab-ce]
name=gitlab-ce
baseurl=http://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7
repo_gpgcheck=0
gpgcheck=0
enabled=1
gpgkey=https://packages.gitlab.com/gpg.key

yum install gitlab-ce

# 配置启动 
gitlab-ctl reconfigure

```
## 1.2. docker 安装 
> https://docs.gitlab.com/omnibus/docker/#run-gitlab-ce-on-public-ip-address  

```bash
sudo docker run --detach   \
	--hostname gitlab.cxd115.me   \
	--publish 9443:443   \
	--publish 9080:80   \
	--publish 9022:22   
	--name gitlab   \
	--restart always   \
	--volume /data/docker/gitlab/config:/etc/gitlab   \
	--volume /data/docker/gitlab/logs:/var/log/gitlab   \
	--volume /data/docker/gitlab/data:/var/opt/gitlab   \
	172.16.110.131:1080/tools/gitlab-ce
```
## 访问
`http://ip`

## Deploy Keys
项目--> setting(设置)-->Repository(存储库)-->Deploy Keys


# 2. jenkins 
## 3. 安装 
```bash
sudo wget -O /etc/yum.repos.d/jenkins.repo http://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import http://pkg.jenkins.io/redhat-stable/jenkins.io.key
yum install jenkins -y 

systemctl start jenkins
```

### 访问
`http://ip:8080`


# 代码质量管理工具sonar  
```bash
wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-6.7.6.zip
unzip sonarqube-6.7.6.zip 
# mysql数据库配置(可配置其他数据库)
mysql> CREATE DATABASE sonar CHARACTER SET utf8 COLLATE utf8_general_ci;
mysql> GRANT ALL ON sonar.* TO 'sonar'@'localhost' IDENTIFIED BY 'sonar@123456';
mysql> GRANT ALL ON sonar.* TO 'sonar'@'%' IDENTIFIED BY 'sonar@123456';
mysql> FLUSH PRIVILEGES;

# 配置sonar
cd /opt/sonarqube/conf/ 
vim sonar.properties
 sonar.jdbc.username=sonar
 sonar.jdbc.password=sonae@123456
 sonar.jdbc.url=jdbc:mysql://localhost:3306/sonar?useUnicode=true&characterEncoding=utf8&rewriteBatchedStatements=true&useConfigs=maxPerformance&useSSL=false
 sonar.web.host=0.0.0.0
 sonar.web.port=9000

# 启动(若以root无法正常启动，则导致问题可能为es不能以root启动原因，创建一个普通用户，用普通用户即可) 
/opt/sonarqube/bin/linux-x86-64/sonar.sh start
# 插件目录
cd /opt/sonarqube/lib/bundled-plugins
# 中文插件(可在线安装),完成后重启
wget https://github.com/SonarQubeCommunity/sonar-l10n-zh/releases/download/sonar-l10n-zh-plugin-1.19/sonar-l10n-zh-plugin-1.19.jar
# 访问 http://ip:9000 
# SonarQube Scanner 扫描器
wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-3.3.0.1492-linux.zip
unzip sonar-scanner-cli-3.3.0.1492-linux.zip 
cd /opt/sonar-scanner/conf
vim sonar-scanner.properties 
  sonar.host.url=http://127.0.0.1:9000
  sonar.sourceEncoding=UTF-8


```

