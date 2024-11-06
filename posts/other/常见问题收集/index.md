# 那些有用没用的问题收集


# 1. 计划任务配置中/etc/crontab和crontab -e的区别
&gt; https://blog.csdn.net/qq_36937234/article/details/80558871
## 1.1. 二者差异  
1. 级别差异  
`/etc/crontab`是系统级别的crontab，系统的设置  
`crontab -e`是用户级的crontab  
linux下实际保存在`/var/spool/cron/username`中  
**有些系统设置即使用root账号`crontab -e`也不行，必须放到`/etc/crontab`中**  
2. 语法区别  
/etc/crontab 有用户字段  
`*/5 * * * * root /root/scripts/refresh.sh &gt;/dev/null 2&gt;&amp;1`   
crontab -e中不能设置用户字段  
`1 * */1 * * /bin/sh /root/scripts/refresh.sh &gt; /dev/nul 2&gt;&amp;1`   
## 1.2. 注意点   
1. `/var/spool/clientmqueue`目录过大，占用磁盘满了  
原因：`/var/spool/clientmqueue`是如果系统中有用户开启了cron，而cron中执行的程序有输出内容，输出内容会以邮件形式发给cron的用户，而sendmail没有启动所以就产生了这些文件  
解决：将输出重定向，如`&gt; /dev/null` 2&gt;&amp;1，补充：错误输出也要重定向  
2. `/etc/crontab`的读写权限 
不要随意改动这个文件的读写权限，这个文件应该设置成644或者600，否则会报`(system) BAD　FILE MODE (/etc/crontab )`  
3. 手动能够执行，但是crontab脚本里面不执行  
解决：检查下crontab的环境变量 ：  
```bash
HELL=/bin/bash 
PATH=/sbin:/bin:/usr/sbin:/usr/bin 
MAILTO=root 
HOME=/
```
# 2. CentOS 7.x 设置开机启动项报错，或软连接报 Too many levels of symbolic links
这个问题报错原因其实已经说明得很明显了，实际上就是在同一个地方创建了同样名字的多个软连接，之所以记录是应为网上鬼扯了一些毫无关联解决方案，可能也存在那样的问题，这儿遇见的是在设置开机启动项`systemctl enable`的时候报的错，检查了下发现，`systemctl enable`设置的目录确实是已经存在了一个同名的了，把原来的那个删掉或者改个名字，在创建正常


# 3. HTTP 响应码分类 
&gt; [https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status) 

# 4. Git 和 SVN的区别  
1. `git`是分布式的，`svn`是集中式的   
2. `git`存储数据是以元数据形式存储，`svn`是按文件，原数据怎样的结构，存储就是怎样的结构  
3. 分支不同，`svn`的分支就是复制了一个目录出来

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98%E6%94%B6%E9%9B%86/  

