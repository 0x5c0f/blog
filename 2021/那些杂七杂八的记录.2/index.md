# 那些杂七杂八的记录(二)


# debian 12 下 ROOTN  用户，无法设置中文问题
&emsp;&emsp; 具体体现是，系统无论如何设置，终端变量始终为 `LANG=C` 和 `LANGUAGE=C`, 检查了所有设置，最后发现在`~/.profile`中，设置了这两个变量，不知道为什么要这样干，删了重载下就可以了 

# debian 系统下， vim 打开文件后鼠标选择为可视模式问题  
- 全局修改: 编辑 `/usr/share/vim/vim82/defaults.vim` , 大概在 `80` 行: `if has('mouse')` 下，将 `set mouse=a` 改为 `set mouse=` 即可  

# nginx 添加 ssl 证书后 ， 浏览器仍然提示 `不安全(你与此网站之间建立的连接并非完全安全)`
- 多数是因为混合内容，在网站页面文件中,包含了其他网站非`https`的资源  

# 共享一个我自己用的 Bash Prompt  

```bash
# ~/.bashrc 
# need expand scripts: add https://github.com/git/git/blob/master/contrib/completion/git-prompt.sh to profile.d
_PS1_CMD_="\${VIRTUAL_ENV_PROMPT}\\\\[\\\\][\\[\$(tput sgr0)\\]\\[\\033[38;5;5m\\]\\u\\[\$(tput sgr0)\\]@\\[\$(tput sgr0)\\]\\[\\033[38;5;70m\\]\\h\\[\$(tput sgr0)\\] \\W]\\[\$(tput sgr0)\\]\\[\\033[38;5;77m\\]\${__GIT_BRANCH__}\\[\\033[38;5;9m\\][\\\$?]\\[\$(tput sgr0)\\]\\\\\$ \\[\$(tput sgr0)\\]"

export PROMPT_COMMAND="${PROMPT_COMMAND}; __GIT_BRANCH__=\"\$(__git_ps1 '(%s)')\"; PS1=\"${_PS1_CMD_}\""

# export PS1="[\[$(tput sgr0)\]\[\033[38;5;5m\]\u\[$(tput sgr0)\]@\[$(tput sgr0)\]\[\033[38;5;70m\]\h\[$(tput sgr0)\] \W]\[$(tput sgr0)\]\[\033[38;5;9m\][\$?]\[$(tput sgr0)\]\\$ \[$(tput sgr0)\]"
```

# windows 系统中代理设置问题
- 系统设置中, 默认代理设置使用的是 `http` 模式，如果想要使用 `socks`模式，则在地址栏输入 `socks=<proxy_ip>`，端口为`socks`端口即可(`socks`模式仅在`win11`上进行测试，其他系统参考执行)  

# windows 挂载 sshfs 方法
**本方案看到别人成功过，但自己没有测试成功**  
安装以下内容, 打开 `sshfs-win-manager` 正常配置挂载:   
- https://github.com/winfsp/winfsp  
- https://github.com/winfsp/sshfs-win  
- https://github.com/evsar3/sshfs-win-manager  

# Proxmox VE 中使用 Cloud 系统镜像快速创建虚拟机  

> [https://www.truenasscale.com/2022/05/24/1117.html](https://www.truenasscale.com/2022/05/24/1117.html)  
> [https://fairysen.com/742.html#toc-head-6](https://fairysen.com/742.html#toc-head-6)  

# Virtualbox 中使用 Cloud 系统镜像快速创建虚拟机
&emsp;&emsp;以[`Alibaba Cloud Linux 3`](https://mirrors.aliyun.com/alinux/3/image/)云镜像为例，下载[`aliyun_3_x64_20G_nocloud_alibase_20240528.vhd`](https://alinux3.oss-cn-hangzhou.aliyuncs.com/aliyun_3_x64_20G_nocloud_alibase_20240528.vhd) 和 [`seed.img`](https://alinux3.oss-cn-hangzhou.aliyuncs.com/seed.img), `seed.img`是 `cloud-init` 数据源，可以自己创建参考[`官方文档`](https://cloudinit.readthedocs.io/en/latest/reference/examples.html)或者[`阿里云文档`](https://help.aliyun.com/zh/alinux/getting-started/use-alibaba-cloud-linux-3-images-in-an-on-premises-environment?spm=a2c4g.11186623.0.0.36534cfcWFRMKk#section-eyk-z6n-5ot)的生成示例。   
## 虚拟机创建和配置  
- 新建虚拟机， `虚拟机光盘`无需指定，`类型`和`版本`按照自己使用的云镜像指定，然后一直下一步, `虚拟硬盘`选择`不添加虚拟硬盘`，  然后点击下一步， 直到完成创建。  
- 完成创建后, `右键`创建好的虚拟机，选择`设置`， 理论上所有设置都可以使用默认值， 只需要更改一个地方。  
    1. 选择 `存储`，选择`控制器: IDE`，右键添加`cloud-init`源, 就是下载的那个`seed.img`或者自己创建的(*需要先注册到`Virtualbox`，这个步骤在测试时候发现不做似乎没什么影响，只是进去后使用的是下载镜像默认的帐号名密码，`Alibaba Cloud Linux 3`的是`alinux:aliyun`,这个在阿里云文档中手动生成配置文件中可以看到*)。  
    2. 选择 `存储` , 选择 `控制器: SATA`, 在右侧设置中将`型号`改为`virtio-scsi`(***这个步骤是必须的***),  然后`右键`添加硬盘, 选择下载的`aliyun_3_x64_20G_nocloud_alibase_20240528.vhd`(*同样需要先注册到`Virtualbox`*)。 
    3. 选择 `网络`，`连接方式`根据自己情况调整，`高级`中`控制芯片`修改为 `准虚拟化网络(virtio-net)`, 然后确定修改。 
    4. 最后正常启动虚拟机即可.  
