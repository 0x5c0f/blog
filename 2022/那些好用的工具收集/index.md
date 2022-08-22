# 那些好用的工具收集


<!--more-->

# 1. 文件内容搜索工具(ag)
```bash
# 类似于grep
[root@01 ~]# yum install the_silver_searcher 
[root@01 ~]# ag "hello" ./example
```

# 2. mysql 命令补全工具，可替代mysql命令
> [https://github.com/dbcli](https://github.com/dbcli) 
```bash
[root@01 ~]# pip install -U mycli
[root@01 ~]# mycli 
```

# 3. 多线程下载工具(axel)
```bash
[root@01 ~]# yum install axel
[root@01 ~]# axel -n 10 http(ftp)://example.com/example.iso
```
# 4. 终端命令补全
```bash
[root@01 ~]# yum install bash-completion -y 
```
# 5. linux 硬件查看神器
```bash
[root@01 ~]#  yum install inxi -y
```
# 6. linux Script 终端记录神器  
> [https://asciinema.org/](https://asciinema.org/)  
```bash
[root@01 ~]# pip3 install asciinema
```
# 7. linux 文件加密与解密工具 
> [https://linux.cn/article-10632-1.html](https://linux.cn/article-10632-1.html)  
```bash
[root@01 ~]# wget -O /usr/local/bin/toplip https://2ton.com.au/standalone_binaries/toplip && chmod +x /usr/local/bin/toplip  
```
