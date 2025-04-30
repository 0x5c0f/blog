# 那些编译时出现的杂七杂八故障

# 1. ossec 3.3.0 编译故障 及服务端启动故障
```bash
## 全部依赖 yum install zlib-devel pcre2-devel make gcc sqlite-devel openssl-devel libevent-devel systemd-devel
## 下载  https://ftp.pcre.org/pub/pcre/pcre2-10.32.tar.gz 解压到 src/external 中 或者安装 pcre2-devel
## 另 编译需要依赖 openssl-devel 等额外包 
Makefile:766: recipe for target 'external/pcre2-10.32/install/lib/libpcre2-8.a' failed
make: *** [external/pcre2-10.32/install/lib/libpcre2-8.a] Error 2

# server mysql 故障（ossec.conf配置myslq相关参数后无效）
ossec-dbd(5207): ERROR: OSSEC not compiled with support for 'mysql'.
ossec-dbd(1202): ERROR: Configuration error at '/data/software/ossec-server/etc/ossec.conf'. Exiting.
# 安装前需要启用mysql支持（实验版本: 3.6）
export DATABASE=mysql 
export TARGET=server 
export USE_GEOIP=1 

# client-agent/start_agent.c:15:19: fatal error: event.h: No such file or directory
# 需要安装 
yum install -y libevent-devel
```

# 2. rsync 同步故障 @ERROR: auth failed on module 
```bash
    # 出现此问题的原因可能有两个 
    # 1. 指定的认证文件 权限非 600 
    # 2. 指定认证文件行末尾存在注释(别问我怎么知道的,我不想说!) 
```

# 3. python 3.7.x zipimport.ZipImportError: can't decompress data; zlib not available
```bash
yum -y install zlib-devel 
```

# 4. python 3.7.x  ModuleNotFoundError: No module named '_ctypes'
```bash
yum install libffi-devel -y
# libffi-devel-3.0.13-18.el7.x86_64.rpm
```

# 5. python 3.7.x 'SSLError("Can't connect to HTTPS URL because the SSL module is not available.")'
```bash
#  Retrying (Retry(total=0, connect=None, read=None, redirect=None, status=None)) after connection broken by 'SSLError("Can't connect to HTTPS URL because the SSL module is not available.")': /simple/request/
# 先安装，在加上`--with-ssl`编译安装，可加上--enable-optimizations ，让python运行得更快
yum install openssl-devel -y
```

# 6. python 3.x 'errors like : “Could not import runpy module”, operations as following:'
```bash
# 1. gcc 需要升级到8.x + 
# 2. 取消 --enable-optimizations 参数 
# 另: python 3.x 编译需要依赖openssl 1.1.1 ./config --prefix=/pathto/openssl && make && make install
```

# 7. python 3.x 'ModuleNotFoundError: No module named '_bz2''
```bash
yum install bzip2-devel -y
```

# 8. python 3.x 'ModuleNotFoundError: No module named '_lzma''
```bash
sudo yum install xz-devel
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E9%82%A3%E4%BA%9B%E7%BC%96%E8%AF%91%E6%97%B6%E5%87%BA%E7%8E%B0%E7%9A%84%E6%9D%82%E4%B8%83%E6%9D%82%E5%85%AB%E6%95%85%E9%9A%9C/  

