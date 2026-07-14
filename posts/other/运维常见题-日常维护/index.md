# 运维常见题-日常维护


## Linux 内存中的 Buffer 与 Cache 有什么作用？  
- **在`Linux`中内存管理中，`Buffer`(缓冲区)和 `Cache`(缓存)都是为了弥补`CPU`/内存的高速与磁盘`I/O`的低速之间的性能鸿沟，但他们的作用对象和关注点有所不同。**  
    1. `Cache` (`页面缓存` / `Page Cache`)
        - `作用对象`：主要针对于文件系统(File System)的文件
        - `工作原理`：当系统读取或写入磁盘上的文件时，内核会将文件的内容缓存在内存中。下次如果再有进程访问相同的文件数据，系统会直接从内存的`Cache`中读取，从而极大的提高了文件读写的命中率和速度
        - `关键点`：他是"文件级别"的缓存

    2. `Buffer` (`块缓冲区` / `Buffer Cache`)
        - `作用对象`：主要针对原始块设备(Raw Block Device) 的裸数据。
        - `工作原理`：它处于更底层，绕过了文件系统，直接记录磁盘块(Block)的元数据(Metadata)和控制信息。例如，当系统需要读取或写入磁盘的超级快(Superblock)、目录结构、索引节点(Inode)或者直接对磁盘进行 `dd` 等块级别操作时，数据会被缓存在`Buffer`中。
        - `关键点`：它是"块级别"的缓冲区，主要用于合并和优化底层的磁盘I/O写入操作。

- **现代 `Linux` 的融合**
    - 在现代 `Linux`内核(2.4版本以后)中，这两者在实现上已经融合了。`Buffer`实际上指向的是 `Cache` 中对应的页面。简单来说: 1. 当我们讨论读取文件的读写优化时，他表现为 `Cache`; 2. 当我们讨论对磁盘块/元数据的组织和等待刷盘时候，他表现为 `Buffer`

- **协助记忆**
    - `Cache`缓存是**信件内容**(文件本身，方便重复阅读)
    - `Buffer`缓冲是"**装信纸的箱子**"(底层的块，凑满一箱在一起发货) 

- **进阶思考**
    - 在 Linux 中，如果我们发现 free 内存很少，但是 buff/cache 很大，这时候系统算不算内存不足？我们需要手动去释放它吗?
        - 系统不算内存不足，通常也完全不需要手动去清理。`linux` 有自己的管理机制,我们更多需要关注的是 `available` 那一列
        - 如何释放? 
            - 通过修改 `/proc/sys/vm/drop_caches` 来进行，修改前必须先执行 `sync` 来强制将内存中尚未写入磁盘的脏页（Dirty Pages）立即刷写到存储介质中, 否则可能会导致部分正在高速写入的数据丢失，或者引发文件系统损坏。 
                1. `echo 1 > /proc/sys/vm/drop_caches` 仅释放页缓存（Page Cache）
                2. `echo 2 > /proc/sys/vm/drop_caches`: 仅释放可回收的对象（包括 inode 和 dentry）
                3. `echo 3 > /proc/sys/vm/drop_caches`: 同时释放页缓存和可回收对象(完整清理，相当于执行了 1 + 2)
            - 如果执行了 `echo 3 > /proc/sys/vm/drop_caches` buffer/cache 变化仍然不明显，这是为什么？
                1. **存在大量“脏页”（Dirty Pages）**： 内核只能释放已经同步到磁盘的“干净缓存”。如果系统当前有高并发的写入操作，或者磁盘 I/O 存在瓶颈，导致内存中积压了大量的“脏页”（尚未刷盘的数据），这些数据是绝对不会被释放的。 (可以通过 `cat /proc/meminfo | grep -i dirty` 查看脏页大小。)
                2. **进程正在占用/锁定文件（Active Cache）**：如果某些文件正被进程打开并持续读取或写入（例如数据库、大型日志收集程序），或者进程使用了 mmap 系统调用将文件映射到了自己的内存空间，甚至使用了 mlock 锁定了内存，这部分缓存被标记为“活跃（Active）”，内核为了保证运行安全，不会释放它们。 
                3. **共享内存（Shared Memory / tmpfs）的占用**： 在 `Linux` 的 `free` 命令中，共享内存（Shared Memory）和 tmpfs（内存文件系统）也是被计入 cache 列的。常见的诸如 Oracle/PostgreSQL 的共享内存段（Shared Buffers）、Docker 容器的部分运行数据，或者 /dev/shm 路径下存放的文件，这部分内存在底层本质上是匿名内存（Anonymous Memory），它们不是文件缓存，drop_caches 对它们完全无效。要释放它们，必须杀掉对应进程或删除 tmpfs 中的文件。(可执行 ipcs -m 查看共享内存，或查看 free -m 中的 shared 列是否很高。)

## Linux 系统 CPU 持续飙高，如何排查？  
- **首先，在终端执行 `top/htop` 查看一下几个特定指标状态,同时按`P`键位按`CPU`使用率进行排序，找出消耗`CPU`最高的那个程序**  
    - `us`(`User`): 用户态, 如果这个指标过高，那么说明是应用程序(java/php/go/...)的代码在进行大量的计算  
    - `sy`(System): 内核态，如果这个指标过高，那么说明系统调用频繁，可能存在大量的磁盘I/O、网络I/O或者是锁竞争  
    - `wa`(`I/O Wait`)：等待 I/O, 如果是这个指标过高，那说明磁盘读写成了瓶颈，CPU 在空转等待。  
- **定位到具体的PID后，使用 top -H -p <PID> ，获取到所有的线程ID, 找到 CPU 占用最高的线程ID(TID: 一般就是第一个，即PID)，如果是java等应用，线程ID通常为十六进制，需使用 printf "%x\n" <TID>将我们获取到的TID(十进制)转换为十六进制(假设转换后的结果为4e8)，然后使用 jstack <PID> | grep -A 20 0x4e8就能直接精确捕获到该线程正在执行的具体代码行数（例如某段死循环、频繁的 GC 线程、或者序列化操作）， 如果是GO、C/C++等应用，可以使用 pstack <PID>**

- **协助记忆**
    1. 找进程 (top 看整体)
    2. 抠线程 (top -H 定线程)
    3. 换进制 (printf 转十六)
    4. 抓代码 (jstack / perf 显原形)

- **进阶思考**
如果通过 top 发现系统 CPU 确实很高，但是按 P 排序后，却找不到任何一个明显占用高的进程，所有进程的 CPU 看起来都很低，这可能是什么原因导致的？该怎么排查？
    - 此类问题通常是由**短生命周期进程疯狂周期性死循环**或**系统被植入了隐蔽的挖矿木马**导致的
        1. 使用 `pidstat` 抓取瞬时进程 (`sysstat` 工具集)
            - 执行 `pidstat -u 1`每秒滚动一次，有几率抓出具体的问题进程
        2. ***暂时只了解过这种方式***

## Linux 服务器如何查看硬件信息？  
- **查看CPU信息**: `cat /proc/cpuinfo`、`lscpu`
- **查看内存信息**：`free -h`（或 `free -m`）、`dmidecode -t memory`
- **查看磁盘及存储信息**：
    - `df -h`: 查看当前已挂载的文件系统磁盘空间使用率
    - `lsblk`：以树状图形式列出所有磁盘（如 sda、nvme0n1）及其分区结构，能一眼看出磁盘的大小和类型
    - `fdisk -l`、 `smartctl -a /dev/sda`(smartmontools)：查看全量硬件及健康状态
- **查看网卡与 PCIE 设备**：
    - `ip a`、`ifconfig`：网卡 IP、MAC 地址和状态。
    - `ethtool eth0`：网卡硬件速率
    - `lspci`：主板总线设备

- **一个低估了的神器**: inxi， inxi 能够跨发行版整合所有硬件、驱动甚至系统组件信息，并以极具可读性的彩色排版输出。

## 简述 Iptables 四表五链及其作用？  
- `iptables`的核心结构可以概括为 表(tables) > 链(chains) > 规则(rules), 他们共同决定了一个数据包在经过linux内核时候的去留和处理方式。
    - **四表(Tables),他决定做什么**：表的定义决定了对数据包进行什么类型的操作，按照优先级从高到底(排队处理顺序)  
        1. `RAW`表：负责状态跟踪脱离， 他可以让特定的数据包绕过连接跟踪机制(Connection Tracking)， 通常用于高并发下不需要追踪状态的数据包，以节省CPU资源.
        2. `mangle`表： 负责拆解与修改数据包。他可以修改数据包的头部信息， 如 TTL、TOS，或者给数据包打上特定的标记，常用于策略路由或流量整形。
        3. `NAT`表: 负责网络地址转换(Network Address Translation)，用于修改数据包的源IP/端口(SNAT)或目标IP/端口(DNAT)。 比如让内网服务器共享上网或进行端口映射。
        4. `filter`表：负责过滤与安全(防火墙默认表)，决定是否放行(INPUT)、拒绝(REJECT)、丢弃(DROP)数据包
    - **五链(Chains),他决定在哪做**：链的作用是定义在网络传输的那个阶段(时机)去执行这些表里的规则。这五个链对应了内核网络栈的五个关键检查点
        1. `PREROUTING`链：路由前。数据包刚到达网卡、尚未经过路由决策（不知道该发给本地还是转发）时触发。常用于 DNAT（目的地址转换）
        2. `INPUT`链：入站。通过路由决策后，发现数据包的目的地是本地系统，在进入用户空间应用之前触发。常用于本地防火墙入站策略。
        3. `FORWARD`链：转发。通过路由决策后，发现数据包目的地不是本地，而是需要通过本机转发到其他网络时触发。常用于把 Linux 当作路由器/网关。
        4. `OUTPUT`链：出站。由本地应用程序产生的、准备发往外部网络的数据包，在离开本地前触发。常用于限制本地向外的访问。
        5. `POSTROUTING`链：路由后。数据包在完成所有路由决策、即将从网卡发送出去的最后一刻触发。常用于 SNAT（源地址转换/源地址伪装）。

- **协助记忆**
    1. 四表功能（优先级）：Raw -> Mangle -> Nat -> Filter（谐音速记：热（R）面包（M）拿（N）来放（F））
    2. 五链时机：进前（Pre）、入内（Input）、转发（Forward）、出本地（Output）、出网卡（Post）。

- **进阶思考**
请用具体的 iptables 命令分别写出如何实现 SNAT（源地址转换）和 DNAT（目的地址转换）？并在什么场景下使用？
    - SNAT（源地址转换）
        - 场景：公司内网有大量私网服务器（如 10.0.2.0/24），只有一台公网网关（外网 IP 172.15.31.10）。需要让内网服务器能够访问外网。
            - **核心命令（在 POSTROUTING 链）**：`iptables -t nat -A POSTROUTING -s 10.0.2.0/24 -j SNAT --to-source 172.15.31.10`
    - **DNAT（目的地址转换）**：
        - 场景：公司的核心数据库在内网（10.0.2.10:3306），现在需要让公网上的出差员工通过访问公网网关的 3306 端口，直接连接到内网的数据库。
            - **核心命令（在 PREROUTING 链）**： `iptables -t nat -A PREROUTING -d 202.100.1.1 -p tcp --dport 3306 -j DNAT --to-destination 192.168.1.10:3306`

## 简述 RAID0、RAID1、RAID5 和 RAID10 的区别与适用场景？  
- `RAID 0`(条带化/Stripping)
    - **工作原理**：将数据切分成块，均匀地、交错地写入到所有磁盘中。
    - **磁盘利用率**：100%（$N$ 块盘，容量为 $N \times \text{单盘容量}$）。
    - **优缺点**：
        - **优点**：读写性能在所有 RAID 中最高，因为多块盘可以并行读写。
        - **缺点**：没有任何冗余能力。任何一块盘损坏，整个阵列的数据全部崩溃。
    - **适用场景**：对安全性零要求，但对读写速度要求极高的临时数据或缓存场景，如视频剪辑的临时渲染盘、分布式计算的临时缓存区（Swap / Scratch Space）。
    - **最少磁盘数**：1 块（通常 2 块及以上才能体现性能优势）。

- `RAID 1`(镜像/Mirroring)
    - **工作原理**：将数据完全复制到所有磁盘中。
    - **磁盘利用率**：50%（$N$ 块盘，容量为 $\frac{N}{2} \times \text{单盘容量}$）
    - **优缺点**：
        - **优点**：安全性极高，只要有一块盘存活，数据就不会丢失。读取性能好（可以从两块盘并行读）。
        - **缺点**：写入性能受限于最慢的那块盘，且磁盘利用率极低，成本高。
    - **适用场景**：对数据安全性要求极高、系统盘或者核心配置存储。例如操作系统的引导盘（OS Boot Disk）、金融系统的核心日志盘。
    - **最少磁盘数**：2 块。

- `RAID 5`（分布式奇偶校验 / Distributed Parity）
    - **工作原理**：数据条带化存储，但每次写入时会计算出奇偶校验信息（Parity），并将校验数据轮流循环存储在每块磁盘上。
    - **磁盘利用率**：$\frac{N-1}{N}$（$N$ 块盘，牺牲一块盘的容量来存校验信息）
    - **优缺点**：
        - **优点**：兼顾了性能、安全和成本。允许任意一块磁盘损坏而不丢失数据（通过其余盘和校验块计算恢复）。
        - **缺点**：写入时需要重新计算校验码（写惩罚较大），写入性能一般。如果坏了一块盘，在更换新盘进行"数据重构（Rebuild）"时，剩余磁盘的 I/O 压力极大，此时极易再坏第二块盘导致整个阵列瘫痪。
    - **适用场景**：适合读多写少、对性价比要求高的大容量存储。例如企业内部的常规文件服务器、非核心业务的日志存储、代码仓库。
    - **最少磁盘数**：3 块。

- `RAID 10`（先镜像再条带化 / RAID 1 + 0）
    - **工作原理**：它是 RAID 1 和 RAID 0 的组合拳。先每两块盘组成一个 RAID 1 镜像对保证安全，再将这些镜像对组合成一个 RAID 0 进行条带化提升性能。  
    - **磁盘利用率**：50%。  
    - **优缺点**：  
        - **优点**：继承了 RAID 0 的高读写性能和 RAID 1 的高安全性。在最理想的情况下，即使坏掉一半数量的磁盘（只要不是同一个 RAID 1 镜像对里的两块盘同时坏），阵列依然能正常运转。数据重构时只需在镜像对内对拷，速度极快，风险较低。  
        - **缺点**：成本昂贵，磁盘利用率低。  
    - **适用场景**：高并发、高负载、对数据安全和性能都有极高要求的核心生产环境。例如大型核心关系型数据库（MySQL / Oracle / PostgreSQL）、虚拟化宿主机的底层存储。
    - **最少磁盘数**：4 块（通常 6 块及以上才能体现性能优势，必须是偶数）。

- **协助记忆**：
    - 快(RAID 0) -> 保(RAID 1) -> 省(RAID 5) -> 豪(RAID 10)

- **进阶思考**：
    - 如果线上一个核心数据库的 RAID 10 阵列（由 4 块盘组成）中，突然有一块硬盘报红灯损坏（Degraded 状态）。此时作为运维，你该如何处理？在处理过程中有哪些高风险点需要注意？
        - 第一步：立即确认数据备份；在对硬件进行任何物理操作之前，必须第一时间检查该数据库的自动化备份（如全备、增量日志/binlog）是否完整、可用。因为任何硬件更换都有引发二次故障的极端风险，必须有备份兜底
        - 第二步：通过工具定位故障盘物理位置；使用服务器厂商提供的命令行工具（如戴尔的 perccli、华为的 storcli 或 MegaRAID 的 MegaCli）查看阵列状态，确认损坏盘的 Slot（槽位号），并开启定位灯（Enclosure Beacon），防止在线拔错盘（运维大忌：拔错盘会导致阵列直接崩溃）。
        - 第三步：在线热插拔更换新盘（同型号、同容量）； RAID 10 支持热插拔。确认槽位后，拔出坏盘，插入准备好的同型号、同容量新盘。
        - 第四步：监控数据重构（Rebuild）状态与系统负载，新盘插入后，阵列会自动开始 Rebuild。此时需要：
            - 监控重构进度（使用 storcli /c0/eall/sall show rebuild）
            - 控制业务线上的 I/O 负载：数据重构会极大地消耗剩余那块镜像盘的 I/O 性能。如果此时线上依然有高并发的密集写入，可能会导致重构时间拉长，甚至让仅存的那块镜像盘过载损坏。因此，必要时应该在业务低峰期进行、或者限制重构的 I/O 速率（Throttling）。
    - `RAID 3` 是什么？
        - RAID 3（专用校验盘 + 字节级条带化）：
            - **机制**：它把数据分成很小的字节（Byte）级别，轮流写入各个数据盘。最核心的是，它固定使用一块专门的磁盘来存储所有的校验数据。
            - **缺点**：由于每次写数据都要更新校验信息，那块专用的校验盘就会遭遇严重的 I/O 瓶颈（写热点），极易过载损坏。因此，RAID 3 在现代运维中几乎已经被淘汰。
    - `RAID 10` 和 `RAID 01` 有什么区别？
        - `RAID 10`（先镜像，再条带化 - 推荐）：
            - **结构**：假设有 4 块盘，两两一组。A1 和 A2 组成 RAID 1 镜像，B1 和 B2 组成另一个 RAID 1 镜像。然后这两个独立的镜像组再拼成一个 RAID 0。
            - **坏盘容错**：如果 A1 坏了，只有 A1 所在的局部镜像受影响。此时只要 A2 不坏，整个阵列完好无损，依然拥有高性能。更换 A1 时，也只需要从 A2 单对单对拷，重构极快。 
        - `RAID 01`（先条带化，再镜像 - 极少使用）：
            - **结构**：A1 和 B1 拼成一个具有高性能的 RAID 0，A2 和 B2 拼成另一个 RAID 0。然后这两个庞大的 RAID 0 互为镜像。
            - **坏盘容错**：如果 A1 坏了，导致它所在的左侧整个 RAID 0 直接瘫痪。此时系统只能完全依靠右侧的 RAID 0 顶着。更换 A1 新盘时，由于左侧阵列已经崩了，必须从右侧的 A2 和 B2 整组读取数据来重构左侧，这会导致剩余磁盘面临巨大的 I/O 压力，极易引发二次坏盘崩溃。
        - **RAID 10 vs RAID 01**：RAID 10 在安全性上完爆 RAID 01。在生产环境中，请永远选择 RAID 10，忘掉 RAID 01。


## 提示磁盘空间已满，该如何解决？  
如果在生产环境中遇到提示磁盘空间已满（Disk Full），通常会分两个大方向去快速排查和定位：第一是空间真正被占满，第二是 Inode 节点耗尽。
- **应急止血，恢复可用性**：磁盘写满可能导致服务崩溃甚至 SSH 登不上，先腾点空间让系统喘口气(*建议可以在服务器初始化的时候，就创建一个几GB大小的文件，用于应急时候的清理*)
    1. 确认哪个挂载点满了: `df -h`
    2. systemd 日志，清理一天前的内容，释放很快: `journalctl --vacuum-time=1d`
    3. 清空日志内容但不删文件，进程句柄不受影响(truncate -s 0 /var/log/messages)。尽量别用 rm，否则进程还抓着旧 inode 空间不归还 
    4. 清理临时目录: `rm -rf /tmp/* /var/tmp/*`

- **精准定位元凶**：
    - `df -i` 查 Inode（经典坑：df -h 显示正常但写不进文件） 
        - `Inode` 满了说明海量小文件撑爆了`inode`表。用 `find /path -type f | wc -l` 定位目录，然后 `find /path -type f -delete` 或 `xargs rm -f` 批量清理
        - `lsof | grep '(deleted)'` 查已删文件但进程还抓着句柄不放
        - `lsof` 用 (`deleted`) 标记未释放的句柄，找到对应 PID 后 `systemctl restart <service>` 或 `kill` 掉
        - `du -h --max-depth=1 /var | sort -hr | head 10` 逐级往下找大目录
        - `find / -type f -size +1G` 直接盘全盘的大文件

- **协助记忆**
    - 一止血（journalctl / truncate），二排雷（df -i / lsof / du），三根治（logrotate + 监控）

- **进阶思考**
    - truncate 了日志但空间没变化？
        - 进程没收到 SIGHUP，还在往旧 inode 写。kill -HUP <PID> 让进程重新 open 日志文件。logrotate 的 postrotate 脚本就是这个原理
    - df 和 du 不一致？
        - 大概率有进程在写一个大文件并且中途被删了。lsof | grep '(deleted)' 定位后重启服务

## 简述 DNS 解析过程？  
- DNS（Domain Name System）解析的核心是将人类可读的域名（如 www.example.com）转换为机器可读的 IP 地址（如93.184.216.34）。整个过程涉及多级缓存和多级递归查询，目的是尽量让解析结果在离用户最近的地方命中，减少逐级往上问的耗时  
    1. **本地缓存与 hosts 文件（系统级命中）**：
        - `浏览器自身缓存` → `操作系统缓存`（如 systemd-resolved / nscd）→ `/etc/hosts` 文件, `/etc/nsswitch.conf` 控制解析顺序（通常配置为 hosts: files dns，先查 hosts 再走 DNS）, 这一步如果命中就直接返回，不产生网络请求
    2. **向本地 DNS 递归服务器发起查询**
        - 检查 `/etc/resolv.conf` 里配置的 nameserver（通常是 网关、运营商 DNS 或 内网 DNS 如 8.8.8.8 / 114.114.114.114）; 如果本地 DNS 有缓存，直接返回；没有则往下走 
    3. **逐级递归查询（从根到叶子）**
        - **根域名服务器（Root Server）**：全世界共 13 组（a.root-servers.net ~ m.root-servers.net），返回顶级域（.com / .cn / .org 等）的 NS 地址
        - **顶级域名服务器（TLD Server）**：返回该域名的权威 NS 地址，例如 example.com 的权威 NS 是 dns1.namecheap.com
        - **权威域名服务器（Authoritative Server）**：这是域名的最终归宿，直接返回域名对应的记录（A / AAAA / CNAME / MX 等
    4. **DNS 记录类型（常见的几种）**
        - `A / AAAA`：域名对 IPv4 / IPv6 地址
        - `CNAME`：别名指向（www → example.com）
        - `MX`：邮件交换记录
        - `NS`：域名服务器记录
        - `TXT`：文本记录（常用于域名验证 / SPF / DKIM）


- **常用排查命令**
    - `dig +trace example.com`：完整追踪递归路径
    - `nslookup example.com`：基础查询
    - `host example.com`：快速查 IP

- **协助记忆**： 
    - 查通讯录（本地缓存/hosts）→ 问总机（递归 DNS）→ 总台指引区域（根）→ 区域指到门牌（TLD）→ 门牌给电话（权威）

- **进阶思考**：
    - `dig` 返回了结果但浏览器就是打不开，还可能是什么问题?
        - ：可能是 /etc/nsswitch.conf 里 hosts: dns files 顺序颠倒了，或者 systemd-resolved 的缓存污染了，resolvectl flush-caches 清一下
    - DNS 解析异常缓慢，怎么定位瓶颈?
        - dig + trace 看每级响应时间，如果根或 TLD 响应慢是运营商递归 DNS 的问题；如果权威 NS 慢是对方的服务问题。也可以对比 dig @8.8.8.8 和 dig @114.114.114.114 看谁的递归
    - 内网 DNS 解析公司内部域名怎么设计的？
        - 通常自建 DNS 服务器（如 dnsmasq / CoreDNS / Bind），配置内部域名转发到内网权威 NS，外部域名转发到上游运营商或 8.8.8.8。核心要点是内外分离，避免内网域名泄漏到公

## 简述 Linux 系统启动过程？  
- Linux 从按下电源到出现登录提示符，大体经过五个阶段：`固件自检` → `Boot Loader` → `内核加载` → `init 进程` → `服务启动`  
    - **第一阶段**：固件（BIOS / UEFI） 
        - 通电后 CPU 执行固件代码，进行 POST（Power-On Self Test），检测 CPU、内存等基础硬件
        - 按配置的启动顺序检查设备（硬盘 / U盘 / 网络），找到包含 Boot Loader 的设备并执行
        - UEFI 比传统 BIOS 多了安全启动（Secure Boot）和 GPT 分区支持

    - **第二阶段**：Boot Loader（GRUB 2）
        - 读取 /boot/grub2/grub.cfg（或 /boot/efi/EFI/redhat/grub.cfg），显示系统选择菜单
        - 选中内核后，GRUB 把内核文件（vmlinuz）和 initramfs 加载到内存
        - 可以在此阶段编辑内核参数（如 single 进入单用户模式、rd.debug 调试 initramfs

    - **第三阶段**：内核初始化
        - 内核解压后执行，检测 CPU、内存、总线等硬件
        - 挂载 initramfs（临时根文件系统），加载磁盘控制器、文件系统等必要驱动
        - 挂载真正的根文件系统（/），执行 switch_root 切换到真实根
        - initramfs 通常在完成后会被回收，释放内

    - **第四阶段**：init 进程（systemd）
        - 内核找到 /sbin/init（软链接到 systemd）作为 PID 1
        - systemd 读取 /etc/systemd/system/default.target（通常指向 multi-user.target 或 graphical.target）
        - 按依赖关系并行启动各单元（Unit），如挂载分区、启动网络、启动 sshd

    - **第五阶段**：服务启动与登录
        - systemd 执行该 target 下的所有必要服务
        - 最后启动 getty（虚拟终端）或 display manager（图形界面），显示登录提示

- **常用排查命令**：
    - `dmesg` 或 `journalctl -k`：查看内核日志
    - `journalctl -b`：查看本次启动的 systemd 日志
    - `systemd-analyze`：查看总启动耗时
    - `systemd-analyze blame`：按耗时排序各服务的启动时间
    - `systemctl list-dependencies multi-user.target`：查看依赖

- **协助记忆**： `固件通电自检` → `GRUB 捞内核` → `内核解压跑驱动` → `switch_root 交棒` → `systemd 拉起全家桶`
- **进阶思考**：
    - **系统启动卡住了，怎么定位是哪一步的问题(相关命令未测试)？**
        - `dmesg` 看内核阶段有没有 `panic` 或挂载失败；
        - `journalctl -b` 看 `systemd` 阶段哪个 unit 超时；
        - `GRUB` 启动时按 e 编辑内核参数加 `systemd.log_level=debug` 或 `rd.debug` 输出更多信息, `Ctrl+x` 或 `F10` 启动

    - **Boot Loader 坏了进不了系统怎么修复(相关命令未测试)**
        - 用安装 U 盘进入 Rescue 模式 chroot 后：
            - **BIOS 环境**：grub2-install /dev/sda（RHEL 系）或 grub-install /dev/sda（Debian 系）
            - **UEFI 环境**：grub2-install --target=x86_64-efi --efi-directory=/boot/efi
            - **重建配置**：grub2-mkconfig -o /boot/grub2/grub.cfg（RHEL 系）或 update-grub（Debian 系）

    - **initramfs 损坏或缺失怎么办(相关命令未测试)？**
        - `Rescue` 模式 `chroot` 后：
            - **RHEL 系**：`dracut -f`
            - **Debian 系**：`update-initramfs -u`


## 请说一下你经常用的 Linux 系统性能分析工具及用途？  
- Linux 性能分析通常按 USE 原则（Utilization / Saturation / Errors）; 去拆：CPU、内存、磁盘、网络，每个维度有对应的工具链，从宏观到微观逐级缩小范围。  
    - **Top** — 整体概览
        - 一上来先跑 top，看几个核心指标：us（用户态）、sy（内核态）、wa（IO 等待）、id（空闲）、st（被宿主机偷走的 CPU）
            - **us（User）— 用户态**：过高说明应用程序在做大量计算
                - **常见原因**：Java 应用的业务逻辑死循环、频繁 GC、序列化/反序列化；数据库的全表扫描；Nginx/OpenResty 的 Lua 脚本运算过重
                - **排查方向**：top -H 定位线程 → jstack / perf 抓堆
            - **sy（System）— 内核态**：过高说明系统调用频繁
                - **常见原因**：大量的上下文切换（线程数过多）、磁盘/网络 IO 中断密集、锁竞争激烈
                - **排查方向**：vmstat 1 看 cs（context switch）是否异常；pidstat -w 1 看具体进程的上下文切换次数
            - **wa（I/O Wait）— 等待 IO**：过高说明磁盘读写成了瓶颈
                - **常见原因**：磁盘 IOPS 或带宽达到上限、RAID 卡缓存策略问题、文件系统层面的 lock contention
                - **排查方向**：`iostat -xz 1` 看 `%util` / `await` / `r/s+w/s` 是否超标；iotop 确认是哪个进程在大量读写
            - **hi（Hardware IRQ）— 硬中断**：过高说明硬件设备在频繁打断 CPU
                - **常见原因**：万兆网卡的中断风暴、NVMe 盘中断过多
                - **排查方向**：`cat /proc/interrupts` 看哪个设备在刷中断数；调整中断亲和性（`irqbalance` 或 `/proc/irq/*/smp_affinity`）
            - **si（Software IRQ）— 软中断**：过高说明内核在排队处理软件中断
                - **常见原因**：网络收发包量过大（特别是单队列网卡场景）、CPU 核心数较少时大量小包打进来
                - **排查方向**：`cat /proc/softirqs` 看 NET_RX 是否异常；`sar -n DEV 1` 看 PPS（每秒包数）是否打到上限
            - **st（Steal）— 被偷走的 CPU**：虚拟机环境下宿主机在占用本应分配给你的时间片
                - **常见原因**：宿主机超分严重、同宿主机的其他 VM 在大量抢资源
                - **排查方向**：st 超过 10% 就需要跟虚拟化团队沟通调整资源分配
            - **id（Idle）— 空闲**：这个本身不是问题指标，但 id 为 0 且 CPU 都是 us/sy，说明系统在全力工作；id 为 0 但 wa 占了大头，说明 CPU在空等磁盘
        - 按 P 按 CPU 排序，按 M 按内存排序，快速锁定异常进程 
        - `top -H -p <PID>` 看具体线程
    
    - **vmstat** — 系统级快照
        - `vmstat 1`（每秒输出一次），重点看这四列：
            - `r`：正在运行的进程数（超过 CPU 核数说明 CPU 饱和）
            - `b`：不可中断睡眠的进程数（IO 阻塞）
            - `si` / so：swap 换入换出（大于 0 说明内存不足）
            - `us` / `sy` / `wa` / `id`：CPU 时间分布

    - **iostat** — 磁盘 IO 分析
        - `iostat -xz 1`，重点关注：
            - `%util`：磁盘忙绿比例（警惕，但 NVMe 盘在高 IOPS 下即使 100% 也可能正常，要看 r/s + w/s）
            - `r/s` / `w/s`：每秒读写次数
            - `await`：IO 平均等待时间（超过磁盘标称值说明有排队）
            - `svctm`：服务时间（现代内核已不准确，仅供参考）

    - **sar** — 历史回溯(需要在 `/etc/default/sysstat` 中开启 `ENABLED="true"`)
        - `/var/log/sa/saXX` 记录了系统历史的 CPU / 内存 / 网络 / 磁盘数据
        - `sar -u -f /var/log/sa/sa11` 看 11 号那天的 CPU 走势
        - 线上排查时最常用的命令之一，出问题时先看 sar 回放确认时间点

    - **ss** — 网络连接
        - `ss -tuln`：查看所有监听端口
        - `ss -s`：连接数统计（TIME_WAIT / ESTAB 数量）
        - `ss -t -a` 或 `ss -o state time-wait`：精确过滤特定状态的连接

    - **perf / strace** — 深挖到底
        - `perf top`：直接看 CPU 在跑哪些内核函数或用户态函数，跳过 PID 的干扰
        - `strace -cp <PID>`：统计该进程的系统调用耗时分布
        - 这两步通常是前几项定位不到根因时才上 


- **协助记忆**：
    - top 挂号看整体，vmstat 量血压（CPU/内存快速读数）
    - iostat 拍 X 光（磁盘在忙什么），sar 翻病历（回看历史指标）
    - ss 听心跳（网络连接状态），perf/strace 上 CT 扫描（深挖到底


- **进阶思考**：
    - iostat 里的 %util 达到 100% 一定说明磁盘有问题吗？
        - 不一定。%util 统计的是磁盘设备在采样周期内有多长时间在处理请求。对于机械盘，100% 通常意味着饱和；对于 NVMe 固态盘，因为它支持多队列并发，100% 的 util 下可能还有大量余量，要结合 r/s + w/s（是否达到盘标的 IOPS 上限）和 await（请求是否在排队）综合判断  
    
    - 什么情况下优先用 pidstat 而不是 top？  
        - 遇到 CPU 飙高但 top 按 P 排序找不到高占用进程时（短生命周期进程频繁起停）。pidstat 1 每秒采样，能捕捉到瞬间出现又消失的进程。原理是 pidstat 在内核里抓 /proc 的统计快照，短进程死之前留下了足迹（这个之前在 CPU 隐蔽故障篇有覆盖）

## 简述 FTP 工作模式？  
- `FTP（File Transfer Protocol）` 基于 `客户端`-`服务端` 模型，使用 两条 TCP 连接：一条控制连接（端口
21）传输指令，一条数据连接（动态端口）传输文件。它的工作模式核心区别在于数据连接由谁发起  
    - **主动模式（PORT / Active Mode）** 
        - 客户端随机打开一个高位端口（假设 N）作为数据接收端，通过 PORT 命令告知服务端 IP 和 N
        - 服务端从端口 20 主动连接客户端的 N 端口，建立数据通道
        - 致命问题：客户端必须开放一个高位端口等待服务端连接。如果客户端在 NAT 网关或防火墙后面，外部无法主动连接到这个端口，连接会失败
        - 极少用，现代 FTP 基本只在服务端防火墙限制严格时才被迫开启  
    - **被动模式（PASV / Passive Mode）**
        - 客户端发送 PASV 命令
        - 服务端打开一个随机高位端口（假设 P），通过 PASV 响应告知客户端
        - 客户端从自己的高位端口主动连接服务端的 P 端口，建立数据通道
        - 优点：客户端只需要能发起出站连接即可，不要求公网 IP 或开放入站端口
        - 现代 FTP 的默认模式
    - **两种模式对比**
        | 特征             | 主动(PORT)              | 被动(PASV)                 |
        | ---------------- | ----------------------- | -------------------------- |
        | 数据连接发起方   | 服务端 -> 客户端        | 客户端 -> 服务端           |
        | 防火墙友好度     | ❌ 需客户端开放入站端口 | ✅ 仅需客户端出站          |
        | NAT 环境可用     | ❌ 基本不能             | ✅ 正常使用                |
        | 服务端防火墙配置 | 只需开放 21 + 20 端口   | 需开放 21 + 一个高位端口池 |
    - **相关协议区分（易混淆）** ：
        - **FTPS（FTP over SSL/TLS）**：标准 FTP + TLS 加密，仍用 PORT/PASV 模式，端口 990（隐式）或 21（显式 AUTH TLS）
        - **SFTP（SSH File Transfer Protocol）**：基于 SSH 的文件传输协议，不是 FTP 的加密版，端口 22，完全不同的协议栈
    - **常用服务端配置参考（vsftpd）** ：
        ```ini
        # 强制使用被动模式
        pasv_enable=YES
        pasv_min_port=30000
        pasv_max_port=31000
        pasv_address=<公网 IP>  # NAT 环境需指
        ```
- **协助记忆**：
    - **主动模式**：你去找人拿快递，你告诉店家你在门口等，店家走出来递给你 → 需要你能接收
    - **被动模式**：你去找人拿快递，店家说"我在门口等你"，你出门去他那取 → 你主动去取就行
    - **一句话**：主动是服务端连客户端，被动是客户端连服务端数据端口

- **进阶思考**：
    - **为什么 FTP 不像 HTTP 只用一条连接？**
        - FTP 设计于 1971 年，当时控制通道和数据通道分离的设计是为了在传输大文件时不受控制指令干扰，且能在传输中随时中断/续传。HTTP 是现代协议，一条连接同时承载控制（Header）和数据（Body），适用于短连接轻量传输。从协议设计哲学上就是两代产物

    - **主动模式在什么场景下反而更适合？**
        - 服务端防火墙极其严格、只允许开放 20 和 21端口，不允许开放高位端口池时。例如某些银行内部的文件传输，安全策略要求尽量少开放端口，就会让客户端自己去接收连接。但代价是客户端必须有公网 IP 且防火墙放行入站

    - **EPSV 和 EPRT 是什么？**
        - 扩展被动/主动模式，用于 IPv6 环境。PASV 的响应格式中 IP 地址是点分十进制（IPv4），在 IPv6 下无法表示，EPSV改用更简洁的协议号表示（EPSV → 229 Entering Extended Passive Mode (|||port|)），不传输 IP 地址，兼容性更好

## 简述 ext4 日志文件系统原理？  
- `ext4` 是 `ext3` 的演进版本，继承了 `ext3` 的日志（Journal）机制，在此基础上引入了区段、延时分配、多块分配等核心改进  
    - **日志机制（Journaling）**—— ext3 继承的核心, 日志的目的是保证文件系统在意外崩溃后能快速恢复一致性，不需要像 ext2 那样跑几小时的 fsck。原理是 **先写日志、再落数据**：
        1. **事务开始（Begin）**：内核准备修改元数据（如分配 inode、创建目录项），标记一个事务开始
        2. **写日志（Journal Write）**：将即将修改的元数据块提前写入日志区域（`/proc/fs/ext4/dm-X/journal` 或磁盘上的保留区域）
        3. **提交（Commit）**：所有日志条目写入完成后，写入提交记录，表示该事务已完成
        4. **回放（Checkpoint）**：将日志中的内容真正应用到文件系统对应位置，完成实际写操作
        5. 崩溃重启后，内核检查日志——如果有未完成的提交则重放（replay），如果没有则直接跳过，不需要全盘 fsck
    - **三种日志模式**（`man mount` → `data=journal` / `data=ordered` / `data=writeback，ordered` 是默认模式）
        |模式|行为|安全性|性能|
        |---|---|---|---|
        |`journal`|元数据+文件数据都写日志|最高，断电能恢复全部数据|最慢|
        |`ordered（默认）`|仅元数据写日志，数据先落盘|中等，日志保证元数据一致|中等|
        |`writeback`|仅元数据写日志，数据可后写|最低，崩溃后文件内容可能全是零或垃圾|最快|

    - **ext4 相比 ext3 的核心改进**
        - **区段（Extents）** ：传统 ext3 用块映射（block mapping），每个文件需要一个间接块树来记录占用了哪些数据块。大文件（如 4GB）的块映射非常庞大。ext4 改用区段树（extent tree），每个区段记录一段连续物理块的起始位置 + 长度，大幅减少元数据量
            - **类比**：以前是一个格子一个格子记"我占了第 1000 块、第 1001 块、第 1002 块……"，现在是一句话"我占了第 1000 到 2000 块"
        - **延时分配（Delayed Allocation）**：应用程序发起 write() 时，ext4 不立即分配磁盘块，而是先在内存中攒着，等攒够了或真正要刷盘（flush）时再一次性分配连续的物理块
            - **好处**：减少文件碎片（攒够了一个 extent 再分配）、提高写入合并效率
            - **风险**：异常掉电时未分配的数据会丢失（写入承诺但还没入盘的内容）
        - **多块分配器（mballoc）** ：传统文件系统一次只分配一个块，ext4 优先一次性分配多个连续块，减少 CPU 开销和碎片
        - **Flex 块组**：将多个块组的元数据（inode table、block bitmap）集中存放，减少磁盘寻道时间
        - **校验和（Checksum）** ：对日志和元数据增加校验，崩溃恢复阶段可以检测损坏
        - **纳秒时间戳**：inode 的时间戳精度从秒级提升到纳秒级，并增加了 crtime（文件创建时间）

    - **常用排查命令**
        - `tune2fs -l /dev/sda1 | grep -i 'Filesystem features'`：查看该 ext4 分区开启了哪些特性
        - `dumpe2fs -h /dev/sda1`：查看文件系统详细信息
        - `fsck.ext4 -fn /dev/sda1`：不修复只检查，确认是否有日志不一致
    
- **协助记忆**
    - **日志机制**：先记账（写日志）→ 再报账（落数据）→ 烂账了翻账本（崩溃重放）
    - **三种模式**：journal（全记账）→ ordered（记摘要，原文先发）→ writeback（只记摘要不动原文）
    - **ext4 的改进**：区段省地（一块连续的只记一次）→ 延时攒批（减少碎片）→ 多块分配（少跑几趟）

- **进阶思考**
    - **ordered 模式下断电，文件内容会不会出现脏数据？**
        - 会。ordered 只保证元数据一致（文件系统不会损坏），但不保证应用层写入的数据 100% 完整。例如你正在用 Vi 写文档，断电后重新开机文件可能不是保存时的最终版本。要保证应用层数据完整性，需要上层做 fsync/fdatasync（数据库 redo log 就是这个原理）
    - **ext4 和 xfs 应该如何选？**
        - 说结论——没有绝对优劣，关键看场景：
            - `ext4`：单文件系统容量不大（< 50TB）、文件数量不多、通用场景。RHEL 7+ 默认就是 xfs，但 ext4 依然广泛用于 Ubuntu 默认选和嵌入式场景
            - `xfs`：大容量（单文件系统支持到 EB 级）、海量文件并行读写（如文件服务器、大数据存储）。xfs 的分配组（AG）设计使它并发写入性能更好
            - 一句话：通用场景 ext4 足够，大容量高并发上 xfs
    - **ext4 的 Inline Data 是什么？**
        - 极小的文件（默认 60 字节以内）直接存放在 inode 结构体内，不分配数据块。这对于保存大量小文件（如 Git 对象、邮件存储）能极大减少磁盘寻道和元数据开销。tune2fs -l 里看到 inline_data 特性就是开启了这个。

## Linux 进程有哪几种状态？  
- Linux 内核将进程状态定义在 `include/linux/sched.h` 中，`ps` 和 `top` 里看到的字母对应内核中的宏定义。总共分为`运行`、`睡眠`（两种）、`暂停`、`僵尸`、`退出`五种大类
    - **R（TASK_RUNNING）**— 运行态
        - 进程正在 CPU 上执行，或者已经准备好随时可以被调度器切换到 CPU 上运行
        - 单纯看到 R 不一定是坏事，也可能只是刚在排队
        - 如果 R 状态的进程数持续超过 CPU 核心数（可以通过 vmstat 的 r 列看），说明 CPU 饱和了

    - **S（TASK_INTERRUPTIBLE）**— 可中断睡眠
        - 进程在等待某个条件满足（等待 IO 完成、等待锁、等待 socket 数据），但可以被信号唤醒
        - 这是最正常的睡眠状态，大部分服务进程（nginx worker、sshd 等）大部分时间处于此状态
        - 如果系统空闲时大量进程停在 S 上是正常的

    - **D（TASK_UNINTERRUPTIBLE）**— 不可中断睡眠
        - 进程在内核态等待某个事件（通常是磁盘 IO），在此期间不响应任何信号，即使 kill -9 也杀不掉
        - 正常的 D 状态是瞬时的（磁盘 IO 完成就切回），但如果大量进程长期卡在 D 状态，说明磁盘 IO 或存储系统出了问题
        - 内核开发者也意识到了纯 D 状态的问题，后来引入了 TASK_KILLABLE（内核宏 SK），这是一种"可被杀死的 D 状态"——ext4 和 NFS 的一些 IO 路径已改用此模式

    - **T（TASK_STOPPED）**— 暂停态
        - 进程收到 SIGSTOP / SIGTSTP / SIGTTIN / SIGTTOU 等停止信号后被挂起
        - 用 kill -CONT 发送 SIGCONT 可以让其恢复运行
        - 常见场景：Shell 中按 Ctrl+Z 将一个前台任务放到后台暂停

    - **t（TASK_TRACED）**— 追踪态
        - 进程正在被 `ptrace` 系统调用跟踪，最常见的就是被 `strace` 或 `gdb` 附加的时候
        - 本质上也是暂停状态，但专门由调试器控制

    - **Z（EXIT_ZOMBIE）**— 僵尸态
        - 子进程已退出，资源已释放，但父进程没有调用 `wait()` / `waitpid()` 来读取它的退出码，进程描述符还留在系统进程表中
        - 少量短暂的 Z 是正常的（子进程刚死，父进程还没反应过来），但如果大量 Z 持续存在，说明父进程有 `Bug`，没有正确回收子进程
        - `ps aux | grep Z `可以查到，`kill` 杀不掉——因为它已经死了
        - 处理方式：僵尸进程的父进程如果是 `init/systemd（PID 1）`，`systemd` 会自动回收；如果是其他进程，需要 `kill` 掉它的父进程，僵尸会被 `init` 继承并回收
    
    - **X（EXIT_DEAD）**— 死亡态
        - 进程已完全退出，正在被内核做最后清理（释放 task_struct）。这个状态在 ps 中几乎看不到，因为它只持续一瞬间

- **协助记忆**
    - **R**：在跑或等着跑
    - **S**：在等资源，响了就醒
    - **D**：在等磁盘，打死也不醒
    - **T**：被暂停了，Ctrl+Z 就它
    - **t**：被调试器绑起来了
    - **Z**：死了但爹还没收尸
    - **X**：尸体正在火化，看不到了

- **进阶思考**
    - **有一个进程卡在 D 状态很久了，kill -9 也杀不掉，怎么办？**
        - D 状态意味着进程在内核态等待 IO，不响应任何信号。首先确认是哪个存储设备出了问题——`cat /proc/<PID>/status` 看 Wchan（等待的内核函数）和 `cat /proc/<PID>/stack` 看内核调用栈。通常是 NFS 服务端挂了、磁盘硬件故障、或 iSCSI 链路断了。解决方法是先恢复存储链路，如果还不行，只能重启系统。在日常运维中如果遇到不可恢复的 D 状态进程较多且影响业务，可以考虑 sysrq 触发紧急重启：`echo 1 > /proc/sys/kernel/sysrq && echo b > /proc/sysrq-trigger`

    - **大量僵尸进程怎么清理？**
        - 先找到僵尸进程的父进程 `ps -eo pid,ppid,stat,cmd | grep Z`，确认父进程是谁。如果父进程还能正常运作，检查它是否没正确调用 waitpid()，这应是应用 Bug；如果父进程本身就是坏的，kill -9 <父PID> 杀掉父进程，僵尸被 systemd（PID 1）继承后自动回收。如果父进程已经是 PID 1（出现在容器场景中比较常见），那就比较棘手，可能需要重建容器或触发容器的重新初始化

    - **TASK_KILLABLE 是什么时候引入的？**
        - TASK_KILLABLE（内核中定义为 TASK_UNINTERRUPTIBLE | TASK_WAKEKILL）在 Linux 2.6.25 左右引入，目的是解决部分 D 状态进程连 kill -9 都杀不掉的问题。应用此机制的包括 NFS 客户端的一些等待路径、ext4 的部分 IO 操作。它在不可中断睡眠的基础上增加了一个可被杀死的标记——内核在进入睡眠时如果把 TASK_WAKEKILL 标记加上，收到致命信号（SIGKILL）时就会被唤醒并退出。但这没有覆盖所有 D 状态场景，所以普通的磁盘驱动 IO 路径上还是纯 D

    - **ps aux 里看到的 Ss、S+、Sl 等不是单一字母，这些附加字母代表什么？**
        - 大写字母（S / D / R / Z）是内核基础进程状态，附加小写字符描述额外属性：
            - `s（session leader）`：会话领导者，通常是登录 Shell（bash）或终端会话的第一个进程
            - `+（foreground）`：在前台进程组中，你正在当前终端跑的命令
            - `l（multi-threaded）`：多线程进程（Java、mysqld、Nginx worker）
            - `<（high priority）`：高优先级（负 nice 值），通常被 renice 提权
            - `N（low priority）`：低优先级（正 nice 值），如 nice -n 10 启动的后台任务
        - 组合示例：Ss = 可中断睡眠 + 会话领导者（bash 等命令），Sl = 可中断睡眠 + 多线程（Java 应用），R+ = 正在前台运行的命令

## Linux 进程间有哪些通信方式？  
- **Linux 下进程间通信（IPC）的方式很多，从最简单的信号传递到高效的共享内存，各自适用不同场景和性能需求**
    - **管道 / Pipe（|）**
        - 内核维护的一块环形缓冲区，一个进程写另一端读，单向数据流
        - 无名管道：pipe() 系统调用创建，仅用于父子进程或有亲缘关系的进程
        - 命名管道 / FIFO：mkfifo 创建，有文件路径名，没有亲缘关系的进程也能通信，但依然单向
        - 内核保证写不超过 PIPE_BUF（通常 4096 字节）的原子性

    - **信号 / Signal**
        - 异步通知机制，进程收到信号后执行预置的处理函数（默认动作 / 自定义 / 忽略）
        - 发送端：kill() / raise() / sigqueue()
        - 接收端：signal() / sigaction() 注册处理函数
        - 传输信息量极少，只有信号编号 + siginfo_t 附带的一小段数据（PID、UID、错误码等），主要用于通知"发生了某事件"而不是传递业务数据

    - **消息队列 / Message Queue**
        - 内核维护的消息链表，每个消息有类型标识符，进程可以按类型读取
        - POSIX 版本：mq_open() / mq_send() / mq_receive()
        - SysV 版本：msgget() / msgsnd() / msgrcv()
        - 相比管道，消息队列支持按消息类型优先读取，多个读者时可以做到定向分发
        - 但所有消息都要经过内核拷贝，性能不如共享内存

    - **共享内存 / Shared Memory**
        - 最快的 IPC 方式——两个（或多个）进程将同一块物理内存映射到各自的虚拟地址空间，数据写入后对方立刻可见，不需要经过内核拷贝
        - POSIX 版本：shm_open() + mmap()（内存映射文件到共享内存）
        - SysV 版本：shmget() + shmat()（传统 System V 接口）
        - 共享内存本身没有同步机制，必须配合信号量或互斥锁使用，否则会出现竞态条件
        - ipcs -m 可以查看系统当前的共享内存段

    - **信号量 / Semaphore**
        - 不是传递数据的通道，而是同步原语，用于协调多个进程对共享资源的访问
        - POSIX 版本：sem_open() / sem_wait() / sem_post()（命名信号量，可用于不相关进程）
        - SysV 版本：semget() / semop()（集合式信号量，支持同时操作多个）
        - 典型用法：共享内存 + 信号量组合使用，信号量控制"能不能读/写"而共享内存承载数据

    - **套接字 / Socket**
        - 最通用、最灵活的 IPC 方式，不仅用于网络通信，也可用于同一台机器的进程间通信
        - Unix domain socket（AF_UNIX / AF_LOCAL）：不走网络协议栈，在内核内部直接拷贝数据，比 TCP loopback
        快得多。有流式（SOCK_STREAM）和数据报（SOCK_DGRAM）两种
        - 典型应用：MySQL 的 /var/run/mysqld/mysqld.sock、Docker 的 /var/run/docker.sock

    - **内存映射文件 / mmap**
        - mmap() 将文件映射到进程的虚拟地址空间，多个进程映射同一个文件时共享物理内存页
        - 和共享内存类似，但以文件为后端（file-backed），数据会同步回磁盘，掉电不丢失
        - MAP_SHARED 标志使所有进程的修改互相可见，MAP_PRIVATE 则触发写时复制（COW）

- **协助记忆**
    - **管道**: 两个人之间用一根管子传递纸条，单向
    - **命名管道**: 一个带名字的公用管子，大家都可以往里塞纸条，但也单向
    - **信号**: 你朝对面喊一声"食堂开饭了"（信息量很少，通知作用）
    - **消息队列**: 每个人的信箱里扔带标签的信，收件人按标签取信
    - **共享内存**: 一块公共白板，谁都能写谁都能读
    - **信号量**: 一个令牌，只有拿到令牌的人才能碰白板
    - **套接字**: 电话 / 对讲机，可以来回说话，最灵活
    - **mmap**: 大家共用一本笔记本，写的内容会自动存进档案柜


- **进阶思考**
    - **共享内存既然是性能最好的，为什么不是所有场景都用它？**
        - 共享内存的维护成本高。一是必须自己处理同步（信号量/锁），容易出竞态条件；二是共享内存在进程崩溃时如果不清理会一直残留在内核中（ipcs -m 可以看到残留段），需要手动 ipcrm 或进程注册清理钩子。对于不需要极致性能的场景，Unix domain socket 和消息队列在易用性上更好

    - **Unix domain socket 和 TCP loopback（127.0.0.1）哪个性能好？**
        - Unix domain socket 性能更好。TCP loopback 即使是本地通信也要经过完整的 TCP 协议栈（三次握手、校验和、滑动窗口），而 Unix domain socket 在内核内部直接调用 socket 层的内存拷贝，不需要封装 IP 头、不需要计算校验和。对于高频的本地 IPC（如 Nginx 转发请求、Docker 客户端与 daemon 通信），差异很明显

    - **pipe 和 FIFO 的读写原子性有什么实际影响？**
        - write() 写入不超过 PIPE_BUF（4096 字节）的数据是原子的——即多个写者同时写管道时，不会出现内容交错。但如果一次写入超过 4096 字节，内核可能分多次写入，与其他写者的内容混在一起。因此管道常用于"一个写一个读"的模式，多个写者同时写入就需要考虑互斥或使 用消息队列


## Linux 服务器如何调优？  
- **Linux 调优不存在一套放之四海皆准的参数，它一定是先明确瓶颈在哪，再针对性地调整对应子系统。按照 CPU → 内存 → 存储 → 网络 → 内核参数的顺序逐层排查和调整。**
    - **CPU 层面**
        - **进程/线程数与 CPU 核数的关系**：CPU 密集型的应用，线程数通常设为 CPU核数 + 1 即可；IO 密集型的可以适当增加，但过多的上下文切换反而会降低吞吐。通过 vmstat 1 看 cs（context switch）列，如果每秒几十万次以上且 sy 偏高，说明线程数太多了
        - **CPU 调度策略**：服务器环境使用 `performance` 调速器，避免 `powersave` 导致频率频繁跳变。`cpupower frequency-set -g performance` 可临时设置，持久化需配置 `/etc/default/cpupower` 或 `tuned` (cpupower 属于 kernel-tools, RHEL 和 Ubuntu 均可用)
        - **中断亲和性**：在多核系统上，将网卡、NVMe 的中断绑定到指定 CPU 核心，避免所有中断都打到 CPU 0 上。`cat /proc/interrupts` 看中断分布，`/proc/irq/<IRQ>/smp_affinity` 设置亲和性

    - **内存层面**
        - **swappiness**：控制内核使用交换的积极程度，范围 0 ~ 100，默认 60。数据库服务器通常设 1 ~ 10，普通服务保持默认即可。`sysctl vm.swappiness=10`(*`内存使用率` 达到 `100-vm.swappiness` 时,开始使用交换分区; 但不是设为 0，内核 3.x 之后 vm.swappiness=0 意味着仅在内存绝对不足时才 swap，RHEL 8+ 又调整了行为——0 表示不主动 swap，OOM 优先级更高*)
        - **透明大页 / THP**：内核自动将连续的 4KB 内存页合并成 2MB 大页，目的是减少 TLB miss。但对数据库类应用（MongoDB、Cassandra 等），THP 的自动合并和拆分会触发内存 compaction，导致不可预测的短暂停顿。MongoDB 官方文档明确建议关闭。临时关闭：`echo never > /sys/kernel/mm/transparent_hugepage/enabled`；持久化可选两种方式之一：在 `/etc/rc.d/rc.local` 加入上行命令，或在 `/etc/default/grub` 的 `GRUB_CMDLINE_LINUX` 追加 `transparent_hugepage=never` 然后 `grub2-mkconfig -o /boot/grub2/grub.cfg`。注意 tuned 的某些 profile 会自动重开 THP，关闭后需 `cat /sys/kernel/mm/transparent_hugepage/enabled` 确认状态  
        - **OOM 策略**：`/proc/<PID>/oom_adj` 或 `oom_score_adj` 调整进程被 `OOM Killer` 选中的权重。核心数据库可以设为 -1000（永远不被杀）

    - **存储层面**
        - **I/O 调度器**：机械盘用 `kyber` 或 `mq-deadline`，NVMe 固态盘建议用 none（不调度，直接走 blk-mq 的直通路径）。`cat /sys/block/sda/queue/scheduler` 查看当前调度器，`echo none > /sys/block/nvme0n1/queue/scheduler` 修改 -挂载参数：noatime 或 relatime 避免每次读文件都更新 access time（默认 relatime 已开启，但显式加上 noatime 可以减少一次元数据写入）。大文件场景加 nobarrier（但需要文件系统本身能保证一致性）

        - **预读大小**：`blockdev --setra 4096 /dev/sda` 调整磁盘预读值。顺序读为主的场景增大预读能提升吞吐
        
        - **deadline 与瓶颈**：`iostat -xz 1` 看 `await` 如果持续超过磁盘标称 IO 延时（机械盘通常 5 ~ 15ms，NVMe 通常 <
        1ms），说明有排队或磁盘达到上限

    - **网络层面**
        - **TCP 连接优化**
            - **net.core.somaxconn**：监听队列长度，高并发 Web 服务建议从 128 加大到 65535
            - **net.ipv4.tcp_tw_reuse**：允许将 TIME_WAIT 状态的连接用于新的出站连接，配合 tcp_timestamps 使用
            - **net.ipv4.tcp_fin_timeout**：FIN_WAIT2 的超时时间，默认 60 秒，可适当降低
            - **net.core.rmem_max / wmem_max**：增大 socket 缓冲区上限，配合 tcp_rmem / tcp_wmem 调大初始/最小/最大窗口

        - **连接追踪 / conntrack**：`net.netfilter.nf_conntrack_max` 默认 65536，在高并发场景下容易打满导致丢包。可以加大到 1048576 或更高，同时相应调整 `net.netfilter.nf_conntrack_buckets`
        
        - **全连接队列溢出**：`ss -lnt` 看 Send-Q（实际 backlog）和 Recv-Q（排队情况），如果 Recv-Q 持续不为 0 说明有连接堆积。`netstat -s | grep overflowed` 看是否有溢出计数

    - **内核参数整体应用**
        - 新增 `/etc/sysctl.d/99-tuning.conf` 文件，避免直接编辑 `/etc/sysctl.conf`， `sysctl --system` 重新加载。典型的一组生产环境参数示例：
                ```ini
                # CPU
                kernel.sched_migration_cost_ns = 5000000
                kernel.sched_autogroup_enabled = 0
                
                # 内存
                vm.swappiness = 10
                vm.vfs_cache_pressure = 50
                
                # 网络
                net.core.somaxconn = 65535
                net.ipv4.tcp_tw_reuse = 1
                net.ipv4.tcp_fin_timeout = 15
                net.core.rmem_max = 16777216
                net.core.wmem_max = 16777216
                net.ipv4.tcp_rmem = 4096 87380 16777216
                net.ipv4.tcp_wmem = 4096 65536 16777216
                net.nf_conntrack_max = 1048576
                
                # 文件句柄
                fs.file-max = 2097152
                ```

- **协助记忆**
    - **调优思路**：先找瓶颈再调参，不是上来就改 sysctl
    - **五层记忆**：CPU 绑核别打架 → 内存别急着 swap → 硬盘选对调度器 → 网络队列别溢出 → 参数统一一个文件

- **进阶思考**
    - **RHEL 8+ 默认已经用 tuned 了，还需要手动调这些参数吗？**
        - tuned 提供了预设配置集（如 throughput-performance / latency-performance 等），覆盖了大多数常见场景。如果 tuned 的配置集能满足业务需求，优先使用 tuned，不需要手动改 sysctl。tuned-adm list 查看可用集，tuned-adm profile latency- performance 切换。但如果业务负载非常特殊（如极低延迟交易系统、高密度虚拟化），仍然需要 tuned 之上再覆盖自定义参数

    - **net.ipv4.tcp_tw_reuse 和 net.ipv4.tcp_tw_recycle 有什么区别？为什么都推荐 reuse 而不推荐 recycle？**
        - tcp_tw_reuse 用于出站连接（客户端角色），在内核分配新连接时允许重用 TIME_WAIT 状态的连接。tcp_tw_recycle 用于入站连接（服务端角色），会快过期 TIME_WAIT。但 tcp_tw_recycle 开启了 PAWS（Protection Against Wrapped Sequences）机制，会丢弃那些时间戳比上一个连接还旧的包，导致 NAT 后面的客户端频繁出现连接失败（时间戳不同步）。Linux 4.12 内核已经彻底移除了 tcp_tw_recycle，所以不管你设不设它都没用了

## 简述 Keepalived 工作原理？  
## LVM 解决了什么问题？有什么特点？  
## 有 500 台服务器，你该如何管理？  
## /proc 目录有什么作用？  
## top 中的 VIRT、RES 和 SHR 分别是什么意思？  
## 你在以往工作中，有遇到过什么深刻的故障？  
## 简述你对内核空间和用户空间的理解？  
## 现在要上线一个网站，你会如何设计高可用架构？  
## Linux 系统出现大量 TIME_WAIT，是什么原因、如何优化？  
## Linux 中 inode 和 block 分别是什么？  
## 你怎么理解系统负载（load average）？  
## 如何提升运维工作效率？  
## 如图所示，如何实现用户 A 访问用户 B？  
## 运维工程师如何保障数据安全？  
## 什么是僵尸进程？怎么产生、怎么处理？  
## iptables 的 SNAT 和 DNAT 分别用在什么场景？  
## ext4 与 xfs 文件系统有什么区别？  
## 什么是 Swap？什么时候会用？  
## SSH 连接比较慢是什么问题？  
## 执行 mount 或 df 命令时卡住无响应，可能是什么原因？  
## conntrack 表满会导致什么问题？如何解决？  
## TCP 连接数暴涨，如何定位是正常业务、攻击还是程序问题？  
## iowait 高会导致什么问题？如何解决？  
## 数据库服务器 load 100+，能直接重启吗？该怎么处理？  
## Linux 各目录有什么作用？  
## 线上一台服务器需要增加硬盘，该怎么操作？  
## 某一天突然发现 Linux 系统文件只读，如何排查修复？  
## Keepalived 出现脑裂，是什么原因？  
## 你之前使用过哪些监控系统，都分别监控哪些指标？  
## 谈谈你对 SRE 理念的理解？  
## 当你加入新运维团队时，如何开展工作？  
## 简述常见的网络 I/O 模型及应用场景？  
## Linux 系统误删除文件，如何恢复？  
## 你觉得 SRE 核心工作有哪些？  
## 你们故障后怎么做复盘？  
## 如何建设自动化运维体系？  
## 你用过哪些企业虚拟机技术？  
## 简述 KVM 虚拟化的核心实现？  
## KVM 虚拟机有哪些常用的管理方式？  
## Linux 系统无法启动，可能会有哪些原因？  
## Linux 服务器宕机，系统启动后怎么排查宕机原因？  
## Linux 文件系统损坏，如何修复？  
## eBPF 是什么？有哪些应用场景？  
## 你用过哪些基于 eBPF 的排查工具？  
## 你用 BCC 具体解决过什么线上问题？  
## 你在上家公司做过的最有成就感的事情是什么？  
## Paxos 和 Raft 有什么作用？有哪些应用组件？  
## MBR 和 GPT 分区有什么区别？  
## 进程和线程有什么关系和区别？  
## 高并发场景下，系统本地端口耗尽如何解决？  
## 说一些常用的 Linux 内核参数？  
## 在 CDN 平台上刷新了一条资源，如何验证刷新生效？  
## Linux 系统中 GRUB 是什么，有什么作用？  
## Linux 文件权限里所有者、所属组、其他用户权限分别指什么？  
## Linux 中 umask 的作用是什么？  
## 日志报错 Could not resolve host 域名解析失败怎么排查？  
## Linux 应用进程莫名被杀掉，可能是什么原因？  
## crontab 定时任务无法执行，有哪些常见原因？  
## 有一台在用的旧服务器需要下线，你会怎么操作？  
## 安装软件提示 LD 动态链接库缺失，该怎么处理？  
## 使用 & 把程序放后台运行，没多久就自动退出是什么原因？  
## 进程被 OOM Killer 杀死，该如何排查分析？  
## 简述 sudo 提权的工作原理？  
## 同为系统 1 号进程，systemd 对比 sysvinit 有哪些区别？  
## 软链接和硬链接有什么区别？  
## systemd 在 Linux 系统中负责哪些核心任务？  
## 如何编写一个生产级 Systemd 服务配置文件？  
## 如何在业务高峰期安全地重启服务？  
## Linux 系统内存持续飙高，如何排查？  
## Linux 系统硬盘读写慢，如何排查？  
## 防火墙 firewalld 和 iptables 的关系与区别？  
## /etc/fstab 写错导致系统无法启动，怎么修复？  
## 什么是标准输入、标准输出、标准错误？  
## 在命令后面加 2>&1 是什么意思？  
## 你在日常工作中 dd 命令用过哪些场景？  
## Linux 里 /dev/null 设备文件是什么？  
## ss 和 netstat 同样查看端口连接，ss 相比 netstat 有什么优势？  
## Linux 两台服务器之间数据同步如何实现？  
## Linux 排查 8080 端口被哪个进程占用，有哪些命令？  
## Linux 一个进程最多能创建多少线程？  
## Linux 怎么限制某个目录可用磁盘容量？  
## df 和 du 显示空间不一致是什么情况？  
## 简述 Linux 读取和写入文件的流程？  
## Linux 中 CPU 是怎么工作的？  
## 如果你提了一个 Bug，开发不认为是 Bug 该怎么沟通处理?  

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-%E6%97%A5%E5%B8%B8%E7%BB%B4%E6%8A%A4/  

