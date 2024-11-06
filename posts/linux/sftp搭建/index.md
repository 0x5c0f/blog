# SFTP搭建


{{&lt; admonition type=&#34;note&#34; title=&#34;&#34; open=true &gt;}}
**本文内容仅在`CentOS 7`上进行测试**
{{&lt; /admonition &gt;}}

# 前言 
&amp;emsp;&amp;emsp;文章介绍如何让`sftp`也可以实现`vsftpd`虚拟用户的功能。  
&amp;emsp;&amp;emsp;对于运维来说，我们使用文件传输功能的时候都是优先使用`vsftpd`，而不是`sftp`,多数原因我想应该都是因为`vsftpd`具有虚拟用户的功能，这个功能在针对特定的服务来说是非常友好的。比如`php`服务降权启动时，被读取文件的文件权限问题。    
&amp;emsp;&amp;emsp;上述的问题，`sftp`实际上也是可以解决，借助`useradd -o`选项实现。    

```bash
[cxd@0x5c0f ~][0]$ useradd --help
用法：useradd [选项] 登录名
      useradd -D
      useradd -D [选项]

选项：
  -h, --help                    显示此帮助信息并退出
  -k, --skel SKEL_DIR           使用此目录作为骨架目录
                                The skeleton directory, which contains files and directories to be copied in the user\&#39;s home directory,
                                when the home directory is created by useradd.

                                This option is only valid if the -m (or --create-home) option is specified.

                                If this option is not set, the skeleton directory is defined by the SKEL variable in
                                /etc/default/useradd or, by default, /etc/skel.

  -m, --create-home             创建用户的主目录
  -o, --non-unique              允许使用重复的 UID 创建用户
                                This option is only valid in combination with the -u option.
  -s, --shell SHELL             新账户的登录 shell
  -u, --uid UID                 新账户的用户 ID
  
```


# 正文
以下定义`WEBServer`的基础用户为`www`,以`php`为例,`php-fpm`启动进程所属则为`www`用户，那么也只能读取`www`用户所拥有操作权限的文件。

## 用户创建 
创建`sftp`登陆用户，使用`-o`选项，让当前用户保持与`www`同属主`UID`、同属组`GID`
```bash
$&gt; groupadd -o -g $(id -g www) webapp
$&gt; useradd -o -u $(id -u www) -g webapp -m -k $(mktemp -d) -s /bin/false webapp
# 此帐号只是sftp使用，所有创建时候添加-k选项，不让useradd复制/etc/skel下内容
```
帐号创建成功后，可在`/etc/passwd`中看到该帐号，此时应可以看到他的所属主和属组和`www`帐号一致

## 创建sftp登陆密钥 
```bash
# 由于ssh-keygen在创建默认密钥时无法更新此路径，因此需要主动创建该目录
$&gt; mkdir /home/webapp/.ssh
# 此处授权可以直接授权www:www，为了看起来更清晰，此处授权还是用创建时的用户，但无论使用的是那一个，系统显示都会是www
$&gt; chown webapp:webapp /home/webapp/.ssh

# 密钥创建
$&gt; su - webapp -s /bin/bash -c &#34;ssh-keygen -f ~/.ssh/id_rsa -t rsa -b 4096 -N &#39;&#39;&#34;
$&gt; su - webapp -s /bin/bash -c &#34;cat ~/.ssh/id_rsa.pub &gt; ~/.ssh/authorized_keys &amp;&amp; chmod 600 ~/.ssh/authorized_keys&#34;
```

## 修改/etc/ssh/sshd_config
```ini
# 注意此项, 网上的sftp搭建教程基本都是说需要将此项切换为, Subsystem       sftp    internal-sftp
# 切换后将绕过&#34;管理员可能依赖登录shell配置来阻止某些用户登录&#34;。但我们上述使用的是重复UID，所以此处不能更改
# 若更改，则会导致共用UID的用户之间可相互登陆。
# 差异参见: https://serverfault.com/questions/660160/openssh-difference-between-internal-sftp-and-sftp-server
# 差异参见: http://129.226.226.195/post/21921.html
Subsystem       sftp    /usr/libexec/openssh/sftp-server

# 指定匹配用户
Match User webapp
    # 用chroot将用户的根目录指向到固定位置
    ChrootDirectory  /sftpdir
    # -l 指定日志收集 -f 收集内容(应该是)  internal-sftp 请参看上述连接自行参悟
    ForceCommand internal-sftp -l INFO -f AUTH
    # 以下其他配置自行参悟
    PermitTTY no
    X11Forwarding no
    AllowTcpForwarding no
    PasswordAuthentication no
```

## 开始测试

```bash
# 上述操作完成后，还需要创建一个chroot目录
$&gt; mkdir /sftpdir 
$&gt; echo hello &gt; /sftpdir/readme.md

# 注意目录属主必须为root,属组可以不是，权限不能超过755 
$&gt; chown root.root /sftpdir 
$&gt; chmod 755 /sftpdir


# 重启sshd服务(重载也可以)
$&gt; systemctl reload sshd

## 登陆测试
$&gt; sftp -i /home/webapp/.ssh/id_rsa webapp@127.0.0.1
The authenticity of host &#39;127.0.0.1 (127.0.0.1)&#39; can&#39;t be established.
ECDSA key fingerprint is SHA256:hQkISJWcE&#43;gHf1WAT2bIWSwiAJRD81Bv3wZd&#43;1vZOuU.
ECDSA key fingerprint is MD5:0e:e5:1a:c7:6c:97:fb:48:95:d2:c9:86:bb:d0:7d:91.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added &#39;127.0.0.1&#39; (ECDSA) to the list of known hosts.
Connected to 127.0.0.1.
sftp&gt; ls -l
-rw-r--r--    1 0        0               6 Dec  8 06:31 readme.md
sftp&gt; pwd
Remote working directory: /
sftp&gt;  

```

## 后续
至此，`sftp`搭建完成, 当然由于 `/`目录属主为`root`,`sftp`目前只能登陆，无法上传，需要在`/sftpdir`目录下创建目录，然后授权`www`用户即可，在该目录下进行增、删、改操作。

## 其他问题
- 为什么使用`sftp`: `sftp`使用加密传输认证信息和传输的数据，相对`ftp`而言更为安全一点.

- 目录映射: 虚拟用户实现了，那该如何实现目录映射呢，软连接还是每个目录单独建一个用户？其实都不是，我们只需要借助`mount`命令的`bind`属性即可，具体使用方式请自行参悟(http://blog.0x5c0f.cc/2019/%E5%B8%B8%E7%94%A8%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/#mount---bind)

- 帐号管理: 共`UID`帐号(`webapp`)直接删除时候基本都会有提示，如果主帐号`www`正在使用(如`php`、`nginx`)，那么删除的时候就会提示无法删除，此时我们只需要强制删除即可(`userdel`的`-f`选项)，并不会影响主帐号和其他帐号(**注:这个我只在`CentOS 7`上进行过测试，理论上所有发行版是一致的**)

- 日志查看: `tail -f /var/log/secure`

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/sftp%E6%90%AD%E5%BB%BA/  

