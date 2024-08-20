# 那些杂七杂八的记录(二)


# `debian 12` 下 `root`  用户，无法设置中文问题
&emsp;&emsp; 具体体现是，系统无论如何设置，终端变量始终为 `LANG=C` 和 `LANGUAGE=C`, 检查了所有设置，最后发现在`~/.profile`中，设置了这两个变量，不知道为什么要这样干，删了重载下就可以了 

# `debian`系统下， `vim`打开文件后鼠标选择为可视模式问题  
- 全局修改: 编辑 `/usr/share/vim/vim82/defaults.vim` , 大概在 `80` 行: `if has('mouse')` 下，将 `set mouse=a` 改为 `set mouse=` 即可  

# `nginx` 添加`ssl` 证书后 ， 浏览器仍然提示 `不安全(你与此网站之间建立的连接并非完全安全)`
- 多数是因为混合内容，在网站页面文件中,包含了其他网站非`https`的资源  

# 共享一个我自己用的 `Bash Prompt`  

```bash
# ~/.bashrc 
# need expand scripts: add https://github.com/git/git/blob/master/contrib/completion/git-prompt.sh to profile.d
_PS1_CMD_="\${VIRTUAL_ENV_PROMPT}\\\\[\\\\][\\[\$(tput sgr0)\\]\\[\\033[38;5;5m\\]\\u\\[\$(tput sgr0)\\]@\\[\$(tput sgr0)\\]\\[\\033[38;5;70m\\]\\h\\[\$(tput sgr0)\\] \\W]\\[\$(tput sgr0)\\]\\[\\033[38;5;77m\\]\${__GIT_BRANCH__}\\[\\033[38;5;9m\\][\\\$?]\\[\$(tput sgr0)\\]\\\\\$ \\[\$(tput sgr0)\\]"

export PROMPT_COMMAND="${PROMPT_COMMAND}; __GIT_BRANCH__=\"\$(__git_ps1 '(%s)')\"; PS1=\"${_PS1_CMD_}\""

# export PS1="[\[$(tput sgr0)\]\[\033[38;5;5m\]\u\[$(tput sgr0)\]@\[$(tput sgr0)\]\[\033[38;5;70m\]\h\[$(tput sgr0)\] \W]\[$(tput sgr0)\]\[\033[38;5;9m\][\$?]\[$(tput sgr0)\]\\$ \[$(tput sgr0)\]"
```

# `windows` 系统中代理设置问题
- 系统设置中, 默认代理设置使用的是 `http` 模式，如果想要使用 `socks`模式，则在地址栏输入 `socks=<proxy_ip>`，端口为`socks`端口即可(`socks`模式仅在`win11`上进行测试，其他系统参考执行)  

# `windows` 挂载 `sshfs` 方法
**本方案看到别人成功过，但自己没有测试成功**  
安装以下内容, 打开 `sshfs-win-manager` 正常配置挂载:   
- https://github.com/winfsp/winfsp
- https://github.com/winfsp/sshfs-win
- https://github.com/evsar3/sshfs-win-manager

# `Proxmox VE` 中使用 `Cloud` 系统镜像快速创建虚拟机

> [https://www.truenasscale.com/2022/05/24/1117.html](https://www.truenasscale.com/2022/05/24/1117.html)  
> [https://fairysen.com/742.html#toc-head-6](https://fairysen.com/742.html#toc-head-6)  
