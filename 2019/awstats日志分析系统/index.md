# Awstats日志分析系统


{{< admonition type=note title="安装环境" open=true >}}
- centos 6.7  
- nginx 1.12  
- awstats 7.5   
{{< /admonition >}}

### [ 一个小坑 ]  
&emsp;&emsp;这个是我早期的一个操作过程，当时是第一次用，然后跟着别人的一篇文章搭建的(perl环境)，但用了一段时间后，发现官方提供了php环境的配置信息，在`/pathto/awstats/tools/nginx`中。  
&emsp;&emsp;如果有`php`环境，将里面的`awstats-fcgi.php`复制到`/pathto/awstats/wwwroot/cgi-bin/`中,重命名为`fcgi.php`。  
&emsp;&emsp;然后将`awstats-nginx.conf`复制到自己的`nginx conf`下，修改里面的默认路径`/usr/share/awstats/wwwroot`
为自己的`/pathto/awstats/wwwroot`路径即可。[awasts的安装及配置](#2-安装awasts及配置)和下面一样(跳过配置`nginx`,测试跳过`fcgi`启动)。

# 1. 安装CPAN、FCGI和FCGI::ProcManager  
```bash
[root@00 ~]# cd /opt/software
[root@00 software]# wget http://www.cpan.org/authors/id/A/AN/ANDK/CPAN-2.10.tar.gz
[root@00 software]# wget http://www.cpan.org/authors/id/B/BO/BOBTFISH/FCGI-ProcManager-0.24.tar.gz 
[root@00 software]# tar xzvf CPAN-2.10.tar.gz
[root@00 software]# cd CPAN-2.10
[root@00 CPAN-2.10]# perl Makefile.PL
[root@00 CPAN-2.10]# make
[root@00 CPAN-2.10]# make install 
[root@00 software]# tar xzvf FCGI-ProcManager-0.24.tar.gz
[root@00 software]# cd FCGI-ProcManager-0.24
[root@00 FCGI-ProcManager-0.24]#  perl Makefile.PL
[root@00 FCGI-ProcManager-0.24]#  make 
[root@00 FCGI-ProcManager-0.24]#  make install
## 也可以使用yum直接安装(需要导入epel源)
[root@00 software]# yum install perl-CPAN
[root@00 software]# yum install perl-FCGI perl-FCGI-ProcManager
```
# 2. 安装awasts及配置
```bash
[root@00 software]# wget https://nchc.dl.sourceforge.net/project/awstats/AWStats/7.5/awstats-7.5.zip
[root@00 software]# unzip awstats-7.5.zip # 这个下载的是zip包，所以需要unzip进行解压
[root@00 software]# find ./awstats-7.5 -type d -name "*" -exec chmod 755 {} \; #这个解压后文件夹的权限变成了全权限，我这儿改了下
[root@00 software]# cp -r awstats-7.5 /data/ #/usr/local/awstats 是他默认的目录，这儿我把他改到我的数据目录中去
[root@00 data]#  chown -Rf www.www awstats #更改用户所有者权限(nginx所属组)
[root@00 data]# cd /data 
[root@00 data]# ln -s /data/awstats-7.5/ /data/awstats #创建软连接，用于版本控制，此步骤可以不做
[root@00 data]# cd awstats/tools
[root@00 tools]# ./awstats_configure.pl 
----- AWStats awstats_configure 1.0 (build 20140126) (c) Laurent Destailleur -----
This tool will help you to configure AWStats to analyze statistics for
one web server. You can try to use it to let it do all that is possible
in AWStats setup, however following the step by step manual setup
documentation (docs/index.html) is often a better idea. Above all if:
- You are not an administrator user,
- You want to analyze downloaded log files without web server,
- You want to analyze mail or ftp log files instead of web log files,
- You need to analyze load balanced servers log files,
- You want to 'understand' all possible ways to use AWStats...
Read the AWStats documentation (docs/index.html).
-----> Running OS detected: Linux, BSD or Unix
Warning: AWStats standard directory on Linux OS is '/usr/local/awstats'.
If you want to use standard directory, you should first move all content
of AWStats distribution from current directory:
/data/awstats-7.5
to standard directory:
/usr/local/awstats
And then, run configure.pl from this location.
Do you want to continue setup from this NON standard directory [yN] ? y #====>此处是因为我转移了目录的原因,如果是使用的默认目录,是没有这个提示信息的,这儿继续就可以了
-----> Check for web server install
Enter full config file path of your Web server.
Example: /etc/httpd/httpd.conf
Example: /usr/local/apache2/conf/httpd.conf
Example: c:\Program files\apache group\apache\conf\httpd.conf
Config file path ('none' to skip web server setup):
> none #这个是配置apache的，此次使用的是nginx，所以这儿不配置

Your web server config file(s) could not be found.
You will need to setup your web server manually to declare AWStats
script as a CGI, if you want to build reports dynamically.
See AWStats setup documentation (file docs/index.html)

-----> Update model config file '/usr/local/awstats/wwwroot/cgi-bin/awstats.model.conf'
  File awstats.model.conf updated.

-----> Need to create a new config file ?
Do you want me to build a new AWStats config/profile
file (required if first install) [y/N] ? y #

-----> Define config file name to create
What is the name of your web site or profile analysis ?
Example: www.mysite.com
Example: demo
Your web site, virtual server or profile name:
> example.com #这个配置文件是统计example.com这个站点的，名字可以随便写，与在后面awstats.pl中导入日志中的"-config"参数指定的站点名保持一致就好

-----> Define config file path
In which directory do you plan to store your config file(s) ?
Default: /etc/awstats
Directory path to store config file(s) (Enter for default):
>  #===>这儿是设置配置文件默认目录的，不建议更改

-----> Create config file '/etc/awstats/awstats.example.com.conf'
 Config file /etc/awstats/awstats.example.com.conf created.

-----> Add update process inside a scheduler
Sorry, configure.pl does not support automatic add to cron yet.
You can do it manually by adding the following command to your cron:
/usr/local/awstats/wwwroot/cgi-bin/awstats.pl -update -config=example.com
Or if you have several config files and prefer having only one command:
/usr/local/awstats/tools/awstats_updateall.pl now
Press ENTER to continue... 

A SIMPLE config file has been created: /etc/awstats/awstats.example.com.conf
You should have a look inside to check and change manually main parameters.
You can then manually update your statistics for 'example.com' with command:
> perl awstats.pl -update -config=example.com
You can also build static report pages for 'example.com' with command:
> perl awstats.pl -output=pagetype -config=example.com

Press ENTER to finish...
[root@00 tools]# vim /etc/awstats/awstats.example.com.conf #这个就是站点配置文件，默认配置名称就是上面写的那个，
# ===> 在里面搜索LogFile，大概50行,添加并修改 ,注意后面的管道符 "|" 一定不能少

#以下目录对应的是Nginx日志切割所生成的目录存放位置，注意awstats的年月日格式，-24表示昨天的日志，-0表示当前的#
#LogFile="/data/awstats/weblog/0101.log"

LogFile="zcat /data/awstats/weblog/www_%YYYY-24-%MM-24-%DD-24.tar.gz |"


# ===> 在里面搜索DirData,大概223行,将值修改为/data/awstats/data,这个是awstats的数据目录,请自行修改
 DirData="/data/awstats/data" 
# ====> 在里面搜索LoadPlugin,大概1334行,将注释取消,这个是解决中文乱码的,作用不是很大,正常的一般也没有什么中文,可以不用配置.
# 依赖插件包 yum install perl-URI.noarch perl-URI-Encode.noarch

LoadPlugin="decodeutfkeys"
#============以下是额外信息,这个是用于开启地理支持的,看个人需要了=============
# 开启支持需要先安装几个包, yum install GeoIP GeoIP-data GeoIP-devel perl-Geo-IP #
# 取消以下两个的注释,大概在1463和1482行,把下面的目录改成上面安装那些包的目录,一般是在/usr/share下,自己搜下,我没有配置这个 
#LoadPlugin="geoip GEOIP_STANDARD /pathto/GeoIP.dat"
#LoadPlugin="geoip_city_maxmind GEOIP_STANDARD /pathto/GeoIPCity.dat"

[root@00 awstats]# mv -v /data/awstats/wwwroot/cgi-bin/awstats.model.conf /data/awstats/wwwroot/cgi-bin/awstats.model.conf.backup # 这个是awstats创建是调用的模板配置文件,将他备份下,然后把你自己修改后的那个配置文件转移到cgi-bin下,并重命名为awstats.model.conf,下次新建配置的时候就会调用你新建的那个了,就可以不用改这些东西
[root@00 awstats]# mv -v /etc/awstats/awstats.example.com.conf /data/awstats/wwwroot/cgi-bin/awstats.model.conf
```

# 3. 配置nginx
```bash
[root@00 conf]# cd /application/nginx/conf/
[root@00 conf]# vim nginx.conf
# ======= 取消21到24行的日志格式注释,这个只是用于awstats的记录,开不开启都无所谓=========
  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';
#======= 添加配置文件引用到http下 
 include /application/nginx/conf/vhost/*.conf;

[root@00 vhost]# vim /application/nginx/conf/vhost/awstats.conf #以下根据自己的配置修改
server {
  listen 8088;
  server_name xxx.xx.xxx.xxx; 

location / {
  root /data/awstats;
  index index.html index.htm;
}

location ~* ^/cgi-bin/.*\.pl$ {
  root /data/awstats/wwwroot;
  #auth_basic "please input you user and password ,thank you"; 
  #auth_basic_user_file /data/nginx/conf/fhost/awstats_passwd; 
  fastcgi_pass unix:/data/nginx/fastcgi_temp/perl_cgi-dispatch.sock;
  fastcgi_index index.pl;
  include awstats_fastcgi_params; #这个地方可以直接把参数写进来
  charset gb2312;
}

location ~ ^/icon/ {        
  root /data/awstats/wwwroot;
  index index.html;
  access_log /data/awstats/logs/awstats_access.log;
  error_log /data/awstats/logs/awstats_error.log;
  }
}

[root@00 conf]# vim awstats_fastcgi_params 
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
fastcgi_param QUERY_STRING $query_string;
fastcgi_param REQUEST_METHOD $request_method;
fastcgi_param CONTENT_TYPE $content_type;
fastcgi_param CONTENT_LENGTH $content_length;
fastcgi_param GATEWAY_INTERFACE CGI/1.1;
fastcgi_param SERVER_SOFTWARE nginx;
fastcgi_param SCRIPT_NAME $fastcgi_script_name;
fastcgi_param REQUEST_URI $request_uri;
fastcgi_param DOCUMENT_URI $document_uri;
fastcgi_param DOCUMENT_ROOT $document_root;
fastcgi_param SERVER_PROTOCOL $server_protocol;
fastcgi_param REMOTE_ADDR $remote_addr;
fastcgi_param REMOTE_PORT $remote_port;
fastcgi_param SERVER_ADDR $server_addr;
fastcgi_param SERVER_PORT $server_port;
fastcgi_param SERVER_NAME $server_name;
fastcgi_read_timeout 60;

[root@00 conf]# cd /application/nginx/sbin/
[root@00 sbin]# vim fcgi #创建fcgi启动文件
#!/usr/bin/perl
use FCGI;
#perl -MCPAN -e 'install FCGI'
use Socket;
use POSIX qw(setsid);
#use Fcntl;
require 'syscall.ph';
&daemonize;
#this keeps the program alive or something after exec'ing perl scripts
END() { } BEGIN() { }
*CORE::GLOBAL::exit = sub { die "fakeexit\nrc=".shift()."\n"; };
eval q{exit};
if ($@) {
        exit unless $@ =~ /^fakeexit/;
};
&main;
sub daemonize() {
    chdir '/'                 or die "Can't chdir to /: $!";
    defined(my $pid = fork)   or die "Can't fork: $!";
    exit if $pid;
    setsid                    or die "Can't start a new session: $!";
    umask 0;
}
sub main {
        #$socket = FCGI::OpenSocket( "127.0.0.1:8999", 10 );
        $socket = FCGI::OpenSocket( "/data/nginx/fastcgi_temp/perl_cgi-dispatch.sock", 10 ); #这个改成自己的目录
#use UNIX sockets - user running this script must have w access to the 'nginx' folder!!
        $request = FCGI::Request( \*STDIN, \*STDOUT, \*STDERR, \%req_params, $socket );
        if ($request) { request_loop()};
            FCGI::CloseSocket( $socket );
}
sub request_loop {
        while( $request->Accept() >= 0 ) {
           #processing any STDIN input from WebServer (for CGI-POST actions)
           $stdin_passthrough ='';
           $req_len = 0 + $req_params{'CONTENT_LENGTH'};
           if (($req_params{'REQUEST_METHOD'} eq 'POST') && ($req_len != 0) ){
                my $bytes_read = 0;
                while ($bytes_read < $req_len) {
                        my $data = '';
                        my $bytes = read(STDIN, $data, ($req_len - $bytes_read));
                        last if ($bytes == 0 || !defined($bytes));
                        $stdin_passthrough .= $data;
                        $bytes_read += $bytes;
                }
            }
            #running the cgi app
            if ( (-x $req_params{SCRIPT_FILENAME}) && #can I execute this?
                 (-s $req_params{SCRIPT_FILENAME}) && #Is this file empty?
                 (-r $req_params{SCRIPT_FILENAME})     #can I read this file?
            ){
                pipe(CHILD_RD, PARENT_WR);
                my $pid = open(KID_TO_READ, "-|");
                unless(defined($pid)) {
                        print("Content-type: text/plain\r\n\r\n");
                        print "Error: CGI app returned no output - Executing $req_params
{SCRIPT_FILENAME} failed !\n";
                        next;
                }
                if ($pid > 0) {
                        close(CHILD_RD);
                        print PARENT_WR $stdin_passthrough;
                        close(PARENT_WR);
                        while(my $s = <KID_TO_READ>) { print $s; }
                        close KID_TO_READ;
                        waitpid($pid, 0);
                } else {
                        foreach $key ( keys %req_params){
                           $ENV{$key} = $req_params{$key};
                        }
                        # cd to the script's local directory
                        if ($req_params{SCRIPT_FILENAME} =~ /^(.*)\/[^\/]+$/) {
                                chdir $1;
                        }
                        close(PARENT_WR);
                        close(STDIN);
                        #fcntl(CHILD_RD, F_DUPFD, 0);
                        syscall(&SYS_dup2, fileno(CHILD_RD), 0);
                        #open(STDIN, "<&CHILD_RD");
                        exec($req_params{SCRIPT_FILENAME});
                        die("exec failed");
                }
            }
            else {
                print("Content-type: text/plain\r\n\r\n");
                print "Error: No such CGI app - $req_params{SCRIPT_FILENAME} may not exist or is
not executable by this process.\n";
            }
        }
}

[root@00 sbin]# chmon 755 fcgi #添加执行权限 
```
# 4. 测试,启动
```bash
[root@00 sbin]# /data/nginx/sbin/fcgi #启动fcgi
[root@00 sbin]# /data/nginx/sbin/nginx #启动nginx
## 单条更新时候需要修改/etc/awstats/awstats.xxx.conf配置文件中LogFile的参数,将其改成固定要导入的那天就可以了,如果以前有导入过数据,现在需要导入更之前的数据,需要更改配置文件中的DirData参数配置的路径下的txt文件,修改里面的LastLine 20170714230501 100542 25372721 0,将里面的日期改成要导入数据的前一天.
[root@00 sbin]# /data/awstats/wwwroot/cgi-bin/awstats.pl -update -config=example.com #单条更新站点数据-config后面的就是上面配置的参数;还有个批量更新的，这个没有记录
## http://xxxxxxxxx:33333/cgi-bin/awstats.pl?config=example.com #动态页面访问地址
[root@00 sbin]# /data/awstats/tools/awstats_buildstaticpages.pl -update -config=example.com -lang=cn -dir=/data/awstats -awstatsprog=/data/awstats/wwwroot/cgi-bin/awstats.pl #这个是生成静态数据页面的,生成静态数据页面
## http://xxxxxxxxxx:8088/awstats.example.com.html #静态页面访问
```

