# Linux下使用tun2socks进行两地网络连接


<br />

&emsp;&emsp;之前写了一个关于[`内网回拨解决方案`](https://blog.0x5c0f.cc/posts/linux/%E5%86%85%E7%BD%91%E5%9B%9E%E6%8B%A8%E6%96%B9%E6%A1%88), 主要是介绍在`PPTP`不好用的情况下，两地机房网络如何进行内网连接，该篇推荐使用的是`badvpn`, 但该仓库已经归档很久了。这篇介绍另一个工具 [`tun2socks`](https://github.com/xjasonlyu/tun2socks) 来替代`badvpn`。

&emsp;&emsp;关于为什么记录这个，可以翻看之前的文章[`内网回拨解决方案`](https://blog.0x5c0f.cc/posts/linux/%E5%86%85%E7%BD%91%E5%9B%9E%E6%8B%A8%E6%96%B9%E6%A1%88), 本篇只记录相关的整合脚本。

## `tun2socks` 安装
- 在 [`https://github.com/xjasonlyu/tun2socks/releases`](https://github.com/xjasonlyu/tun2socks/releases) 中找到适合自己系统的二进制程序，下载后解压到`/usr/local/bin`下即可。

## `tun2socks-control` 用于管理路由的添加和删除  
- `/usr/local/bin/tun2socks-control`
    ```bash
    #!/usr/bin/bash
    ################################################# 
    #   author      0x5c0f 
    #   date        2023-04-27 
    #   email       mail@0x5c0f.cc 
    #   web         tools.0x5c0f.cc 
    #   version     1.2.0
    #   last update 2024-06-11
    #   descript    Use : ./tun2socks-control -h
    ################################################# 
    PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:~/bin
    export PATH

    # Log level [debug|info|warning|error|silent] (default "info")
    LOG_LEVEL="${LOG_LEVEL:-info}"

    # proxy model
    PROXY_MODEL="${PROXY_MODEL}"

    # local dev
    LOCAL_NETWORK_DEV="${LOCAL_NETWORK_DEV:-eth0}"
    # tun dev
    TUN_NETWORK_DEV="${TUN_NETWORK_DEV:-tun1}"
    # tun ip prefix
    TUN_NETWORK_PREFIX="${TUN_NETWORK_PREFIX:-10.3.6}"
    # route ip
    TUN_ROUTE_IP=($(eval echo ${SOCKS_ROUTE}))

    _START() {
        ip tuntap add dev "${TUN_NETWORK_DEV}" mode tun
        ip addr add "${TUN_NETWORK_PREFIX}.1/24" dev "${TUN_NETWORK_DEV}"
        ip link set "${TUN_NETWORK_DEV}" up
        # add route
        for _ip in ${TUN_ROUTE_IP[@]}; do
            ip route add "${_ip}" via "${TUN_NETWORK_PREFIX}.2"
        done
        # start tun2socks (https://github.com/xjasonlyu/tun2socks.git)
        tun2socks -device ${TUN_NETWORK_DEV} -proxy ${PROXY_MODEL} -interface ${LOCAL_NETWORK_DEV} -loglevel ${LOG_LEVEL}
    }

    _STOP() {
        # delete route
        for _ip in ${TUN_ROUTE_IP[@]}; do
            ip route del "${_ip}" via "${TUN_NETWORK_PREFIX}.2"
        done
        # delete network dev
        ip link set "${TUN_NETWORK_DEV}" down
        ip addr del "${TUN_NETWORK_PREFIX}.1/24" dev "${TUN_NETWORK_DEV}"
        ip tuntap del dev "${TUN_NETWORK_DEV}" mode tun
    }

    main() {
        case "$1" in
        "start")
            _START
            ;;
        "stop")
            _STOP
            ;;
        *)
            echo "$0 start|stop"
            ;;
        esac

    }
    main $@
    ```

## `tun2socks` 用于配置需要绑定的路由和`socks`信息
- `/etc/sysconfig/tun2socks`
    ```ini
    ## tun2socks 日志级别 [debug|info|warning|error|silent] (default "info")
    LOG_LEVEL="info"

    ## https://github.com/xjasonlyu/tun2socks/wiki/Proxy-Models
    # <此项必填> 
    PROXY_MODEL="socks5://127.0.0.1:1083"

    ## 本地网络设备接口 (default: eth0)
    LOCAL_NETWORK_DEV="eth0"

    # tun 设备名(default: tun1)
    TUN_NETWORK_DEV="tun3"
    # tun 绑定的网段 (default: 10.3.6.0/24)
    TUN_NETWORK_PREFIX="10.3.6"

    # 只支持ipv4 
    ROUTE_HOST=""

    # 支持配置多个 空格隔开   
    SOCKS_ROUTE="${ROUTE_HOST}"
    # SOCKS_ROUTE="${IPSB_HOST} ${DOCKER_HOST} $(curl -s https://api.github.com/meta | jq -r '[.web[] | select(contains(\":\") | not)] | join(\" \")')"
    ```

### 用于管理 `tun2socks` 服务的 `systemd`
 - `/etc/systemd/system/tun2socks.service`
    ```ini
    [Unit]
    Description=tun2socks https://github.com/xjasonlyu/tun2socks.git
    After=network.target
    # Requires=socketssh-tun.service

    [Service]
    Type=simple
    EnvironmentFile=/etc/sysconfig/tun2socks
    PIDFile=/run/tun2socks.pid
    ExecStart=/usr/local/bin/tun2socks-control start
    ExecStopPost=/usr/local/bin/tun2socks-control stop

    [Install]
    WantedBy=multi-user.target
    ```

## 加载启动
```bash
$> sudo systemctl daemon-reload 
$> sudo systemctl start tun2socks.service
```

## 其他信息
- `windows` 理论可用，可参考脚本进行调整
- 其他信息参考 [`内网回拨解决方案`](https://blog.0x5c0f.cc/posts/linux/%E5%86%85%E7%BD%91%E5%9B%9E%E6%8B%A8%E6%96%B9%E6%A1%88) 


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/linux%E4%B8%8B%E4%BD%BF%E7%94%A8tun2socks%E8%BF%9B%E8%A1%8C%E4%B8%A4%E5%9C%B0%E7%BD%91%E7%BB%9C%E8%BF%9E%E6%8E%A5/  

