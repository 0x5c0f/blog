# Java运维故障记录


# 1. sun.security.validator.ValidatorException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target; 

> [接入大神的说明:&ensp;https://www.jianshu.com/p/a12906b5d0f0](https://www.jianshu.com/p/a12906b5d0f0)

问题： 原有一个跑了很久的java项目在运行的时候报了上述一个错误，协助开发分析后发现是一个https的问题，检查了调用的接口地址，发现该接口地址的证书已经变成了`Let's Encrypt`的证书,多方查证后发现`Let's Encrypt`证书太新，使用的java版本太旧而并未加入根证书导致。解决方案是，要么升级java版本，要么导入根证书到jdk信任当中去。
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
$ keytool -trustcacerts -keystore "$JAVA_HOME/jre/lib/security/cacerts" -storepass changeit -noprompt -importcert -alias lets-encrypt-x3-cross-signed -file "lets-encrypt-x3-cross-signed.pem" 
# 导入结果:
# Certificate was added to keystore 
```

3. (成功)测试
```bash
$ java -jar SSLPing.jar visa.vippay.org 443
Successfully connected
```

