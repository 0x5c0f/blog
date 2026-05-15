# Tomcat项目部署方案


第一种方法：在tomcat中的conf目录中，在server.xml中的， <host/ >节点中添加：  
```xml
<Context   path="/hello"   docBase="D:/work/webapps/test_web"   debug="0"   privileged="true" ></Context >\
```
至于Context节点属性，可详细见相关文档。  
第二种方法：将web项目文件件拷贝到webapps目录中。  
第三种方法：很灵活，在conf目录中，新建   Catalina\localhost目录，在该目录中新建一个xml文件，文件名跟项目名称相同，该xml文件的内容为：  
```xml
<?xml version='1.0' encoding='utf-8'?>
<Context crossContext="true" docBase="D:/work/webapps/test_web" path="/test1" reloadable="true">
</Context>
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/other/tomcat%E9%A1%B9%E7%9B%AE%E9%83%A8%E7%BD%B2%E6%96%B9%E6%A1%88/  

