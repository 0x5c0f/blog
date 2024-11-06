# 介绍在Linux命令行中使用tcpdump


{{&lt; admonition type=quote open=true &gt;}}
介绍在Linux命令行中使用tcpdump  
文章原文来源 [opensource.com](https://opensource.com), 由本站翻译发布用于个人搜集。  
&gt; [https://opensource.com/article/18/10/introduction-tcpdump](https://opensource.com/article/18/10/introduction-tcpdump)  

{{&lt; /admonition &gt;}}


`tcpdump`是一个功能强大、功能多样的工具，包括许多选项和过滤器，可以在各种情况下使用。由于它是一个命令行工具，所以最好在没有`GUI`的远程服务器或设备上运行，以便收集可以稍后分析的数据。它也可以在后台启动，或者使用`cron`之类的工具作为计划作业启动。

在本文中，我们将介绍一些`tcpdump`最常见的功能。  

# 1. 在Linux上安装 
`Tcpdump`包含在几个`Linux`发行版中，所以您可能已经安装了它。使用以下命令检查系统是否已安装`tcpdump`:
```bash
$&gt; which tcpdump
/usr/sbin/tcpdump
```
如果没有安装`tcpdump`，可以使用发行版的包管理器安装它。例如，在`CentOS`或`Red Hat Enterprise Linux`上，如下所示:  
```bash
$&gt; sudo yum install -y tcpdump
```
`Tcpdump`需要`libpcap`，这是一个用于网络包捕获的库。如果没有安装，它将自动作为依赖项添加。  

你已经准备好开始捕获一些包了么。  

# 2. 使用tcpdump捕获数据包 

要捕获用于故障排除或分析的包，`tcpdump`需要提高权限，因此在下面的示例中，大多数命令都以`sudo`作为前缀。

首先，使用命令`tcpdump -D`查看哪些接口可用来捕获:
```bash
$&gt; sudo tcpdump -D 
1.eth0
2.virbr0
3.eth1
4.any (Pseudo-device that captures on all interfaces)
5.lo [Loopback]
``` 
在上面的示例中，您可以看到我的机器中所有可用的接口。特殊接口`any`允许在任何活动接口中捕获。 
让我们使用它开始捕获一些包。通过运行以下命令捕获任何接口中的所有数据包 :  

```bash
$&gt; sudo tcpdump -i any
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
09:56:18.293641 IP rhel75.localdomain.ssh &gt; 192.168.64.1.56322: Flags [P.], seq 3770820720:3770820916, ack 3503648727, win 309, options [nop,nop,TS val 76577898 ecr 510770929], length 196
09:56:18.293794 IP 192.168.64.1.56322 &gt; rhel75.localdomain.ssh: Flags [.], ack 196, win 391, options [nop,nop,TS val 510771017 ecr 76577898], length 0
09:56:18.295058 IP rhel75.59883 &gt; gateway.domain: 2486&#43; PTR? 1.64.168.192.in-addr.arpa. (43)
09:56:18.310225 IP gateway.domain &gt; rhel75.59883: 2486 NXDomain* 0/1/0 (102)
09:56:18.312482 IP rhel75.49685 &gt; gateway.domain: 34242&#43; PTR? 28.64.168.192.in-addr.arpa. (44)
09:56:18.322425 IP gateway.domain &gt; rhel75.49685: 34242 NXDomain* 0/1/0 (103)
09:56:18.323164 IP rhel75.56631 &gt; gateway.domain: 29904&#43; PTR? 1.122.168.192.in-addr.arpa. (44)
09:56:18.323342 IP rhel75.localdomain.ssh &gt; 192.168.64.1.56322: Flags [P.], seq 196:584, ack 1, win 309, options [nop,nop,TS val 76577928 ecr 510771017], length 388
09:56:18.323563 IP 192.168.64.1.56322 &gt; rhel75.localdomain.ssh: Flags [.], ack 584, win 411, options [nop,nop,TS val 510771047 ecr 76577928], length 0
09:56:18.335569 IP gateway.domain &gt; rhel75.56631: 29904 NXDomain* 0/1/0 (103)
09:56:18.336429 IP rhel75.44007 &gt; gateway.domain: 61677&#43; PTR? 98.122.168.192.in-addr.arpa. (45)
09:56:18.336655 IP gateway.domain &gt; rhel75.44007: 61677* 1/0/0 PTR rhel75. (65)
09:56:18.337177 IP rhel75.localdomain.ssh &gt; 192.168.64.1.56322: Flags [P.], seq 584:1644, ack 1, win 309, options [nop,nop,TS val 76577942 ecr 510771047], length 1060

---- SKIPPING LONG OUTPUT -----

09:56:19.342939 IP 192.168.64.1.56322 &gt; rhel75.localdomain.ssh: Flags [.], ack 1752016, win 1444, options [nop,nop,TS val 510772067 ecr 76578948], length 0
^C
9003 packets captured
9010 packets received by filter
7 packets dropped by kernel
$&gt; 
```

`Tcpdump`继续捕获数据包，直到它接收到中断信号。您可以按`Ctrl&#43;C`中断捕获。在这个例子中可以看到，`tcpdump`捕获了超过9,000个包。在本例中，由于我使用`ssh`连接到此服务器，所以`tcpdump`捕获了所有这些包。若要限制捕获的数据包数量并停止`tcpdump`，请使用`-c`选项:

```bash
$&gt; sudo tcpdump -i any -c 5
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
11:21:30.242740 IP rhel75.localdomain.ssh &gt; 192.168.64.1.56322: Flags [P.], seq 3772575680:3772575876, ack 3503651743, win 309, options [nop,nop,TS val 81689848 ecr 515883153], length 196
11:21:30.242906 IP 192.168.64.1.56322 &gt; rhel75.localdomain.ssh: Flags [.], ack 196, win 1443, options [nop,nop,TS val 515883235 ecr 81689848], length 0
11:21:30.244442 IP rhel75.43634 &gt; gateway.domain: 57680&#43; PTR? 1.64.168.192.in-addr.arpa. (43)
11:21:30.244829 IP gateway.domain &gt; rhel75.43634: 57680 NXDomain 0/0/0 (43)
11:21:30.247048 IP rhel75.33696 &gt; gateway.domain: 37429&#43; PTR? 28.64.168.192.in-addr.arpa. (44)
5 packets captured
12 packets received by filter
0 packets dropped by kernel
$&gt; 
```

在本例中，`tcpdump`在捕获5个包之后自动停止捕获。这在不同的场景中都很有用——例如，如果您正在对连接进行故障诊断，并且捕获几个初始包就足够了。当我们应用过滤器来捕获特定的包时，这甚至更有用(如下所示)。  

默认情况下，`tcpdump`将IP地址和端口解析为名称，如前面的示例所示。在排除网络问题时，通常更容易使用IP地址和端口号; 禁用名称解析使用选项`-n`和端口解析与`-nn`:  
```bash
$&gt; sudo tcpdump -i any -c5 -nn
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
23:56:24.292206 IP 192.168.64.28.22 &gt; 192.168.64.1.35110: Flags [P.], seq 166198580:166198776, ack 2414541257, win 309, options [nop,nop,TS val 615664 ecr 540031155], length 196
23:56:24.292357 IP 192.168.64.1.35110 &gt; 192.168.64.28.22: Flags [.], ack 196, win 1377, options [nop,nop,TS val 540031229 ecr 615664], length 0
23:56:24.292570 IP 192.168.64.28.22 &gt; 192.168.64.1.35110: Flags [P.], seq 196:568, ack 1, win 309, options [nop,nop,TS val 615664 ecr 540031229], length 372
23:56:24.292655 IP 192.168.64.1.35110 &gt; 192.168.64.28.22: Flags [.], ack 568, win 1400, options [nop,nop,TS val 540031229 ecr 615664], length 0
23:56:24.292752 IP 192.168.64.28.22 &gt; 192.168.64.1.35110: Flags [P.], seq 568:908, ack 1, win 309, options [nop,nop,TS val 615664 ecr 540031229], length 340
5 packets captured
6 packets received by filter
0 packets dropped by kernel

```
如上所示，捕获输出现在显示IP地址和端口号。这还可以防止`tcpdump`发出`DNS`查询，这有助于在排除网络问题时降低网络流量。 

现在您已经能够捕获网络数据包，让我们来研究一下这个输出意味着什么。  

# 3. 理解输出格式   
`Tcpdump`能够捕获和解码许多不同的协议，比如`TCP`、`UDP`、`ICMP`等等。虽然我们不能在这里全部介绍，但是为了帮助您入门，让我们研究一下TCP包。您可以在`tcpdump`的手册页中找到关于不同协议格式的更多细节。`tcpdump`捕获的典型`TCP`包是这样的:  

```
08:41:13.729687 IP 192.168.64.28.22 &gt; 192.168.64.1.41916: Flags [P.], seq 196:568, ack 1, win 309, options [nop,nop,TS val 117964079 ecr 816509256], length 372
```

字段可能因发送的包的类型而异，但这是一般格式。  
第一个字段`08:41:13.729687`表示根据本地时钟接收到的数据包的时间戳。  
接下来，`IP`表示网络层协议——在本例中是`IPv4`。对于`IPv6`数据包，值是`IP6`。   
下一个字段`192.168.64.28.22`是源IP地址和端口。然后是目标IP地址和端口，由`192.168.64.1.41916`表示。   

在源和目标之后，您可以找到`TCP`标志标志`[P.]`。该字段的典型值包括:  

|值|标志类型|描述|
|-|-|-|
|`S`|`SYN`|`Connection Start`|
|`F`|`FIN`|`Connection Finish`|
|`P`|`PUSH`|`Data push`|
|`R`|`RST`|`Connection reset`|
|`.`|`ACK`|`Acknowledgment`|


This field can also be a combination of these values, such as [S.] for a SYN-ACK pack
The next field is the window size win 309, which represents the number of bytes available in the receiving buffer, followed by TCP options such as the MSS (Maximum Segment Size) or Window Scale. For details about TCP protocol options, consult Transmission Control Protocol (TCP) Parameters.

Finally, we have the packet length, length 372, which represents the length, in bytes, of the payload data. The length is the difference between the last and first bytes in the sequence number.

Now let&#39;s learn how to filter packets to narrow down results and make it easier to troubleshoot specific issues.

该字段也可以是这些值的组合，例如用于`SYN-ACK`分组的`[S.]`。  
接下来是数据包中包含的数据的序列号。对于捕获的第一个包，这是一个绝对值。随后的数据包使用一个相对号，以便更容易跟踪。在这个例子中，序列是`seq 196:568`，这意味着这个包包含这个流的`196`到`568`字节。  
然后是`Ack`编号:`Ack 1`。在本例中，它是1，因为这是发送数据的一方。对于接收数据的端，此字段表示此流上的下一个预期字节(数据)。例如，这个流中的下一个包的`Ack`号将是`568`。   
下一个字段是窗口大小`win 309`，它表示接收缓冲区中可用的字节数，然后是`TCP`选项，如`MSS`(最大段大小)或窗口大小。有关TCP协议选项的详细信息，请参阅[传输控制协议(TCP)参数](https://www.iana.org/assignments/tcp-parameters/tcp-parameters.xhtml)。  
最后，我们有数据包长度，长度`372`，它表示负载数据的长度，以字节为单位。长度是序号中最后一个字节和第一个字节之间的差。  
现在，让我们学习如何过滤数据包以缩小结果范围，并使特定问题的故障排除变得更容易。  


# 4. 过滤数据包  
如上所述，`tcpdump`可以捕获太多包，其中一些包甚至与您正在排除的问题无关。例如，如果您正在排除与web服务器的连接问题，而您对SSH流量不感兴趣，因此从输出中删除SSH数据包可以更容易地处理真正的问题。  

`tcpdump`最强大的特性之一是它能够使用各种参数(如源和目标IP地址、端口、协议等)过滤捕获的数据包。让我们来看看一些最常见的。

## 4.1. Protocol
要基于协议过滤数据包，请在命令行中指定协议。例如，使用以下命令用于捕获`ICMP`数据包:  
```bash
$&gt; sudo tcpdump -i any -c5 icmp
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
```
在另一个终端，尝试ping另一台机器:

```bash
$&gt; ping opensource.com
PING opensource.com (54.204.39.132) 56(84) bytes of data.
64 bytes from ec2-54-204-39-132.compute-1.amazonaws.com (54.204.39.132): icmp_seq=1 ttl=47 time=39.6 ms
```

回到`tcpdump`捕获中，注意`tcpdump`只捕获和显示与`icmp`相关的包。在这种情况下，`tcpdump`不显示解析`opensource.com`时生成的名称解析包:
```bash
09:34:20.136766 IP rhel75 &gt; ec2-54-204-39-132.compute-1.amazonaws.com: ICMP echo request, id 20361, seq 1, length 64
09:34:20.176402 IP ec2-54-204-39-132.compute-1.amazonaws.com &gt; rhel75: ICMP echo reply, id 20361, seq 1, length 64
09:34:21.140230 IP rhel75 &gt; ec2-54-204-39-132.compute-1.amazonaws.com: ICMP echo request, id 20361, seq 2, length 64
09:34:21.180020 IP ec2-54-204-39-132.compute-1.amazonaws.com &gt; rhel75: ICMP echo reply, id 20361, seq 2, length 64
09:34:22.141777 IP rhel75 &gt; ec2-54-204-39-132.compute-1.amazonaws.com: ICMP echo request, id 20361, seq 3, length 64
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```
## 4.2. Host
使用主机过滤器将捕获限制为只与特定主机相关的数据包:  
```bash
$&gt; sudo tcpdump -i any -c5 -nn host 54.204.39.132
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
09:54:20.042023 IP 192.168.122.98.39326 &gt; 54.204.39.132.80: Flags [S], seq 1375157070, win 29200, options [mss 1460,sackOK,TS val 122350391 ecr 0,nop,wscale 7], length 0
09:54:20.088127 IP 54.204.39.132.80 &gt; 192.168.122.98.39326: Flags [S.], seq 1935542841, ack 1375157071, win 28960, options [mss 1460,sackOK,TS val 522713542 ecr 122350391,nop,wscale 9], length 0
09:54:20.088204 IP 192.168.122.98.39326 &gt; 54.204.39.132.80: Flags [.], ack 1, win 229, options [nop,nop,TS val 122350437 ecr 522713542], length 0
09:54:20.088734 IP 192.168.122.98.39326 &gt; 54.204.39.132.80: Flags [P.], seq 1:113, ack 1, win 229, options [nop,nop,TS val 122350438 ecr 522713542], length 112: HTTP: GET / HTTP/1.1
09:54:20.129733 IP 54.204.39.132.80 &gt; 192.168.122.98.39326: Flags [.], ack 113, win 57, options [nop,nop,TS val 522713552 ecr 122350438], length 0
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```
在此实例中，`tcpdump`只捕获和显示主机`54.204.39.132`之间的数据包

## 4.3. Port
要根据所需的服务或端口过滤数据包，请使用端口过滤器。例如，使用以下命令捕获与web (HTTP)服务相关的数据包:　　
```bash
$&gt; sudo tcpdump -i any -c5 -nn port 80
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
09:58:28.790548 IP 192.168.122.98.39330 &gt; 54.204.39.132.80: Flags [S], seq 1745665159, win 29200, options [mss 1460,sackOK,TS val 122599140 ecr 0,nop,wscale 7], length 0
09:58:28.834026 IP 54.204.39.132.80 &gt; 192.168.122.98.39330: Flags [S.], seq 4063583040, ack 1745665160, win 28960, options [mss 1460,sackOK,TS val 522775728 ecr 122599140,nop,wscale 9], length 0
09:58:28.834093 IP 192.168.122.98.39330 &gt; 54.204.39.132.80: Flags [.], ack 1, win 229, options [nop,nop,TS val 122599183 ecr 522775728], length 0
09:58:28.834588 IP 192.168.122.98.39330 &gt; 54.204.39.132.80: Flags [P.], seq 1:113, ack 1, win 229, options [nop,nop,TS val 122599184 ecr 522775728], length 112: HTTP: GET / HTTP/1.1
09:58:28.878445 IP 54.204.39.132.80 &gt; 192.168.122.98.39330: Flags [.], ack 113, win 57, options [nop,nop,TS val 522775739 ecr 122599184], length 0
5 packets captured
5 packets received by filter
0 packets dropped by kernel
Source IP/hostname
```
你还可以根据源或目标IP地址或主机名过滤数据包。例如，从主机`192.168.122.98`捕获数据包:  

```bash
$&gt; sudo tcpdump -i any -c5 -nn src 192.168.122.98
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
10:02:15.220824 IP 192.168.122.98.39436 &gt; 192.168.122.1.53: 59332&#43; A? opensource.com. (32)
10:02:15.220862 IP 192.168.122.98.39436 &gt; 192.168.122.1.53: 20749&#43; AAAA? opensource.com. (32)
10:02:15.364062 IP 192.168.122.98.39334 &gt; 54.204.39.132.80: Flags [S], seq 1108640533, win 29200, options [mss 1460,sackOK,TS val 122825713 ecr 0,nop,wscale 7], length 0
10:02:15.409229 IP 192.168.122.98.39334 &gt; 54.204.39.132.80: Flags [.], ack 669337581, win 229, options [nop,nop,TS val 122825758 ecr 522832372], length 0
10:02:15.409667 IP 192.168.122.98.39334 &gt; 54.204.39.132.80: Flags [P.], seq 0:112, ack 1, win 229, options [nop,nop,TS val 122825759 ecr 522832372], length 112: HTTP: GET / HTTP/1.1
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```

注意，tcpdump捕获的数据包的源IP地址为`192.168.122.98`，用于多个服务，比如名称解析(端口53)和HTTP(端口80)。响应包不显示，因为它们的源IP不同。

相反，您可以使用`dst`过滤器按目标IP/主机名进行过滤： 

```bash 
$&gt; sudo tcpdump -i any -c5 -nn dst 192.168.122.98
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
10:05:03.572931 IP 192.168.122.1.53 &gt; 192.168.122.98.47049: 2248 1/0/0 A 54.204.39.132 (48)
10:05:03.572944 IP 192.168.122.1.53 &gt; 192.168.122.98.47049: 33770 0/0/0 (32)
10:05:03.621833 IP 54.204.39.132.80 &gt; 192.168.122.98.39338: Flags [S.], seq 3474204576, ack 3256851264, win 28960, options [mss 1460,sackOK,TS val 522874425 ecr 122993922,nop,wscale 9], length 0
10:05:03.667767 IP 54.204.39.132.80 &gt; 192.168.122.98.39338: Flags [.], ack 113, win 57, options [nop,nop,TS val 522874436 ecr 122993972], length 0
10:05:03.672221 IP 54.204.39.132.80 &gt; 192.168.122.98.39338: Flags [P.], seq 1:643, ack 113, win 57, options [nop,nop,TS val 522874437 ecr 122993972], length 642: HTTP: HTTP/1.1 302 Found
5 packets captured
5 packets received by filter
0 packets dropped by kernel
Complex expressions
```

您还可以通过使用逻辑运算符和and或创建更复杂的表达式来组合过滤器。例如，要从源IP地址`192.168.122.98`和服务HTTP中过滤数据包，请使用以下命令:  

```bash
$&gt; sudo tcpdump -i any -c5 -nn src 192.168.122.98 and port 80
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
10:08:00.472696 IP 192.168.122.98.39342 &gt; 54.204.39.132.80: Flags [S], seq 2712685325, win 29200, options [mss 1460,sackOK,TS val 123170822 ecr 0,nop,wscale 7], length 0
10:08:00.516118 IP 192.168.122.98.39342 &gt; 54.204.39.132.80: Flags [.], ack 268723504, win 229, options [nop,nop,TS val 123170865 ecr 522918648], length 0
10:08:00.516583 IP 192.168.122.98.39342 &gt; 54.204.39.132.80: Flags [P.], seq 0:112, ack 1, win 229, options [nop,nop,TS val 123170866 ecr 522918648], length 112: HTTP: GET / HTTP/1.1
10:08:00.567044 IP 192.168.122.98.39342 &gt; 54.204.39.132.80: Flags [.], ack 643, win 239, options [nop,nop,TS val 123170916 ecr 522918661], length 0
10:08:00.788153 IP 192.168.122.98.39342 &gt; 54.204.39.132.80: Flags [F.], seq 112, ack 643, win 239, options [nop,nop,TS val 123171137 ecr 522918661], length 0
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```

您可以通过使用括号对`filter`进行分组来创建更复杂的表达式。在这种情况下，用引号括住整个过滤器表达式，以防止`shell`将它们与`shell`表达式混淆:  

```bash
$&gt; sudo tcpdump -i any -c5 -nn &#34;port 80 and (src 192.168.122.98 or src 54.204.39.132)&#34;
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
10:10:37.602214 IP 192.168.122.98.39346 &gt; 54.204.39.132.80: Flags [S], seq 871108679, win 29200, options [mss 1460,sackOK,TS val 123327951 ecr 0,nop,wscale 7], length 0
10:10:37.650651 IP 54.204.39.132.80 &gt; 192.168.122.98.39346: Flags [S.], seq 854753193, ack 871108680, win 28960, options [mss 1460,sackOK,TS val 522957932 ecr 123327951,nop,wscale 9], length 0
10:10:37.650708 IP 192.168.122.98.39346 &gt; 54.204.39.132.80: Flags [.], ack 1, win 229, options [nop,nop,TS val 123328000 ecr 522957932], length 0
10:10:37.651097 IP 192.168.122.98.39346 &gt; 54.204.39.132.80: Flags [P.], seq 1:113, ack 1, win 229, options [nop,nop,TS val 123328000 ecr 522957932], length 112: HTTP: GET / HTTP/1.1
10:10:37.692900 IP 54.204.39.132.80 &gt; 192.168.122.98.39346: Flags [.], ack 113, win 57, options [nop,nop,TS val 522957942 ecr 123328000], length 0
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```

在本例中，我们只过滤HTTP服务(端口80)和源IP地址`192.168.122.98`或`54.204.39.132`的数据包。这是检查同一流的两边的一种快速方法。  

# 5. 检查数据包的内容
在前面的示例中，我们只检查信息包的头信息，如源、目标、端口等。有时，这就是我们解决网络连接问题所需要的全部内容。然而，有时我们需要检查包的内容，以确保我们发送的消息包含我们需要的内容，或者我们收到了预期的响应。要查看包内容，tcpdump提供了两个附加标志:-X以十六进制打印内容，ASCII或-A以ASCII打印内容。  

例如，检查Web请求的HTTP内容，如下所示：   
```bash
$&gt; sudo tcpdump -i any -c10 -nn -A port 80
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
13:02:14.871803 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [S], seq 2546602048, win 29200, options [mss 1460,sackOK,TS val 133625221 ecr 0,nop,wscale 7], length 0
E..&lt;..@.@.....zb6.&#39;....P...@......r............
............................
13:02:14.910734 IP 54.204.39.132.80 &gt; 192.168.122.98.39366: Flags [S.], seq 1877348646, ack 2546602049, win 28960, options [mss 1460,sackOK,TS val 525532247 ecr 133625221,nop,wscale 9], length 0
E..&lt;..@./..a6.&#39;...zb.P..o..&amp;...A..q a..........
.R.W.......     ................
13:02:14.910832 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [.], ack 1, win 229, options [nop,nop,TS val 133625260 ecr 525532247], length 0
E..4..@.@.....zb6.&#39;....P...Ao..&#39;...........
.....R.W................
13:02:14.911808 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [P.], seq 1:113, ack 1, win 229, options [nop,nop,TS val 133625261 ecr 525532247], length 112: HTTP: GET / HTTP/1.1
E.....@.@..1..zb6.&#39;....P...Ao..&#39;...........
.....R.WGET / HTTP/1.1
User-Agent: Wget/1.14 (linux-gnu)
Accept: */*
Host: opensource.com
Connection: Keep-Alive

................
13:02:14.951199 IP 54.204.39.132.80 &gt; 192.168.122.98.39366: Flags [.], ack 113, win 57, options [nop,nop,TS val 525532257 ecr 133625261], length 0
E..4.F@./..&#34;6.&#39;...zb.P..o..&#39;.......9.2.....
.R.a....................
13:02:14.955030 IP 54.204.39.132.80 &gt; 192.168.122.98.39366: Flags [P.], seq 1:643, ack 113, win 57, options [nop,nop,TS val 525532258 ecr 133625261], length 642: HTTP: HTTP/1.1 302 Found
E....G@./...6.&#39;...zb.P..o..&#39;.......9.......
.R.b....HTTP/1.1 302 Found
Server: nginx
Date: Sun, 23 Sep 2018 17:02:14 GMT
Content-Type: text/html; charset=iso-8859-1
Content-Length: 207
X-Content-Type-Options: nosniff
Location: https://opensource.com/
Cache-Control: max-age=1209600
Expires: Sun, 07 Oct 2018 17:02:14 GMT
X-Request-ID: v-6baa3acc-bf52-11e8-9195-22000ab8cf2d
X-Varnish: 632951979
Age: 0
Via: 1.1 varnish (Varnish/5.2)
X-Cache: MISS
Connection: keep-alive

&lt;!DOCTYPE HTML PUBLIC &#34;-//IETF//DTD HTML 2.0//EN&#34;&gt;
&lt;html&gt;&lt;head&gt;
&lt;title&gt;302 Found&lt;/title&gt;
&lt;/head&gt;&lt;body&gt;
&lt;h1&gt;Found&lt;/h1&gt;
&lt;p&gt;The document has moved &lt;a href=&#34;https://opensource.com/&#34;&gt;here&lt;/a&gt;.&lt;/p&gt;
&lt;/body&gt;&lt;/html&gt;
................
13:02:14.955083 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [.], ack 643, win 239, options [nop,nop,TS val 133625304 ecr 525532258], length 0
E..4..@.@.....zb6.&#39;....P....o..............
.....R.b................
13:02:15.195524 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [F.], seq 113, ack 643, win 239, options [nop,nop,TS val 133625545 ecr 525532258], length 0
E..4..@.@.....zb6.&#39;....P....o..............
.....R.b................
13:02:15.236592 IP 54.204.39.132.80 &gt; 192.168.122.98.39366: Flags [F.], seq 643, ack 114, win 57, options [nop,nop,TS val 525532329 ecr 133625545], length 0
E..4.H@./.. 6.&#39;...zb.P..o..........9.I.....
.R......................
13:02:15.236656 IP 192.168.122.98.39366 &gt; 54.204.39.132.80: Flags [.], ack 644, win 239, options [nop,nop,TS val 133625586 ecr 525532329], length 0
E..4..@.@.....zb6.&#39;....P....o..............
.....R..................
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```
假设调用使用普通HTTP，这对于解决API调用的问题很有帮助。对于加密连接，这个输出就不那么有用了。  

# 6. 将捕获保存到文件 

`tcpdump`提供的另一个有用特性是能够将捕获保存到文件中，以便稍后分析结果。例如，这允许您在夜间以批处理模式捕获数据包，并在早晨验证结果。当有太多包需要分析时，它也会有帮助，因为实时捕获可能发生得太快。  
要将数据包保存到文件中，而不是显示在屏幕上，请使用选项`-w`:  
```bash
$&gt; sudo tcpdump -i any -c10 -nn -w webserver.pcap port 80
[sudo] password for ricardo:
tcpdump: listening on any, link-type LINUX_SLL (Linux cooked), capture size 262144 bytes
10 packets captured
10 packets received by filter
0 packets dropped by kernel
```

这个命令将输出保存在一个名为`webserver.pcap`的文件中。`pcap`扩展名代表“包捕获”，是这种文件格式的约定。  
如本例所示，屏幕上没有显示任何内容，捕获在捕获10个包之后完成，这与选项`-c10`相同。如果您想要一些反馈以确保正在捕获数据包，请使用选项`-v`。   
`Tcpdump`创建二进制格式的文件，因此不能简单地使用文本编辑器打开它。要读取文件内容，请使用`-r`选项执行`tcpdump`:  
```bash
$&gt; tcpdump -nn -r webserver.pcap
reading from file webserver.pcap, link-type LINUX_SLL (Linux cooked)
13:36:57.679494 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [S], seq 3709732619, win 29200, options [mss 1460,sackOK,TS val 135708029 ecr 0,nop,wscale 7], length 0
13:36:57.718932 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [S.], seq 1999298316, ack 3709732620, win 28960, options [mss 1460,sackOK,TS val 526052949 ecr 135708029,nop,wscale 9], length 0
13:36:57.719005 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [.], ack 1, win 229, options [nop,nop,TS val 135708068 ecr 526052949], length 0
13:36:57.719186 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [P.], seq 1:113, ack 1, win 229, options [nop,nop,TS val 135708068 ecr 526052949], length 112: HTTP: GET / HTTP/1.1
13:36:57.756979 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [.], ack 113, win 57, options [nop,nop,TS val 526052959 ecr 135708068], length 0
13:36:57.760122 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [P.], seq 1:643, ack 113, win 57, options [nop,nop,TS val 526052959 ecr 135708068], length 642: HTTP: HTTP/1.1 302 Found
13:36:57.760182 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [.], ack 643, win 239, options [nop,nop,TS val 135708109 ecr 526052959], length 0
13:36:57.977602 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [F.], seq 113, ack 643, win 239, options [nop,nop,TS val 135708327 ecr 526052959], length 0
13:36:58.022089 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [F.], seq 643, ack 114, win 57, options [nop,nop,TS val 526053025 ecr 135708327], length 0
13:36:58.022132 IP 192.168.122.98.39378 &gt; 54.204.39.132.80: Flags [.], ack 644, win 239, options [nop,nop,TS val 135708371 ecr 526053025], length 0
$&gt; 
```
由于不再直接从网络接口捕获数据包，所以不需要sudo来读取文件。  
您还可以使用我们讨论过的任何过滤器来过滤文件中的内容，就像处理实时数据一样。例如，执行以下命令检查源IP地址`54.204.39.132`的捕获文件中的数据包:  
```bash
$&gt; tcpdump -nn -r webserver.pcap src 54.204.39.132
reading from file webserver.pcap, link-type LINUX_SLL (Linux cooked)
13:36:57.718932 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [S.], seq 1999298316, ack 3709732620, win 28960, options [mss 1460,sackOK,TS val 526052949 ecr 135708029,nop,wscale 9], length 0
13:36:57.756979 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [.], ack 113, win 57, options [nop,nop,TS val 526052959 ecr 135708068], length 0
13:36:57.760122 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [P.], seq 1:643, ack 113, win 57, options [nop,nop,TS val 526052959 ecr 135708068], length 642: HTTP: HTTP/1.1 302 Found
13:36:58.022089 IP 54.204.39.132.80 &gt; 192.168.122.98.39378: Flags [F.], seq 643, ack 114, win 57, options [nop,nop,TS val 526053025 ecr 135708327], length 0
```

`next` ? 
`tcpdump`的这些基本特性将帮助您开始使用这个功能强大的通用工具。要了解更多信息，请访问`tcpdump`网站和`man`页面。  
`tcpdump`命令行接口为捕获和分析网络流量提供了很大的灵活性。如果您需要图形化工具来理解更复杂的流，请查看`Wireshark`。  
`Wireshark`的一个优点是它可以读取`tcpdump`捕获的`.pcap`文件。您可以使用`tcpdump`在没有`GUI`的远程机器中捕获数据包，并使用`Wireshark`分析结果文件，但这是另一个主题。  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E4%BB%8B%E7%BB%8D%E5%9C%A8linux%E5%91%BD%E4%BB%A4%E8%A1%8C%E4%B8%AD%E4%BD%BF%E7%94%A8tcpdump/  

