# 磁盘IO测试工具_FIO


{{< admonition type=quote title="" open=true >}}
> 本文收集于[https://www.toutiao.com/a6715391531496243720/](https://www.toutiao.com/a6715391531496243720/),但未经测试,仅用于收藏,转载请直接表明原文出处 .  
{{< /admonition >}}


# 前言
&emsp;&emsp;fio是测试IOPS的非常好的工具，用来对硬件进行压力测试和验证，支持13种不同的I/O引擎，包括:sync,mmap, libaio, posixaio, SG v3, splice, null, network, syslet, guasi, solarisaio 等等。  
&emsp;`注意: 性能测试建议直接通过写裸盘的方式进行测试，会得到较为真实的数据。但直接测试裸盘会破坏文件系统结构，导致数据丢失，请在测试前确认磁盘中数据已备份.`

**以下基于centos7系统做测试。**

# 1. 安装步骤

```bash
#yum安装 
yum install libaio-devel fio -y
#手动安装 
yum install libaio-devel 
wget http://brick.kernel.dk/snaps/fio-2.2.10.tar.gz 
tar -zxvf fio-2.2.10.tar.gz cd fio-2.2.10 
make
make install
```
# 2. FIO的用法
FIO分顺序读，随机读，顺序写，随机写，混合随机读写模式。  
```bash
# --顺序读模式：
fio -filename=/dev/sdb -direct=1 -iodepth 1 -thread -rw=read -ioengine=psync -bs=16k -size=10G -numjobs=30 -runtime=1000 \
-group_reporting -name=mytest
# --随机读模式：
fio -filename=/dev/sdb -direct=1 -iodepth 1 -thread -rw=randread -ioengine=psync -bs=16k -size=10G -numjobs=30 -runtime=1000 \
-group_reporting -name=mytest
# --顺序写模式：
fio -filename=/dev/sdb -direct=1 -iodepth 1 -thread -rw=write -ioengine=psync -bs=16k -size=10G -numjobs=30 -runtime=1000 \
-group_reporting -name=mytest
# --随机写模式：
fio -filename=/dev/sdb -direct=1 -iodepth 1 -thread -rw=randwrite -ioengine=psync -bs=16k -size=10G -numjobs=30 -runtime=1000 \
-group_reporting -name=mytest
# --混合随机读写模式：
fio -filename=/dev/sdb -direct=1 -iodepth 1 -thread -rw=randrw -rwmixread=70 -ioengine=psync -bs=16k -size=10G -numjobs=30 \
-runtime=100 -group_reporting -name=mytest -ioscheduler=noop
```

## 2.1. 说明： 
- `filename=/dev/sdb1` 测试文件名称，通常选择需要测试的盘的data目录。 
- `direct=1` 测试过程绕过机器自带的buffer。使测试结果更真实。  
- `rw=randwrite` 测试随机写的I/O  
- `rw=randrw` 测试随机写和读的I/O  
- `bs=16k` 单次io的块文件大小为16k  
- `bsrange=512-2048` 同上，提定数据块的大小范围  
- `size=5G` 本次的测试文件大小为5g，以每次4k的io进行测试。  
- `numjobs=30` 本次的测试线程为30个.  
- `runtime=1000` 测试时间为1000秒，如果不写则一直将5g文件分4k每次写完为止。  
- `ioengine=psync` io引擎使用pync方式  
- `rwmixwrite=30` 在混合读写的模式下，写占30%  
- `group_reporting` 关于显示结果的，汇总每个进程的信息。  
- `lockmem=1G` 只使用1g内存进行测试。  
- `zero_buffers` 用0初始化系统buffer。  
- `nrfiles=8` 每个进程生成文件的数量。  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E7%A3%81%E7%9B%98io%E6%B5%8B%E8%AF%95%E5%B7%A5%E5%85%B7_fio/  

