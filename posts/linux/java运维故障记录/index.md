# Java运维故障记录


# 1. sun.security.validator.ValidatorException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target; 

&gt; [接入大神的说明:&amp;ensp;https://www.jianshu.com/p/a12906b5d0f0](https://www.jianshu.com/p/a12906b5d0f0)

问题： 原有一个跑了很久的java项目在运行的时候报了上述一个错误，协助开发分析后发现是一个https的问题，检查了调用的接口地址，发现该接口地址的证书已经变成了`Let&#39;s Encrypt`的证书,多方查证后发现`Let&#39;s Encrypt`证书太新，使用的java版本太旧而并未加入根证书导致。解决方案是，要么升级java版本，要么导入根证书到jdk信任当中去。
本次记录加入信任方式 : 
1. (异常)测试 
```bash
$ git clone https://github.com/dimalinux/SSLPing.git

$ java -jar SSLPing/dist/SSLPing.jar helloworld.letsencrypt.org 443

# 测试结果如下 :
# javax.net.ssl.SSLHandshakeException: sun.security.validator.ValidatorException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target  
```

2. 解决 
```bash
$ wget https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem
$ keytool -trustcacerts -keystore &#34;$JAVA_HOME/jre/lib/security/cacerts&#34; -storepass changeit -noprompt -importcert -alias lets-encrypt-x3-cross-signed -file &#34;lets-encrypt-x3-cross-signed.pem&#34; 
# 导入结果:
# Certificate was added to keystore 
```

3. (成功)测试
```bash
$ java -jar SSLPing.jar visa.vippay.org 443
Successfully connected
```

# 2. `nginx` 反向代理 `Springboot` 容器应用，浏览器访问时静态资源间接性502
- 第一种情况: cookie携带的header泰斗，请求头数据过大
```ini
# nginx 调整一下参数 
proxy_buffer_size 64k;
proxy_buffers 32 32k;
proxy_busy_buffers_size 128k;
```

- 第二种情况: 防火墙问题，重置就好了(有容器的服务器一定不要开防火墙,不然各种问题)

# 2. cn.hutool.core.io.IORuntimeException: SSLHandshakeException: Received fatal alert: unrecognized_name
- 问题： 开发的一个`java`程序，连接测试环境的`api`正常，但切换到正式的`api`就报错
- 分析：可能，正式环境`https` 仅支持 `tls1.2`, 我们使用的`JDK`可能不支持
- 解决: 升级`JDK 8u111` 到  `JDK 8u322`，就可以了(实际环境, 基础容器 `java:8u111` 切换到`openjdk:8u322`)  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/java%E8%BF%90%E7%BB%B4%E6%95%85%E9%9A%9C%E8%AE%B0%E5%BD%95/  

