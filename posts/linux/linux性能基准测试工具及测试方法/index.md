# Linux 性能基准测试工具及测试方法


```mermaid
graph TB
    A[Linux 性能基准/测试] --&gt; B[CPU]
    A --&gt; C[内存]
    A --&gt; D[磁盘 IO]
    A --&gt; E[文件 IO]
    A --&gt; F[网络]
    A --&gt; G[应用程序]
    
    B --&gt; H[Super_Pi 测试单线程性能]
    B --&gt; I[sysbench 测试多线程性能]
    
    C --&gt; J[stream 测试内存带宽]
    
    D --&gt; K[fio 测试IOPS]
    D --&gt; L[fio 测试吞吐量]
    
    E --&gt; M[fio 测试IOPS]
    E --&gt; N[fio 测试吞吐量]
    
    F --&gt; O[netperf 测试带宽]
    F --&gt; P[netperf 测试PPS]
    G --&gt; Q[wrk 测试 Nginx QPS]
```

# CPU
## Super_Pi 
`Super_Pi` 是一种用于计算圆周率π的程序，通常用于测试计算机性能和稳定性。它的主要用途是测量系统的单线程性能，因为它是一个单线程应用程序。 
```bash
# 安装 bc
$&gt; yum -y install bc
# 测试 , 根据运行结果。查看 real 行，时间越短，性能越好 
$&gt; time echo &#34;scale=5000; 4*a(1)&#34; | bc -l -q &amp;&gt;1 

```

## sysbench 素数计算
```bash
# 安装 sysbench
$&gt; yum -y install sysbench
# 测试方法: 启动4个线程计算10000事件所花的时间
## 结果分析，看 total time 即可，时间越短，性能越好
$&gt; sysbench cpu --threads=4 --events=10000 --time=0  run 

```

# 内存
## 内存带宽(stream)
- Stream测试是内存测试中业界公认的内存带宽性能测试基准工具
```bash
# 编译安装 STREAM
$&gt; yum -y install gcc gcc-gfortran
$&gt; git clone https://github.com/jeffhammond/STREAM.git
$&gt; cd STREAM/
$&gt; make
# 指定线程数
$&gt; export OMP_NUM_THREADS=1
# 结果分析，看 Copy、Scale、Add、Triad，数值越大，性能越好
$&gt; ./stream_c.exe
```

# 磁盘 IO/文件 IO
`磁盘 IO` 和 `文件 IO`的测试方法一致，将对应的 `--filename` 值修改为具体的磁盘即可，如 `/dev/sda`(***注:磁盘IO测试时，请用空盘测试***)
## 磁盘/文件读、写iops
- `iops`：磁盘的每秒读写次数，这个是随机读写考察的重点
```bash
# 安装
$&gt; yum -y install fio
# 测试随机读 IOPS
$&gt; fio --ioengine=libaio --bs=4k --direct=1 --thread --time_based --rw=randread --filename=/home/randread.txt --runtime=60 --numjobs=1 --iodepth=1 --group_reporting --name=randread-dep1 --size=1g
# 测试随机写 IOPS
$&gt; fio --ioengine=libaio --bs=4k --direct=1 --thread --time_based --rw=randwrite --filename=/home/randwrite.txt --runtime=60 --numjobs=1 --iodepth=1 --group_reporting --name=randread-dep1 --size=1g

# 结果分析，看 IOPS 即可，值越大，性能越好
```
- 因地制宜，灵活选取。在基准测试时，一定要注意根据应用程序 `I/O` 的特点，来具体评估指标
比如 `etcd`  磁盘性能衡量指标为：`WAL` 文件系统调用 `fsync` 的延迟分布，当 `99%` 样本的同步时间小于 `10` 毫秒就可以认为存储性能能够满足 `etcd` 的性能要求。
```bash
$&gt; mkdir etcd-bench 
$&gt; fio --rw=write --ioengine=sync --fdatasync=1 --directory=etcd-bench --size=22m --bs=2300 --name=etcd-bench
```

# 网络
## 传输速率(pps)
```bash
# server &amp; client 编译安装 netserver
$&gt; wget -c &#34;https://codeload.github.com/HewlettPackard/netperf/tar.gz/netperf-2.5.0&#34; -O netperf-2.5.0.tar.gz
$&gt; yum -y install gcc cc 
$&gt; tar zxvf netperf-2.5.0.tar.gz
$&gt; cd netperf-netperf-2.5.0
$&gt; ./configure &amp;&amp; make &amp;&amp; make install

# server 端启动 netserver
$&gt; netserver
# 监控数据
$&gt; sar -n DEV 5

# client 端测试
$&gt; netperf -t UDP_STREAM -H &lt;server ip&gt; -l 100 -- -m 64 -R 1 &amp;
# 监控数据
$&gt; sar -n DEV 5

# 结果分析，看 rxpck/s,txpck/s 值即可，值越大，性能越好
```

## 网络带宽
宽带测速还有个工具-`iperf3` 

&gt; https://iperf.fr/iperf-download.php  

```bash
# server 端启动 netserver
$&gt; netserver
# 监控数据
$&gt; sar -n DEV 5
 
# client 端测试
$&gt; netperf -t TCP_STREAM -H &lt;server ip&gt; -l 100 -- -m 1500 -R 1 &amp;
# 监控数据
$&gt; sar -n DEV 5

# 结果分析，看 rxkB/s,txkB/s 值即可，值越大，性能越好
```

## 单向时延
```bash
# 服务端：
yum install -y sockperf
sockperf sr --daemonize &gt; /dev/null 2&gt;&amp;1
 
# 客户端：
sockperf under-load -i serverip  --mps=100000 -t 300 -m 14 --reply-every=50 --full-log=sockperf.out
 
# mps: 每秒多少请求   -t 测试时间 -m 每个请求大小(默认14byte)
```


# Nginx
```bash
# 安装 ab 工具
$&gt; yum -y install httpd-tools

# 编译安装 wrk
$&gt; git clone https://github.com/wg/wrk.git
$&gt; make
$&gt; cp wrk /usr/local/bin/
 
# 测试，-c表示并发连接数1000，-t表示线程数为2，-d 表示测试时间
## # 结果分析，Requests/sec 为 QPS
$&gt; wrk -t12 -c400 -d30s &lt;URL&gt;
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/linux%E6%80%A7%E8%83%BD%E5%9F%BA%E5%87%86%E6%B5%8B%E8%AF%95%E5%B7%A5%E5%85%B7%E5%8F%8A%E6%B5%8B%E8%AF%95%E6%96%B9%E6%B3%95/  

