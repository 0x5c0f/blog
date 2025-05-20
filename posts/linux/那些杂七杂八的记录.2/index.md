# 那些杂七杂八的记录(二)


<!--more-->

## debian 12 下 ROOTN  用户，无法设置中文问题
&emsp;&emsp; 具体体现是，系统无论如何设置，终端变量始终为 `LANG=C` 和 `LANGUAGE=C`, 检查了所有设置，最后发现在`~/.profile`中，设置了这两个变量，不知道为什么要这样干，删了重载下就可以了 

## debian 系统下， vim 打开文件后鼠标选择为可视模式问题  
- 全局修改: 编辑 `/usr/share/vim/vim82/defaults.vim` , 大概在 `80` 行: `if has('mouse')` 下，将 `set mouse=a` 改为 `set mouse=` 即可  

## nginx 添加 ssl 证书后 ， 浏览器仍然提示 `不安全(你与此网站之间建立的连接并非完全安全)`
- 多数是因为混合内容，在网站页面文件中,包含了其他网站非`https`的资源  

## 共享一个我自己用的 Bash Prompt  

```bash
# ~/.bashrc 
# need expand scripts: add https://github.com/git/git/blob/master/contrib/completion/git-prompt.sh to profile.d
_PS1_CMD_="\${VIRTUAL_ENV_PROMPT}\\\\[\\\\][\\[\$(tput sgr0)\\]\\[\\033[38;5;5m\\]\\u\\[\$(tput sgr0)\\]@\\[\$(tput sgr0)\\]\\[\\033[38;5;70m\\]\\h\\[\$(tput sgr0)\\] \\W]\\[\$(tput sgr0)\\]\\[\\033[38;5;77m\\]\${__GIT_BRANCH__}\\[\\033[38;5;9m\\][\\\$?]\\[\$(tput sgr0)\\]\\\\\$ \\[\$(tput sgr0)\\]"

export PROMPT_COMMAND="${PROMPT_COMMAND}; __GIT_BRANCH__=\"\$(__git_ps1 '(%s)')\"; PS1=\"${_PS1_CMD_}\""

# export PS1="[\[$(tput sgr0)\]\[\033[38;5;5m\]\u\[$(tput sgr0)\]@\[$(tput sgr0)\]\[\033[38;5;70m\]\h\[$(tput sgr0)\] \W]\[$(tput sgr0)\]\[\033[38;5;9m\][\$?]\[$(tput sgr0)\]\\$ \[$(tput sgr0)\]"
```

## windows 系统中代理设置问题
- 系统设置中, 默认代理设置使用的是 `http` 模式，如果想要使用 `socks`模式，则在地址栏输入 `socks=<proxy_ip>`，端口为`socks`端口即可(`socks`模式仅在`win11`上进行测试，其他系统参考执行)  

## windows 挂载 sshfs 方法
**本方案看到别人成功过，但自己没有测试成功**  
安装以下内容, 打开 `sshfs-win-manager` 正常配置挂载:   
- https://github.com/winfsp/winfsp  
- https://github.com/winfsp/sshfs-win  
- https://github.com/evsar3/sshfs-win-manager  

## Proxmox VE 中使用 Cloud 系统镜像快速创建虚拟机  

> [https://www.truenasscale.com/2022/05/24/1117.html](https://www.truenasscale.com/2022/05/24/1117.html)  
> [https://fairysen.com/742.html#toc-head-6](https://fairysen.com/742.html#toc-head-6)  

1. 创建`虚拟机`, `操作系统`设置，选择 `不使用任何介质`
2. `系统` 设置将 `SCSI控制器` 调整为 `VirtIO SCSI`, 机器可以设置为`q35`也可以默认
3. `磁盘` 设置删除掉所有的默认即可, 最后完成创建 
4. 完成创建后, 登陆到 `PVE` 主机上面，使用命令`qm importdisk 100 aliyun_3_x64_20G_nocloud_alibase_20240528.qcow2 local-lvm` 将 `qcow2` 导入到虚拟机中，`100`为虚拟机的`VM ID`, `local-lvm`是要存储的位置， 没有 `qm` 命令，安装下 `cloud-init` 软件包  
5. 导入完成后， 在`硬件`里面可以看到一个 `未使用的磁盘0`, 然后`双击`编辑, 一般默认即可(`总线/设备`调整为`SCSI`)  
6. 在 `选项` 中，选择 `引导顺序`，将添加的那块磁盘设为第一启动项  
7. 在 `Cloud-init` 中，设置下 `用户名 / 密码` 
8. 启动虚拟机


## Virtualbox 中使用 Cloud 系统镜像快速创建虚拟机
&emsp;&emsp;以[`Alibaba Cloud Linux 3`](https://mirrors.aliyun.com/alinux/3/image/)云镜像为例，下载[`aliyun_3_x64_20G_nocloud_alibase_20240528.vhd`](https://alinux3.oss-cn-hangzhou.aliyuncs.com/aliyun_3_x64_20G_nocloud_alibase_20240528.vhd) 和 [`seed.img`](https://alinux3.oss-cn-hangzhou.aliyuncs.com/seed.img), `seed.img`是 `cloud-init` 数据源，可以自己创建参考[`官方文档`](https://cloudinit.readthedocs.io/en/latest/reference/examples.html)或者[`阿里云文档`](https://help.aliyun.com/zh/alinux/getting-started/use-alibaba-cloud-linux-3-images-in-an-on-premises-environment?spm=a2c4g.11186623.0.0.36534cfcWFRMKk#section-eyk-z6n-5ot)的生成示例。   

### 虚拟机创建和配置  
- 新建虚拟机， `虚拟机光盘`无需指定，`类型`和`版本`按照自己使用的云镜像指定，然后一直下一步, `虚拟硬盘`选择`不添加虚拟硬盘`，  然后点击下一步， 直到完成创建。  
- 完成创建后, `右键`创建好的虚拟机，选择`设置`， 理论上所有设置都可以使用默认值， 只需要更改一个地方。  
    1. 选择 `存储`，选择`控制器: IDE`，右键添加`cloud-init`源, 就是下载的那个`seed.img`或者自己创建的(*需要先注册到`Virtualbox`，这个步骤在测试时候发现不做似乎没什么影响，只是进去后使用的是下载镜像默认的帐号名密码，`Alibaba Cloud Linux 3`的是`alinux:aliyun`,这个在阿里云文档中手动生成配置文件中可以看到*)。  
    2. 选择 `存储` , 选择 `控制器: SATA`, 在右侧设置中将`型号`改为`virtio-scsi`(***这个步骤是必须的***),  然后`右键`添加硬盘, 选择下载的`aliyun_3_x64_20G_nocloud_alibase_20240528.vhd`(*同样需要先注册到`Virtualbox`*)。 
    3. 选择 `网络`，`连接方式`根据自己情况调整，`高级`中`控制芯片`修改为 `准虚拟化网络(virtio-net)`, 然后确定修改。 
    4. 最后正常启动虚拟机即可(注意： 第一次启动可能会比较慢，多等待一些时间就可以了， 启动后注意先配置好网络).  

## PVE 添加额外菜单-监控组件 
```js
// 当前测试版本为 8.2.2
// 修改Web界面源代码 /usr/share/pve-manager/js/pvemanagerlib.js(注意备份)
// 搜索到内容 `if (caps.nodes['Sys.Audit']) {`，大概在 43869 行, 注意搜索结果会有多个。
// 可以将前端界面修改为英文，然后随便改一个 gettext 内的内容刷新，看是否找对位置。
// 添加菜单，完整内容如下 
if (caps.nodes['Sys.Audit']) {
    me.items.push(
        {
            xtype: 'pveNodeSummary',
            title: gettext('Summary'),
            iconCls: 'fa fa-book',
            itemId: 'summary',
        },
        {
            xtype: 'pmxNotesView',
            title: gettext('Notes'),
            iconCls: 'fa fa-sticky-note-o',
            itemId: 'notes',
        },
        /// 添加内容开始
        {
            xtype: 'prometheusMonitorView',
            title: 'Prometheus 监控',
            iconCls: 'fa fa-line-chart',
            itemId: 'note-prometheus',
        }
        /// 添加内容结束
    );
}

/// 在文件最末尾添加 
Ext.define('PVE.node.PrometheusMonitor', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.prometheusMonitorView',

    scrollable: true,
    bodyPadding: 5,

    initComponent: function() {
        var me = this;

        var prometheusIframe = {
            xtype: 'component',
            autoEl: {
                tag: 'iframe',
                style: 'height: 100%; width: 100%; border: none;',
                src: 'https://sogou.com',
				frameborder: 0,
				scrolling: 'auto'
            }
        };

        Ext.apply(me, {
            layout: 'fit',
            items: [prometheusIframe]
        });

        me.callParent();
    }
});
```


## binlog 解析工具
> https://github.com/zhuchao941/canal2sql  

```bash
# 常用参数
## -sql_type: 只解析指定类型，支持 insert,update,delete,ddl。多个类型用逗号隔开，如--sql-type=insert,delete。可选。默认为insert,update,delete,ddl 
## -filter: 白名单,指定导出，多个逗号隔开 <库名>.<表名>(db.*、*.*)
## -mode: online/file/aliyun，默认online
## --file_url: 离线的binlog文件，支持http url访问
## -B: 显示回滚sql
## ...


# 1. 在线模式, 解析账户权限需要 SELECT, REPLICATION SLAVE, REPLICATION CLIENT 
$> java -jar canal2sql-1.1.3.jar -sql_type update,delete -filter <database>.<tables>  -mode file -file_url 'file:/tmp/mysql-bin.000016' -uroot -P3306 -pxxxxx -hlocalhost


# 2. 离线模式
## 导出数据库标结构
$> mysqldump -uroot -pxxxxx -hlocalhost --set-gtid-purged=OFF --default-character-set=utf8mb4 --single-transaction -R -E -B -d <database> > /tmp/database.sql
## 
$> java -jar ./canal2sql-1.1.3.jar -mode file -ddl '/tmp/database.sql' -file_url 'http://localhost:8080/binlog/mysql-bin.000474' 
```

## 亚马逊云 EC2 Windows (2022) 安装 WSL 问题  
- 注意: 虚拟化的`EC2 Windows`实例只支持`WSL 1`  
> https://docs.aws.amazon.com/zh_cn/AWSEC2/latest/UserGuide/install-wsl-on-ec2-windows-instance.html  

## 远程登陆 windows openssh 服务后， 无法执行 wsl 命令启动子系统 The file cannot be accessed by the system 
- 使用绝对路径打开 `"C:\Program Files\WSL\wsl.exe"`  

## WSL 子系统挂载权限问题
- `windows`盘符默认挂载到`/mnt`目录下，且权限为`777`, 这不仅不方便，也有一些安全问题  
    - 解决: 创建或者修改文件`/etc/wsl.conf`文件,添加以下内容  
        ```ini
        [automount]
        enabled = true
        root = /mnt/
        options = "metadata,dmask=022,fmask=133"
        mountFsTab = false
        ```
- 如果这样创建文件仍然是`777`, 可以在`/etc/profile`中添加一些`umask`设定 
    ```ini
    if [[ "$(umask)" == '000' ]]; then
        umask 022
    fi
    ```
- 重启 `wsl --shutdown`  , 然后重启登陆， 不行就重启下系统 


## Wazhu agent 激活变量参考

> https://documentation.wazuh.com/current/user-manual/agent/agent-enrollment/deployment-variables/deployment-variables-linux.html


## 跨 VPC 访问 Redis 主备，info replication 拿到的从库ip是 内网ip 
- 这个问题初次发现是应用调用华为的云Redis发现的，云Redis是跨vpc部署的主备， 但是info replication 拿到的从库ip是内网ip，由于应用和redis实际环境不处于同一网络，导致应用访问超时，目前的解决是研发这边准备重写对应组件，但发现该组件作者已经解决了这个问题，升级到新版本后解决。 架构可以看成是  `用户: 192.168.2.8/24` 访问 `代理:192.168.2.10/24` ---> `Redis主: 10.0.2.10/24`, 而 用户通过 `info replication` 拿到的却是 `10.0.2.10/24`，所以 `192.168.2.8/24` 肯定无法连接 `10.0.2.10/24`。  

- 这个问题感觉还是比较经典的，比如 用容器部署的主备，应用和主备环境不处于同一主机， 也会出现类似问题。应该是容器化部署类的都会产生，架构方面应该可以解决，但是没有找到合适的解决方案。

## docker pull 超时问题 
- 正常来说，此类问题应该通过 `registry-mirrors` 项配置镜像加速地址解决，但是现在这个镜像加速器能用的越来越少了，今天发现了一个新的方案，通过设置 `http_proxy` 和 `https_proxy` 代理解决，配置如下：
    ```ini
    ### Editing /etc/systemd/system/docker.service.d/override.conf
    ### Anything between here and the comment below will become the contents of the drop-in file
    [Service]
    Environment="ALL_PROXY=socks5://127.0.0.1:1080"
    Environment="NO_PROXY=localhost,127.0.0.1,.example.com"
    ```

## mysql 日志出现大量的 Got an error reading communication packets 
```ini
# 该问题多数出现于 8.0 以下, 默认设置1M，8.0以上默认设置64M
# max_allowed_packet 设置太小，数据包过大时导致连接中断
# 临时解决: SET GLOBAL max_allowed_packet = 16777216;  -- 设置为16M
# 永久解决: 修改配置文件
[mysqld]
max_allowed_packet = 16M    # 大多数情况下，16M 到 64M 已足够
```

## Windows 如何解除文件锁定
***文件锁定会导致该文件无法删除***
1. 利用第三方工具，比如 [`Unlocker`](https://www.iobit.com/en/iobit-unlocker.php)解锁文件   
2. 利用`Microsoft`官方工具 [`Process Explorer`](https://learn.microsoft.com/en-us/sysinternals/downloads/process-explorer)(打开`Process Explorer`，点击`Find`选项卡，然后选择`Find Handle or DLL`，输入文件名来搜索,然后右键点击进程，结束`进程`或者结束`进程树`。在或者找到对应的 `Handles`，右键 `Close Handle`，建议优选`Close Handle`)

## 为 Makefile 生成帮助文档 
```makefile
.PHONY: help
help: ## 显示所有可用命令
	@echo "可用命令："
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

## Systemd 守护桌面程序
```bash
# 以本文记录时间时候最新的QQ Linux版 3.0.0 为例，fedora33 下经常崩溃，用systemd守护其运行，在QQ崩溃时自动重启QQ
# 运行以下命令以启动systemd守护进程 
$> /usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 替换默认 /usr/share/applications/qq.desktop的执行命令 Exec=/usr/bin/systemd-run --property Restart=on-failure --user /opt/QQ/qq
# 日志检查，可以定位当前用户的日志看(或者 systemctl --user list-units run-*|grep qq，查询到systemd-run启动的service，直接定位)
$> journalctl -f -u user@${UID}.service
```

## CentOS 7 系统安装其他 GLIBC 版本 
***`DevToolSet（Developer Toolset）`是 `Red Hat` 和 `CentOS` 提供的一组开发工具集合，旨在为开发者提供最新的编译器、调试器和其他开发工具，同时保持系统稳定性。它允许用户在不升级整个系统的情况下使用更新的工具链(包含 `GCC`、`GDB`、`Binutils` 等工具的更新版本)。***  
```bash
$> sudo yum install centos-release-scl
# 需要什么版本就是 devtoolset-xxxx-gcc* 
$> sudo yum install devtoolset-8-gcc*
# 激活
$> scl enable devtoolset-8 bash
```

## MySQL 出现 KILLED 或者 Waiting for table metadata lock 
1. 使用 `show processlist` 获取到线程`id`  
2. 获取操作系统线程`ID`, 如 `1213`(`SELECT THREAD_OS_ID FROM performance_schema.threads WHERE processlist_id=1213`)  
3. 使用 `pstack` 诊断 `pstack 13133 > /root/mysql_thread_13133.txt`
4. 自己分析生成文件或者扔给`gpt`看


## MySQL 连接数被打满 `to many connections`，无法登陆 `mysql` 的情况下处理方案(网络搜集-未测试) 
```bash
$> gdb -p $(pidof mysqld) -batch -ex 
"set global max_connections=1500"
```

## Prometheus Error scraping target: cannot parse Content-Type "text/plain; charset=utf-8,gb2312,gbk" and no fallback_scrape_protocol for target mime: invalid media parameter

- `Prometheus V3` 版本对于 `Content-Type` 进行了更严格的校验, 参见 [`#15777`](https://github.com/prometheus/prometheus/issues/15777)、[`Prometheus Docs#scrape-protocols`](https://prometheus.io/docs/prometheus/latest/migration/#scrape-protocols) , 解决方案：`Prometheus` 使用 `V2` 版本，或者指标请求返回的 `charset` 只有一个，如 `utf-8`。(官方推荐的设置方案这边没有测试成功)

## vscode 开启类似 pycharm 的代码提示及包自动导入功能
```json
    // 需要安装插件 Pylance 
    "python.languageServer": "Pylance",
    "python.analysis.autoImportCompletions": true,
    "python.analysis.autoSearchPaths": true,
    "editor.quickSuggestions": {
        "other": "on",
        "comments": "on",
        "strings": "on"
    }
```

## 雷池(SafeLine) 在更新控制台证书后，导致前端访问报告错误 ERR_SSL_VERSION_OR_CIPHER_MISMATCH
***该解决方案来自官方微信群80***
- 临时解决: 登陆 `mgt` 容器, 复制 `/app/cert/default.crt` 和 `/app/cert/default.key` 并覆盖 `/app/cert/mgt.crt` 和 `/app/cert/mgt.key`， 然后重启 `nginx` 进程(注意是进程，不是 `mgt` 容器)
- 永久解决：执行 `docker exec safeline-pg psql -U safeline-ce -c "delete from mgt_options where key = 'mgt_cert';"` 并重启 `mgt` 容器；

## PgSql 备份与恢复
```bash
$> pg_restore -U postgres -h 127.0.0.1 -p 5432 -d <database> -C /tmp/<database>.dump

# 强制清理已有对象再恢复（类似 mysql 的 DROP + CREATE）
$> pg_restore -U postgres -h 127.0.0.1 -d <database> --clean --if-exists /tmp/<database>.dump
```

## UFW 防火墙创建自定义规则
```bash
# 定义应用规则
$> vim /etc/ufw/applications.d/samba
[Samba]
title=Samba File Sharing
description=Allow Samba (NetBIOS/SMB) ports
ports=137,138/udp|139,445/tcp

# 更新 UFW 应用列表
$> ufw app update samba

# 开启应用规则
$> ufw allow samba # ufw allow from <网段>/<子网掩码> to any port samba
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E9%82%A3%E4%BA%9B%E6%9D%82%E4%B8%83%E6%9D%82%E5%85%AB%E7%9A%84%E8%AE%B0%E5%BD%95.2/  

