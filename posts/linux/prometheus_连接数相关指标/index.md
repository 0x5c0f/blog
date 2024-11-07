# Node-Exporter 连接数相关指标


{{&lt; admonition type=quote title=&#34;以下为资料来源,由本站收集重新整理发布,仅用于个人收藏,转载请直接标注以下来源连接&#34; open=true &gt;}}

&gt; [node-export中连接数相关指标](https://mutoulazy.github.io/2020/02/12/kubernetes/prometheus/node-export%E4%B8%AD%E8%BF%9E%E6%8E%A5%E6%95%B0%E7%9B%B8%E5%85%B3%E6%8C%87%E6%A0%87/#udp%E4%B8%8Eudp-lite%E7%9A%84%E5%8C%BA%E5%88%AB)

{{&lt; /admonition &gt;}}

# `TCP`相关指标
| 名称                                   | 类型      | 单位    | 说明                                                                |
| :------------------------------------- | :-------- | :------ | :------------------------------------------------------------------ |
| `node_netstat_Tcp_InErrs`              | `counter` | 报文数  | `TCP` 接收的错误报文数                                              |
| `node_netstat_Tcp_InSegs`              | `counter` | 报文数  | `TCP` 接收的目前所有建立连接的错误报文数                            |
| `node_netstat_Tcp_OutSegs`             | `counter` | 报文数  | `TCP` 发送的报文数（包括当前连接的段但是不包括重传的段)             |
| `node_netstat_Tcp_RetransSegs`         | `counter` | 报文数  | `TCP` 重传报文数                                                    |
| `node_netstat_Tcp_CurrEstab`           | `counter` | 报文数  | 当前状态为 `ESTABLISHED` 或 `CLOSE-WAIT` 的 `TCP` 连接数            |
| `node_netstat_Tcp_ActiveOpens`         | `counter` | 报文数  | 已从 `CLOSED` 状态直接转换到 `SYN-SENT` 状态的 `TCP` 连接数         |
| `node_netstat_Tcp_PassiveOpens`        | `counter` | 报文数  | 已从 `LISTEN` 状态直接转换到 `SYN-RCVD` 状态的 `TCP` 平均连接数     |
| `node_netstat_TcpExt_ListenDrops`      | `counter` | 报文数  | 监听队列连接丢弃数                                                  |
| `node_netstat_TcpExt_ListenOverflows`  | `counter` | 报文数  | 监听 `socket` 的队列溢出                                            |
| `node_netstat_TcpExt_SyncookiesFailed` | `counter` | 报文数  | 接收的无效的 `SYN cookies` 的数量                                   |
| `node_netstat_TcpExt_SyncookiesRecv`   | `counter` | 报文数  | 接收的 `SYN cookies` 的数量                                         |
| `node_netstat_TcpExt_SyncookiesSent`   | `counter` | 报文数  | 发送的 `SYN cookies` 的数量                                         |
| `node_sockstat_TCP_alloc`              | `Graph`   | 报文数  | 已分配（已建立、已申请到`sk_buff`）的`TCP`套接字数量                |
| `node_sockstat_TCP_inuse`              | `Graph`   | 报文数  | 正在使用（正在侦听）的`TCP`套接字数量                               |
| `node_sockstat_TCP_mem`                | `Graph`   | 报文数  | `TCP` 套接字缓冲区使用量                                            |
| `node_sockstat_TCP_orphan`             | `Graph`   | 报文数  | 无主（不属于任何进程）的`TCP`连接数（无用、待销毁的`TCP socket`数） |
| `node_sockstat_TCP_tw`                 | `Graph`   | 报文数  | 等待关闭的`TCP`连接数                                               |
| `node_sockstat_TCP_mem_bytes`          | `Graph`   | `bytes` | `TCP` 套接字缓冲区比特数                                            |

# `UDP` 相关指标

| 名称                            | 类型    | 单位   | 说明                                                                     |
| :------------------------------ | :------ | :----- | :----------------------------------------------------------------------- |
| `node_sockstat_UDPLITE_inuse`   | `Graph` | 报文数 | 正在使用的 `UDP-Lite` 套接字数量                                         |
| `node_sockstat_UDP_inuse`       | `Graph` | 报文数 | 正在使用的 `UDP` 套接字数量                                              |
| `node_sockstat_UDP_mem`         | `Graph` | 报文数 | `UDP` 套接字缓冲区使用量                                                 |
| `node_sockstat_UDP_mem_bytes`   | `Graph` | bytes  | `UDP` 套接字缓冲区比特数                                                 |
| `node_netstat_Udp_InDatagrams`  | `Graph` | 报文数 | 接收的 `UDP` 数据包                                                      |
| `node_netstat_Udp_OutDatagrams` | `Graph` | 报文数 | 发送的 `UDP` 数据包                                                      |
| `node_netstat_Udp_InErrors`     | `Graph` | 报文数 | 本机端口未监听之外的其他原因引起的 `UDP` 入包无法送达(应用层)的数量      |
| `node_netstat_Udp_NoPorts`      | `Graph` | 报文数 | 未知端口接收 `UDP` 数据包的数量                                          |
| `node_netstat_UdpLite_InErrors` | `Graph` | 报文数 | 本机端口未监听之外的其他原因引起的 `UDP-Lite` 入包无法送达(应用层)的数量 |

# `UDP`与`UDP-lite`的区别
传统的UDP协议是对其载荷（`Payload`）进行完整的校验的，如果其中的一些位（哪怕只有一位）发生了变化，那么整个数据包都有可能被丢弃，在某些情况下，丢掉这个包的代价是非常大的，尤其当包比较大的时候。在`UDP-Lite`协议中，一个数据包到底需不需要对其载荷进行校验，或者是校验多少位都是由用户控制的（`leeming`注释：这是这种可选择性，其实`udp_lite`的代码实现是比`udp``复杂的，though` 字面上有个`lite`），并且`UDP-Lite`协议就是用`UDP`协议的`Length`字段来表示其`Checksum Coverage`的，所以当`UDP-Lite`协议的`Checksum Coverage`字段等于整个`UDP`数据包（包括`UDP`头和载荷）的长度时，`UDP-Lite`产生的包也将和传统的`UDP`包一模一样。

# ICMP
`Internet Control Message Protocol`，`ICMP`是网路协议族的核心协议之一。它用于`TCP/IP`网络中发送控制消息，提供可能发生在通信环境中的各种问题反馈，通过这些信息，令管理者可以对所发生的问题作出诊断，然后采取适当的措施解决。

`ICMP`通常用于返回的错误信息或是分析路由。`ICMP`错误消息总是包括了源数据并返回给发送者。 `ICMP`错误消息的例子之一是`TTL`值过期。每个路由器在转发数据报的时候都会把`ip`包头中的`TTL`值减一。如果`TTL`值为`0`，`TTL在传输中过期`的消息将会回报给源地址。

| 名称                         | 类型    | 单位   | 说明                                                         |
| :--------------------------- | :------ | :----- | :----------------------------------------------------------- |
| `node_netstat_Icmp_InErrors` | `Graph` | 报文数 | 接收的 `ICMP` 错误的报文（例如`ICMP`校验和错误、长度错误等） |
| `node_netstat_Icmp_InMsgs`   | `Graph` | 报文数 | 接收的报文数                                                 |
| `node_netstat_Icmp_OutMsgs`  | `Graph` | 报文数 | 发送的报文数                                                 |

# `Sockstat` 的其他指标
| 名称                       | 类型  | 单位   | 说明                       |
| :------------------------- | :---- | :----- | :------------------------- |
| `node_sockstat_sockets_used` | `Graph` | 报文数 | 使用的所有协议套接字总量   |
| `node_sockstat_FRAG_inuse`   | `Graph` | 报文数 | 正在使用的 `Frag` 套接字数量 |
| `node_sockstat_FRAG_memory`  | `Graph` | 报文数 | 使用的 `Frag` 缓冲区         |
| `node_sockstat_RAW_inuse`    | `Graph` | 报文数 | 正在使用的 `Raw` 套接字数量  |

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/prometheus_%E8%BF%9E%E6%8E%A5%E6%95%B0%E7%9B%B8%E5%85%B3%E6%8C%87%E6%A0%87/  
> 转载 URL: https://mutoulazy.github.io/2020/02/12/kubernetes/prometheus/node-export%E4%B8%AD%E8%BF%9E%E6%8E%A5%E6%95%B0%E7%9B%B8%E5%85%B3%E6%8C%87%E6%A0%87/#udp%E4%B8%8Eudp-lite%E7%9A%84%E5%8C%BA%E5%88%AB
