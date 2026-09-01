# 运维常见题-K8s容器（二）


## 🤔 Metrics Server 有什么作用？ 
- **`Metrics Server` 是 `K8s` 的轻量资源指标采集组件：采集每个节点/Pod 的CPU/内存使用量，暴露给 `K8s` 核心（供 `HPA` 自动扩缩、`kubectl top` 查看）。核心：“Metrics Server 给 K8s 提供 CPU/内存指标——HPA 靠它判断要不要扩、kubectl top 看用量”。**
    - **什么是 `Metrics Server`**
        - 集群级的**指标聚合器**（`metrics.k8s.io/v1beta1` API——`HPA`/`kubectl top` 实际用它；核心 API 定义在 `K8s 1.37` 已毕业到 `v1`，功能不变），采集**节点/Pod 的 `CPU`/`内存`**实时使用量（通过 `kubelet` 的 `Summary API` 采集）。
        - 是 `HPA`/`VPA`/`kubectl top` 的数据来源（它们是"用户"，`Metrics Server` 是"数据提供者"）。

    - **作用（关键）**
        - **① 给 `HPA` 提供指标**：`HPA`（自动扩缩）依赖 `Metrics Server` 的 `CPU`/`内存` 使用率判断**要不要扩缩**——没有它，`HPA` 无法自动扩缩（`CPU` 类指标）。
        - **② `kubectl top` 看资源**：`kubectl top node/pod` 查看节点/Pod 的实际 `CPU`/`内存` 使用——`Metrics Server` 提供数据。
        - **③ 可视化/告警**：`Grafana`/`Prometheus` 可接 `metrics.k8s.io` 看 `CPU`/`内存` 趋势（`Metrics Server` 是实时、短时指标）。

    - **`Metrics Server` 特点/局限**
        - **轻量**：只采 `CPU`/`内存`（不采磁盘/网络等完整指标——那是 `node_exporter`/`Prometheus` 的事）；**无长期留存**（只存内存、短时，`--metric-resolution` 是抓取采样间隔，二进制默认 `60s`、官方 `Helm` 覆盖为 `15s`、需 ≥10s）。
        - **性能**：聚合 `kubelet` 指标，集群规模大时用 `--kubelet-use-node-status-port` 等优化；`v0.6.1+` 支持多副本 `HA`（默认单副本，生产可多副本）。
        - **注意**：`Metrics Server` 只给**当前**资源用量（实时），**历史/长时序**指标需 `Prometheus`。

    - **一句话理解**
        - `Metrics Server` 像**大楼的水电表**——实时读出每户（`Pod`/节点）用了多少水电（`CPU`/内存）；`HPA`（自动化管家）看它决定"要不要给这家加房间（扩容）"，`kubectl top`（物业查表）用它看谁用得多。

- **协助记忆**
    - 口诀：“**Metrics Server 提供 CPU/内存指标——HPA 靠它扩缩、kubectl top 查用量、轻量短时，长时序用 Prometheus**”。
    - 一句话：“**Metrics Server 是 K8s 的资源水电表，HPA 看它扩缩**”。

- **进阶思考**
    - **没有 `Metrics Server`，`HPA` 还能用吗？**
        - `HPA` 的 **`CPU`/内存**指标**必须**有 `Metrics Server`（否则 `HPA` `CPU` 类无法工作，显示 `unable to get metrics`）；但 `HPA` 可用**自定义指标**（`custom.metrics.k8s.io`，走 `Prometheus Adapter`）或**外部指标**替代（不需要 `Metrics Server`）。所以用 `CPU` 扩缩必装 `Metrics Server`。
    - **`Metrics Server` 和 `Prometheus` 什么区别？**
        - `Metrics Server`：**轻量、实时、只 CPU/内存**（给 `HPA`/`top`，短时）；`Prometheus`：**完整、时序、多指标**（历史趋势/告警/长时序，`node_exporter`/自定义指标）——两者互补：`HPA` 快速扩缩用 `Metrics Server`，深度监控用 `Prometheus`。

- **扩展信息**
    - **组件**：`metrics-server` `Deployment`（`kubelet` 每节点采集）+ `APIService`（`metrics.k8s.io` 注册，`kube-apiserver` 转发）。
    - **命令**：`kubectl top node`（节点 CPU/内存）、`kubectl top pod`（Pod 用量）、`kubectl top pod --sort-by=cpu`。
    - **`Metrics Server` 版本**：`v0.7+`（对应 `K8s 1.27+`；`v0.7+` 支持 HA 多副本）；需 `kube-apiserver` 的 `--enable-aggregator-routing`（聚合器）。
    - **参考**：`kubectl get apiservice`（看 `metrics.k8s.io` 注册）、`kubectl get metrics`、`metrics-server` 日志。

## 🤔 简述 HPA 的工作原理？ 
- **`HPA`（`Horizontal Pod Autoscaler`）是水平自动扩缩器：根据资源指标（CPU/内存）或自定义指标，自动增减 `Pod` 副本数——指标高了扩（加副本）、低了缩（减副本），按业务负载自动伸缩。核心：“HPA 看指标 → 算需要几个副本 → 扩容/缩容 → 维持期望副本数”。**
    - **什么是 `HPA`**
        - 自动**水平**扩缩（加/减 `Pod` **副本数**，不是放大 `Pod` 资源——那是 `VPA` 垂直扩缩）；控制 `Deployment`/`StatefulSet` 的副本数。
        - 声明目标：`minReplicas`/`maxReplicas` + 目标利用率（如 `CPU 使用率 50%`）——`HPA` 自动维护。

    - **工作原理（循环控制）**
        - **①** `HPA` 控制器每**定期轮询**（默认 15s）`Metrics Server`（或自定义指标）拿**当前负载**（如当前 `Pod` 平均 `CPU`）。
        - **②** 计算所需副本数：`期望副本 = ceil(当前副本 × 当前利用率 / 目标利用率)`——如当前 `CPU 80%`、目标 `50%`、现在 `3` 个副本 → `ceil(3 × 0.8/0.5)` = `ceil(4.8)` = `5` 个。
        - **③** 若计算出的副本数 ≠ 当前 → **调用控制器**（`Deployment`/`ReplicaSet`）**扩/缩**副本（有冷却时间/稳定窗口防抖动，`--horizontal-pod-autoscaler` 参数）。
        - **④** 循环检查，指标回落 → 缩容（有 `scale-down` 稳定窗口防频繁缩）。

    - **指标来源（HPA 支持）**
        - **`metrics.k8s.io`（`Metrics Server`）**：`CPU`/`内存` 使用率（一类指标，最常用——`HPA` 默认）。
        - **`custom.metrics.k8s.io`（自定义指标）**：应用自定义指标（如请求数、`QPS`—— `Prometheus Adapter` 提供）。
        - **`external.metrics.k8s.io`（外部指标）**：外部系统指标（如 `Kafka` 积压/队列长度）。

    - **关键概念**
        - **目标利用率**：`targetCPUUtilizationPercentage`（如 `50%`= `Pod` `CPU` 用到 `50%` 触发扩缩）；`HPA` 默认**容忍 `10%` 偏差**（利用率在目标 ±10% 内不动作，防频繁扩缩）。
        - **稳定窗口**：`behavior.scaleUp/scaleDown.stabilizationWindowSeconds`（等指标稳定再动作，防频繁抖动）。
        - **`HPA` 计算**：取所有 `Pod` 的 `CPU` 平均利用率，对比目标——不是单个 `Pod` 超了就扩，是整体平均超目标才扩。

    - **一句话理解**
        - `HPA` 像**餐厅自动加桌**：前台看客流（`CPU` 指标），按“目标上座率 `50%`”→ 算“现在要几张桌（几个 `Pod`）”→ 人多了加桌（扩副本）、人少了撤桌（缩副本），始终维持“上座率接近目标”自动调配，不用店长操心。

- **协助记忆**
    - 口诀：“**HPA 看指标算副本——当前负载/目标比率，高了扩、低了缩，稳定窗口防抖动**”。
    - 一句话：“**HPA 按 CPU 目标自动加/减 Pod 副本，业务涨缩自动适配**”。

- **进阶思考**
    - **`HPA` 扩容慢/不生效常见原因？**
        - ①没装 `Metrics Server`（`CPU` 类指标拿不到，显示 `unable to get metrics`）②目标利用率设太低/太高（触发了但被稳定窗口抑制）③`Pod` 没设 `resources.requests`（`HPA` 按 `requests` 算，没设就按默认算不准）④指标采集延迟（`Metrics Server` 短时）⑤`HPA` 控制器没跑对（看 `kubectl describe hpa` 事件）。
    - **`HPA` 和 `VPA` 区别？**
        - `HPA`：**水平**扩缩（加/减**副本数**，多个 `Pod` 分摊）；`VPA`：**垂直**扩缩（调大**单个 `Pod` 的 `CPU`/内存** `requests`，一个 `Pod` 变大）——`HPA` 适合无状态可多副本（web/API），`VPA` 适合单大 Pod（数据库/需要大内存的）。生产常组合（`HPA` + `VPA` 或 `Cluster Autoscaler` 节点级）。

- **扩展信息**
    - **配置**：`kubectl autoscale deployment <name> --cpu-percent=50 --min=2 --max=10`（自动创建 `HPA`）或写 `HPA` YAML；`kubectl get hpa`（看状态/目标）。
    - **`HPA` 版本**：`autoscaling/v2`（支持多指标/自定义指标/`behavior`——`v2` 成熟，用 `v2`）。
    - **`Cluster Autoscaler`（节点级）**：`HPA` 管 `Pod` 副本，`Cluster Autoscaler` 管**节点**（`Pod` 多到节点不够时加节点）——`HPA` + `Cluster Autoscaler` 组合实现完整弹性。
    - **参考**：`kubectl get hpa`、`kubectl describe hpa`（看事件/计算）、`kubectl top pod`。

## 🤔 简述你对 Operator 的理解？ 
- **`Operator` 是把运维逻辑（部署、扩缩容、升级、故障处理、备份恢复）编码成 `K8s` 自动化程序——用自定义控制器（`Controller`）+ `CRD`（自定义资源）把"怎么运维某个系统"（如数据库集群、`Redis`、`Kafka`）固化成代码，让 `K8s` 自动执行。核心：“Operator = 把专家运维知识写成程序，K8s 自动管理复杂/有状态应用”。**
    - **为什么需要 `Operator`（解决的问题）**
        - 普通 `Deployment` 只能管"无状态副本"，复杂有状态应用（数据库集群/`Redis`/`Kafka`/`Prometheus`）需要**专业运维**（主从切换、扩缩、升级、备份、故障自愈）——这些`K8s` 内置控制器做不到。`Operator` 把这些**专家运维经验**写成控制器，自动执行。
        - **场景**：`Rook`（管理 `Ceph`）、`kube-prometheus`、`MySQL Operator`/`Redis Operator`（数据库）、`etcd Operator`——把有状态系统的运维自动化。

    - **`Operator` 的组成（两大件）**
        - **`CRD`（自定义资源）**：定义**用户能声明的资源**（如 `RedisCluster`/`MySQLCluster`）——用户写 `RedisCluster` 声明"我要 3 主 3 从"，`Operator` 按它去建。
        - **`Controller`（控制器）**：**监听** `CRD` 变化，把声明转成实际资源（`StatefulSet`/`PVC`/`Service`），并持续保证"实际 = 声明"（拓扑/故障自愈/升级）——是"运维机器人"。

    - **`Operator` 的运维能力**
        - **自动部署**：声明 `RedisCluster` → 自动建 `StatefulSet`/`PVC`/`Service`/配置。
        - **自动扩缩容**：按声明加/减节点（改变 `replicas`，`Operator` 调整 `StatefulSet`/数据重分布）。
        - **故障自愈**：节点挂了，`Operator` 检测并自动恢复/重建（如 `Redis` 主从切换、`Ceph` `OSD` 恢复）。
        - **升级/备份**：滚动升级（版本更新）、定时备份、快照——运维流程代码化。

    - **一句话理解**
        - 普通 `K8s` 控制器像"普通管家"（只管增减副本）；`Operator` 像"领域专家管家"（懂 `Redis`/数据库的**专业运维**——主从怎么切、集群怎么扩、挂了怎么救）——把专家的运维手册写成程序，`K8s` 自动照做，复杂应用不用人盯。

- **协助记忆**
    - `Operator` = "**把运维专家的活儿交给程序**"——用 `CRD`（声明要什么）+ `Controller`（自动去实现/修复）管理复杂有状态应用。
    - 口诀：“**Operator 管有状态——CRD 声明、Controller 实现、自动部署/扩缩/自愈/升级**”。

- **进阶思考**
    - **`Operator` 和普通的 `Deployment` + `ConfigMap` 区别？**
        - 普通 `Deployment` 只管"副本数量"（无状态）；`Operator` 理解**领域逻辑**（数据库主从/`Redis` 集群/拓扑、升级要停主从？、故障怎么切）——能把"需要专家判断的运维"自动化。`Deployment` 是"通用副本管理器"，`Operator` 是"特定系统的智能运维"。
    - **`Operator` 开发难吗（用啥框架）？**
        - 有一定门槛（写 `Controller` 逻辑）。框架：`Operator SDK`（`Go`，最主流）/`Kubebuilder`/`Operator Framework`（标准脚手架）——定义 `CRD` + `Controller` 循环；重要应用/`QA` 会帮你生成很多（`controller-runtime`）。

- **扩展信息**
    - **常见 `Operator`**：`Rook-Ceph`（存储）、`kube-prometheus`（监控）、`MySQL/Redis/Kafka Operator`（数据库/中间件）、`cert-manager`（证书）、`etcd Operator`。
    - **`Operator` 生态**：`Operator SDK`（`Red Hat`）、`Kubebuilder`、`OLM`（`Operator Lifecycle Manager`，`OperatorHub` 分发管理）。
    - **参考**：`kubectl get crd`（看自定义资源）、`kubectl get rediscluster`（看 `Operator` 管理的资源）、`kubectl logs <operator-pod>`。

## 🤔 节点处于 NotReady 状态如何解决？ 
- **节点 `NotReady` = `kubelet` 报节点不可用（`kubelet` 失联/镜像/磁盘/资源压力）。排查步骤：①看节点状态/事件（`describe node`）②查 `kubelet`（服务/日志）③查节点资源（磁盘/`kubelet` 卡）④网络/`CNI`/运行时。核心：“NotReady 多是 kubelet 失联——先看 kubelet 日志、再看磁盘/资源压力”。**
    - **先看节点状态/事件（`NotReady` 原因线索）**
        - `kubectl get nodes`（看 `NotReady`）、`kubectl describe node <node>`（看 `Conditions` 各状态：`Ready`/`MemoryPressure`/`DiskPressure`/`PIDPressure`——哪项 Falses 就是原因）。
        - `kubectl get node <node> -o jsonpath='{.status.conditions}'`（看条件详情）。

    - **查 `kubelet`（最常见原因）**
        - `systemctl status kubelet`（是否 running/failed）、`journalctl -u kubelet`（日志看报错：`docker/cri` 错误、证书、资源不足）。
        - `kubelet` 挂了/失联 → 节点 `NotReady`（`kubelet` 心跳超时）；`systemctl restart kubelet`、修配置/证书。

    - **查节点资源（磁盘压力）**
        - 磁盘满（`DiskPressure`，`kubelet` 无法拉镜像/写日志）→ `df -h`/清 `docker` 镜像/日志；`CPU`/内存压力（`MemoryPressure`）、`inode` 满。
        - `kubectl describe node` 的 `Conditions` 会显示 `DiskPressure=True` 等。

    - **查运行时/网络（`CNI`）**
        - 容器运行时（`containerd`/`docker`）异常 → `systemctl status containerd`；`CNI` 插件挂（Calico/Flannel）→ 节点网络异常。
        - `iptables`/网络插件 Pod 异常导致 `kubelet` 网络检查失败。

    - **其它**
        - 证书过期（`kubelet`/`kubelet` 认证失败）、`kube-controller-manager`/`apiserver` 问题（节点上报链路）、节点时间不同步、磁盘满载/`docker` 卡。

    - **一句话理解**
        - 节点 `NotReady` 像"**保安失踪了**"——`kubelet`（小区保安）不报到了，楼里（节点）看似基本正常但控制中心（`apiserver`）联系不上它；先找保安（查 `kubelet` 日志/服务），再看保安是不是"被杂物绊住了"（磁盘满/资源压力）或"电话坏了"（网络/证书）。

- **协助记忆**
    - 口诀：“**NotReady 查 kubelet（服务/日志）→ 资源（磁盘/内存 Pressure）→ 运行时/CNI → 证书/时间**”。
    - 一句话：“**NotReady 多半是 kubelet 失联——先查 kubelet，再看磁盘/资源压力**”。

- **进阶思考**
    - **`NotReady` 节点上的 `Pod` 会怎样？**
        - 节点 `NotReady` → 其上的 `Pod` 被判失败/驱逐（`NoExecute` 污点，`tolerationSeconds` 后驱逐），由控制器在健康节点**重建**；但若节点只是 `NotReady`（`kubelet` 短暂失联），`Pod` 先保留（等恢复），超时（`pod-eviction-timeout`，默认 5 分钟）才驱逐。
    - **怎么快速判断是 `kubelet` 挂还是网络压力？**
        - `kubectl get node` + `describe` 看 `Conditions`：`Kubelet stopped posting`/`Ready False` 事件 → `kubelet` 问题；`DiskPressure`/`MemoryPressure` → 资源压力（清磁盘/扩容）；网络插件 `Pod` 异常 → `CNI`。逐步对号。

- **扩展信息**
    - **常见 `Conditions`**：`Ready`（节点可用）、`MemoryPressure`/`DiskPressure`/`PIDPressure`（资源压力）、`NetworkUnavailable`（网络不可用）——`False` 即对应问题。
    - **命令**：`kubectl get nodes`、`kubectl describe node <node>`、`kubectl node-shell`（进节点）、`journalctl -u kubelet -n 100`（kubelet 日志）。
    - **参考**：`kubectl drain`（排空节点）、`kubectl cordon`（节点不可调度）、节点维护流程。

## 🤔 创建 1 万个 Pod 时，可能会遇到哪些问题？ 
- **一次性创建 1 万个 `Pod`（大批量调度）常见问题：①`API Server` 压力（大量对象/事件）②`etcd` 写入压力（大量状态变更）③调度器/控制器瓶颈（`kube-scheduler` 处理不过来）④镜像/网络/存储并发（大量拉镜像、分配 IP/卷）⑤`kubelet` 每节点压力（节点密度过大）⑥资源不足（节点 `CPU`/内存不够）。核心：“大批量建 Pod，集群各组件（apiserver/etcd/scheduler）都成瓶颈，要压测+分批”。**
    - **控制面瓶颈（`API Server`/`etcd`）**
        - **`API Server`**：1 万个 `Pod`（含状态/事件）→ `API Server` 请求/对象压力大（`kube-apiserver` `CPU`/内存高、限流）。
        - **`etcd`**：每个 `Pod`/状态写入 `etcd`，大量写入（快照/`watch` 变更）→ `etcd` 压力大、写入延迟↑——需 `etcd` 性能优化（`--quota`/`--auto-compaction` 等）。
        - **缓存/对象数**：`API Server` 内存里 `etcd` 对象缓存、`watch` 连接数暴增。

    - **调度/控制器瓶颈**
        - **`kube-scheduler`**：1 万个 `Pod` 要调度，调度器 `CPU`/排队（`--kube-api-qps`/`--kube-api-burst` 限流）、调度延迟↑——考虑**多 `scheduler` 副本 / `--leader-elect` / 提高吞吐**。
        - **控制器**（`Deployment`/`ReplicaSet`/`StatefulSet` controller）：大量 `Pod` 创建/`Pod` 状态处理也占控制器资源。

    - **节点/资源压力**
        - **节点密度**：每节点 `Pod` 数过多（`kubelet` 负担、`Pod` 密度上限默认 110/节点）——1 万 `Pod` 需更多节点（集群容量规划）。
        - **资源不足**：`Pod` 的 `requests` 总和超集群容量 → 大量 `Pending`（调度不足）；`DNS`（`CoreDNS`）解析量大。

    - **镜像/网络/存储并发**
        - **镜像拉取**：大量 `Pod` 用**同一镜像**（节点并发拉，网络/`registry` 压力）——用**预拉取/`kubelet` 缓存/P2P 分发**。
        - **网络 `IP` 分配**：`CNI`（`Calico`/`Flannel`）为 1 万 `Pod` 分配 `IP`（`IPAM` 压力、`IP` 池是否够）。
        - **存储卷**：挂 `PVC` 的 `Pod` 多 → 存储后端（`CSI`/`Ceph`）并发建卷压力。

    - **一句话理解**
        - 一次建 1 万 `Pod` 像"**同一时间招收 1 万员工入职**"——前台（`API Server`）办手续排队（限流）、人事库（`etcd`）狂写、分宿舍（调度）忙不过、食堂（镜像）供不上、每栋楼（节点）塞不下——**各环节都爆，要分批入职（分批建）+ 扩前台（调 `API Server`）+ 扩容仓库**。

- **协助记忆**
    - 口诀：“**1 万 Pod 各组件都瓶颈——apiserver/etcd 压力、scheduler 排队、节点密度、镜像/网络/存储并发、资源不足**”。
    - 一句话：“**大批量建 Pod 是集群压测——先分小批、看各组件是否吃得消、扩节点/调参**”。

- **进阶思考**
    - **怎么处理 1 万 `Pod`（最佳实践）？**
        - ①**分批创建**（`kubectl` 分批、`Helm` 分波次，别一次 1 万）②**调 `kube-apiserver`**（`--max-requests-inflight`/`--kube-api-qps` 适度调高）③**优化 `etcd`**（`--quota`、`--auto-compaction`、存储 `SSD`）④**资源预配**（`Pod` `requests` 合理、节点够、`Cluster Autoscaler`）⑤**镜像预热**（提前拉镜像/`P2P`）⑥**`IPAM`/存储容量**规划。
    - **`Pod` 密度上限（每节点多少个 Pod）？**
        - 默认每节点 `maxPods` 110（`kubelet` `--max-pods`）；`Pod` 多每节点 `kubelet`/`CNI` 负担大——大批量要么**加节点**要么**调高 `maxPods`**（看节点资源）。1 万 `Pod` 至少几十台节点（`110/节点`）。

- **扩展信息**
    - **调优参数**：`kube-apiserver` `--max-requests-inflight`/`--kube-api-qps`/`--kube-api-burst`、`etcd` `--quota-backend-bytes`/`--auto-compaction-retention`、`kube-scheduler` `--kube-api-qps`。
    - **`Pending` 排查**：1 万 `Pod` 大量 `Pending` → 查调度（`describe` `FailedScheduling`/`0/xx nodes`）、资源不足、`IPAM`/`PVC`。
    - **参考**：`kubectl get pods -o wide`（分布）、`kubectl get nodes`（密度）、`kubectl describe pod`（调度事件）。

## 🤔 微服务迁移 K8s 主要做哪些工作？会遇到哪些问题？ 
- **微服务迁 `K8s`：把应用容器化 + 按 K8s 模型改造 + 迁移数据/配置。主要工作：①Docker 化（应用打镜像）②资源定义（`Deployment`/`Service`/`Ingress`/`ConfigMap`/`Secret`/`PVC`）③依赖改造（配置外置/无状态化/存储）④灰度迁移（先非核心、逐步切流）⑤可观测（日志/监控）。问题：有状态/配置/网络/灰度切换/团队上云技能。核心：“迁 K8s = 容器化 + 声明式资源 + 状态/配置改造 + 灰度切流”。**
    - **主要工作（迁移步骤）**
        - **① 应用容器化**：把 `Spring Boot`/`Node`/`Go` 等应用打成 `Docker` 镜像（`Dockerfile`），规范构建（`multi-stage`、精简镜像）。
        - **② 定义 K8s 资源**：写 `Deployment`（副本/探针/资源）/`Service`（服务）/`ConfigMap`（配置）/`Secret`（密钥）/`Ingress`（入口）/`PVC`（存储）——声明式。
        - **③ 状态/配置外置**：配置从代码抽到 `ConfigMap`/环境变量；**有状态数据**用 `PVC`/`StatefulSet`；`Session`（会话）挪到 `Redis`（应用无状态化）。
        - **④ 网络/服务发现**：服务间调用走 K8s `Service`（`DNS`/`ClusterIP`），`Ingress` 做入口，改造内部调用（`localhost`→`service` 域名）。
        - **⑤ 灰度迁移**：先迁非核心/低流量服务，`Ingress`/`SLB` 逐步切流，验证 OK 再切核心——不一次全迁。
        - **⑥ 可观测**：日志（`ELK`/`Loki`）、监控（`Prometheus`/`Grafana`）、链路（`Jaeger`）——迁移后能看。

    - **会遇到的问题（坑）**
        - **① 有状态服务**：数据库/`Redis` 迁移复杂（`StatefulSet`/`PVC`/数据迁移），生产数据上 `K8s` 谨慎。
        - **② 配置/密钥**：`ConfigMap`/`Secret` 管理（`Spring` 配置外置、`feign`/`config` 改造），环境变量注入。
        - **③ 网络/服务发现**：内部调用改 `Service` 名、`host` 头、`local file` 配置（`java` 应用要 `-Dspring.cloud.nacos` 之类改造），`Ingress` 域名/路径。
        - **④ 无状态化**：用本地 `Session`/`file` 的应用要改 `Redis`/对象存储（否则多副本不一致/扩容丢）。
        - **⑤ 资源/性能**：`Pod` 资源请求/限制、`JVM` 内存（要适应 `Pod` 内存限制）、启动慢（`startup`/`readiness` 探针）、`OOM`。
        - **⑥ 灰度/稳定**：一次全迁风险大（要灰度、`Pod` 副本/`PDB` 保可用）、回滚预案（`rollout undo`）。
        - **⑦ 团队上云**：开发/运维 `K8s` 技能（`kubectl`/`Helm`/`CI`/`CD`），`CI/CD` 流水线改造（镜像构建/部署）。

    - **一句话理解**
        - 微服务迁 `K8s` 像"**整栋楼搬家**"——把每户（微服务）打包（`Docker`）、办入住（`Deployment`）、通水电（`ConfigMap`/`Secret`）、改门牌（`Service`/`Ingress` 服务发现）、把**贵重物品**（有状态 `Session`/数据）妥善安置（`Redis`/`PVC`），**分批搬**（灰度）——行李（配置）多、家具（状态）大是难点。

- **协助记忆**
    - 口诀：“**容器化、声明式、状态外置、灰度切流、可观测；坑在有状态/配置/网络/无状态化/入门技能**”。
    - 一句话：“**迁 K8s = Docker 化 + K8s 资源 + 状态/配置改造 + 灰度上线**”。

- **进阶思考**
    - **为什么要做“无状态化”再迁 K8s？**
        - `K8s` 的 `Deployment` 默认**无状态**（`Pod` 可随意删/扩/换节点，数据不存本地）；用本地 `Session`/`file` 的应用多副本会不一致、扩容丢数据。无状态化（`Session`→`Redis`、`file`→对象存储）才能在 `K8s` 上弹性/漂移。
    - **数据库要不要迁 K8s？**
        - 看情况：核心数据库迁 `K8s` 要 `StatefulSet`/`Operator`（如 `MySQL Operator`）+ `PVC`/备份——有状态、复杂、谨慎；但 `K8s` 编排/运维自动化（`Operator`）有优势。生产**先迁无状态应用**，数据库视成熟度（`StatefulSet`/`Operator` 方案成熟才迁）。

- **扩展信息**
    - **迁移工具**：镜像（`Docker`）、`Helm`（打包部署）、`Argo CD`（`GitOps`）、`CI/CD`（`Jenkins`/`GitLab CI`）、`Istio`（服务网格，迁移后治理）。
    - **迁移顺序**：先无状态/低风险 → 再有状态/核心；先测试/预发 → 生产灰度；先迁入口/网关 → 再业务层。
    - **参考**：`kubectl apply`、`Helm`、`ConfigMap`/`Secret`、`StatefulSet`（有状态）。

## 🤔 你在 K8s 运维中遇到过哪些问题？ 
- **`K8s` 运维常见问题：①`Pod` 频繁重启（`CrashLoopBackOff`/`OOM`）②节点 `NotReady`（`kubelet`/磁盘/资源）③`Pending` 调度失败（资源/污点/卷）④`Evicted`（节点压力）⑤`Ingress`/网络不通（`CNI`/`DNS`）⑥存储 `PVC` 卡（`Pending`/绑定失败）⑦`etcd` 性能/证书过期。核心：“K8s 问题多围绕 Pod/节点/网络/存储/etcd——查事件/日志/状态定位”。**
    - **Pod 层问题（最常见）**
        - **`CrashLoopBackOff`**（反复崩溃）：应用启动失败——查 `kubectl logs --previous`（上次日志）、配置/依赖/资源。
        - **`OOMKilled`**（内存溢出被杀）：`limits` 内存小——调 `limits`/减内存/查 `@Query` 泄漏。
        - **`ImagePullBackOff`**（拉镜像失败）：镜像名/认证/`imagePullSecrets`。
        - **`CreateContainerConfigError`**：`ConfigMap`/`Secret` 引用缺失。
        - **`errImagePull`/`CrashBack`**：镜像/启动问题。

    - **集群/节点层**
        - **节点 `NotReady`**：`kubelet` 失联（查 `kubelet` 日志/服务）、磁盘`DiskPressure`、资源压力。
        - **`Pending` 调度失败**：资源不足/污点/亲和/卷 —— 事件 `FailedScheduling`/`0/N nodes`。
        - **`Evicted`**：节点磁盘/内存压力驱逐（`DiskPressure`等），`QoS` 低的先逐。

    - **网络/Ingress 层**
        - **`Ingress` 访问不了**：`DNS`→`Ingress Controller`→`Service Endpoint`→`Pod` 就绪链路（`curl -H Host` 测）。
        - **`DNS` 解析慢/失败**：`CoreDNS` 压力（`Pod` 多、`dnsPolicy`）、`ClusterDomain`。
        - **`CNI`（`Calico`/`Flannel`）问题**：节点网络不通/Pod 跨节点不通——`kubectl describe pod`/`CNI` 日志。

    - **存储/`etcd` 层**
        - **`PVC` `Pending`**：`StorageClass` 未配/卷不足/`reclaimPolicy` 问题。
        - **`etcd` 性能差**（大量写入/`watch`——`api-server` 响应慢），`etcd` 需优化（`set quota`/`compact`）。
        - **证书过期**：`kubelet`/组件认证失败（`certificate expired`）→ 续签。
    - **其他常见**
        - 集群升级/补丁（版本兼容）、`Helm` 发布失败、资源泄漏、`RBAC` 权限误配、`Secret` 泄露（`etcd` 未加密）。

    - **一句话理解**
        - `K8s` 运维像"**大楼物业**"——日常就是处理：某户（`Pod`）经常跳闸（`CrashLoop`/`OOM`）、某层断电（节点 `NotReady`）、某个房间没人接（`Pending`）、楼道网不通（`Ingress`/`CNI`）、杂物堆积（磁盘满）——**按"事件/日志/状态"对号入座，先看 `kubectl describe` 再动手**。

- **协助记忆**
    - 口诀：“**Pod 看 CrashLoop/OOM/ImagePull、节点看 kubelet/NotReady、调度看 FailedScheduling、网络看 Ingress/CNI/DNS、存储看 PVC/etcd——先 kubectl describe 看事件**”。
    - 一句话：“**K8s 问题多是 Pod/节点/网络/存储/etcd 五类，查到事件对症下药**”。

- **进阶思考**
    - **排查 K8s 问题的通用套路（方法论）？**
        - **①`kubectl get` 看状态**（`pod`/`node`/`event`——哪不对）②**`kubectl describe` 看事件/原因**（`describe pod/node` 看 `Events`/`Conditions`）③**`kubectl logs` 看应用日志**（`--previous` 看崩溃前）④**逐层**（`Ingress`→`Service`→`Pod`）⑤**看监控/指标**（`Prometheus`/`top`）——先定位"哪一层、什么问题"再修。
    - **怎么避免/减少 K8s 问题？**
        - 规范（探针/资源/`PDB`）、告警（`Prometheus` 监控关键指标）、巡检（`kubectl` 定期）、`CI/CD`（`Helm`/`GitOps` 标准化）、`etcd` 优化、备份、升级演练——**预防 > 救火**。

- **扩展信息**
    - **排查命令**：`kubectl get pod/node/event`、`kubectl describe pod/node`、`kubectl logs --previous`、`kubectl top`、`kubectl get events`。
    - **常见状态/事件**：`CrashLoopBackOff`/`OOMKilled`/`ImagePullBackOff`/`Pending`/`Evicted`/`FailedScheduling`/`NotReady`/`CertExpired`。
    - **参考**：`kubectl get all`、`kubectl get nodes -o wide`、`Prometheus` 告警。

## 🤔 K8s 如何实现灰度发布？ 
- **`K8s` 灰度发布（金丝雀/灰度）是“先少量新版本试水，逐步放量，验证 OK 再全量”。实现方式：①`Deployment` 滚动更新（分批替换，配 `maxSurge`/`maxUnavailable`）②`Ingress`/`Service` 流量分流（按权重/`Header`/`Cookie` 导新版本）③`Argo Rollouts`（专业的灰度策略：精确百分比/`Header` 分流 + 自动分析回滚）。核心：“先 5% 新版本试，状态好再放大到全量，出问题能回滚”。**
    - **为什么要灰度发布**
        - 一次性全量替换（滚动更新也快）风险大：新版本有 bug 影响全部用户。灰度先小批试（金丝雀），观察指标（错误率/延迟）——**稳了再放量、有问题回滚**，最小化风险。

    - **实现方式 1：`Deployment` 滚动更新（基础）**
        - 用 `maxSurge`/`maxUnavailable`/`minReadySeconds`/`progressDeadlineSeconds` 控制节奏——但这是"**分批替换**"（全体最终都变新版），**不适合真正按比例灰度**（不能长期让 5% 用户用新版）。适合**版本升级**（不中断，不是灰度）。
    - **实现方式 2：`Ingress`/`Service` 流量分流（按比例灰度）**
        - **`Service` 分流（注意）**：原生 `Service` **没有按 `weight` 分流的字段**（只按 `label` 选择后端）——按权重分流（90% 旧/10% 新）要用 **`Ingress` `nginx` 的 `canary-weight` 注解** 或 **`istio` `VirtualService`**（`Service` 只能按 `label` 选新旧 `Pod` 组，不能按权重）。
        - **`Ingress` 按 `Header`/`Cookie`**：`nginx-ingress` 的 `canary` 注解（`nginx.ingress.kubernetes.io/canary`/`canary-weight`/`canary-by-header`）——按权重（`canary-weight: 10` = 10% 流到新版本）或按请求头（特定 `header` 用户走新版本，如内部测试）。
        - **`istio` 服务网格**：`VirtualService` 按权重/`Header` 灰度（更精细：`weight: 10` 到新版本 → 逐步调权重）。
    - **实现方式 3：`Argo Rollouts`（专业灰度）**
        - `Argo Rollouts` 自定义 `Rollout` 资源：精确**百分比步进**（`10%→25%→50%→100%`）、`setWeight`、可配置**自动分析**（`AnalysisTemplate` 看错误率/延迟，异常自动回滚）——生产常用、自动化灰度 + 回滚。

    - **配套（灰度发布要点）**
        - **步进**：`10%` 试 → 观察（`Prometheus` 错误率/延迟）→ `50%` → `100%`；**指标**：新版本错误率/延迟不劣化才放量。
        - **回滚**：灰度发现问题，`rollout undo`/权重调回（`100%` 旧版）——快速回滚。

    - **一句话理解**
        - 灰度发布像"**先小范围试菜**"——厨师（新版本）先让 10% 客人尝（`Ingress`/`Rollout` 分流），吃了没毛病（指标正常）再让更多人尝（放量 50%/100%），有人吃吐了（错误率异常）就撤下换回旧菜（回滚）——**风险最小化的版本上线**。

- **协助记忆**
    - 口诀：“**灰度=先 10% 试、指标看好再放量、出问题回滚——Ingress 按权重/Header、Argo Rollouts 自动化**”。
    - 一句话：“**灰度发布 = 小批试新版本，指标好再全量，异常快速回滚**”。

- **进阶思考**
    - **`Deployment` 滚动更新和真正的灰度（canary）区别？**
        - 滚动更新是**分批替换**（全局逐渐都变新版本，只是不中断、非"按比例留旧版"）；真灰度（`canary`）是**按比例**（如 10% 用户走新版本、90% 走旧版，**长期并存**）——滚动更新适合升级、`canary` 适合"先验证再全量"。要用 `Ingress`/`Argo Rollouts` 做比例灰度。
    - **灰度发布怎么判断要不要放量/回滚？**
        - 看**新版本指标**：错误率（`5xx`）、`P99` 延迟、`Pod` 重启、业务指标——稳定（不劣化）才逐步放量；异常（错误率↑/延迟↑/`Crash`）自动或手动**回滚**（`Argo Rollouts` 有 `AnalysisTemplate` 自动判定）。

- **扩展信息**
    - **工具**：`nginx-ingress` `canary` 注解（`canary-weight`/`canary-by-header`）、`istio` `VirtualService`（权重/`Header`）、`Argo Rollouts`（自动分析回滚）、`Flagger`（`istio` 灰度）。
    - **灰度指标**：错误率/延迟/`Pod` 重启/业务 `KPI`——`Prometheus` 监控新版本。
    - **参考**：`kubectl rollout`、`kubectl get rollout`（`Argo`）、`Ingress` `canary` 注解、`VirtualService`。

## 🤔 K8s 集群节点需要关机维护，怎么操作？ 
- **节点要关机维护，先“排空”节点上的 `Pod` 再关机（避免服务中断）：流程：①标记节点不可调度（`cordon`）→ ②排空节点 `Pod`（`kubectl drain` 驱逐迁移，`Pod` 到其他节点重建）→ ③关机维护 → ④维护完启动节点、解封（`uncordon`）恢复调度。核心：“先 cordon + drain 把 Pod 迁走，再关机——排空保可用、维护后 uncordon”。**
    - **为什么先“排空”（drain）再关机**
        - 直接关机 → 节点上 `Pod` 全部异常结束（服务中断、可能有状态 `Pod` 数据风险）；`drain` **把 `Pod` 优雅驱逐迁移**到其他节点（无状态重建、有状态要 `StatefulSet`/存储处理），**服务不中断**（`Pod` 被 `Deployment` 在其他节点重建）。
    - **几个前提/注意（drain 前）**
        - **有状态 `Pod`**（`StatefulSet`/`PVC`）：`drain` 可能失败（有状态 `Pod` 受 `PDB` 保护/需特殊处理；或 `DaemonSet`/`emptyDir` 不迁移）。
        - **`PodDisruptionBudget`（PDB）**：限制同时停多少副本——`drain` 会等 `PDB` 允许（先看业务是否有 `PDB`，防一次 `drain` 停太多副本）。
        - **`DaemonSet` Pod**（每节点一个）：`drain` 默认不驱逐 `DaemonSet`（它们会重新调度到该节点）——`--ignore-daemonsets` 跳过。
        - **无副本 `Pod`**（单 `Pod` 无控制器）：`drain` 会删（无重建）——确认是否可接受。

    - **完整操作流程**
        - **①`kubectl cordon <node>`**：标记节点**不可调度**（不再分配新 `Pod`；已跑的 `Pod` 不动）。
        - **②`kubectl drain <node>`**：**优雅驱逐**节点上 `Pod`（到其他节点；无状态 `Pod` 重建、有状态/`DaemonSet` 处理；`--ignore-daemonsets`——`--delete-emptydir-data` 等参数按需）。
        - **③ 关机维护**：维护节点硬件/`OS`/`kubelet`（`kubelet` 升级、`OS` 补丁、硬件更换）。
        - **④ 启动 + 解封**：`systemctl enable --now kubelet`/节点启动 → `kubectl uncordon <node>`（恢复调度）→ 节点 `Ready`、集群健康。

    - **一句话理解**
        - 节点关机像"**一栋楼要停电梯检修**"——先把楼里人（`Pod`）**有序疏散到其他楼**（`drain`），再封楼（`cordon`）不让人进，停电梯检修（关机），修好开门迎客（`uncordon`）——**不抛下任何人（服务不中断）**。

- **协助记忆**
    - 口诀：“**cordon 封节点 → drain 疏散 Pod（其他节点重建）→ 关机维护 → uncordon 解封**”。
    - 一句话：“**关机前先 cordon + drain 把 Pod 迁走，维护完 uncordon**”。

- **进阶思考**
    - **`drain` 会怎么处理有状态的 `StatefulSet` Pod？**
        - `StatefulSet` `Pod`（有稳定身份/存储）`drain` 时**驱逐迁移**（`Pod` 在 **同一节点序**重建，`PVC` 保留——数据跟着 `Pod`）；但 `StatefulSet` 不允许随意跨节点（`Pod` 名固定），`drain` 会尝试在其他节点重建（**失败则 `Pod` 停**）——有状态节点维护要谨慎（先备份/看 `StatefulSet` 是否允许）。
    - **`drain` 卡住/失败怎么办？**
        - 常见：`--ignore-daemonsets` 没加（`DaemonSet` `Pod` 不驱逐卡住）、`PDB` 阻止（等 `PDB` 允许）、有状态 `Pod` 无法迁移（`--force`? 谨慎——有状态 `Pod` 强制可能丢数据）。排查 `kubectl get pod`（卡在哪个）、`--grace-period` 控制优雅时长。"

- **扩展信息**
    - **命令**：`kubectl cordon <node>`、`kubectl drain <node> --ignore-daemonsets`、`kubectl uncordon <node>`、`kubectl get nodes`（看状态）。
    - **`drain` 参数**：`--ignore-daemonsets`（跳过 DaemonSet）、`--delete-emptydir-data`（删 emptyDir Pod）、`--grace-period`（优雅宽限）、`--force`（强制，谨慎）。
    - **参考**：`PodDisruptionBudget`、节点维护流程（`kubectl cordon → drain → 维护 → uncordon`）。

## 🤔 Etcd 集群某节点故障怎么恢复？ 
- **`etcd` 集群某节点故障，恢复思路：①确认故障节点/`etcd` 状态（`etcdctl` 检查成员）②若是成员故障且多数派还在，新加一个健康成员替代/修复原成员（重新加入）③数据一致性（`etcd` 多数派写入，坏节点去掉/重加；新节点同步数据）④`etcd` 恢复（备份/重装）。核心：“etcd 靠多数派（Quorum）容错——坏一个节点，多数派还在就不影响，修复/替换该节点重新加入”。**
    - **先确认故障与影响**
        - **`etcdctl member list`/`etcdctl endpoint health`**（看成员健康）、`etcdctl endpoint status`（看各节点状态/`leader`）。
        - **多数派（Quorum）**：3 节点 `etcd` 挂 1 个 → 剩 2 仍多数派，集群可用（写入正常）；挂 2 → 失去多数派，只读/不可写（要恢复）。**确认坏了几台**——1 台好救（重加），≥2 台（超多数派）恢复复杂（可能从备份）。

    - **修复步骤（单节点故障，多数派在）**
        - **① 移除故障成员**：`etcdctl member remove <id>`（把挂掉的成员从集群摘除，`etcd` 多数派重新算——3 变 2）。
        - **② 修复/重装节点**：恢复机器（修 `etcd` 服务、数据目录或**重装 `etcd`**）。
        - **③ 新加健康成员**（恢复 3 节点）：`etcdctl member add <new> --peer-urls=http://<node>:2380` → 启动新 `etcd`（加入集群，自动从 `leader` 同步数据）。
        - **④ 补到奇数（3/5）**：尽量**保持奇数**（3 节点）保证容错；若换下的是旧成员，重新加一个健康成员恢复 3 节点。

    - **备份恢复（多个节点/数据损坏）**
        - **`etcdctl snapshot save <file>`**：定期**快照备份** `etcd`（生产必须）。
        - 多节点挂/数据损坏 → **从备份恢复**（`etcdctl snapshot restore` 恢复新 `etcd` 数据目录）——血泪教训：**`etcd` 必须备份**（它是 `K8s` 的数据库，丢失=集群状态丢）。

    - **一句话理解**
        - `etcd` 故障像"**账房 3 个账本，坏 1 本不影响**"（多数派）——坏一本，把坏本换掉、补一本新账本（新成员加入，从好账本抄一份——同步数据）；全坏了（超多数派丢账）就得靠**备份账本**（快照）重建。**账房（etcd）平时必须备份**。

- **协助记忆**
    - 口诀：“**etcd 多数派容错——坏 1 个成员先 member remove，修好/重装再 member add（保持奇数 3 节点），数据由 leader 同步**”。
    - 一句话：“**etcd 坏节点靠多数派扛，坏单节点重加恢复，重要靠备份**”。

- **进阶思考**
    - **`etcd` 为什么必须奇数节点（多数派）？**
        - `etcd`（`Raft`）写操作要**多数派 `Quorum`**（3 节点需 2 确认）——3 节点挂 1 还剩 2（多数派）能写；4 节点挂 2 剩 2（正好半数非多数）不能写。所以**奇数**（3/5/7）以最少机器获最大容错（3 挂 1、5 挂 2）——`etcd` 集群要奇数。
    - **`etcd` 丢了（没备份）数据能恢复吗？**
        - 没备份很难（`etcd` 是 `K8s` 的元数据数据库，全丢=集群"失忆"——`Pod`/`Service`/配置全丢，只能从备份重建）。**所以 `etcd` 定期 `snapshot` 备份是底线**（生产必须），恢复靠备份。"

- **扩展信息**
    - **`etcd` 运维命令**：`etcdctl member list`、`etcdctl member remove/add`、`etcdctl endpoint health`、`etcdctl snapshot save/restore`。
    - **`etcd` 高可用**：3/5 奇数节点，跨机架，`etcd` 与 `kube-apiserver` 分离（资源独立）。
    - **参考**：`systemctl status etcd`、`etcdctl`、`Kubernetes` 的 `etcd` 配置（`etcd-<name>.service`）。

## 🤔 K8s 集群怎么备份？ 
- **`K8s` 集群备份分两部分：①`etcd` 备份（集群的“数据库”——所有资源状态/配置）②应用数据备份（`PVC`/持久卷里的 `Pod` 数据）。核心：①`etcd snapshot` 备份集群状态（`Pod`/`Service`/配置/`Secret`）②`PVC` 数据用存储快照/`Velero`（`K8s` 应用备份工具）③整集群用 `Velero` 备份（`etcd` + `PVC` + 自定义资源）**。
    - **备份什么（两张网）**
        - **①`etcd`（集群状态）**：`K8s` 的“数据库”——存`Pod`/`Service`/`Deployment`/`ConfigMap`/`Secret`/`PVC` 等所有资源定义和状态——备份 `etcd` = 备份集群“配置/状态”（应用是怎么声明的）。"
        - **②`PVC`/数据（应用数据）**：持久卷（`PVC`）里的数据（数据库/文件）——`etcd` 不包含这些（是资源定义，数据在存储后端）——要单独备份。
    - **`etcd` 备份（集群状态）**
        - **`etcdctl snapshot save <file>`**：`K8s 1.6+` 的 `etcd snapshot`（或 `etcdctl`)——备份 `etcd` 到快照文件（`etcd` 数据 + `K8s` 对象状态）。"
        - 定时备份（`cron`）+ 异地存（防集群/机房灾）；`etcd` `snapshot restore` 恢复。
    - **`Velero`（K8s 应用备份工具，推荐）**
        - **`Velero`**：开源 `K8s` 备份工具——**备份整个集群资源**（`etcd` + `CRD` + `PVC` 数据），是 `K8s` 备份的标准方案。"
        - 能力：备份/恢复**集群对象**（`Deployment`/`Service`/`ConfigMap`）+ **持久卷数据**（`PVC`/存储快照）+ **`CRD`/自定义资源**；`schedule` 定时、`restore` 恢复。
        - `Velero` + 云存储（`OSS`/`S3`）——备份/恢复整集群（含应用数据）。
    - **应用数据备份（`PVC`）**
        - **存储快照**：`CSI` `VolumeSnapshot`（卷快照，`v1.20` 支持）——快照 `PV`/存储到存储后端；`Velero` 用 `VolumeSnapshot` 备份 `PVC`。
        - **数据库备份**：应用层备份（`mysqldump`/`pg_dump`）+ 存到对象存储——应用级备份。
    - **一句话理解**
        - 备份 `K8s` 像"**备份公司 + 仓库**"——公司表册（`etcd`：谁在哪、配什么）用 `etcd snapshot` 备份；仓库货物（`PVC` 数据）用快照/`Velero`/数据库导出备份。**表册 + 货物都要备份，且放异地**。

- **协助记忆**
    - 口诀：“**K8s 备份 = etcd snapshot（状态）+ PVC/Velero（数据）——Velero 整套备份、etcd 单独快照、异地存**”。
    - 一句话：“**备份集群状态用 etcd snapshot，备份应用数据用 Velero/PVC 快照**”。

- **进阶思考**
    - **`etcd` 备份够吗（能恢复整个集群吗）？**
        - `etcd` 备份能恢复**集群资源状态**（`Pod`/`Deployment`/`ConfigMap` 定义）——但不是应用数据（`PVC`/数据库内容）——恢复 `etcd` 后集群"知道"要有哪些 `Deployment`，但 `PVC` 数据要另备（`Velero`/存储快照）。所以**`etcd` + 数据备份都要**。
    - **`Velero` 和 `etcd snapshot` 区别？**
        - `etcd snapshot`：只备份 **`etcd` 数据**（集群对象定义/状态）；`Velero`：**整套备份**（集群对象 + `PVC` 数据 + `CRD`）——`Velero` 更全面（连数据一起），`etcd` snapshot 是 `Velero` 底层的核心（集群对象在 `etcd`）。生产推荐 `Velero`（`etcd` + 数据一站式）。"

- **扩展信息**
    - **备份工具**：`etcdctl snapshot`（`etcd`）、`Velero`（`K8s` 整套）、`kube-dump`（集群状态导出）、`CRD`/`Helm` 备份。
    - **备份策略**：`etcd` 定时 `snapshot`（如 1 天）+ 异地存；`Velero` 定时（`schedule`）备份集群到对象存储；`PVC` 数据快照。
    - **恢复**：`etcd snapshot restore`（恢复 `etcd`）、`velero restore`（恢复整套）+ `velero restore-from-schedule`。
    - **参考**：`etcdctl snapshot save/restore`、`velero backup/restore`、`VolumeSnapshot`。

## 🤔 Etcd 有哪些参数可以优化？ 
- **`etcd` 是 K8s 的“数据库/状态存储”，优化目标：写入/读取性能、存储占用、稳定性。关键参数：`--quota-backend-bytes`（存储上限）、`--auto-compaction-retention`（自动压缩）、`--heartbeat-interval`/`--election-timeout`（心跳/选举）、`--snapshot-count`（快照频率）、`--max-request-bytes`/`--max-txn-ops`（请求大小）、`--backend-batch-interval/limit`（写批处理）。核心：“etcd 优化 = 存储上限、自动压缩、心跳选举、批写、查慢/大请求”。**
    - **存储/容量参数**
        - **`--quota-backend-bytes`**：`etcd` 存储上限（如 `8Gi`）；超过 `etcd` 报错/拒写——**增大或防满**。
        - **`--auto-compaction-retention`**（自动压缩保留）：自动压缩旧版本/历史数据（**防存储膨胀**），`etcd` 默认 `0`（不自动压缩，要手动/设置）——设 `1h`（`periodic` 模式按小时）或 `1000`（`revision` 模式按版本数），配合 `--auto-compaction-mode`（`periodic`/`revision`）生效。

    - **心跳/选举参数**
        - **`--heartbeat-interval`**：`Leader` 心跳间隔（默认 100ms）——影响故障检测速度/`etcd` 负载（大集群可能调大）。
        - **`--election-timeout`**：选举超时（默认 1000ms）——`heartbeat-interval` 的倍数；影响 leader 故障切换。
        - **`--quota`/`--max-request-bytes`**：单请求大小（`etcd` 默认 1.5MB）——大请求（如 `--max-request-bytes`）K8s `CRD` 大对象可能超。

    - **写入/批处理参数**
        - **`--backend-batch-interval`/`--backend-batch-limit`**：批量提交（`backend` 写批周期/提交大小）——调优写吞吐（`etcd` 存储 `bbolt` `commit` 参数）。
        - **`--snapshot-count`**：快照阈值（`etcd` 状态快照到内存的频率，默认 10000）——影响 `etcd` 开销/恢复。
        - **`--max-txn-ops`**：事务内最大操作数（K8s 批量操作）

    - **`etcd` 优化场景（常见）**
        - **存储膨胀**：没自动压缩 → `--auto-compaction` + `etcdctl compact` + `defrag`（碎片整理，与 `quota` 相关）。
        - **写入慢/响应慢**：节点负载、磁盘慢（换成 `SSD`）、`--backend-batch` 调优、网络延迟。
        - **`etcd` 大请求**（`--max-request-bytes`）：某些 `CRD`/大对象（`Seccomp`/大 `ConfigMap`）。
        - **`etcd` 高可用**：奇数节点、`etcd` 与 `/var/lib` 分离、磁盘 `SSD`（`etcd` 很依赖磁盘 `fsync`）。

    - **一句话理解**
        - `etcd` 优化像"**给账房优化**"——上限（`quota`）不能爆、定期清旧账（`auto-compaction`/`compact` 防堆满）、掌柜心跳（`election`）合适、记账快（`backend-batch`）、单本账别太厚（`max-request-bytes`）——**核心防存储膨胀 + 写性能 + 快**。

- **协助记忆**
    - 口诀：“**etcd 优化：quota 上限、auto-compaction 防膨胀、heartbeat/election 心跳、backend-batch 写批、max-request-bytes 防大请求——磁盘 SSD/奇数节点**”。
    - 一句话：“**etcd 优化看存储上限、自动压缩、心跳选举、写批处理——磁盘要 SSD**”。

- **进阶思考**
    - **`etcd` 存储膨胀（`quota` 超）会怎样？**
        - `etcd` 达到 `quota` → **拒写**（`etcdserver: mvcc: database space exceeded`）——K8s 不能再创建/更新资源（集群"半瘫"，只读）。处理：`etcdctl compact`（压缩历史）+ `defrag`（碎片整理）+ 调大 `quota`。
    - **为什么 `etcd` 特别依赖磁盘（SSD）？**
        - `etcd` 每个写操作要 `fsync` 落盘（`bbolt`/`snapshot`）保持久——磁盘 `fsync` 慢直接影响 `etcd` 写入延迟（`etcd` 性能瓶颈往往是磁盘 `IO`）。**用 `SSD` 是 `etcd` 性能关键**（`HDD` 写延迟大、`etcd` 慢）。

- **扩展信息**
    - **`etcdctl` 优化命令**：`etcdctl compact`（压缩历史版本）、`etcdctl defrag`（碎片整理，与 `quota` 相关）、`etcdctl endpoint status`。
    - **K8s 侧 `etcd`**：`kube-apiserver` 的 `--etcd-servers`、`etcd` 快照/备份、`etcd` 与 `apiserver` 分开部署（资源独立）。
    - **监控 `etcd`**：`etcd` 指标（`db size`/`fsync latency`/`backend commit`）、`prometheus` 抓取。

## 🤔 K8s 证书过期怎么续签？ 
- **K8s 组件证书（CA/`apiserver`/`kubelet`/`etcd` 等）默认有效期（如 `1 年`），过期会导致组件认证失败、集群不可用。续签：①用 `kubeadm certs renew`（自动化续签，`kubeadm` 集群）②`kubelet`/`etcd` 证书单独续签/重启③手动 `openssl` 重新签发④更新 `kubeconfig`/重启组件。核心：“证书过期前续签——`kubeadm certs renew` + 重启组件，或参考过期时间提前处理”。**
    - **确认证书过期/有效期**
        - **`kubeadm certs check-expiration`**（`kubeadm` 集群，看各证书到期）；或者看组件日志`certificate expired` 报错。
        - `kubeadm certs list`/给 `etcd`/`apiserver` 证书看有效期——提前做（一般证书 1 年）。
    - **`kubeadm` 集群续签（推荐）**
        - **`kubeadm certs renew all`**：续签集群证书（`apiserver`/`etcd`/`kubelet`/`admin.conf` 等——**不续根 `CA`**）——`kubeadm` 自动重签大部分（`etcd`/`admin` 等）。
        - **重启组件**：续签后要**重启 `kube-apiserver`/`kube-controller-manager`/`scheduler`/`etcd`**（`kubeadm` 到 `kubeadm certs renew` 后 `systemctl restart`）——或者直接用 `kubeadm upgrade`（会续签 + 升级同做）。
        - **`kubelet` 证书**：`kubelet` 证书 `--rotate-certificates`（自动轮换，或手动 `certificatesigningrequest` approve）。
        - **更新 `admin` `kubeconfig`**：`kubeadm certs renew` 重新生成 `admin.conf`/`kubelet.conf`（或者重新 copy `admin.conf` 供 `kubectl`）。
    - **非 `kubeadm` 集群**
        - 手动**重新签发**（`openssl` 重新签发 `CA`/组件证书）+ 更新 `/etc/kubernetes` 配置/`kubeconfig` + 重启组件——复杂，且要 `CA` 才做；
        - **`kubeadm` 是主流**（`kubeadm certs renew` 最省事）。
    - **几个注意**
        - **提前规划**：证书 1 年，监控到期（`kubeadm certs check-expiration`/prometheus）
        - **`CA` 证书过期**：最麻烦——**`kubeadm certs renew` 不续签根 `CA`**（只续 `apiserver`/`etcd`/`kubelet`/`admin.conf` 等）；根 `CA` 过期需**手动重建**（`openssl` 重签或重建 `CA`）。`CA` 证书一般更长（如 `10` 年），但过期是重灾，监控 + 提前续签。
        - **集群升级**：`kubeadm upgrade` 时通常**自动续签**（升级 + 证书续签一起），是常规做法。

    - **一句话理解**
        - 证书过期像"**保安的通行证到期**"——进不去任何门（组件认证失败）。`kubeadm certs renew` 像"**统一换通行证**"（续签 + 重启组件生效）；没 `kubeadm` 要逐个手动换（`openssl` 重签 + 更新配置）——**提前看 `kubeadm certs check-expiration`，过期前换**。

- **协助记忆**
    - 口诀：“**证书过期用 `kubeadm certs renew all` + 重启组件；`kubeadm check-expiration` 提前看、`kubeadm upgrade` 自动续签**”。
    - 一句话：“**证书要续签——kubeadm 集群 `certs renew` + 重启，升级时自动续**”。

- **进阶思考**
    - **证书过期会导致什么？**
        - 组件**认证失败**：`kubelet`/`kube-apiserver`/`etcd` 证书过期 → `kubelet` 无法连 `apiserver`（节点 `NotReady`）、`apiserver` 无法连 `etcd`、API 调用报错——集群**不可用/半瘫**。日志有 `certificate expired`/`x509: certificate has expired or is not yet valid`。
    - **`kubeadm certs renew` 能续 `CA` 吗（CA 过期怎么办）？**
        - `kubeadm certs renew` **能续 `etcd`/`apiserver`/`kubelet` 等证书**，但**若 `CA` 已过期**，`renew` 可能无法重发（CA 签发新证书受限）——`kubeadm` 的 `renew` 会**续 `admin`/`etcd` 等证书**，但 `--certificate-renewal` / `upgrade` 流程。**重要：`CA` 证书一般更长（如 10 年），但`CA` 又过期是麻烦场景（可能要重建 `CA`/重新签发）**——所以监控 + 提前续签。"

- **扩展信息**
    - **命令**：`kubeadm certs check-expiration`（看到期）、`kubeadm certs renew all`（续签）、`kubeadm certs list`、`openssl x509 -in <cert> -noout -dates`（看证书日期）。
    - **`kubelet` 证书自动轮换**：`--rotate-certificates`（`kubelet` 自动换）`certificatesigningrequest`（`CSR` 批准）。
    - **参考**：`kubectl get csr`（证书请求 `approve`）、`kubeadm upgrade`（升级续签）。

## 🤔 微服务在升级过程中出现 500 错误是什么原因？ 
- **微服务升级中出现 `500`（服务端错误）常见原因：①`Pod` 还没就绪就接了流量（`readiness` 探针未就绪/`Ingress` 切得过早）②旧`Pod`/新`Pod` 版本不一致（升级中部分请求打到未就绪/不兼容）③依赖/数据库没就绪④配置/`Secret` 没对齐⑤资源不足（`OOM`/日志爆）⑥网络/`Service` 切换导致。核心：“升级中 500 多是‘新 Pod 未就绪就接流量’或‘新旧版本处理不一致’——先看 readiness/探针，再查日志”。**
    - **升级过程为什么会 500（几个典型场景）**
        - **① `Pod` 未就绪但接了流量**：`readiness` 探针没配/不健康；`Ingress`/`Service` 把流量导给了启动中的 `Pod`（`readiness` 没过就接请求 → 应用还没准备好，500）。
        - **② 新旧版本共存（滚动更新/灰度）**：滚动更新期间**新旧 `Pod` 并存**，请求可能打到**新版本但依赖不兼容/迁移中**的 `Pod`（如新版本连旧数据库 schema）——500。
        - **③ 依赖/中间件没就绪**：升级时数据库/`Redis`/外部服务重构（迁移中/切换），应用连不上 → 500。
        - **④ 配置/证书问题**：`ConfigMap`/`Secret` 更新慢、`Pod` 用了旧配置/`TLS` 证书过期/服务间认证失败。
        - **⑤ 资源不足**：`OOMKilled`（内存超限升级变慢/重启）、`CrashLoop`（升级失败反复重启）。
        - **⑥ `Service`/`Ingress` 切换问题**：`Service` `Endpoint` 更新延迟/`kube-proxy` 未刷 → 导到已删`Pod`。
    - **排查步骤**
        - **① 看 `Pod` 状态**：`kubectl get pods`（升级中的 `Pending`/`CrashLoop`/`OOMKilled`？）、`kubectl describe pod`（事件/`readiness` 失败？）。
        - **② 看`readiness`/`Ingress`**：`kubectl get endpoints`（`Service` 后端有没有未就绪的 `Pod`）、`Ingress` 是否把流量导给了未就绪。
        - **③ 看应用日志**：`kubectl logs <pod>`（`500` 的具体报错——连不上 DB/依赖？`NullPointer`？`CircuitOpen`？）+ `--previous`（升级前）。
        - **④ 看依赖**：数据库/中间件是否在迁移/切换、`ConfigMap`/`Secret` 是否更新、依赖服务（进 `Pod` `curl`/`jstack`/`ps` 看连接）。
        - **⑤ 监控/链路**：`Prometheus`（`5xx` 率）、错误日志/链路（`Jaeger`）定位哪个服务 500。
    - **一句话理解**
        - 升级中 500 像"**换新店员但让新店员直接接客**"——新店员（`Pod`）还没上岗（就绪）就被让接客（`readiness` 没过接流量）→ 手忙脚乱 500；或新旧店员并存时某新店员业务不熟（版本不兼容）→ 接待出错 500。**先确保新店员就绪再上岗（readiness），逐渐换（灰度）**。

- **协助记忆**
    - 口诀：“**升级中 500 多是 readiness 未就绪接流量 / 新旧版本不兼容 / 依赖未就绪——先看 Pod 状态/readiness，再看日志/依赖**”。
    - 一句话：“**升级 500 = 新 Pod 没就绪就接客，或新旧版本处理不一致——查 readiness + 日志**”。

- **进阶思考**
    - **怎么避免升级 500（升级不停服务）？**
        - **①配 `readiness` 探针**（新 `Pod` 就绪才接流量）+ `liveness`（健康）。
        - **②滚动更新/灰度**（`maxSurge` 先加新、`maxUnavailable:0` 保可用）、`Ingress` 灰度（先 10%）。
        - **③`PodDisruptionBudget`（PDB）**（升级时保最少副本可用）。
        - **④`Service`/`Ingress` 切换**（`Endpoints` 更新、`kube-proxy`）。
        - **⑤依赖兼容**（升级版本先验证依赖/数据库）、`preStop` 平滑下线、`startup`/`readiness` 起稳。
    - **为什么有时升级后 `500` 却查不出（需看链路）？**
        - 有时 `Pod` 本身健康（`Running` 但业务逻辑错）——要用**链路追踪/日志**定位（哪个服务 500、`feign`/`http` 调用谁）；`jstack`（线程卡哪）、`heap dump`（内存泄漏）——看应用层报错。

- **扩展信息**
    - **排查命令**：`kubectl get pods`（状态）、`kubectl logs --previous`、`kubectl describe pod`、`kubectl exec`（进 Pod `curl` 测）。
    - **升级相关**：`readinessProbe`/`startupProbe`、`PodDisruptionBudget`、`Ingress` 灰度、`kubectl rollout`。
    - **参考**：`Prometheus`（`5xx` 率）、`Jaeger`（链路）、`kubectl rollout status`（看升级进度）。

## 🤔 设计 500 台 K8s 集群重点考虑哪些问题？ 
- **设计 500 台节点的大规模 `K8s` 集群，重点考虑：①控制面（`etcd`/`apiserver`/调度器）能否扛住（要分发/性能）②`etcd` 规模（数据/`watch`）③网络（`CNI` 可扩展）④存储（海量 `PVC`/`CSI`）⑤监控/日志（`Prometheus`/`ELK`）⑥高可用（控制面/`etcd` 多节点）⑦集群工具（`Helm`/`GitOps`、权限/租户）。核心：“500 台是大集群，控制面/etcd/网络/监控都要能横向扩展 + 高可用”。**
    - **控制面（`Master`）— 最关键**
        - **`API Server`**：500 节点大量请求/对象——多副本 `apiserver`（负载均衡）+ 调 `--max-requests-inflight`/`--kube-api-qps`；`apiserver` 性能/内存。
        - **`etcd`**：上万个 `Pod`/`Service` 的元数据——`etcd` 规模大（`5 节点`、`SSD`、`--quota`）、`watch` 多、写入/查询压力——`etcd` 优化/备份。
        - **`kube-scheduler`/**`controller-manager`**：500 节点调度/控制器负担——多副本 + 选主 + 调参（`kube-scheduler` `--kube-api-qps`）。
    - **网络（`CNI`）**
        - `CNI` 可扩展（500 节点 + 数万 `Pod`）：`Calico`/`Cilium`（`eBPF` 高性能），`IPAM`（大量 `Pod IP` 分配）、网络策略——选可扩展 + 性能好的。
        - 网络带宽（集群东西向流量大），`Service`/`kube-proxy`（`IPVS` 模式大集群）。
    - **存储**
        - 海量 `PVC`/卷：`CSI` 驱动（`Ceph`/`NFS`/云盘）性能、存储容量、`StorageClass` 管理；`PV`/`PVC` 数量多（`etcd` 对象也涨）。
    - **监控/日志（可观测）**
        - `Prometheus` 抓取 500 节点指标（每节点数百~上千时序）+ `node_exporter`——用**联邦/Thanos**（多级）或 `VictoriaMetrics`（大规模）——不然 `Prometheus` 单机扛不住。
        - 日志（`Loki`/`ELK`）海量；`Grafana` 看板；告警分级。
    - **高可用 / 故障域**
        - **控制面高可用**（`apiserver`/`etcd`/`scheduler` 多副本 + 选主 + `LB`）；`etcd` 5 节点跨机架。
        - **多可用区/区域**（`podTopologySpread`、`PDB`）、节点冗余（`Pod` 反亲和）。
    - **集群治理/工具**
        - **`Helm`/`GitOps`**（`Argo CD` 管理数百应用）、`RBAC`/`Namespace`（多租户）、`Quota`/`LimitRange`（资源限制）、`Helm`/`CI/CD`。
        - **升级/运维**：`kubeadm`/`Rancher`/`KubeOne`（管理 500 节点）、`etcd`/`apiserver` 升级演练。
    - **一句话理解**
        - 500 台像"**大百货公司**"——前台（`apiserver`）要多窗口不排队、账房（`etcd`）要够大可靠、仓库（存储）够、安保（`CNI`/监控）覆盖全楼、楼分区域（故障域）——**每个环节都要能扛住 500 台的量 + 高可用**。

- **协助记忆**
    - 口诀：“**500 台看控制面（apiserver/etcd/scheduler）、网络（CNI 扩展）、存储（CSI）、监控（联邦/Thanos）、高可用（etcd 5 节点/LB）、治理（Helm/RBAC）**”。
    - 一句话：“**500 台大集群——控制面/etcd/网络/监控都要横向扩展 + 高可用**”。

- **进阶思考**
    - **500 节点 `etcd` 会不会成瓶颈？**
        - 会（`etcd` 是所有资源状态/`watch` 的存储）：500 节点 + 数万对象，`etcd` 写入/`watch` 量大——用 `5 节点` + `SSD` + 优化（`quota`/`compact`/`backend-batch`），`etcd` 与 `apiserver` 负载均衡；`etcd` 性能是 500 节点集群的关键瓶颈。
    - **监控怎么扛 500 节点？**
        - 单 `Prometheus` 抓 500 节点（每节点数百~上千时序 × 500）**扛不住**——用 `Prometheus` 联邦/`Thanos`/`VictoriaMetrics`（水平扩展），或按区域/业务分多个 `Prometheus` + 聚合（`Thanos`）——大集群监控要**多级/水平扩展**。

- **扩展信息**
    - **控制面基准**：`kube-apiserver` 多副本、`etcd` 5 节点、`kube-scheduler`/`controller-manager` 多实例（选主）。
    - **大规模工具**：`Thanos`/`VictoriaMetrics`（监控聚合）、`Loki`/`ELK`（日志）、`Argo CD`/`Helm`（部署）、`Rancher`/`KubeOne`（管理）。
    - **参考**：`kubectl get nodes`（节点数）、`etcdctl`、`Prometheus` 联邦。

## 🤔 怎么保障应用升级过程中不丢失流量？ 
- **升级不丢流量 = “平滑升级（旧服务不中断 + 新服务接上）”：①`readiness` 探针（新 `Pod` 就绪才接流量）②滚动更新（`maxSurge` 先加新、`maxUnavailable:0` 保可用）③`preStop` 平滑下线（摘流 + 等请求完）④`PodDisruptionBudget`（PDB 保最少副本）⑤`Service`/`Ingress` 切换（`Endpoints` 更新/`kube-proxy` 刷）⑥`Ingress` 灰度（先少量新版本试）。核心：“新 Pod 就绪才接流量、旧 Pod 平滑下线、滚动/灰度、保最少可用副本”。**
    - **核心思路（关键）**
        - 不丢流量 = **新版本能接住流量、旧版本优雅退出、两者交接平滑**——利用 K8s 的滚动更新 + 探针 + `preStop` + `PDB`。
    - **①`readiness` 探针（新 Pod 就绪才接流量）**
        - `readinessProbe`：新 `Pod` 启动后**就绪才进 `Service` `Endpoint`**——`readiness` 没过接不到流量（不会升级中打给未就绪 `Pod`）。
        - `startupProbe`：慢启动应用给时间。
    - **②滚动更新策略（`maxSurge`/`maxUnavailable`）**
        - `strategy: RollingUpdate` + `maxSurge: 1`/`maxUnavailable: 0`：**先加新 `Pod`（超额）、就绪后再删旧 `Pod`**——服务始终有副本（`maxUnavailable:0` 保证可用副本不少）。
        - 加新/删旧分批（滚动）——**服务不中断**。
    - **③`preStop` 平滑下线（旧 Pod 优雅退）**
        - `preStop` 钩子（删除前执行）：**摘流**（从 `Service` 除名/通知注册中心）+ **等请求处理完**（`sleep`/`grace`）——再 `SIGTERM` 优雅退，避免"正在处理的请求被腰斩"。
        - `terminationGracePeriodSeconds`（宽限期给应用收尾）。
    - **④`PodDisruptionBudget`（PDB，保最少副本）**
        - `PDB` 声明"升级/维护时**最少几个副本可用**"——滚动更新/`drain` 时 `PDB` 阻止**过度停复制**（如 `minAvailable:2` 保证少 2 副本在用）。
    - **⑤`Service`/`Ingress` 切换**
        - `Service` `Endpoint` 更新（`readiness` 去掉旧/加新）、`kube-proxy` 规则更新——`Ingress`/`SLB` 平滑切到新 `Pod`。
        - `Ingress` 灰度（先 5-10% 新版本，验证后放大）——渐进。
    - **⑥灰度 + 监控**
        - `Ingress`/`Argo Rollouts` 按权重灰度；`Prometheus` 看 `5xx`/延迟——新版本稳定再全量。
    - **一句话理解**
        - 升级不丢流量像"**小区换电梯也保证有人能上下**"——旧电梯（旧 `Pod`）先继续用、新电梯（新 `Pod`）**装好测试能运行（readiness）**再上岗，**人走旧电梯但要等（preStop 摘流 + grace 等处理完）**，物业保证"至少几部电梯在运行"（`PDB`）——新旧交接平滑，不中断出行（流量）。

- **协助记忆**
    - 口诀：“**readiness 就绪接流量、maxUnavailable:0 保可用、preStop 摘流优雅退、PDB 保最少副本、Ingress 灰度渐进**”。
    - 一句话：“**新 Pod 就绪才接客、旧 Pod 摘流再退、PDB 保可用、灰度渐进——不丢流量**”。

- **进阶思考**
    - **为什么 `readiness` + `preStop` 是"不丢流量"的关键？**
        - `readiness`：新 `Pod` 病了不放流量（防新版本倒）；`preStop`：删旧 `Pod` 前先摘流（从 `Service` 除名 + 等请求完）——**一进一出都平滑**，不中断。两者配合 + 滚动更新（先加后删）实现"流量不断"。
    - **`maxUnavailable:0` 一定能不丢流量吗？**
        - 是**减小**风险（先加新后删旧，可用副本始终足够），但还要 `readiness`（新 `Pod` 就绪才算可用）`+ preStop`（旧 `Pod` 摘流）——`maxUnavailable:0` 是"副本数不少"，`readiness`/`preStop` 是"Pod 真的能接/优雅退"。三者配合才真正不丢流量。

- **扩展信息**
    - **配置**：`deployment.spec.strategy.rollingUpdate.maxSurge/maxUnavailable`、`pod.spec.containers[].readinessProbe`、`pod.spec.terminationGracePeriodSeconds`、`pod.spec.containers[].lifecycle.preStop`、`policy/v1 PodDisruptionBudget`。
    - **灰度**：`Ingress` canary 注解、`Argo Rollouts`（自动分析回滚）、`Istio` `VirtualService`。
    - **参考**：`kubectl rollout status`、`kubectl get pdb`、`kubectl describe deployment`。

## 🤔 K8s 应该监控哪些关键指标？ 
- **`K8s` 监控关键指标分四层：①集群/控制面（`API Server`/`etcd`/调度器状态、节点健康）②资源使用（节点/Pod 的 `CPU`/内存/磁盘）③工作负载（`Pod` 状态/重启/`OOM`、`Deployment` 副本、`HPA` 扩缩）④应用/网络（`5xx`/延迟、`Ingress`、`PVC`/存储）。用 `Prometheus`（`kube-state-metrics`/`node_exporter`/`cAdvisor`）+ `Grafana`。核心：“集群健康 + 资源使用 + 工作负载 + 应用指标，Prometheus 抓、Grafana 看”。**
    - **① 集群/控制面指标（健康）**
        - **`API Server`**：请求数/错误率/延迟（`apiserver_request_total`、`apiserver_request_duration`）、`apiserver` 是否可用。
        - **`etcd`**：`etcd` 可用性/`db size`/`fsync` 延迟/`leader` 状态（`etcd_server_has_leader`/`etcd_disk_backend_commit_duration`）——`etcd` 是集群核心。
        - **`kube-scheduler`**：调度延迟/`FailedScheduling`；`controller-manager`。
        - **节点**：`node exporter`（节点 `CPU`/内存/磁盘/网络），节点 `Ready` 状态/`NotReady` 告警。
    - **② 资源使用**
        - **节点**：`CPU`/内存使用率、磁盘使用/`inode`（`DiskPressure`）、负载——`node_exporter`。
        - **`Pod`**：`Pod` `CPU`/内存（`Metrics Server`/`cAdvisor`），`requests`/`limits` 使用率（`HPA` 判断）。
    - **③ 工作负载/`Pod` 状态**
        - **`Pod` 状态**：`kube-state-metrics`（`Pod` 状态数 `Running`/`Pending`/`CrashLoop`/`OOMKilled`、重启次数）——**`Pod` 重启/`OOM`/`CrashLoopBackOff` 是重点**。
        - **`Deployment`/`ReplicaSet`**：副本数（期望 vs 实际，`kube_deployment_status_replicas`）、`HPA`（是否扩缩）。
        - **容器**：`kube_pod_container_status_restarts`（重启）、`kube_pod_container_status_terminated_reason`（`OOM`/`Error`）。
    - **④ 网络/应用/存储**
        - **`Ingress`/`Service`**：请求数/`5xx`/延迟（`nginx-ingress` 指标）、`Service` `Endpoint`。
        - **存储 `PVC`**：`PVC` 容量/状态、`PV` 用量、`StorageClass`（`kube_persistentvolume`）、`CSI` 卷。
        - **应用**：业务自定义指标（`9xx`/业务 `KPI`）——`custom`/`app` 指标。
    - **一句话理解**
        - 监控像"**小区物业监控**"——①看物业总部（`API Server`/`etcd`/调度）正常吗 ②看各楼资源（节点 CPU/磁盘）够吗 ③看每家（`Pod`）状态（重启/`OOM`/正常）④看楼门口流量/储藏室（`Ingress`/`PVC`）——**四层都盯住**。

- **协助记忆**
    - 口诀：“**监控四层：控制面（apiserver/etcd）、资源（Node/Pod CPU内存磁盘）、工作负载（Pod 状态/重启/OOM）、网络存储（Ingress 5xx/PVC）——Prometheus + Grafana**”。
    - 一句话：“**K8s 监控 = 控制面健康 + 资源使用 + Pod 状态 + 网络/存储，四层都要看**”。

- **进阶思考**
    - **最需要告警的"关键指标"是哪些（优先级）？**
        - **①`etcd` 不可用/`db size` 超**（集群核心）②**节点 `NotReady`**（可用性）③**`Pod` `OOM`/`CrashLoopBackOff` 频繁**（业务）④**`DiskPressure`/磁盘满** ⑤**`API Server` 5xx/延迟高** ⑥**`HPA` 无法获取指标/扩不了**——这些是"集群/业务受影响"的高危告警，优先。
    - **大集群监控怎么扩展（扛住指标量）？**
        - 单 `Prometheus` 抓全部节点/Pod 指标**扛不住**——用 `Thanos`/`VictoriaMetrics`（水平扩展 + 长期存储）/按区域多 `Prometheus` 联邦——大集群监控要**水平扩展**。

- **扩展信息**
    - **`Prometheus` 生态**：`kube-state-metrics`（集群对象状态）、`node_exporter`（节点）、`cAdvisor`/`Metrics Server`（`Pod` 资源）、`blackbox_exporter`（探活）、`Thanos`/`Grafana`（展示/扩展）。
    - **告警**：`Alertmanager`（路由/通知）、告警规则（`5xx`/重启/`OOM`/`NotReady`/`etcd`）。
    - **参考**：`kubectl top node/pod`、`Prometheus` `Grafana` 面板、`kube-state-metrics`。

## 🤔 K8s 巡检都会做哪些项目？ 
- **`K8s` 巡检（日常体检）覆盖：①集群健康（节点/控制面/`etcd`）②资源使用（节点/Pod `CPU`/内存/磁盘）③工作负载（`Pod` 重启/`OOM`/异常、`Deployment` 状态）④网络/存储（`Ingress`/`Service`/`PVC`）⑤安全（`RBAC`/证书）。用 `kubectl` 命令 + 脚本 + `Prometheus`。核心：“巡检 = 看健康、看资源、看 Pod、看网络存储安全——发现问题提前处理”。**
    - **① 集群健康（控制面/节点）**
        - **`kubectl get nodes`**：节点状态（`Ready`/`NotReady`）、`kubectl describe node`（`Conditions` 各压力）。
        - **控制面**：`kube-apiserver`/`etcd`/`scheduler`/`controller-manager` 状态（`kubectl get componentstatus` 旧/`kubectl get --raw /readyz`、`etcdctl endpoint health`）、`etcd` 备份/健康。
        - **证书**：`kubeadm certs check-expiration`（证书到期提醒）。
    - **② 资源使用**
        - **`kubectl top node/pod`**：节点/Pod `CPU`/内存使用（`Metrics Server`）；看是否接近极限（`requests`/`limits` 超）。
        - **磁盘**：节点磁盘使用率（`DiskPressure`）、镜像/日志占用；`kubectl describe node` 看压力。
    - **③ 工作负载/`Pod`**
        - **`kubectl get pods -A`**：`Pod` 状态（`Running`/`Pending`/`CrashLoopBackOff`/`Evicted`/`OOMKilled`）——重点看异常 `Pod`。
        - **`kubectl get deploy/sts/ds -A`**：`Deployment` 副本是否齐（期望 vs 实际）、滚动更新卡住。
        - **重启次数**：`kubectl get pods -A | grep -v Running`（异常 `Pod`）、`kubectl describe pod`（`OOM`/`CrashLoop`）。
    - **④ 网络/存储**
        - **`Ingress`/`Service`/`Endpoints`**：`Ingress` 是否正常、`Service` `Endpoints` 有无后端（`kubectl get endpoints`）、`kubectl get ingress -A`。
        - **`PVC`/`PV`**：`kubectl get pvc -A`（`Bound`/`Pending`/`Lost`）、`PV` 容量/`reclaimPolicy`；存储健康。
        - **`DNS`**：`CoreDNS` `Pod` 状态、`kubectl get pods -n kube-system`（`kube-dns`）。
    - **⑤ 安全/其他**
        - **`kubectl get secrets`/`RBAC`**（`kubectl get role/clusterrole`）、`kubectl auth can-i` 抽查权限；**证书**（组件/`kubelet` 到期）。
        - **事件**：`kubectl get events --sort-by=.metadata.creationTimestamp`（看异常事件——排障线索）。
        - **镜像/资源**：`kubectl get pods -A | grep -E 'ImagePull|Crash'`、`kubectl get node -o wide`。
    - **一句话理解**
        - 巡检像"**小区物业每日查楼**"——看全楼（节点）健康、每户（`Pod`）状态（有没有跳闸 `OOM`/反复重启）、楼道水电（网络/存储/`Ingress`）、门禁（`RBAC`/证书）、杂物（事件/异常）——**每天巡检 + 告警**提前发现隐患。

- **协助记忆**
    - 口诀：“**巡检 = 节点健康 + 资源 CPU/内存/磁盘 + Pod 状态（CrashLoop/OOM/Pending）+ 网络存储（Ingress/PVC）+ 安全（证书/RBAC）——kubectl get + describe + top**”。
    - 一句话：“**K8s 巡检看节点、资源、Pod、网络存储、安全五块**”。

- **进阶思考**
    - **巡检发现异常 `Pod`/`节点` 怎么处理？**
        - ①`CrashLoopBackOff`/`OOM`：看日志/`describe`（`OOMKilled` 调 `limits`/排查泄漏、`CrashLoop` 修配置/依赖）②`Pending`：看调度事件（资源/污点/卷）③`NotReady`：查 `kubelet`/磁盘 ✔④`Evicted`：节点压力（清磁盘/扩容）——**读到问题对症处理，预防 > 救火**。
    - **巡检要不要自动化？**
        - 要——用**脚本/`Prometheus` 告警 + 巡检脚本**（定期 `kubectl get` 汇总 + 告警），比人肉巡检高效；`kube-bench`（安全基线）/`kube-state-metrics`（自动采集）/`Prometheus` 告警规则。

- **扩展信息**
    - **巡检命令**：`kubectl get nodes/pods/deploy/sts/ds/pvc/ingress/events -A`、`kubectl top`、`kubectl describe node/pod`、`kubectl get componentstatus`。
    - **工具**：`kubectl`、`Prometheus` + `kube-state-metrics`（自动状态）、`kube-bench`（安全基线）、巡检脚本（`shell`/`python`/`cron`）。
    - **巡检脚本**：汇总 `get` + `top` + 告警，`cron` 定时跑。

## 🤔 KubeVirt 了解过吗？ 
- **`KubeVirt` 是让 `K8s` 能运行传统虚拟机（`VM`）的插件——用 K8s 的方式（`CRD`/`Pod`）管理虚拟机（不像 `Web` 服务是容器，是完整 OS 的 `VM`）。核心：“KubeVirt 把 VM 变成 K8s 的“一等公民”资源——用 `kubectl` 管理虚拟机（`VMI`），K8s 上同时跑容器 + VM”。**
    - **解决什么问题**
        - 有些应用**不能容器化**（老系统/需要完整 OS/内核/`Windows`）——`KubeVirt` 让这些**传统 VM** 也能用 `K8s` 编排管理（运维统一：`kubectl` 管容器 + VM）。
        - 来源：管理**现有 VM** 迁移到 K8s（`VM` 化应用上云），或混合（容器 + VM 同集群统一管理）。
    - **核心概念（`VMI`）**
        - **`VMI`（`VirtualMachineInstance`）**：一个运行的 **虚拟机实例**（`CRD`）——K8s 把它当类似 `Pod` 的资源管理（创建/启停/访问）。
        - **`VirtualMachine`（`VM`）**：声明 VM 的模板（镜像/磁盘/`CPU`/内存）——类似 `Deployment`（声明要什么 VM）。
        - **`VMI` 底层**：容器里跑的"虚拟机"（`kubevirt` 用 `libvirt` 在容器里跑 VM），有 `VM` 的 CPU/内存/磁盘（虚拟化）。
    - **`KubeVirt` 怎么工作**
        - 用 **`CRD`**（`VirtualMachine`/`VMI`）声明 VM → 控制器在 K8s 里创建 VM（`VMI`），用 `libvirt`/`KVM`（虚拟化）在节点上跑 —— VM 有**独立 OS/内核**（像真机），但被 K8s 管理（`kubectl` 创建/启停/调度）。
        - `Pod`（`virt-launcher`）承载 VM（容器里跑 VM，用了宿主机的虚拟化能力）；`VM` 访问用 K8s `Service`/`Ingress`。
    - **适用场景**
        - ①**传统应用**（`Windows`/老系统/内核相关）不想/不能容器化，用 `KubeVirt` 上 K8s 统一管理。②**混合工作负载**（同一集群容器 + VM）统一 `kubectl`/CI/CD。③**开发/测试环境**（VM 也纳入 K8s 编排）。"
        - 替代：`Virt` 方案（`KubeVirt` vs `OpenStack` vs 普通 `VM`）。
    - **一句话理解**
        - `KubeVirt` 像"**把 K8s 变成能开虚拟机的大楼**"——之前 `K8s` 只能跑"集装箱"（容器），`KubeVirt` 让它也能开"独立房间"（VM，有自己操作系统）；物业（K8s）统一管集装箱房 + 独立房——**容器和 VM 都能用 `kubectl` 管**。

- **协助记忆**
    - 口诀：“**KubeVirt = K8s 跑虚拟机——VMI（虚拟机实例）/VM（模板），用 kubectl 管 VM，容器 + VM 统一**”。
    - 一句话：“**KubeVirt 让 K8s 能管传统虚拟机——容器化不了的用它**”。

- **进阶思考**
    - **`KubeVirt` 和容器（普通 `Pod`）区别？**
        - 容器：共享**宿主机内核**（轻量、启动快、隔离差一点）；VM：**独立 OS/内核**（隔离好、兼容老系统/任意 OS、但重）。`KubeVirt` 跑 VM（独立 OS），`Pod` 跑容器（共享内核）——要"完整 OS/老应用/Windows" 用 `KubeVirt`，轻量应用用容器。
    - **`KubeVirt` 适合什么场景（用什么不用什么）？**
        - 用：**传统 VM 要上 K8s 统一管理**（老系统、`Windows`、内核相关、不能容器化）——`KubeVirt` 让它们享受 K8s 编排/调度/高可用。**
        - 不用：纯容器应用（就正常 `Pod` 轻量）；大规模 VM（可能 `OpenStack`/`VM` 平台更成熟）——`KubeVirt` 是"VM 融入 K8s"的场景。"

- **扩展信息**
    - **组件**：`virt-controller`/`virt-api`/`virt-handler`/`virt-launcher`（K8s 插件），`CRD`（`VirtualMachine`/`VMI`），`libvirt`/`KVM`（虚拟化）。
    - **生态**：`KubeVirt`（`CNCF` 项目），`Containerized Data Importer`（`CDI`——镜像/磁盘导入）。
    - **参考**：`kubectl get vmi`（虚拟机实例）、`virtctl`（VM 管理工具，类似 `kubectl`）。

## 🤔 K8s 多集群统一管理怎么做？ 
- **`K8s` 多集群统一管理（多个集群一个平台管）：①多集群管理工具（`Rancher`/`KubeSphere`/`karmada`）②`kubectl` 上下文（`kubectl config` 切换多集群凭证）③`Argo CD`（`GitOps` 多集群部署）④`Istio`/服务网格（跨集群服务）⑤统一入口（`Gateway`/`多集群`）。**
    - **多集群统一管理工具（主流）**
        - **`Rancher`/`KubeSphere`**：多集群管理控制台（纳管多个集群——导入/统一查看/`RBAC`/监控），一套 Web 管多个 `k8s`。
        - **`karmada`（`CNCF`）**：**多集群编排**（一套资源部署到多个集群——`K8s` 资源分发/`federation` 新思路）。
        - **`kubefed`（联邦）**：老联邦方案（`K8s` 联邦 `v2`），兼容性一般；`karmada` 是主流。
    - **`kubectl` 上下文（轻量）**
        - **`kubectl config get-contexts`/`use-context`**：管理多集群凭证（不同集群 `kubeconfig`），切换 `context` 操作不同集群——最简单的多集群"管理"（但人肉切换）。
        - **`kubectl config`**：`kubeconfig` 文件含多个 `cluster`/`context`（`--kubeconfig` 指定）。
    - **`Argo CD`（`GitOps` 多集群部署）**
        - `Argo CD` 管理**多个集群**（`cluster` 添加）：`Git` `repo` 声明应用 → `Argo CD` 同步部署到**一个/多个集群**（多集群 `GitOps`，声明式、自动同步）。
        - 适合：统一发布（多集群服务/应用统一部署）。
    - **服务网格/跨集群**
        - **`Istio` 多集群**（`service mesh` 跨集群服务发现/流量）；`Gateway API` 多集群；`Linkerd` 多集群。
    - **统一管理要点**
        - **统一入口/控制面**（多集群 `dashboard`/`Argo`），**统一 `RBAC`/审计**（多集群访问控制），**统一监控**（多集群 `Prometheus` 聚合/`Thanos`），**统一发布**（`GitOps`/多集群编排）。
        - **多集群高可用**（跨集群容灾/``双活``）、**网络互通**（`Cilium` 多集群/`Submariner`）。
    - **一句话理解**
        - 多集群管理像"**总部 + 多家分店**"——总部（管理平台：`Rancher`/`Argo CD`）统一看各家（集群）状态、统一发指令（部署/权限），或用一个"店长地图"（`kubectl` 上下文）切换管理；`karmada` 是"总部统一调度货到多家店"（一套资源分发多集群）。**

- **协助记忆**
    - 口诀：“**多集群统一管理：Rancher/KubeSphere（控制台）、kubectl context（切换）、Argo CD（GitOps 多集群）、karmada（多集群编排）、Istio（跨集群）**”。
    - 一句话：“**多集群 = 一个平台管多个集群——运维统一看、部署统一发**”。

- **进阶思考**
    - **`kubectl` 多集群 vs `Rancher` 多集群管理？**
        - `kubectl` context 是**手工切换**（人肉，适合少集群/临时）；`Rancher`/`KubeSphere` 是**平台统一管**（一套 `Web` 纳管多集群——统一查看/`RBAC`/监控/巡检，适合多集群生产）。
        - 多集群多 → 用管理平台（`Rancher`），少集群/临时 → `kubectl` context。
    - **多集群做容灾/高可用怎么搞？**
        - 跨集群备份/恢复（`Velero` 多集群）、`karmada`/多集群编排（应用跨集群），网络互通（`Submariner`/`Cilium` 多集群）——**多集群高可用/灾备是核心场景**（一个集群挂换另一个）。

- **扩展信息**
    - **工具**：`Rancher`、`KubeSphere`、`karmada`、`kubefed`、`Argo CD`、`Istio` 多集群、`Submariner`（跨集群网络）、`Cilium`（`ClusterMesh`）。
    - **统一可观测**：多集群 `Prometheus`/`Thanos`（聚合多集群指标）、`Loki`（多集群日志）。
    - **参考**：`kubectl config`、`kubectl config get-contexts`、多集群工具 `Web`。

## 🤔 Cilium 网络组件有什么优势？ 
- **`Cilium` 是基于 `eBPF` 的现代 `CNI` 网络插件，优势：①高性能（`eBPF` 内核数据面，替代 `iptables`，低延迟高吞吐）②细粒度网络策略（`L3/L4/L7` 应用层策略——按 DNS/HTTP/协议）③可观测强（`eBPF` 采集流量/指标，`Hubble` 可视化）④云原生/服务网格（`L7` 策略、`Service` 替代 `kube-proxy`、`Cilium` 支持多集群）。核心：“Cilium = eBPF 高性能 + 应用层网络策略 + 深度可观测”。**
    - **① 高性能（`eBPF` 数据面）**
        - 用 **`eBPF`**（内核可编程）做转发/负载均衡——**替代 `kube-proxy`**（`iptables`），**低延迟、高吞吐、可扩展**（`eBPF` 在内核、少拷贝/免内核态-用户态切换）。
        - `eBPF` 数据面（`BPF` 程序）处理 `Service`/流量——比 `iptables`/`IPVS` 更高效。
    - **② 细粒度网络策略（应用层）**
        - 网络策略不只 `L3/L4`（IP/端口），`Cilium` 支持 **`L7`**（`HTTP`/`gRPC`/`kafka`/`DNS` 等应用层策略）——如"只允许 `GET /api`"、"只允许访问某域名"、`DNS` 策略（哪些域名）。
        - **`CiliumNetworkPolicy`**（`CRD`）——比 Kubernetes 原生 `NetworkPolicy`（`networking.k8s.io`）更细（应用层、身份 `identity` 而不是 IP）。
    - **③ 可观测（`Hubble`）**
        - `eBPF` 采集**流量/连接/事件**（`Hubble`）——可视化服务间通信（`Service Map`）、请求/延迟/`etcd` 指标、`DNS` 日志——**深度的可观测（不像传统只 `tcpdump`/采样）**。
        - **`cilium monitor`/`hubble`** 看流量/指标。
    - **④ 云原生/服务网格/多集群**
        - `Cilium` 可**替代 `kube-proxy`**（`Service` 用 `eBPF` 实现）；支持**透明加密**（`IPsec`/`WireGuard`）、**`Service` 网格**（`Cilium` 能做 `L7`/``load-balancing`）——`Cilium` 是"网络 + 安全 + 可观测"一体。
        - **多集群**（`ClusterMesh`）跨集群网络/`Service`；与 `K8s` 原生集成（`CNI` 插件）。
    - **一句话理解**
        - `Cilium` 像"**用了智能机器人的大楼网络**"——机器人（`eBPF`）在内核高效处理（替代保安 `iptables` 人工查——更快更准），能**按应用层规则**（只放行 `GET /api`/某域名）精细管控，还**全程摄像**（`Hubble` 可观测）——**高性能 + 细粒度 + 可观测**。

- **协助记忆**
    - 口诀：“**Cilium 优势：eBPF 高性能（替代 kube-proxy）、L7 应用层策略、Hubble 可观测、多集群**”。
    - 一句话：“**Cilium = eBPF 快 + 应用层策略 + 深度可观测**”。

- **进阶思考**
    - **`Cilium` 和 `Calico`/`Flannel` 怎么选？**
        - `Cilium`：**`eBPF` 高性能**（大集群/高吞吐）、**`L7` 应用层策略**（细粒度安全）、**可观测强**（`Hubble`）——现代化/高性能/安全需求选 `Cilium`；`Calico`：`BGP` + 网络策略（`L3/L4`）成熟稳定；`Flannel`：简单（无网络策略）。**要高性能 + 细粒度策略 + 可观测 → `Cilium`**。
    - **为什么 `eBPF` 比 `iptables` 好？**
        - `eBPF` 在内核**可编程**（加载 `BPF` 程序处理包）、**少数据拷贝/免系统调用**（数据面加速）；`iptables` 是**规则链匹配**（`O(n)`、用户态/内核态切换）——`eBPF` 更快、可扩展、低开销（大集群/高并发优势）。

- **扩展信息**
    - **组件**：`cilium-agent`（每节点，`eBPF` 数据面）、`cilium-operator`（集群级）、`Hubble`（可观测）、`CiliumNetworkPolicy`（`CRD`）。
    - **特性**：`L3/L4/L7` 网络策略、透明加密（`IPsec`/`WireGuard`）、`Service`（替代 `kube-proxy`）、`ClusterMesh`（多集群）、`eBPF` 可观测。
    - **参考**：`cilium status`、`kubectl get ciliumnetworkpolicy`、`hubble`。

## 🤔 Cilium 有哪几种工作模式及原理？ 
- **`Cilium` 工作模式分两级：数据面（`eBPF` 数据面（默认，内核加速——`KubeProxyReplacement`）与 `legacy` 数据面）和路由模式（`overlay`（`VXLAN` 覆盖）与 `native-routing`（`BGP` 原生路由，跨 node 直连））——二者正交（默认即 `eBPF` 数据面 + `overlay` 路由；要高性能跨网络可 `native-routing`+`eBPF`）。核心：“Cilium 默认 eBPF 数据面；overlay（隧道）或 native-routing（BGP）是路由模式，与数据面正交”。**
    - **① `eBPF` 数据面（`KubeProxyReplacement`）**
        - `Cilium` 用 **`eBPF`** 实现 `Service` 负载均衡/转发（`KubeProxyReplacement` 替代 `kube-proxy`）——`eBPF` 在内核处理（高效），`Service`/`Pod` 流量数据面加速。"
        - 是 `Cilium` 的核心（默认/推荐），高性能、可扩展。
    - **② `overlay`（`VXLAN` 覆盖）**
        - 跨节点 `Pod` 通信用 **`VXLAN` 覆盖网**（`overlay`，`UDP` 封装）——适合**不支持三层互通**的环境（跨机房/网络），封装传输。
        - `Pod` `IP` 在覆盖网内（`Pod` 通透）。
    - **③ `native-routing`（`BGP`/原生路由）**
        - **`native-routing`**：`Pod` 用节点网络（`BGP` 路由/`IP` 直连——`BGP` 非强制，也可静态路由/节点默认网关直连）跨节点——**高性能**（不走封装），但要求节点网络三层互通。
        - 类似 `Calico` `BGP` 模式（`Pod` 网段 `BGP` 通告、跨 `node` 路由直连）。
    - **④ `tunnel`/`direct`（以及路由模式）**
        - `tunnel`（隧道覆盖）；`direct`/`native`（直接路由）；`Cilium` 的 `ipam`/`routing-mode` 配置。
        - `Cilium` 路由模式：`tunnel`/`native`（`vxlan`/`geneve` 覆盖 vs `BGP` 原生），`Encapsulation`/`routing-mode`。
    - **核心原理（`eBPF` 数据面）**
        - `eBPF` 程序加载到**内核**（节点），拦截转发 `Pod`/`Service` 流量（`eBPF` `TC`/`XDP`），`Service` `load-balancing` 在内核做（无 `kube-proxy` `iptables`）。
        - **网络策略**用 `eBPF`（`BPF` 程序）实现 `L3/L4/L7`（应用层），身份标识（`identity`）做访问控制（不靠 IP）。
    - **一句话理解**
        - `Cilium` 工作模式像"**快递网络怎么送**"——`eBPF` 是"智能分拣机"（内核加速）；`overlay`（`VXLAN`）是"跨区打包投递"（封装）；`native-routing`（`BGP`）是"专线直连"（原生路由、快）；`Cilium` 默认用智能分拣机（`eBPF`）+ 按网络情况选覆盖/直连。**

- **协助记忆**
    - 口诀：“**Cilium 模式：eBPF 数据面（默认，高性能）、overlay（VXLAN 覆盖）、native-routing（BGP 原生路由）——核心 eBPF + 覆盖/直连**”。
    - 一句话：“**Cilium = eBPF 加速 + overlay(隧道)/native-routing(BGP) 选网络模型**”。

- **进阶思考**
    - **`overlay` 和 `native-routing` 怎么选？**
        - `overlay`（`VXLAN`）：跨网络/不能三层互通用它（封装，简单但稍慢）；`native-routing`（`BGP`/原生）：节点网络互通/要求高性能用它（直连快但配 `BGP`/网络）。**同机房/网络互通 → native-routing（快）；跨网络/混乱 → overlay（简单）**。
    - **`Cilium` 怎么替代 `kube-proxy`（`KubeProxyReplacement`）？**
        - `Cilium` 的 `eBPF` 数据面实现 `Service` `load-balancing`/转发（`KubeProxyReplacement`）——不依赖 `kube-proxy` `iptables`，`eBPF` 直接在内核转发（更高效）——是 `Cilium` 性能优势来源（`--kube-proxy-replacement`）。

- **扩展信息**
    - **参数**：`routing-mode`/`ipam-mode`、`--kube-proxy-replacement`、`tunnel`/`encapsulation`（`vxlan`/`geneve`）、`native-routing`（`BGP`）。
    - **原理**：`eBPF`（`TC`/`XDP` 程序）内核转发、`Service` `L3/L4/L7` 策略、`Cilium` `CRD`。
    - **参考**：`cilium status`（看模式）、`cilium config`（dataplane）、`cilium-dbg`。

## 🤔 数据库是否适合部署在 K8s 上？ 
- **数据库部署 `K8s` 是“可以但要谨慎”：有状态应用（数据库要持久化/固定标识/有序）要用 `StatefulSet` + `PVC`/`Operator`（`etcd`/`MySQL Operator`），有运维自动化优势（调度/自愈/灰度/备份）；但数据库要求高（低延迟/强一致/数据安全），裸 `Deployment` 不合适（`Pod` 随机/无状态）。核心：“数据库上 K8s 用 StatefulSet + PVC + Operator，管理复杂有状态要专用方案；高性能/严苛数据要谨慎”。**
    - **适合 K8s 吗（两个观点）**
        - **适合（用对方式）**：`K8s` 编排（`StatefulSet` 固定标识、`PVC` 持久、`Operator` 自动化——`etcd`/`MySQL`/`Redis`/`Kafka` Operator）、高可用（副本/自愈/灰度）、云原生（`CSI` 存储、资源管理）。
        - **谨慎**：数据库**性能敏感**（低延迟/`IO`，`K8s` 上调度/网络/存储开销）、**数据安全**（`PVC` 冷/备份/一致性）、**有状态复杂**（`StatefulSet` 编排，裸 `Deployment` 会乱——无状态）。
    - **正确姿势（要满足）**
        - **①`StatefulSet`**（固定 `Pod` 名/身份，不是 `Deployment` 随机）**②`PVC`（持久卷）/`CSI` 存储**（数据持久，`StorageClass`/快照/备份）**③`Operator`**（`MySQL`/`Redis`/`Kafka` Operator——自动化主从/扩缩/备份/故障）**④`Headless Service`**（固定 DNS 名/节点发现）**⑤资源/反亲和**（`Pod` 稳定、`PVC` 专属）**⑥备份/快照**（`Velero`/`VolumeSnapshot`）。
    - **谁适合 / 谁谨慎**
        - **适合**：`Redis`/`MySQL` 从库/`Kafka`/`elasticsearch`/`etcd`（有 `Operator`/`StatefulSet` 方案、容忍调度）——**开发/测试/部分生产**。
        - **谨慎**：**核心/高并发/强一致** 数据库（金融/主库）。——`StatefulSet` + `Operator` + `PVC`/备份成熟才上；否则**裸机 / 云 RDS** 更稳（云数据库托管）。
    - **一句话理解**
        - 数据库上 `K8s` 像"**贵重的易碎品搬家**"——不是不能搬（`StatefulSet` 固定房间 + `PVC` 储物柜 + `Operator` 专业搬），但要**专业打包**（固定标识/持久/备份/自动化）；普通行李（无状态应用）随便搬，**贵重品（核心库）要么专业搬（`StatefulSet`+`Operator`）要么留在别处（云 RDS/裸机）**——**谨慎 + 专业方案**。

- **协助记忆**
    - 口诀：“**数据库上 K8s = StatefulSet（固定名）+ PVC（持久）+ Operator（自动化）+ Headless（固定 DNS）+ 备份——有状态复杂要专用方案；高性能核心库谨慎**”。
    - 一句话：“**数据库能用 K8s 但有状态要用 StatefulSet+PVC+Operator，核心库要有成熟方案**”。

- **进阶思考**
    - **为什么数据库不能用普通 `Deployment`？**
        - `Deployment` 是**无状态**（`Pod` 随机名/可任意删扩/数据不持久）——数据库要**固定节点身份**（主从/集群发现）、**持久数据**（`PVC`）、**有序**——普通 `Deployment` 会数据丢/节点乱/`Pod` 漂移。**要 `StatefulSet`（固定/持久/有序）+ `PVC`**。
    - **云 RDS 和自建库上 K8s 怎么选？**
        - 云 `RDS`（托管数据库）：**省运维/高可用/性能**（云厂商管），贵/锁厂商；自建库上 `K8s`（`StatefulSet`+`Operator`）：**自控/统一平台/数据不出门**，但运维复杂。**核心/性能要求高 → 云 RDS 或裸机自建；要统一 K8s 平台/内部数据 → K8s+`Operator`**。

- **扩展信息**
    - **`StatefulSet`/`PVC`/`Operator`**：库的 `K8s` 方案（`MySQL Operator`/`Redis Operator`/`etcd Operator`/`Kafka Operator`）；`CSI` 存储（`Ceph`/云盘）。
    - **备份**：`VolumeSnapshot`/`Velero`；数据库本身定时 `backup`（导出到对象存储）。
    - **参考**：`kubectl get statefulset`、`kubectl get pvc`、`kubectl get rediscluster`（`Operator` 资源）。

## 🤔 K8s 有哪些常见的存储方案？ 
- **K8s 存储方案（按存储类型）分：①本地卷（`emptyDir`/`hostPath`——临时/宿主机）②网络存储（`NFS`/`CephFS`——共享文件系统）③云盘（云厂商块存储——`AWS EBS`/阿里云盘）④对象存储（`S3`/`OSS`/`MinIO`——海量对象）⑤分布式存储集成（`Ceph RBD`/`GlusterFS`——`CSI`）。用 `PV/PVC` + `StorageClass` + `CSI` 接入。核心：“K8s 存储 = PV/PVC + StorageClass + CSI，本地/网络/云盘/对象/分布式按需选”。**
    - **按类型分（常见存储）**
        - **本地卷**（`emptyDir`/`hostPath`/`local`）：`Pod` 临时/宿主机存储——测试/单节点（不跨节点、不持久）。"
        - **网络文件系统**（`NFS`/`CephFS`）：多节点共享文件系统（`RWX` 多读多写）——共享目录/多 `Pod` 共享。
        - **云盘/块存储**（`AWS EBS`/阿里云盘/`GCE PD`）：**块存储**（`RWO` 单节点读写）——数据库/`Pod` 持久盘（`CSI` 驱动）。"
        - **对象存储**（`S3`/`OSS`/`MinIO`）：**对象存储**（海量、`HTTP` `S3`）——备份/静态资源/大数据（`PV` 不大用，`Pod` 用 `S3 SDK`）。"
        - **分布式存储**（`Ceph RBD`/`GlusterFS`）：`Ceph`（块/文件/对象）、`GlusterFS`（文件）——大规模/高可用（`Rook`/`CSI`）。"
    - **K8s 存储机制（接入方式）**
        - **`PV/PVC`**：`PV` 是存储资源、`PVC` 是申请单——`Pod` 用 `PVC` 绑 `PV`。
        - **`StorageClass`**：动态供给（写 `PVC` 自动建 `PV`）。
        - **`CSI`**：存储驱动（`NFS`/`Ceph`/云盘 `CSI`）——标准化接入。
    - **选型（按场景）**
        - 临时/单节点 → `emptyDir`/`hostPath`/`local`；共享多节点 → `NFS`/`CephFS`；数据库/`Pod` 持久 → 云盘/`Ceph RBD`（`RWO`）；海量对象 → `S3`/`MinIO`；大规模高可用 → `Ceph`（`Rook`）。
    - **一句话理解**
        - K8s 存储像"**搬家时选存储方式**"——临时放（`emptyDir`）、自家墙挂（`hostPath`/local）、共享仓库（`NFS`/`CephFS`）、专属保险柜（云盘/`Ceph RBD`、单节点）、云端大仓库（`S3`/`MinIO` 对象）；**先用 `PV/PVC`（储物柜/申请单）+ `StorageClass`（按需领）+ `CSI`（供货商）** 管理。

- **协助记忆**
    - 口诀：“**存储：本地（emptyDir/hostPath/local）、网络（NFS/CephFS）、云盘（块 RWO/CSI）、对象（S3/MinIO）、分布式（Ceph）——PV/PVC + StorageClass + CSI**”。
    - 一句话：“**K8s 存储 = PV/PVC + StorageClass + CSI，本地/网络/云盘/对象/分布式选**”。

- **进阶思考**
    - **`RWO`/`RWX` 访问模式怎么选？**
        - **`RWO`（`ReadWriteOnce`）**：单节点读写——数据库/`Pod` 持久盘（一个 `Pod` 挂）。
        - **`RWX`（`ReadWriteMany`）**：多节点读写——共享文件/多 `Pod` 共享（如 `NFS`/`CephFS`）。
        - **`ROX`（`ReadOnlyMany`）**：多节点只读——配置/只读数据。按是否需要多节点共享选（数据库要 `RWO`，共享目录要 `RWX`）。
    - **数据库上 K8s 用什么存储？**
        - 数据库要 **块存储**（`RWO`、低延迟）——云盘（`CSI`）或 `Ceph RBD`（`CSI`）+ `PVC` + `StorageClass`（`RWO`）——`PVC` 持久、低延迟；别用 `NFS`（`NFS` 延迟高、不适数据库）。

- **扩展信息**
    - **存储生态**：本地（`emptyDir`/`hostPath`/`local`）、`NFS`/`CephFS`、云盘（`EBS`/云 `CSI`）、对象（`S3`/`MinIO`）、`Ceph`（`Rook`）、`GlusterFS`、`Longhorn`（`Rancher` 的分布式块存储）。
    - **`CSI` 驱动**：`nfs.csi.k8s.io`、`rbd.csi.ceph.com`、`ebs.csi.aws.com`、`disk.csi.alibabacloud.com`。
    - **参考**：`kubectl get sc/pvc/pv`。

## 🤔 kube-proxy iptables 模式如何实现的负载均衡？ 
- **`kube-proxy` 的 `iptables` 模式用 `iptables` NAT 规则实现 `Service` 负载均衡：`kube-proxy` 监听 `Service`/`Endpoint`变化，为每个 `Service` 写 `iptables` 规则（`DNAT` 转发 + `随机/概率`分发到后端 `Pod`），访问 `Service` 的流量被 `iptables` 随机转发到一个后端 `Pod`。核心：“iptables DNAT 规则 + 随机概率选后端 Pod——流量分发（非轮询）”。**
    - **工作流程**
        - **① `kube-proxy`**（每个节点）**监听 `Service`/`Endpoint（EndpointSlice）变化**，生成 `iptables` 规则（`KUBE-SERVICES`/`KUBE-SVC-*`/`KUBE-SEP-*` 链）。
        - **② 给每个 `Service` 建 `iptables` 链**：`KUBE-SERVICES` → `KUBE-SVC-<hash>`（服务链）→ `KUBE-SEP-<hash>`（后端链，每个 `Pod` 端点一个）。
        - **③ `DNAT`/随机分发**：在 **`KUBE-SVC` 链** 用 **`-m statistic --mode random --probability`** 做**随机概率**分发到各后端 `KUBE-SEP` 链，`KUBE-SEP` 链内做 `DNAT --to-destination` 转发——访问 `Service` 的流量（`DNAT` 改写 `Pod IP:Port`）**随机/概率**转发到某个后端 `Pod`（**不是轮询**，是随机概率）。
        - **④ 后端不健康剔除**：`readiness` 失败的 `Pod` 从 `Endpoint` 剔除（规则移除）。
    - **负载均衡策略（iptables 是随机/概率）**
        - `iptables` 模式：每个后端 `Pod` 在 `KUBE-SEP-*` 链里用 **`statistic` 模块和 `--probability`**（随机概率）——流量大致**均分**到各后端（随机、非轮询）。
        - 默认 `iptables` 用 **`--probability`** 随机；`IPVS` 支持 `rr`（轮询）/`wrr`（加权）/`lc`（最少连接）等——**iptables 是随机、IPVS 是明确算法**。
    - **`iptables` 模式特点/局限**
        - **特点**：内核 `iptables`（`kernel` 处理），无需额外模块（系统自带）；小巧（默认、简单）。
        - **局限**：规则多时（大集群 `Service`/`Endpoint` 多） `iptables` 链长（`O(n)` 匹配），**性能略降**；只支持随机概率（非轮询/加权）——大集群/要多种调度用 `IPVS`。
    - **一句话理解**
        - `iptables` 负载均衡像"**前台分信（多个收信人）**"——`kube-proxy` 挂一张"分信表"（`iptables` 规则：`Service` 地址 → 抽一个后端 `Pod`），来访的信（请求）按表**随机抽一个**后端送（`--probability`）；表自动更新（`Pod` 增减）。缺点是表长了（大集群）查得慢（`O(n)`），想要"轮流分/按权重分"（轮询/加权）用 `IPVS`（电子分信机）。**

- **协助记忆**
    - 口诀：“**iptables NAT + 随机概率分发后端 Pod — Service 链 → 后端链（--probability），非轮询；大集群/要算法用 IPVS**”。
    - 一句话：“**iptables 是随机概率分流量（DNAT 规则），IPVS 才支持轮询/加权**”。

- **进阶思考**
    - **为什么 `iptables` 不是轮询？**
        - `iptables` 的 `statistic`/`--probability` 是**随机**选择（每个包随机命中某个 `KUBE-SEP` 规则），不是轮询（顺序转发）；实现轮询/加权要用 **`IPVS`**（内核支持 `rr`/`wrr`/`lc`）——`iptables` 是概率、`IPVS` 是调度算法。
    - **大集群（`Service`/`Pod` 多）`iptables` 会慢吗？**
        - 会——`iptables` 规则**链式匹配**（`KUBE-SERVICES` → `KUBE-SVC` → `SEP`，规则多 `O(n)` 遍历/匹配），`Service`/`Endpoint` 多时**性能下降**；大集群用 **`IPVS`**（`hash` 查找，更快）——所以大集群/高并发推荐 `kube-proxy --proxy-mode=ipvs`。**

- **扩展信息**
    - **`iptables` 链**：`KUBE-SERVICES`、`KUBE-SVC-<hash>`（服务链）、`KUBE-SEP-<hash>`（后端链）、`KUBE-MARK-*`（标记）。
    - **`IPVS` 调度算法**：`rr`/`wrr`/`lc`/`wlc`/`sh`/`maglev`——比 `iptables` 明确、性能好。
    - **参考**：`kube-proxy --proxy-mode=iptables/ipvs`、`kubectl get svc`、`kube-proxy` 日志。

## 🤔 Gateway 是什么？如何迁移现有 Ingress？ 
- **`Gateway API` 是 `Ingress` 的演进/更标准的 Ingress API（`v1.0` GA，2023）：更统一/多协议/可扩展（不再只 `Ingress` 的 `HTTP`，支持 `TCP`/`gRPC` 等），用 `GatewayClass`（controller）/`Gateway`（入口）/`HTTPRoute`（路由）三层。迁移 `Ingress` → `Gateway` 用 `HTTPRoute`（类似 `Ingress` 规则），逐步/`Gateway` 支持 `Ingress` 兼容。核心：“Gateway API = Ingress 的现代标准版，用 HTTPRoute 表达路由，从 Ingress 迁移（网关/路由拆分）”。**
    - **`Gateway API` 是什么**
        - Kubernetes 的**新 Ingress API**（`Ingress` 的演进），更**标准化/可扩展**（`v1.0` GA）。比 `Ingress` 强：**多协议**（`HTTP`/`gRPC`/`TCP`/`TLS`）、**可扩展**（`GatewayClass` 指定 controller）、更灵活（`Gateway`/`Route` 分离）。
    - **三层资源（`Gateway` API 模型）**
        - **`GatewayClass`**：`Gateway` 的 "controller"（`nginx`/`istio` 等）——类似 `IngressClass`。
        - **`Gateway`**：集群**入口**（`Listener`：端口/协议/证书）——类似 `Ingress` 的入口定义。
        - **`HTTPRoute`**：**路由规则**（`host`/`path` → 后端 `Service`）——类似 `Ingress` 的规则（`rules`）。
        - 关系：`GatewayClass`（用什么网关）→ `Gateway`（入口）→ `HTTPRoute`（路由到 `Service`）。
    - **从 `Ingress` 迁移**
        - **① 理解映射**：`Ingress`（`host`/`path`/`tls`/`backend`）→ `HTTPRoute`（`hostnames`/`matches`/`backendRefs`）+ `Gateway`（入口/`TLS`）。
        - **② 创建 `Gateway`**（`listeners`：`HTTPS` 端口、证书）+ **`HTTPRoute`**（`hostnames`/`path`/`backendRefs` 到 `Service`）——替代 `Ingress` 规则。
        - **③ 统一 controller**：`GatewayClass` 指定（`nginx`/`istio`/`Cilium`），`Gateway` 支持的多协议/多 controller。
        - **④ 兼容性**：部分 `Ingress` 注解（`nginx` `canary` 等）在 `Gateway` 用**扩展**（`Gateway` 的 `HTTPRoute` `filters`/`policy` 实现——`Traffic` 等）——可能要改注解。
        - **⑤ 双跑/过渡**：`Gateway` + `Ingress` 可以**共存**（旧 `Ingress` 保留、新 `Gateway` 加，逐步迁）——**灰度迁移**（避免一次性断）。
    - **一句话理解**
        - `Gateway API` 像"**Ingress 的升级版**"——`Ingress` 是"前台只懂 HTTP 域名/路径"（`host`/`path`），`Gateway` 是"更智能的前台"（多协议 `HTTP`/`gRPC`/`TCP`，更标准，`Gateway` 定门口 + `HTTPRoute` 定引导）——从 `Ingress` 迁过去，把 `Ingress` 规则映射成 `Gateway`+`HTTPRoute`，**逐步迁、双跑过渡**。

- **协助记忆**
    - 口诀：“**Gateway API = Ingress 升级版——GatewayClass（controller）/Gateway（入口）/HTTPRoute（路由），从 Ingress 映射（host→hostnames/path→matches）、双跑过渡**”。
    - 一句话：“**Gateway 是 Ingress 的现代标准——用 Gateway+HTTPRoute，从 Ingress 迁移（映射+灰度）**”。

- **进阶思考**
    - **`Gateway API` 和 `Ingress` 核心区别？**
        - `Ingress`：**只管 `HTTP/HTTPS`**（`host`/`path`），单一资源；`Gateway`：**多协议**（`HTTP`/`gRPC`/`TCP`/`UDP`）+ **分层**（`Gateway` 入口 + `HTTPRoute` 路由分离）+ **可扩展**——更适合现代（`gRPC`/服务网格/多协议）和更细粒度（`Gateway` 与 `Route` 分离管理）。
    - **迁移 `Ingress` 到 `Gateway` 要改什么（最注意）？**
        - 主要是**规则映射**：`Ingress` 的 `host/path/backend` → `HTTPRoute` 的 `hostnames/matches/backendRefs`；`Ingress` 的**注解**（`canary`/`rewrite`/`proxy-body-size` 等）在 `Gateway` 用**扩展 `filters`/策略**实现（可能改写法）；`TLS` 从 `Ingress` `tls` 移到 `Gateway` `listeners`——**逐条迁移 + 验证**。

- **扩展信息**
    - **资源**：`GatewayClass`/`Gateway`/`HTTPRoute`（`v1.0` GA）、`TCPRoute`/`GRPCRoute` 等（多协议）；`Controller`：`nginx`/`Istio`/`Cilium`/`Traefik`（`Gateway` 兼容）。
    - **命令**：`kubectl get gatewayclass/gateway/httproute`、`kubectl apply`（YAML `Gateway`/`HTTPRoute`）。
    - **参考**：`Gateway API` 官网/`k8s.io/api/gateway`（`v1.0`）、`Ingress` 兼容性/`Controller` 迁移。

## 🤔 K8s 容器运行时怎么选择？ 
- **`K8s` 容器运行时（`Container Runtime`，`CRI` 兼容）：`containerd`（`CNCF`、推荐、`k8s` 默认）、`CRI-O`（`Red Hat`/`OpenShift` 用）、`Docker`（内置 `containerd`，`k8s 1.24` 移除 `dockershim`）、`Kata`（安全隔离）。选：`containerd` 主流（轻量/高性能）、`CRI-O`（`OpenShift`）、`Kata`（强隔离）。核心：“containerd 是 k8s 默认主流运行时；dockershim 已移除；要强隔离用 Kata”。**
    - **什么是容器运行时**
        - 负责**真正拉镜像/创建/运行容器**的引擎（`kubelet` 通过 **`CRI`（Container Runtime Interface）** 调用它）——`Pod` 的底层执行者。
    - **主流运行时（选型）**
        - **`containerd`**（`CNCF`）：**K8s 默认推荐**，轻量、高性能、`CRI` 兼容（`kubelet` 直接调 `containerd`）——生产主流。
        - **`CRI-O`**（`Red Hat`）：`OpenShift` 默认，`CRI` 兼容、轻量（`oci` 规范）——`RHEL`/`OpenShift` 生态。
        - **`Docker`（内置 `containerd`）**：`Docker` 底层也用 `containerd`；`k8s` 的 **`dockershim`（`v1.24` 移除）**——现代 `k8s` 不用 `dockershim`，直接 `containerd`/`CRI-O`。
        - **`Kata Containers`**：**安全隔离**（轻量 VM，`VM` 级隔离）——多租户/强隔离场景（比容器隔离强，但重）。
    - **怎么选**
        - 标准/多数 → **`containerd`**（默认、轻量、稳）；`RHEL`/`OpenShift` → `CRI-O`；**强隔离/多租户/敏感** → `Kata`（`VM` 级）；从 `Docker` 迁移 → `containerd`（`kubectl` 兼容）。
        - `containerd` vs `CRI-O`：都 `CRI` 兼容，`containerd` 更通用/性能好，`CRI-O` 更贴近 `RHEL` 生态。
    - **`Docker` 与 `containerd` 关系（`dockershim`）**
        - `Docker` = `docker` CLI + `dockerd` + 内置 `containerd`；`k8s` 曾用 `dockershim`（`Docker` 的兼容层）调 `Docker` 的 `containerd`——`k8s v1.24` 移除 `dockershim`，**直接用 `containerd`/`CRI-O`**（不再绕 `Docker`）。
    - **一句话理解**
        - 容器运行时像"**厨房的灶台**"——`containerd` 是"标准灶台"（`CNCF`，`k8s` 默认主流）；`CRI-O`"定制灶台"（`RHEL`）；`Docker` 是"带灶台的整厨柜"（`dockershim` 已去掉，直接用 `containerd`）；`Kata`"防油烟灶台"（VM 级强隔离，重）——**默认/主流用 `containerd`，要强隔离 `Kata`**。

- **协助记忆**
    - 口诀：“**containerd（k8s 默认主流）、CRI-O（OpenShift）、Kata（强隔离）、Docker dockershim 已移除**”。
    - 一句话：“**容器运行时选 containerd（默认），要强隔离 Kata，Docker 底层也是 containerd**”。

- **进阶思考**
    - **为什么 `k8s` 移除 `dockershim`？**
        - `dockershim` 是 `k8s` 调 `Docker` 的兼容层（`Docker` 的 `containerd` 被 `kubelet` 用）；但 `Docker` 的 `dockerd`/CLI 中间层多余——直接 `containerd` 更**轻量/高效**（少一层 `CRI-shim`）。所以 `k8s v1.24` 移除 `dockershim`，用 `containerd`/`CRI-O`（`CRI` 原生）。
    - **`containerd` 和 `CRI-O` 选哪个？**
        - `containerd`：`CNCF`、通用、性能好、`containerd` 发行版广（`docker`/`k8s` 底层）——**主流推荐**；`CRI-O`：`Red Hat`（`OpenShift`）生态，`oci` 规范——`RHEL`/`OpenShift` 用它。按生态/团队/发行版选，**性能/通用 `containerd`，`OpenShift` 用 `CRI-O`**。

- **扩展信息**
    - **`CRI`**（`Container Runtime Interface`）：`kubelet` 与运行时接口（`RuntimeService`/`ImageService`）——`containerd`/`CRI-O` 实现。
    - **配置**：`kubelet` `--container-runtime-endpoint`（`unix:///run/containerd/containerd.sock`）、`containerd` 配置（`/etc/containerd/config.toml`）。
    - **参考**：`crictl`（`CRI` 命令行，操作 `containerd`/`CRI-O`）、`ctr`（`containerd` CLI）。

## 🤔 简述 CRI、CNI、CSI 分别是什么，各自解决什么问题？ 
- **`CRI`/`CNI`/`CSI` 是 `K8s` 的三大容器接口（`kubelet`/`K8s` 与外界解耦）：`CRI`（Container Runtime Interface）——`kubelet` 与容器运行时接口（拉镜像/跑容器）；`CNI`（Container Network Interface）——`k8s` 与网络插件接口（`Pod` 建网/IP）；`CSI`（Container Storage Interface）——`k8s` 与存储驱动接口（`PV`/卷）。核心：“CRI 管容器、CNI 管网络、CSI 管存储——K8s 用这三接口解耦、可插拔”。**
    - **`CRI`（容器运行时接口）**
        - **解决**：`kubelet` 怎么调**容器运行时**（拉镜像/创建/启动停止容器）——`CRI` 标准化（`kubelet` 通过 `CRI` 跟 `containerd`/`CRI-O` 通信）。
        - **组件**：`RunPodSandbox`/`CreateContainer`/`StartContainer`/`StopContainer`（`RuntimeService`）、`PullImage`（`ImageService`）。
        - **实现**：`containerd`/`CRI-O`（`CRI` 兼容）——`k8s` 用 `CRI` 不绑特定运行时。
    - **`CNI`（容器网络接口）**
        - **解决**：`k8s` 怎么给 `Pod` **建网络**（分配 `IP`/`Pod` 互通/网络策略）——`CNI` 标准（`CNI` 插件 `Calico`/`Flannel`/`Cilium` 实现）。
        - **组件**：`CNI` 插件（`ADD`/`DEL` 命令、`IPAM`），`kubelet` 调 `CNI` 给 `Pod` 建网（`CNI` 插件建 `veth`/`Bridge` 等）。
        - **实现**：`Calico`/`Flannel`/`Cilium`（`CNI` 插件）。
    - **`CSI`（容器存储接口）**
        - **解决**：`k8s` 怎么用**存储驱动**（`PV`/`PVC`/卷挂载/快照）——`CSI` 标准（`CSI` 驱动 `NFS`/`Ceph`/云盘）。
        - **组件**：`CSI` 驱动（`CreateVolume`/`DeleteVolume`/`NodeStageVolume`/`NodePublishVolume`/`CreateSnapshot`），`External Provisioner`/`Attacher`/`Resizer`/`Snapshotter`。
        - **实现**：`nfs.csi.k8s.io`/`rbd.csi.ceph.com`/`ebs.csi.aws.com`（`CSI` 驱动）。
    - **三者关系（`kubelet`/K8s 怎么用）**
        - `kubelet` 用 **`CRI`**（调 `containerd` 拉起容器）、用 **`CNI`**（给 `Pod` 建网 `Calico`）、`k8s`（控制器）用 **`CSI`**（`PV`/卷——`External` `Provisioner` 调 `CSI` 驱动）。
        - 都是**接口标准**（`k8s` 与其他组件解耦，可插拔）——`CRI`（运行时）/`CNI`（网络）/`CSI`（存储）。
    - **一句话理解**
        - 像"**大楼的三类外包接口**"——`CRI` 是"装修队接口"（怎么铺房间/容器）、`CNI` 是"网络接口"（怎么通网）、`CSI` 是"供水接口"（怎么通水/存储）——`K8s` 用这三个接口把"容器/网络/存储"三类活**外包给专业插件**（`containerd`/`Calico`/`Ceph CSI`），**解耦可插拔**。

- **协助记忆**
    - 口诀：“**CRI 管容器（kubelet↔运行时）、CNI 管网络（Pod 建网）、CSI 管存储（PV/卷）——三大接口解耦插拔**”。
    - 一句话：“**CRI 容器、CNI 网络、CSI 存储——K8s 三大可插拔接口**”。

- **进阶思考**
    - **为什么用接口（`CRI`/`CNI`/`CSI`）而不是绑死某实现？**
        - 解耦/可扩展：`CRI` 让 `k8s` 不绑 `Docker`（可换 `containerd`/`CRI-O`）；`CNI` 换网络插件（`Calico`/`Cilium`）；`CSI` 接任意存储（`Ceph`/`NFS`/云盘）——**标准化、可插拔、生态开放**（`k8s` 核心不臃肿）。
    - **`kubelet` 分别怎么用这三接口？**
        - `kubelet`（节点）：用 **`CRI`**（拉容器）→ 用 **`CNI`**（建 `Pod` 网络）→ **`CSI`** 由控制器（`kube-controller-manager`/`External Provisioner`）调（卷供给/挂载）——`kubelet` 是 `CRI`/`CNI` 的使用者（节点侧），`CSI` 是集群级（控制面供给 + 节点 `Node` 挂载）。

- **扩展信息**
    - **接口**：`CRI`（`kubelet`↔`containerd`/`CRI-O`）、`CNI`（`kubelet`↔网络插件）、`CSI`（`k8s`↔存储驱动）。
    - **命令**：`crictl`（`CRI`）、`calicoctl`/`cilium`（`CNI` 插件）、`csi`（`CSI` 驱动）。

## 🤔 简述 Operator 具体开发流程？ 
- **开发 `Operator`（用 `Operator SDK`/`Kubebuilder`）：①定义 `CRD`（自定义资源——声明要什么）②写 `Controller`（`Reconcile` 循环——声明变现/纠偏）③`RBAC`/部署 ④测试/发布。核心：“CRD 定义资源 + Controller 循环（Reconcile 让实际=声明），用 SDK 生成脚手架”。**
    - **开发流程（`Operator SDK`/`Kubebuilder`）**
        - **① 脚手架**：`kubebuilder init`/`operator-sdk init`（创建项目骨架，`Go` 为主）。
        - **② 定义 `API`/`CRD`**：`kubebuilder create api --group=<g> --version=v1 --kind=<Kind>`——定义 `CRD` 的 `Spec`/`Status`（要管理的资源，如 `MySQLCluster` 的 `Spec`：主从数/版本；`Status`：状态）。
        - **③ 写 `Controller`/`Reconcile`**：实现 `Reconcile`（调谐）循环——读 `CRD` 期望 → 创建/更新实际资源（`Deployment`/`StatefulSet`/`PVC`/`Service`）→ 更新 `Status`；核心逻辑（`Create`/如果资源不存在建、存在且不匹配改、删除清理）。
        - **④ `RBAC` 权限**：`kubebuilder` 生成 `ClusterRole`（controller 需要哪些资源权限——`marker`）。
        - **⑤ 部署**：`Makefile` `make install`（装 `CRD`）+ `make deploy`/`docker` 镜像（部署 controller 到集群）。
        - **⑥ 测试**：`make test`（`envtest`/单元）/`e2e`；`kubectl apply` 一个 `CR`（自定义资源）看 `operator` 生效。
    - **`Controller`/`Reconcile` 循环（核心）**
        - `Reconcile` 是**事件驱动/循环**：`Watch` `CRD`（`+kubebuilder:resource`）→ 收到事件 → `Reconcile`（对比"期望（`Spec`）vs 实际（集群）"，**创建/更新/删除**资源）→ 状态回 `Status`。
        - **幂等**（重复 `Reconcile` 无害）、**`requeue`**（状态未达成再调）。
    - **关键点**
        - `CRD` 定义**用户能声明什么**（`Spec`），`Controller` 定义**怎么实现**（期望→实际资源）；`Status` 记录**状态**（用户 `kubectl get <kind>` 看）。
        - `OwnerReference`（`operator` 建的资源由它管理——`CR` 删除时自动清资源）；`finalizer`（清理钩子）。
    - **一句话理解**
        - 开发 `Operator` 像"**做一个自动补货系统**"——①定义"缺货单"格式（`CRD`：用户声明要 `RedisCluster` 3主3从）②写"补货程序"（`Controller`/`Reconcile`：看到 `RedisCluster` 声明 → 自动建 3主3从 + 失败/变化纠正 → 补货状态回 `Status`）③`RBAC`/部署上线——**声明→自动实现→纠偏→回报**。

- **协助记忆**
    - 口诀：“**Operator 开发：脚手架（SDK init）→ 定义 CRD（Spec/Status）→ 写 Controller（Reconcile 声明变现/纠偏）→ RBAC → 部署 → 测试**”。
    - 一句话：“**Operator = CRD 声明 + Controller 循环（Reconcile），用 SDK 生成脚手架**”。

- **进阶思考**
    - **为什么 `Reconcile` 要“幂等/循环”（不一次做完）？**
        - `K8s` 状态**持续变化**（`Pod` 挂/配置变/请求来），`Reconcile` 要**循环检查**（`requeue`/事件触发），**确保实际一直=声明**（期望）——幂等（重复执行无副作用）让控制器稳定；不能只"建一次"（要持续纠偏）。
    - **`Operator` 和普通 `Controller`（`Reconcile`）难度？**
        - 有门槛（`Go`/`k8s` controller 知识/`RBAC`/`CRD`）；但 `Operator SDK`/`Kubebuilder` **生成脚手架**（`CRD`/controller 骨架/`RBAC` marker）——主要写 `Reconcile` 业务逻辑。**重要/有状态系统（库/中间件）才值得**（普通 `Pod` 用 `Deployment` 就够）。

- **扩展信息**
    - **工具**：`Operator SDK`（`Red Hat`）、`Kubebuilder`（`k8s` 官方）、`controller-runtime`（库）、`OLM`（分发/部署 Operator）。
    - **`kubebuilder` 命令**：`kubebuilder init`/`create api`/`make install`/`make deploy`/`make test`（`envtest`）。
    - **参考**：`kubectl get crd`、`kubectl get <kind>`（`CR` 看状态）、`operator` 控制器日志。

## 🤔 K8s CRD 是什么？怎么定义？ 
- **`CRD`（`Custom Resource Definition`）是让用户自定义 `K8s` 资源的机制——定义自己的资源类型（如 `RedisCluster`/`MySQLCluster`），用户就能用 `kubectl apply` 声明它（`Operator` 的基石）。定义：写 `CRD` YAML（`group`/`version`/`kind`/`spec`/`status` → `OpenAPI schema`），`kubectl apply` 安装。核心：“CRD 自定义新资源——写 CRD YAML 定义类型，用户就能用 kubectl 创建它”。**
    - **什么是 `CRD`（解决什么问题）**
        - `K8s` 内置资源（`Pod`/`Deployment`）有限——用户要**自定义资源**（如 `Redis` 集群/`MySQL` 集群声明）——`CRD` 让用户**扩展 `K8s` API**（定义新资源类型）。
        - 用户用 `kubectl apply my-redis.yaml`（`kind: RedisCluster`）声明 → `Operator`（控制器）接管实现——`CRD` + `Operator` 让 K8s 管理复杂系统。
    - **怎么定义 `CRD`（写 YAML）**
        - **① 定义元数据**：`apiVersion: apiextensions.k8s.io/v1`、`kind: CustomResourceDefinition`、`metadata.name: <plural>.<group>`（如 `redisclusters.redis.example.com`）。
        - **② `spec.group`/`version`/`scope`**：`group`（组，如 `redis.example.com`）；`versions`（`v1` 等）；`scope: Namespaced/Cluster`。
        - **③ `names`**：`plural`/`singular`/`kind`/`shortNames`（如 `rediscluster`/`RedisCluster`/`rc`）。
        - **④ `schema`（`OpenAPI`）**：定义 `Spec`/`Status` 字段（`type`/`properties`/`required`）——`CRD` 的字段校验/描述。
        - **⑤ 部署**：`kubectl apply -f crd.yaml`（安装 `CRD`）→ 之后 `kubectl apply` 一个 `RedisCluster`（`kind: RedisCluster`）创建实例。
    - **CRD 的组成（`Spec`/`Status`）**
        - **`Spec`**：用户**声明**要什么（如 `RedisCluster` 的 `replicas`/`version`）——用户填。
        - **`Status`**：状态（`Running`/`Ready`）——`Operator` 回填（用户 `kubectl get rediscluster` 看状态）。
        - **`subresources`**：`status`（单独更新）、`scale`（扩缩）。
    - **一句话理解**
        - `CRD` 像"**自定义表格模板**"——`K8s` 本来只认标准表格（`Pod`/`Deployment`），`CRD` 让你**造一个专门的表格**（如 `RedisCluster`：要几个主/从、什么版本）；你填表（`Spec`）、`Operator`（填表员）照着把 `Redis` 集群建好并填状态（`Status`）——**自定义资源类型**。

- **协助记忆**
    - 口诀：“**CRD 自定义资源——写 CRD YAML（group/version/kind/Spec-openapi schema）→ kubectl apply 装 → 用户 apply CR（自定义资源）**”。
    - 一句话：“**CRD 是自定义资源类型，写 YAML 定义，用户就能 kubectl 用它**”。

- **进阶思考**
    - **`CRD` 和 `Operator` 什么关系？**
        - `CRD` 是**定义资源类型**（`RedisCluster`），`Operator` 是**实现它的控制器**（`Controller` 处理 `RedisCluster` 创建/运维）——`CRD`（声明）+ `Operator`（实现），两者配合（`CRD` 是 `Operator` 管理的资源定义）。
    - **`CRD` 字段（`schema`）重要吗？**
        - 重要——`spec` `OpenAPI` schema 定义**字段/校验**（让 `kubectl` 能校验 `RedisCluster` 的 `replicas`/`version`），`CRD` `schema` 保证用户填的 `CR` 合法——**`OpenAPI v3 schema`**。 `kubebuilder`/`operator-sdk` 会生成（`+kubebuilder:validation` marker）——手写 `CRD` 用 `kubectl apply`。

- **扩展信息**
    - **命令**：`kubectl get crd`、`kubectl apply -f crd.yaml`、`kubectl get rediscluster`（自定义资源）、`kubectl explain rediscluster`。
    - **工具**：`kubebuilder`/`operator-sdk`（生成 `CRD`）、`controller-gen`（从 `Go` struct 生成 `CRD`）。
    - **参考**：`CustomResourceDefinition` API、`OpenAPI v3 schema`（`spec`）。

## 🤔 K8s 节点磁盘不足，怎么定位到大文件？ 
- **节点磁盘不足（`DiskPressure`）定位大文件：①`df -h`（看哪个分区满）②`du` 逐级找大目录（`du -h --max-depth=1 / | sort -rh | head`）③重点看 `/var/lib/containerd`（镜像/层）、`/var/log`（容器/系统日志）、`/var/lib/docker`（旧） ④清理（镜像/日志/临时）。核心：“先 df 看满的盘，再 du 找大目录——容器镜像/日志/宿主机大文件”。**
    - **确认磁盘状态**
        - **`df -h`**：看**哪个分区**满了（`/`/`/var`/数据盘）、使用率。
        - **`kubectl describe node <node>`**：看 `DiskPressure`（`Conditions`）——节点磁盘压力（K8s 会驱逐 `Pod`）。
    - **定位大目录/文件（`du`）**
        - **`du -h --max-depth=1 / | sort -rh | head -10`**（逐级找大目录，从 `/` 往下）。
        - **重点关注**：`/var/lib/containerd`（容器镜像/层——`K8s` 镜像仓库）、`/var/lib/docker`（旧 `Docker` 镜像/层）、`/var/log`（容器/系统日志——`journal`/`docker` 日志）。
        - `du -h --max-depth=2 /var/lib/containerd | sort -rh | head`（深入容器目录）。
    - **看容器日志/镜像占用**
        - **容器日志**：`/var/log/pods`/`/var/lib/docker/containers/*/*-json.log`（大日志）——`journalctl -u` 看系统、容器日志。
        - **镜像**：`crictl images`（`containerd` 看镜像大小）、`docker images`（旧）——镜像层占空间。
        - **`du -sh /var/lib/containerd/*`**（看镜像/层/运行时目录）。
    - **清理（释放磁盘）**
        - **清理镜像**：`crictl rmi <image>`（`containerd` 删镜像）、`docker image prune`（悬空镜像）、`kubelet` 垃圾回收（`image-gc-high/low-threshold` 自动）。
        - **清理日志**：`journalctl --vacuum`（系统日志限体积）、容器日志轮转/清理（`kubelet` 容器日志 `container-log-max-size`/`max-files`）。
        - **清理临时/`emptyDir`**：`kubectl` 删无用 `Pod`/`PVC`（`emptyDir` 数据）、宿主机临时（`/tmp`）。
        - **扩容/清理**：磁盘真不够→ 扩容/清理（或 `docker`/`containerd` GC）。
    - **一句话理解**
        - 磁盘满像"**垃圾桶满了**"——先看哪个垃圾桶（`df` 哪个分区）满，再翻垃圾桶找大件（`du` 找大目录），重点**容器镜像/日志**（`/var/lib/containerd`、`/var/log`）是大头——**清理镜像/日志/临时文件**，或扩容。

- **协助记忆**
    - 口诀：“**磁盘满先 df 看盘、du 找大目录、重点 /var/lib/containerd（镜像)/var/log（日志)——crictl rmi/日志轮转/调度清理**”。
    - 一句话：“**磁盘不足=镜像/日志占满——df 看盘、du 找大、清镜像日志**”。

- **进阶思考**
    - **`K8s` 会自己清理磁盘吗（垃圾回收）？**
        - 会——`kubelet` 的**容器/镜像垃圾回收**（`--image-gc-high-threshold`/`image-gc-low-threshold`）——磁盘到高阈值自动回收无用镜像/容器；但**日志/临时文件**要自己管（或容器日志轮转）。`DiskPressure` 时还可能驱逐 `Pod`。
    - **为什么容器镜像/日志这么占盘？**
        - **镜像**：拉取的所有镜像层（`/var/lib/containerd`，`K8s` 每节点存），多版本/大镜像占空间；**日志**：容器 stdout 日志（`/var/log/pods`/json.log），长期累积——**镜像 + 日志是节点磁盘大头**，要定期清理/轮转。

- **扩展信息**
    - **命令**：`df -h`、`du -h --max-depth=1 / | sort -rh | head`、`crictl images`/`crictl rmi`、`journalctl --vacuum`、`kubectl describe node`（`DiskPressure`）。
    - **`kubelet` GC**：`image-gc-high-threshold`/`image-gc-low-threshold`（镜像 GC）、`container-log-max-size`/`container-log-max-files`（容器日志上限）。
    - **参考**：`kubectl cordon/drain`（维护）、`kubectl get nodes`（看节点）。

## 🤔 Pod 处于 Terminating 无法删除，如何强制清理？ 
- **`Pod` 卡 `Terminating`（删除卡住）常见原因：`finalizers`（终结器阻塞）、`Pod` 有挂载卷未卸、`kubelet`/节点失联、`PDB` 阻止。强制清理：①`kubectl delete pod --force --grace-period=0`（强制删，跳过优雅）②`finalizers` 时 `kubectl patch` 清空 `finalizers` ③`kubelet` 失联先处理节点。核心：“Terminating 卡住多是 finalizer/卷/节点——--force 强删或清 finalizers”。**
    - **先看卡住原因**
        - **`kubectl get pod <name> -o yaml`**：看 `metadata.finalizers`（是否有终结器阻塞删除）——**`finalizers` 是最常见卡 `Terminating` 原因**（`Operator`/资源保护加的）。
        - **`kubectl describe pod <name>`**：看 `Events`（`Terminating` 卡在什么——`unmount` 卷/`Finalizer`）。
        - **节点状态**：`kubelet` 是否 `NotReady`（节点失联，`Pod` 无法删）。
    - **强制删除方法**
        - **①`kubectl delete pod <name> --force --grace-period=0`**：**强制删除**（跳过优雅终止/宽限期），`--force` 强制、`--grace-period=0` 立即删——`API Server` 直接删（`Pod` 状态清掉）。
        - **② 清空 `finalizers`**：`kubectl patch pod <name> -p '{"metadata":{"finalizers":[]}}'`——**移除终结器**（删掉阻塞删除的 `finalizers`）→ K8s 继续删。
        - **③ 节点失联**：`kubelet` 挂了（节点 `NotReady`）——先 `kubectl delete node`（从集群移除失联节点）/`kubectl get node` 处理，或重启 `kubelet`。
        - **④ `PDB` 阻止**：`PodDisruptionBudget` 限制副本——临时调高 `PDB`/删 `PDB`（谨慎，保可用）。
    - **几个注意**
        - **强制删除有风险**：**跳过优雅终止**——正在处理的请求可能中断、有状态多副本 `Pod` 可能丢（强烈建议先看 `finalizers`/`PDB`，正常删或用 `--grace-period`）。
        - **`StatefulSet`/有状态**：强制删可能数据不同步（慎重；或有状态 `Pod` 用 `StatefulSet` 规范删）。
    - **一句话理解**
        - `Terminating` 卡住像"**退房卡住**"——电表没结清（`finalizers` 终结器）/行李没收完（卷未卸）/前台失联（`kubelet`）——**①`--force` 强行办退房（跳过流程）②清掉"结算单"（清 `finalizers`）③找回前台（节点）**——先看"卡在哪一步"再强制。

- **协助记忆**
    - 口诀：“**Terminating 卡住查 finalizers/卷/节点——kubectl delete --force --grace-period=0 强删，或 kubectl patch 清 finalizers**”。
    - 一句话：“**Pod 删不掉先查 finalizers，--force 强删或清 finalizers**”。

- **进阶思考**
    - **`finalizers` 是什么/为什么卡删除？**
        - **`finalizers`**（终结器）：删除资源前要**先执行清理动作**的钩子（如 `Operator` 的 `finalizer`：删 `RedisCluster` 前清关联资源/存储）——删 `Pod` 时先跑 `finalizer` 逻辑，`finalizer` 不清/失败 → `Terminating` 卡住。**清空 `finalizers` = 跳过清理钩子**（可强删，但可能留资源孤儿）。
    - **为什么 `--force` 能删除但"有风险"？**
        - `--force --grace-period=0` 直接让 `API Server` 删 `Pod`（跳过优雅终止/`finalizer`）——**删得快**，但**有状态 `Pod`/正在处理的请求**可能中断（不优雅）；**先用 `kubectl delete`（优雅）**，`--force` 是最后手段。

- **扩展信息**
    - **命令**：`kubectl delete pod <name>`、`kubectl delete pod <name> --force --grace-period=0`、`kubectl patch pod <name> -p '{"metadata":{"finalizers":[]}}'`、`kubectl delete node <node>`（失联节点）。
    - **`finalizers`**：`Operator`/`CRD` 资源保护（`controller` 加），`kubectl get pod -o yaml` 看 `finalizers`。
    - **参考**：`kubectl get pod`、`kubectl describe pod`、`PodDisruptionBudget`。

## 🤔 开发人员反馈 K8s 中应用访问慢，该如何排查？ 
- **`K8s` 应用访问慢排查（分层）：①`Ingress`→`Service`→`Pod`（入口链路）②`Pod` 内应用（代码/依赖/慢查询）③资源（`CPU`/内存/`OOM`/限流）④外部依赖（数据库/`Redis`/第三方）。从外到内：`kubectl` 看 `Pod`/`Service`/`Ingress` + 应用日志/链路 + 资源监控。核心：“访问慢从入口到应用逐层定位——Ingress/Service/Pod/资源/依赖”。**
    - **① 入口链路（`Ingress`/`Service`/`Pod`）**
        - **`Ingress`**：`kubectl get ingress`/`describe`（配置对不对）、`kubectl get svc`/`get endpoints`（后端 `Pod` 是否就绪/全在）；`kubectl get pods`（`Pod` 是否 `Running`/`Crash`）。
        - **`kubectl exec` 进应用 `curl localhost` 或 `curl <Ingress>` 测延迟**（区分是入口慢还是应用慢）。
    - **② 应用层（代码/依赖）**
        - **`kubectl logs <pod>`**：应用日志（慢查询/错误/耗时）；`jstack`/`top -H -p`（线程卡）；
        - **链路追踪**（`Jaeger`/`skywalking`）定位慢在**哪一步**（`DB` 查询/`Redis`/外部调用）——慢请求的根因。
        - **依赖**：数据库慢查询（`explain`）、`Redis` 慢、`feign`/`http` 调用第三方慢。
    - **③ 资源（`CPU`/内存/`OOM`/限流）**
        - **`kubectl top pod`**（`CPU`/内存使用）——`Pod` 资源吃饱/`OOM`（`OOMKilled` 重启）→ 慢。
        - **限流/`QPS`**：`Prometheus` 看 `Pod` `CPU` 曲线/`HTTP 延迟`（`P99` 高）——资源瓶颈（`limits` 限 `CPU` → 慢）。
    - **④ 网络/`DNS`（`K8s` 内）**
        - **`CoreDNS`** 解析慢（`kubectl get pods -n kube-system` 看 `kube-dns`）、`Pod` 间网络（`CNI`）延迟——`curl`/`dig` 测。
        - 跨节点 `Pod` 网络 + 大集群（`CNI`/`kube-proxy`）延迟。
    - **一句话理解**
        - 访问慢像"**点餐慢**"——①入口前台慢（`Ingress`/`Service` 堵）②服务员慢（应用：慢查询/依赖卡）③厨房慢（资源：CPU 满/内存不够）④菜没送到（网络/`DNS`）——**从点餐到上菜逐环节查**：`kubectl` 看入口/`Pod`、`日志`/`链路`看应用、`top` 看资源。

- **协助记忆**
    - 口诀：“**访问慢逐层：Ingress/Service/Pod 入口 → 应用日志/链路（慢查询/依赖） → 资源（CPU/OOM） → 网络/DNS——kubectl + top + 链路定位**”。
    - 一句话：“**应用慢从入口到应用逐层排查——先 kubectl 看，再日志/链路/资源**”。

- **进阶思考**
    - **怎么区分是"入口慢"还是"应用慢"？**
        - `curl -w '%{time_total}' http://<ingress>`（看总延迟）vs `kubectl exec` 进去 `curl localhost:port`（应用内延迟）——入口慢（`Ingress`/`Service`）vs 应用慢（代码/依赖）分层定位；`链路追踪`（`Jaeger`）看慢在哪一段。
    - **`Pod` 慢但资源不高，可能是啥？**
        - 应用层问题：**慢查询**（数据库 `SQL`）、`Redis` 慢、`feign`/`http` 调用外部慢、线程阻塞（`jstack` 看）、`GC`（内存泄漏 `OOM` 前）——`链路追踪` + `日志` + `jstack`/`heap` 定位。

- **扩展信息**
    - **排查命令**：`kubectl get pod/svc/ingress/endpoints`、`kubectl top pod`、`kubectl logs --previous`、`kubectl exec`、`kubectl describe pod`。
    - **工具**：`Prometheus`+`Grafana`（`P99` 延迟/资源）、`Jaeger`/`skywalking`（链路）、`jstack`/`top`（线程/资源）。
    - **参考**：`curl -w`（延迟）、`dig`/`nslookup`（`DNS`）、`kubectl get nodes`（节点）。

## 🤔 业务 Pod 频繁重启，该如何排查？ 
- **`Pod` 频繁重启（`CrashLoopBackOff`/多次 `restarts`）排查：①看重启原因（`describe`：`OOMKilled`/`Error`/探针失败）②看日志（`kubectl logs --previous`——上次崩溃日志）③常见：`OOM`（内存超 `limits`）、启动失败（配置/依赖）、探针失败（`liveness`）、`CrashLoop`（应用崩溃）、`init` 容器失败。核心：“频繁重启查重启原因（OOM/Error/探针）+ --previous 日志定位”。**
    - **① 看重启原因（`kubectl describe`）**
        - **`kubectl describe pod <name>`**：看 `Last State`/`Reason`（`OOMKilled`/`Error`/`CrashLoopBackOff`）、`Restart Count`、`Events`（探针失败？`config` 错误？镜像？）。
        - **`kubectl get pod -o wide`**：看 `RESTARTS`（重启次数）。
    - **② 看日志（`kubectl logs --previous`）**
        - **`kubectl logs <pod> --previous`**：看**上次**容器崩溃前日志（`Error`：应用异常/`NullPointer`/连接失败/`OOM` 前）。
        - `kubectl logs <pod>`（当前日志，若 `CrashLoop` 在重启循环看 `--previous`/`-f` 实时）。
    - **③ 常见原因（对号）**
        - **`OOMKilled`（内存溢出）**：`limits` 内存小→调大 `limits`/减内存/查泄漏（`@Query`/堆积）；`kubectl describe` `OOMKilled`。
        - **启动失败（`Error`/`CrashLoop`）**：配置错（`ConfigMap`/`Secret`）/依赖连不上（`DB`/`Redis`）/启动命令错/`init` 容器失败——看启动日志修正。
        - **探针失败**（`liveness` 不健康重启）：应用假死（线程死锁/`GC` 卡）——`liveness` 判死重启；调整探针参数/修应用。
        - **`ImagePullBackOff`**（镜像失败）：镜像错/认证。
        - **节点/资源**：节点 `DiskPressure`/`evict`——`Pod` 被驱逐重启。
    - **④ 看资源/监控**
        - **`kubectl top pod`**（内存/CPU——`OOM` 前兆）、`Prometheus`（`Pod` 重启次数/`OOM` 曲线）。
        - **`kubectl describe node`**（`DiskPressure`/`evict`）——节点驱逐 `Pod` 重启。
    - **一句话理解**
        - `Pod` 频繁重启像"**员工反复离职**"——①先看离职原因（`describe`：`OOM` 开除=内存超、`CrashLoop` 干不成、探针=体检不过）②看辞职信（`logs --previous`：上次报什么错）③对号治：给够资源（防 `OOM`）、修配置/依赖（防启动失败）、调探针/修假死——**先看 describe + --previous 再修**。

- **协助记忆**
    - 口诀：“**频繁重启：describe 看 Reason（OOMKilled/Error/探针）、logs --previous 上次日志、对号治（OOM 调 limits/启动失败修配置依赖/探针失败调参/驱逐看节点）**”。
    - 一句话：“**Pod 重启先看 describe 原因 + logs --previous，再对症（OOM/启动失败/探针）**”。

- **进阶思考**
    - **`CrashLoopBackOff` 和 `OOMKilled` 区别？**
        - `OOMKilled`：**内存超 `limits` 被内核杀**（`describe` `Last State: Terminated, Reason: OOMKilled`）；`CrashLoopBackOff`：**应用启动即挂**（崩溃循环，`logs --previous` 看业务报错）——`OOM` 是资源杀、`CrashLoop` 是应用挂（可能配置/依赖/代码错）。
    - **为什么加了资源（`limits`）还 `OOM`/重启？**
        - ①`limits` 设太小（真不够→调大）②**应用内存泄漏/堆积**（`@Query` 大结果/`GC` 跟不上→查泄漏，`heap dump`）③`requests` 太大（调度不出/节点内存不够）——`OOM` 治本看**实际内存需求**（`top`/`GC` 日志），不只调 `limits`。

- **扩展信息**
    - **命令**：`kubectl get pod -o wide`（`RESTARTS`）、`kubectl describe pod`（`Last State`/`Reason`/`Events`）、`kubectl logs --previous`、`kubectl top pod`。
    - **常见 `Restart Reason`**：`OOMKilled`/`Error`/`ContainerCannotRun`/`BackOff`——`kubectl describe`/`get -o yaml` 看。
    - **参考**：`kubectl get nodes`（`evict`）、`Prometheus`（重启/`OOM`）、`kubectl rollout`。

## 🤔 静态 Pod 是什么？有什么作用？ 
- **`静态 Pod`（`Static Pod`）是直接由 `kubelet` 管理的 `Pod`（不经 `API Server` 调度/控制）：`kubelet` 监听节点上的 `Pod` 配置文件（`/etc/kubernetes/manifests/*.yaml`），自动创建/管理该 `Pod`。作用：①`K8s` 核心组件（`kube-apiserver`/`etcd`/`scheduler`/`controller-manager`）用静态 `Pod` 跑（`kubeadm` 默认）②`Pod` 挂/删自动由 `kubelet` 管理（节点本地、自愈）。核心：“静态 Pod = kubelet 直接管的 Pod（读本地配置文件，不经 API Server 调度）——核心组件用它”。**
    - **什么是静态 `Pod`**
        - 由 **`kubelet`** 直接创建/管理（**不经 `API Server`/调度器**）；`kubelet` 监控**节点本地 manifests 目录**（默认 `/etc/kubernetes/manifests/`）里的 `.yaml`——有配置就建 `Pod`。
        - 静态 `Pod` 会**在 `API Server` 只读显示**（`kubelet` 上报，但**不能改/删**从 `API Server`——要改体现在配置文件）。
    - **怎么创建静态 `Pod`**
        - 在 `kubelet` 的 `staticPodPath`（如 `/etc/kubernetes/manifests/`）放 `Pod` YAML（`kind: Pod`）——`kubelet` 自动建；删文件 → 自动删 `Pod`（`kubelet` 管理生命周期）。
        - 或者 `kubelet --pod-manifest-path=<dir>`（指定目录）。
    - **作用（为什么用它）**
        - **① `K8s` 核心组件**：`kube-apiserver`/`etcd`/`kube-scheduler`/`kube-controller-manager` 用**静态 `Pod`**跑（`kubeadm` 装的控制面组件是静态 `Pod`）——`kubelet` 管理它们（控制面在 `master` 节点、`kubelet` 直接管、自愈——`Pod` 挂自动重启）。
        - **② 自愈/本地**：`kubelet` 本地管（不经 `API Server`——**控制面本身挂了也能靠 `kubelet` 拉起来**，但 `API Server` 不调度）；适合核心组件/单节点。
        - **③ 特殊用途**：节点级 `Pod`（`DaemonSet` 类似，但静态 `Pod` 更底层——`kubelet` 直接管）。
    - **静态 `Pod` vs 普通 `Pod`**
        - 普通 `Pod`：`API Server` 创建/调度/管理（`Deployment` 控制）；静态 `Pod`：**`kubelet` 本地管**（读配置文件，不经 `API Server` 调度）；静态 `Pod` 在 `API Server` 可见但**是从 `kubelet` 上报**（不能 `kubectl delete` 删——要改配置文件）。
    - **一句话理解**
        - 静态 `Pod` 像"**大楼管理员亲手照看的房间**"——普通房间（`Pod`）是"前台派"（`API Server` 调度）管理；静态房间是"管理员本地"（`kubelet` 读本地`清单`管）——**自己照看、不经前台**——`K8s` 的重要"先导/核心"（`apiserver`/`etcd`）用这种**本地直管**方式（核心挂了先有兜底）。

- **协助记忆**
    - 口诀：“**静态 Pod = kubelet 本地读 manifests 目录直接管（不经 API Server 调度）——核心组件（apiserver/etcd）用静态 Pod**”。
    - 一句话：“**静态 Pod 是 kubelet 直管的 Pod（读本地配置文件），K8s 核心组件用它**”。

- **进阶思考**
    - **为什么核心组件用静态 `Pod` 而不是 `DaemonSet`/`Deployment`？**
        - 核心组件（`apiserver`/`etcd`）**必须是静态 Pod**：它们是 `K8s` 的"控制面"，**`API Server`/调度器挂的时候**（`Deployment`/`DaemonSet` 控制器本身是 `API Server` 管的，挂了无法自我恢复）——静态 `Pod` 由 **`kubelet`（每节点本地）** 管，**`API Server` 挂了也能把 `apiserver`-静态`Pod` 拉起来**（自举/bootstrap）——这是静态 `Pod` 的核心价值（控制面自举）。
    - **静态 `Pod` 能不能 `kubectl delete` 删？**
        - 从 `API Server` 删不了（它是 `kubelet` 上报的只读视图）——要**改/删 `/etc/kubernetes/manifests/` 里的配置文件**（删文件 `kubelet` 自动删 `Pod`）；`kubectl delete` 静态 `Pod` 会被 `kubelet` 重新建（配置还在）。

- **扩展信息**
    - **配置**：`kubelet --pod-manifest-path=/etc/kubernetes/manifests/`（静态 `Pod` 目录）；`kubeadm` 控制面组件（`etcd`/`apiserver`/`scheduler`/`controller-manager` 静态 `Pod`）。
    - **命令**：`kubectl get pod -n kube-system`（看静态 `Pod`，如 `etcd-master`/`kube-apiserver-master`）；`ls /etc/kubernetes/manifests/`（看静态 `Pod` 配置）。
    - **参考**：`kubelet` 静态 `Pod`、`kubeadm` 控制面、`mirror pod`（`kubelet` 上报静态 `Pod` 的只读副本）。

## 🤔 Pod 中 pause 容器有什么作用？ 
- **`pause` 容器（`Infra Container`/`sandbox`）是 `Pod` 的“基础设施容器”：`Pod` 里每个 `Pod` 都有一个隐藏的 `pause` 容器，它先把 `Pod` 的网络/IPC 命名空间建好，其他业务容器加入 `pause` 创建的命名空间（共享 `IP`、network、`IPC`）——`Pod` 内多容器共享网络的关键。作用：①创建 `Pod` 的网络/IPC 命名空间（共享）②作为“持网络命名的”容器——网络/`IP` 归属 `pause`，业务容器共享。**
    - **`pause` 是什么**
        - `Pod` 里第一个静默容器（`pause`，镜像 `registry.k8s.io/pause`——`k8s.gcr.io` 已迁移弃用），**极简**（无业务逻辑，只是 `pause` 挂起）。
        - `kubelet` 创建 `Pod` 时先起 `pause`（`sandbox`），再起业务容器——业务容器加入 `pause` 的命名空间。
    - **作用（关键）**
        - **① 网络命名空间**：`pause` 创建 `Pod` 的**网络命名空间**（`Pod IP` 挂在 `pause` 上）——业务容器**共享** `Pod` 的 `IP`/网络（多个容器同 `IP`、`localhost` 互访）。
        - **② `IPC`/`PID` 等命名空间**：`pause` 建立 `Pod` 的 `IPC`（跨进程通信）等，业务容器共享。
        - **③ 持网络身份**：`Pod` 的 `IP` 归 `pause`（`pause` 持 network namespace），业务容器加入——`Pod` 销毁时业务容器先停、`pause`（沙箱）最后删、网络命名空间最后释放。
        - **④ 作为“回收”容器**：`Pod` 里容器退出/重建时 `pause` 一直活（保持命名空间稳定）；`Pod` 挂时 `pause` 清理。
    - **一句话理解**
        - `pause` 像"**房间的骨架/网线**"——`Pod`（房间）先立一根"网线杆"（`pause`）把网络/IP 建好，其他"家具/人"（业务容器）**都连这根网线**（共享 `IP`/网络）；`Pod` 的网络身份（`IP`）在 `pause`（网线杆）上，`Pod` 删时网线杆（`pause`）先撤（网络释放）——**pause 是 Pod 的"网络底座/身份持有者"**。

- **协助记忆**
    - 口诀：“**pause 是 Pod 的基础设施容器——创建网络/IPC 命名空间、持 Pod IP、业务容器共享（同 IP/localhost）**”。
    - 一句话：“**pause 建 Pod 网络命名空间、持有 Pod IP，业务容器共享**”。

- **进阶思考**
    - **为什么 `Pod` 里多个容器能共享 `IP`（同 `IP`/localhost 互访）？**
        - 因为 `pause` 先建**网络命名空间**（`Pod IP` 挂 `pause`），`kubelet` 让业务容器**`join` 到 `pause` 的网络命名空间**——多个业务容器**共享同一个网络命名空间**（同一 `IP`、`loopback` 互通）——这就是"一个 `Pod` 多个容器共享网络"的底层（`pause` 是基础）。
    - **`pause` 容器能看到吗/能删吗？**
        - **`kubelet`/`crictl` 能看到 `pause`**（`crictl ps -a`/`crictl inspect` 看 `sandbox`/`pause` 容器），但 `Pod` 里（`kubectl get pod`）**不显示** `pause`（它是 `infra` 容器，`kubectl` 只显示业务容器）；`pause` 由 `kubelet` 管理（不能手动删——删了 `Pod` 网络乱）。

- **扩展信息**
    - **镜像**：`registry.k8s.io/pause`（`pause` 镜像，从 `k8s` 镜像源拉）；`sandbox`（`CRI` 的 `PodSandbox`）。
    - **`CRI`**：`kubelet` 用 `CRI` `RunPodSandbox`（起 `pause`，建沙箱/网络）→ `CreateContainer`（业务容器加入）。
    - **参考**：`crictl ps -a`（看 `pause`）、`kubectl exec`（进业务容器看网络）。

## 🤔 Kubernetes 准入控制器有什么用？ 
- **准入控制器（`Admission Controller`）在请求写入 `API Server` 前/后校验/修改——用于安全/校验/默认值/强制（如资源配额、安全基线、`PodSecurity`、`ServiceAccount` 注入）。核心：“准入控制器是请求进 `etcd` 前的“检查/修改岗”——校验合法性、注入默认值、强制安全”。**
    - **准入控制是什么**
        - `API Server` 在**处理请求（`create`/`update`/`delete`）写 `etcd` 前**，经过**准入控制器链**——每个准入控制器**校验/修改**请求（接受/拒绝/改）。**
        - 分两类：**`Mutating`**（修改请求——注入默认值/`label`/`serviceAccount` 挂载）和 **`Validating`**（校验——拒绝非法/不合规）。**
    - **准入控制器作用（干什么）**
        - **① 校验/安全**：拒绝非法资源（`ResourceQuota`/`LimitRange`——限制资源/配额）、`PodSecurity`（安全基线，拒绝特权/危险 `Pod`）、`Namespace` 校验。
        - **② 注入/默认值**：`MutatingAdmissionWebhook`（如 `istio` 注入 `sidecar`——给 `Pod` 注入 `envoy` 容器）、`ServiceAccount`（给 `Pod` 注入 `serviceAccount`）。
        - **③ 强制策略**：`PodSecurity`（`PSA`，`v1.25` GA——**取代**旧的 `PodSecurityPolicy`（`PSP`），强制 `restricted`）、`ObjectQuota`、`NodeRestriction`（限制 `kubelet` 只能改自己节点）。
        - **④ 审计/多租户**：`NamespaceLifecycle`（`Namespace` 生命周期）、`resourcequota`（`quota`）。
    - **常见准入控制器（`k8s 1.x`）**
        - **内置**：`NamespaceLifecycle`、`LimitRanger`、`ResourceQuota`、`ServiceAccount`、`PodSecurity`（`PSA`）、`NodeRestriction`、`DefaultStorageClass`、`podtolerations`/`TaintNodesByCondition`、`AdmissionWebhook`（`MutatingWebhook`/`ValidatingWebhook`）。
        - **`Webhook`**（`MutatingAdmissionWebhook`/`ValidatingAdmissionWebhook`）：外部准入（如 `istio` sidecar 注入、`OpaGate`、`Kyverno` 策略）——`K8s` 可扩展准入。
    - **一句话理解**
        - 准入控制器像"**入住前的审查/装修**"——你申请租房子（`create Pod`），审查岗（准入控制器）检查：①够不够格（资源配额/安全基线——`Validating`）②要不要顺便装修（注入 `sidecar`/默认值/`serviceAccount`——`Mutating`）——**进门（写 `etcd`）前先过审查/装修**。

- **协助记忆**
    - 口诀：“**准入控制器=请求写 etcd 前的检查/修改——Mutating（注入默认/sidecar）/Validating（校验/配额/安全）**”。
    - 一句话：“**准入控制器 = 请求进 etcd 前的审查/装修——校验合法性 + 注入默认值**”。

- **进阶思考**
    - **`MutatingAdmissionWebhook` 和 `ValidatingAdmissionWebhook` 区别？**
        - `Mutating`：**修改**请求（如给 `Pod` 注入 `sidecar`/默认 `label`/`serviceAccount`），`MutatingWebhookConfiguration`；`Validating`：**校验**请求（拒绝不合规，如安全策略/配额），`ValidatingWebhookConfiguration`——**一个改、一个查**，`Mutating` 先跑、`Validating` 后跑。
    - **准入控制器能防什么（安全场景）？**
        - 防**特权容器/危险 `Pod`**（`PodSecurity`/`Kyverno` 拒绝 `privileged`/`hostPath`/`hostPID`）；防**资源滥用**（`ResourceQuota`/`LimitRange` 限配额/限额）；防**非授权**（`RBAC` + 准入）。`Kyverno`（策略）/`OpaGate`（`OPA` 通用策略）——准入控制器是"集群策略入口"。

- **扩展信息**
    - **`PodSecurity`（`PSA`）**：`PodSecurity` 三级（`privileged`/`baseline`/`restricted`）——安全基线（`v1.25` GA）替代 `PodSecurityPolicy`（`PSP`）。
    - **`Webhook`**：`MutatingAdmissionWebhook`/`ValidatingAdmissionWebhook`（`admissionregistration.k8s.io`）——常见：`istio`（sidecar 注入）、`Kyverno`（策略）、`OpaGate`（`OPA`）。
    - **参考**：`kube-apiserver --enable-admission-plugins`、`kubectl get validatingwebhookconfiguration`。

## 🤔 kube-proxy 主要功能有哪些？ 
- **`kube-proxy` 是每个节点上实现 `Service` 网络转发的组件，主要功能：①实现 `Service`（`ClusterIP`/`NodePort` 负载均衡——把流量转发到后端 `Pod`）②监听 `Service`/`Endpoint` 变化更新转发规则 ③只转发就绪 `Pod`（`readiness`）④`iptables`/`IPVS` 代理。核心：“kube-proxy 实现 Service 负载均衡（流量分到后端 Pod）+ 动态更新转发规则”。**
    - **① 实现 `Service` 负载均衡（核心）**
        - `kube-proxy` 把访问 `Service`（`ClusterIP`/`NodePort`）的流量**转发到后端 `Pod`**（负载均衡）——`Service` 的"声明"由 `kube-proxy` 实现（`iptables`/`IPVS` 规则）。
        - 每个节点上的 `kube-proxy` 都维护 `Service` → 后端 `Pod` 的转发（`kube-proxy` 是 `Service` 的实现者）。
    - **② 监听变化/更新转发规则**
        - `kube-proxy` **监听 `Service`/`Endpoint`（`EndpointSlice`）变化**——`Pod` 增减/`Service` 变 → 动态更新 `iptables`/`IPVS` 规则（让 `Service` 转发到最新健康后端）。
        - **自动**：`Pod` 挂了/`readiness` 失败 → 从 `Endpoint` 剔除（不转发）；新增 → 加规则。
    - **③ 只转发就绪 `Pod`**
        - `kube-proxy` 转发目标来自 `Endpoint`（`readiness` 通过的就绪 `Pod`）——**不把流量给它未就绪的 `Pod`**（`readiness` 失败剔除）；保证流量到健康后端。
    - **④ `iptables`/`IPVS` 代理（`--proxy-mode`）**
        - **`iptables`**（默认）：`iptables` 规则（`DNAT` + 随机概率）转发——默认、无需模块。
        - **`IPVS`**（大集群/高并发）：内核 `IPVS`（轮询/加权等）转发——性能好。
        - **`userspace`**（旧，已移除）。
    - **一句话理解**
        - `kube-proxy` 像"**每个楼层的前台分信员**"——它知道"哪个 `Service`（名称）对应哪些房间（`Pod`）"（监听 `Service`/`Endpoint`），外来"信"（请求）按表分给**健康的后端房间**（`readiness` 就绪 `Pod`，`iptables`/`IPVS` 转发）——**前台分信 + 自动更新分信表**。

- **协助记忆**
    - 口诀：“**kube-proxy = Service 负载均衡（流量到后端 Pod）+ 监听 Service/Endpoint 更新规则 + 只转发就绪 Pod + iptables/IPVS 代理**”。
    - 一句话：“**kube-proxy 实现 Service 负载均衡，动态更新、转发到健康后端**”。

- **进阶思考**
    - **`kube-proxy` 和 `Service` 什么关系？**
        - `Service`（`K8s` 资源）是**声明**（要稳定入口/后端）；`kube-proxy` 是**实现**（节点上把 `Service` 流量转发到后端 `Pod`）——`Service` 管"要什么"，`kube-proxy` 管"怎么转"（`iptables`/`IPVS` 规则）——**两者配合 `Service` 才可用**。
    - **`kube-proxy` 是单点吗/高可用？**
        - **每个节点一个 `kube-proxy`**（`DaemonSet`/`kube-proxy` Pod），覆盖所有节点——不是单点（每节点各自转发）；`kube-proxy` 高可用靠节点各自运行（`DaemonSet`，每节点一个）。

- **扩展信息**
    - **组件**：`kube-proxy`（`DaemonSet`/每节点）、`iptables`/`IPVS`（内核转发）、`Endpoint`/`EndpointSlice`（后端）。
    - **配置**：`--proxy-mode=iptables/ipvs`、`--cluster-cidr`、`--kubeconfig`（连 `API Server`）。
    - **参考**：`kubectl get svc`、`kubectl get endpoints`、`kube-proxy` 日志。

## 🤔 kubectl top 命令的数据来源是哪里？ 
- **`kubectl top` 的数据来源是 `Metrics Server`（`metrics.k8s.io` API）：`kubectl top node/pod` 从 `Metrics Server` 拿节点/Pod 的 `CPU`/内存使用量（`Metrics Server` 再从 `kubelet` 的 `Summary API`/`cAdvisor` 采集）。核心：“kubectl top 数据来自 Metrics Server（metrics.k8s.io），Metrics Server 从 kubelet/cAdvisor 采集”。**
    - **数据链路**
        - **① `kubectl top node/pod`** → 请求 **`Metrics Server`**（`metrics.k8s.io` API）——`Metrics Server` 是集群级指标聚合器。
        - **② `Metrics Server`** → 从每个节点的 **`kubelet`（`Summary API`）** 采集节点/Pod 的 `CPU`/内存（`cAdvisor` 采集容器指标，`kubelet` 暴露 `/stats/summary`）。
        - **③ `Metrics Server` 聚合** → `metrics.k8s.io` 暴露 → `kubectl top` 显示。
    - **`kubectl top` 数据源（要点）**
        - **`Metrics Server`**：`kubectl top` 的数据来源（`metrics.k8s.io`）；没有 `Metrics Server` → `kubectl top` 报错（`error: metrics.k8s.io not available`/`unable to connect`）。
        - **`kubelet`/`cAdvisor`**：`Metrics Server` 从 `kubelet`（`cAdvisor` 采集容器指标）拿数据——`Metrics Server` 是"中间商"（聚合 `kubelet`，`kubectl top`/`HPA` 用）。
        - **短时**：`Metrics Server` 保留短暂（内存）的 `CPU`/内存（实时，非历史——历史用 `Prometheus`）。
    - **`kubectl top` 和 `Prometheus` 区别**
        - `kubectl top`（`Metrics Server`）：**实时/短时** `CPU`/内存（只看当前），给 `kubectl top`/`HPA`；
        - `Prometheus`：**历史/时序**多指标（`CPU`/内存/磁盘/网络/自定义）——`Grafana` 看趋势/告警——两者互补（`Metrics Server` 实时、`Prometheus` 长时序）。
    - **一句话理解**
        - `kubectl top` 像"**前台查实时能耗表**"——它**不自己测**，而是问 `Metrics Server`（物业能耗管理员）——`Metrics Server` 从各楼层（`kubelet`/`cAdvisor`）收集能耗（`CPU`/内存）转给前台（`kubectl top`）——**数据来自 Metrics Server（再底层是 kubelet/cAdvisor）**。

- **协助记忆**
    - 口诀：“**kubectl top ← Metrics Server（metrics.k8s.io）← kubelet Summary API/cAdvisor——实时 CPU/内存，历史用 Prometheus**”。
    - 一句话：“**kubectl top 数据来自 Metrics Server（底层 kubelet/cAdvisor）**”。

- **进阶思考**
    - **没装 `Metrics Server` 能 `kubectl top` 吗？**
        - 不能——`kubectl top` 依赖 `Metrics Server`（`metrics.k8s.io`），没装报错（`error: metrics.k8s.io not available`）——**要先装 `Metrics Server`** 才能 `kubectl top node/pod`（`HPA` `CPU` 也要它）。
    - **`kubectl top` 能看到哪些指标？**
        - 只 **`CPU`/内存**（`Metrics Server` 只采这俩）——`kubectl top node/pod`（`%CPU`/MEM）；磁盘/网络等看 `node_exporter`/`Prometheus`（`Metrics Server` 不采）。

- **扩展信息**
    - **命令**：`kubectl top node`、`kubectl top pod`、`kubectl top pod --sort-by=cpu`；`kubectl top nodes`。
    - **`Metrics Server`**：`metrics.k8s.io` API、从 `kubelet` `Summary API` 采集（`cAdvisor`）、`metadata-server`（`kubelet` `/stats/summary`）。
    - **参考**：`kubectl get apiservice`（看 `metrics.k8s.io`）、`kubectl describe node`。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-k8s%E5%AE%B9%E5%99%A8.2/  

