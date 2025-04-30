# 那些好用的工具收集


<!--more-->

# 1. 文件内容搜索工具(ag)
```bash
# 类似于grep
$> yum install the_silver_searcher 
$> ag "hello" ./example
```

# 2. mysql 命令补全工具，可替代mysql命令
> [https://github.com/dbcli](https://github.com/dbcli) 
```bash
$> pip install -U mycli
$> mycli 
```

# 3. 多线程下载工具(axel)
```bash
$> yum install axel
$> axel -n 10 http(ftp)://example.com/example.iso
```

# 4. 终端命令补全
```bash
$> yum install bash-completion -y 
```

# 5. linux 硬件查看神器
```bash
$>  yum install inxi -y
```

# 6. linux Script 终端记录神器  
> [https://asciinema.org/](https://asciinema.org/)  
```bash
$> pip3 install asciinema
```

# 7. linux 文件加密与解密工具 
> [https://linux.cn/article-10632-1.html](https://linux.cn/article-10632-1.html)  
```bash
$> wget -O /usr/local/bin/toplip https://2ton.com.au/standalone_binaries/toplip && chmod +x /usr/local/bin/toplip  
```

# 8. zenity - display GTK+ dialogs( 图形界面操纵工具 )
```bash
$> zenity --help
```

# 9. 系统性能监控和故障诊断工具 `sysdig` 
```bash
## fedora 下，新版已经不支持 dkms,使用需要使用 --modern-bpf
## https://github.com/draios/sysdig/issues/2035 

# 网络宽带占用 
$> sysdig -c topprocs_net

# CPU 占用
$> sysdig -c topprocs_cpu

# 读写量最大的文件
$> sysdig -c topfiles_bytes

# 查看容器相关资源使用状态 
$> csysdig -vcontainers
```

# 10. 终端文件管理工具，支持文件预览 `yazi` 
> https://github.com/sxyazi/yazi

# 11. Linux 下 `TCP/UDP` 端口转发工具 
> https://github.com/samhocevar/rinetd 

# 12. Linux 下好用的剪贴板管理工具 `copyq`
```bash
$> sudo dnf install -y copyq
```

# 13. runlike 显示正在运行的容器 docker run 命令
```bash
# alias runlike="docker run --rm -v /var/run/docker.sock:/var/run/docker.sock assaflavie/runlike"
$> pip install runlike
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E9%82%A3%E4%BA%9B%E5%A5%BD%E7%94%A8%E7%9A%84%E5%B7%A5%E5%85%B7%E6%94%B6%E9%9B%86/  

