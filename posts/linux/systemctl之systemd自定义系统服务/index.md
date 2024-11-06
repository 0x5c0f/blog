# Systemctl之systemd自定义系统服务


{{&lt; admonition type=quote title=&#34;以下为资料来源,由本站收集重新整理发布,仅用于个人收藏,转载请直接标注以下来源连接&#34; open=true &gt;}}

&gt; [http://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-commands.html](http://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-commands.html)  

&gt; [http://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-part-two.html](http://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-part-two.html) 


&gt; [http://www.ruanyifeng.com/blog/2018/03/systemd-timer.html](http://www.ruanyifeng.com/blog/2018/03/systemd-timer.html)  

{{&lt; /admonition &gt;}}

------  

# 1. [Unit] 
`Unit` 定义启动顺序与依赖关系  

单元(Unit)是 `Systemd` 的最小功能单位，是单个进程的描述。一个个小的单元互相调用和依赖，组成一个庞大的任务管理系统   
&lt;details&gt;
&lt;summary&gt; 其他的单元类型 &lt;/summary&gt;

&gt; [https://www.digitalocean.com/community/tutorials/understanding-systemd-units-and-unit-files](https://www.digitalocean.com/community/tutorials/understanding-systemd-units-and-unit-files)  
&gt; `Systemd` 根据他们描述的资源类型对单位进行分类。确定单元类型的最简单方法是使用其类型后缀，该后缀附加到资源名称的末尾。  
&gt; 以下列表描述了可用于以下各项的单位类型`systemd`:    
&gt; - `.service`: 服务单元描述如何管理服务器上的服务或应用程序。这将包括如何启动或停止服务，应在何种情况下自动启动服务，以及相关软件的依赖关系和订购信息。
&gt; - `.socket`: 套接字单元文件描述网络或`IPC`套接字，或`systemd`用于基于套接字的激活的FIFO缓冲区。这些`.service`文件始终具有一个关联文件，该文件将在本单元定义的套接字上看到活动时启动。
&gt; - `.device`: 描述已被指定为需要`systemd`管理的设备`udev`或`sysfs`文件系统的单元。并非所有设备都有`.device`文件。`.device`可能需要单元的一些场景是用于订购，安装和访问设备。
&gt; - `.mount`: 此单元定义要由其管理的系统上的挂载点`systemd`。这些以安装路径命名，斜杠更改为破折号。其中的条目`/etc/fstab`可以自动创建单位。
&gt; - `.automount`: 一个`.automount`单元配置将自动挂载的挂载点。这些必须以它们引用的挂载点命名，并且必须具有匹配`.mount`单元以定义挂载的细节。
&gt; - `.swap`: 此单元描述系统上的交换空间。这些单元的名称必须反映空间的设备或文件路径。
&gt; - `.target`: 目标单元用于在启动或更改状态时为其他单元提供同步点。它们还可用于使系统进入新状态。其他单位指定它们与目标的关系以与目标的操作联系起来。
&gt; - `.path`: 此单元定义可用于基于路径的激活的路径。默认情况下，`.service`当路径达到指定状态时，将启动相同基本名称的单元。这用于`inotify`监视更改的路径。
&gt; - `.timer`: .timer单元定义将由其管理的计时器`systemd`，类似于`cron`延迟或计划激活的作业。达到计时器时将启动匹配单元。
&gt; - `.snapshot`: 命令`.snapshot`自动创建一个单元`systemctl snapshot`。它允许您在进行更改后重建系统的当前状态。快照不会跨会话生存，并用于回滚临时状态。
&gt; - `.slice`: `.slice`单元与`Linux`控制组节点关联，允许限制资源或将资源分配给与该片关联的任何进程。该名称反映了它在`cgroup`树中的层次结构位置。默认情况下，单位会根据其类型放置在某些切片中。
&gt; - `.scope`: 范围单元`systemd`由从其总线接口接收的信息自动创建。这些用于管理外部创建的系统进程集。

&lt;/details&gt;


```ini
Description=当前服务的描述  
Documentation=给出文档的位置,一般就是服务启动命令的帮助文档  
After=表示如果此字段标记的服务若需要启动,那么当前定义的服务需要在此标记服务器启动之后.  
Before=表示如果此字段标记的服务若需要启动,那么当前定义的服务需要在此标记服务器启动之前.  
Wants=表示此字段标记的服务与当前定义服务存在&#34;弱依赖&#34;关系,即表示当前定义的节点服务启动失败或者停止运行,不影响当前定义的服务继续执行.  
Requires=表示此字段标记的服务与当前定义服务存在&#34;强依赖&#34;关系,即表示当前定义的节点服务启动失败或者停止运行,那么当前定义的服务也必须停止.  
```


# 2. [Service]
`Service`区块定义如何启动当前服务。  
注意：[`Service`]部分的启动、重启、停止命令全部要求使用绝对路径，使用相对路径则会报错！   
```ini
Environment=指定当前服务运行的环境参数,该值使用key=value健值对
;Environment=LANG=C 
EnvironmentFile=指定当前服务的环境参数文件。该文件内部的key=value键值对，可以用$key的形式，在当前配置文件中获取。 
Type=字段定义服务启动类型
;Type=simple(默认值): ExecStart字段启动的进程为主进程
;Type=exec: 类似于simple，simple表示当fork()函数返回时，即表示启动完成，而exec则表示仅在fork()和execve()函数都执行成功时，才算启动完成.
;Type=forking：ExecStart字段将以fork()方式启动，此时父进程将会退出，子进程将成为主进程
;Type=oneshot：类似于simple，但只执行一次，Systemd 会等它执行完，才启动其他服务
;Type=dbus：类似于simple，但会等待 D-Bus 信号后启动
;Type=notify：类似于simple，启动结束后会发出通知信号，然后 Systemd 再启动其他服务
;Type=idle：类似于simple，但是要等到其他任务都执行完，才会启动该服务。一种使用场合是为让该服务的输出，不与其他服务的输出相混合
TimeoutStopSec=停止服务时的等待的秒数，如果超过这个时间服务仍然没有停止，systemd 会使用 SIGKILL 信号强行杀死服务的进程。 
TimeoutStartSec=启动服务时的等待的秒数，如果超过这个时间服务任然没有执行完所有的启动命令，则 systemd 会认为服务自动失败。 
ExecStart=启动服务时执行的命令
ExecReload=重启服务时执行的命令
ExecStop=停止服务时执行的命令
ExecStartPre=启动服务之前执行的命令
ExecStartPost=启动服务之后执行的命令
ExecStopPost=停止服务之后执行的命令
User=指定运行服务的用户，会影响服务对本地文件系统的访问权限。
Group=指定运行服务的用户组，会影响服务对本地文件系统的访问权限。
RootDirectory=指定服务进程的根目录（默认: / ），如果配置了这个参数后，服务将无法访问指定目录以外的任何文件。
Nice=服务的进程优先级，值越小优先级越高，默认为0。-20为最高优先级，19为最低优先级 
KillMode=表示systemd如何停止当前定义服务
;KillMode=control-group（默认值）：当前控制组里面的所有子进程，都会被杀掉
;KillMode=process：只杀主进程
;KillMode=mixed：主进程将收到 SIGTERM 信号，子进程收到 SIGKILL 信号
;KillMode=none：没有进程会被杀掉，只是执行服务的 stop 命令。
Restart=定义了当前定义服务退出后，Systemd的重启方式。
;Restart=no（默认值）：退出后不会重启
;Restart=on-success：只有正常退出时（退出状态码为0），才会重启
;Restart=on-failure：非正常退出时（退出状态码非0），包括被信号终止和超时，才会重启
;Restart=on-abnormal：只有被信号终止和超时，才会重启
;Restart=on-abort：只有在收到没有捕捉到的信号终止时，才会重启
;Restart=on-watchdog：超时退出，才会重启
;Restart=always：不管是什么退出原因，总是重启
RestartSec=12s 表示 Systemd 重启服务之前，需要等待的秒数。
```

# 3. [Install]
`Install`区块，定义如何安装这个配置文件，即怎样做到开机启动。  
```ini
WantedBy=表示该服务所在的Target
; Target的含义是服务组，表示一组服务,一般来说，常用的 Target 有两个：一个是multi-user.target，表示多用户命令行状态；另一个是graphical.target，表示图形用户状态，它依赖于multi-user.target 
```

# 4. systemd 的定时任务(.timer)
所谓定时任务，就是未来的某个或多个时点，预定要执行的任务，比如每五分钟收一次邮件、每天半夜两点分析一下日志等等。  
`Linux` 系统通常都使用 `cron` 设置定时任务，但是 `Systemd` 也有这个功能，而且优点显著  
- 自动生成日志，配合 `Systemd` 的日志工具，很方便除错
- 可以设置内存和 `CPU` 的使用额度，比如最多使用50%的 `CPU`
- 任务可以拆分，依赖其他 `Systemd` 单元，完成非常复杂的任务

每个单元都有一个单元描述文件，它们分散在三个目录。  
- `/lib/systemd/system`：系统默认的单元文件  
- `/etc/systemd/system`：用户安装的软件的单元文件  
- `/usr/lib/systemd/system`：用户自己定义的单元文件  

`systemd` 定时任务分为两个部分 
1. 任务执行部分`.service`
    - 用于定义如何执行该任务,无需配置如何安装(即定义`Install`) 
2. 定时执行部分`.timer`
    - 用于定义什么时间执行该任务  
    - [`[Timer]` 节点](#timer)
  
# 5. systemd 常用相关命令
## 5.1. systemctl 系统相关
```bash
# 重启系统
$&gt; sudo systemctl reboot

# 关闭系统，切断电源
$&gt; sudo systemctl poweroff

# CPU停止工作
$&gt; sudo systemctl halt

# 暂停系统
$&gt; sudo systemctl suspend

# 让系统进入冬眠状态
$&gt; sudo systemctl hibernate

# 让系统进入交互式休眠状态
$&gt; sudo systemctl hybrid-sleep

# 启动进入救援状态（单用户状态）
$&gt; sudo systemctl rescue
```

## 5.2. systemd-analyze命令用于查看启动耗时 
```bash
# 查看启动耗时
$&gt; systemd-analyze

# 查看每个服务的启动耗时
$&gt; systemd-analyze blame

# 显示瀑布状的启动过程流
$&gt; systemd-analyze critical-chain

# 显示指定服务的启动流
$&gt; systemd-analyze critical-chain atd.service
```

## 5.3. loginctl命令用于查看当前登录的用户 
```bash
# 列出当前session
$&gt; loginctl list-sessions

# 列出当前登录用户
$&gt; loginctl list-users

# 列出显示指定用户的信息
$&gt; loginctl show-user ruanyf
```

## 5.4. systemctl 状态查询命令  
```bash
# 显示某个 Unit 是否正在运行
$&gt; systemctl is-active application.service

# 显示某个 Unit 是否处于启动失败状态
$&gt; systemctl is-failed application.service

# 显示某个 Unit 服务是否建立了启动链接
$&gt; systemctl is-enabled application.service
```

## 5.5. 系统日志管理
```bash 
# 查看所有日志（默认情况下 ，只保存本次启动的日志）
$&gt; sudo journalctl

# 查看内核日志（不显示应用日志）
$&gt; sudo journalctl -k

# 查看系统本次启动的日志
$&gt; sudo journalctl -b
$&gt; sudo journalctl -b -0

# 查看上一次启动的日志（需更改设置）
$&gt; sudo journalctl -b -1

# 查看指定时间的日志
$&gt; sudo journalctl --since=&#34;2012-10-30 18:17:16&#34;
$&gt; sudo journalctl --since &#34;20 min ago&#34;
$&gt; sudo journalctl --since yesterday
$&gt; sudo journalctl --since &#34;2015-01-10&#34; --until &#34;2015-01-11 03:00&#34;
$&gt; sudo journalctl --since 09:00 --until &#34;1 hour ago&#34;

# 显示尾部的最新10行日志
$&gt; sudo journalctl -n

# 显示尾部指定行数的日志
$&gt; sudo journalctl -n 20

# 实时滚动显示最新日志
$&gt; sudo journalctl -f

# 查看指定服务的日志
$&gt; sudo journalctl /usr/lib/systemd/systemd

# 查看指定进程的日志
$&gt; sudo journalctl _PID=1

# 查看某个路径的脚本的日志
$&gt; sudo journalctl /usr/bin/bash

# 查看指定用户的日志
$&gt; sudo journalctl _UID=33 --since today

# 查看某个 Unit 的日志
$&gt; sudo journalctl -u nginx.service
$&gt; sudo journalctl -u nginx.service --since today

# 实时滚动显示某个 Unit 的最新日志
$&gt; sudo journalctl -u nginx.service -f

# 合并显示多个 Unit 的日志
$&gt; journalctl -u nginx.service -u php-fpm.service --since today

# 查看指定优先级（及其以上级别）的日志，共有8级
# 0: emerg
# 1: alert
# 2: crit
# 3: err
# 4: warning
# 5: notice
# 6: info
# 7: debug
$&gt; sudo journalctl -p err -b

# 日志默认分页输出，--no-pager 改为正常的标准输出
$&gt; sudo journalctl --no-pager

# 以 JSON 格式（单行）输出
$&gt; sudo journalctl -b -u nginx.service -o json

# 以 JSON 格式（多行）输出，可读性更好
$&gt; sudo journalctl -b -u nginx.service -o json-pretty

# 显示日志占据的硬盘空间
$&gt; sudo journalctl --disk-usage

# 指定日志文件占据的最大空间
$&gt; sudo journalctl --vacuum-size=1G

# 指定日志文件保存多久
$&gt; sudo journalctl --vacuum-time=1years
```

------  

&lt;span id=&#34;timer&#34;&gt;&lt;/span&gt;
1. 对于`[Timer]`节点, `Systemd` 提供以下一些字段。  
    - `OnActiveSec`：定时器生效后，多少时间开始执行任务  
    - `OnBootSec`：系统启动后，多少时间开始执行任务  
    - `OnStartupSec``：Systemd` 进程启动后，多少时间开始执行任务  
    - `OnUnitActiveSec`：该单元上次执行后，等多少时间再次执行(s/h)  
        - 示例: 
            - `OnUnitActiveSec=1h` 表示一小时执行一次任务
            - `OnUnitActiveSec=*-*-* 02:00:00`表示每天凌晨两点执行  
            - `OnUnitActiveSec=Mon *-*-* 02:00:00`表示每周一凌晨两点执行  
            - &gt; 官方文档 [https://www.freedesktop.org/software/systemd/man/systemd.time.html](https://www.freedesktop.org/software/systemd/man/systemd.time.html)
    - `OnUnitInactiveSec`： 定时器上次关闭后多少时间，再次执行  
    - `OnCalendar`：基于绝对时间，而不是相对时间执行  
    - `AccuracySec`：如果因为各种原因，任务必须推迟执行，推迟的最大秒数，默认是60秒  
    - `Unit`：真正要执行的任务，默认是同名的带有`.service`后缀的单元  
    - `Persistent`：如果设置了该字段，即使定时器到时没有启动，也会自动执行相应的单元  
    - `WakeSystem`：如果系统休眠，是否自动唤醒系统  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/systemctl%E4%B9%8Bsystemd%E8%87%AA%E5%AE%9A%E4%B9%89%E7%B3%BB%E7%BB%9F%E6%9C%8D%E5%8A%A1/  

