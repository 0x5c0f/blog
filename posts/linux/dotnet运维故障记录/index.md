# Dotnet运维故障记录


# 安装故障   
Failed to load , error: libunwind.so.8: cannot open shared object file: No such file or directory    
Failed to bind to CoreCLR at ‘/root/dotnet/shared/Microsoft.NETCore.App/2.0.0/libcoreclr.so‘   
```bash
yum install libunwind -y  
```

FailFast: Couldn‘t find a valid ICU package installed on the system. Set the configuration flag System.Globalization.Invariant to true if you want to run with no globalization support.  
```
yum install icu -y  
```


# 程序异常
## 报错信息 The handler does not support custom handling of certificates with this combination of libcurl (7.29.0) and its SSL backend (\&#34;NSS/3.28.4\&#34;)
最近接收到了开发反馈`dotnet`程序发送短信异常，据说也是一直都有的问题，协助查询了多方资料，发现是`libcurl`版本的问题，由于服务器上存在了多个`dotnet`站点，也不敢轻易去升级，后来又听说所有的`dotnet`都存在，于是对`curl`进行了一次升级，重启`dotnet`短信正常  

{{&lt; admonition type=quote title=&#34;接入一个写的比较清晰的文章&#34; open=true &gt;}}
&gt; https://blog.azpro.cn/index.php/archives/113/
{{&lt; /admonition &gt;}}

升级过程 :
```bash
# yum install libcurl-openssl -y
# wget https://curl.haxx.se/download/curl-7.64.0.tar.gz
# tar -xzvf curl-7.64.0.tar.gz
# cd curl-7.64.0/
# ./configure --prefix=/opt/curl-7.64.0 --with-ssl
# make &amp;&amp; make install 
# mv /usr/bin/curl /usr/bin/curl.old
# mv /usr/bin/curl-config /usr/bin/curl-config.old
# ln -s /opt/curl-7.64.0/ /opt/curl
# ln -s /opt/curl/bin/curl /usr/bin/curl
# ln -s /opt/curl/bin/curl-config /usr/bin/curl-config
# echo &#34;/opt/curl/lib&#34; &gt;&gt; /etc/ld.so.conf.d/curl-x86_64.conf
# ldconfig 
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/dotnet%E8%BF%90%E7%BB%B4%E6%95%85%E9%9A%9C%E8%AE%B0%E5%BD%95/  

