# 服务器运维故障记录


# Mysql  Errcode: 24 - Too many open files 
> [https://blog.csdn.net/weixin_36343850/article/details/86293700](https://blog.csdn.net/weixin_36343850/article/details/86293700)   

原因：打开文件数量太多，超出了`open_files_limit`这个参数的限制，在一个表中有多个分区的时候，这种情况更容易发生。  
解决方法： 
- 查看 `open_files_limit`参数, 使用`show variables like '%open%';`就可以看到了   
- 修改 `open_files_limit`参数  
 在网上找了很多资料，有的说直接在`/etc/mysql/mysql.conf.d/mysqld.cnf`文件中的`[mysqld]`部分添加`open_files_limit`参数，比如`open_files_limit=10240`，并且在`/etc/security/limits.conf` 添加`mysql soft nofile 10240`和`mysql hard nofile 10240`这两个参数然后重启`MySQL`，但是发现不能生效。  
- 以下方法可用： 
  - 在文件`/etc/systemd/system/multi-user.target.wants/mysql.service`(也有可能是`/etc/systemd/system/mysql.service`这个文件)最后添加`LimitNOFILE=10240`  
- 然后执行`systemctl daemon-reload`，接着再重启`mysql`服务`sudo service mysql restart`,可以看到已经修改成功了  

# 禅道bug管理系统 
1. 这个部署遇到的一个坑就是`php`打死获取不到`session`的位置  
打开调试日志方式是将`my.cnf` 中`debug`设置为`true`  
实际错误体现是 `ERROR: 您访问的域名 xxx.xxx.xxx 没有对应的公司。`  
我的解决方案是 代码目录整体权限设置为`777`,然后删除掉`my.cnf`进行重装,重装后在目录权限调整为正常权限即可.  
3. 安装完成后，首页出现无限循环重定向，手动将`my.php`中`PATH_INFO`修改为`GET`，或在`nginx`传入变量`PATH_INFO`值`$request_uri;`

# nginx 代理php产生的一些故障
记录一个`nginx` 代理 `php` 产生的问题,问题已经解决了,但是似乎还是没有找到根本原因,**若有了解的,请一定解惑一二**, 以下记录下处理过程 . 
- 问题产生过程:  
  - A服务器代码迁移到B机器上,代码是`rsync`直接同步的,然后B运行的时候就出问题了,根据调试发现,无论访问什么(html/js/css)都会跳转到首页,实际应该是都会经过`php`解析(我发誓A和B的环境配置是一模一样的!A可以正常运行.), `php`框架为`opencart` .   

- 浏览器访问表现以下错误:   
  - `Resource interpreted as Stylesheet but transferred with MIME type text/html` 
  - `ERR_CONNECTION_REFUSED`  

- 处理过程 :
  - 问题实际上是头一天发生的,经过多方调试发现,实际上通过域名访问任何资源均会跳转到首页,访问`php`资源则会出现无法加载`js/css`等静态资源全部都是`MIME`类型问题,`nginx`强行给`css/js`等资源设置一个`content-type`前端也无法识别正确,另外也测试过网上提供的多方解决方案,仍然无法得到解决 .  
  - 第二天, 保持原有`nginx`配置 , 我给对应站点首页的`index.php`代码中加入了`echo 123; exit();`进行测试,访问发现可正常断开,此时在访问根下的静态`html`测试文件,发现可以正常访问了,此时删除`echo 123; exit();`,重新访问`index.php`,发现(js/css)静态资源被升级为`https`访问,此时我给相关域名配置上证书,然后访问就正常了!!!  

- 原因分析:     
  - 站点缓存(这个可能性最大),`opencart`框架实际上`session`是存储到数据库中的,估计很多的`cache`也是存于数据中的,而今天解决的时间也恰好距离我最后一次同步一天的样子.  
  - `nginx` 配置域名过多,导致配置混乱. B服务器的`nginx`实际上已经配置了很多个域名,`php`解析的`SCRIPT_FILENAME` 我使用的是`$document_root`,最后一次修改我也将`$document_root`修改为了具体的路径,不知道会不会是这个原因产生的.  


# zabbix 自动发现异常错误  
-  具体错误表现  
1. `Cannot create item: item with the same key "domain.status[{#DOMAIN_NAME},http_code]" already exists.`  
2. `Cannot accurately apply filter: no value received for macro "{#DOMAINNAME}".`  
- 解决方案  
  - 这个是特么的自动发现脚本返回值的`key`必须用`{}`括起来,不然你即使是`json`格式他也不会认, 网上那些这个抄那个的坑货就只知道变量要大写，还有个坑告诉我要使用宏,用了宏就是第二个问题,不用第一个，这我是记得很清楚，宏并不是必定要有的啊，我以前写也基本没有加过。 我特么也是蠢了，写了这么多的自动发现，居然没有注意要括起来。 

# nginx 伪静态无效问题 
- 具体错误体现
拿到`apache`的`.htaccess`文件后，通过[`https://www.winginx.com/en/htaccess`](https://www.winginx.com/en/htaccess)转换为了`nginx`可用的规则，但加入后访问跳转一直是`404`,经检查`location`是定位成功了的，但就是访问不了
- 解决方案: 
 1. 后续开发提供了另一个伪静态配置,所有`rewrite`是放在`if`指令中(`!-e $request_filename`)，然后就可以了。我对比了下，两者的差异就是，一个是放在了`location`中，定位了每一个`rewrite`所在的位置。还有就是放在`if`中的`rewrite`的匹配规则是用引号括起来了的。具体原因暂时还是每搞清楚。后续出现需测试下引号是否有影响.

# nginx 反向代理后端服务器，部分资源出现502错误 
问题描述: 后端是`dotnet`应用，反向代理时候域名请求页面部分`css`/`js`资源返回`502`错误。直接请求报错的`css`/`js`又是正常的，前端绕过`nginx`直接访问`dotnet`所有返回又是正常的。只有经过`nginx`会出现该问题。
解决过程：
  - 网上搜索到很多的解决方案，这一个感觉有点用，但***并没有解决我的问题***,说的是`header过大，超出了默认的1k，就会引发上述的upstream sent too big header，nginx把外部请求给后端处理，后端返回的header太大，nginx处理不过来就会导致502`，这个问题提出的解决是，增大`proxy_buffer_size`/`proxy_buffers`/`proxy_busy_buffers_size`,不过还是记录下，毕竟不是每个问题原因都一样。
  - 这是我当时参考的第二个方案,根据官方文档[`https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive`](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive),调整了`upstream`中`keepalive`,我原来设置的是`2`,现调整为`16`,并设置了`Connection "Keep-Alive";`(这个设置是为了保持`http/1.0`持久链接，官方不建议使用此参数，但我这边`websokcet`和`http/1.0`,单独设置一个并没有效果，所以两个都设置了)。这个方案当时解决了一部分的问题。但根本并未得到解决。
  - 然后最终的方案，重启应用服务器，问题完全解决！！！

原因分析：突然不知道怎么下笔了，反正就是系统tcp连接过多，最开始体现就是出现大量的`CLOSE_WAIT`,当时重启了对应占用的程序，清理一些连接，出现一定的好转，但也仅仅出现了好转，后面可能由于某些原因，导致重启应用也无法解决了，最后重启服务器，问题完全解决。 应该不是每个人都是这个原因，不过可以参考下。

# nginx 反向代理 cdn回源(多层nginx)出现 502、503、504 等异常 
在我的部署模式中，很多时候都是`docker`与实际应用环境混合部署(多环境，单节点)，大多的结构是 `docker`运行程序环境，`nginx`反向代理到`docker`暴露的端口，从而实现应用的正常访问。我这次遇到的这个问题，最开始的时候我以为是`cdn`的问题，因为当时我没有通过`cdn`直达服务器的时候访问都是正常的，然后通过`cdn`后，页面大多数请求就都出现了`502`等状态，这个时候我联系了运营商，他们说回源链接被断开了，是不是服务器上有相关安全策略，仔细的想了下，服务器上除了开启了`iptables`外，并没有其他的安全设置，正没有头绪的时候，突然想到`docker`需要依赖`iptables`转发，是不是这个原因导致防火墙又有问题了(因为之前我调整iptables的时候，导致过docker容器无法连接网络😥)，于是我把防火墙一关，然后`cdn`回源就正常了。 后续的处理，我关闭了服务器防火墙设置，重启了`docker`，重建了容器(防止容器网络出现问题，同时让`docker`重新创建自己的规则链)。对外的防火墙采用云防火墙现在公网流入流量。上面其他记录的故障中，估计也有这个原因导致的，但是不知道怎么调好了。(TODO:// 一个人运维好难，有点啥问题都不知道该找谁讨论下，全靠自己摸索)

# nginx: [emerg] location "<xxxxxxxx>" cannot be inside the exact location "/favicon.ico" in xxxxxx
我这边遇到的此类问题多数为在`location =/xxx {`下继续`include`了`location` ,清除后解决


# IIS低版本未映射 WebResource.axd 文件，导致相关图片或js等无法正常加载 (多出现地版本服务器上,当前记录server 2008 r2)
- 处理: 
配置编辑器 --> `system.web/httpHandlers/` --> 点击 `Count` 右侧的小点展开, 然后添加`Path:WebResource.axd`、`type: System.Web.Handlers.AssemblyResourceLoader`,  `validate: True` , `verb: GET` ，完成后关闭   
```xml
<configuration>
   <system.web>
       <httpHandlers>
           <add path="WebResource.axd" verb="GET" type="System.Web.Handlers.AssemblyResourceLoader" validate="True" />
       <tpHandlers>
   </system.web>
</configuration>
```

# IIS 如何修改文件上传限制
要修改IIS中的文件上传限制，可以按照以下步骤操作：
1. 打开IIS管理器（`Internet Information Services Manager`）。
2. 在左侧导航栏中，展开服务器节点，并找到您要修改的站点。单击该站点。
3. 在右侧窗口中，双击“配置编辑器”图标。
4. 在“配置编辑器”窗口中，选择“`system.webServer/Security/requestFiltering`”节点。
5. 在右侧窗口中，查找并编辑以下设置来修改文件上传限制：
   - `maxAllowedContentLength`：此设置用于限制请求内容的最大大小。以字节为单位。例如，如果要将上传文件大小限制为100MB，则将其设置为104857600（100MB * 1024KB * 1024B）。
   - `maxRequestLength`：此设置用于限制请求的最大大小。以KB为单位。例如，如果要将上传文件大小限制为100MB，则将其设置为102400（100MB * 1024KB）。

   注意：这两个设置需要同时更改，以确保文件上传限制的生效。

6. 修改完上述设置后，点击“应用”按钮保存更改。
7. 关闭“配置编辑器”窗口和IIS管理器。

现在，您已成功修改了IIS中的文件上传限制。请注意，这些设置可能会对整个站点或虚拟目录产生影响，因此请确保根据需要进行适当的调整。
```xml
<configuration>
    <system.webServer>
        <security>
            <requestFiltering>
                <!-- 100M -->
                <requestLimits maxAllowedContentLength="100000000" /> 
            </requestFiltering>
        </security>
    </system.webServer>
</configuration>
```

# IIS .net 项目 post 无法提交数据
- .net 站点 curl post请求，模拟表单提交，后端收不到数据，解决方案是把程序池的集成模式改为经典模式 
