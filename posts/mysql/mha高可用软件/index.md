# Mysql MHA高可用软件



# MHA(Master HA) 高可用软件
自动主从切换工具 

&gt; https://github.com/yoshinorim/mha4mysql-manager  

&gt; https://github.com/yoshinorim/mha4mysql-node 

# 基础环境 
环境准备(1管理, 1主2从): 
- manager: 172.16.10.10(10.0.2.10)
- master01: 172.16.10.25(10.0.2.25) 
- slave01: 172.16.10.26(10.0.2.26) 
- slave02: 172.16.10.27(10.0.2.27) 

# 准备
- 关闭所有节点`relay_log`自动清理功能
```bash
# 临时 
sql&gt; set global relay_log_purge = 0;

# 永久
$&gt; vim /etc/my.cnf
relay_log_purge = 0
```
- 设置从库只读功
```bash
sql&gt; set global read_only=1
```
- 各个节点互连
```bash
$&gt; ssh-keygen 
$&gt; ssh-copy-id root@10.0.2.25
$&gt; ssh-copy-id root@10.0.2.26
$&gt; ssh-copy-id root@10.0.2.27

```

# 安装 
```bash
## 所有节点安装mha node软件包
# mha node 软件包依赖
$&gt; yum install perl-DBD-MySQL -y 

## mha node 软件安装
$&gt; yum install -y mha4mysql-node-0.58-0.el7.centos.noarch.rpm

## 主库添加MHA管理用户
$&gt; mysql -uroot -e &#34;grant all privileges on *.* to mha@&#39;10.0.2.%&#39; identified by &#39;mha&#39;;&#34;

## 管理机安装manager软件(管理节点安装，建议独立一台或非主节点服务器)
# 依赖环境
$&gt; yum install perl-Config-Tiny epel-release perl-Log-Dispatch perl-Parallel-ForkManager perl-Time-HiRes -y 

# mha manager 软件安装
$&gt; yum install perl-Config-Tiny epel-release perl-Log-Dispatch perl-Parallel-ForkManager perl-Time-HiRes -y 
$&gt; yum install mha4mysql-manager-0.58-0.el7.centos.noarch.rpm -y

# 创建配置文件目录 
$&gt; mkdir /etc/mha
$&gt; mkdir -p /var/log/mha/app1
$&gt; vim /etc/mha/app1.cnf
[server default]
# 用于管理stop slave,change master,reset slave等操作的账号，缺省为root
user=mha
password=mha

# mha manager生成的日志据对路径，如果没有设置，mha manager将打印在标准输出，标准错误输出上
manager_log=/var/log/mha/app1/manager

# mha manager生成的相关状态文件的绝对路径，如果没有设置，则默认使用/var/tmp
manager_workdir=/var/log/mha/app1

# 在master上生成binlog的绝对路径
master_binlog_dir=/data/mysqldb/binlog

# 这个参数表示mha manager多久ping（执行select ping sql语句）一次master，连续三个丢失ping连接，mha master就判定mater死了，因此，通过4次ping间隔的最大时间的机制来发现故障，默认是3，表示间隔是3秒
ping_interval=2

# repl_user参数指定的用户名密码
repl_user=repl
repl_password=123123

# 访问MHA manger和MHA mysql节点的OS系统帐号 
ssh_user=root

# &gt; https://www.cnblogs.com/xiaoboluo768/p/5973827.html
# 故障时自动调用的脚本，一般用于自动vip漂移
master_ip_failover_script=/usr/local/bin/master_ip_failover

# 故障时发送报告调用的脚本
# report_script=

# 节点信息配置，下列顺序将影响选主的权重，号码越小权重越高 
[server1]
hostname=10.0.2.25
port=3306

[server2]
hostname=10.0.2.26
port=3306

[server3]
hostname=10.0.2.27
port=3306

# binlogserver配置，要求一台额外的机器，mysql 5.6以上，支持gtid并开启, 其作用是用于同步主库的binlog内容

# 必须叫这个名字binlog1，是MHA定义好的 
[binlog1]
# 永远不会被选主
no_master=1
hostname=10.0.2.27
port=3306
# 需要手动创建这个目录，并目录不能与原目录一致
master_binlog_dir=/data/mysqldb/binlog-server


# 状态检查
## 互信状态检查 
$&gt; masterha_check_ssh --conf=/etc/mha/app1.cnf

## 主从状态检查 
$&gt; masterha_check_repl --conf=/etc/mha/app1.cnf


# 开启MHA --remove_dead_master_conf 自动将故障节点从配置文件中移除 --ignore_last_failover
$&gt; nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover &lt; /dev/null &gt; /var/log/mha/app1/manager.log 2&gt;&amp;1 &amp;

# 查看MHA状态
$&gt; masterha_check_status --conf=/etc/mha/app1.cnf 

```

## 故障演示
 监控MHA Manager日志/var/log/mha/manager，手动关闭mysql主库(10.0.2.25), 日志体现，开始检查主库状态，在每隔2秒检查共3次后，第四次仍然检查失败，自动切换主库为第二个节点(10.0.2.26-自动计算), 从配置文件中删除故障节点配置，并自动关闭MHA Manager程序。

## 故障解决 
恢复故障主节点，并将故障主节点作为从节点重新恢复(生产环境建议直接重建加入)加入到集群内部去(在MHA Manager管理日志中,会包含恢复时该执行的命令change master xxxx), 执行change master xxxx(mha日志中有体现)，然后start salve，最后手动添加故障节点配置到mha配置文件(/etc/mha/app1.cnf)中，重新启动mha管理

# MHA binlongserver 
```bash
# 1. binlogserver配置，要求一台额外的机器，mysql 5.6以上，支持gtid并开启, 其作用是用于同步主库的binlog内容
$&gt; vim /etc/mha/app1.cnf 
# 必须叫这个名字binlog1，是MHA定义好的 
[binlog1]
# 永远不会被选主
no_master=1
hostname=10.0.2.27
port=3306
# 需要手动创建这个目录，并目录不能与原目录一致
master_binlog_dir=/data/mysqldb/binlog-server


# 2. 配置节点创建对应目录(权限)
$&gt; mkdir -p /data/mysqldb/binlog-server

# 3. 拉取主库的binlog日志,先确认下主库是从多少开始的  show binary logs; 需全部拉取下来
# binlog拉取本身和mha没什么关系，但需要在mha启动是前处理好，否这mha将无法正常启动 
$&gt; cd /data/mysqldb/binlog-server &amp;&amp; mysqlbinlog -R --host=10.0.2.26 --user=mha --password=mha --raw --stop-never mysql-bin.000001 &amp;

# 4. 重启mha 
$&gt; masterha_stop --conf=/etc/mha/app1.cnf 
$&gt; nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover &lt; /dev/null &gt; /var/log/mha/app1/manager.log 2&gt;&amp;1 &amp; 

# 5. 故障演示 
# 主库宕机，binlogserver自动停止，manager也会自动停止
# 主库宕机，binlogserver日志也是无效了，需要重新同步 
# 解决方案:
# 1. 重新获取新主库的binlog到binlogserver中
# 2. 重新配置配文件的binlog server信息
# 3. 最后在启动mha

```

# MHA 的vip功能 
mha提供了vip接口,使用脚本自己实现，源码包中也提供了模板(perl，看不懂，找的这个虽然也是perl的)，配置文件`/etc/mha/app1.cnf`中`[server default]`下添加`master_ip_failover_script=/usr/local/bin/master_ip_failover` , 然后在主库上，手动生成第一个vip地址`ip addr add 10.0.2.8/24 dev eth0 `,以下为脚本内容 

```pl
$&gt; vim  /usr/local/bin/master_ip_failover  # 注意执行权限 
#!/usr/bin/env perl
use strict;
use warnings FATAL =&gt; &#39;all&#39;;

use Getopt::Long;

my (
    $command,          $ssh_user,        $orig_master_host, $orig_master_ip,
    $orig_master_port, $new_master_host, $new_master_ip,    $new_master_port
);

my $vip = &#39;10.0.2.8/24&#39;;  # Virtual IP

# 通过ip绑定的ifconfig 无法查看到
my $ssh_start_vip = &#34;/sbin/ip addr add $vip dev eth0&#34;;
my $ssh_stop_vip = &#34;/sbin/ip addr del $vip dev eth0&#34;;  # 

# my $key = &#34;1&#34;;
# my $ssh_start_vip = &#34;/sbin/ifconfig eth0:$key $vip&#34;;
# my $ssh_stop_vip = &#34;/sbin/ifconfig eth0:$key down&#34;;

$ssh_user = &#34;root&#34;;
GetOptions(
    &#39;command=s&#39;          =&gt; \$command,
    &#39;ssh_user=s&#39;         =&gt; \$ssh_user,
    &#39;orig_master_host=s&#39; =&gt; \$orig_master_host,
    &#39;orig_master_ip=s&#39;   =&gt; \$orig_master_ip,
    &#39;orig_master_port=i&#39; =&gt; \$orig_master_port,
    &#39;new_master_host=s&#39;  =&gt; \$new_master_host,
    &#39;new_master_ip=s&#39;    =&gt; \$new_master_ip,
    &#39;new_master_port=i&#39;  =&gt; \$new_master_port,
);

exit &amp;main();

sub main {

    print &#34;\n\nIN SCRIPT TEST====$ssh_stop_vip==$ssh_start_vip===\n\n&#34;;

    if ( $command eq &#34;stop&#34; || $command eq &#34;stopssh&#34; ) {

        # $orig_master_host, $orig_master_ip, $orig_master_port are passed.
        # If you manage master ip address at global catalog database,
        # invalidate orig_master_ip here.
        my $exit_code = 1;
        eval {
            print &#34;Disabling the VIP on old master: $orig_master_host \n&#34;;
            &amp;stop_vip();
            $exit_code = 0;
        };
        if ($@) {
            warn &#34;Got Error: $@\n&#34;;
            exit $exit_code;
        }
        exit $exit_code;
    }
    elsif ( $command eq &#34;start&#34; ) {

        # all arguments are passed.
        # If you manage master ip address at global catalog database,
        # activate new_master_ip here.
        # You can also grant write access (create user, set read_only=0, etc) here.
        my $exit_code = 10;
        eval {
            print &#34;Enabling the VIP - $vip on the new master - $new_master_host \n&#34;;
            &amp;start_vip();
            $exit_code = 0;
        };
        if ($@) {
            warn $@;
            exit $exit_code;
        }
        exit $exit_code;
    }
    elsif ( $command eq &#34;status&#34; ) {
        print &#34;Checking the Status of the script.. OK \n&#34;;
        `ssh $ssh_user\@cluster1 \&#34; $ssh_start_vip \&#34;`;
        exit 0;
    }
    else {
        &amp;usage();
        exit 1;
    }
}

# A simple system call that enable the VIP on the new master
sub start_vip() {
    `ssh $ssh_user\@$new_master_host \&#34; $ssh_start_vip \&#34;`;
}
# A simple system call that disable the VIP on the old_master
sub stop_vip() {
    `ssh $ssh_user\@$orig_master_host \&#34; $ssh_stop_vip \&#34;`;
}

sub usage {
    print
    &#34;Usage: master_ip_failover --command=start|stop|stopssh|status --orig_master_host=host --orig_master_ip=ip --orig_master_port=port --new_master_host=host --new_master_ip=ip --new_master_port=port\n&#34;;
}
```

# 软件构成
Manager 工具包主要包括  

| -                         | -                          |
| :------------------------ | :------------------------- |
| `masterha_check_ssh`      | 检查MHA的SSH配置状况       |
| `masterha_check_repl`     | 检查MySQL复制情况          |
| `masterha_check_status`   | 检测当前MHA运行状态        |
| `masterha_manager`        | 启动MHA                    |
| `masterha_master_monitor` | 检测master是否宕机         |
| `masterha_master_switch`  | 控制故障转移(自动或手动)   |
| `masterha_conf_host`      | 添加或删除配置的server信息 |

Node工具包(这些工具通常有MHA Manager的脚本处罚，无需认为操作)

| -                          | -                                                  |
| :------------------------- | :------------------------------------------------- |
| `save_binary_log`          | 保存和复制master的二进制日志                       |
| `apply_diff_relay_log`     | 识别差异的中级日志事件并将其差异的事件应用于其他的 |
| `slave filter_mysqlbinlog` | 去除不必要的ROLLBACK事件(MHA已不再使用这个工具)    |
| `purge_relay_log`          | 清除中级日志(不会阻塞SQL线程)                      |

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/mha%E9%AB%98%E5%8F%AF%E7%94%A8%E8%BD%AF%E4%BB%B6/  

