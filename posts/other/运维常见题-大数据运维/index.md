# 运维常见题-大数据运维


## 🤔 大数据运维核心工作有哪些？ 
- **大数据运维围绕“集群稳、数据准、任务快”三大目标：①集群管理（`Hadoop`/`Spark`/`Flink` 组件部署、扩容、调优、高可用）②数据运维（采集、存储、`HDFS` 管理、备份恢复、数据质量）③任务运维（调度、`YARN`/`Spark` 作业监控、`OOM`/慢任务排查）④监控告警 + 安全权限。核心：“管集群、护数据、盯任务、保安全”。**
    - **集群运维（基础设施）**
        - 组件部署/升级（`HDFS`/`YARN`/`Spark`/`Flink`/`HBase`/`ZooKeeper`）、配置管理、高可用
        - 容量规划（`HDFS` 存储、`YARN` 计算资源、节点扩缩容）、性能调优（网络/磁盘/参数）

    - **数据运维（数据资产）**
        - 数据采集（日志/数据库/消息接入 `HDFS`）、存储管理（副本、冷热分层）、`HDFS` 文件策略（`NameNode` 元数据、`DataNode` 磁盘）
        - 备份恢复、数据质量校验（完整性/一致性）、垃圾数据清理（`Trash`/生命周期）

    - **任务运维（计算引擎）**
        - 调度运维（`YARN`/调度器、队列）、`Spark`/`Flink` 作业提交/监控/失败重试
        - 性能排查（`OOM`、慢任务、数据倾斜、资源竞争）、`Checkpoint`（`Spark`/`Flink`）/`Savepoint`（`Flink`）管理

    - **监控告警 + 安全**
        - 指标监控（`HDFS` 容量、`YARN` 资源、节点健康、作业状态——`Ambari`（`HDP` 管理面板，现多被 `Cloudera Manager` 取代）/`Prometheus`/`Grafana`）
        - 告警分级（节点宕机/磁盘满/任务失败/`NameNode` 异常）、日志采集分析
        - 安全（`Kerberos` 认证、`ACL`、数据脱敏）、权限治理

- **协助记忆**
    - 口诀：“集群稳、数据准、任务快——管集群、护数据、盯任务、保安全”。

- **进阶思考**
    - **大数据运维和传统运维最本质区别？**
        - 对象从“单机/服务”变成“分布式集群 + 海量数据 + 计算作业”：要考虑数据分布/副本容错、资源调度、任务并行、数据倾斜，故障也从“服务挂”变为“`NameNode` 失联/`DataNode` 坏块/作业 `OOM`/数据倾斜”。更强调数据与计算联动。
    - **大数据集群最常见故障是什么？**
        - 磁盘满（`HDFS` 容量爆）、节点宕机（`DataNode`/`NodeManager` 失联触发副本/任务重试）、`NameNode` 元数据压力、资源不足（`YARN` 队列抢占致任务饿死）、任务性能差（数据倾斜/`OOM`）。

- **扩展信息**
    - **核心组件**：`HDFS`（存储）、`YARN`（资源调度）、`MapReduce`/`Spark`（计算）、`HBase`（列存）、`Hive`（`SQL`）、`ZooKeeper`（协调）、`Flink`（流处理）
    - **监控工具**：`Ambari`（`Hadoop` 集群管理面板）、`Prometheus`+`Grafana`、`Cloudera Manager`；日志 `ELK`/`Flink` 作业 `UI`
## 🤔 大数据的核心技术栈有哪些？ 
- **大数据技术栈按“采集→存储→计算→调度→查询→分析”分层：①采集（`Flume`/`Kafka`/`Sqoop`/`Canal`）②存储（`HDFS`/`HBase`/`Kudu`/`S3`）③计算（`MapReduce`/`Spark`/`Flink`）④调度（`YARN`/`K8s`/`Airflow`）⑤查询（`Hive`/`Spark SQL`/`Presto`/`Impala`）⑥分析（`Zeppelin`/`ECharts`/机器学习 `MLlib`）。核心：“采集进、存储底、计算层『批+流』、调度与查询往上”。**
    - **数据采集层**
        - 日志：`Flume`/`Logstash`；消息队列：`Kafka`（高吞吐缓冲）；数据库同步：`Sqoop`（增量，已停更——`1.4.7` 后入 `Apache Attic`，现多被 `Flink CDC`/`SeaTunnel`/`Debezium` 取代）/`Canal`/`DataX`（增量/实时，现代常选）
        - 作用：把分散数据接入到大数据平台（`HDFS`/`HBase`）

    - **存储层**
        - 分布式文件：`HDFS`（海量、批处理基础）；列存：`HBase`（`KV` 随机读）/`Kudu`（实时分析）；对象：`S3`/`OSS`（云）
        - 特点：分布式、冗余副本、横向扩展、`PB` 级存储

    - **计算层（批/流）**
        - 批处理：`MapReduce`（离线、磁盘、慢）→ `Spark`（内存、快、`DAG`）
        - 流处理：`Flink`（实时、低延迟 `Checkpoint`）/`Spark Streaming`（微批）

    - **调度与资源层**
        - **资源调度**：`YARN`（`Hadoop` 资源调度）、`K8s`（云原生容器调度）；**任务编排**：`Airflow`/`Oozie`（工作流调度）——两类层级不同

    - **查询与 SQL 层**
        - 离线数仓：`Hive`（`SQL` 转 `MapReduce`/`Spark`）；跨源查询：`Presto`/`Impala`；**交互式**：`Spark SQL`（批）；**实时流**：`Flink SQL`

    - **分析与应用层**
        - `Notebook`（`Zeppelin`/`Jupyter`）、`BI` 报表、机器学习（`Spark MLlib`/`TensorFlow`）

- **协助记忆**
    - 口诀：“采集（`Kafka`/`Flume`）→ 存储（`HDFS`/`HBase`）→ 计算（`Hadoop` 批、`Spark` 内、`Flink` 流）→ 调度 `YARN`、查询 `Hive`/`Presto`”。

- **进阶思考**
    - **批处理和流处理的典型技术演进？**
        - 早期批处理 `MapReduce`（磁盘慢）→ `Spark`（内存快）统一批；流处理早期 `Storm`/`Spark Streaming`（微批）→ `Flink`（真流式、低延迟、`Exactly-once`）。现代趋势“批流一体”（`Spark`/`Flink` 都能做批+流）。
    - **为什么需要 `Kafka` 这一层（采集和存储之间）？**
        - 缓冲削峰（高并发写入不压垮下游）、解耦（采集/消费独立）、持久化（可回溯重放）、多消费（一份数据多方用）。是实时链路的核心枢纽。

- **扩展信息**
    - **技术栈全景**：采集（`Flume`/`Kafka`/`Sqoop`/`Canal`）、存储（`HDFS`/`HBase`/`Kudu`）、计算（`MapReduce`/`Spark`/`Flink`）、调度（`YARN`/`K8s`）、查询（`Hive`/`Presto`）、分析（`MLlib`/`Zeppelin`）
    - **选型思路**：离线批量归 `Spark`、实时流归 `Flink`、`SQL` 数仓用 `Hive`/`Spark SQL`、海量 `KV` 用 `HBase`
## 🤔 Hadoop 的核心组件有哪些？各自的作用是什么？ 
- **`Hadoop` 四大核心模块：`HDFS`（分布式文件存储）、`YARN`（统一资源调度）、`MapReduce`（分布式计算框架）、`Hadoop Common`（公共工具库）。加上配套生态 `ZooKeeper`（协调）/`Hive`（`SQL`）。核心：“`HDFS` 存、`YARN` 调度资源、`MapReduce` 算——三驾马车加公共库”。**
    - **`HDFS`（分布式文件系统，存储）**
        - 作用：海量数据分布式存储（`NameNode` 管元数据 + `DataNode` 存数据块），自动副本容错
        - 特点：一次写入多次读取、高吞吐、适合海量离线数据

    - **`YARN`（资源调度管理器，资源）**
        - 作用：统一管理集群计算资源（`CPU`/内存），调度作业（`ResourceManager` 管全局、`NodeManager` 管单点、`ApplicationMaster` 管单个作业）
        - 特点：资源池化、多计算引擎（`MapReduce`/`Spark`/`Flink`）共用

    - **`MapReduce`（计算框架）**
        - 作用：离线批处理（`Map` 分片处理 + `Reduce` 汇总），`Hive` 底层可经它；`Spark` 为独立执行引擎（不经 `MapReduce`）
        - 特点：磁盘重度、吞吐低（逐步被 `Spark` 取代），但仍是 `Hadoop` 经典算法思想

    - **`Hadoop Common`（公共库）**
        - 作用：公共工具（`FS` 文件系统抽象、`RPC`、`Config` 配置、序列化），其他模块依赖

    - **生态配套（易问）**
        - `ZooKeeper`（分布式协调，`HDFS`/`HBase` 高可用依赖）、`Hive`（`SQL` 查询）、`Sqoop`/`Flume`（数据进出）

- **协助记忆**
    - 口诀：“`HDFS` 存、`YARN` 调度资源、`MapReduce` 算——Common 打底，生态 `ZK`/`Hive` 配套”。

- **进阶思考**
    - **`HDFS` 为什么适合海量离线不适合实时？**
        - `HDFS` 高吞吐（顺序大文件读）、一次写多次读——适合批处理/归档；但随机小文件读写慢（`Block` 大/元数据集中 `NameNode`）、延迟高，不适合实时小查询（那是 `HBase`/`Kafka` 的事）。
    - **`YARN` 怎么让多个计算引擎共存？**
        - `YARN` 只管资源（`CPU`/内存），不管计算逻辑——`MapReduce`/`Spark`/`Flink` 各自提交 `ApplicationMaster` 到 `YARN` 申请容器跑任务，共用集群资源，按需分配（队列/优先级）。所以集群“一鱼多吃”。

- **扩展信息**
    - **`Hadoop` 发行版**：`Apache Hadoop`、`CDH`/`HDP`（商业版，已并入 `Cloudera`）；运维常基于发行版 + `Ambari`/`CM` 管理
    - **`Hadoop` 定位**：海量离线数据的基础设施；实时/交互场景外移到 `Spark`/`Flink`/`HBase`
## 🤔 Hadoop 集群有哪些关键进程及作用？ 
- **`HDFS` 有 `NameNode`（元数据）+`DataNode`（数据块）+（HA 时 `ZKFC`/`JournalNode`）；`YARN` 有 `ResourceManager`（资源）+`NodeManager`（节点）+`ApplicationMaster`（作业）。核心：“`NameNode` 管目录、`DataNode` 管块、`RM` 管资源、`NM` 管单点”。**
    - **`HDFS` 进程**
        - **`NameNode`**：管理文件系统元数据（目录/文件/块映射），响应客户端请求；是集群大脑，`Active`/`Standby`（HA）
        - **`DataNode`**：存储数据块（`Block`），定期上报 `NN`（心跳+块报告）；坏块检测/副本复制
        - **`JournalNode`/`ZKFC`**（HA 时）：`JournalNode` 存共享元数据日志（`QJM`），`ZKFC` 通过 `ZK` 自动主备切换
        - **`SecondaryNameNode`**：旧版辅助合并 `EditLog`（非备份，生产多用 HA）

    - **`YARN` 进程**
        - **`ResourceManager`**：全局资源调度（接收作业、分配 `Container`、管理队列），`Active`/`Standby`
        - **`NodeManager`**：单节点资源管理器（上报资源、启动/监控 `Container`）
        - **`ApplicationMaster`**：每作业一个（申请资源、调度作业内任务、管理生命周期）——**作业级临时进程**（随作业生灭，非集群常驻守护进程，与 `RM`/`NM` 层级不同）

    - **其他（生态）**
        - `ZooKeeper`（`HDFS`/`HBase`/`YARN` HA 的协调）、`Hive`（`Metastore`）、`HBase`（`HMaster`/`RegionServer`）

- **协助记忆**
    - 口诀：“`HDFS`：`NN` 管元数据、`DN` 存块；`YARN`：`RM` 管资源、`NM` 管节点、`AM` 管作业；HA 靠 `ZKFC`+`JournalNode`”。

- **进阶思考**
    - **`NameNode` 挂了集群会怎样？**
        - `NameNode` 挂 → `HDFS` 停止服务（`DataNode` 还在但元数据不可读），数据不丢（数据在 `DataNode`）；HA 下由 `Standby` 经 `ZKFC` 自动接管（`RPO` 很小），单 `NN` 需人工恢复（从 `FSImage`+`EditLog` 重启）。所以生产必须 `HA`。
    - **`DataNode` 宕机一个会丢数据吗？**
        - 不丢。`DataNode` 宕机 → 其上的 `Block` 副本减少（低于 3），`HDFS` 检测到后自动在健康节点复制补齐副本（`replication`），不影响数据可用性（只要副本未降到 `min.replication` 下限）。

- **扩展信息**
    - **进程端口**：`NameNode` 9870/8020、`DataNode` 9864、`ResourceManager` 8088/8032、`NodeManager` 8042、`JournalNode` 8485
    - **运维检查**：`jps` 看各节点进程、`hdfs dfsadmin -report` 看数据节点、`yarn node -list` 看资源节点
## 🤔 简述 HDFS 的工作原理？ 
- **`HDFS` 是分布式文件系统：文件被切分成数据块（`Block`，默认 128MB），块副本（默认 3 份）分布在多个 `DataNode` 上；`NameNode` 只需记录元数据（目录/文件→块映射，块→`DataNode` 映射由 `DataNode` 上报/心跳动态维护、不持久化），不存数据；读写都先向 `NameNode` 查询块位置，再与 `DataNode` 传输数据。核心：“`NN` 管元数据 + `DN` 存块副本，读写‘元数据到 `NN`、数据到 `DN`’”。**
    - **核心设计（主从架构）**
        - **`NameNode`**：只管元数据（命名空间、块映射），不存数据——数据流与元数据分离
        - **`DataNode`**：存数据块（`Block`），心跳+块报告上报 `NN`
        - **数据块（`Block`）**：文件切块（默认 128MB），大于 `Block` 的块自动切分；副本默认 3——放置策略是 1 副本本机架、2 副本异机架、第 3 副本与第 2 副本**同机架**（跨机架容错，非全部相异）

    - **写入流程（客户端）**
        - ①客户端向 `NameNode` 请求写入（创建文件/申请块）②`NN` 返回 `DataNode` 列表（按机架策略选 3 个）③客户端**直接**与 `DataNode` 建立管道（`pipeline`）写入数据（不经过 `NN`）④逐副本流水线写（`DN1`→`DN2`→`DN3`）⑤写满一个 `Block` 再申请下一个，全部确认后 `NN` 提交
        - 特点：数据流不经过 `NN`（省 `NN` 压力），管线式写副本

    - **读取流程（客户端）**
        - ①向 `NameNode` 查询文件块位置②`NN` 返回块所在的 `DataNode` 列表（含副本）③客户端就近选择 `DataNode` 直接读，并行读多个块；④`DN` 断连自动切换到其他副本

    - **副本管理**
        - 副本不足自动复制、副本过多自动删除（`replication` 因子），均衡（`balancer`），坏块/宕机触发再复制

- **协助记忆**
    - 口诀：“`NN` 管元数据（哪块在哪）、`DN` 存数据（块副本）；读走 `NN` 查位置、直连 `DN` 传数据；块 128M、副本 3、跨机架”。

- **进阶思考**
    - **为什么数据流不经过 `NameNode`（关键设计）？**
        - `NameNode` 是单点/元数据服务，若数据也流经它 → 成瓶颈 + 单点压力大。所以 `NN` 只做“目录服务”（告诉客户端去哪些 `DN` 读写），数据直接客户端↔`DataNode` 传输——吞吐高、`NN` 轻。
    - **`Block` 为什么设 128MB 那么大？**
        - 大块减少元数据量（`NN` 内存有限，块越小元数据越多）、减少 `MapReduce` 任务数（块即处理粒度）、顺序读友好（大数据量高吞吐）。但块太大会牺牲小文件/随机读性能。

- **扩展信息**
    - **读写命令**：`hdfs dfs -put/cat/get`、`hdfs dfsadmin -report`（块/节点）、`hdfs fsck`（文件完整性检查）
    - **关键参数**：`dfs.blocksize`(128M)、`dfs.replication`(3)、`dfs.namenode.name.dir`/`datanode.data.dir`（存储路径）
## 🤔 HDFS NameNode 高可用是怎么实现的？ 
- **`HDFS HA` 用“主备 `NameNode` + 共享元数据 + 自动切换”：两个 `NN`（`Active`/`Standby`）共用共享元数据日志（`QJM` 或 `NFS`），`ZKFC` 经 `ZooKeeper` 仲裁实现自动故障切换（`failover`）。核心：“`Active` 提供服务 + `Standby` 实时同步元数据（`JournalNode`），`ZKFC` 监控并自动切换”。**
    - **核心组件（QJM 模式）**
        - **两个 `NameNode`**：`Active`（读写）、`Standby`（实时同步元数据，随时接管）——消除单点
        - **`JournalNode`（QJM = Quorum Journal Manager）**：一组（≥3 个，奇数）存共享的 `EditLog`——`Active NN` 写日志、`Standby NN` 读日志实时应用（保持元数据一致），`JN` 用仲裁（多数派）
        - **`ZKFC`（ZooKeeper Failover Controller）**：每个 `NN` 旁一个，监控本 `NN` 心跳、经 `ZooKeeper` 维护 `Active` 锁，`Active` 异常时自动触发切换（`Standby` 升 `Active`）
        - **`ZooKeeper`**：提供 `Active` 锁与会话协调（不直接检测 `NN` 故障/选主——真正监控本 `NN` 心跳、持 `ZK` 锁并触发升 `Active` 的是 `ZKFC`；`fencing` 靠 `znode` 锁 + 纪元号防脑裂双主）

    - **工作流程（HA 原理）**
        - ①`Active NN` 写入时把元数据变更写 `JournalNode`（多数派确认）②`Standby NN` 实时从 `JN` 读 `EditLog` 并应用（保持同步）③`ZKFC` 监控，`Active` 失联 → 抢 `ZK` 锁，`Standby` 升 `Active`（先 `fencing` 隔离旧 `Active`）④客户端经 `Namenode` 虚拟 name（配置自动访问新 `Active`）

    - **数据保障（关键）**
        - **`fencing`**：切换前先隔离旧 `Active`（避免两个 `NN` 同时写，脑裂）——`QJM` 的 `fencing` 机制（fence 旧节点不再接受写）
        - **数据不丢**：`Standby` 已同步元数据（`RPO≈0`），接管后数据完整；`DataNode` 同时向两个 `NN` 汇报块信息

    - **存储构建议**
        - `NameNode`×2 + `JournalNode`×3（奇数）+ `ZK`×3 → 提供集群元数据高可用（挂一个 `NN`/`JN`/`ZK` 都不影响）

- **协助记忆**
    - 口诀：“双 `NN`（主备）+ `JN` 共享日志 + `ZKFC` 自动切换 + `ZK` 仲裁——`fencing` 防脑裂，数据不丢”。

- **进阶思考**
    - **`Standby NameNode` 是“热备”还是只是备份？**
        - 热备（非备份）：它实时从 `JN` 同步元数据（`EditLog`），保持和 `Active` 一致，故障时能**即时接管**（不像 `SecondaryNameNode` 只是周期性合并日志、非实时）。它不做读写，但元数据最新。
    - **`JournalNode` 起了什么关键作用？**
        - 它是元数据的“共享存储/传输层”：`Active` 写、`Standby` 读——让两个 `NN` 元数据一致，且用多数派（≥3 挂 1 可用）保证日志不丢。是 `HA` 的核心（替代旧版 `SecondaryNameNode` 的定期合并方案）。

- **扩展信息**
    - **HA 两种共享方式**：`QJM`（`JournalNode` 多数派，推荐）+ 旧版 `NFS` 共享 `EditLog`；新版还有 `NameNode` 滚动升级（`rolling upgrade`）
    - **运维检查**：`hdfs haadmin -getServiceState`（看主备）、`hdfs haadmin -failover`（手动切换）、`ZK` 状态 `zkServer status`
## 🤔 简述 YARN 资源调度流程？ 
- **`YARN` 资源调度：作业经 `ResourceManager`（全局）+ `ApplicationMaster`（作业级）+ `NodeManager`（节点级）协作——`RM` 分配 `Container`，`AM` 向 `RM` 申请容器（`allocate`）、指派给作业内任务，`NM` 负责启动/监控容器。核心：“`RM` 管全局资源、`AM` 管单作业申请、`NM` 管节点容器”。**
    - **核心角色**
        - **`ResourceManager`（RM）**：全局资源调度（接收作业请求、按队列/容量分配 `Container`、管理调度器）——集群资源管理员
        - **`ApplicationMaster`（AM）**：每作业一个（向 `RM` 申请资源、把任务切分、向 `NM` 发起容器、监控作业）——作业的“管家”
        - **`NodeManager`（NM）**：单节点资源管理（上报资源、启动/停止 `Container`、监控）——节点上的“执行者”

    - **作业调度流程（以 MapReduce 为例）**
        - ①客户端提交作业到 `RM`（`ApplicationMaster` 请求）②`RM` 分配第一个 `Container`，启动作业的 `AM`③`AM` 初始化作业（切分 `InputSplit`、规划 `Map`/`Reduce` 任务）④`AM` 向 `RM` 申请更多 `Container`（按资源需求）⑤`RM` 根据调度器（容量/公平）分配 `Container`（指定节点）⑥`AM` 联系 `NM` 启动任务容器（`Map`/`Reduce`），`NM` 执行并回报进度⑦任务完成，`AM` 回收资源并通知 `RM`，作业结束

    - **调度器（资源分配策略）**
        - **容量调度器（Capacity）**：按队列分配（`yarn.scheduler.capacity`，队列内 `FIFO`/资源占比）——生产常用
        - **公平调度器（Fair）**：队列内公平共享（动态分配、支持抢占），适合多用户共享
        - 调度器决定“给谁、给多少”——租户/队列隔离、优先级

    - **`Container`（资源单元）**
        - 资源抽象（`CPU` 核 + 内存 + 等），流程：`AM` 申请 → `RM` 调度器分配 → `NM` 启动，任务在 `Container` 里跑

- **协助记忆**
    - 口诀：“`RM` 发资源、`AM` 作业申请、`NM` 跑容器——客户端提交→`RM` 启 `AM`→`AM` 申请→`NM` 执行→回收”。

- **进阶思考**
    - **为什么引入 `ApplicationMaster`（相比旧 `JobTracker` 集中调度）？**
        - 旧 `MapReduce v1` 的 `JobTracker` 既管资源又管作业，单点 + 瓶颈。`YARN` 把“资源管理（RM）”与“作业调度（AM 每个作业一个）”解耦——`RM` 只管资源，各作业 `AM` 自行调度，横向扩 + 多计算框架共存（`Spark`/`Flink` 各自 `AM`）。
    - **队列/资源隔离怎么用（多租户）？**
        - 容量调度器按队列划分（`queue_a`/`queue_b` 各占资源比例），队列内可设最大/最小资源、优先级、`ACL`（谁可提交）——实现多部门资源共享又互不挤占，关键作业可保底资源。

- **扩展信息**
    - **调度相关**：`CapacityScheduler`/`FairScheduler`、`yarn.scheduler.capacity.root.queues` 队列配置、`elastic`/`preemption` 抢占
    - **运维**：`yarn application -list/status`、`yarn node -list`、`yarn queue -status`（队列状态）、`ResourceManager` `UI`（8088）
## 🤔 YARN 的核心组件有哪些？ 
- **`YARN` 四大核心：`ResourceManager`（全局资源调度）、`NodeManager`（节点资源）、`ApplicationMaster`（作业调度）、`Container`（资源容器）。核心：“`RM` 管全局、`NM` 管节点、`AM` 管作业、`Container` 是资源单元”。**
    - **`ResourceManager`（RM）**
        - 全局资源管理（接收作业、调度 `Container`、维护集群资源状态）；HA 时 Active/Standby
        - 内含 `Scheduler`（资源分配策略：容量/公平）+ `ApplicationsManager`（**作业生命周期管理**：接纳作业提交、为 `AM` 协商首个 `Container`、跟踪并重启失败 `AM`）

    - **`NodeManager`（NM）**
        - 单节点资源管家（上报节点资源、启动/监控 `Container`、健康检查），一个节点一个
        - 与 `RM` 心跳保持节点存活/资源可用

    - **`ApplicationMaster`（AM）**
        - 每作业一个（向 `RM` 申请 `Container`、切分任务、指派给 `NM`、监控作业）；`Spark`/`Flink`/`MapReduce` 各有 AM

    - **`Container`**
        - 资源抽象（`CPU`+内存+其他），是任务的运行单元（在 `NM` 上启动的进程）
        - 生命周期：`AM` 申请 → `RM` 分配 → `NM` 启动 → 任务完成回收

- **协助记忆**
    - 口诀：“`RM` 全局、`NM` 节点、`AM` 作业、`Container` 资源——四级协同调度”。

- **进阶思考**
    - **`AM` 为什么不是集群级而是作业级？**
        - 每个作业一个 `AM`，作业间调度互不干扰、天然隔离：作业挂只影响自己；多种计算引擎（`MR`/`Spark`/`Flink`）各自实现 `AM` 即可接入 `YARN`。这就是 `YARN` “通用资源调度平台”的关键。
    - **`NodeManager` 失联会怎样？**
        - `RM` 定时收 `NM` 心跳，超时（`yarn.nm.liveness-monitor.expiry-interval-ms`）判定节点失联 → 其上 `Container` 被标记失败、任务重试（`AM` 在其他 `NM` 重新分配），资源释放回收。节点恢复后重新上报资源。

- **扩展信息**
    - **调度器**：`CapacityScheduler`/`FairScheduler`（`yarn.resourcemanager.scheduler.class`）
    - **运维命令**：`yarn node -list`、`yarn application -list/-status/-kill`、`yarn queue -status`、`jstack`/日志（`ResourceManager` 8088 / `NodeManager` 8042 `UI`）
## 🤔 Hadoop 集群如何扩容？ 
- **`Hadoop` 扩容分两种：加数据节点（`HDFS` 存储扩容，`DataNode`）和加计算节点（`YARN` 计算扩容，`NodeManager`）。步骤：新节点准备（环境/依赖）→ 部署 `DataNode`+`NodeManager` 进程 → 加入集群（`NN`/`RM` 识别）→ 数据均衡（`HDFS` `balancer`，新节点填满）。核心：“加 `DN` 扩存储、加 `NM` 扩计算，`DataNode` 自动上报、`balancer` 均衡数据”。**
    - **扩容前准备（新节点）**
        - 环境就绪（JDK 版本一致、`Hadoop` 目录/配置复制、主机名/`hosts`、`SSH` 免密（分发用）、时间同步）
        - 配置一致（`core-site.xml`/`hdfs-site.xml`/`yarn-site.xml` 与现有集群一致）、`slaves`/`workers` 文件加入新节点
        - 磁盘挂载/数据目录（`datanode.data.dir`）就绪

    - **部署进程（`DataNode` + `NodeManager`）**
        - 新节点执行 `hdfs datanode`（存储）+ `yarn nodemanager`（计算），通过 `start-dfs.sh`/`start-yarn.sh` 或单独启动
        - `DataNode` 启动后向 `NameNode` 注册（上报块），`NodeManager` 向 `ResourceManager` 注册（上报资源），自动纳入集群

    - **加入与验证**
        - `hdfs dfsadmin -report`：新 `DataNode` 出现在 `Live datanodes`；`yarn node -list`：新 `NodeManager` 显示
        - 集群状态健康（`NN`/`RM` 正常），无异常

    - **数据均衡（`HDFS balancer`）**
        - 新 `DataNode` 初始为空——**`HDFS` 默认不自动均衡存量数据**（不主动把健康副本迁到新节点）；只有新写入按放置策略偏向空闲节点；**存量分布靠手动 `hdfs balancer`**（低峰/定时执行）让数据均匀
        - `balancer` 参数（带宽/阈值），低峰执行（占 `IO`）

    - **注意事项**
        - 只加 `DataNode`（存）不加 `NodeManager`（算）也行（按需），反之亦然
        - 扩容后新写入偏向新节点（`DataNode` 只承接新增数据）；`YARN` 资源自动增加（`NodeManager` 上报）；存量数据需 `hdfs balancer` 迁移

- **协助记忆**
    - 口诀：“新节点备环境 → 装 `DN`/`NM` → 自动注册上报 → `hdfs balancer` 均衡数据——加 `DN` 扩存储、加 `NM` 扩计算”。

- **进阶思考**
    - **扩容会中断集群吗？**
        - 不会。`Hadoop` 支持在线/水平扩容——新节点加入是渐进的（`DataNode` 上报即服务），旧节点不受影响；数据均衡是后台（`balancer`）渐进迁移。但要控制 `balancer` 带宽避免占满 `IO` 影响业务（低峰执行）。
    - **数据倾斜（扩容后新旧节点不均）怎么办？**
        - `HDFS` 均衡靠 `balancer`（按 `DataNode` 磁盘使用率），不均时手动 `hdfs balancer -threshold` 调；`YARN` 资源自动均摊（`NM` 上报）。大数据量迁移慢，分阶段 + 监控磁盘使用率。

- **扩展信息**
    - **相关命令**：`hdfs balancer`（数据均衡）、`hdfs dfsadmin -report`（节点）、`yarn node -list`、`jps`（验证进程）
    - **配置**：`slaves`/`workers` 文件、`dfs.replication`、`yarn.nodemanager.resource.memory-mb`（目标节点资源）、`datanode.data.dir`（磁盘）
## 🤔 Spark 与 MapReduce 的核心区别是什么？ 
- **`Spark` 与 `MapReduce` 的核心区别是计算模型与中间存储：`MapReduce` 每步 `Map`/`Reduce` 都要落磁盘（`HDFS`），迭代慢；`Spark` 用内存的 `RDD`（弹性分布式数据集）+ `DAG` 调度，中间结果驻内存、多步算子链式执行，比 `MR` 快 10-100 倍。核心：“`MR` 磁盘迭代慢、`Spark` 内存 `DAG` 快且统一批流”。**
    - **计算模型**
        - **`MapReduce`**：`Map`（切分处理）→ `Shuffle`（按 key 分组）→ `Reduce`（汇总）；**每阶段中间结果落本地盘**（`mapred.local.dir`，非 `HDFS`——仅 `Reduce` 最终输出写 `HDFS`），多阶段作业频繁读写磁盘
        - **`Spark`**：`RDD`（内存数据集）算子在 `DAG` 上链式执行，中间结果**默认驻内存**（可缓存/持久化），少落盘；`Shuffle` 也优化

    - **性能（核心差异）**
        - 迭代计算（机器学习/多轮 `join`）：`MR` 每轮落盘（慢），`Spark` 内存缓存（快 10-100x）
        - 交互/`Spark SQL` 查询：`Spark` 响应快

    - **编程与抽象**
        - `MR`：`map`/`reduce` 函数（`Java`，繁琐）；`Spark`：`RDD`/`DataFrame`/`Dataset` 高层 API（`Python`/`Scala`/`SQL`），`transformation`（惰性）+ `action`（触发）
        - `Spark` 惰性：转换操作不立即执行，遇 `action`（`count`/`collect`）才按 `DAG` 调度执行

    - **能力范围**
        - `MR`：仅批量离线（`Hive`/`MR`）；`Spark`：批处理 + `Spark SQL` + `Spark Streaming`(微批) + `MLlib`(机器学习) + `GraphX`(图)——统一一个引擎
        - 运行模式：`Spark` 可用 `YARN`/`K8s`/`Standalone`（`Mesos` 已弃用——`3.2` 起弃用、`4.0` 移除）

    - **实际定位**
        - 老 `Hadoop MapReduce` 仍在（历史兼容），新项目普遍用 `Spark`（内存 + 统一 + 快）

- **协助记忆**
    - 口诀：“`MR` 磁盘慢、`Spark` 内存快；`MR` 一步一落盘、`Spark` `DAG` 链式算；`Spark` 批流 SQL 一锅端”。

- **进阶思考**
    - **`Spark` 为什么比 `MR` 快这么多（除了内存）？**
        - ①内存缓存中间结果（少磁盘 `IO`）②`DAG` 调度（任务间依赖清晰、`stage` 内并行、避免 `MR` 的无谓落盘）③算子优化（`Spark` 把多个操作合并、优化 `Shuffle`）④`DataFrame` 有 `Catalyst` 优化器（列式/谓词下推）。内存 + 智能调度 + 优化器共同作用。
    - **`Spark` 内存不够（`OOM`）怎么办（和 MR 比）？**
        - `MR` 落盘天然内存安全（慢）；`Spark` 内存敏感——靠：调 `spark.executor.memory`、数据分区（`repartition`/`coalesce`）、序列化、`Shuffle` 分区数、避免大 `collect`。`Spark` 用空间换时间，内存管理是调优核心。

- **扩展信息**
    - **`Spark` 生态**：`Spark Core`（`RDD`）、`Spark SQL`（`DataFrame`）、`Spark Streaming`（`DStream`）、`MLlib`、`GraphX`
    - **`MR` vs `Spark` 选型**：离线大规模、已有 `MR` 生态用 `MR`（兼容）；交互/迭代/流用 `Spark`（性能）
## 🤔 Spark 核心组件有哪些？ 
- **`Spark` 核心：`Spark Core`（`RDD` 基础）、`Spark SQL`（结构化查询/`DataFrame`）、`Spark Streaming`（微批流）、`MLlib`（机器学习）、`GraphX`（图计算）。运行框架上：`Driver`（主程序）+ `Executor`（执行器）+ `Cluster Manager`（`YARN`/`K8s`/Standalone）。核心：“`Core` 打底 + `SQL`/`Streaming`/`MLlib`/`GraphX` 四组件 + `Driver`/`Executor` 架构”。**
    - **核心库（组件）**
        - **`Spark Core`**：`RDD`（弹性分布式数据集）+ 调度（`DAG`+`Stage`+`Task`）+ 运行时——一切的基础
        - **`Spark SQL`**：`DataFrame`/`Dataset`，`SQL` 查询 + `Catalyst` 优化器 + `Hive` 兼容（`thriftserver`）
        - **`Spark Streaming`**：微批流处理（`DStream`，把流切成小批）；`Structured Streaming` 基于 `DataFrame`/`Dataset` API，属 `Spark SQL` 引擎（非 `DStream` 子集）
        - **`MLlib`**：分布式机器学习（特征/分类/聚类/推荐算法），`Pipeline` 流程化
        - **`GraphX`**：图计算（`PageRank`/社区发现），基于 `RDD` 的图 API

    - **运行时架构（`Driver`/`Executor`）**
        - **`Driver`**：`SparkContext`/`SparkSession`——作业入口，切分 `DAG` → `Stage` → `Task`，调度分发；管理作业生命周期
        - **`Executor`**：`Worker` 上的执行进程（跑 `Task`、缓存 `RDD`），多个 `Task` 并行执行
        - **`Cluster Manager`**：资源调度（`YARN`/`K8s`/`Standalone`；`Mesos` 已弃用）——`Driver` 和 `Executor` 跑在上面

    - **数据抽象**
        - `RDD`（基础，低层）、`DataFrame`（`Schema` 化，优化好）、`Dataset`（类型化，`Scala`/`Java` 用）——`DataFrame`/`Dataset` 经 `Catalyst` 优化

- **协助记忆**
    - 口诀：“`Core` 打底（`RDD`），`SQL`/`Streaming`/`MLlib`/`GraphX` 四组件；运行 `Driver` 调度 + `Executor` 干活 + `Cluster Manager` 给资源”。

- **进阶思考**
    - **`Driver` 挂了会怎样？**
        - `Driver` 是作业大脑，挂了作业失败（`Executor` 还在但无人调度/收结果）。生产要 `Driver` 高可用（`YARN` 下 `AM` 重启、`K8s` 下 `Driver` `Pod` 重启），`Driver` 网络/内存要监控。
    - **`Executor` 数/核怎么定？**
        - 影响并行度与资源利用：`Executor` 数 × 核数 ≈ 集群可并行任务上限；内存给够（别 `OOM`）但别过大（`GC` 压力）。权衡：`executor` 数量、每 `executor` 核数/内存、并行度（`parallelism`）——经典调优三元组。

- **扩展信息**
    - **生态**：`Spark` + `Hive`（`ThriftServer` 支撑 `SQL`）、`Spark on YARN` 最常用、`Structured Streaming`（现代实时）
    - **可选**：`Spark 3.x` 的 `AQE`（自适应查询执行）、`Dynamic Allocation`（动态分配）、`PySpark`（`Python` 写 `DataFrame`）
## 🤔 简述 Spark Job 提交后的执行流程？ 
- **`Spark` 作业提交后：`Driver` 构建 `DAG` → 划分 `Stage`（按 `Shuffle` 边界）→ 生成 `Task`（按分区）→ `DAGScheduler` 提交给 `TaskScheduler` → `Cluster Manager` 分配资源 → 各 `Executor` 执行 `Task` → 结果回 `Driver`。核心：“`RDD` 算子 → `DAG` → `Stage` 切分 → `Task` 分发执行”。**
    - **执行流程（分阶段）**
        - ①客户端 `submit` 作业 → `Driver`（`SparkContext`/`SparkSession`）初始化
        - ②`Driver` 把 `RDD` 算子链构建成 `DAG`（有向无环图，记录转换关系）
        - ③`DAGScheduler` 把 `DAG` 按**`Shuffle` 边界**切成 `Stage`（`ShuffleMapStage`：写 `Shuffle`；`ResultStage`：产出结果）
        - ④`Executor` 先经 `Cluster Manager`（`YARN`/`K8s`/Standalone）在应用启动时分配并注册
        - ⑤每 `Stage` 按分区（`Partition`）生成 `Task`（`ShuffleMapTask`/`ResultTask`），`TaskScheduler` 派发给各 `Executor` 并行执行
        - ⑥`ShuffleMapTask` 输出 `Shuffle` 中间数据；`ResultStage` 的 `ResultTask` 计算最终结果
        - ⑦`Task` 结果回 `Driver`（或直接写外部存储）——整个流程由 `action` 触发启动（如 `count`/`collect`）

    - **关键概念**
        - **`DAG`**：算子的依赖图（转换关系）——`Driver` 用它做优化/调度
        - **`Stage`**：`DAG` 按 `Shuffle` 切分（窄依赖一个 `Stage`，宽依赖 `Shuffle` 分 `Stage`），`Stage` 内部 `Task` 并行
        - **`Task`**：任务最小执行单元（每分区一个），在 `Executor` 上跑
        - **懒执行**：`transformation` 只记 `DAG`，遇 `action`（`count`/`collect`/`saveAsTextFile`）才触发真正执行

    - **失败处理**
        - `Task` 失败自动重试（`spark.task.maxFailures`）、`Stage` 失败重算、检查点（`checkpoint`）断点

- **协助记忆**
    - 口诀：“`RDD` 算→`DAG` 图→`Shuffle` 切 `Stage`→分区产 `Task`→`Executor` 并行跑→`action` 触发执行”。

- **进阶思考**
    - **为什么按 `Shuffle` 划分 `Stage`？**
        - `Shuffle`（如 `groupByKey`/`join`）需要数据全部到达后按 `key` 汇总——是天然的执行边界（`Stage` 边界）。`Shuffle` 前可流水线（窄依赖合并），`Shuffle` 后新 `Stage`。这样 `Stage` 内并行、`Stage` 间依赖（`Shuffle` 落盘），任务划分清晰。
    - **`DAG` 调度和 `MapReduce` 的作业划分有何不同？**
        - `MR` 是固定 `Map`→`Shuffle`→`Reduce` 两阶段（不管步骤多少都是这两步，多步就多次 `MR` 落盘）；`Spark` `DAG` 把整条算子链按 `Shuffle` 切 `Stage`，`Stage` 内多算子合并执行（不分步落盘）——更灵活高效。

- **扩展信息**
    - **易混淆**：`Job`（一个 `action` 触发的一个 `DAG`）、`Stage`（`DAG` 按 `Shuffle` 切）、`Task`（`Stage` 内分区任务）——层级关系：`Job` → `Stage` → `Task`
    - **运维**：`Spark UI`（看 `Job`/`Stage`/`Task` 耗时/`Shuffle` 大小）、日志（`Driver`/`Executor`）、`event log`
## 🤔 Spark 有哪几种运行模式？ 
- **`Spark` 四种运行模式（按资源管理/部署）：`Local`（本地单机调试）、`Standalone`（Spark 自带集群）、`YARN`（`Hadoop` 生态，生产主流）、`K8s`（云原生容器）。核心：“本地调试 `Local`、自带集群 `Standalone`、`Hadoop` 上 `YARN`、云原生 `K8s`”。**
    - **`Local` 模式**
        - 单机多线程（`spark-submit --master local[n]`），不启动集群——开发/调试用
        - 特点：最快上手，无真实集群/分布式（测试代码用）

    - **`Standalone` 模式**
        - `Spark` 自带的简单集群（`Master` + `Worker`），不依赖 `Hadoop`——小集群/快速部署
        - 特点：部署简单、无 `YARN` 生态时用；但资源管理/多租户弱于 `YARN`

    - **`YARN` 模式（生产最常用）**
        - 作业提交到 `Hadoop YARN`（`yarn-client`/`yarn-cluster`），由 `ResourceManager` 调度资源，与 `Hive`/`MR` 共用集群——生产主流
        - 特点：资源统一管理、多框架共用、高可用（`YARN HA`）、队列隔离/配额
        - `yarn-cluster`（`Driver` 跑在 `YARN`，`AM` 管理）：生产推荐

    - **`K8s` 模式（云原生）**
        - `Spark` 作业跑在 `Kubernetes`（`Pod`），`K8s` 调度资源——云原生/容器化环境
        - 特点：容器隔离、弹性、与云生态集成（`S3`/`HDFS` 存储）

    - **选型**
        - 调试 `Local`、小集群/自建 `Standalone`、`Hadoop` 生态 `YARN`、云原生 `K8s`——生产多 `YARN`（与 `Hive` 共用）或 `K8s`（新架构）

    - **提交方式**
        - `spark-submit --master yarn --deploy-mode cluster ...`；`client` vs `cluster`（`Driver` 在哪跑）

- **协助记忆**
    - 口诀：“本地调试 `local`、自带集群 `standalone`、`Hadoop` 上 `yarn`、云原生 `k8s`——生产选 `yarn`/`k8s`”。

- **进阶思考**
    - **`yarn-client` 和 `yarn-cluster` 区别？**
        - `client`：`Driver` 跑在**提交客户端**（本地机器），适合交互式/调试（`Driver` 在提交机，作业与提交机绑，提交机挂作业挂）；`cluster`：`Driver` 跑在 **`YARN` 集群的 `AM` 容器**里（`Driver` 即 `AM` 内进程，`AM` 管理其生命周期），提交后客户端可离开——生产用 `cluster`（`Driver` 随 `AM` 重启、提交机解耦）。
    - **`Standalone` vs `YARN` 怎么选？**
        - 已用 `Hadoop`（有 `YARN`/`Hive`）→ `YARN`（统一资源、共用集群、队列隔离）；刚起步/不想依赖 `Hadoop`、资源管理简单 → `Standalone`（轻量，但多租户/高可用弱）。

- **扩展信息**
    - **`Master URL`**：`local[*]`、`spark://host:7077`（standalone）、`yarn`、`k8s://https://...`
    - **配套**：`--deploy-mode client/cluster`、`--num-executors`/`--executor-memory`（`YARN` 下资源）、`spark-submit` 脚本封装
## 🤔 Flink 集群有哪些核心组件？ 
- **`Flink` 集群（`Session`/`Per-job` 模式）核心：`JobManager`（作业管理/调度/`Checkpoint` 协调）、`TaskManager`（执行任务/数据流处理）、`Job`（客户端提交的作业）+ `ZK`/`HA`。核心：“`JobManager` 大脑 + `TaskManager` 干活 + 可 `HA` 高可用”。**
    - **`JobManager`（JM，作业管理器）**
        - 集群主节点——接收作业（`JobGraph`）、调度 `Task` 到 `TaskManager`、协调 `Checkpoint`/恢复、管理集群状态
        - 高可用：`HA` 部署（`ZooKeeper` + 元数据持久化到 `HDFS`），`JobManager` 挂可切换
        - 内部：`Dispatcher`（接收作业）、`ResourceManager`（分配 `TaskManager` 资源）、`JobMaster`（每作业一个管理）

    - **`TaskManager`（TM，任务管理器）**
        - Worker 节点——执行 `JobManager` 分配的 `Task`（算子/算子链），管理任务线程与内存/网络
        - 一个 `TM` 跑多个 `Task`（`Slot` 资源槽——并发执行的单元，`TaskManager.numberOfTaskSlots`）

    - **`Job`/客户端**
        - 客户端（`Flink SQL`/`DataStream` 程序）打包 `JobGraph` 提交到 `Cluster`——`flink run`/`Flink SQL` CLI
        - 作业提交到 `Session Cluster`（共享集群）或 `Per-job`（独立集群实例）

    - **`HA` 与协调**
        - `ZooKeeper`（[`JobManager` 选主/存储状态]）、`HDFS`/`S3`（`Checkpoint`/`Savepoint` 存储）
        - `Standalone` 模式下自建集群；`YARN`/`K8s` 模式下由外部调度（`Flink on YARN`/`Flink on K8s`）

    - **资源抽象**
        - **`Slot`**：`TaskManager` 上的并发单位（一个槽跑一个任务），决定并行度上限

- **协助记忆**
    - 口诀：“`JobManager` 大脑（调度/`Checkpoint`）+ `TaskManager` 干活（`Slot` 跑任务）+ 客户端提交；`ZK`+`HDFS` 做 `HA`/状态存储”。

- **进阶思考**
    - **`JobManager` 挂了会怎样（有没有 HA）？**
        - 无 `HA`：作业中断，从头恢复（丢状态）；有 `HA`：`ZK` 选新 `JobManager`，从 `Checkpoint` 恢复（断点续算），`TaskManager` 重连。生产必须 `HA`（`JobManager` × 多 + `ZK`）。
    - **`TM` 的 `Slot` 数和并行度什么关系？**
        - `Slot` 是 `TM` 上可并行执行的槽位，**总 Slot 数 = 集群能支持的最大并行度（容量上限）**；作业并行度是独立配置值（`env.setParallelism`/算子级），需 ≤ 可用 `Slot` 才能全部同时运行（超出会快速失败 `Could not allocate all required slots`，非排队），是 `Flink` 并发与吞吐的关键。

- **扩展信息**
    - **部署模式**：`Standalone`/`Flink on YARN`/`Flink on K8s`（`K8s` 下用 `Operator` 部署）；`Session`（共享）/`Per-Job`/`Application` 模式
    - **运维**：`Flink Web UI`（`JobManager` 地址）、`flink list/savepoint/cancel`、`Checkpoint` 配置（`state.backend`/`CheckpointStorage`）
## 🤔 Flink Checkpoint 是什么？作用？ 
- **`Flink Checkpoint`（检查点）是周期性自动的全局状态快照：每隔一段时间，`JobManager` 协调 `TaskManager` 把算子的状态（`KeyedState`/`OperatorState`）+ 数据源偏移量一致地存到持久存储（`HDFS`/`S3`），用于故障恢复（作业挂了从最近一次 `Checkpoint` 重启续算）。核心：“周期自动存一致状态，故障时从检查点恢复，实现 `Exactly-once`”。**
    - **作用（核心价值）**
        - **故障恢复**：作业/机器挂了，从上次 `Checkpoint` 恢复（状态 + 数据源 offset 对齐）——不丢数据、少重算
        - **`Exactly-once` 语义基础**：配合 state + offset 对齐 + 事务输出（两阶段提交），保证处理恰好一次
        - 是 `Flink` 流处理可靠性的基石（生产必开）

    - **工作机理**
        - `CheckpointCoordinator`（`JobManager`）周期触发（`checkpoint.interval`）**屏障（`Barrier`）** 注入数据流
        - `Barrier` 随数据流流动，算子收到 `Barrier` 后把**状态快照**写入 `CheckpointStorage`（`HDFS`/`S3`），所有算子快照完成 → 一个 `Checkpoint` 成功（`n`/`n` 完成）
        - 增量 `Checkpoint`（`RocksDB` 增量）、对齐（对齐/非对齐）

    - **配置**
        - `state.backend`（`RocksDB`/`Heap`）、`checkpoint.interval`（频率）、`checkpoint.timeout`、`savepoint`（手动）、存储目录（`HDFS`/`S3`）
        - `Checkpoint` 自动、周期；`Savepoint` 手动、用户触发

    - **与 `Savepoint` 区别（常问）**
        - **`Checkpoint`**：自动、周期、触发频率高、用于故障自动恢复、恢复快（默认）
        - **`Savepoint`**：手动（`flink savepoint`）、可指定时间点、用于运维操作（升级/迁移/回滚）、可跨版本恢复

- **协助记忆**
    - 口诀：“`Checkpoint` 周期自动存一致状态（state+offset），故障从它恢复——`Exactly-once` 基石；`Savepoint` 手动存、改代码升级用”。

- **进阶思考**
    - **`Checkpoint` 怎么做到“一致”（不重不漏）？**
        - 用**屏障对齐**：`Barrier` 随数据流注入，算子收到本通道 `Barrier` 后暂停该通道处理、等所有通道 `Barrier` 到齐再一起快照——对齐属于**检查点一致性机制**（保证快照时刻状态与 `offset` 严格对应）；但**端到端 `Exactly-once` 还须配合事务输出（两阶段提交）**，仅对齐不保证语义。
    - **`Checkpoint` 太频繁会怎样？**
        - 频率高：状态快照频繁写存储（`IO` 压力）、影响吞吐；频率低：恢复时从头重算多。权衡：按状态量/吞吐设间隔（如 `30s-5min`），配合增量 `Checkpoint` 减小开销。

- **扩展信息**
    - **相关**：`state.backend`（`RocksDB`/`HashMap`）、`CheckpointStorage`（`Fs`/`JobManager`）、`exactly-once`/`at-least-once` 语义、`barrier` 对齐/非对齐
    - **运维**：`flink savepoint`/`cancel -s`、`Checkpoint` `UI`（`JobManager`）、`HA` 存储（`HDFS` 目录）
## 🤔 Flink Savepoint 是什么？作用？与 Checkpoint 区别？ 
- **`Flink Savepoint`（保存点）是手动触发的全量状态快照，存到持久存储（`HDFS`/`S3`）——用于运维操作（升级版本/改并行度/迁移/回滚），可从它 `restore` 恢复。与 `Checkpoint` 区别：`Checkpoint` 自动周期/故障恢复用；`Savepoint` 手动/运维操作用。核心：“`Savepoint` 手动存做运维，`Checkpoint` 自动存做故障”。**
    - **`Savepoint` 是什么**
        - 用户手动触发（`flink savepoint <jobId> <dir>`）的作业状态 + 数据源 offset 一致快照（全量）
        - 存到指定路径（`savepoint.dir`/命令行指定），是作业的“存档点”（可随时恢复）

    - **作用（运维场景）**
        - **升级版本**：`Flink`/`SQL` 升级前打 `Savepoint`，升级后 `restore`（跨版本恢复）
        - **改并行度/拓扑**：调整并行度后从 `Savepoint` 恢复（状态重新分配）
        - **迁移/回滚**：作业迁移到新集群、改代码后要回滚，`Savepoint` 恢复到旧状态
        - **人工回溯**：想重放到某个时间点（`savepoint` 记录位置）

    - **与 `Checkpoint` 区别（重点）**
        - **触发**：`Checkpoint` **自动周期**（`checkpoint.interval`）；`Savepoint` **手动**（用户命令）
        - **频率**：`Checkpoint` 频繁（故障恢复）；`Savepoint` 低频（运维节点）
        - **粒度**：`Checkpoint` 可增量状态（`RocksDB`）；`Savepoint` 全量快照
        - **生命周期/用途**：`Checkpoint` 临时（故障自动恢复，可删）；`Savepoint` 持久（运维存档，长期保留，升级/迁移）
        - **恢复**：作业异常自动从最近 `Checkpoint` 恢复（默认）；人工 `flink run -s <savepoint>` 从 `Savepoint` `restore`

    - **使用**
        - 打点（触发存点）：`flink savepoint <jobId> [targetDir]`（`-d`/`--dispose` 是**删除** savepoint）；恢复：`flink run -s <savepointPath> ...`（配合作业同一 `JobId`/代码兼容）

- **协助记忆**
    - 口诀：“`Checkpoint` 自动周期、故障恢复用；`Savepoint` 手动、升级/迁移/回滚用——一个保命、一个存档”。

- **进阶思考**
    - **为什么升级前一定要 `Savepoint` 而不是靠 `Checkpoint`？**
        - `Checkpoint` 是为**自动故障恢复**设计的（可能被清理/过期、依赖配置、不同版本代理可能不兼容）；`Savepoint` 是**显式存档**（全量、指定路径、跨版本设计），改代码/升级后能精确从存档点恢复——运维可预期。
    - **`Savepoint` 恢复条件（容易踩坑）？**
        - 恢复到**同一个作业**/兼容的算子（`operator ID` 一致）、依赖默认被 `state` 恢复（`uid` 设好）、代码拓扑与 `Savepoint` 匹配（`uid`/哈希）。改代码要保证算子 `uid` 稳定，否则恢复失败。

- **扩展信息**
    - **对比表**：`Checkpoint`（自动周期/故障恢复/可增量/临时）；`Savepoint`（手动/运维存档/全量/持久）——`Flink` 面试高频对比
    - **命令**：`flink savepoint <jobId> [dir]`（打点）、`flink stop -s <savepointPath> <jobId>`（优雅停止并存点，`cancel -s` 已废弃）、`flink run -s <savepoint>`（恢复）、`--savepoint` 禁用/删除
## 🤔 Hive 是什么？有哪些核心组件？ 
- **`Hive` 是把 `Hadoop` 数据仓库化的 `SQL` 查询引擎：用户写 `HiveQL`（`SQL`），`Hive` 把它编译成 `MapReduce`/`Tez`/`Spark` 作业跑在 `Hadoop` 上——让不会写 `Java MapReduce` 的人用 `SQL` 分析大数据。核心组件：`Metastore`（元数据）、`Driver`（编译器/优化器/执行器）、`HQL` 解析为 MR 作业。核心：“`SQL` 查 `Hive` 表，元数据在 `Metastore`，作业跑 `Hadoop`”。**
    - **`Hive` 是什么**
        - 数据仓库工具（`Facebook` 起源）：把结构化数据映射成表，`SQL` 查询转 `MapReduce`
        - 定位：**离线**大规模数据分析（`ETL`/数仓/`SQL` 报表）——`SQL-on-Hadoop`

    - **核心组件**
        - **`Metastore`（元数据服务）**：存表/库/列/分区等元数据（默认内嵌 `Derby`，生产用 `MySQL`/`PostgreSQL`），是 `Hive` 的“字典”——表和数据的映射关系
        - **`Driver`（驱动/编译器）**：①解析（`Parser` 把 `HQL` 转 `AST`）②语义分析（绑定元数据）③逻辑计划 → 物理计划 ④优化（谓词下推/分区裁剪）⑤生成 `MapReduce`/`Tez`/`Spark` 作业 ⑥提交执行
        - **执行引擎**：底层由 `MapReduce`/`Tez`（更优）/`Spark` 执行（`Execution Engine`）
        - **用户界面层**：`CLI`/`Beeline`/`HiveServer2`（JDBC 连接）、Thrift `API`

    - **表类型/HQL 特性**
        - 管理表/外部表（`External`——数据在用户指定路径，**`Hive` 不管理其生命周期**，`DROP` 外部表不删底层数据）、分区表（`partition`，按字段分区裁剪）、分桶表（`bucket`）
        - 数据格式：`TextFile`/`Parquet`/`ORC`（列式压缩，快）/`Avro`；`ORC`/`Parquet` 性能优

    - **存储与执行**
        - 数据存 `HDFS`（`Hive` 只管元数据文件位置，数据在 `HDFS`）；查询转成后台作业

- **协助记忆**
    - 口诀：“`Hive` = `SQL` 查数据仓库，`Metastore` 管元数据、`Driver` 编译成 `MR` 作业；分区/列式（`ORC`）提效”。

- **进阶思考**
    - **`Hive` 为什么慢（怎么优化）？**
        - 底层是 `MapReduce`（磁盘、启动开销）；优化：①分区裁剪/谓词下推（少扫数据）②列式存储 `ORC`/`Parquet` ③换 `Tez`/`Spark` 执行引擎（比 `MR` 快）④`SMB Join`/`Map Join`/`Bucketing` ⑤调 `Reduce` 数/内存。瓶颈多为全表扫/数据倾斜/引擎性能。
    - **`Hive` 和 `Spark SQL` 区别（都是 SQL on Hadoop）？**
        - `Hive` 元数据（`Metastore`）+ `SQL` 引擎，底层多 `MR`（慢但代码兼容）；`Spark SQL` 基于 `Spark`（内存快 + `Catalyst` 优化器），也能读 `Hive` 元数据（`HiveMetastore` 共享）。现代更多用 `Spark SQL` 查询（性能），`Hive` 表元数据可复用。

- **扩展信息**
    - **生态**：`Beeline`/`HiveServer2`（JDBC 客户端）、`ThriftServer`、`Hive` `Metastore`（共享给 `Spark`/`Presto`）、`LLAP`（`Hive` 交互式加速）
    - **数仓分层**：`ODS`（原始）→ `DWD`（明细）→ `DWS`（汇总）→ `ADS`（应用），`Hive`/`Spark SQL` 做 `ETL` 各层
## 🤔 HBase 是什么？有哪些核心组件？ 
- **`HBase` 是 `Hadoop` 生态的分布式宽列/列族存储（`Key-Value`，非传统列存）：海量结构化/半结构化数据的随机实时读写（`HDFS` 做批处理、`HBase` 做单点查询）。核心组件：`HMaster`（管理/分区）、`RegionServer`（数据服务）、`ZooKeeper`（协调/选主），底层存 `HDFS`。核心：“`HMaster` 管分区、`RegionServer` 服务读写、数据在 `HDFS`”。**
    - **数据模型**
        - 表 → 行键（`RowKey`）+ 列族（`Column Family`）+ 列限定符（`Qualifier`）+ 时间戳（`Version`）+ 值
        - 稀疏（未定义的列不占存储）、按 `RowKey` 字典序排序、可多版本——适合海量随机读 + 列动态扩展

    - **核心组件**
        - **`HMaster`（主节点）**：管理表/`Region` 分配（`RegionServer` 负载均衡、故障转移）——不直接收发数据；`Region` **分裂由 `RegionServer` 触发并执行**（`flush`→`split`→生成子 `Region`），`HMaster` 只协调分配
        - **`RegionServer`（数据节点）**：服务一个或多个 `Region`（数据分区），处理客户端读写请求（`Get`/`Scan`）、`MemStore`(内存写)+`HFile`(磁盘落盘)→`HDFS`、`WAL` 日志
        - **`ZooKeeper`（协调）**：`HMaster` 选主（HA）、`RegionServer` 注册/心跳、`hbase:meta` 表位置（客户端路由）
        - **`HDFS`**：底层存储（`HFile` 数据持久化）

    - **存储流程（写）**
        - 客户端 → `ZK` 找 `meta` → 定位 `RegionServer` → `RegionServer` 写 `WAL`（日志）+ `MemStore`（内存缓冲）→ 达到阈值刷写（`flush`）成 `HFile` 落 `HDFS`；`Region` 大则分裂（`split`）

    - **适用场景**
        - 海量（`TB`-`PB`）+ 随机实时读写（时序/日志/用户画像/推荐）——`HBase`；批处理/离线分析用 `Hive`/`Spark`

- **协助记忆**
    - 口诀：“`HBase` = 列式 `KV` 随机读；`HMaster` 管分区、`RegionServer` 服务读写、`ZK` 协调、数据在 `HDFS`；写走 `WAL`+`MemStore` 再落 `HFile`”。

- **进阶思考**
    - **`HBase` 和 `HDFS` 什么关系（覆盖还是并列）？**
        - `HBase` 构建在 `HDFS` 之上：`HBase` 是把数据组织成 `KV` 列式、提供随机读写逻辑层，物理数据块存 `HDFS`。`HDFS` 只提供文件存储（无随机按 key 查），`HBase` 在其上加索引/一致性/实时读写。
    - **`HBase` 为什么读快写也快（和 `Hive` 比）？**
        - 写：`WAL`（顺序写日志）+ `MemStore`（内存写缓冲）+ 批量刷 `HFile`（顺序写）——随机写变顺序写；读：`MemStore` 内存 + `BlockCache` 缓存 + `HFile` 索引（按 `RowKey` 定位，`BloomFilter` 加速）——按 key 直接寻址。`Hive` 是全表扫（`MR`），`HBase` 是按 `RowKey` 点查。

- **扩展信息**
    - **`RowKey` 设计**：`RowKey` 决定分布（热点考虑，前缀 `MD5`/加盐避免热点）、长度/顺序（前缀匹配查询优化）——`HBase` 性能关键
    - **运维**：`hbase shell`（`count`/`scan`/`get`）、`Region` 分裂/合并、`RegionServer` 崩溃恢复（`WAL` 重放）、`Hmaster` `UI`(16010)、`hbasemeta`
## 🤔 HBase 读写流程是怎样的？ 
- **`HBase` 读写都先经 `ZooKeeper` 定位 `RegionServer`：读走 `MemStore`+`BlockCache`+`HFile`（`RowKey` 点查/`Scan` 范围扫）；写走 `WAL`（日志）+ `MemStore`（内存缓冲）再异步刷写 `HFile` 落 `HDFS`。核心：“写先日志后内存、读按行键定位（内存缓存 + 磁盘 `HFile`）”。**
    - **定位（路由，读写的公共前提）**
        - ①客户端访问 `ZooKeeper` 找 `hbase:meta` 表的 `RegionServer` 位置②读 `meta` 表（缓存），得知要读/写的 `RowKey` 落在哪个 `Region`/`RegionServer`③直连对应 `RegionServer` 读写（`meta` 会缓存，减少 `ZK` 往返）

    - **写入流程**
        - ①客户端 `Put` → 定位到 `RegionServer` ②`RegionServer` 写 **`WAL`（`Write-Ahead Log`，顺序写日志，先记后写防丢）**③写 **`MemStore`（内存写缓冲，按 `RowKey` 排序）**④`MemStore` 到达阈值 → **`flush` 刷写成 `HFile`** 落 `HDFS`（`StoreFile`）⑤`Region` 过大 → **`split` 分裂**为子 `Region`；`HFile` 定期合并（`compaction`）
        - 特点：写是顺序日志 + 内存，快；数据先内存后 `HFile`

    - **读取流程**
        - ①`Get`（点查）/`Scan`（范围扫）按 `RowKey` 定位 `RegionServer` ②先从 **`BlockCache`（读缓存）** 找 ③再从 **`MemStore`（最新未刷写）** 找 ④最后查 **`HFile`（磁盘，`RowKey` 索引 + `BloomFilter` 加速）**⑤多文件版本合并（`Read` 时 `MVCC`），返回最新数据
        - 特点：缓存优先（冷数据落盘），`RowKey` 定位快速

    - **一致性/可靠性**
        - `WAL` 保证宕机不丢写（`RegionServer` 崩，`HMaster` 拆分其 `WAL` 并重分配 `Region`，由新 `RegionServer` **重放 `WAL` 恢复**——`HBase 2.x` 走分布式 `SplitLog`）、`MVCC`（多版本并发控制）保证读一致性、`Region` 分裂/合并自动

- **协助记忆**
    - 口诀：“定位走 `ZK`+`meta`；写：`WAL`→`MemStore`→`flush` 成 `HFile`；读：`BlockCache`→`MemStore`→`HFile`（按 `RowKey`）”。

- **进阶思考**
    - **为什么写要先写 `WAL` 再进 `MemStore`？**
        - `MemStore` 数据在内存（易丢），宕机内存数据全没——`WAL` 是持久化日志（`HDFS` 落盘），先记日志再写内存，宕机后从 `WAL` 重放恢复所有 `MemStore` 未刷写的数据（不丢）。顺序写日志快，是“写入必持久化”的关键。
    - **`HBase` 读放大/写放大是什么？**
        - 写放大：数据频繁 `flush`/`compaction`（写多份），`MemStore` 阈值/`compaction` 策略影响；读放大：读要查缓存+内存+多个 `HFile`（版本/MVCC），`HFile` 多读就慢。`compaction` 合并文件减读放大、但增写放大——权衡（`compaction` 策略）。

- **扩展信息**
    - **`RowKey` 与读优化**：前缀过滤（`scan` 起止 `RowKey`）、加盐避开热点、`Column Family` 别太多（少量大表查询）
    - **运维**：`Region` 分裂/合并（`split`/`merge`）、`major_compact`、`hbase hbck`（一致性修复）、性能参数（`BlockCache`/`MemStore` 大小）
## 🤔 HBase RegionServer 故障如何排查与恢复？ 
- **`RegionServer` 故障排查：先看 `ZK`/`HMaster`/进程/日志定位，再按“宕机（`HMaster` 自动接管 `Region`、`WAL` 重放）→ 慢（`GC`/热点/`Region` 分裂）→ 数据（`HFile`/`WAL` 损坏）”处理。核心：“宕机靠 `HMaster`+`WAL` 自愈，慢/异常查 GC/热点/磁盘/分裂”。**
    - **第一步：定位故障类型**
        - `HMaster UI`/`hbase shell` 看 `RegionServer` 状态；`ZK` 看 `RegionServer` 是否失联（心跳）
        - 现象分类：宕机（失联/`Master` 重分配 `Region`）、慢（`Region` 在但响应慢）、单 `Region` 异常、`HFile`/数据损坏

    - **第二步：宕机排查（数据不丢）**
        - `RegionServer` 挂 → `HMaster` 检测（`ZK` 心跳）→ 把其 `Region` 重新分配到其他 `RegionServer` → 从 **`WAL`**（该机器 `HDFS` 上的日志）**重放**恢复未刷写数据
        - 检查：`HMaster` 日志（`RegionServer` 失联/`Region` 重新上线）、`Region` 是否恢复、网络/磁盘/`GC`（为何挂）
        - **重点**：`RegionServer` 宕机不丢数据（`WAL`+副本），但恢复期间 `Region` 短暂不可用

    - **第三步：慢/异常排查**
        - **`GC` 停顿**：`RegionServer` 大 `GC`（`Full GC`）卡住——调 `JVM` GC 参数/`MemStore`/`BlockCache`（`MSLAB`/`off-heap` 优化）、`GC` 日志分析
        - **热点**：`RowKey` 设计不当（单一 `RowKey` 集中某 `RegionServer`）——加盐/前缀分散
        - **`Region` 分裂/合并**过多：频繁 `split`/`compaction` 占资源——调分裂/合并策略
        - **磁盘/`HDFS`**：`HFile` 读写慢（磁盘满/`HDFS` 节点异常）、`StoreFile` 过多

    - **第四步：极端数据损坏**
        - `HFile` 损坏/`WAL` 异常 → `HBase 2.x` 用 `HBCK2`（`hbck2`，一致性检查/修复；1.x 用 `hbase hbck`）、`hbase hfile`（查看/校验 `HFile`）、必要时从副本/快照恢复
        - **数据恢复**：`Snapshot`（表快照）恢复某表

- **协助记忆**
    - 口诀：“`RegionServer` 挂了 `HMaster` 接管 + `WAL` 重放（不丢数据）；慢/异常查 `GC`/热点/分裂/磁盘——先宕机自愈、再性能排查”。

- **进阶思考**
    - **`RegionServer` 宕机数据会丢吗（为什么）？**
        - 不丢。写数据先落 `WAL`（`HDFS` 持久化）+ `MemStore`；宕机时 `MemStore` 数据虽在内存，但 `WAL` 已记录，`HMaster` 重分配 `Region` 后从 `WAL` 重放回放——数据恢复。这是 `HBase` 可靠性的关键（写必日志）。
    - **一个 `RegionServer` 挂了会影响多少数据？**
        - 影响它管理的那几个 `Region`（短暂不可用，`Master` 重分配期间）；其他 `RegionServer` 不受影响——`Region` 是数据分布单位，故障影响面=该 `RegionServer` 的 `Region`。`Region` 分布均衡（`Master` 平衡）让故障影响局部化。

- **扩展信息**
    - **相关命令**：`hbase shell`（`status`/`regioninfo`）、`HMaster UI`(16010)、`hbase hbck`、`snapshot`（快照）、`RegionSplit`/`MajorCompact`
    - **优化**：`GC` 调参（`HBASE_REGIONSERVER_OPTS`）、`MSLAB`/`off-heap BlockCache`、`RowKey` 加盐、隔离（`RegionServer` 不同 `HDFS`）
## 🤔 ZooKeeper 在大数据体系中的作用是什么？ 
- **`ZooKeeper` 是大数据体系的分布式协调服务：提供一致性、选主、配置、命名、状态同步——`HDFS HA`（`ZKFC` 选主）、`HBase`（`HMaster` 选主/`meta` 路由）、`YARN`（`RM` HA）、`Kafka`（控制器选主）都依赖它。核心：“`ZK` 做选主/状态存储/命名/协调，是大数据组件高可用的『脑』”。**
    - **核心能力**
        - **选主（分布式锁/Leader 选举）**：`HA` 组件（`NameNode`/`HMaster`/`ResourceManager`）经 `ZK` 用**临时节点 + 序号**选主，主挂自动切换
        - **配置/状态存储**：存集群配置/状态（`HBase meta` 位置、`Kafka` 分区状态、`ZKFC` 状态），数据节点（`znode`）持久化
        - **命名/服务注册**：组件注册（`Register`）、发现（`ZK` 谁在哪），客户端经 `ZK` 定位服务
        - **协调/同步**：分布式同步、锁、`Barrier`（协同多节点）

    - **在大数据组件中的具体作用**
        - **`HDFS HA`**：`ZKFC` 经 `ZK` 监控 `NameNode` 心跳、维护 `Active` 锁（选主），自动故障切换
        - **`HBase`**：`HMaster` 选主（`HA`）、`RegionServer` 注册、`hbase:meta` 表位置（客户端路由）、分布式 `SplitLog` 协调
        - **`YARN`**：`ResourceManager` `HA`（`ZK` 选主 + 状态存储）
        - **`Kafka`（经典 `ZK` 版，`3.x` 起已迁移 `KRaft`、`4.0` 完全移除 `ZK`）**：`Controller` 选主（分区 leader 变更）、元数据（`broker`/`topic`）
        - **`Flume`/`Storm`**：配置/状态协调（`Flume` `ZK` 做负载/高可用）

    - **数据模型**
        - 树状节点（`znode`）：持久/临时（`ephemeral`，会话结束自动删）/顺序（`sequential`）——选主靠临时+顺序节点
        - 监听（`watch`）：节点变更通知（`Watcher`）——组件实时感知状态变化

    - **部署建议**
        - 奇数节点（3/5/7），过半 `Quorum`——少数派不能选主/写；部署在独立机器（不与 `HDFS`/`HBase` 同机抢资源）

- **协助记忆**
    - 口诀：“`ZK` 做协调：选主（HA）、存状态（`meta`/配置）、命名注册、`watch` 通知——`HDFS`/`HBase`/`YARN`/`Kafka` 的高可用靠它”。

- **进阶思考**
    - **为什么大数据 HA 都依赖 `ZooKeeper`（它这么重要）？**
        - 这些组件需要**一主多备 + 自动切换**：主挂要让备顶上，且不能“脑裂”（双主）。`ZK` 用**临时节点 + 多数派 + `watch`** 提供强一致的选主/锁——组件把“谁是主/状态在哪”交给 `ZK` 统一仲裁，就能实现可靠 HA。
    - **`ZK` 的 `Quorum` 为什么必须奇数？**
        - 选主/写入需**多数派确认**（`quorum = n/2+1`）：奇数节点（3/5/7）能以最少节点获得最大容错——3 挂 1、5 挂 2（偶数 4 挂 1 与 3 相同，浪费一台且不增容错）。所以 `ZK` 集群用奇数。

- **扩展信息**
    - **运维**：`zkServer.sh status`（看 `follower`/`leader`）、`zkCli.sh`（查节点/`stat`）、`4lw`（`ruok`/`stat` 四字命令）、`zoo.cfg`（`server.x` 对称）
    - **高可用依赖**：凡是 `HA`（`HDFS`/`HBase`/`YARN`/`Kafka`）都离不开 `ZK`——`ZK` 本身挂是严重故障（先抓 `ZK` 再抓上层组件）
## 🤔 你们的数据是如何进入 Hadoop 的？数据采集方案？ 
- **进入 `Hadoop` 的数据采集按来源分：①日志采集（`Flume`/`Kafka` 收业务/服务器日志）②数据库同步（`Sqoop`/`DataX`/`Canal` 整库或增量）③消息实时（`Kafka` 流进 `HDFS`/`HBase`）④文件/接口（`HDFS` 上传、`FTP`/`API`）。核心：“日志走 `Flume`+`Kafka`、库走 `Sqoop`/`Canal` 增量、实时走 `Kafka` 管道，落地 `HDFS`/`Hive`”。**
    - **日志采集（最常见）**
        - **`Flume`**：多级采集（`source` 收日志 → `channel` 缓冲 → `sink` 写 `HDFS`/`Kafka`），`Agent` 分布各服务器
        - **`Logstash`/`Filebeat`**：`ELK` 生态（日志采集 + 解析），适合日志检索
        - 架构：应用日志 → `Flume Agent`（采集）→ `Kafka`（缓冲）→ `HDFS`（落地）/`Spark` 实时

    - **数据库同步（结构化数据）**
        - **`Sqoop`**：`Hadoop` 与关系库（`MySQL`/`Oracle`）批量导入导出（全量/增量 `--incremental`）——已进入低维护/事实弃用（末版 `1.4.7`），现多被 `Flink CDC`/`SeaTunnel`/`DataX` 取代，仅作存量/备选
        - **`Canal`**：伪装 `MySQL` `slave` 读 `binlog` 增量（实时同步到 `Kafka`/`HDFS`）
        - **`DataX`**：阿里开源，多源到多目标（`MySQL`→`HDFS`/`HBase`）通用同步

    - **实时/消息流**
        - **`Kafka`**：日志/`binlog`/点击流先入 `Kafka`（缓冲削峰），消费端落 `HDFS` 或 `Spark`/`Flink` 实时计算
        - `Kafka Connect`/`flume-kafka`、`Spark Structured Streaming`/`Flink` 消费 `Kafka` 写 `HDFS`/`Hive`

    - **文件/接口**
        - `HDFS` CLI（`hdfs dfs -put` 上传文件）/`WebHDFS`（HTTP `PUT`，`curl` 调 `REST`）、`FTP`/`API` 采集导入、`OSS`/`S3` 对象同步

    - **方案设计要点**
        - **缓冲削峰**（`Kafka`）、**批量/增量**（`Sqoop` 增量、`Flume` 批量）、**容错/重试**（采集失败重试、`Kafka` 重放）、**延迟控制**（数据新鲜度：离线 `T+1`、实时秒级）
        - 数据入 `Hive`/`HDFS` 分区（按天/小时），便于查询裁剪

- **协助记忆**
    - 口诀：“日志 `Flume`+`Kafka`、库 `Sqoop` 增量/`Canal` 实时、流 `Kafka` 管道落 `HDFS`/`Hive`——缓冲+批量+分区，离线在线分层”。

- **进阶思考**
    - **`Kafka` 在数据接入里起了什么作用（为什么都要它）？**
        - 缓冲削峰（高并发写入不压垮下游）、持久化可重放（数据丢了能回溯）、解耦（采集与消费独立扩展）、多消费（一份数据给实时/离线多路）。几乎所有实时链路都把它当“中转枢纽”。
    - **离线（T+1）和实时（秒级）怎么一起做？**
        - 同一份 `Kafka` 数据，一路消费写 `HDFS`/`Hive` 分区表（离线批处理 `T+1`），一路 `Flink`/`Spark Streaming` 实时计算（秒级）——**批流分离，一源多吃**。数据先统一进 `Kafka`，再分发给离线/实时两条链。

- **扩展信息**
    - **工具**：`Flume`/`Filebeat`/`Logstash`（日志）、`Sqoop`/`DataX`/`Canal`（库）、`Kafka`（消息）、`WebHDFS`/`HDFS` CLI（文件）
    - **数仓接入**：`ODS 层`（原始数据入库）→ 清洗进 `DWD`；`Hive`/`Spark SQL` 做 `ETL`
## 🤔 大数据集群如何做存储容量规划？副本、存储增长率考量？ 
- **`Hadoop` 存储容量规划：可用容量 = 裸容量 ×（1/副本数），并预留 20-30% 缓冲防满，按存储增长率（每日新增 × 保留周期）估算需求。核心：“裸容量除副本数,留 20-30% 缓冲,按日增长×保留期预测,`HDFS` 别到 `full`”。**
    - **容量估算公式**
        - **裸容量**：所有 `DataNode` 磁盘总和（如 30×16T=480T）
        - **副本损失**：默认副本 3 → 可用 = 裸容量/3（约 160T）；副本 2 →/2（更省但容错弱）
        - **需考虑元数据/临时文件**：`HDFS` 临时、`File` 移动、`replication` 平衡——实际可用再打折
        - **预留缓冲**：留 20-30%（防冲到 `full` 拒写、临时峰值、`block` 不均衡、数据倾斜——某节点满）

    - **存储增长率考量（关键）**
        - **日增量**：每日新增数据量（`GB`/`TB`）——日志/业务增长、采集频率
        - **保留周期**：数据保存天数（`HDFS` 保留 N 天，过期清理）——`T+1` 数仓保留、原始/中间/结果层保留不同
        - **年化增长**：按 `月均增长 × 12` 规划 1-2 年扩容节奏
        - **公式**：`需要容量 = 日增量 × 保留天数 × 副本系数 / 可用率`（留 30% 缓冲则 `/0.7`，留 20% 则 `/0.8`——二选一写明）

    - **数据分层与冷热**
        - 原始层（`ODS`）量大短期留、中间层（`DWD`/`DWS`）保留、结果层（`ADS`）小长期留——不同层不同副本/保留
        - 冷数据降副本（`replication=2`）/迁移（到低成本存储）、`HDFS` 生命周期（`Trash`/删除策略）

    - **容量监控**
        - `hdfs dfsadmin -report`（容量/`DataNode` 使用率）、`HDFS` 使用率告警——80% 是**运维告警阈值**（非 `HDFS` 内置限制，真正拒写在 `DataNode` 磁盘近满触及 `dfs.datanode.du.reserved` 预留区）
        - 关注**单节点倾斜**（某 `DataNode` 满，`balancer` 均衡）、**`block` 冗余**

- **协助记忆**
    - 口诀：“可用 = 裸容量/副本数，留 20-30% 缓冲；按‘日增量 × 保留天数 × 副本 / 0.7’估算，数据分层/冷热降副本”。

- **进阶思考**
    - **副本 3 是不是浪费（能不能降）？**
        - 副本 3 保高可用（容 2 副本挂不丢）；成本敏感可：核心/热数据副本 3、冷/可重建数据副本 2（`replication` 调低）或 `EC`（纠删码，用较少冗余换容量）。权衡容错与成本。
    - **存储满了（`HDFS` 快满）怎么应急？**
        - ①清理过期/临时数据（`Trash`/生命周期）②降冷数据副本 ③扩容（加 `DataNode`）④`balancer` 均衡倾斜节点（防单点满）⑤检查数据倾斜/`block` 冗余。别等 `full`（拒写阻断业务），提前 80% 告警。

- **扩展信息**
    - **相关参数**：`dfs.replication`（副本）、`dfs.datanode.du.reserved`（预留）、`dfs.blocksize`（块大小影响元数据量）、`trash` 配置
    - **监控**：`hdfs dfsadmin -report`、`Capacity` 指标、`Ambari`/`Prometheus`（`HDFS` 容量/使用率告警）
## 🤔 Ambari 都监控哪些指标？ 
- **`Ambari`（`Hadoop` 集群管理面板）监控分——注：`Ambari` 已进入维护期、被 `CDP`/`Cloudera Manager` 取代（指标底层 HDP 2.x 用 `Ganglia`/`Nagios`，2.4+ 用 `AMS`）：集群健康（`HDFS`/`YARN`/`HBase`/`ZK` 组件状态、`NameNode`/`ResourceManager` 状态）、资源（集群 CPU/内存/磁盘/网络）、服务级（`DFS` 容量/`DataNode` 块、`YARN` 队列、`HBase` `Region`）、主机（`DataNode`/`NodeManager` 版本、磁盘/负载）。核心：“`Ambari` 看集群服务健康 + 主节点状态 + 主机资源，告警驱动运维”。**
    - **集群/服务健康（重点）**
        - 服务状态（`HDFS`/`YARN`/`HBase`/`Hive`/`ZK`/`MapReduce` 是否 `STARTED`/`INSTALLED`/异常）
        - 主节点 `NameNode`/`ResourceManager`/`HMaster` 健康（`Active`/`Standby`、`fsimage`/`editlog` 状态）
        - `HDFS` 状态：`dfsadmin report`（`Live/Dead` `DataNode`、容量、`under replication` 副本不足）、`NameNode` 内存/元数据

    - **资源指标（主机/集群）**
        - **CPU** 使用率/负载、**内存**（used/`swap`）、**磁盘**（使用率/`IO`）——主机级 `DataNode`/`NodeManager`
        - **网络**（带宽）、`I/O`（磁盘吞吐）

    - **`YARN` 指标**
        - 集群资源（`Vcores`/内存总量/已用）、队列（`Capacity`/`Fair` 队列使用率、`pending`/`running`）、作业（`Application` 运行/失败/`Killed`）
        - `NodeManager` 健康、`Container` 使用

    - **`HBase`/`Hive` 指标**
        - `HBase`：`RegionServer` 状态/`Region` 数、`MemStore`/`BlockCache`/`compaction`、`HMaster` 状态
        - `Hive`：`Metastore` 状态、`HiveServer2` 会话/`HQL` 执行

    - **告警与运维**
        - `Ambari` 内置告警（服务 down、磁盘满、`NameNode` 切换、`ZK` 节点失联），可配阈值/通知（邮件/`webhook`）
        - 配合指标（`Grafana`/`Prometheus`）做趋势/容量预警；告警分级（`CRITICAL`/`MAJOR`/`MINOR`）

- **协助记忆**
    - 口诀：“`Ambari` 看服务健康（`HDFS`/`YARN`/`HBase`/`ZK`）+ 主节点（`NN`/`RM`）+ 资源（CPU/内存/磁盘）+ 队列/`Region`——告警分级驱动运维”。

- **进阶思考**
    - **`Ambari` 和 `Cloudera Manager`/`Prometheus` 分工？**
        - `Ambari`/`CM`：集群**管理 + 服务健康**（部署/配置/服务状态/告警）——运营层面；`Prometheus`+`Grafana`：**细粒度指标**采集展示（`YARN`/`HDFS`/`Node` 性能曲线）——监控层面。常组合：`Ambari`/`CM` 管集群、`Prometheus` 看指标趋势。
    - **`Ambari` 监控到 `NameNode` 切到 `Standby` 意味着什么？**
        - `NameNode` 故障切换（`HA` 触发）——可能主节点故障/失联/`ZKFC` 判定，要查原 `Active` 为何挂（内存/磁盘/`GC`/网络），并确认新 `Active` 接管正常。这是 `HDFS` 高可用关键告警。

- **扩展信息**
    - **相关**：`Ambari` 指标可在 `Grafana` 展示（`Ambari Metrices`）、`Cloudera Manager`（`CDH` 版）、`Prometheus` + `node_exporter`
    - **运维建议**：`Ambari` 告警（服务/主机状态）+ `Prometheus` 指标（趋势/容量）+ 日志（`HDFS`/`YARN` 日志分析）三层监控
## 🤔 简述 HDFS 读写完整流程？ 
- **`HDFS` 读写完整流程（客户端）：读先向 `NameNode` 查块位置，就近从 `DataNode` 并行读；写向 `NN` 申请块，客户端直连 `DataNode` 管线式写副本（数据不经过 `NN`）。核心：“读走 `NN` 查位置 + 直连 `DN` 并行读；写 `NN` 分配 + `DN` 管线写副本”。**
    - **读取流程**
        - ①客户端 `open('/file')` → 向 `NameNode` 请求（`getBlockLocations`）②`NN` 返回文件各 `Block` 的位置（`DataNode` 列表，含副本）③客户端**就近选择 `DataNode`**（网络近者优先）④直连 `DataNode` 读取 `Block` 数据（数据流不经 `NN`）⑤多个 `Block` 并行/顺序读，`DFSInputStream` 聚合 ⑥读完关闭；某 `DN` 故障自动切换到其他副本（`read retry`）

    - **写入流程**
        - ①客户端 `create('/file')` 向 `NN` 创建命名空间元数据（校验权限/目录）②写时经 `addBlock` 向 `NN` **逐个申请 `Block`**，`NN` 返回 `DataNode` 列表（按机架感知选 3 个写目标）③客户端与第一个 `DN` 建立**管线（pipeline）**，`packet` 分包写数据 → `DN1` → `DN2` → `DN3`（逐副本流水线传输、`ack` 按包回传）④一个 `Block` 写完再申请下一 `Block` ⑤全部写完，客户端调 `NN` 关闭（`close`），`NN` 提交（文件可见）
        - 特点：数据流经管线各 `DN`（副本），不经过 `NN`；`DN` 写失败自动换/调整副本

    - **关键细节**
        - **`NameNode` 只做元数据/调度**（不传数据），数据路径客户端↔`DataNode`——`NN` 轻、吞吐高
        - **副本管线写**：`DN` 间透明传输（`DN1` 从客户端收再转 `DN2`...），`DFSOutputStream` 管理 `packet`/`ack`
        - **副本策略（写时选 `DN`）**：机架感知（`replica` 分布不同机架）、就近、`HDFS` 写副本的默认放置策略

- **协助记忆**
    - 口诀：“读：`NN` 问位置、就近 `DN` 并行读（`DN` 挂换副本）；写：`NN` 分配 `DN`、`DN` 管线写 3 副本——元数据走 `NN`、数据走 `DN`”。

- **进阶思考**
    - **为什么读要并行读多个块？**
        - 大文件切成多个 `Block`（128M）分布在多个 `DataNode`，客户端 `DFSInputStream` 对多个块**并行读取**——多个 `DN` 同时供数据，读吞吐成倍提升（带宽叠加）。这就是 `HDFS` 高吞吐的关键之一。
    - **写文件时某 `DataNode` 挂了怎么办？**
        - 管线中断：客户端检测到写失败，`NN` 重新分配副本（`pipeline` 更新），副本不足先降级写（`short-circuit`），其余副本继续；恢复后补齐副本（`replication`）。写不丢（副本容错），但性能/进度受影响。

- **扩展信息**
    - **命令**：`hdfs dfs -put`（写）、`-cat`/`-get`（读）、`-ls`（列表）、`hdfs fsck`（块检查）、`dfsadmin -safemode`（安全模式）
    - **性能**：读写缓冲、`block` 大小、`DataNode` 数量/网络、副本数影响（多/快但占用大）
## 🤔 HDFS 文件上传、下载、删除和修改的底层机制？ 
- **`HDFS` 操作底层机制：上传=管线写块副本；下载=按块并行读；删除=移 `Trash`（可恢复）+ 延迟删块；修改（写）：`HDFS` 不支持随机修改（追加 `append` 有限支持、改内容需重写文件），元数据被 `NN` 记录、数据分布 `DN`。核心：“上传写块、下载读块、删除进 `Trash`、`HDFS` 只追加不随机改”。**
    - **上传（写）底层**
        - `hdfs dfs -put` → 客户端向 `NN` 申请块 → `DN` 管线写副本（如前述）——数据切块、副本分布 `DN`、元数据 `NN` 记录
        - 写时流式（`DFSOutputStream`，`packet` 分包/`ack` 确认），块满申请新块

    - **下载（读）底层**
        - `hdfs dfs -get`/`cat` → `NN` 查块位置 → 客户端就近并行读 `DN`（多块并行、`DFSInputStream` 聚合）→ 合并成完整文件

    - **删除底层**
        - `hdfs dfs -rm` → 文件移入 **`Trash`（回收站）** 可恢复（`-rm` 先删到 `Trash`）——注意 `fs.trash.interval` **默认 0=禁用 `Trash`**，需显式配置开启（企业发行版常默认启用）
        - `Trash` 过期后真正删除：`NN` 更新元数据（删除文件/块映射），块被标记删除，`DataNode` 后台实际删除块（`block` 删除由 `DN` 异步执行）
        - `-rm -skipTrash`（跳过 `Trash` 直接删）；回收站防误删

    - **修改底层（关键：`HDFS` 不支持随机写）**
        - `HDFS` 语义“一次写、多次读”——**不支持随机覆盖/修改文件中间内容**（`hdfs` 无 `random write`）
        - 支持的修改：**追加（`append`，`-appendToFile` 尾部追加新数据，`dfs.support.append` 控制、`Hadoop 2.x` 默认 `true`）**、重命名（`mv` 元数据变更）、改副本数（`setrep` **只动元数据、触发副本调度，不碰内容**）、改权限（`chmod`）
        - 所以要改文件内容 → 重写（`overwrite` 新文件覆盖）或 `append`；这是 `HDFS` 与普通文件系统最大差异

- **协助记忆**
    - 口诀：“上传管线写块、下载并行读块、删除进 `Trash` 可恢复；`HDFS` 只追加不随机改——改内容=重写/`append`”。

- **进阶思考**
    - **为什么 `HDFS` 不支持随机修改（设计取舍）？**
        - 为高吞吐/海量而设计：随机写要定位/维护块内偏移（复杂、冲突）；而“一次写多次读”适合批处理（`MapReduce`/`Hive`）场景，避免并发写一致性难题。追加/重写已够离线大数据（数据不可变、追加日志类）。
    - **删除文件为什么进 `Trash` 而不是马上删？**
        - 防误删（运维/批处理脚本删错能恢复）；`Trash` 过期（可配置天数）后才真正删块，给用户“后悔药”。违反保留期的紧急删除可用 `-skipTrash`（谨慎）。

- **扩展信息**
    - **相关命令**：`-put`/`-get`/`-rm`/`-appendToFile`/`-mv`/`-chmod`/`-setrep`、`fs.trash.interval`/`fs.trash.checkpoint.interval`（回收站配置）
    - **`Trash` 配置**：`core-site.xml` 的 `fs.trash.interval`（分钟，0=禁用）、`fs.trash.checkpoint.interval`（清理检查周期）
## 🤔 HDFS DataNode 坏块产生原因有哪些？如何修复？ 
- **`DataNode` 坏块原因：磁盘物理损坏/坏道、`DataNode` 异常宕机/进程崩溃、读写中断（网络/校验失败导致 `CRC` 校验不过）、`HDFS` 块校验（`checksum`）不一致。修复：`HDFS` 自动——检测到坏块 → 从健康副本复制补齐（`replication` 纠错）；配合 `hdfs fsck` 检查、`DataNode` 报 `bad` 块让 `NN` 标记、必要时换盘/重新复制。核心：“坏块 `HDFS` 自动用副本自愈，`fsck` 检查 + 换盘兜底”。**
    - **产生坏块的原因**
        - **磁盘故障**：物理坏道/扇区损坏/磁盘彻底损坏（`bad blocks`）
        - **`DataNode` 宕机**：进程崩溃/`JVM` 异常——结果是其块**副本缺失/`under-replicated`**（非“坏块 `corrupt block`”，`NN` 调度副本补齐）
        - **校验失败**：读写时 `CRC32` 校验不一致（数据损坏/传输错误，`checksum` 不一致是损坏的**表现**而非成因）——`DataNode` 读取验 `checksum`
        - **网络/写入中断**：写 `block` 时网络故障/写入不完整（部分写），块被视为坏
        - **低版本/配置**：`DataNode` 重启、`block` 与 `NN` 记录不一致

    - **`HDFS` 自动修复机制（副本容错）**
        - ①`DataNode` 定期向 `NN` 报告块（`block report`），`NN` 对比副本数（`expected replication`）——副本不足则调度补充
        - ②某 `DataNode` 校验失败/坏块 → 上报 `NN` → `NN` 标记该 `block` 副本损坏 → 其他健康`block` 副本补上（`replicate`），坏副本被替换
        - ③`DataNode` 宕机 → `NN` 判 `dead` → 其块副本在健康节点复制补齐（`under replication` 修复）
        - **结果**：只要副本 ≥1 健康，`HDFS` 自动复制补齐，数据不丢（副本 3 容 2 坏）

    - **人工排查/修复**
        - **`hdfs fsck / -files -blocks`**：检查文件/块完整性（坏块/缺失副本/`under replicated`）
        - `hdfs fsck / -files -blocks -racks`（块分布）、`-list-corruptfileblocks`（列损坏块）
        - `hdfs dfsadmin -report`：看 `DataNode` 健康/坏盘、`hdfs dfsadmin -safemode`（安全模式排查）
        - **坏盘/坏块处理**：坏 `DataNode` 磁盘 → 换盘（`datanode` 下线、新盘）或 `hdfs` 移除该数据节点（`decommission`）
        - `DataNode` 重启恢复（临时故障）、`fsck` 修复（`-replicate`/`-delete` 可选项）

- **协助记忆**
    - 口诀：“坏块多因磁盘坏/宕机/校验失败——`HDFS` 靠副本自动自愈（`fsck` 检查、`NN` 补副本）；人工换盘/下线坏节点”。

- **进阶思考**
    - **为什么 `HDFS` 有副本，坏块数据还能恢复？**
        - 副本 3 分布在多个 `DataNode`，一个副本坏，其他健康副本在——`NN` 检测倒数（`replication` 不足 3）后，从健康副本复制补齐到健康节点，坏副本被剔除。只要不超容错上限（1-2 副本坏），数据不丢自动修复。
    - **发现坏块高频了（经常 fsck 有坏块）要警惕什么？**
        - 可能是**磁盘老化/大面积坏道**（硬件级别），或 `DataNode` 不稳定（内存/`JVM`/网络）、坏盘未换——需排查磁盘健康（`smartctl`）、`DataNode` 日志、`NN` 元数据一致性，及时换盘/下线。频繁坏块是硬件/稳定性的预警信号。

- **扩展信息**
    - **相关命令**：`hdfs fsck`（完整性）、`hdfs dfsadmin -report`（数据节点）、`hdfs dfsadmin -metasave`、`smartctl`（磁盘健康）
    - **预防**：磁盘监控（`SMART`/`RAID`）、`DataNode` 巡检、副本数合理、`DataNode` 日志（`datanode.log`）检查、备份
## 🤔 YARN 集群资源充足，但 MapReduce 任务调度很慢，如何排查？ 
- **资源充足但任务调度慢：先看 `YARN` 调度器（队列/DAG 依赖/资源隔离）→ 再看作业（`Map`/`Reduce` 数量、数据倾斜、`Shuffle` 量）→ 最后看 `NameNode`/网络/日志。常见：小文件多（`Map` 任务数爆炸）、数据倾斜（单 `Map` 拖尾）、`Reduce` 数不合理、队列/资源配额（`AM` 排队）、`InputSplit` 切片太大/小。核心：“任务多/倾斜/队列受限/切片问题——看 `JobHistory`/`RM UI` 定位”。**
    - **第一步：确认“慢”在哪一层**
        - `ResourceManager UI` 看作业状态（`Submitted`/`Running`）：是**排队**（资源没给/队列受限）还是**运行慢**（任务执行慢）
        - `YARN` 日志/`JobHistory`（`jobhistoryserver`）看作业 `Map`/`Reduce` 阶段耗时
        - 区分：调度慢（作业迟迟不跑/排队）vs 执行慢（跑了但单任务慢）——排查方向不同

    - **第二步：排查“调度/排队”**
        - **队列资源受限**：队列 `Capacity`/`Fair` 配额不够（`yarn queue -status` 看 `used/pending`），作业 `AM` 排队——调队列配额/优先级
        - **`AM` 启动限制**：`yarn.scheduler.maximum-am-resource-percent`（`AM` 资源占比上限，`AM` 启动慢多因它）；`yarn.scheduler.maximum-allocation-mb`/`-vcores` 约束所有容器（非 `AM` 专属）
        - **资源碎片/阻塞**：`Container` 请求但无足够连续资源（`YARN` 资源粒度/`NodeManager` 配置）、`max-am-resource-percent`
        - **`NodeManager` 资源**：节点 `vcores`/内存上限（`yarn.nodemanager.resource.memory-mb`/`cpu-vcores`）

    - **第三步：排查“作业执行慢”**
        - **小文件多**：大量小文件 → `Map` 任务数爆炸（`InputSplit` 每文件一个），调度/启动开销大——`CombineFileInputFormat`/`归档`（`Har`）/合并小文件
        - **数据倾斜**：某 `Key` 数据多 → 单个 `Map`/`Reduce` 处理慢（拖尾）——`combiner`/`采样`/自定义分区/加盐
        - **`Reduce`/`Map` 数量不当**：`Reduce` 数（`mapreduce.job.reduces`）过少 `Reduce` 慢、过多调度开销；块大小影响 `Map` 数
        - **`Shuffle` 量大**：`Reduce` 拉取 `Map` 输出多/慢——`Shuffle` 占网络/磁盘，`combiner` 减传输、`speculative` 推测执行
        - **`NameNode`/`HDFS` 瓶颈**：元数据/块读写慢（`NN` 内存/磁盘）、`DataNode` 磁盘 IO 慢

    - **第四步：看日志/工具**
        - `JobHistory`（`mapreduce` 作业耗时）、`RM`/`NM` 日志、`Map/Reduce` task 耗时（`Task` 进度）、`hdfs fsck`（块健康）
        - `YARN` `Web UI`（8088）看队列/`Container`/`AM`、`JobTracker`（旧）

- **协助记忆**
    - 口诀：“先看调度（排队？队列配额/`AM` 限制）再看执行（小文件/倾斜/`Reduce` 数/`Shuffle`）——队列限就调配额、任务多/斜就优化作业”。

- **进阶思考**
    - **小文件多为什么让调度变慢（不只任务多）？**
        - 每个小文件一个 `InputSplit` → 一个 `Map` 任务，任务数成千上万；`YARN` 调度各 `Map` 到 `Container`（启动 `JVM`、分配资源）开销巨大，且 `HDFS` 读小文件元数据次数多（`NameNode` 压力）——调度/启动开销淹没计算。治理：合并小文件/`SequenceFile`/`归档`/`CombineFileInputFormat`。
    - **数据倾斜怎么判定（常见算法）？**
        - `JobHistory` 看各 `Map`/`Reduce` 耗时（有个别 task 耗时远超平均→倾斜）；或 `Map` 输出 `Key` 分布（`Counter`/采样看某 `Key` 占比高）。处理：`combiner`（`Map` 端预聚合）、`随机加盐`（倾斜 `Key` 分桶）、`自定义分区`（`TotalOrderPartitioner`）。

- **扩展信息**
    - **参数**：`mapreduce.job.reduces`（`Reduce` 数）、`mapreduce.input.fileinputformat.split.minsize`（切片）、`yarn.scheduler.capacity.root.queues`（队列）、`yarn.nodemanager.resource.memory-mb`（节点资源）
    - **工具**：`YARN Web UI`、`JobHistory`、`Ganglia`/`Ambari`（资源曲线）、日志（`yarn logs -applicationId`）
## 🤔 Spark 作业发生 OOM 内存溢出，如何排查与调优？ 
- **`Spark` `OOM` 分两类：`Executor` 堆内存溢出（`Executor` OOM）与 `Driver` `OOM`。排查：先看是哪个阶段 OOM（`Map`/`Shuffle`/`Reduce`、`collect`）→ 再归因（数据倾斜、`Shuffle` 量大、缓存过多、分区小/聚合大、`collect` 到 `Driver` 大结果）→ 调优（`executor` 内存/并行度/`Shuffle` 分区/数据倾斜避让）。核心：“OOM多因聚合/Shuffle/cache/collect 放大内存——定位阶段、治倾斜、调资源与分区”。**
    - **第一步：定位 OOM 在哪**
        - `Spark UI`（`executor` 日志/`Accumulator`）看 `task`/`stage` 阶段；`OOM` 常在：`groupByKey`（无预聚、全量 `Shuffle` 到内存）、`aggregateByKey`（仅聚合中间值极大时）、`join`（大 `Shuffle`）、`collect`/`take` 到 `Driver`、`cache/persist` 大 `RDD`
        - 区分：`Executor OOM`（executor 堆不够）vs `Driver OOM`（collect/广播变量/Driver 侧聚合）

    - **第二步：归因**
        - **数据倾斜**：某 `Key` 数据巨多 → 单 `task` 处理超大（聚合/`Shuffle` 分区不均）——最常见
        - **`Shuffle` 分区数不足**：`spark.sql.shuffle.partitions`（`SQL`）/`defaultParallelism` 少 → 单 `task` 数据多、聚合内存大
        - **`cache/persist` 过度**：把大量/大 `RDD` 缓存，占满内存——缓存策略不当
        - **宽依赖/聚合**：`groupByKey`（全量 `Shuffle` 到内存）比 `reduceByKey`（预聚合）耗内存
        - **`collect` 大结果**：`collect()` 全量拉回 `Driver`（大数据量爆内存）
        - **单条记录大**：大字段（`String`/数组）堆积（`Row` 内存）

    - **第三步：调优（对症）**
        - **资源**：调 `spark.executor.memory`/`--executor-memory`、`spark.executor.cores`、`spark.driver.memory`（`Driver` OOM）、`spark.memory.offHeap.enabled`/`spark.memory.offHeap.size`（堆外内存，需开启才生效）
        - **数据倾斜治理**：预聚合（`reduceByKey`/`combineByKey` 替代 `groupByKey`）、`加盐`（倾斜 Key 加随机前缀分桶）、`广播小表`（`broadcast join` 替代大 `join`）、`重分区`（`repartition`/`coalesce` 均衡）
        - **`Shuffle` 分区**：`spark.sql.shuffle.partitions` 调大（并行度↑、单任务数据↓）、`spark.default.parallelism`
        - **`cache` 策略**：`persist` 用 `MEMORY_AND_DISK`（溢出到磁盘）、只缓存复用多次的小/中型 `RDD`、`unpersist` 释放
        - **避免 `collect`**：用 `show`/`take`/`write`（输出到存储）替代全量 `collect`；`foreach` 分区处理
        - **序列化**：`kryo` 序列化、`compress`，减少对象内存

    - **第四步：监控/日志**
        - `Spark UI`（`stage`/`task` 内存/`Shuffle` 量）、`executor` 日志（`OutOfMemory`/`GC`）、`event log`
        - `jstat`/`GC` 日志（`GC` 频繁/`Full GC` 说明内存紧）

- **协助记忆**
    - 口诀：“先定位阶段（聚合/`Shuffle`/`collect`/`cache`），再归因（倾斜/分区少/缓存多），对症：加资源、治倾斜（`reduceByKey`/加盐/广播）、调分区、慎 `collect`”。

- **进阶思考**
    - **`groupByKey` 为什么比 `reduceByKey` 更易 OOM？**
        - `groupByKey` 把每个 `Key` 的**所有值**原样 `Shuffle` 到内存（`Iterable`），无预聚合；`reduceByKey` 在 `Map` 端先**预聚合**（合并部分值）再 `Shuffle`，传输/内存少。大数据聚合用 `reduceByKey`/`combineByKey`（带预聚合），避免 `groupByKey`。
    - **`Shuffle` 分区不足为什么导致 OOM（而不是慢）？**
        - `Shuffle` 分区数决定每个 `Reduce` 分区处理的数据量——分区少，单 `reduce task` 数据量大、聚合进内存爆；分区多则单任务数据小（内存安全）但任务多。`spark.sql.shuffle.partitions` 设大（如 `200-2000`）防单分区过大，与数据量匹配。

- **扩展信息**
    - **参数**：`spark.executor.memory`/`cores`/`driver.memory`、`spark.sql.shuffle.partitions`、`spark.memory.fraction`（堆内份额）、`spark.serializer=KryoSerializer`、`spark.broadcast.blockSize`
    - **治理手段**：`reduceByKey`/`aggregateByKey`（预聚合）、`broadcast join`、`加盐`、`repartition`、`persist(MEMORY_AND_DISK)`、`AQE`（`Spark 3` 自适应）
## 🤔 Hive 查询慢，如何分步排查优化？ 
- **`Hive` 查询慢排查：先看执行计划（`EXPLAIN`）和是哪个阶段慢（`Map`/`Reduce`/`Join`/聚合）→ 再归因（全表扫/数据倾斜/`Reduce` 数不当/`Map` 任务少/无谓词下推）→ 对症（分区裁剪/列式存储/换 `Tez`/`Spark`/`Map Join`/`SMB Join`/调 `Reduce` 数）。核心：“`EXPLAIN` 定位 + 治全表扫/倾斜/Join，换引擎减 MR 开销”。**
    - **第一步：看执行计划/定位慢点**
        - `EXPLAIN <query>` 看执行计划（`Map`/`Reduce`/`Join` 阶段、数据流转）；`EXPLAIN EXTENDED` 看细节
        - 看各阶段耗时（`Tez`/`Spark` UI 或 `Hive` 日志）：是 `Map` 慢（扫/过滤）、`Shuffle`（倾斜）、`Reduce`（聚合）还是 `Join`
        - 看 `Hive UI`/`Azkaban`（作业耗时、`Map`/`Reduce` 数）

    - **第二步：定位常见瓶颈**
        - **全表扫**：缺分区条件/`WHERE` 未过滤分区列——主因是表未分区或查询没按分区列过滤（谓词下推默认开启、`ORC`/`Parquet` 自动生效，非“没启用”）；用分区裁剪少扫数据
        - **数据倾斜**：`Join`/`Group By` 某 `Key` 数据多（单 `Reduce` 慢）——`hive` 倾斜优化（`hive.optimize.skewjoin`/`GroupBy` `map端聚合`）
        - **`Reduce` 数不当**：`mapreduce.job.reduces` 太少（`Reduce` 慢）/太多（启动开销）；`hive.exec.reducers.bytes.per.reducer`（每 reducer 处理字节）
        - **`Map` 任务少**：大文件块大/`split size` 大 → `Map` 数少（单 `Map` 慢；`mapred.map.tasks` 只是上限提示不真增 `Map` 数）——调小 `mapred.max.split.size`/合并小文件
        - **`Join` 大表**：大表 `Join` 大表（`Shuffle` 慢）——`Map Join`（小表广播）/`bucketing join`/`SMB`
        - **无 `Map` 端聚合**：`Group By` 没开 `hive.map.aggr=true`（`Map` 端预聚合减 `Reduce` 压力）

    - **第三步：优化（对症）**
        - **分区裁剪/谓词下推**：表用分区（`partition`）+ 查询 `WHERE` 分区列——不扫无关分区；`ORC`/`Parquet` 列式（读所需列、谓词下推）
        - **列式+压缩**：`ORC`/`Parquet`（比 `TextFile` 快、省空间），`ZSTD`/`Snappy` 压缩
        - **换执行引擎**：`hive.execution.engine=tez`（`DAG`、内存，比 `MR` 快）或 `spark`——大幅提速
        - **`Join` 优化**：`Map Join`（`hive.auto.convert.join=true`，小表广播内存 `join`）、`Bucketing`+`SMB Join`、`sort-merge`
        - **聚合优化**：`hive.map.aggr=true`（`Map` 端预聚）、`hive.groupby.skewindata`（倾斜分摊）、`distinct` 优化
        - **小文件合并**：输入小文件多 → `CombineHiveInputFormat`/`merge`（减少 `Map` 数）；`Reduce` 数匹配
        - **其他**：分桶（`bucket`，join/抽样快）、`CBO`（`hive.cbo.enable=true` 统计驱动优化）、`limit`/`采样`（先小批看数据）

    - **第四步：数据侧**
        - 看数据是否倾斜（`group by` 的 `Key` 分布）、字段类型（`int vs string`）、`NULL` 处理（`null` 也会成为 `Key`，`hive` 倾斜优化）

- **协助记忆**
    - 口诀：“先 `EXPLAIN` 定位 → 治全表扫（分区/列式）、倾斜（`map` 聚合/`skewjoin`）、`Reduce` 数、`Join`（`map join`/`bucket`）——换 `Tez`/`Spark` 提效大头”。

- **进阶思考**
    - **为什么换 `Tez`/`Spark` 引擎能大幅提速（核心）？**
        - `MapReduce` 每阶段**落磁盘**（`HDFS`），多阶段就多次磁盘 `IO` + 作业启动开销；`Tez` 用 `DAG`（`Map`-`Map`-`Reduce` 链式，中间不强制落盘、`AM` 调度），`Spark` 内存计算——减少磁盘往返，大数据量下快数倍。引擎是 `Hive` 提速最快一招。
    - **数据倾斜在 `Hive` 里最典型的表现与处理？**
        - 表现：`Group By`/`Join` 阶段**单个 `Reduce`/`Task` 卡很久**，其他 `Reduce` 早结束——某 `Key` 数据量远大于平均。处理：`Map` 端预聚（`map.aggr`）、`skewindata`（两阶段倾斜分摊）、`skewjoin`（倾斜 Key 单独处理）、`加盐`/`广播小表`。

- **扩展信息**
    - **参数**：`hive.execution.engine`（`mr/tez/spark`）、`hive.map.aggr`、`hive.auto.convert.join`、`hive.optimize.skewjoin`、`mapreduce.job.reduces`、`hive.cbo.enable`
    - **工具**：`EXPLAIN`、`Tez/Spark UI`、`HiveServer2` 日志、`Azkaban`（调度作业耗时）、`Grafana`（集群资源）

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-%E5%A4%A7%E6%95%B0%E6%8D%AE%E8%BF%90%E7%BB%B4/  

