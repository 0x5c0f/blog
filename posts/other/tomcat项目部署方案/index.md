# Tomcat项目部署方案


第一种方法：在tomcat中的conf目录中，在server.xml中的， &lt;host/ &gt;节点中添加：  
```xml
&lt;Context   path=&#34;/hello&#34;   docBase=&#34;D:/work/webapps/test_web&#34;   debug=&#34;0&#34;   privileged=&#34;true&#34; &gt;&lt;/Context &gt;\
```
至于Context节点属性，可详细见相关文档。  
第二种方法：将web项目文件件拷贝到webapps目录中。  
第三种方法：很灵活，在conf目录中，新建   Catalina\localhost目录，在该目录中新建一个xml文件，文件名跟项目名称相同，该xml文件的内容为：  
```xml
&lt;?xml version=&#39;1.0&#39; encoding=&#39;utf-8&#39;?&gt;
&lt;Context crossContext=&#34;true&#34; docBase=&#34;D:/work/webapps/test_web&#34; path=&#34;/test1&#34; reloadable=&#34;true&#34;&gt;
&lt;/Context&gt;
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/other/tomcat%E9%A1%B9%E7%9B%AE%E9%83%A8%E7%BD%B2%E6%96%B9%E6%A1%88/  

