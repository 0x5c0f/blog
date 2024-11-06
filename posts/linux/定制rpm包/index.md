# 定制rpm包


{{&lt; admonition type=quote title=&#34;本文参照以下引用实践编写&#34; open=true &gt;}}
&gt; https://www.zyops.com/autodeploy-rpm/
{{&lt; /admonition &gt;}}

# 1. FPM 打包工具
FPM的作者是jordansissel   
FPM的github：
&gt; https://github.com/jordansissel/fpm   

FPM功能简单说就是将一种类型的包转换成另一种类型，其具体工功能实现实际上是对于rpmbuild命令的一个封装  

## 1.1. 支持的源类型包 
||||
|-|-|-|
|1.|dir         |将目录打包成所需要的类型，可以用于源码编译安装的软件包|
|2.|rpm         |对rpm进行转换|
|3.|gem         |对rubygem包进行转换|
|4.|python      |将python模块打包成相应的类型|

## 1.2. 支持的目标类型包
||||
|-|-|-|
|1.|rpm         |转换为rpm包|
|2.|deb         |转换为deb包|
|3.|solaris     |转换为solaris包|
|4.|puppet      |转换为puppet模块|

## 1.3. FPM安装
```bash
# fpm是ruby写的，因此系统环境需要ruby，且ruby版本号大于1.8.5。  
# 安装ruby模块  
yum -y install ruby rubygems ruby-devel  
# 查看当前使用的rubygems仓库    
gem sources list   
# 添加阿里云的Rubygems仓库，外国的源慢，移除原生的Ruby仓库  
gem sources --add http://mirrors.aliyun.com/rubygems/ --remove http://rubygems.org/  
# 安装fpm，gem从rubygem仓库安装软件类似yum从yum仓库安装软件。首先安装低版本的json，高版本的json需要ruby2.0以上，然后安装低版本的fpm，够用。  
gem install json -v 1.8.3  
gem install fpm -v 1.3.3  
# 上面的2步安装仅适合CentOS6系统，CentOS7系统一步搞定，即gem install fpm  
```
## 1.4. FPM参数
详细使用见fpm –help  
常用参数  
```bash
-s          指定源类型
-t          指定目标类型，即想要制作为什么包
-n          指定包的名字
-v          指定包的版本号
-C          指定打包的相对路径  Change directory to here before searching forfiles
-d          指定依赖于哪些包
-f          第二次打包时目录下如果有同名安装包存在，则覆盖它
-p          输出的安装包的目录，不想放在当前目录下就需要指定
--post-install      软件包安装完成之后所要运行的脚本；同--after-install
--pre-install       软件包安装完成之前所要运行的脚本；同--before-install
--post-uninstall    软件包卸载完成之后所要运行的脚本；同--after-remove
--pre-uninstall     软件包卸载完成之前所要运行的脚本；同--before-remove
```

# 2. 使用实例–实战定制nginx的RPM包  
## 2.1. 安装nginx  
## 2.2. 定制rpm安装后(前)执行脚本
```bash
[root@00 ~]# vim /opt/sh/nginx.rpm.sh
#!/bin/bash
# 指定但不创建主目录是为了规划ftp虚拟帐号用的
useradd nginx -M -s /sbin/nologin -d /var/ftproot 
ln -s /opt/nginx-1.14.2/ /opt/nginxssl 
```
## 2.3. 打包
```bash
[root@00 ~]# fpm -s dir -t rpm --description &#39;nginx&#39; -n nginx -v 1.14.2 -d &#39;pcre-devel,openssl-devel&#39; --post-install /opt/sh/nginx.rpm.sh -C /opt/nginx-1.6.2/ -f /opt/nginx-1.6.2/  
# 安装好的，复制完整结构内容到一个目录，打包那个目录内的内容是一样的效果 
# such as: fpm -s dir -t rpm --description &#34;badvpn binary for fc32, Source: https://github.com/ambrop72/badvpn &#34; --rpm-summary &#39;badvpn&#39; --url &#39;https://tools.0x5c0f.cc&#39; --license &#39;3-clause BSD license&#39; --iteration fc32 -m 0x5c0f --vendor mail@0x5c0f.cc -n badvpn -v &#39;1.999.130-v1.0&#39; -C . 
# 
no value for epoch is set, defaulting to nil {:level=&gt;:warn}
no value for epoch is set, defaulting to nil {:level=&gt;:warn}
Created package {:path=&gt;&#34;nginx-1.14.2-1.x86_64.rpm&#34;}
[root@oldboy ~]# ll -h nginx-1.14.2-1.x86_64.rpm 
-rw-r--r-- 1 root root 6.7M Nov  1 10:02 nginx-1.14.2-1.x86_64.rpm
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E5%AE%9A%E5%88%B6rpm%E5%8C%85/  

