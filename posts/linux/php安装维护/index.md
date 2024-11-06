# Php安装维护



{{&lt; admonition type=note title=&#34;前言&#34; open=true &gt;}}
记录一个php的安装过程，仅作为个人使用记录，可参考  
基础环境:  
1. CentOS 7.6  
2. php 5.6.38  
{{&lt; /admonition &gt;}}


# 2. 安装

```bash
[root@00 ~]# mkdir /opt/software
[root@00 ~]# cd /opt/software
[root@00 software]# useradd -d /var/ftproot -s /sbin/nologin www 
[root@00 software]# yum install -y zlib-devel libxml2-devel libjpeg-devel libjpeg-turbo-devel freetype-devel libpng-devel gd-devel libcurl-devel libxslt-devel openssl openssl-devel mhash libmcrypt-devel mcrypt gcc glibc gcc-c&#43;&#43;

[root@00 software]# wget https://ftp.gnu.org/pub/gnu/libiconv/libiconv-1.15.tar.gz --no-check-certificate
[root@00 software]# tar xzf libiconv-1.15.tar.gz
[root@00 software]# cd libiconv-1.15
[root@00 libiconv-1.15]# ./configure --prefix=/usr/local/libiconv  
[root@00 libiconv-1.15]# make &amp;&amp; make install 
## ----  过程省略  ---- ##
## ----  过程错误自行排查  ---- ##
[root@00 libiconv-1.15]# cd /opt/software

[root@00 software]# wget http://mirrors.sohu.com/php/php-5.6.38.tar.gz
[root@00 software]# tar -xzf php-5.6.38.tar.gz
[root@00 php-5.6.38]# cd php-5.6.38
## 标准的生产环境编译参数(nginx)
## ------------------------ ##
## apache取消以下参数(apache&#43;php时是不需要将php启动的，php是将模块直接编译进入apache的)  
## --enable-opcache=no
## --enable-fpm
## --with-fpm-user=www 
## --with-fpm-group=www 
## 添加以下参数，指向apache的apxs
## --with-apxs2=/opt/apache/bin/apxs
## ------------------------ ##
[root@00 php-5.6.38]# ./configure \
--prefix=/opt/php5.6.38 \
--with-config-file-path=/opt/php5.6.38/etc \
--with-mysql=mysqlnd \
--with-mysqli=mysqlnd \
--with-pdo-mysql=mysqlnd \
--with-iconv-dir=/usr/local/libiconv \
--with-freetype-dir \
--with-jpeg-dir \
--with-png-dir \
--with-zlib \
--with-libxml-dir \
--enable-xml \
--disable-rpath \
--disable-debug \
--enable-bcmath \
--enable-shmop \
--enable-sysvsem \
--enable-inline-optimization \
--with-curl \
--enable-mbregex \
--enable-fpm \
--enable-mbstring \
--with-mcrypt \
--with-gd \
--enable-gd-native-ttf \
--with-openssl \
--with-mhash \
--enable-pcntl \
--enable-sockets \
--with-xmlrpc \
--enable-zip \
--enable-soap \
--enable-short-tags \
--enable-static \
--with-xsl \
--with-fpm-user=www \
--with-fpm-group=www \
--enable-ftp \
--enable-opcache=no  

#
# --enable-opcache 此扩展可能不稳定，因此关闭，
# 也可以使用--disable-opcache 进行关闭，默认是启用的 
# (现当前版本不知道是否稳定些了)
#

# 5.3 添加的额外参数  
# --with-curlwrappers  
# --enable-safe-mode  
# --enable-zend-multibyte  


[root@00 php-5.6.38]# make &amp;&amp; make install
## ----  过程省略  ---- ##
## ----  过程错误自行排查  ---- ##
[root@00 php-5.6.38]# cp -v ./php.ini-production /opt/php5.6.38/etc/php.ini
[root@00 php-5.6.38]# cp -v /opt/php5.6.38/etc/php-fpm.conf.default /opt/php5.6.38/etc/php-fpm.conf
[root@00 php-5.6.38]# ln -s /opt/php5.6.38/ /opt/php    # 优化路径，用于后续可能的升级
## --- 安装完成 --- ##
```

若需要将php-fpm 加入到系统服务当中，
在`/opt/software/php-5.6.38/sapi/fpm`目录下,将`php-fpm.service`文件中对应的`${prefix}`和`${exec_prefix}`改为程序编译后的对应目录，让后将文件`cp`到`/usr/lib/systemd/system/`下, 然后执行`systemctl daemon-reload`重加载即可，然后就可以使用`systemctl {start|stop|restart} php-fpm.services` 对`php-fpm`进行管理了(CentOS 6.x 的不知道)


## 2.1 php 扩展编译 
扩展安装的操作步骤(以xcache为例):   
1. 下载需要安装的扩展源码，解压进去后，先执行 `/opt/php5.6.38/bin/phpize` 生成`configure`配置文件   
2. 配置当前扩展编译`./configure --enable-xcache --with-php-config=/opt/php5.6.38/bin/php-config `   
3. 编译并安装 `make &amp;&amp; make install`,编译并安装成功后会在`/opt/php5.6.38/lib/php/extensions`目录下生成对应目录，里面包含一个`xcache.so`的文件.  


# 3. 相关参数说明  

## 3.1. php-fpm.conf  

```ini
pid = run/php-fpm.pid
error_log = log/php-fpm.log
user = www
group = www
# 设置接受 FastCGI 请求的地址 可为socket路径,(socket默认位置php根目录)
listen = 127.0.0.1:9000
#允许连接到 FastCGI 的服务器 IPV4 地址
listen.allowed_clients = 127.0.0.1
# 设置进程管理器如何管理子进程，dynamic动态设置,必须配合
# pm.max_children，pm.start_servers，pm.min_spare_servers，pm.max_spare_servers参数进行设置
pm = dynamic
# 设置最大可创建的子进程的数量(仅代表动态设置)
pm.max_children = 300
# 设置启动时创建的子进程数目
pm.start_servers = 30
# pm.*_spare_servers 设置空闲服务进程的最低/最大数目
pm.min_spare_servers = 30
pm.max_spare_servers = 300
# 设置每个子进程重生之前服务的请求数
pm.max_requests = 65535
# 设置文件打开描述符的 rlimit 限制，默认系统定义值
rlimit_files = 65535
```

详细参数说明:  
&gt; https://secure.php.net/manual/zh/install.fpm.configuration.php  


# 4. windows_php   

1. `iis` 可直接安装为`web-platfrom`，然后搜索`php manager`
    &gt; https://www.iis.net/downloads/microsoft/web-platform-installer  

2. 若无法正常使用，需要先安装`vc2012`
  - 故障: `php7.x vc15`安装时候只安装`vc&#43;&#43; 2015`不行(这个对应关系不是很清楚),此处安装[`2015、2017、2019、2022合并包`](https://docs.microsoft.com/zh-CN/cpp/windows/latest-supported-vc-redist?view=msvc-170)后成功运行 

3. 若`1`无法安装，一般只是`php manager`无法安装，而`url`重写模块是安装好了的，这个时候直接去`github`上去下载一个整合的phpmanager，安装即可。
    &gt; https://github.com/phpmanager/phpmanager/releases/tag/v2.0  

4. 上述第三步，也有可能`url`重写模块也未安装成功，这个时候需要去`microsoft`官网下载一个重写模块即可。另如果通过为`web-platfrom`安装`phpmanager`失败后安装的`url`重写模块，可能会导致`iis`中的`.net`程序异常，这个时候也需要手动卸载通过`web-platfrom`安装的`url`重写模块，然后安装`microsoft`下载的对应重写模块，理论上来说`iis`中安装的这个应该就是官网提供的，但是我遇到过的一次就是不行，卸载后重新安装官网的后,`.net`就正常了。  
    - [rewrite_x64_zh-CN.msi for microsoft](http://download.microsoft.com/download/4/E/7/4E7ECE9A-DF55-4F90-A354-B497072BDE0A/rewrite_x64_zh-CN.msi)  

    - [rewrite_x86_zh-CN.msi for microsoft](http://download.microsoft.com/download/4/9/C/49CD28DB-4AA6-4A51-9437-AA001221F606/rewrite_x86_zh-CN.msi)

5. 扩展 `pdo_sqlsrv` (`windows` &#43; `drivers_3.2`)
    - 遇到了一个坑，`php5.6`添加`pdo_sqlsrv`模块无论是 `nts` 还是 `ts`的 ，从官方直接下载下来的 `dll` 打死进加载不了，后来找到了一个非官方的，导入进去，然后就可以了，我也是哔了狗了(这些模块的dll可以去`phpstudy`中`copy`，他们是集成好了的)。   

# 5. 额外扩展
- `php memcache` 扩展
```bash
wget http://pecl.php.net/get/memcache-2.2.7.tgz
/opt/php-server/bin/phpize

yum install re2c

./configure --enable-memcache --with-php-config=/opt/php-server/bin/php-config --with-zlib-dir

make &amp;&amp; make install

extension=memcache.so
```

- `php redis` 扩展
```bash
# php redis 扩展, php 5.6 对应phpredis 5.0以下测试正常编译 

wget https://github.com/phpredis/phpredis/archive/4.3.0.tar.gz

/opt/php-server/bin/phpize

./configure --with-php-config=/opt/php-server/bin/php-config

extension=redis.so 
```
- `memcache` 管理工具 
&gt; [http://www.junopen.com/memadmin/](http://www.junopen.com/memadmin/)


# 6. php版本选择  
windos服务器：  
1. 如果你是PHP&#43;IIS；请选择：PHP非线程安全（None Thread Safe(NTS)）；   
2. 如果你是PHP&#43;apache；请选择：PHP线程安全（Thread Safe（TS））  
linux服务器：  
linux服务器下的PHP，没有PHP线程安全和非线程安全版的区分  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/php%E5%AE%89%E8%A3%85%E7%BB%B4%E6%8A%A4/  

