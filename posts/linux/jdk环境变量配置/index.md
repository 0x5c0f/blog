# JDK环境变量配置


# windows 
1.  新建`JAVA_HOME`变量：`JAVA_HOME=C:\Program Files\Java\jdk1.8.0_191`  
2.  新建`CLASSPATH`变量，变量值为：`.;%JAVA_HOME%\lib;%JAVA_HOME%\lib\tools.jar`  
3.  在`path`变量添加变量值：`%JAVA_HOME%\bin;%JAVA_HOME%\jre\bin`

# linux 
## 1. 配置文件方式修改
```shell
[root@00 ~]# vi /etc/profile ## vi ~/.bash_profile
export JAVA_HOME=/opt/java_1.8.0_45
export PATH=$JAVA_HOME/bin:$PATH 
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar 
[root@00 ~]# source /etc/profile  ## source ~/.bash_profile
```

## 2. 通过命令`update-alternatives` 管理
多版本共存时切换很方便： 
&gt; http://www.open-open.com/lib/view/open1452089422355.html 
```shell
## 第一个参数--install表示向update-alternatives注册服务名。
## 第二个参数是注册最终地址，成功后将会把命令在这个固定的目的地址做真实命令的软链，以后管理就是管理这个软链；
## 第三个参数：服务名，以后管理时以它为关联依据。
## 第四个参数，被管理的命令绝对路径。
## 第五个参数，优先级，数字越大优先级越高。

[root@00 ~]# update-alternatives --install /usr/bin/java java /opt/jdk1.8.0_121/bin/java 1070
[root@00 ~]# update-alternatives --install /usr/bin/javac javac /opt/jdk1.8.0_121/bin/javac 1070
[root@00 ~]# update-alternatives --install /usr/bin/jar jar /opt/jdk1.8.0_121/bin/jar 1070
[root@00 ~]# update-alternatives --install /usr/bin/javah javah /opt/jdk1.8.0_121/bin/javah 1070
[root@00 ~]# update-alternatives --install /usr/bin/javap javap /opt/jdk1.8.0_121/bin/javap 1070
[root@00 ~]# update-alternatives --config java
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/jdk%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E9%85%8D%E7%BD%AE/  

