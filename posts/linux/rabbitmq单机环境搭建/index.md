# RabbitMQ单机环境搭建


{{&lt; admonition type=note title=&#34;前言&#34; open=true &gt;}}
本文内容基于 `Alibaba CloudLinux 3` 操作系统部署、测试 
- [`Erlang 26.2.5.6-1`](https://github.com/rabbitmq/erlang-rpm/releases) 
- [`RabbitMQ 3.13.7-1`](https://github.com/rabbitmq/rabbitmq-server/releases)
{{&lt; /admonition &gt;}}

# `RabbitMQ` 单机部署
## 安装
- 安装依赖环境
    ```bash
    $&gt; dnf install unixODBC unixODBC-devel SDL make gcc gcc-c&#43;&#43; kernel-devel m4 ncurses-devel openssl-devel -y
    ```

- 通过`RPM`包，安装`erlang`和`rabbitmq`。`RabbitMQ`是基于`Erlang`语言编写的，所以需要先安装`Erlang`(*另: 不同版本的`RabbitMQ`所使用的`Erlang`版本不一样,注意自行判断*)。  
    ```bash
    $&gt; dnf install erlang-26.2.5.6-1.el8.x86_64.rpm rabbitmq-server-3.13.7-1.el8.noarch.rpm -y
    ```
## 配置 
- 启动 `RabbitMQ` 
    ```bash
    $&gt; systemctl start rabbitmq-server.service
    ```

- 启动 `RabbitMQ` 的 `Web UI` 界面, 有一个默认帐号(`guest/guest`), 但该帐号仅限于本地登陆使用 `http://localhost:15672`  
    ```bash
    $&gt; rabbitmq-plugins enable rabbitmq_management
    Enabling plugins on node rabbit@b05eab96337f:
    rabbitmq_management
    The following plugins have been configured:
    rabbitmq_management
    rabbitmq_management_agent
    rabbitmq_web_dispatch
    Applying plugin configuration to rabbit@b05eab96337f...
    The following plugins have been enabled:
    rabbitmq_management
    rabbitmq_management_agent
    rabbitmq_web_dispatch

    started 3 plugins.
    ```

- 修改 `RabbitMQ` 用户信息  
    ```bash
    $&gt; rabbitmqctl list_users                       # 查看已有的用户
    Listing users ...
    user	tags
    guest	[administrator]

    $&gt; rabbitmqctl list_permissions                 # 显示每个用户在 RabbitMQ 中的各种权限
    Listing permissions for vhost &#34;/&#34; ...
    user	configure	write	read
    guest	.*	.*	.*

    $&gt; rabbitmqctl delete_user guest                # 删除默认的 guest 用户，防止未经授权的访问 
    Deleting user \&#34;guest\&#34; ...

    # rabbitmqctl add_user &lt;username&gt; &lt;password&gt;
    $&gt; rabbitmqctl add_user admin admin@123                 # 创建新的用户 
    Adding user &#34;admin&#34; ...
    Done. Don\&#39;t forget to grant the user permissions to some virtual hosts! See &#39;rabbitmqctl help set_permissions&#39; to learn more. 

    $&gt; rabbitmqctl set_user_tags admin administrator        # 用于赋予用户特定的角色或权限级别的标签
    Setting tags for user &#34;admin&#34; to [administrator] ...

    $&gt; rabbitmqctl set_permissions admin &#34;.*&#34; &#34;.*&#34; &#34;.*&#34;     # 设置权限。这里的三个&#34;.*&#34;分别对应配置（configure）权限、写入（write）权限和读取（read）权限。&#34;.*&#34;是一个通配符，表示对所有资源（如所有队列、交换器等）都赋予相应的权限。
    Setting permissions for user &#34;admin&#34; in vhost &#34;/&#34; ...
    ```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/rabbitmq%E5%8D%95%E6%9C%BA%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA/  

