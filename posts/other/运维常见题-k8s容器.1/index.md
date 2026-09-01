# 运维常见题-K8s容器（一）


## 🤔 K8s 有哪些应用场景？ 
- **`K8s`（Kubernetes）是“容器编排平台”，核心价值是把成百上千个应用容器自动地、有秩序地管理起来——你告诉它“我要跑多少个什么样的容器”，它负责调度到哪台机器、挂了自动重启、流量大了自动扩容。核心本质：“运维自动化 + 平台化”——让“部署、扩缩容、自愈、发布”这些重复劳动变成声明式配置交给系统。**
    - **核心要解决的问题：容器多了怎么管？**
        - 单个容器用 `docker run` 手动起就行；但生产是几十上百个容器（微服务），手动管根本忙不过来——谁跑哪台、谁挂了、流量来了加几个、版本怎么升级。`K8s` 就是这套“自动化管家”，把容器的生命周期全管起来。

    - **主要应用场景（按用途分）**
        - **微服务部署**：把一个大系统拆成多个小服务，每个服务是独立容器，`K8s` 统一调度这些服务（这是最主流、最核心的场景）
        - **弹性伸缩**：流量高峰期自动加容器（扩容），低谷自动减（缩容），业务量波动不用人工干预
        - **故障自愈**：容器挂了/机器宕了，`K8s` 自动重启/换机器，保证服务不中断（高可用）
        - **滚动更新/灰度发布**：升级版本时不中断服务，一批批替换旧容器，出问题能回滚
        - **批量任务**：一次性计算任务（如数据批处理、定时任务 `CronJob`），跑完即收
        - **有状态应用**：数据库、缓存、消息队列等需要持久化数据的应用（`StatefulSet`）
        - **混合云/多云**：同一套资源清单可跨云部署，但需按目标云适配存储/网络（`CNI`）/负载均衡等——不是“一键自由搬迁”，而是“可迁移 + 需适配”

    - **一句话理解**
        - 想象一个“写字楼物业”：你租了多少间办公室（容器），物业负责水电、清洁、维修、房间分配——坏了马上修，人多了加房间。`K8s` 就是这个“容器物业”，你只管说“要 5 间房跑我的应用”，物业自动搞定。

- **协助记忆**
    - `K8s` 像“**酒店前台 + 客房管家**”——你订房时（提交配置）说“要 5 间标间、能加班”，前台自动给你分配楼层（调度到节点）、房卡（网络）、保洁（自愈）；客人走了自动打扫（回收），临时加人要加房（扩容）。你只需“下订房单”，不用操心房间怎么分。
    - 口诀：“**容器多了要人管，K8s 是自动管家——调度、自愈、扩容、升级全交给它**”。

- **进阶思考**
    - **为什么要用 K8s，直接用 Docker 不行吗？**
        - `Docker` 解决“单个容器怎么跑”，`K8s` 解决“很多容器怎么协同”。单机几个容器用 `docker-compose` 够；但上百容器跨多台机器、要高可用/弹性/灰度，`docker` 做不到，需要 `K8s` 这样的编排平台。`Docker` 是“单间”，`K8s` 是“整栋楼的智能管理系统”。
    - **微服务和 K8s 是什么关系？**
        - 微服务是“架构风格”（把系统拆成小服务），`K8s` 是“跑微服务的基础设施”——微服务拆出来的每个服务都是容器，`K8s` 负责调度、服务发现、负载均衡它们。所以微服务 + 容器 + K8s 是常见组合（微服务是思想、容器是载体、K8s 是管理平台）。

- **扩展信息**
    - **名字由来**：`Kubernetes` 希腊语“舵手”（掌舵人），`K8s` 是缩写（`K` + 中间 8 个字母 `ubernete` + `s`）。
    - **生态地位**：`K8s` 是 `CNCF`（云原生计算基金会）的旗舰项目，已成为**容器编排的事实标准**，几乎所有云厂商（阿里 `ACK`、腾讯 `TKE`、华为 `CCE`、AWS `EKS`）都基于它。
    - **云原生概念**：`K8s` 是“云原生”（`Cloud Native`）的核心——“用容器打包、K8s 调度、微服务拆分、自动扩缩”，是现代化应用的标准形态。
    - **学习路线建议**：先理解“容器/镜像/Pod”概念 → 再学常用资源（`Deployment`/`Service`）→ 深入调度/存储/网络 → 最后 `Operator`/服务网格等进阶。

## 🤔 简述 K8s 核心组件及作用？ 
- **`K8s` 是“主从架构”：一组控制节点（`Master`）管全局，一组工作节点（`Node`）干具体活。控制节点上的核心组件：`API Server`（总入口，所有操作的前台）、`etcd`（集群的数据库）、`Scheduler`（调度器：决定容器跑哪台机器）、`Controller Manager`（控制器：盯着实际状态符合期望）；工作节点上的：`kubelet`（节点管家，管本机容器）、`kube-proxy`（网络代理）、`Container Runtime`（容器运行时）。核心：“主控脑 + 干活腿”。**
    - **控制节点（`Master` 组件，集群的大脑）**
        - **`API Server`（`kube-apiserver`）**：**集群唯一入口**，所有操作（创建/查询/删除）都要经过它——像酒店“总前台”，你的一切请求都先到它这，它校验、记账再给内部。
        - **`etcd`**：**集群的分布式数据库**，存所有配置和状态（“哪个 Pod 在哪台机器、什么状态”）——像酒店的“总账本”，全集群的“真相”都在这里。
        - **`Scheduler`（`kube-scheduler`）**：**调度器**，决定“新 Pod 放哪台机器”——像酒店前台“分配房间”：看哪层空、哪个房间合适，把 Pod 派到合适的节点。
        - **`Controller Manager`（`kube-controller-manager`）**：**控制器集合**，持续对比“期望状态 vs 实际状态”，发现不一致就修复——像酒店“巡楼经理”：看到房间该有 5 个人只有 3 个，就补上。

    - **工作节点（`Node` 组件，集群的腿）**
        - **`kubelet`**：**每个节点上的“节点管家”**，负责启动/监控本节点的容器 Pod，定期向 `API Server` 汇报本机状态——像每层楼的“保洁员”，管这一层的房间（Pod）死活。
        - **`kube-proxy`**：**网络代理**，监听并为 `Service`（`ClusterIP`，由 `API Server` 创建服务时分配）**编程转发规则**（`iptables`/`IPVS`）实现**流量转发与负载均衡**（把请求正确转发到后端 `Pod`）——像每层楼的“传菜员”；集群内**服务发现**（按名字找到服务）主要由 `CoreDNS`/`Service` 承担。
        - **`Container Runtime`（容器运行时）**：真正**跑容器**的引擎（`containerd`/`docker`/`CRI-O`）——像“施工队”，按 `kubelet` 的指示真正把容器跑起来。

    - **补充组件（易问）**
        - **`kubectl`**：**命令行工具**（你操作集群用的），像“遥控器”，但 `kubectl` 是客户端工具、不是集群组件。
        - **`DNS`（`CoreDNS`）**：集群内服务发现（按名字找到服务），像“大楼内部分机表”。

    - **一句话理解**
        - **`Master` 像写字楼管理处**（前台收单 `API Server`、账本 `etcd`、分房 `Scheduler`、巡逻 `Controller`），**`Node` 像各个楼层**（保洁 `kubelet`、分信 `kube-proxy`、施工 `runtime`）。你通过“游客”（`kubectl`）向前台下单，管理处协调各楼层干活。

- **协助记忆**
    - `K8s` 集群 = “**大饭店**”——`API Server` 是**前台**（客人都先到这）、`etcd` 是**订房总账**（记录谁住哪）、`Scheduler` 是**大堂经理**（安排客人去哪间房）、`Controller Manager` 是**巡楼主管**（检查每间房是否按要求到位、缺就补）、`kubelet` 是**服务员**（管一个楼层房间收拾）、`kube-proxy` 是**传菜员**（把点餐正确送到对应桌）、`runtime` 是**厨师**（真正做菜/跑容器）。
    - 口诀：“**主控管全局、节点干干活——前台（API）、账本（etcd）、分房（Scheduler）、巡逻（Controller），节点上管家（kubelet）、传信（proxy）、做饭（runtime）**”。

- **进阶思考**
    - **为什么所有操作都走 `API Server`（它是单点瓶颈吗）？**
        - `API Server` 是“统一入口 + 校验 + 记账”，好处是**一致性**（所有操作有记录可审计）、**安全**（统一认证授权）。它本身可以横向扩展（多副本负载均衡），不是瓶颈；真正全集群数据在 `etcd`（也要 `etcd` 集群化高可用）。
    - **`etcd` 挂了集群会怎样？**
        - `etcd` 是“总账本”，它挂了集群**无法读写状态**（`API Server` 也访问不了），集群进入“只读/半瘫”状态——现有 Pod 继续跑（`kubelet` 本地维持），但**不能新建/变更/调度**。所以 `etcd` 必须集群化（奇数节点）保证高可用（这是 K8s 高可用最关键的依赖）。

- **扩展信息**
    - **组件分类记忆**：`Master` 管集群（`API Server`/`etcd`/`Scheduler`/`Controller`），`Node` 管单机（`kubelet`/`kube-proxy`/`runtime`）——“主控管全局、节点管单机”。
    - **`kubectl` 的作用**：你操作 `K8s` 主要用 `kubectl`（如 `kubectl get pods` 看 Pod、`kubectl create` 创建资源），实际都是发给 `API Server` 执行的。
    - **参考**：`kube-scheduler`/`kube-controller-manager`（`Master` 组件多副本高可用）、`kubelet`/`kube-proxy`（`Node` 组件）、`CoreDNS`（集群 `DNS`）。

## 🤔 K8s 集群如何实现高可用？ 
- **`K8s` 高可用分两层：控制面（`Master`）高可用保证“集群能正常调度/管理”，工作负载高可用保证“应用不中断”。控制面高可用靠“多副本控制节点 + `etcd` 集群 + 负载均衡”；工作负载高可用靠“多副本 `Pod` + 自动调度 + 故障自愈”。核心：“主控多副本、数据多节点、应用多实例”。**
    - **控制面高可用（`Master` 组件不单点）**
        - **`API Server` 多副本**：部署 3 个（或更多）`kube-apiserver`，前面用**负载均衡**（`LB`）分发请求——任一 `API Server` 挂，`LB` 自动切到其他，集群管理入口不中断。
        - **`etcd` 集群化**：`etcd` 部署**奇数节点**（3/5 个）做集群，用**多数派（`Quorum`）**保证一致性——挂 1 个 `etcd`（3 节点）集群还正常，保证“总账本”永远可读可写。这是控制面高可用的**最关键**一环。
        - **`Scheduler`/`Controller` 多实例**：`kube-scheduler`/`kube-controller-manager` 也可以多副本（通过 `leader election` 选主，同一时刻只有一个干活，挂了自动接管）——避免单点。

    - **工作负载高可用（应用不中断）**
        - **多副本 `Pod`**：应用（`Deployment`）跑**多个 `Pod` 副本**（如 3 个）分布在不同节点——一个 `Pod`/节点挂了，还有 2 个顶着服务，不中断。
        - **副本跨节点分散**：默认调度器对同类副本**倾向分散**（默认评分策略 `LeastAllocated` 倾向占用量低），但**不严格保证**跨节点错开——要强约束需显式配置 `PodAntiAffinity`/`TopologySpreadConstraints`（`NodeResourcesFit` 既是**资源过滤**（检查节点能否容纳 `Pod`）也是**评分插件**（默认 `LeastAllocated` 倾向分散，bin-packing 打包需显式启用 `MostAllocated`/`RequestedToCapacityRatio`）——避免副本都落一台机器。
        - **故障自愈**：`kubelet` 监控容器死活，挂了自动重启；节点宕了，`Controller` 检测到 `Pod` 异常，会在其他节点**重新创建**副本（`ReplicaSet` 维持副本数）——自动恢复。
        - **健康检查**：`Pod` 配 `探针`（`liveness`/`readiness`），`liveness` 检测“容器是否健康，不健康就重启”，`readiness` 检测“是否可接入流量，不健康就剔除”——保证流量只到健康的 Pod。

    - **一句话理解**
        - 高可用 = **“一个坏了还有别的”**。控制面（管理处）多几个前台+多本账本（`etcd` 集群）+ 前台挂了能顶替；工作负载（应用）多几个服务员（`Pod` 副本）+ 坏了自动换人。这样不管哪层出问题，服务都不中断。

- **协助记忆**
    - `K8s` 高可用 = “**连锁餐厅**”——不是只有一家店（单点），而是：总部（`Master`）有多个管理层（多前台 + 多账本 + 轮值经理），每家店（节点）都有几个服务员（`Pod` 副本），某个服务员辞职（POD 挂）立刻换人（自愈），某个店着火（节点宕）其他店正常营业（分散）。**无论哪个环节坏，餐厅都能继续营业**。
    - 口诀：“**主控多副本、`etcd` 凑奇数、Scheduler/Controller 轮流选主——应用多副本分散、探针保健康、挂了自动换**”。

- **进阶思考**
    - **高可用集群最少要几台机器？**
        - 生产一般**至少 3 控制节点**（`etcd` 3 节点 + `API Server` 3 副本，能容忍挂 1 台）+ **若干工作节点**（应用副本分散）。3 控制节点是能用 `etcd` 多数派的最小规模（挂 1 台还剩 2 台 > 1.5 多数），5 节点更稳（挂 2 台）。
    - **`etcd` 为什么必须是奇数节点？**
        - `etcd` 用**多数派（`Quorum` = 半数以上）**保证一致性：3 节点挂 1 还剩 2（多数派）能正常读写；4 节点挂 2 还剩 2（正好半数不算多数派）就**协议不可用**（`Raft` 失去多数派表现为“不可用”而非脑裂）。所以用**奇数**节点——同样机器数下容错更高（3 挂 1、5 挂 2；4 只能挂 1，浪费一台）。

- **扩展信息**
    - **`leader election`（选主）**：`Scheduler`/`Controller` 多副本时，通过 `kube-controller-manager` 的选主机制（`--leader-elect`）保证同一时刻仅一个活跃（防止多个同时调度导致冲突）。
    - **`Pod` 跨节点分散**：可用 `Pod 反亲和`（`PodAntiAffinity`）让副本尽量不同节点、`PodDisruptionBudget`（`PDB`）限制“同一时刻最多能停几个副本”（滚动升级/节点维护时保可用）。
    - **高可用 vs 容灾**：`K8s` 高可用主要防“**节点/组件级故障**”；要防“**整个集群/机房灾难**”（如整个 `Master` 集群挂），还需**跨集群/多集群**方案（如联邦、多集群调度）——高可用是“集群内”，容灾是“跨集群”，层次不同。
    - **参考**：`HAProxy`/云 `LB`（`API Server` 前负载均衡）、`etcd` `quorum`、`ReplicaSet`（维持副本数）、`liveness/readiness` 探针、`PodAntiAffinity`/`PDB`。

## 🤔 Pod 解决了什么问题？ 
- **`Pod` 是 `K8s` 的最小调度/部署单元：把一个或多个关系紧密的容器打包在一起（共享网络、存储、生命周期），一起调度、一起启动、一起销毁。它解决的核心问题：“容器不能裸奔”——K8s 管的是 `Pod` 而不是单个容器，让“一组必须协同的容器”被当作一个整体管理。**
    - **`Pod` 是什么**
        - 一个 `Pod` = 一个“业务逻辑单元”：通常**一个主容器**（业务）+ 可能的**辅助容器**（如日志收集、网络代理——`sidecar` 模式）。
        - 是 `K8s` 中**最小调度单元**（`K8s` 不直接调度容器，而是调度 `Pod`）、最小部署单元（一个 `Pod` 是部署的原子）。

    - **它解决的核心问题**
        - **容器组合**：有些容器必须**同生共死、共享资源**（如同一个应用 + 它的日志采集容器），分开调度会断；`Pod` 把它们打包成一个“整体”，一起运行。
        - **共享网络**：`Pod` 内所有容器**共享同一个网络命名空间**（共享 `IP`，可 `localhost` 互访）——这是“为什么一个 Pod 能有多个容器”的关键。
        - **共享存储**：`Pod` 内容器可共享挂载的**存储卷**（`Volume`），数据互通。
        - **统一生命周期**：一起启动、一起销毁——`Pod` 是一个“生物”，整个 `Pod` 存亡是整体。

    - **为什么不是直接管容器（关键）**
        - 单个容器太“碎”（一个容器一个进程/职责），而业务往往需要**一组协同容器**（如 web + 日志 + 探针）。`Pod` 是“贴合业务的一组容器”，是 `K8s` 管理的基本粒度——**你管的是“Pod 群”，不是“容器个体”**。

    - **一句话理解**
        - `Pod` 就像“**一个房间里的几位室友**”——他们必须住一起（同一间房，共享网络/存储）、同住同散（一起搬进/搬出），`K8s` 物业（调度器）做“房间分配”，管的是“房间”（Pod）而不单独管每个室友（容器）。

- **协助记忆**
    - `Pod` 像“**一房多室友**”——同房（共享网络/存储）、同住同散（一起调度/销毁），`K8s` 按“房间”（Pod）来管，不单独管每个“室友”（容器）。
    - 口诀：“**Pod 是打包容器的最小单元——同网、同卷、同生死，K8s 管 Pod 不管裸容器**”。

- **进阶思考**
    - **一个 Pod 里到底放几个容器？**
        - 通常**一个主容器**（一个 `Pod` 一个容器最常见）；多个容器仅在**强协同**时（`sidecar` 模式：如业务容器 + 日志采集、业务 + 网络代理 `istio`），且要**同生命周期**。关系松散、应独立扩缩的服务别塞进一个 `Pod`（那会一起扩缩、浪费资源）。
    - **`Pod` 和容器是什么关系？**
        - `Pod` 是最小**编排/调度**单元，容器是最小**运行**单元——一个 `Pod` 里可有一个或多个容器。你写 `Deployment` 指定的是“要多少个 `Pod`，每个 `Pod` 跑什么容器”，`K8s` 以 `Pod` 为单位调度。

- **扩展信息**
    - **`Pod` 与容器网络**：`Pod` 内多个容器共享一个网络命名空间（同一 `IP`、端口 `localhost` 可通），这是“一个 Pod 多容器能协同”的基础。
    - **`Pod` 生命周期**：`Pod` 是“短命”的（无状态），挂了会被 `Deployment` 重建（新 `Pod` 新 `IP`）；需要持久数据用 `Volume`、需要固定身份用 `StatefulSet`。
    - **相关概念**：`Pod` 是最小单元，上层用 `Deployment`（无状态）/`StatefulSet`（有状态）/`DaemonSet`（每节点一个）管理 `Pod`——理解 `Pod` 是理解 `K8s` 一切资源的基石。

## 🤔 K8s 有哪些工作负载资源？ 
- **`K8s` 的“工作负载资源”是管理 Pod 的控制器，按场景分：`Deployment`（无状态应用，最常用）、`StatefulSet`（有状态应用，要固定网络 ID/数据）、`DaemonSet`（每个节点跑一个）、`Job`（一次性任务）、`CronJob`（定时任务）、`ReplicaSet`（维护副本数的底层控制器）。核心：“按应用是否有状态、是一次性还是常驻、是否每节点都要，选对应控制器”。**
    - **`Deployment`（无状态应用，最常用）**
        - 管理**无状态**应用（web/API 等，数据不存本地），声明“要多少副本”，自动维持副本数、滚动更新、回滚——最主流，日常部署用它。
        - 底层由 `ReplicaSet`（维护副本数）+ 版本管理组成，支持滚动更新/灰度回滚。

    - **`ReplicaSet`（底层控制器）**
        - 维护**指定数量**的 `Pod` 副本（始终保证“有 N 个”），`Deployment` 内部管理它；一般你不直接建 `ReplicaSet`，而是用 `Deployment`（它更高级）。

    - **`StatefulSet`（有状态应用）**
        - 管理**有状态**应用（数据库/`Redis`/`Kafka` 等，要持久化数据、固定身份）——保证每个 `Pod` 有**固定网络 ID**（`web-0`/`web-1`）、**固定存储卷**，按序启动/升级。
        - 适合：需要稳定标识、持久存储、有序部署的应用（数据集群）。

    - **`DaemonSet`（每个节点一个）**
        - 确保**每个**（或指定节点都有）一个 `Pod`——如日志采集（`Fluentd`）、监控探针（`node-exporter`）、网络插件（`CNI`）——每个节点都要跑的服务。

    - **`Job` / `CronJob`（任务）**
        - **`Job`**：一次性**批处理任务**（跑完即止，成功退出）——如数据处理、批量计算。
        - **`CronJob`**：**定时任务**（`cron` 表达式调度）——如定期备份、定时报表。

    - **一句话理解**
        - 工作负载资源 = “**不同任务的管家**”：`Deployment` 管普通员工（无状态、随时可换），`StatefulSet` 管固定工位的老员工（有状态、工号固定），`DaemonSet` 管每个楼层的巡检员（每层一个），`Job`/`CronJob` 管临时工/固定周期的保洁（一次性/定时），`ReplicaSet` 是保证“人不少”的班表。

- **协助记忆**
    - 按“**身份 + 是否常驻**”选：“无状态常驻 → `Deployment`；有状态/固定身份+数据 → `StatefulSet`；每节点一个 → `DaemonSet`；一次性任务 → `Job`；定时任务 → `CronJob`；管副本数的底层 → `ReplicaSet`”。
    - 口诀：“**无状态 Deployment、有状态 StatefulSet、每节点 DaemonSet、一次性 Job、定时 CronJob**——按‘有没有状态、是不是常驻、要不要每节点’挑”。

- **进阶思考**
    - **`Deployment` 和 `StatefulSet` 怎么选？**
        - 应用**无状态**（数据不存本地、谁干都一样、挂了换新的）→ `Deployment`（简单、可随意扩缩）；应用**有状态**（需要持久数据 + 稳定网络标识，如数据库集群/`Kafka`/`Redis`）→ `StatefulSet`（保证固定 `Pod` 名、固定存储、有序启停）。
    - **`DaemonSet` 和 `Deployment` 区别？**
        - `Deployment` 按**数量**跑（默认均匀分布，副本数你定）；`DaemonSet` 按**节点**跑（每个（或匹配的）节点强制一个）——`DaemonSet` 适合“每个机器都要有”的基础组件（日志/监控/网络插件），`Deployment` 适合“要几个就跑几个”的业务应用。

- **扩展信息**
    - **`Workload` 概念**：这些控制 Pod 的资源统称“工作负载（`Workload`）”，是 `K8s` 管理应用的入口——你写 YAML 声明“我要什么”，控制器负责“持续满足它”。
    - **`ReplicaSet`（旧）`ReplicationController`**：`ReplicationController` 是 `ReplicaSet` 的前身（`selector` 仅支持**等值式** `key=value`，不含 `ReplicaSet` 引入的**集合式** `matchLabels/matchExpressions` 选择），已被 `ReplicaSet` 取代；`ReplicaSet` 又被 `Deployment` 封装。
    - **`Helm` 管理**：生产用 `Helm Chart` 打包/发布这些工作负载资源（`deployment.yaml`/`statefulset.yaml` 模板化），实现可复用部署。
    - **参考命令**：`kubectl get deployment/statefulset/daemonset/job/cronjob` 查看各类工作负载。

## 🤔 简述创建一个 Pod 的工作流程？ 
- **创建一个 `Pod` 的完整流程：你 `kubectl apply`/`create` 提交 `Pod` 定义 → `API Server` 校验并写入 `etcd` → `Scheduler` 监听到新 Pod，选一台合适节点并写回绑定 → 该节点 `kubelet` 收到指令，调用容器运行时（`Runtime`）真正创建并启动容器 → `kubelet` 回报状态。核心：“声明 → 记账 → 分派 → 干活 → 汇报”。**
    - **第一步：提交（你的请求）**
        - 你用 `kubectl create -f pod.yaml`（或 `apply`）提交 `Pod` 定义（YAML：镜像、资源、端口等）——请求发到 `API Server`。
    - **第二步：`API Server` 校验 + 记账**
        - `API Server` 校验请求（合法性/权限/资源限制），把 Pod **写入 `etcd`**（记录“要创建这个 Pod”的期望状态）——但此时**还没真正创建**。
    - **第三步：`Scheduler` 选节点**
        - `Scheduler` 监听到“有新的未调度 Pod”，根据**资源、亲和、污点**等给 Pod 选一台合适的节点（`Node`），调用 `API Server` 创建 `Binding` 对象（由 `API Server` 持久化到 `etcd`）完成绑定。
    - **第四步：`kubelet` 创建容器**
        - 选中节点上的 `kubelet` 监听到“本节点要跑这个 Pod”，调用**容器运行时**（`containerd`/`CRI-O` 等 `CRI` 兼容运行时——自 `K8s v1.24` 起 `dockershim` 已移除，`docker` 不能直接作为 `CRI` 运行时，需经 `cri-dockerd`）**拉取镜像、创建并启动容器**（按 YAML 定义），执行容器命令。
    - **第五步：汇报 + 健康检查**
        - `kubelet` 把 Pod 状态（`Running`/`Ready`）回报给 `API Server`/`etcd`；`Pod` 配了**探针**会持续检查（`readiness` 就绪才接流量）。整体流程就是“**声明 → 记账 → 分派 → 干活 → 汇报**”。

    - **一句话理解**
        - 就像“**网上下单订房**”——你下单（`kubectl apply`）→ 平台记账（`etcd`）→ 分配房间（`Scheduler` 选节点）→ 房卡/保洁准备入住（`kubelet`+`runtime` 创建容器）→ 前台回复“已入住”（汇报状态）。

- **协助记忆**
    - `Pod` 创建 = “**下单 → 记账 → 分房 → 入住 → 回执**”，对应 `kubectl` → `etcd` → `Scheduler` → `kubelet`+`Runtime` → 状态汇报。
    - 口诀：“**你提交（API）、它记账（etcd）、它分房（Scheduler）、它干活（kubelet/Runtime）、它汇报——五步建一个 Pod**”。

- **进阶思考**
    - **`Scheduler` 选节点时看什么？**
        - 主要看：**资源够不够**（`requests` 资源请求，节点要有足够剩余）、**节点标签/亲和**（`nodeSelector`/`nodeAffinity`）、**污点/容忍**（`taint`/`toleration`）、**Pod 间亲和/反亲和**（是否要同/异节点）、端口/存储要求。选中最优节点。
    - **如果所有节点都不够资源，Pod 会怎样？**
        - `Scheduler` 找不到合适节点，Pod 停在 **`Pending`** 状态（一直等）——常见原因：资源不足/污点不容忍/存储卷挂不上。所以看到 `Pending` 要查资源/污点/存储。

- **扩展信息**
    - **`kubectl` 常用命令**：`kubectl get pod`（看 Pod）、`kubectl describe pod <name>`（看详情/事件）、`kubectl logs <pod>`（看日志）、`kubectl exec -it <pod> -- bash`（进入容器）。
    - **不同创建方式**：`kubectl create`（创建）、`kubectl apply`（声明式，推荐——可重复应用、幂等），生产多用 `Helm`/`kubectl apply`。
    - **`Pod` `Status`**：`Pending`（等待调度/创建）、`Running`（运行中）、`ContainerCreating`（拉镜像中）、`CrashLoopBackOff`（反复崩溃重启）、`Completed`（任务完成）。
    - **参考**：`kubectl run`（快速跑一个 Pod）、`kubectl apply -f`（从 YAML 应用）、`Pod` 调度依赖 `Scheduler`。

## 🤔 Pod 有哪几种重启策略及应用场景？ 
- **Pod 重启策略（`restartPolicy`）决定“容器退出后 K8s 怎么处理”，三种：`Always`（总是重启，最常用）、`OnFailure`（失败才重启，任务场景）、`Never`（从不重启，一次性任务）。核心：“看这个 Pod 是常驻服务还是任务——常驻要 Always，失败重跑用 OnFailure，跑一次绝不重启用 Never”。**
    - **`Always`（总是重启）**
        - 容器**无论正常还是异常退出**，都自动重启——保证服务常驻不中断（哪怕容器是正常退出也拉起）。
        - **适用**：无状态常驻服务（web/API/微服务）——挂了要立刻拉起，是**最常用**；且 `Deployment` **强制且默认为 `Always`**（写成 `OnFailure`/`Never` 会校验失败）。
        - 特点：`CrashLoopBackOff`（反复崩溃时 K8s 会等待片刻再重启，防无限重启）；适合“必须一直在线”的应用。

    - **`OnFailure`（失败才重启）**
        - 容器**异常退出（退出码非 0）**才重启；**正常退出（退出码 0）不重启**——适合“做完了就算成功”的任务。
        - **适用**：`Job` 类任务（批处理/一次性计算）——失败了重试，成功了就结束（注意：`Job` **默认 `restartPolicy: Never`**、仅允许 `OnFailure`/`Never`）。

    - **`Never`（从不重启）**
        - 容器退出（无论成败）**都不重启**——适合“只能跑一次、结果定了就不动”的任务。
        - **适用**：一次性/一次性采集任务（跑完记录结果，重跑可能重复写数据）；监控它退出状态（`Completed`/`Failed`）。

    - **一句话理解**
        - `restartPolicy` 像“**店员的排班规则**”：`Always` = 全天在岗（无论啥原因离开都得立刻回来）；`OnFailure` = 只在你“犯错”（失败）时叫回来，正常下班不用回来；`Never` = 干完这件活就走，不管成败都不再叫。

- **协助记忆**
    - 按“常驻 vs 任务”选：“**常驻服务用 `Always`、失败重跑用 `OnFailure`、跑完即止用 `Never`**”。
    - 口诀：“**Always 常驻总重启、OnFailure 失败才重启、Never 成败都不重启——常驻选 Always，任务看要不要重试**”。

- **进阶思考**
    - **为什么 `Deployment` 默认 `Always`，但 `Job` 用 `OnFailure`？**
        - `Deployment` 是无状态常驻服务，目标是“永远有副本在跑”，所以 `Always`（挂了立刻拉起）；`Job` 是“跑完这一批就算成功”，`OnFailure` 让它在失败时重试、成功时淡定结束（若 `Always` 成功也重启反而“完成不了”）。策略要和“控制器目标”匹配。
    - **`CrashLoopBackOff` 是什么？**
        - 容器反复崩溃（`CrashLoop`）时，K8s 会**指数退避**等待（`BackOff`）再重启（实际序列 `10s/20s/40s/80s/160s/300s`，上限 `300s` 即 5 分钟；连续正常运行约 10 分钟后重置退避计数）——防止“无限快速重启”耗尽资源。看到 `CrashLoopBackOff` 说明应用**一直启动失败**，要去查日志找根本原因（配置错/启动依赖/资源不足）。

- **扩展信息**
    - **`restartPolicy` 只能控制 Pod 内容器**，且**影响 `Pod` 是否被重建**：`Always`/`OnFailure` 容器重启不换 `Pod`；但若 `Pod` 整个被删除（节点挂了/驱逐），则由上层控制器（`Deployment`）重建新 `Pod`——所以“重启策略”和“控制器重建”是两回事。
    - **`Job` 失败容错**：`Job` 配合 `backoffLimit`（失败重试次数）和 `ttlSecondsAfterFinished`（完成后保留时间），控制“重试几次/结果保留多久”。
    - **参考命令**：写 `Pod` YAML 的 `spec.restartPolicy`（`Always`/`OnFailure`/`Never`）；`kubectl get pod` 看状态、`kubectl describe pod` 看 `CrashLoopBackOff` 事件。

## 🤔 Pod 有哪几种探针（健康检查）及应用场景？ 
- **Pod 探针（`Probe`）是健康检查，K8s 定期探测容器是否正常。三种：`liveness`（存活探针：不健康就重启）、`readiness`（就绪探针：不健康就剔除流量）、`startup`（启动探针：慢启动应用先探测就绪，防重启误判）。核心：“liveness 管活不活（重启）、readiness 管能不能接流量（剔除）、startup 管慢启动”。**
    - **`livenessProbe`（存活探针，决定“重启”）**
        - 探测容器**是否活着/健康**；探测失败 → K8s **重启容器**（消灭僵尸容器，让它回到健康）。
        - **适用**：应用“活着但不响应请求/卡死”的情况（如进程在但线程死锁、内存泄漏假死）——重启让它恢复。
        - 探测方式（4 种）：`exec`（执行命令）、`httpGet`（HTTP 请求）、`tcpSocket`（端口连接）、`grpc`（嵌入式 `gRPC` 健康检查，需应用实现 gRPC Health Checking 协议；`v1.23` alpha、`v1.24` beta、`v1.27` 起 GA）。

    - **`readinessProbe`（就绪探针，决定“接流量”）**
        - 探测容器**是否准备好接收流量**；未就绪 → **从 Service 后端剔除**（不转发流量给它），但仍可被 liveness 重启。
        - **适用**：应用启动慢/依赖外部（连不上数据库就别接流量）、需要“就绪才能被访问”——保证流量只到能工作的 Pod。
        - 与 `liveness` 区分：readiness 失败**不重启**、只暂停/恢复转发；liveness 失败**重启**。

    - **`startupProbe`（启动探针，处理“慢启动”）**
        - 探测容器**是否完成启动**；启动期间不启用 liveness/readiness，成功后才交管——**防止慢启动应用被 liveness 误杀**（启动慢被当“假死”反复重启）。
        - **适用**：启动特别慢的应用（加载大数据/初始化久）——先给它足够启动时间，避免“启动中就被重启”。

    - **一句话理解**
        - 探针像“**员工健康检查**”：`liveness` 是“你还活着吗”（晕倒了叫急救=重启）；`readiness` 是“你现在能接客吗”（还没准备好就让你先歇着，不让接客=剔除流量）；`startup` 是“你热身完了吗”（刚入职给适应期，别一慢就开除=防误杀）。

- **协助记忆**
    - 口诀：“**liveness 管活（重启）、readiness 管接流量（剔除）、startup 管慢启动（防误杀）**——活、就绪、启动三兄弟”。
    - 一句话：“**活死用 liveness、能不能接客用 readiness、慢启动用 startup**”。

- **进阶思考**
    - **`liveness` 和 `readiness` 到底啥区别（最容易混）？**
        - `liveness` 判“**容器进程还健康吗**”——不健康就**重启**（自救）；`readiness` 判“**容器能服务了吗**”——未就绪就**从负载均衡摘除**（不转发流量，防止流量打给没准备好的容器）。一个管“活”，一个管“接客”，缺一不可（`readiness` 防流量错，`liveness` 防僵尸）。
    - **探针用 `httpGet` 还是 `exec`/`tcpSocket`？**
        - `httpGet`（HTTP 状态码 2xx/3xx）最常用（应用有 HTTP 接口时）；`tcpSocket`（能连端口）简单但只判“端口通”非业务健康；`exec`（执行命令退出码 0）灵活但开销大。按应用接口选——HTTP 应用用 `httpGet`，纯 TCP 服务用 `tcpSocket`。

- **扩展信息**
    - **探针参数**：`initialDelaySeconds`（启动后多久开始探测）、`periodSeconds`（间隔）、`timeoutSeconds`（超时）、`failureThreshold`（失败几次判定）、`successThreshold`（成功几次判定）。
    - **探测失败的影响**：`liveness` 失败→重启容器（`restartPolicy`）；`readiness` 失败→从 `Service` `Endpoint` 移除（不再转发）；都配了 startup 时启动期先走 startup。
    - **参考**：`kubectl describe pod` 看探针事件、`kubectl get endpoints` 看 Service 后端（readiness 剔除后数量变化）、写 `Pod` YAML 的 `spec.containers[].livenessProbe/readinessProbe/startupProbe`。

## 🤔 Pod 有哪些状态及其原因？ 
- **`Pod` 状态反映它的生命周期阶段：`Pending`（已提交、还没跑起来）、`Running`（运行中）、`Succeeded`（正常结束）、`Failed`（失败结束）、`Unknown`（状态未知/失联）。另有常见的子状态（`ContainerCreating`/`CrashLoopBackOff`/`Evicted` 等）。核心：“看状态判断 Pod 卡在哪一步——Pending 在调度/创建、Running 在跑、异常要看具体子状态”。**
    - **五大阶段状态（顶层）**
        - **`Pending`**：`Pod` 已被 K8s 接受（写入 `etcd`），但**还没真正运行**——可能在等调度（资源不足/污点）或拉镜像。
        - **`Running`**：`Pod` 已调度到节点，**至少一个容器在运行**（或正在启动/重启）。
        - **`Succeeded`**：`Pod` 所有容器**正常退出**（退出码 0），任务完成——`Job` 常见。
        - **`Failed`**：`Pod` 所有容器**退出但至少一个失败**（非 0）——任务失败。
        - **`Unknown`**：无法获取 `Pod` 状态（节点失联/kubelet 挂了）——状态未知，要查节点。

    - **常见子状态（定问题时看这个）**
        - **`ContainerCreating`**：容器正在创建（拉镜像/初始化）——卡在这通常镜像拉不动（网络/权限/镜像不存在）。
        - **`CrashLoopBackOff`**：容器反复崩溃，K8s 指数退避等待重启——说明应用一直启动失败，查日志（此时 `Pod` 顶层 `phase` 仍是 `Running`，仅容器层处于 `Waiting`/反复重启）。
        - **`Evicted`**：`Pod` 被驱逐（节点资源紧张/磁盘满/节点要维护）——查驱逐原因。
        - **`ImagePullBackOff`**：拉镜像失败（镜像不存在/认证失败/私有仓库权限）。
        - `Init:0/1` 等：初始化容器执行中。

    - **状态转换**
        - 正常：`Pending` → `Running` → `Succeeded`（任务）；持续服务则 `Running`（可能反复 `CrashLoopBackOff`）；异常会落到 `Failed`/`Evicted`/`Unknown`。

    - **一句话理解**
        - `Pod` 状态像“**快递物流状态**”：`Pending` = 已下单但还在分拣中心（没发货=没跑起来）；`Running` = 运输中（跑起来了）；`Succeeded`/`Failed` = 签收/拒收（正常完成/失败）；`Unknown` = 快递信息查不到了（失联）。子状态（`ContainerCreating`=在打包、`CrashLoopBackOff`=反复被打回重发、`Evicted`=仓库腾地方不要这单了）。

- **协助记忆**
    - 口诀：“**Pending 等分配、Running 在跑、Succeeded 正常完、Failed 失败、Unknown 失联——异常看子状态（Creating/CrashLoop/Evicted）**”。
    - 一句话：“**Pending 没跑起来、Running 在跑、Succeeded/Failed 是任务完没完、Unknown 是失联**”。

- **进阶思考**
    - **`Pending` 最常见的原因有哪些（怎么排查）？**
        - ①**资源不足**：节点没有足够 `CPU`/内存（看 `describe` 事件 `FailedScheduling`/`Insufficient cpu`）②**污点不容忍**：节点污点且 Pod 没对应容忍 ③**存储卷挂载失败**（`PVC` 未绑定）④**镜像拉取问题**（`ImagePullBackOff`）。用 `kubectl describe pod` 看事件定位。
    - **`CrashLoopBackOff` 怎么排查？**
        - 说明容器反复崩溃（启动即失败）；`kubectl logs <pod> --previous` 看上次崩溃日志，找启动报错（配置文件错/启动命令错/依赖服务连不上/内存不足被杀）。修好配置/依赖后自动恢复。

- **扩展信息**
    - **判断命令**：`kubectl get pod`（看状态）、`kubectl describe pod <name>`（看事件/原因，最有用）、`kubectl logs <pod>`（看日志）、`kubectl get events`（集群事件）。
    - **`Evicted` 常见原因**：节点 `DiskPressure`（磁盘压力）/`MemoryPressure`/节点维护——K8s 驱逐低优先级 Pod 保节点，被驱逐的 Pod 由 `Deployment` 去其他节点重建。
    - **`Pod` 状态 vs 容器状态**：`Pod` 是容器组整体状态；单看容器可用 `kubectl get pod -o jsonpath` 或 `kubectl describe` 看容器状态（`Waiting`/`Running`/`Terminated`）。

## 🤔 初始化容器有哪些应用场景？ 
- **初始化容器（`initContainer`）是在主容器启动前先执行完的容器：按顺序运行（每个完成后下一个才开始），完成后主容器才启动。核心用途：“主容器启动前要先做好的准备工作”——如等待依赖服务就绪、初始化配置/脚本、设置权限、下载数据。核心：“主容器开工前的‘准备工作容器’”。**
    - **什么是初始化容器**
        - 定义在 `Pod` 的 `spec.initContainers`，在主容器之前运行；**按顺序**执行（前一个成功退出才跑下一个），全部成功后主容器才启动。
        - 特点：**一次性**（跑完即退出，不像主容器长期运行）；可配置多个按序执行；失败则整个 Pod 重试/重启。

    - **典型应用场景**
        - **等待依赖服务就绪**：主容器（如 web）要等数据库/`Redis` 可用才能起——初始化容器里探测/等待（`until` 轮询）依赖，就绪后放行主容器。
        - **初始化配置/数据**：往共享卷写入配置文件、拉取/生成数据（如下载模型、初始化数据库结构）——主容器直接用准备好的数据。
        - **权限/属主设置**：调整共享卷的属主/权限（`chown`/`chmod`）——因为 `Pod` 卷权限可能不适合主容器用户，初始化容器先设置好。
        - **网络/环境准备**：设置网络规则、校验镜像签名、安装依赖工具等“主容器运行前必须完成”的任务。

    - **与主容器区别（关键）**
        - `InitContainer` **跑完就退出**（一次性），主容器长期运行；`InitContainer` **不参与就绪/存活探针**；`InitContainer` 失败 → Pod 重启（按 `restartPolicy`）重新执行初始化。
        - 顺序执行：多个 `InitContainer` 一个接一个，前一个成功才下一个。

    - **一句话理解**
        - 初始化容器像“**餐厅开业前的后厨准备**”——正式营业（主容器开跑）前，先按顺序做好：开门检查食材（等依赖就绪）、写今日菜单（初始化配置）、摆好厨具（设权限），全部弄好才开门迎客（主容器启动）。

- **协助记忆**
    - `InitContainer` = “**主容器开工前的准备工作容器**”——等依赖、初始化数据、设权限，跑完就退，主容器才上场。
    - 口诀：“**先准备、后开跑——等依赖/配数据/设权限，做到位主容器才启动**”。

- **进阶思考**
    - **`InitContainer` 和 `readinessProbe` 都是“等就绪”，有区别吗？**
        - 有：`readinessProbe` 是**主容器已启动后、探测它是否就绪**（未就绪剔除流量，但容器已跑）；`InitContainer` 是**主容器启动前**的准备工作（没做完主容器根本不启动）。一个“启动后等就绪”，一个“启动前做准备”。
    - **什么时候用 `InitContainer` 而不是主容器自己等？**
        - 当“准备工作”是**一次性的、独立于主容器主进程**的（如专门的初始化脚本、等外部依赖、下载数据）——用 `InitContainer` 让主容器纯业务、启动快；若只是主容器启动时简单判断，可在主容器启动命令里做，不必开 `InitContainer`。

- **扩展信息**
    - **`InitContainer` 限制**：普通初始化容器**不能**设置 `readinessProbe`/`livenessProbe`（`v1.28+` 的**可重启初始化容器**——`sidecar` 模式——才支持探针/`lifecycle`）；资源请求按 `max(普通容器 requests 之和, 单个初始化容器 requests 的最大值)` 计算（取最大值）；失败按 `restartPolicy` 重启（`Always` 下重跑初始化）。
    - **`Pod` 生命周期**：`Init:N/M` 的 **N 表示已成功完成的初始化容器数**——`Init:0/2`：第 1 个初始化容器运行中（0 个已完成）；`Init:1/2`：第 1 个已完成、第 2 个运行中。用 `kubectl get pod` 可看到初始化进度。
    - **参考**：写 `Pod` YAML 的 `spec.initContainers`（数组、按序执行）；帮助排查启动慢/依赖问题的常用手段。

## 🤔 Pod 超出资源限制时，K8s 会做什么动作？ 
- **`Pod` 跨过资源限制分两层：`requests`（请求值，决定能不能被调度）和 `limits`（上限值，决定运行时能不能超）。超出 `limits`（如 CPU 超限/内存超限）：CPU 超限被限流（节流），内存超限被 `OOMKill` 杀掉并可能重启。核心：“requests 定调度门槛、limits 定运行上限——CPU 超限节流、内存超限杀死”。**
    - **先分清 `requests` 和 `limits`（关键）**
        - **`requests`（请求值）**：容器**最低需要**的资源（CPU/内存），`Scheduler` 用它在选节点时判断“节点够不够”——节点要能满足所有的 `requests` 才能调度，这是**调度门槛**。
        - **`limits`（上限值）**：容器**最多能用**的资源（CPU/内存），超出会被 `kubelet` 强制限制——这是**运行上限**（`limits` ≥ `requests`）。

    - **超出 `CPU` 限制**
        - CPU 超 `limits`：容器被**限流（`CPU Throttling`）**——`cgroup` 把 CPU 使用率限制在限额内，**不会杀掉**容器，但**性能下降**（跑变慢、节流）。
        - 表现：容器还在运行，但请求超时/响应慢（CPU 被限制）。

    - **超出 `内存` 限制**
        - 内存超 `limits`：容器被 **`OOMKill`（OOM 杀死）**——内核 `OOM Killer` 杀掉进程（超内存容器），容器可能**崩溃重启**（看 `restartPolicy`）。
        - 表现：`CrashLoopBackOff`/`OOMKilled`（`kubectl describe` 看到 `OOMKilled`），容器反复被杀重启。

    - **调度层面（节点资源不足）**
        - 若节点资源压力大（`DiskPressure`/`MemoryPressure`），`kubelet` 触发**驱逐**（按优先级从低到高杀 Pod 腾资源）；若高优先级 Pod 无法调度，调度器触发**抢占**（`preemption`，抢占低优先级 Pod）——二者机制不同：驱逐因节点压力、抢占为高优先级腾位。

    - **一句话理解**
        - `requests` 像“**订房的最低要求**”（至少多大房间，不够不给订=调度门槛）；`limits` 像“**房间用电上限**”（超了会被限电=CPU 节流，或跳闸断电=内存 OOM 杀掉）。

- **协助记忆**
    - 口诀：“**requests 定调度门槛、limits 定运行上限——CPU 超限被限流、内存超限被 OOM 杀**”。
    - 一句话：“**请求值（requests）管能不能住、上限值（limits）管超没超——CPU 超限变慢、内存超限被杀死**”。

- **进阶思考**
    - **为什么 `requests` 和 `limits` 要分开？**
        - `requests` 用于**调度**（保证节点能承载），`limits` 用于**运行限制**（防单个容器疯抢资源拖垮节点）。分开让你能“按需申请、按上限限制”——如 `requests: 100m CPU`（只占 100 毫核）但 `limits: 500m`（最多可冲到 500 毫核），兼顾调度效率与资源保护。
    - **内存 `OOMKill` 后容器总是重启（`CrashLoopBackOff`）怎么办？**
        - 说明内存真的超了：①调大 `limits`（若业务确实需要）②减少应用内存占用（调 JVM 堆/缓存大小）③检查是否 `@Query` 数据倾斜/内存泄漏。否则反复 OOM（设计不当），治本是降低实际内存需求。

- **扩展信息**
    - **资源单位**：CPU 用核/毫核（`500m` = 0.5 核）、内存用 `Mi`/`Gi`（如 `512Mi`）。
    - **`Pod` 级 vs 容器级**：`K8s API` 无 `Pod` 级 `resources` 字段——资源只能配在 `spec.containers[].resources`；`Pod` 的有效请求 = 所有容器 `requests` 之和（由各容器求和得出）；应用层关心容器内 `limits`（进 `cgroup`）。
    - **`QoS` 类**：根据 `requests`/`limits` 组合，Pod 被分为 `Guaranteed`（requests=limits，高优先级，最不容易被驱逐）、`Burstable`、`BestEffort`（无 limits/requests，最低优先级，易被驱逐）——影响驱逐/抢占顺序。
    - **参考**：`kubectl describe pod` 看 `OOMKilled`/`Limits`；`kubectl top node/pod` 看实际资源使用。

## 🤔 Pod 处于 Pending 状态可能是什么原因？ 
- **`Pending` 状态 = Pod 被接受但还没真正运行起来。常见原因：①资源不足（节点 CPU/内存不够，`Scheduler` 调度不了）②污点/容忍不匹配（节点有污点，Pod 没对应容忍）③存储卷 `PVC` 未绑定/挂载失败④镜像拉取失败（`ImagePullBackOff`）⑤调度器找不到合适节点（节点选择器/亲和不满足）。核心：“Pending = 卡在‘没好地方可以跑’或‘啥都没准备好’”。**
    - **最常见的几个原因（排查按这个顺序）**
        - **① 资源不足**：节点没有足够的 `CPU`/内存满足 Pod 的 `requests`——`Scheduler` 找不到能容纳的节点，`kubectl describe` 事件显示 `FailedScheduling`/`Insufficient cpu`。
        - **② 污点/容忍不匹配**：节点打了**污点（`Taint`）**（如 `node-role.kubernetes.io/master:NoSchedule`），目标 Pod 没配对应**容忍（`Toleration`）**——调度器跳过这些节点。
        - **③ 存储卷问题**：Pod 需要**`PVC`（持久卷）**，但 `PVC` 未绑定/存储类（`StorageClass`）不存在/卷挂载失败——Pod 等卷。
        - **④ 镜像拉取失败**：镜像名错/私有仓库认证失败/镜像不存在——显示 `ImagePullBackOff`。
        - **⑤ 节点选择/亲和不满足**：`nodeSelector`/`nodeAffinity`/`podAffinity` 指定的节点不存在或不满足条件。
        - **其他**：`hostPort` 端口冲突（可致调度失败）；`ResourceQuota`/`LimitRange` 配额限制通常在**准入阶段拒绝创建**（表现为 `Deployment`/`ReplicaSet` 的 `FailedCreate` 事件，而非 `Pending` 调度失败）。

    - **一句话理解**
        - `Pending` 像“**快递一直显示‘分拣中’**”——不是丢了，而是：①没有运力的车（资源不足）②这个地址车不能去（污点/亲和）③要的货还没到（存储卷/镜像）④等发货（调度排队）。

- **协助记忆**
    - 口诀：“**Pending 查五件事：资源够不够（Insufficient）、污点容不容忍、卷 PVC 绑没绑、镜像拉没拉（ImagePull）、亲和满不满足**”。
    - 一句话：“**Pending = 没地方跑 / 没准备好——先 kubectl describe 看事件**”。

- **进阶思考**
    - **排查 `Pending` 最直接的方法？**
        - **`kubectl describe pod <name>`**——看 `Events` 区的报错（`FailedScheduling: 0/3 nodes available`、`Insufficient cpu`、`unbound PVC`、`ImagePullBackOff`），事件会直接告诉你卡在哪。这是排 `Pending` 的第一命令。
    - **`0/3 nodes available` 什么意思？**
        - 调度器遍历了全部 3 个节点，发现都没有合适的——原因可能是资源不足、污点、标签不匹配等（describe 会列出各节点 `didn't match: node(s) ...`）。逐个节点看原因。

- **扩展信息**
    - **`Pending` ≠ 故障**：是“等待中”，可能等资源/等卷/等调度，不代表 Pod 有问题；但一直 `Pending` 要查（资源扩容/污点/卷/镜像）。
    - **常见相关事件**：`FailedScheduling`（调度失败）、`FailedMount`（卷挂载失败）、`ImagePullBackOff`（拉镜像失败）、`Unschedulable`（节点不可调度）。
    - **参考**：`kubectl get events --sort-by=.metadata.creationTimestamp`（看最新事件）、`kubectl describe node <node>`（看节点资源/污点）。

## 🤔 简述删除一个 Pod 的工作流程？ 
- **删除一个 `Pod` 的核心是“优雅删除（`graceful deletion`）”：你 `kubectl delete pod` 发请求 → `API Server` 给 `Pod` 打上删除标记（设 `deletionTimestamp`，进入 `Terminating`）→ `kubelet` 收到后先优雅停止容器（发 `SIGTERM`，给应用时间保存/断开连接）→ 宽限期到（或容器退出）则强制 `SIGKILL` → 移除 `Pod` 并从 `etcd` 删除。核心：“先礼貌辞退（SIGTERM 优雅停止），超时强制清场（SIGKILL）”。**
    - **完整流程**
        - ①你 `kubectl delete pod <name>` → 请求到 `API Server` ②`API Server` 标记 `Pod` 为删除（`deletionTimestamp` 设置，状态转 `Terminating`），但不立即删 ③`kubelet` 监听到删除标记，**启动优雅关闭**：**先执行 `preStop` 钩子（自定义清理、摘流）**并从 `Service` 摘掉（并行进行；`preStop` 常用 `sleep` 延迟等 `LB` 完成流量摘除），**再向主容器发送 `SIGTERM`**（终止信号）——给应用时间收尾④等待**终止宽限期**（`gracePeriodSeconds`，默认 `30s`）⑤宽限期到（或应用自行退出），`kubelet` **强制 `SIGKILL`**（立即杀）⑥`Pod` 移除、从 `etcd` 删除（`API Server` 确认）。

    - **关键点**
        - **优雅停止（`SIGTERM`）**：先给应用**时间收尾**（保存状态/断开连接/通知下游），避免直接杀导致数据不一致/请求中断。
        - **宽限期（`grace period`）**：`gracePeriodSeconds`（默认 30 秒）——`SIGTERM` 后等的最大时间，超时强制 `SIGKILL`；可 `kubectl delete --grace-period=0 --force` 强制立即删。
        - **`preStop` 钩子**：容器停止前执行的自定义命令（如优雅摘流、通知注册中心），配合 `SIGTERM` 做平滑下线。

    - **一句话理解**
        - 删除 `Pod` 像“**正规辞退员工**”：先通知他“要和你解约了”（`SIGTERM`，给时间交接工作/保存进度），给个交接期（宽限期 30s），期到了还没走就强制清场（`SIGKILL`）；若老板急（`--force`）直接当场辞退。

- **协助记忆**
    - 口诀：“**`kubectl delete` → `Terminating` → `SIGTERM` 优雅退（+`preStop`）→ 宽限期 30s → 超时 `SIGKILL` → 移除**”。
    - 一句话：“**先礼貌（SIGTERM 保存收尾）、后强制（超时 SIGKILL）——删除不丢协议**”。

- **进阶思考**
    - **为什么要有优雅停止（不直接杀掉）？**
        - 直接 `SIGKILL` 会让应用**来不及保存状态/关闭数据库连接/通知下游**——正在处理的请求被腰斩、数据可能不一致、注册中心可能还留着该实例。优雅停止给应用机会“体面退出”（`SIGTERM` + `preStop`），保证业务平滑。
    - **`Service` 怎么配合 Pod 删除（避免流量打到要删的 Pod）？**
        - `Pod` 删除时会**从 `Service` 的 `Endpoint` 摘除**（`readiness` 变 false），不再转发新流量；配合 `preStop`（摘流）让删除时新请求不再进来、旧请求处理完，实现平滑下线。

- **扩展信息**
    - **强制删除**：`kubectl delete pod --grace-period=0 --force`（跳过优雅，立即杀）；`kubectl delete pod --wait=false`（不等待）。
    - **`Terminating` 状态**：删除过程中 Pod 显示 `Terminating`（`deletionTimestamp` 已设）；若一直 `Terminating` 卡住，可能是 `finalizers`（终结器）阻止删除——查 `describe` 的 `finalizer`。
    - **参考**：`kubectl delete pod <name>`、`kubectl describe pod`（看 `Terminating`/`finalizer`）、`preStop` 钩子、`gracePeriodSeconds`。

## 🤔 K8s 出现大量 Pod 处于 Evicted 状态是什么原因？ 
- **`Evicted` 状态 = `Pod` 被节点驱逐（`eviction`）了——`kubelet` 因节点资源压力把 `Pod` 强制驱逐（杀掉并在可能处重建）。常见原因：①磁盘 `DiskPressure`（磁盘/`inode` 满）②内存 `MemoryPressure`（节点内存紧张）③节点维护/`drain`（`cordon` 仅标记不可调度、不驱逐已跑 Pod，`drain` 才驱逐迁移）④`QoS` 优先级低（`BestEffort`/`Burstable` 被 `kubelet` 驱逐；非高优抢占）。核心：“Evicted = 节点压力大，K8s 保节点清 Pod”。**
    - **什么是驱逐（`eviction`）**
        - `kubelet` 持续监控节点资源（磁盘/内存等），达到**驱逐阈值**（`DiskPressure`/`MemoryPressure`/`PIDPressure`）时，**主动驱逐**（kill）一些 `Pod` 给节点“减负”——被驱逐的 `Pod` 标记 `Evicted`。
        - 驱逐顺序：按 **`QoS` 优先级**从低到高——`BestEffort`（无资源限制）最易被逐，其次 `Burstable`，最后 `Guaranteed`（requests=limits，最安全）。

    - **大量 `Evicted` 的常见原因**
        - **`DiskPressure`（磁盘压力）**：某节点磁盘/`inode` 快满（日志堆积/无清理）→ 驱逐 Pod 腾磁盘——**最常见**。
        - **`MemoryPressure`（内存压力）**：节点内存紧张 → 驱逐 Pod（注意 `nodefs`/`imagefs` 属**磁盘**压力信号，归 `DiskPressure`）。
        - **节点维护/`drain`**：节点要维护时用 `kubectl drain` **驱逐迁移 Pod**（可 `cordon` 标记不可调度——但 `cordon` 本身**不**清已跑 Pod，是 `drain` 才驱逐）。
        - **低 QoS 优先级**：`BestEffort`/`Burstable` Pod 在资源紧张时（`kubelet` 驱逐）先被逐（保护 `Guaranteed`）——注意：**高优抢占**（调度器 `preemption`，给高优 `Pod` 腾位）状态显 `Preempting`，与 `Evicted`（`kubelet` 驱逐）机制不同，勿混。
    - **大量 Evicted 说明什么（重要）**
        - 不是某个 Pod 出问题，而是**整个节点（集群）资源告急**——磁盘或内存压力大，`kubelet` 在“甩包袱”。要**从节点资源入手**（清理磁盘/扩容/排查日志堆积），而不是单个 Pod。

    - **一句话理解**
        - `Evicted` 像“**写字楼超载，物业强制清几间办公室**”——办公楼（节点）太挤/存不下货了（磁盘/内存压力），物业按“租约优先级”（QoS）先清“临时工”（`BestEffort`），保重要租户（`Guaranteed`）。

- **协助记忆**
    - 口诀：“**Evicted = 节点压力大被驱逐——磁盘满（DiskPressure）/内存紧（MemoryPressure）/节点维护，QoS 从低到高先清 BestEffort**”。
    - 一句话：“**Evicted 不是 Pod 的错，是节点快满了——去清磁盘/看节点资源**”。

- **进阶思考**
    - **`Evicted` 的 Pod 会被重建吗？**
        - 会。`Evicted` 是 `Pod` 被节点杀掉，但若它的**控制器**（`Deployment`/`StatefulSet`）维护副本数，会在其他节点/本节点**重建**（这也是为什么 `Evicted` 的 Pod 常变成 `Pending` 后重建）。但若节点持续压力，重建的 Pod 可能**再次被驱逐**（循环）。
    - **怎么排查/处理大量 Evicted？**
        - ①`kubectl describe node <node>` 看 `Conditions`（`DiskPressure`/`MemoryPressure`）②大面积清理磁盘（日志/镜像/临时文件）、扩容磁盘/节点 ③检查是否有日志堆积/镜像爆炸 ④给关键 Pod 设 `limits`（升 `Guaranteed`）防被优先驱逐。

- **扩展信息**
    - **`QoS` 三类**（决定驱逐优先级）：`Guaranteed`（requests=limits，优先保）、`Burstable`（requests<limits）、`BestEffort`（无 requests/limits，最易被逐）。
    - **驱逐配置**：`kubelet` 的 `eviction-hard`（硬阈值，立即逐）vs `eviction-soft`（软阈值，留缓冲）+ 回收机制（垃圾回收 `image`/`log`）。
    - **参考**：`kubectl get pod -A | grep Evicted`（看驱逐 Pod）、`kubectl describe node`（看节点 Conditions/压力）、`df -h`/`kubectl top node`（看磁盘/资源）。

## 🤔 Deployment 滚动更新是怎么实现的？ 
- **`Deployment` 滚动更新（`rolling update`）是“逐步替换旧版本 Pod”而不中断服务：`Deployment` 创建新版本 `ReplicaSet`，一点点（按 `maxSurge`/`maxUnavailable`）先启新 `Pod`、等新 `Pod` 就绪（`readiness`）→ 逐步缩旧 `Pod`，直到全部切成新版本。核心：“新老版本交替，先增后减，服务不断”。**
    - **滚动更新的核心思想**
        - 对比“**一次性全部替换**”（停机/风险大）：滚动更新**分批渐进**——先起少量新版本 `Pod`（超额 `maxSurge`），就绪后删少量旧 `Pod`（`maxUnavailable`），反复直到全部新——**全程服务不中断**，出问题可中途回滚。

    - **实现机制（`ReplicaSet` 版本切换）**
        - ①`Deployment` 期望新版本 → 创建**新的 `ReplicaSet`**（新版本模板）②新 `ReplicaSet` 启动新 `Pod`，旧 `ReplicaSet` 的 `Pod` 逐步缩减 ③控制**`maxSurge`（最多超额几台）** + **`maxUnavailable`（最多可用少几台）**：如 `maxSurge:1, maxUnavailable:0` = 先加 1 台新 Pod、就绪后再删 1 台旧 Pod（服务始终足量）④新 `Pod` 通过 `readiness` 才接流量，`Service` 自动把流量引到就绪的新版本 ⑤全部切换完成，旧 `ReplicaSet` 缩到 0（保留可回滚）。

    - **关键参数**
        - **`maxSurge`**：滚动时最多**超额**多少副本（如 `maxSurge:1` = 最多比期望多 1 个，先加新）——决定“先增多少”（`maxSurge`/`maxUnavailable` **默认均 `25%`**，可用整数或百分比表示）。
        - **`maxUnavailable`**：滚动时最多**可用**少多少副本（如 `maxUnavailable:0` = 始终保证 100% 可用不中断，默认 `25%`）——决定“最多允许少几个旧”。
        - **`minReadySeconds`**：新 Pod 就绪后等多久才算稳定（防刚就绪又挂）、**`progressDeadlineSeconds`**（更新超时判定失败）。

    - **一句话理解**
        - 滚动更新像“**旧员工换新员工**”：不一次性辞掉所有人（全停机），而是**先招几个新人（新 Pod `maxSurge`），新人能干活了（`readiness` 就绪）再辞几个老人（`maxUnavailable`）**，一茬一茬换——业务一直有人值班，不会中途关门。

- **协助记忆**
    - 口诀：“**新老交替——先加新（maxSurge），等就绪，再删旧（maxUnavailable），滚动到全新**”。
    - 一句话：“**先招新人顶班、新人能干了再辞老人——滚动更新不断服务**”。

- **进阶思考**
    - **`maxSurge:1, maxUnavailable:0` 和 `maxSurge:0, maxUnavailable:1` 区别？**
        - 前者**先加后删**（先多起 1 台新的，就绪再删 1 台旧的）—**可用副本始终 100%**，适合核心服务（但可能短期超量）；后者**先删后加**（先缩 1 台旧的，再补新的）—**可用副本会短暂低于 100%**，适合资源紧/可短暂降级的服务。
    - **滚动更新到一半 `readiness` 一直不过会怎样？**
        - 新 Pod `readiness` 不通过（不健康）→ 新 `ReplicaSet` 的 Pod 反复重启/卡住，更新**卡住**（`progressDeadlineSeconds` 到判定失败）> 旧 `ReplicaSet` 还健全（服务仍可用）；可用 `kubectl rollout status` 看进度、`kubectl rollout undo` 回滚。

- **扩展信息**
    - **回滚**：`kubectl rollout undo deployment/<name>`（回退到上一个版本）；`kubectl rollout history`（看版本历史）；`kubectl rollout status`（看更新进度）。
    - **`ReplicaSet` 保留**：`revisionHistoryLimit`（保留几个旧 `ReplicaSet` 版本用于回滚，默认 10）。
    - **灰度发布更精细**：滚动更新是逐步替换；更精细的**金丝雀/灰度**用流量控制（`Istio`/`Argo Rollouts`）按比例分流，滚动更新是“全部切新、分批”，灰度是“少量试新、比例涨”。
    - **参考**：`kubectl rollout status`（看更新进度）/`kubectl rollout history`（看版本）/`kubectl rollout undo`（回滚）、`kubectl rollout restart`（强制滚动重启）；查看 `Deployment` 用 `kubectl get deployment`（`rollout` 是命令组非资源，不可 `get rollout`）；`strategy`（`RollingUpdate`/`Recreate`）。

## 🤔 Deployment 如何控制滚动更新的快慢？ 
- **`Deployment` 滚动更新的快慢由几个参数控制：`maxSurge`（最多超额几台，决定“加新速度”）、`maxUnavailable`（最多允许少几台，决定“删旧速度”）、`minReadySeconds`（新 Pod 稳定多久才算就绪）、`progressDeadlineSeconds`（更新超时判定失败）。想快：调大这两个配额、缩短就绪校验等待（`minReadySeconds`）；想稳（保可用）：`maxSurge:1, maxUnavailable:0` + 拉长就绪校验。核心：“配额定增减速度、就绪判稳不稳、超时定成败”。**
    - **控制“加新/删旧”速度（两个配额）**
        - **`maxSurge`**：最多**超额**多少副本（控制“一次新增多少新 Pod”）——`2` = 一次加 2 台新的，更快；`0` = 不加新先删旧（快但可能短暂降级）。
        - **`maxUnavailable`**：更新期间**允许不可用的副本上限**（作为削旧的天花板，非固定批次）——`0` = 不删旧（先全加新的再删，最稳但慢）；判断标准是**可用数 ≥ 期望副本数 − `maxUnavailable`**。
        - **两者组合决定节奏**：`maxSurge:1,maxUnavailable:0`（先加后删，保 100% 可用，慢但稳）；`maxSurge:0,maxUnavailable:1`（先删后加，资源省，可短暂降级）。

    - **控制“新 Pod 稳定性判断”（`minReadySeconds`）**
        - **`minReadySeconds`**：新 Pod `readiness` 通过后**再等多少秒**才算真正稳定（可用）——防止“刚就绪又崩”的 Pod 被计入可用，更新继续。设大（如 30s）更稳（等新 Pod 稳定观测期），设 0 更快（就绪即算）。

    - **控制“更新是否算失败”（`progressDeadlineSeconds`）**
        - **`progressDeadlineSeconds`**：整个滚动更新在**多少秒内**必须完成（默认 `600s`）；超时未完成，`Deployment` 在 `status.conditions` 标记 `Progressing=False`（`reason: ProgressDeadlineExceeded`）判定更新失败，可回滚。

    - **一句话理解**
        - 滚动更新快慢 = “**换班速度**”：`maxSurge` 定“一次多招几个新人”，`maxUnavailable` 定“一次赶走几个老人”，`minReadySeconds` 定“新人要实习多久才算能顶班”，`progressDeadlineSeconds` 定“整个换班要在多少分钟内完成，超时算失败”。

- **协助记忆**
    - 口诀：“**maxSurge 定加新、maxUnavailable 定删旧、minReadySeconds 定稳不稳、progressDeadlineSeconds 定成败——想快调大配额/缩短间隔，想稳保 100% 可用**”。
    - 一句话：“**配额定快慢、就绪定稳、超时定成败——慢而稳 vs 快而险**”。

- **进阶思考**
    - **想“最快”更新但又不能影响业务，怎么配？**
        - `maxSurge:2, maxUnavailable:0`（一次加 2 台新、不删旧直到新就绪）——快（批量加）且可用不降（先加后删）；但如果节点资源紧（超额 2 台占资源）要权衡。核心业务建议 `maxUnavailable:0`（不中断），想更快调大 `maxSurge`。
    - **更新卡住（`progressDeadlineSeconds` 超时）说明什么？**
        - 说明新 Pod 一直没就绪/反复崩溃（`readiness` 不过），更新推进不下去——查新版本配置/镜像/依赖；`kubectl rollout status` 看卡在哪一步，必要时 `kubectl rollout undo` 回滚。

- **扩展信息**
    - **常用命令**：`kubectl rollout status deployment/<name>`（看进度）、`kubectl rollout undo deployment/<name>`（回滚）、`kubectl rollout restart`（强制重启）、`kubectl rollout history`（版本历史）。
    - **`strategy` 配置**：`strategy.type: RollingUpdate`（默认，滚动）+ `strategy.rollingUpdate: {maxSurge, maxUnavailable}`——与 `Recreate`（先删光再建，停机）对比，`RollingUpdate` 是不中断的优雅更新。
    - **灰度发布进阶**：滚动更新是“逐步全量”；要“按比例灰度（先 5% 试新再放大）”用 `Argo Rollouts`/`Istio` 流量分流——滚动更新适合版本升级，灰度适合要精细控流的场景。

## 🤔 Deployment 与 ReplicaSet 有什么联系？ 
- **`Deployment` 和 `ReplicaSet` 是“上下级/包装”关系：`Deployment` 管理/包装 `ReplicaSet`，`ReplicaSet` 管理具体 `Pod` 副本数。你定义 `Deployment`（声明多少副本 + 镜像版本），`Deployment` 自动创建 `ReplicaSet`，`ReplicaSet` 再维持 `Pod` 副本数——所以平常你只碰 `Deployment`，`ReplicaSet` 是它内部自动管理的“工具”。核心：“Deployment 管版本 + ReplicaSet 管副本数”。**
    - **各自的职责（层次关系）**
        - **`ReplicaSet`（底层）**：**维持指定数量的 `Pod` 副本**（“保证永远有 N 个 Pod 在跑”）——是“副本数控制器”，只管量不管版本。
        - **`Deployment`（上层）**：**管理 Pod 的“版本/声明式更新”**——描述“要什么镜像、几个副本”，内部通过 **`ReplicaSet`** 实现；还负责**滚动更新、回滚、版本历史**。
        - **关系**：`Deployment` → 创建/管理 **一个或多个 `ReplicaSet`** → 每个 `ReplicaSet` 管自己模板的 `Pod` 副本（不同版本各一个 `ReplicaSet`）。

    - **滚动更新时两者的配合（关键）**
        - 版本升级时，`Deployment` **新建一个 `ReplicaSet`**（新镜像版本），新 `ReplicaSet` 起新 `Pod`，旧 `ReplicaSet` 逐渐缩到 0——**新旧版本各对应一个 `ReplicaSet`**，`Deployment` 控制它们之间的切换（这就是滚动更新的底层）。
        - 回滚 = 让旧 `ReplicaSet` 重新扩起来（`Deployment` 保留历史 `ReplicaSet` 供回滚）。

    - **一句话理解**
        - 像“**连锁店总部（Deployment）管分店，分店（ReplicaSet）管事**”：总部（`Deployment`）决定“要几家店、卖什么菜（版本）”，分店（`ReplicaSet`）负责“保证每家店的员工够（副本数）”。总部管版本和更新，分店管人数，更新就是“新开一批店、关一批旧店”。

- **协助记忆**
    - 口诀：“**Deployment 管版本 + 更新，ReplicaSet 管副本数——Deployment 包装 ReplicaSet，ReplicaSet 维持 Pod 数**”。
    - 一句话：“**平时只折腾 Deployment（声明要几个 + 什么版本），ReplicaSet 是它内部自动管 Pod 数量的**”。

- **进阶思考**
    - **为什么有 `ReplicaSet` 还要 `Deployment`（为何不直接用 ReplicaSet）？**
        - `ReplicaSet` 只能“维持副本数”，**不能做版本更新/回滚**——改镜像要重建 `ReplicaSet`，无法平滑滚动、无法记录版本回滚。`Deployment` 在其上加了**声明式版本管理**（滚动更新、回滚、历史），所以生产用 `Deployment` 而不是裸 `ReplicaSet`。
    - **改镜像时 `Deployment` 会怎么处理 ReplicaSet？**
        - 改 `Deployment` 的镜像 → `Deployment` 对照当前版本，**创建一个新的 `ReplicaSet`**（新模板），**新 `ReplicaSet` 起新 Pod、旧 `ReplicaSet` 缩**；滚动完成后旧 `ReplicaSet` 缩到 0 但**保留**（`revisionHistoryLimit` 控制保留几个，供回滚）。

- **扩展信息**
    - **`revisionHistoryLimit`**：保留几个旧版本 `ReplicaSet`（默认 `10`），供 `rollout undo` 回滚到历史版本——回滚不了太早的版本（被清理）。
    - **`Deployment` 与 `ReplicaSet` 的关系**：`Deployment` 通过 **`OwnerReference`（控制器引用）**管理 `ReplicaSet`；`pod-template-hash` 标签用于**区分版本**、并被 `ReplicaSet` 的 `selector` 用来匹配自己的 `Pod`（`Deployment` 的 `spec.selector` 实际匹配的是 `Pod`）。
    - **参考**：`kubectl get rs`（看 `ReplicaSet`）、`kubectl get deployment`、`kubectl get pods`——三层关系（`Deployment`→`ReplicaSet`→`Pod`）。

## 🤔 Deployment 与 StatefulSet 有什么区别？ 
- **`Deployment` 管无状态应用（`Pod` 无固定身份/数据，可随意删换、并行扩缩）；`StatefulSet` 管有状态应用（`Pod` 有固定网络标识、持久化存储、有序部署/缩容）。核心区别：`Deployment` 的 Pod 是“无名小卒”（随时换），`StatefulSet` 的 Pod 是“有头有脸的固定员工”（名字固定、数据固定、按顺序来）。**
    - **核心区别对比**
        - **是否固定身份**：`Deployment` 的 Pod 名字随机（`web-xxx`），无固定身份；`StatefulSet` 的 Pod 名字固定（`web-0`/`web-1`），有稳定网络标识（便于集群内互相发现）。
        - **是否持久化数据**：`Deployment` 默认无状态（数据不持久，Pod 挂了数据丢）；`StatefulSet` 给每个 Pod 配**专属存储卷**（`PVC`），数据持久、Pod 重建后数据还在（`web-0` 重建仍用 `web-0` 的卷）。
        - **部署/缩容顺序**：`Deployment` 并行（同时起/删，随意）；`StatefulSet` **有序**（`0→1→2` 顺序起、`2→1→0` 顺序删），保证启动/停止有先后（适合主从/依赖关系）。
        - **用途**：`Deployment` 无状态服务（web/API），`StatefulSet` 有状态应用（`MySQL`/`Redis`/`Kafka`/`Elasticsearch` 等数据集群）。

    - **`StatefulSet` 的独特能力**
        - **固定网络标识**：`Pod` 名固定（`web-0`），配 **`Headless Service`**（无 `ClusterIP`）让集群内其他 Pod 用固定名字访问它（如 `web-0.nginx`）——适合有固定地址的对等服务。
        - **专属持久卷**：每个 `Pod` 绑定自己的 `PVC`（`volumeClaimTemplate`），保证数据持久且对应固定 `Pod`。
        - **有序启停**：按 `replicas` 顺序启动/停止，配合 `podManagementPolicy`（`OrderedReady`/`Parallel`）。

    - **一句话理解**
        - `Deployment` 像“**临时工**”——没有固定工位（名字随机）、不留文件（无状态），随时换人；`StatefulSet` 像“**正式工**”——有固定工号（`web-0`）、有自己的办公桌/资料柜（专属持久卷）、按顺序入职/离职（有序）——适合数据库/有状态集群。

- **协助记忆**
    - 口诀：“**Deployment 无状态（随机名/不持久/并行），StatefulSet 有状态（固定名/持久卷/有序）**”。
    - 一句话：“**有状态有固定名字和数据、按顺序来用 StatefulSet；无状态随便换用 Deployment**”。

- **进阶思考**
    - **数据库集群为什么必须用 `StatefulSet`？**
        - 数据库（如 `MySQL` 主从/`Kafka`/`ES`）需要**固定网络地址**（集群内其他节点按名访问）、**持久存储**（数据不能丢）、**有序启停**（主从/副本有依赖顺序）——`StatefulSet` 的固定 `Pod` 名 + 专属卷 + 有序正好满足；`Deployment` 随机名/无状态会破坏数据库集群的节点识别和数据持久。
    - **`StatefulSet` 能不能扩缩容（有状态不方便扩）？**
        - 能，但要**有序**（按 `0/1/2...` 编号扩）、**逐个**（不是并行）——因为有状态应用扩缩要通知集群（加节点/移除节点）；且缩容到 `x` 后原来 `x+1` 的卷要处理。所以有状态扩缩更慢、更谨慎，不像 `Deployment` 并行随意。

- **扩展信息**
    - **`Headless Service`**：`StatefulSet` 常用它（`clusterIP: None`），让 Pod 有**稳定的 DNS 名**（如 `pod-0.svc`）——集群内相互发现固定节点。
    - **`volumeClaimTemplate`**：`StatefulSet` 里给每 Pod 定义 `PVC` 模板（每个 Pod 自动申请，`web-0`→`pvc-0`、`web-1`→`pvc-1`）——数据按 Pod 隔离持久。
    - **`podManagementPolicy`**：`OrderedReady`（默认，有序启停）/`Parallel`（并行，适合无依赖有状态）。
    - **参考**：`kubectl get statefulset`、`kubectl get pvc`（看每 Pod 的卷）、`Gateway`/`Istio` 对有状态服务的支持。

## 🤔 StatefulSet 为什么用 Headless Service？ 
- **`StatefulSet` 用 `Headless Service` 是为了让每个 `Pod` 有稳定的网络身份（`DNS` 名）：`StatefulSet` 的 `Pod` 名字固定（`web-0`/`web-1`），配合 `Headless Service`（`clusterIP: None`，不分配虚拟 IP）能按名字直接解析到具体某个 `Pod`（`web-0.nginx.svc`），供有状态集群（如数据库）内相互发现/连接固定节点。核心：“普通 Service 给一组 Pod 一个总入口，Headless Service 给每个 Pod 一个固定的名字”。**
    - **普通 `Service` vs `Headless Service`**
        - **普通 `Service`**：有一个**虚拟 `ClusterIP`**，访问它会被**负载均衡**到任意一个后端 `Pod`（不关心谁）——适合无状态应用（哪个实例都能服务）。
        - **`Headless Service`**：`clusterIP: None`（**不分配 `ClusterIP`**），`DNS` 直接解析到**每个 `Pod` 的真实 `IP`**（返回所有 Pod 地址）——客户端自己选/直连某个具体 Pod。

    - **为什么 `StatefulSet` 需要它（关键）**
        - **有状态应用要求固定节点身份**：数据库/`Cassandra`/`ZK`/`ES` 集群中，节点要**知道彼此的固定地址**（互相发现、主从关系、`web-0` 就是 `web-0`）——普通 `Service` 负载均衡返回随机节点，破坏这种固定身份。
        - **按名字直连固定 Pod**：`Headless Service` 让 `web-0` 有稳定的 DNS 名（`web-0.nginx`），其他 Pod/外部能**按名直达某个具体节点**（如访问主节点），这是有状态集群（`Quorum`/主从）必需的。
        - **配合 `StatefulSet` 的 stable network ID**：`StatefulSet` 保证 `Pod` 名稳定，`Headless Service` 让这个名字可被 DNS 解析——两者配合实现了“固定名字 + 固定地址”的稳定网络身份。

    - **一句话理解**
        - 普通 `Service` = “**小区大门**”（进出都从这里，随便哪个单元都行）；`Headless Service` = “**每家的门牌号**”（`web-0`/`web-1` 各有专属地址，能点名找特定一家）——`StatefulSet` 的住户（有状态节点）需要互知道门牌号，所以用 `Headless`。

- **协助记忆**
    - 口诀：“**StatefulSet 固定 Pod 名 + Headless Service 固定 DNS 名——有状态节点按名互相发现**”。
    - 一句话：“**普通 Service 给一群 Pod 一个入口，Headless 给每个 Pod 一个名字——有状态集群要按名找节点**”。

- **进阶思考**
    - **`Headless Service` 下 DNS 怎么解析（客户端怎么知道所有 Pod）？**
        - 集群 `DNS`（`CoreDNS`）对 `Headless Service`：查**服务名**返回同一 `A` 记录指向**所有 `Pod` 的 `IP`**（客户端能枚举），或 `SRV` 记录；而 `web-0.nginx`/`web-1.nginx` 这类**逐 `Pod` 的 `A` 记录**由 `StatefulSet` 的 `serviceName` 单独生成——两类记录来源不同（注意区分）。
    - **有状态应用都必须要 `Headless Service` 吗？**
        - 有状态应用（数据库集群）通常需要（节点间固定发现）；但如果应用不依赖“节点固定身份”访问（如只是每 Pod 独立服务、无集群协商），用普通 `Service` 也行。`Headless` 是“要按名访问具体节点”时的选择。

- **扩展信息**
    - **`clusterIP: None`**：`Service` 的 `spec.clusterIP: None` 即 `Headless`——不分配虚拟 `IP`，`DNS` 直达 `Pod`。
    - **`publishNotReadyAddresses`**：默认 `Headless Service` 不把未就绪 `Pod` 的地址发布（`readiness` 才见），可设 `true` 发布不健康 Pod（调试用）。
    - **有状态服务场景**：`Cassandra`/`Elasticsearch`/`ZooKeeper`/`etcd`/`MySQL` 主从——都需要节点按固定名字相互发现（`peer` 发现），是 `Headless Service` + `StatefulSet` 的典型组合。
    - **参考**：`kubectl get svc` 看 `Service`（`Headless` 的 `CLUSTER-IP` 显示 `None`）、`kubectl get endpoints` 看后端 `Pod` 地址、`nslookup web-0.nginx`（DNS 解析）。

## 🤔 Service 有哪些功能？ 
- **`Service` 是让一组 `Pod` 对外提供稳定访问入口的抽象，核心功能：①服务发现（给 Pod 组一个稳定 `ClusterIP`/`DNS` 名）②负载均衡（把请求分发到后端多个 Pod）③`Pod` 自动关联（按标签选择器找 Pod，Pod 增减自动更新）④暴露访问（对外提供 `ClusterIP`/`NodePort`/`LoadBalancer` 等入口）。核心：“Service = Pod 组的‘总机’——稳定入口 + 负载分发 + 自动关联后端”。**
    - **① 服务发现（稳定入口）**
        - 给一组 `Pod` 一个**固定的 `ClusterIP`**（虚拟 `IP`）和 **`DNS` 名**（如 `my-svc`）——即使后端 `Pod` 换了 `IP`（重建），客户端始终访问同一个 `Service` 名，不受影响。

    - **② 负载均衡（请求分发）**
        - 把访问 `Service` 的请求**分发到后端多个 `Pod`**——`kube-proxy` 实现（默认 `iptables` 模式用随机概率分发，`IPVS` 模式支持轮询/加权等），应用的多个副本分摊流量，不单点。
        - `Service` 维护后端 `Pod` 列表（`Endpoint`/`EndpointSlice`），只把流量发给**就绪（`readiness`）**的 Pod。

    - **③ `Pod` 自动关联（标签选择器）**
        - `Service` 用**标签选择器**（`selector`）匹配一组 `Pod`（如 `app: nginx`）——Pod 按标签自动被 `Service` 纳入/剔出，增减无需改 `Service`。
        - `Pod` 挂了/扩缩，`Service` 自动更新后端列表（`Endpoint` 增删）——自动跟随。

    - **④ 暴露访问（多种类型）**
        - **`ClusterIP`**：仅集群内访问（默认）**`NodePort`**：节点端口暴露（集群外可访问）**`LoadBalancer`**：云厂商 LB（公网）**`ExternalName`**：映射外部域名——按“需不需要公开/怎么公开”选类型。

    - **一句话理解**
        - `Service` 像“**公司总机（前台）**”——你有固定总机号（`ClusterIP`/`DNS`），打进来（请求）前台分给对应员工（`Pod`，负载均衡）；员工离职/新来（Pod 增减），总机自动更新花名册（标签选择器）；外线打进分内线/直拨（`NodePort`/`LoadBalancer`）。

- **协助记忆**
    - 口诀：“**Service = 服务发现（稳定名）+ 负载均衡（分请求）+ 自动关联（按标签）+ 暴露入口（多种类型）**”。
    - 一句话：“**给 Pod 组一个固定入口，自动分发、自动跟随 Pod**”。

- **进阶思考**
    - **`Service` 用 `Selector` 匹配 Pod，那 `Pod` 挂了怎么办？**
        - `Service` 通过 `Endpoint`（`EndpointSlice`）记录后端 `Pod` `IP`；`Pod` 挂/`readiness` 失败 → 从 `Endpoint` 剔除（不再分发流量），`Deployment` 重建后新 `Pod` 自动加回——`Service` 自动跟随 `Pod` 健康状态，无需人工干预。
    - **`Service` 和 `Ingress` 区别（都能暴露访问）？**
        - `Service` 是**四层**（`L4`，`TCP`/`UDP` 负载均衡，内部/同一层暴露）；`Ingress` 是**七层**（`L7`，`HTTP` 路由：域名/路径转后端 `Service`），是**集群入口**（更贴近 HTTP 应用）。常组合：`Ingress`（域名路由）→ 后端 `Service`（负载均衡）→ `Pod`。

- **扩展信息**
    - **`Endpoint`/`EndpointSlice`**：`Service` 关联后端的“地址列表”（`Pod IP`+端口）；`EndpointSlice` 是更可扩展的新版（大数据量）。
    - **`kube-proxy`**：`Service` 的负载均衡由**每个节点上的 `kube-proxy`** 实现（监听 `Service`/`Endpoint` 变化，配 `iptables`/`IPVS` 规则转发）——`Service` 是“声明”，`kube-proxy` 是“实现转发”。
    - **`DNS`（`CoreDNS`）**：集群内 `Service` 按名解析（`my-svc.namespace.svc.cluster.local`）——服务发现依赖 `DNS`。
    - **参考**：`kubectl get svc`、`kubectl get endpoints`、`Service` YAML 的 `selector`/`ports`/`type`。

## 🤔 Service 有哪几种公开类型及应用场景？ 
- **`Service` 四种公开类型：`ClusterIP`（集群内访问，默认）、`NodePort`（节点端口暴露，集群外可访问）、`LoadBalancer`（云厂商 `LB` 公网）、`ExternalName`（映射外部域名）。核心：“按要不要公开、怎么公开选——内部用 ClusterIP、简单外露用 NodePort、生产公网用 LoadBalancer、连外部用 ExternalName”。**
    - **`ClusterIP`（默认）**
        - 分配**集群内虚拟 `IP`**，**仅集群内**可访问（其他 Pod/节点可访问，集群外不行）——**最常用**，内部服务间调用。
        - **适用**：集群内部服务（`web` 调用 `api`、微服务间通信）——不需要对外暴露。

    - **`NodePort`（节点端口暴露）**
        - 在**每个节点**上开放一个固定端口（`30000-32767`），通过**`节点IP:NodePort`**访问——集群外能访问（用节点端口）。
        - **适用**：简单对外暴露（测试/小规模）、无云 LB 的环境、临时/直连访问。
        - 局限：依赖节点 `IP`（节点变 `IP` 变）、端口范围固定、无负载均衡器（要配外部负载）。

    - **`LoadBalancer`（云厂商负载均衡）**
        - 云厂商分配**公网负载均衡器**（`LB`），自动路由到 `Service` 后端——生产对外公开，**自带公网 IP/负载均衡**。
        - **适用**：云上生产对外暴露（`web` 公网入口、`API` 网关）——云的 `LB` 自动管理（阿里/`AWS ELB`）。
        - 前提：云环境（或实现 `LoadBalancer` 的控制器，如 `MetalLB` 私有云）。

    - **`ExternalName`（映射外部域名）**
        - 不分配 `IP`，直接映射一个**外部域名**（`DNS` 别名）——让集群内访问 `Service` 名实际到外部服务（如外部 `API`/数据库）。
        - **适用**：把外部服务“伪装成集群内服务”调用（访问外部 `API`/第三方），无需改代码。

    - **一句话理解**
        - 四种公开类型 = “**房子对外怎么联络**”：`ClusterIP` = 只给小区内（内网）电话（内部服务）；`NodePort` = 每栋楼开个对外窗口（节点端口，简单外露）；`LoadBalancer` = 请专业前台（云 `LB`，公网入口）；`ExternalName` = 挂个“本店电话→实际是外面餐厅”的牌子（映射外部）。

- **协助记忆**
    - 口诀：“**内部用 ClusterIP、简单外露 NodePort、生产公网 LoadBalancer、连外部 ExternalName**”。
    - 一句话：“**内网 ClusterIP、外露 NodePort、云 LB LoadBalancer、映射外部 ExternalName**”。

- **进阶思考**
    - **`NodePort` 和 `LoadBalancer` 什么关系（不是对立）？**
        - `LoadBalancer` 是**建立在 `NodePort` 基础**上的——云 `LB` 把流量转发到各节点的 `NodePort`，再进 `Service`。所以 `LoadBalancer` 相当于“`NodePort` + 一个云 `LB` 转发到所有节点”，生产公网用 `LoadBalancer`（省手工配 `LB`），无云环境先用 `NodePort` + 外部 `LB`。
    - **`ClusterIP: None`（`Headless`）算一种类型吗？**
        - 算 `ClusterIP` 的特殊形态：`clusterIP: None` 不分配 `IP`，`DNS` 直达 Pod——`StatefulSet` 用（固定节点名）。它和 `ExternalName` 都“无 `IP`”，但 `Headless` 是集群内按 Pod 名解析，`ExternalName` 是映射外部域名。

- **扩展信息**
    - **`NodePort` 端口范围**：默认 `30000-32767`（`api-server` 参数配置）；`NodePort` 的 `Service` 也可配置 `clusterIP`（通常 `NodePort` 会连带 `ClusterIP`）。
    - **`LoadBalancer` 与 `MetalLB`**：私有云/裸金属没云 `LB`，用 `MetalLB`（开源 `LoadBalancer` 实现）给 `Service` 分配 `LB`。
    - **`Ingress` vs `Service` 暴露**：`Service` 是 `L4` 层暴露（`NodePort`/`LB` 端口级）；要 **`HTTP`/域名/路径**级路由用 `Ingress`（`L7`，走域名到后端 `Service`）——对外公开的首选是 `Ingress`+`Service` 组合。
    - **参考**：`Service` YAML 的 `type`（`ClusterIP`/`NodePort`/`LoadBalancer`/`ExternalName`）、`kubectl get svc` 看类型/端口。

## 🤔 kube-proxy 有几种代理模式及原理？ 
- **`kube-proxy` 是每个节点上实现 `Service` 网络转发的组件，主要有内核态的 `iptables`（默认，用 `iptables` 规则做概率转发）、`IPVS`（高性能，用 `IPVS` 内核支持轮询/加权等）、`nftables`（新，`v1.33` 起 `GA`）三种，另有已移除的旧版 `userspace`。核心：“`kube-proxy` 把 Service 的请求转发到后端 Pod——iptables 默认、IPVS 高性能、nftables 新、userspace 旧”。**
    - **三种代理模式**
        - **`iptables`（默认，最常见）**：用内核 `iptables` 规则把访问 `Service` 的流量**随机/概率转发**到后端 `Pod`。功能够用、无需额外模块；但规模大时 `iptables` 规则多、性能略降（`O(n)` 链）。
        - **`IPVS`（高性能，大集群推荐）**：用内核 `IPVS` 模块做负载均衡，支持**轮询（rr）/加权（wrr）/最少连接（lc）/源地址哈希（sh，会话保持）/一致性哈希（maglev）**等多种调度算法，性能更高、可扩展性好（大集群/高并发用）——`sh` 是源地址哈希、`maglev` 才是一致性哈希。
        - **`userspace`（用户态，旧版）**：在用户态做代理转发（`kube-proxy` 自己转发），性能差；自 `v1.23` 已弃用、`v1.26` 从核心移除（`--mode userspace` 直接报错）。当前**内核态可用 `iptables`(默认)/`ipvs`/`nftables` 三种**（`nftables`：`v1.29` alpha、`v1.31` beta、`v1.33` GA）。

    - **工作原理（`iptables`/`IPVS` 都要做的）**
        - `kube-proxy` **监听 `Service` 和 `Endpoint`（`EndpointSlice`）变化**，动态更新转发规则——`Pod`/`Service` 增减时自动收集后端 `Pod` `IP`，维护“哪些 Pod 属于这个 Service”。
        - 收到访问 `Service` 的流量 → 按转发规则**分发到某个后端 `Pod`**（`iptables` 随机概率 / `IPVS` 按算法）→ 实现负载均衡。
        - **只发给就绪 Pod**：`Endpoint` 只记录 `readiness` 通过（就绪）的 Pod，`readiness` 失败自动剔除（不转发）。

    - **`IPVS` vs `iptables` 怎么选**
        - 小/中规模、默认简单 → `iptables`（默认，够用）；大集群、高并发、要多种调度算法/性能 → `IPVS`（`--proxy-mode=ipvs`）。

    - **一句话理解**
        - `kube-proxy` 像“**每层楼的传菜员（分信员）**”——它盯着“哪些桌（Pod）属于哪桌预约（Service）”，外卖（请求）来了按规则分给对应的桌（后端 Pod）。`iptables` 是随机分、`IPVS` 是更智能的“轮流分/按权重分”，`userspace` 是慢吞吞的人工分（旧）。

- **协助记忆**
    - 口诀：“**iptables 默认（随机概率）、IPVS 高性能（轮询/加权）、userspace 旧版——大集群高并发选 IPVS**”。
    - 一句话：“**kube-proxy 把 Service 流量分给后端 Pod——默认 iptables、要性能用 IPVS**”。

- **进阶思考**
    - **为什么 `userspace` 被淘汰？**
        - 它在**用户态**转发（数据包要 `kube-proxy` 进程处理后再转），性能差、开销大；`iptables`/`IPVS` 都在**内核**处理转发（快、少拷贝）。所以现代用内核态（`iptables`/`IPVS`），`userspace` 成了历史。
    - **`IPVS` 支持哪些调度算法（比 iptables 强在哪）？**
        - `IPVS` 支持 `rr`（轮询）、`wrr`（加权轮询）、`lc`（最少连接）、`sh`（源地址哈希）、`maglev`（一致性哈希）等——比 `iptables` 的“随机概率”语义更明确（轮询/加权/最少连接可控），且性能高、扩展好。

- **扩展信息**
    - **配置**：`kube-proxy` 的 `--proxy-mode`（`iptables`/`ipvs`/`userspace`）；`IPVS` 调度器 `--ipvs-scheduler`（默认 `rr`）。
    - **`kube-proxy` 与 `Service` 关系**：`Service` 是**声明**（期望的稳定入口 + 后端），`kube-proxy` 是**实现**（在节点上把 `Service` 流量转给后端 `Pod`）——两者配合才让 `Service` 真正可用。
    - **`EndpointSlice`**：`Endpoint` 的新版（分片，大数据量更可扩展），`kube-proxy` 监听它以更新转发。
    - **参考**：`kubectl get endpoints`（看后端 `Pod`）、`kubectl describe svc`（看类型/端口）、`kubectl get pods -o wide`（看 Pod `IP`）。

## 🤔 Endpoint 资源有什么作用？ 
- **`Endpoint` 记录“`Service` 的后端`Pod`地址列表”——即 `Service` 实际把流量转发到哪些 `Pod`（`Pod IP` + 端口）。核心作用：`Service` 通过 `Endpoint` 知道“后端有哪些 Pod”，并把流量只发给就绪的 Pod；`Pod` 增减/健康变化自动更新。核心：“`Endpoint` 是 Service 的后端通讯录”。**
    - **`Endpoint` 是什么**
        - 一个 `Service` 关联一个 `Endpoint` 列表（`Pod IP` + 端口），是 `Service` 与 `Pod` 之间的“绑定”体现：`Service` 按标签选择器找到 `Pod` → 生成 `Endpoint`（记录这些 `Pod` 地址）。
        - 结构：`Endpoints` 资源（`name` 对 `Service`）包含一组 `addresses`（`Pod IP`）+ `ports`。

    - **作用（关键）**
        - **告诉 `Service` 后端在哪**：`kube-proxy` 读 `Endpoint` 知道访问 `Service` 的流量转发到哪些 `Pod`（`IP:Port`）——没有 `Endpoint`，`Service` 不知道转发去哪（空 `Endpoint` = 无后端，访问失效）。
        - **自动跟随 Pod 健康**：`Endpoint` 只含**就绪（`readiness` 通过）**的 Pod；`readiness` 失败/`Pod` 挂 → 从 `Endpoint` 剔除（不再转发），恢复后加回；`Pod` 增减自动更新——`Service` 总是转发给健康 Pod。
        - **负载均衡的依据**：`Endpoint` 里的多个 `Pod` 地址就是 `kube-proxy` 负载均衡的分发目标（多副本分摊流量）。

    - **`Endpoint` vs `EndpointSlice`**
        - 老的是 `Endpoints`（一个 `Service` 一个，后端 `Pod` 多时可能很大）；新的是 **`EndpointSlice`**（把 `Endpoint` 分片，按 `label`/容量切分，大数据量更可扩展）——现代版本默认用 `EndpointSlice`。

    - **一句话理解**
        - `Endpoint` = “**前台的花名册**”：前台（`Service`）按这本花名册知道“哪些员工（Pod）在岗、能接客”，只把电话（请求）转给在岗能接的（就绪 Pod）；有人请假（readiness 失败）划掉名字、新入职（新 Pod）加上——花名册自动更新，`Service` 永远联系到健康员工。

- **协助记忆**
    - 口诀：“**Endpoint = Service 的后端通讯录——记录 Pod 地址、只含就绪 Pod、自动增减**”。
    - 一句话：“**Service 靠 Endpoint 知道后端有哪些 Pod，只转发给健康的**”。

- **进阶思考**
    - **`Endpoint` 为空（`kubectl get endpoints` 空）说明什么？**
        - 说明 `Service` 的标签选择器**没匹配到任何就绪 Pod**——可能：①`Pod` 标签不匹配 `Service` 的 `selector` ②`Pod` 都未就绪（`readiness` 没过）③没有 `Pod` 运行。此时访问 `Service` 会失败（无后端可转发），用 `kubectl get pods`/describe 排查。
    - **为什么 `EndpointSlice` 取代了 `Endpoint`？**
        - 一个 `Service` 后端 `Pod` 成千上万时，单个 `Endpoints` 资源很庞大（主要施压 `API Server` 及 `kube-proxy` 等 watcher）；`EndpointSlice` 把地址分片（默认 `100/片`，可上调、`max 1000`）、按标签管理，减轻 `API Server` 负载、更可扩展——`EndpointSlice` `v1.19` 起由 `kube-proxy` 默认消费（beta）、`v1.21` 起 `GA`（`Endpoints` 自 `v1.33` 起正式标记废弃，此前仅是事实上弃用；新集群实际由 `EndpointSlice` 承担）。

- **扩展信息**
    - **`EndpointSlice` 特性**：按 `address`/`port`/`label` 分片，默认 `100` 个地址/片（可上调、`max 1000`），`label: kubernetes.io/managed-by=endpointslice-controller`；`kubectl get endpointslices` 查看。
    - **`Service` 关联条件**：`Endpoint`/`EndpointSlice` 由 `EndpointSlice` controller 根据 `Service` 的 `selector`（标签选择器）自动生成/更新——`Service` 定义后自动有 `Endpoint`。
    - **无 `selector` 的 Service**：可手动配 `Endpoint`（`ExternalName`/`LoadBalancer` 等特殊场景），或不自动关联 Pod。
    - **参考**：`kubectl get endpoints`、`kubectl get endpointslices`、`kubectl describe svc`（看 `Endpoints`）。

## 🤔 K8s 集群安装的网络插件有什么作用？ 
- **`K8s` 网络插件（`CNI` 插件）负责实现集群内的 Pod 网络——让每个 Pod 有独立 IP、能相互通信、能与节点/集群外通信。`K8s` 本身不管网络实现，需要可插拔的 `CNI` 网络插件（如 `Calico`/`Flannel`/`Cilium`）来提供：①Pod 间通信 ②Pod 与节点/外网通信 ③网络策略（隔离/安全）。核心：“K8s 只规定网络模型，实际建网靠 CNI 插件”。**
    - **为什么需要网络插件（K8s 的网络要求）**
        - `K8s` 要求**每个 Pod 有独立的 `IP`**（`Pod IP`），且 Pod 间、Pod 与节点间要**互通**（`kubelet` 按模型管理）——但**实际“怎么把网络搭起来 / 怎么路由 / 怎么隔离” `K8s` 不管**，交给 **`CNI`（Container Network Interface）插件**。
        - 没有网络插件，`Pod` 无法互相通信、无法分配 IP——集群网络不可用。

    - **网络插件的作用**
        - **① 给 Pod 分配 IP + 建网**：每个 Pod 分配独立 `Pod IP`（`CNI` 管理 IP 池），并在节点上建虚拟网络让 Pod 互通（`veth`/`overlay`/`BGP` 等）。
        - **② Pod 间/跨节点通信**：让不同节点的 Pod 能互通（覆盖网络 over 底层，或 `BGP` 直连）——集群内全局互联。
        - **③ 网络策略（安全隔离）**：`NetworkPolicy` 定义“哪些 Pod 能/不能通信”（东西向流量隔离/白名单），由 `CNI` 实现（`Calico`/`Cilium` 支持）。
        - **④ 与服务发现/`kube-proxy` 配合**：Pod 的 IP/网络连通是 `Service`/`kube-proxy` 转发的基础。

    - **常见 CNI 插件（选型）**
        - **`Calico`**：`BGP` 路由 + 网络策略强（安全隔离好），生产常用（也支持 `VXLAN`/`IPIP` 覆盖和 `eBPF` 数据面）。
        - **`Flannel`**：简单（`overlay` `VXLAN`），部署快，网络策略弱/无。
        - **`Cilium`**：`eBPF` 高性能（现代），网络策略 + 可观测强，云原生趋势。
        - **`Weave`/`Kube-router`**：其他可选（各有特点）。

    - **一句话理解**
        - 网络插件像“**小区的水电煤管网施工队**”——`K8s` 规定“每户要有水有电、户与户要通”（网络模型），施工队（`CNI` 插件）真正把管网铺起来（建网/路由/隔离）。没有施工队，家家都“断网”。

- **协助记忆**
    - 口诀：“**CNI 插件管 Pod 网络——分配 IP、建网互通、网络策略隔离；常见 Calico（策略强）/Flannel（简单）/Cilium（eBPF 高性能）**”。
    - 一句话：“**K8s 规定网络模型，CNI 插件实际建网 + 隔离**”。

- **进阶思考**
    - **`Flannel` 和 `Calico` 怎么选？**
        - `Flannel`：**简单**（`overlay`，部署快、适合小集群），但**网络策略弱**（无/需额外支持）；`Calico`：**功能强**（`BGP` 路由 + 网络策略完善），适合生产/需要安全隔离（东西向白名单）的集群。要网络策略 → `Calico`/`Cilium`；只要通畅通信 → `Flannel`。
    - **`NetworkPolicy` 一定需要网络插件支持吗？**
        - 是。`NetworkPolicy` 是声明，**实现要靠 CNI**（支持网络策略的：`Calico`/`Cilium`/`Weave`；不支持：`Flannel` 默认无）。没用支持策略的插件，`NetworkPolicy` 不生效（默认全通）。所以要有隔离能力要选支持的网络插件。

- **扩展信息**
    - **`CNI`（Container Network Interface）**：`K8s` 容器网络的标准接口——`CNI` 插件（`calico`/`flannel`/`cilium`）实现这个接口给 Pod 建网；`K8s` 通过 `CNI` 调用它们。
    - **网络模式**：`overlay`（覆盖网络，`VXLAN`，跨节点封装——`Flannel` 默认）、`BGP` 路由（`Calico` 默认，直接路由）、`eBPF`（`Cilium`，内核加速）——实现方式不同，性能/复杂度不同。
    - **`kube-proxy` 与网络插件关系**：`kube-proxy` 做 `Service` 的 `L4` 转发（`iptables`/`IPVS`），网络插件做 Pod 底层网络互通——两者配合才通。
    - **参考**：`kubectl get nodes -o wide`（看节点/网络）、`calicoctl`/`cilium` 命令、`kubectl get networkpolicy`（看策略）。

## 🤔 Calico 有哪几种工作模式及原理？ 
- **`Calico` 是一种 `CNI` 网络插件（网络 + 网络策略），主要工作模式：`BGP`（路由分发协议，默认直接路由三层）、`VXLAN`/`IPIP`（可叠加在 BGP 上的覆盖封装，跨网络时用）、`eBPF`（独立数据面，内核加速，现代高性能）。核心：“BGP 是路由协议、IPIP/VXLAN 可叠加其上、eBPF 是独立高性能数据面”。**
    - **三种工作模式（重点）**
        - **`BGP` 模式**：用 **`BGP` 协议**在节点间直接交换路由（三层）——Pod 间通信**直接路由**，性能高、延迟低；适合**同网络/可路由**的环境。注意默认是否封装取决于 `ipipMode`/`CALICO_IPV4POOL_IPIP`（旧版 manifest 默认 `Always`=BGP 全 mesh+`IPIP` 封装；设 `Never` 才是纯直连路由）。
        - **`VXLAN` / `IPIP` 模式（overlay 覆盖）**：用**封装隧道**（`VXLAN`/`IPIP` 把 Pod 包封装后跨节点传输）——适合**跨网络/不能三层互通**的环境（如跨机房/云），代价是封装开销（性能略降）。
        - **`eBPF` 模式（现代高性能）**：用 **`eBPF`**（内核可编程）做数据面（数据转发、网络策略）——性能极高、细粒度、可观测强；`Cilium` 也走这个方向，需要较新内核。

    - **工作原理（`BGP` 模式核心）**
        - 每个节点上运行 **`Calico` 组件**（`Felix` 数据面 agent）/`BIRD`（`BGP` daemon）/`confd`——把节点的**Pod 网段**通过 **`BGP`** 通告给其他节点，每个节点都知道其他节点的 Pod 子网路由（注意 `kube-router` 是**独立 CNI**，非 `Calico` 组件）。
        - 数据包（Pod→Pod）直接按 **`BGP` 路由**在节点间转发（不封装），`iptables`/`eBPF` 做网络策略（允许/拒绝哪些流）。
        - **网络策略**：`NetworkPolicy` 由 `Calico` 实现（`Felix` 把策略转成 `iptables`/`eBPF` 规则）——`BGP` 层做路由、策略层做隔离。

    - **怎么选**
        - 网络互通好（同机房/同网络）→ **`BGP`**（快）；跨网络/子网不通 → **`VXLAN`/`IPIP`**（overlay）；追求极致高性能 + 细粒度策略/可观测 → **`eBPF`**（需新内核）。

    - **一句话理解**
        - `Calico` 像“**快递网络**”：`BGP` 模式 = 各个分站点**直接互通**（自己开专线，快）；`VXLAN`/`IPIP` = 跨区**走中转封装**（打包投递，保通达但要封装费力）；`eBPF` = 用**智能机器人分拣**（加速）。

- **协助记忆**
    - 口诀：“**BGP 默认直连（快）、VXLAN/IPIP 走覆盖（跨网）、eBPF 内核加速（现代高性能）；网络策略靠它做隔离**”。
    - 一句话：“**同网选 BGP、跨网用覆盖、要极速上 eBPF**”。

- **进阶思考**
    - **`Calico` 和 `Flannel` 关键区别？**
        - `Calico`：`BGP` 直连 + **网络策略**（安全隔离强）——功能全、适合生产/安全要求高；`Flannel`：`overlay`（`VXLAN`）简单、**无网络策略**（或弱）——简单、适合小集群/只要通。要隔离/安全选 `Calico`，只要网络通选 `Flannel`。
    - **为什么 `BGP` 模式性能比 `overlay` 好？**
        - `BGP` 直接三层路由（数据包按路由直达，不封装）；`overlay`（`VXLAN`）要把 Pod 包**再封装一层**（`UDP` 封装）传输、接收方解封——多了封装/解封开销（`CPU`/延迟/包增大）。`BGP` 少这层，性能高但要求网络三层可路由。

- **扩展信息**
    - **`Calico` 组件**：`Felix`（数据面 agent，每节点）、`BIRD`（`BGP` daemon）、`calico-node`（打包运行的 DaemonSet）、`NetworkPolicy` controller。
    - **`NetworkPolicy` 支持**：`Calico` 默认支持 `NetworkPolicy`（`Flannel` 默认不支持）——这是选 `Calico` 做安全隔离的重要理由。
    - **性能对比**：`BGP`（默认，性能中高）< `eBPF`（性能最高、可观测最强，需新内核）；`VXLAN`/`IPIP`（overlay，性能略低于 BGP）。
    - **参考**：`calicoctl` 命令（配置/查看 `Calico`）、`kubectl get networkpolicy`、`kubectl get svc`（看 Service，`Service` 的 `ClusterIP` 实际由 `kube-apiserver` 从 `--service-cluster-ip-range` 分配，非 `Calico`）。

## 🤔 Service 与 Ingress 有什么区别？ 
- **`Service`（`L4`，四层）给一组 Pod 提供稳定负载均衡入口（`ClusterIP`/`NodePort`/`LoadBalancer`），基于 `TCP/UDP` 端口；`Ingress`（`L7`，七层）是集群 HTTP 入口，基于域名/路径路由到后端 `Service`。核心区别：`Service` 管“端口负载均衡”，`Ingress` 管“HTTP 域名/路径路由”；`Ingress` 是七层更贴近应用的暴露方式。**
    - **`Service`（四层 `L4`）**
        - **位置**：集群所有服务的基础；**内容**：`TCP/UDP` 端口负载均衡，`ClusterIP`/`NodePort`/`LoadBalancer`。
        - **能力**：把一个服务（一组 Pod）暴露成一个**稳定的地址/端口**，请求均衡分发——**不关心 HTTP 内容**（域名/路径），只按 IP+端口转发。
        - **局限**：`Service` 主要在 IP+**端口**层转发，**不按域名/路径路由**（`HTTP` 层）；可配多端口、均衡到多个后端 Pod，但无法按域名/路径区分服务。

    - **`Ingress`（七层 `L7`）**
        - **位置**：集群入口（`L7`）；**内容**：`HTTP/HTTPS`，按**域名**（`Host`）+**路径**（`Path`）路由——一个 `Ingress` 可指向多个后端 `Service`。
        - **能力**：域名/路径级路由、`HTTPS` 终止（`TLS`）、按域名分发到不同服务（`URL` 重写等由具体 `Ingress Controller` 注解实现，非 `Ingress` 内建字段）——更贴近 `Web` 应用的暴露。
        - **依赖**：`Ingress` 是一个规则声明，真正干活的是 **`Ingress Controller`**（`nginx`/`Traefik`/`ALB` 等），`Ingress` 本身不转发流量。

    - **区别与关系**
        - **层级**：`Service` `L4`（端口）、`Ingress` `L7`（HTTP）；`Ingress` 底层仍依赖 `Service`（路由到 `Service` 再进 `Pod`）。
        - **场景**：只暴露一个 TCP 服务 → `Service`（`NodePort`/`LB`）；要按域名/路径暴露多个 HTTP 服务 → `Ingress`（入口）+ `Service`（后端）。
        - **组合**：`Ingress`（域名路由，`L7`）→ 后端 `Service`（`L4` 负载均衡）→ `Pod`——`Ingress` 管进哪个门带什么 URL，`Service` 管门里的电梯分发到哪层。

    - **一句话理解**
        - `Service` = **楼里的电梯**（按楼层分发，TCP/UDP 端口）；`Ingress` = **大厦前台**（按找哪个部门（域名）+什么项目（路径）引导你进哪部电梯）——`Ingress` 是更智能的入口引导，但它进来后还是靠 `Service`（电梯）分发到具体房间（Pod）。

- **协助记忆**
    - 口诀：“**Service 管四层端口均衡，Ingress 管七层 HTTP 路由（域名/路径）；Ingress 底层靠 Service 分发**”。
    - 一句话：“**一个端口暴露用 Service，按域名/路径暴露 HTTP 用 Ingress（+Service）**”。

- **进阶思考**
    - **为什么不能只用 `Service` 暴露多个 HTTP 服务？**
        - `Service` 一个服务一个 `ClusterIP`/端口，多个 `HTTP` 服务要么多个 `NodePort`（每服务一个端口，丑）、要么多个 `LoadBalancer`（贵）；`Ingress` 一个入口按域名/路径区分多个服务（一个 `Ingress` 管多个 `Service`），省端口/资源、更规范。
    - **`LoadBalancer` 和 `Ingress` 什么关系？**
        - 云 `LoadBalancer`（`Service` 类型）是真公网 `LB`；`Ingress` 常配一个 `LoadBalancer` 型 `Service` 做入口（`Ingress Controller` 前面挂 `LB`）——`Ingress`（`L7` 路由）在 `LB`（公网 `4/7` 层）之后。生产常是：公网 `LB` → `Ingress Controller`（域名路由）→ `Service` → `Pod`。

- **扩展信息**
    - **`Ingress` 资源**：`spec.rules`（域名/路径到后端 `Service`）、`spec.tls`（证书）、`spec.ingressClassName`（指定 controller）。
    - **`Ingress Controller`**：`nginx-ingress`（最常用）、`Traefik`、`Envoy`、`ALB Ingress`（云）——`Ingress` 规则由 controller 实现转发。
    - **`Gateway API`（新）**：`Ingress` 的现代演进（更灵活/多协议），`v1.0` GA（2023），生产可选。
    - **参考**：`kubectl get ingress`、`kubectl get svc`、`kubectl get ingressclasses`（看 controller）。

## 🤔 Ingress 与 Ingress Controller 的关系？ 
- **`Ingress`（资源）是声明/规则（要求什么域名/路径怎么路由、要不要 `HTTPS`），`Ingress Controller` 是执行者（真正监听 `Ingress` 规则并实现转发流量）。`Ingress` 是需求文档，`Controller` 是施工队——你写 `Ingress` 声明，`Controller`（`nginx`/`Traefik` 等）把规则转换成实际的反向代理配置并干活。核心：“Ingress 声明路由规则，Controller 实现转发”。**
    - **`Ingress`（资源，声明）**
        - 一个 `K8s` API 资源（`Ingress`），**只描述想要什么**：`host`（域名）、`path`（路径）、后端 `Service`、`TLS`（证书）——是用户要的路由规则。
        - **它本身不转发任何流量**（`Ingress` 只是数据声明，存 `etcd`），只描述期望。

    - **`Ingress Controller`（执行者）**
        - **真正干活**的组件（集群内的 `Deployment`/`Pod`，如 `nginx-ingress`/`Traefik`/`ALB`）——**监听 `Ingress` 资源变化**，把 `Ingress` 规则**翻译成实际的反向代理配置**（如 `nginx` 的 `server`/`location` 块）并**转发流量**。
        - 工作：①watch `Ingress`/`Service`/`Endpoint` 变化 ②生成/更新代理配置（`nginx.conf`）③代理转发（按域名/路径路由到后端 `Service`）④`reload` 生效。
        - **有 `Ingress` 没 `Controller`**：`Ingress` 声明了但没人执行 → 不生效（访问不了）。所以必须安装 `Ingress Controller`（默认集群不装）。

    - **关系（关键）**
        - `Ingress` = **规则声明**（数据），`Controller` = **规则执行者**（程序）——类似 Service 与 kube-proxy、Deployment 与控制器 的关系（声明 vs 实现）。
        - 一个 `Ingress Controller` 可执行多个 `Ingress`；`IngressClass`（`ingressClassName`）指定用哪个 `Controller`。
        - 生产必须有 `Ingress Controller` 才能用 `Ingress`（默认集群无，需部署 `nginx-ingress`/`Traefik`）。

    - **一句话理解**
        - `Ingress` 像**消防设计图**（写着这里出口、那里通道），`Ingress Controller` 像**施工队**（真按图纸建门/通道、指挥人流——转发流量）。光有图纸（`Ingress`）没人施工（无 `Controller`）等于没有；但图纸定规则、施工队照做。

- **协助记忆**
    - 口诀：“**Ingress 声明路由（域名/路径→Service），Ingress Controller 执行（监听规则、配代理、转发）；同 Service 与 kube-proxy 的关系**”。
    - 一句话：“**Ingress 说我要这样路由，Controller 说我来实现——没 Controller，Ingress 白搭**”。

- **进阶思考**
    - **为什么 `Ingress` 本身不工作，必须有 `Controller`？**
        - `Ingress` 只是 `etcd` 里的一段数据（描述路由规则），本身无转发能力——需要程序把它变成真实的代理配置（`nginx.conf` 等）并监听端口转发流量，这个程序就是 `Ingress Controller`。所以安装集群后要另装 `Ingress Controller`（如 `nginx-ingress`）才能用 `Ingress`。
    - **多个 `Ingress Controller` 会怎样？**
        - 可共存，但每个 `Ingress` 用 `ingressClassName` 指定归哪个 `Controller` 管（`nginx` 或 `Traefik`）——不同 `Controller` 处理不同 `Ingress`（按类分）。不指定则看默认 `IngressClass`。

- **扩展信息**
    - **`IngressClass`**：`ingressClassName` 指定 `Ingress` 用哪个 `Controller`（如 `nginx`/`traefik`）；`kubectl get ingressclass` 查看。
    - **常见 `Controller`**：`nginx-ingress`（最主流）、`Traefik`（轻量）、`Envoy`/`Istio`（服务网格）、`AWS ALB`/`GCE`（云）。
    - **`Gateway API`（现代）**：`Ingress`+`Controller` 的演进（更标准/多协议），`v1.0` GA——生产可逐步引入。
    - **参考**：`kubectl get ingress`、`kubectl get ingressclass`、`kubectl get pods -n <ingress-ns>`（看 controller Pod）。

## 🤔 Ingress 暴露的应用无法访问如何排查？ 
- **`Ingress` 暴露的应用访问不了，按“从外到内层层排查”：①DNS 解析（域名能解析到入口吗）②`Ingress` 入口（`Ingress` 规则/`Controller` 正常吗）③`Service` 后端（`Service` 有 `Endpoint` 吗）④`Pod` 健康（后端 `Pod` 就绪吗）⑤端口/证书/防火墙。核心：“外→DNS→Ingress→Service→Pod 逐层定位”。**
    - **第 1 层：域名 `DNS` 解析**
        - `dig`/`nslookup` 看域名**能否解析到入口 `IP`**（`Ingress Controller` 的 `LoadBalancer` `IP`/节点 `IP`）——解析不到说明 `DNS` 没配/没生效。
        - 检查：`DNS` 记录指向 `Ingress Controller` 的 `IP` 吗？

    - **第 2 层：`Ingress` 入口本身**
        - `kubectl get ingress` 看 `Ingress` 规则是否存在、`kubectl get ingressclass` 看 `Controller` 是否指定；`Ingress Controller` 的 `Pod` 是否 `Running`（`kubectl get pods -n <ingress-ns>`）。
        - 直接访问 `Ingress Controller` 的 `IP`+`Host` 头测试（`curl -H 'Host: your.domain' http://<ingress-ip>`）——能通说明 `Ingress` 路由 OK，不通看 `Controller`。

    - **第 3 层：`Service` 后端**
        - `kubectl get svc` 看 `Ingress` 指向的 `Service` 存在吗、`kubectl get endpoints <svc>` 看有没有后端 `Pod` 地址——`Endpoint` 为空说明 `Service` 选择器没匹配到 Pod（后端没就绪）。

    - **第 4 层：`Pod` 健康**
        - `kubectl get pods`/`describe` 看后端 `Pod` 是否 `Running` + `Ready`（`readiness` 通过）——`Pod` 未就绪会被剔除（`Endpoint` 空），访问失败。
        - `kubectl exec -it <pod> -- curl localhost:port` 在 Pod 内测应用本身能访问吗。

    - **其他：端口/证书/防火墙/路径**
        - `Ingress` 的 `path` 是否匹配请求路径、`TLS` 证书是否有效、防火墙/安全组是否放行 `80/443`、`Host` 头是否正确。

    - **一句话理解**
        - 排查像“**快递送不到找原因**”：先问收货地址对吗（`DNS` 解析）→ 快递站建了吗（`Ingress Controller`）→ 分拣表对吗（`Ingress` 规则）→ 分到哪个门牌（`Service`/`Endpoint`）→ 那家有人吗（`Pod` 就绪）——层层找断点。

- **协助记忆**
    - 口诀：“**外→DNS→Ingress（Controller/规则）→Service（Endpoint）→Pod（就绪），逐层排查，kubectl describe/get 看每层状态**”。
    - 一句话：“**从外往里，先 DNS 再 Ingress，Service 没后端看 Pod 就绪**”。

- **进阶思考**
    - **`Ingress` 能通但应用仍报错，最可能是哪层？**
        - 通常是**后端 `Pod` 没就绪**（`readiness` 不过 → `Endpoint` 空 → `Ingress` 转不到）或 `Ingress` 规则 `path`/`Host` 不匹配——用 `kubectl get endpoints` 看后端、`curl -H Host` 测 `Ingress`。
    - **`Ingress Controller` 的 `Pod` 起不来（CrashLoop），怎么查？**
        - 看 `Ingress Controller` 的 `Pod` 日志（`kubectl logs <ingress-pod -n ingress`）——常见配置错/`ConfigMap` 问题/端口冲突；`Ingress Controller` 挂了整个入口都通不了，是重点排查对象。

- **扩展信息**
    - **`Ingress Controller` 用 `LoadBalancer` 还是 `NodePort`**：云环境 `LoadBalancer`（公网 `LB`）→ `Ingress`；无云 `NodePort` + 外部 `LB`——看 `Ingress Controller` 的 `Service` 类型。
    - **测试命令**：`curl -I -H 'Host: example.com' http://<ingress-ip>`（带 `Host` 头测）、`kubectl get ingress -A`、`kubectl get endpoints -A`、`kubectl describe ingress`。
    - **`Host` 头 & `path`**：`Ingress` 按 `Host`（域名）+ `path`（路径）匹配，请求必须带正确的 `Host` 头、`path` 匹配才路由到对应 `Service`。
    - **参考**：`kubectl get ingress/ingressclass`、`kubectl describe ingress`、`kubectl get endpoints`、`kubectl exec`（测试后端）。

## 🤔 Ingress 后端应用无法获取客户端 IP 如何解决？ 
- **`Ingress` 后端看到的客户端 IP 是代理（`Ingress Controller`）的 `IP` 而非真实访客 IP，因为 `Ingress Controller` 是个反代，转发时默认不传真实 IP。解决：①让 `Ingress` 传递客户端 IP 头（`X-Forwarded-For`/`X-Real-IP`）②后端应用读这些头而非 `remote_addr` ③正确设置代理链（`X-Forwarded-For` 拼接、可信代理）。核心：“Ingress 是反代，真实 IP 在 `X-Forwarded-For` 头里（经可信代理校验后取最右不可信 IP），后端要读它”。**
    - **为什么拿不到真实 IP**
        - `Ingress Controller`（`nginx`/`Traefik`）是**反向代理**：客户端请求到它，它转发给后端 `Pod`——后端看到的 `TCP 源地址`是 `Ingress Controller` 的 `IP`，不是真实访客 IP（类似 `nginx` 反代）。

    - **解决思路**
        - **① `Ingress Controller` 传递真实 IP 头**：`nginx-ingress` 默认会加 `X-Forwarded-For`/`X-Real-IP`（`use-forwarded-headers`/`proxy_set_header`），`Ingress` 后配置转发真实 IP。
        - **② 后端应用读 `X-Forwarded-For`**：后端应用取 `X-Forwarded-For` 头、而非 `remote_addr`——多数框架支持（如 `nginx` 的 `real_ip_header`/`set_real_ip_from`、后端应用读 `XFF`）；注意需**经可信代理校验**后取值（见下）。
        - **③ 正确设置可信代理/反向代理链**：`X-Forwarded-For` 可被客户端伪造（`XFF: fake, real` 取最左就被欺骗），所以要先配**可信代理**（`set_real_ip_from` 信任 `Ingress` 的 `IP`），再**从右往左跳过所有可信 IP，取第一个不在可信列表（不可信）的 IP** 作为真实客户端——这是 `nginx` `realip` 模块的正确规则。

    - **`X-Forwarded-For` vs `X-Real-IP`**
        - **`X-Real-IP`**：单值，常是最近的代理（`Ingress` 看到的真实 IP）——简单但只有一层。
        - **`X-Forwarded-For`**：多值（`client IP, proxy1, proxy2...`），记录经过的代理链——**经可信代理校验后，取最右的不可信 IP 才是真实客户端**（信任链全部可信时“最左第一个”才成立；可被伪造时不能直接取最左）。

    - **一句话理解**
        - 像“**写信给前台中间人转交**”——前台（`Ingress Controller`）替客人（客户端）投递，收到的信只显示“前台寄的”（`remote_addr`=代理 IP）；真正寄信人写在“转发人”栏（`X-Forwarded-For`）——后端看“转发人栏”要**先配可信代理（`set_real_ip_from`）再取从右往左第一个不可信 IP**（信任链全可信时才取最左）。

- **协助记忆**
    - 口诀：“**Ingress 是反代，真实 IP 在 X-Forwarded-For；配可信代理，取最右不可信 IP（可伪造时别直接取最左）**”。
    - 一句话：“**后端拿不到真实 IP 是因为 Ingress 是反代——去读 X-Forwarded-For 头**”。

- **进阶思考**
    - **`X-Forwarded-For` 怎么被伪造，怎么防？**
        - 客户端可自己在请求里塞 `X-Forwarded-For: fake`；代理（`Ingress`）转发时**追加**真实 IP，所以要**只信任可信代理**（`set_real_ip_from` 指定 `Ingress` 的 `IP` 段），取从右往左**第一个不在可信列表里的 IP** 作为真实客户端（或信任链最末）。
    - **`Ingress` 来了两层代理（`LB`→`Ingress`→`Pod`），真实 IP 在哪？**
        - `X-Forwarded-For` 会累积：`client` 先到 `LB`（`LB` 加 `XFF: client`）→ `Ingress`（追加，`XFF: client, lb-ip`）→ 后端**从右往左跳过可信代理（`lb-ip`），取第一个不可信 IP（`client`）**为真实访客——信任链全可信时取最左才成立。

- **扩展信息**
    - **`nginx-ingress` 配置**：`proxy-set-headers`（`ConfigMap` 配 `X-Real-IP`/`X-Forwarded-For`）、`use-forwarded-headers`（从 `X-Forwarded-For` 取真实 IP）、`compute-full-forwarded-for`。
    - **`real IP` 模块**：`nginx` 的 `real_ip_header X-Forwarded-For` + `set_real_ip_from <ingress-cidr>`——让 `nginx` 直接把 `remote_addr` 替换为真实 IP。
    - **应用框架**：`Spring`/`Django` 等读 `X-Forwarded-For`（需正确配置可信代理，防 `XFF` 伪造攻击）。
    - **参考**：`kubectl get ingress`（看注解）、`Ingress Controller` 日志（看记录的是谁的 IP）、应用 `request.remote_addr` vs `request.headers['X-Forwarded-For']`。

## 🤔 Ingress 环境提示上传文件过大怎么解决？ 
- **`Ingress` 上传文件过大（`413 Request Entity Too Large`）是因为 `Ingress Controller`（`nginx`）默认限制了请求体大小（`client_max_body_size` 默认 `1m`）。解决：①调大 `Ingress`/`nginx` 的上传大小限制（`proxy-body-size`/`client_max_body_size`）②同时调大后端服务的 `body size` 限制 ③必要时调 LB/网关层限制。核心：“Ingress 的 nginx 限量 1m，传大文件要放大 body size，且前后端都要改”。**
    - **为什么上传过大报错**
        - `Ingress Controller`（`nginx`）默认 `client_max_body_size: 1m`（1MB）——超过返回 `413 Request Entity Too Large`（请求体过大），和 `nginx` 直接限制一样。`Ingress` 转发的上传请求超过 `1m` 就被拦。

    - **解决方法（重点）**
        - **① 调大 `Ingress` 的请求体限制**：通过 `Ingress` 注解 `nginx.ingress.kubernetes.io/proxy-body-size: 20m`（或全局 `ConfigMap` 的 `proxy-body-size`）——放大 `Ingress Controller`（`nginx`）允许的上传大小。
        - **② 后端应用也要放大限制**：`Ingress` 放大后，后端 `Pod` 的应用（`nginx`/`Spring`/`tomcat`）还有自己的 `body size` 限制，可能仍报错——要**前后端都改**（如应用 `nginx` 的 `client_max_body_size`、`Spring` 的 `max-file-size`/`max-request-size`）。
        - **③ 负载均衡/网关层**：若前面还有 `LB`（云 `LB`/网关），它们也可能有限制，一并调大。
        - **④ `Ingress` 的 `large-client-header-buffers`**：个别大请求头也要放大（`headers` 大也可能报错）。

    - **一句话理解**
        - 像“**寄件门口快递柜限重 1 公斤**”——`Ingress`（门口快递柜）默认 `1m`，大包裹被退回（`413`）；要收大包裹，把门口拒重（`proxy-body-size`）和寄件站自己（后端应用）的限重都调大。

- **协助记忆**
    - 口诀：“**Ingress 报 413 上传过大 → 放大 proxy-body-size（Ingress）+ 后端应用 body limit，前后端都要改**”。
    - 一句话：“**上传过大先调 Ingress 的 proxy-body-size，再调后端应用的 body size**”。

- **进阶思考**
    - **改了 `Ingress` 注解还报 `413`，还有什么原因？**
        - ①注解没生效（`ConfigMap`/注解没 `reload`）②后端应用自己的限制没放宽 ③传的是超大文件（如 `GB` 级，除了调大还要考虑 `Ingress`/`nginx` 的 `proxy-request-buffering`、超时 `proxy-read-timeout`）④`LB` 层限制。
    - **上传大文件（`GB` 级）要注意什么？**
        - 调大 `proxy-body-size` 外，还要：`proxy-request-buffering: 'off'`（流式转发，不缓冲整个上传）、`proxy-read-timeout`/`send-timeout`（大文件传输时间长，超时放宽）、`client_max_body_size`——大文件上传是 `Ingress` 高频坑，要整体调参数。

- **扩展信息**
    - **`nginx-ingress` 注解**：`nginx.ingress.kubernetes.io/proxy-body-size`（请求体）、`proxy-request-buffering`（关缓冲大文件）、`proxy-read-timeout`（读超时）、`large-client-header-buffers`（头）。
    - **`413` 状态码**：`Request Entity Too Large`（请求体过大）——`nginx` 返回，因 `client_max_body_size` 限制。
    - **后端应用限制**：`Spring` 的 `spring.servlet.multipart.max-file-size`/`max-request-size`；`nginx` 后端 `client_max_body_size`；`tomcat` 的 `maxPostSize`/`maxSwallowSize`——都要和 `Ingress` 对齐。
    - **参考**：`kubectl annotate ingress <name> nginx.ingress.kubernetes.io/proxy-body-size=20m`（加注解）、`kubectl get ingress`（看注解）、`ConfigMap`（`nginx-configuration`，全局默认）。

## 🤔 如何将 Pod 分配到指定节点上？ 
- **把 `Pod` 调度到指定节点，几种方式：①`nodeSelector`（按节点标签选择，最简单）；②`nodeAffinity`（节点亲和，更灵活——硬性/软性要求，支持 `In`/`NotIn` 等）；③`nodeName`（直接指定节点名，强制）；④`污点/容忍`（`Taint`/`Toleration`，反向——节点打污点不让 Pod 上，Pod 配容忍才能上）；⑤`podAffinity`/`podAntiAffinity`（Pod 亲和/反亲和，按其他 Pod 位置调度）。核心：按标签、按节点名、按污点容忍、按 Pod 位置——各有场景。**
    - **① `nodeSelector`（最简单，按节点标签）**
        - 给节点打**标签**（`kubectl label node <node> gpu=true`），`Pod` 里配 `nodeSelector: {gpu: "true"}`——调度器只把 `Pod` 放到**带这标签**的节点。
        - **适用**：简单按节点属性选择（如只放有 GPU 的节点/只放 SSD 节点）；缺点是只能等值匹配（`key=value`），不灵活。

    - **② `nodeAffinity`（节点亲和，灵活）**
        - 用 `nodeAffinity` 表达对节点的**偏好/硬性要求**：完整字段 `requiredDuringSchedulingIgnoredDuringExecution`（硬性——必须满足否则不调度）、`preferredDuringSchedulingIgnoredDuringExecution`（软性——尽量满足，不强制）；支持 `In`/`NotIn`/`Exists` 等操作符。
        - **适用**：需要必须放某类节点（硬性）或尽量放某类节点（软性，如尽量放 SSD，不行放 HDD）。

    - **③ `nodeName`（直接指定节点名，强制）**
        - `Pod.spec.nodeName: <节点名>`——调度器把 `Pod` **直接指派**到这个节点（跳过调度器选择）。
        - **适用**：强制放到固定节点的特殊场景（测试/排障/`DaemonSet` 兜底）；但**不灵活**（不参与正常调度、易导致资源不均）。

    - **④ `污点`/`容忍`（反向控制）**
        - 节点打**污点**（`Taint`，如 `node-role.kubernetes.io/gpu:NoSchedule`——不让普通 Pod 上），**只有配了对应容忍**（`Toleration`）的 `Pod` 才能调度上去——这是节点怎么挑 Pod（反向），而非 Pod 挑节点。
        - **适用**：给特殊节点（GPU/专用）打污点，只让特定 `Pod` 上去（如显卡节点只调度 GPU 工作负载）。

    - **⑤ `podAffinity`/`podAntiAffinity`（Pod 亲和/反亲和）**
        - 按**其他 `Pod` 的位置**调度：`podAffinity`（和某类 Pod 尽量放一起，如和 `redis` 同节点）、`podAntiAffinity`（尽量分开，如副本不同节点）——控制 Pod 间分布。
        - **适用**：多副本分散（反亲和，高可用）、有依赖的 Pod 就近（亲和，性能）。

    - **一句话理解**
        - 把 `Pod` 分到指定节点 = 分配宿舍：①`nodeSelector` = 我要住带空调的楼（按楼标签）；②`nodeAffinity` = 最好住带阳台的，没有也行（软性偏好）或必须住一层（硬性）；③`nodeName` = 我就住 101（直接点名）；④`污点/容忍` = 这栋楼只让有卡的人进（节点挑人）；⑤`podAffinity` = 我要住我朋友隔壁/远离我朋友（按室友位置）。

- **协助记忆**
    - 口诀：nodeSelector 按标签、nodeAffinity 按偏好/硬性、nodeName 点名、污点容忍（节点挑 Pod）、Pod 亲和/反亲和（按邻居）。
    - 一句话：让 Pod 去指定节点——标签选、偏好调、点名定、污点拦、邻居带。

- **进阶思考**
    - **`nodeSelector` 和 `nodeAffinity` 怎么选？**
        - `nodeSelector` 简单（等值匹配，够用）；`nodeAffinity` 功能强（`In`/`NotIn`/`Exists` 操作符、硬性/软性）——需要必须/尽量或复杂匹配用 `nodeAffinity`，简单放某标签节点用 `nodeSelector`。
    - **`污点` 和 `nodeSelector` 什么关系（都管节点选择）？**
        - 方向相反：`nodeSelector`/`nodeAffinity` 是 Pod 说我想去哪（主动挑节点）；`污点/容忍` 是节点说谁能来（被动拦节点）——一个 Pod 挑节点、一个节点挑 Pod，常配合用（如 GPU 节点打污点 + 特定 Pod 配容忍 + nodeSelector 选 GPU 节点）。

- **扩展信息**
    - **`nodeAffinity` 示例**：`requiredDuringSchedulingIgnoredDuringExecution: nodeSelectorTerms: [{matchExpressions: [{key: disktype, operator: In, values: [ssd]}]}]`（硬性要求 SSD 节点）。
    - **`Taint` 效果**：`NoSchedule`（不调度新 Pod）、`PreferNoSchedule`（尽量不调度）、`NoExecute`（已跑的 Pod 被驱逐）+ 容忍的 `tolerationSeconds`。
    - **`podAffinity`/`podAntiAffinity`**：`topologyKey`（按节点/区域/机架维度分散）、`weight`（软性权重）。
    - **参考**：`kubectl label node`（打节点标签）、`kubectl taint node`（打污点）、`kubectl describe node`（看标签/污点）、`Pod` YAML 的 `nodeSelector`/`affinity`/`tolerations`。

## 🤔 K8s 调度器有哪些调度算法？ 
- **`K8s` 调度器（`kube-scheduler`）用两阶段调度：先过滤（`Filter`/`Predicate`）把不合适的节点筛掉（资源够不够/污点/亲和等），再打分（`Score`/`Priority`）给剩余节点排序，选分数最高的节点。核心：先筛选（能不能放），再打分（哪最好），选最高分。**
    - **调度器的工作流程（两阶段）**
        - **① 过滤（`Filter`/`Predicate`，节点能不能放）**：逐个节点检查是否满足硬性条件，**不满足的剔除**——节点资源够不够（`NodeResourcesFit`）、是否可调度（`NodeUnschedulable`）、污点是否可容忍（`TaintToleration`）、亲和是否满足（`NodeAffinity`/`PodAffinity`）、卷能否挂载（`VolumeBinding`）等。
        - **② 打分（`Score`/`Priority`，节点哪个更好）**：对过滤剩下的节点**打分**，选分数最高的——`NodeResourcesFit`（资源均衡，倾向利用率低）、`ImageLocality`（镜像已存在优先）、`PodTopologySpread`（分散）、`InterPodAffinity`（亲和）等。
        - **③ 选出并绑定**：分数最高的节点被选中，调度器把 `Pod` **绑定**到该节点（写回 `etcd`），`kubelet` 再执行。

    - **常见的调度器插件（算法）**
        - **`Filter` 类**：`NodeResourcesFit`（资源合适）、`NodeUnschedulable`（节点可调度）、`NodeName`（点名节点）、`NodeSelector`（节点选择器）、`NodeAffinity`（节点亲和）、`InterPodAffinity`（Pod 亲和）、`TaintToleration`（污点容忍）、`VolumeBinding`（卷绑定）、`NodePorts`（端口冲突）。
        - **`Score` 类**：`NodeResourcesFit`（资源均衡，`LeastAllocated` 倾向分散/`MostAllocated` 打包）、`ImageLocality`（镜像本地）、`PodTopologySpread`（拓扑分散）、`InterPodAffinity`（Pod 亲和）、`NodeAffinity`（节点亲和权重）。
    - **`NodeResourcesFit` 两种打分**（易混淆）
        - **`LeastAllocated`**（默认）：倾向**分散**（选利用率低/剩余多的节点——负载均衡）；**`MostAllocated`**：倾向**打包**（选已占用的节点——省资源/集中）。默认 `LeastAllocated`（分散）。

    - **一句话理解**
        - 调度器像**找教室**：先**筛选**（这间教室坐得下吗/有投影吗——过滤），再**打分**（哪间最合适——空座多、有空调优先——打分），选**分数最高**的教室安排学生（Pod）。

- **协助记忆**
    - 口诀：先过滤（能不能放）、再打分（哪最好）、选最高分——资源/污点/亲和做过滤，均衡/镜像/分散打分。
    - 一句话：K8s 调度 = 先筛掉不合适节点，再给剩下的打分，选最好的。

- **进阶思考**
    - **为什么 `NodeResourcesFit` 默认倾向分散（`LeastAllocated`）而不是打包？**
        - 分散（`LeastAllocated`）让 `Pod` 分布更均匀——负载均衡、单节点故障影响小、资源用得更充分；打包（`MostAllocated`）是省资源/集中（适合预算/资源紧张）。默认分散更利于**高可用和资源利用**；要打包显式配 `MostAllocated`。
    - **调度器节点过滤后全不合适（节点都被筛掉）会怎样？**
        - `Pod` 停在 **`Pending`**（调度失败），`kubectl describe` 事件显示调度器各节点被拒原因（`0/3 nodes available` + 每节点为何不合适）——查资源/污点/亲和/卷，调整后重新调度。

- **扩展信息**
    - **调度器是可插拔的**：`kube-scheduler` 由**调度插件（`Scheduling Framework`）**组成（`Filter`/`Score` 等），可配置/扩展（自定义插件）。
    - **调度策略**：`default-scheduler`（内置）；`kube-scheduler` 通过 `--config` 指向 `SchedulerConfiguration` 的 `profiles` 定制调度配置（旧 `Policy` 配置文件/`--policy-config-file` 在 `v1.23` 已移除）。
    - **调度器高可用**：多副本 `kube-scheduler` via `--leader-elect`（选主，同时一个调度）。
    - **参考**：`kubectl describe pod`（看调度事件）、`kubectl get nodes`、`kube-scheduler` 日志（`SchedulerConfiguration` 的 `profiles`/`plugins.disabled` 启停插件）。

## 🤔 什么情况下会用到污点与容忍？ 
- **`污点/容忍`（`Taint`/`Toleration`）是节点怎么挑 Pod（反向选择）：节点打污点（标记不让普通 Pod 上），`Pod` 配容忍才能调度上去。核心用途：①给专用节点（GPU/高内存）打污点只让特定 Pod 用；②节点维护时排空上移 Pod（`NoExecute`）；③隔离特定工作负载/租户。核心：污点是节点门禁，容忍是 Pod 门卡。**
    - **什么是污点/容忍（先理解）**
        - **`Taint`（污点，节点侧）**：节点打上污点（如 `key=value:NoSchedule`），表示这个节点有特殊限制，普通 Pod 别来——相当于节点挂了门禁。
        - **`Toleration`（容忍，Pod 侧）**：`Pod` 配容忍（匹配污点的 `key/value/effect`）才能调度到带污点的节点——相当于 Pod 有门卡。
        - **关系**：污点 + 容忍 = 节点设限，Pod 持卡进入（`Pod` 没容忍 → 调度器跳过该带污点节点）。

    - **`Taint` 的三种效果（`effect`）**
        - **`NoSchedule`**：新 Pod 不调度到该节点（已跑的不管）——最常用，只拦新来。
        - **`PreferNoSchedule`**：软性偏好，**尽力避免**调度——仅在没有更优节点时才可能落上（软限制，非强制阻止）。
        - **`NoExecute`**：不仅不调度，还把**已跑的 Pod 驱逐**（除非有容忍）——用于节点维护/驱逐。

    - **什么情况用（重点）**
        - **① 专用节点加白名单**：给 **GPU/高内存/特定硬件** 节点打污点（`gpu:NoSchedule`），只让配了容忍的 GPU 工作负载（`Pod` 配 `toleration`）上——普通 Pod 不占 GPU 节点。
        - **② 节点维护排空**：节点要维护，打 `NoExecute` 污点 + `kubectl drain`，把上面 Pod 驱逐迁移（除非容忍）——常用于节点升级/下线前。
        - **③ 控制面节点隔离**：`master`/`control-plane` 节点默认 `node-role.kubernetes.io/control-plane:NoSchedule` 污点——防止业务 Pod 占用 / 影响控制面。
        - **④ 默认节点限制**：`master`/`control-plane` 污点（默认 `NoSchedule`）防止业务 Pod 跑到控制节点。

    - **一句话理解**
        - `污点/容忍` = VIP 房间门禁：房间（节点）挂仅限 VIP 牌（`Taint`），只有持 VIP 卡（`Toleration`）的人能进——给 GPU/高内存等特殊房间设门禁，只有特定工作负载（有卡）入住。

- **协助记忆**
    - 口诀：节点打污点（门禁）、Pod 配容忍（门卡）——专用节点/维护排空/隔离用；NoSchedule 拦新、NoExecute 驱逐。
    - 一句话：污点是节点门禁、容忍是 Pod 门卡——没卡进不了禁区。

- **进阶思考**
    - **`nodeSelector`/`nodeAffinity` 和 `污点/容忍` 什么区别？**
        - 方向相反：`nodeSelector`/`nodeAffinity` 是 Pod 主动挑节点（我想去 GPU 节点）；`污点/容忍` 是节点主动拒/放行（GPU 节点只让有卡的上）。生产常**配合**：GPU 节点打污点（不让普通 Pod）+ `Pod` 配容忍 + `nodeSelector` 选 GPU 节点。
    - **为什么 `Master` 节点默认打污点？**
        - `Master`（控制面）节点跑 `kube-apiserver`/`etcd` 等，打 `NoSchedule` 污点（`node-role.kubernetes.io/control-plane:NoSchedule`）防止**业务 Pod** 占资源/影响控制面——保证`Master` 专注管理。需要可容忍的 `Pod` 才上（如 `Ingress Controller` 指定跑 Master）。

- **扩展信息**
    - **命令**：`kubectl taint node <node> key=value:NoSchedule`（打污点）、`kubectl taint node <node> key:NoSchedule-`（移除污点）、`kubectl describe node`（看污点）。
    - **`Pod` 容忍写法**：`tolerations: [{key: gpu, operator: Equal, value: "true", effect: NoSchedule}]`（`Equal`/`Exists` 操作符、`tolerationSeconds` 对 `NoExecute` 的容忍时长）。
    - **`NoExecute` 与 `tolerationSeconds`**：容忍 `NoExecute` 污点时设 `tolerationSeconds`（容忍多久，到期驱逐）；无 `tolerationSeconds` 则一直容忍。
    - **参考**：`DaemonSet` 常配容忍（`toleration` 让它能跑在带污点的 Master 等）、`kubectl get nodes -o wide`（看污点/标签）。

## 🤔 PVC 和 PV 是什么？解决了什么问题？ 
- **`PV`（`PersistentVolume`）是集群里的存储资源（一块持久化存储，如 `NFS`/云盘/本地盘）；`PVC`（`PersistentVolumeClaim`）是用户对存储的申请单（要多大、哪种访问模式）。核心价值：把"存储的创建"和"应用使用存储"解耦——`Pod` 申请 `PVC`，`K8s` 自动绑定一个满足条件的 `PV`，应用不用关心存储具体在哪。核心：“PV 是存储，PVC 是申请，Pod 用 PVC 绑 PV”。**
    - **为什么需要（解决的问题）**
        - 普通 `Volume` 有局限：**`emptyDir`** 随 `Pod` 生灭（确切说：容器重启数据仍在，`Pod` 被移除才清空）；**`hostPath`** 数据持久（存宿主节点、删 Pod 数据仍在）但**绑定具体节点、不可跨节点移植**、`K8s` 不管理其生命周期。`PV`/`PVC` 引入**持久化 + 解耦**：存储独立于 `Pod` 存在、可由 `K8s` 管理，应用按需申请。
        - **解耦**：开发者只写 `PVC`（要多大存储），不用管到底用 `NFS` 还是云盘（那是运维配 `PV`/`StorageClass` 的事）——存储和业务分离。

    - **`PV`（集群存储资源，运维/管理员创建）**
        - 集群里的一块持久化存储（`capacity` 容量、`accessModes` 访问模式、`storageClassName`、挂载方式）；可由管理员**静态创建**或 `StorageClass` **动态供给**。
        - **访问模式**：`ReadWriteOnce`（单节点读写——同一节点可多 `Pod` 挂载，非仅一个）、`ReadOnlyMany`（多节点只读）、`ReadWriteMany`（多节点读写）。

    - **`PVC`（存储申请单，用户/应用创建）**
        - 用户声明**要多少存储**（`resources.requests.storage`）+ 访问模式，`Pod` 通过 `volumes` 引用 `PVC`——像"申请单"写明需求，`K8s` 帮它绑一个合适的 `PV`。

    - **`PVC` 绑定 `PV` 的过程**
        - `Pod` 引用 `PVC` → `K8s` 找一个**满足 `PVC` 条件**（容量够、访问模式匹配、`storageClass` 对应）的 `PV` 绑定 → `Pod` 用它挂载。`PVC` 先`Pending`（没找到合适 `PV`），绑定后 `Bound`。
        - 静态：管理员预建 `PV`；动态：`StorageClass` 自动创建 `PV`（现在主流）。

    - **一句话理解**
        - `PV` 像**仓库里的储物柜**（有容量/规格），`PVC` 像**领取单**（写“我要个 100G 的柜子”），`K8s` 按领取单匹配并分配一个空柜子给应用（`Pod`）用——你只管填单子（`PVC`），不用管柜子在哪个仓库、什么材质（那是 `PV` 的事）。

- **协助记忆**
    - 口诀：“**PV 是存储资源、PVC 是申请单、Pod 用 PVC 绑 PV——分层解耦，存储跟业务分开**”。
    - 一句话：“**PVC 填要多大，K8s 自动绑定合适的 PV，Pod 只管用**”。

- **进阶思考**
    - **`PVC` 一直 `Pending`（绑定不了 PV）最常见原因？**
        - ①没有满足条件的 `PV`（容量/访问模式/`storageClass` 不匹配）②`StorageClass` 动态供给没配置/没授权 ③存储后端不可用——`kubectl describe pvc` 看事件定位（`WaitForFirstConsumer`/`No storage class`）。
    - **`PV` 和 `PVC` 是 1:1 绑定吗？**
        - 是。一个 `PVC` 一次性绑定一个 `PV`（一对一），`PVC` 释放后 `PV` 可回收（`reclaimPolicy` 决定：`Retain` 保留/`Delete` 删除/`Recycle` 清理）；`PVC` 不能同时绑多个 `PV`。

- **扩展信息**
    - **`PV` 生命周期阶段**：`Available`（可用）→ `Bound`（已绑定 `PVC`）→ `Released`（`PVC` 释放）→ `Failed`（失败）。
    - **`reclaimPolicy`（回收策略）**：`Retain`（保留数据，人工回收）、`Delete`（删除 `PV` 及数据，`StorageClass` 默认）、`Recycle`（清空复用，已弃用）。
    - **`Pod` 引用**：`Pod` 的 `volumes` 配 `persistentVolumeClaim.claimName`（引用 `PVC`），`containers` 里 `volumeMounts` 挂载——`Pod` → `PVC` → `PV` 三层。
    - **参考**：`kubectl get pv/pvc`（查看）、`kubectl describe pvc`（看绑定状态/事件）、`StorageClass`（动态供给）。

## 🤔 StorageClass 是什么？ 
- **`StorageClass` 是存储类/存储动态供给的模板：定义“怎么动态创建 `PV`”——指定存储提供者（`provisioner`，如 `NFS`/`CSI`/云盘）、`reclaimPolicy` 回收策略、访问模式、参数。应用申请 `PVC` 时，`K8s` 按 `StorageClass` 自动创建对应的 `PV`（无需人工预建）。核心：“StorageClass 让存储按需动态供给——写 PVC 时自动生成 PV”。**
    - **解决什么问题**
        - 静态 `PV`：管理员**手动预建**每个 `PV`（麻烦、不灵活）；`StorageClass` 实现**动态供给**——`PVC` 声明要多大，`K8s` 按 `StorageClass` 模板**自动建 `PV` 并绑定**，存储按需、自动化。

    - **`StorageClass` 定义什么**
        - **`provisioner`**（供给者）：谁负责创建存储（`CSI` 驱动如 `ebs.csi.aws.com`/`rbd.csi.ceph.com`/`nfs-client` 外部供给）——真正创建存储的插件（注意 `kubernetes.io/aws-ebs` 等树内插件在 `v1.27` 已移除、`kubernetes.io/nfs` 非内置动态供给者）。
        - **`reclaimPolicy`**（回收策略）：`Delete`（删 `PV` 数据）/`Retain`（保留）——`PVC` 释放后怎么处理。
        - **`parameters`**：供给参数（如 `type: gp2` 云盘类型、`fsType` 文件系统）——传给 `provisioner` 的具体配置。
        - **`allowVolumeExpansion`**：是否允许扩容卷。

    - **工作原理（动态供给）**
        - ①用户创建 `PVC`（声明容量 + `storageClassName` 指定用哪个 `StorageClass`）②`K8s` 看见没人绑，调用该 `StorageClass` 的 `provisioner` **动态创建 `PV`**（如创建一个 `EBS`/`NFS` 卷）③`PVC` 自动绑定新 `PV`，`Pod` 可用——全程自动化。
        - **静态 vs 动态**：静态=管理员预建 `PV`（慢/要人管），动态=`StorageClass` 自动供给（主流，按需快速）。

    - **一句话理解**
        - `StorageClass` 像**仓库的“自动补货规则”**：写规则“缺 100G 就自动从 NFS 仓调 100G 过来”（`provisioner` 是供货商、`parameters` 是规格、`reclaimPolicy` 是退库政策）——应用下单（`PVC`），仓库按规则**自动补货**（动态 `PV`）。

- **协助记忆**
    - 口诀：“**StorageClass 是动态供给模板——provisioner 谁造存储、reclaimPolicy 回收、parameters 参数，PVC 指定它自动建 PV**”。
    - 一句话：“**StorageClass 让存储自动按需来——PVC 写需求，它自动造 PV**”。

- **进阶思考**
    - **默认 `StorageClass` 是什么？**
        - 集群可设一个**默认 `StorageClass`**（`storageclass.kubernetes.io/is-default-class: true`），`PVC` 不指定 `storageClassName` 时用它；云集群（`EKS`/`ACK`）默认有（如 `gp2`/`alicloud-disk`），裸机要自己装 `StorageClass`（如 `local-path`/`NFS`）。
    - **`PVC` 怎么选 `StorageClass`？**
        - `PVC` 的 `storageClassName: <xxx>` 指定用哪个 `StorageClass`；不指定则用默认。不同存储（SSD/HDD/本地盘）对应不同 `StorageClass`，`PV` 按需选。

- **扩展信息**
    - **常见 `StorageClass`**：`local-path`（本地路径，`k3s` 默认）、`NFS`、`AWS gp2/gp3`、`Ceph RBD`（`rbd.csi.ceph.com`）、`Alibaba cloud-disk`——按环境/存储后端配。
    - **`waitForFirstConsumer`**：`volumeBindingMode`——延迟到 `Pod` 调度到节点时才创建卷（解决多区域存储位置问题）。
    - **参考**：`kubectl get sc`（看 `StorageClass`）、`kubectl describe sc <name>`（看配置）、`PVC` 的 `storageClassName`。

## 🤔 PV 的生命周期是怎样的？ 
- **`PV` 生命周期四阶段：`Available`（可用，未被绑定）→ `Bound`（已被 `PVC` 绑定）→ `Released`（`PVC` 释放，但数据还在）→ `Failed`（异常/回收失败）。核心：“可用→绑定→释放→失败，回收策略决定释放后数据去留”。**
    - **四个阶段**
        - **`Available`**：`PV` 可用（空闲，还没被 `PVC` 绑定）。
        - **`Bound`**：`PV` 已绑定到某个 `PVC`（配对，一对一）——存储正被用。
        - **`Released`**：绑定的 `PVC` 被删除，`PV` 释放（数据还在），但**不能直接复用**——需人工按回收策略处理。
        - **`Failed`**：`PV` 自动回收失败/异常（如 `Delete` 失败），需要人工介入。

    - **`reclaimPolicy`（回收策略，关键）**
        - **`Delete`**：`PVC` 释放后，`PV` 及**底层数据一并删除**（动态 `StorageClass` 默认）——数据没了。
        - **`Retain`**：`PVC` 释放后**保留数据**，`PV` 变 `Released`，需**人工手动**删除/复用（数据可恢复，安全）。
        - **`Recycle`**：`PVC` 释放后清空数据供复用（已**弃用**，被 `Delete` 取代）。

    - **生命周期流程**
        - ①管理员/静态创建 `PV`（`Available`）或 `StorageClass` 动态供给 ②`PVC` 申请，`PV` 被绑定（`Bound`）③`Pod` 用它挂载 ④`PVC` 删除，`PV` 释放（`Released`）⑤按 `reclaimPolicy`：**`Delete`** 直接删除 `PV`（数据没了）；**`Retain`** 停在 `Released`（数据保留），需 **人工清理 `claimRef`** 后手动再绑定/重建，才回到 `Available`。

    - **一句话理解**
        - `PV` 生命周期 = “**储物柜的状态**”：空闲可用（`Available`）→ 租给某客户（`Bound`）→ 客户退租（`Released`）→ 按“退租政策”（`reclaimPolicy`）：`Delete` = 清空柜子给下家（数据删）、`Retain` = 柜子锁着等处理（数据保留）——柜子复用/作废全看退租政策。

- **协助记忆**
    - 口诀：“**Available→Bound→Released→Failed 四阶段；回收策略 Delete 删数据、Retain 保留、Recycle 弃用**”。
    - 一句话：“**PV 可用→绑定→释放，释放后按回收策略删数据还是保留**”。

- **进阶思考**
    - **`Retain` 释放后的 `PV` 怎么复用（怎么让新 PVC 用上）？**
        - `Retain` 后 `PV` 是 `Released`，需**人工手动**处理：①`kubectl delete pv <name>` 删除后重建同名 `PV`（数据在，重新 `Available`）②或改 `pv` 的 `claimRef` 让新 `PVC` 绑定——较繁琐，适合“数据要保留复用”场景。
    - **`Delete` 策略丢数据怎么办（哪些数据不能 Delete）？**
        - 重要数据/数据库卷别用 `Delete`（删 `PVC` 会连带删数据）；**关键存储**用 `Retain`（保留数据，人工处理），或确保有备份——`StorageClass` 的 `reclaimPolicy` 是“数据安全 vs 清理方便”的权衡，重要数据选 `Retain`。

- **扩展信息**
    - **`PV`/`PVC` 绑定关系**：一对一（`claimRef` 记录绑定的 `PVC`）；`PVC` 只能绑一个 `PV`。
    - **`volumeBindingMode`**：`Immediate`（立刻绑定）/`WaitForFirstConsumer`（`Pod` 调度到节点才绑，解决多区域位置）。
    - **参考**：`kubectl get pv`（看阶段/reclaimPolicy）、`kubectl describe pv`、`PVC` 删除看 `PV` 阶段变化。

## 🤔 CSI（容器存储接口）有什么作用？ 
- **`CSI`（Container Storage Interface）是容器与存储后端的标准接口：让 `K8s` 通过可插拔的 `CSI` 驱动接入各种存储（`NFS`/`Ceph`/云盘/本地盘），统一管理 `PV`/`PVC`/卷的创建、挂载、扩容、快照。核心价值：把存储接入标准化——一个 `CSI` 标准，对接存储厂商的驱动，`K8s` 不用为每种存储写专门插件。核心：“CSI 是存储驱动标准，`K8s` 用 CSI 插件接入任意存储”。**
    - **解决什么问题（为什么需要 CSI）**
        - 早期 `K8s` 每种存储要写**专门的 in-tree 插件**（`aws-ebs`/`gce-pd`/`nfs` 等硬编码进 `K8s` 代码）——存储一多就臃肿、难扩展。
        - **`CSI`（`v1.13` GA）**把存储接入**外置标准化**：存储厂商写一个 `CSI` 驱动（**out-of-tree，独立于 K8s 代码**），`K8s` 通过 `CSI` 接口调用它——**插件化、可扩展、存储厂商自己维护**。

    - **`CSI` 的作用/能力**
        - **动态供给**：通过 `StorageClass` 的 `provisioner`（`CSI` 驱动）自动创建/删除存储卷（`PV`）。
        - **卷管理与挂载**：`CSI` 驱动负责实际挂载/卸载、`Mount`/`NodeStage`/`NodePublish` 等存储操作——`K8s` 把卷操作委托给 `CSI` 驱动。
        - **卷的扩容/快照**：`CSI` 支持**在线扩容**（`volumeExpansion`）、**卷快照**（`snapshot`，`v1.20` GA）、`Resize`——比老插件强大。
        - **拓扑感知（`CSINode`）**：`CSI` 支持多区域/节点拓扑感知，让卷有位置感知（`CSINode`）。
        - **访问模式**：`ReadWriteOncePod`（单 Pod 读写）等；`VolumeAttributesClass` 是可变卷属性（`v1.29` alpha、`v1.34` GA），与拓扑无关。

    - **`CSI` 架构（组件）**
        - **`External Provisioner`**：监听 `PVC`，调用 `CSI` 驱动创建/删除卷（动态供给）。
        - **`External Attacher`**：把卷附加到节点（`Attach/Detach`）；**`External Resizer`**（扩容）、**`External Snapshotter`**（快照）——这些 sidecar 实现扩容/快照能力。
        - **`CSI 驱动`**：存储厂商的插件（`rbd.csi.ceph.com`/`ebs.csi.aws.com`/`hostpath`），**实现** `CSI` 接口（`CreateVolume`/`DeleteVolume`/`ControllerPublishVolume` 等 `GRPC` 方法）。
        - **CSI 驱动的 Node 服务**：CSI 驱动在**每个节点**跑的 `DaemonSet`（`NodeStage`/`NodePublish` 做挂载/卸载），配合 `kubelet`——注意没有独立叫“CSI Node”的组件，是驱动自带的节点端服务。

    - **一句话理解**
        - `CSI` 像**USB 接口标准**——不管硬盘/摄像头/打印机（各种存储后端），只要符合 `USB` 标准（`CSI` 接口），都能插上用；存储厂商（`CSI` 驱动）按标准做个“转接头”，`K8s`（电脑）统一认出并管理。**标准化 + 可插拔**。

- **协助记忆**
    - 口诀：“**CSI 是存储驱动标准——provisioner 动态供给/挂载/扩容/快照，存储厂商写 CSI 驱动，K8s 统一接入**”。
    - 一句话：“**CSI 把存储接入标准化，K8s 用 CSI 插件对接任意存储**”。

- **进阶思考**
    - **`CSI` 和 `StorageClass` 什么关系？**
        - `StorageClass` 的 `provisioner` 就指向一个 **`CSI` 驱动**（如 `ebs.csi.aws.com`）——`StorageClass` 是“配置/参数”，`CSI` 是“真正干活的能力”。写 `PVC` 指定 `StorageClass` → 用它的 `provisioner`（`CSI` 驱动）动态造存储。
    - **为什么要用 `CSI` 而不是旧 in-tree 插件？**
        - ①**可扩展**：存储厂商独立开发 `CSI` 驱动（不用改 `K8s` 核心）②**功能全**：`CSI` 支持动态供给/扩容/快照/拓扑 ③**解耦**：`K8s` 核心不臃肿、新存储快速接入。旧 in-tree 插件（如 `aws-ebs`）已在 `v1.27` 移除，迁移到 `CSI`。

- **扩展信息**
    - **常见 `CSI` 驱动**：`rbd.csi.ceph.com`（`Ceph`）、`ebs.csi.aws.com`（AWS）、`disk.csi.alibabacloud.com`（阿里）、`hostpath.csi.k8s.io`（本地）、`nfs.csi.k8s.io`（`NFS`）。
    - **`CSI` 卷操作**：`CreateVolume`/`DeleteVolume`（动态供给）、`ControllerPublishVolume`（附加节点）、`NodeStageVolume`/`NodePublishVolume`（挂载）、`CreateSnapshot`/`DeleteSnapshot`（快照）。
    - **参考**：`kubectl get csinodes`（节点 `CSI`）、`kubectl get storageclass`（看 `provisioner` 指向 `CSI` 驱动）、`kubectl get pvc`。

## 🤔 误删除 PVC，怎么恢复？ 
- **误删 `PVC` 的恢复思路：①删 PVC 通常不会删底层数据（除非 `reclaimPolicy` 是 `Delete`——动态供给默认，静态 `PV` 显式配 `Delete` 同样生效）②若 `PV` 是 `Released`/`Retain` 状态或数据还在，重建 `PVC` 重新绑定或手动重建 `PV`（`claimRef` 指向新 PVC） ③有快照/备份则从存储层恢复 ④`PV` 一旦 `Delete` 删了数据，只能靠存储端快照/备份恢复（K8s 层救不回）。核心：“删 PVC 数据未必丢——Retain 保留可重建绑定，Delete 删了数据只能靠快照/备份”。**
    - **先确认数据还在吗（关键）**
        - **`kubectl get pv <name>`** 看那个 `PV` 的状态：如果 `PV` 还在（`Released`/`Retain`）→ 数据没删，可恢复；如果 `PV` 已被 `Delete`（不在了）→ 底层存储被删，K8s 层救不回。
        - **`reclaimPolicy`**：`Retain`（数据保留）、`Delete`（数据删除，`StorageClass` 默认）、`Recycle`（已弃用）。

    - **恢复方式 1：重建 `PVC` 重新绑定（若 PV 还在/Retain）**
        - `PV` 状态 `Retain`（数据在）：重建一个 **`PVC`**（字段匹配）让它绑定原 `PV`；注意 `Released` 的 `PV` **不会被新 `PVC` 自动绑定**，需先把原 `Released` 的 `PV` **清空 `claimRef` 变为 `Available`**，新 `PVC` 才能在 `Available` 的 `PV` 里匹配绑定。
        - 若 `PV` 是 `Released`（`claimRef` 还指向已删 `PVC`）：需**手动清理 `claimRef`**（`kubectl patch pv <name> -p '{"spec":{"claimRef":null}}'`）让 `PV` 回到 `Available`，新 `PVC` 就能绑上。

    - **恢复方式 2：快照/备份恢复（数据被删/要回滚）**
        - `PVC`/数据被删且无保留：用**存储层快照**（`CSI` `VolumeSnapshot`）或**备份**恢复——`kubectl` 从 `snapshot` 恢复：`PVC` 的 `dataSource: {name: <snap>, kind: VolumeSnapshot}` 或从备份还原。
        - 前提：**平时有做快照/备份**（`VolumeSnapshotClass`/备份工具）——这是数据安全底线。

    - **恢复方式 3：同名重建（仅重建空卷，数据不可恢复）**
        - 若 `PVC` 被删但 `PV` 是动态供给的 `Delete` 策略，数据可能已删——只能靠快照/备份恢复，或接受数据丢失（警示：**重要数据别用 `Delete` 策略**）。

    - **一句话理解**
        - 误删 `PVC` 像“**退了房但行李还在不在**”：退房（删 `PVC`）不一定丢行李——`Retain`（行李放那等着）能回去拿（重建绑定）；`Delete`（行李已清理）就只能靠之前的存包/拍照（快照/备份）。**关键是看退租政策（reclaimPolicy）和有没有备份**。

- **协助记忆**
    - 口诀：“**删 PVC 未必丢数据——Retain 保留可重建绑定（清 claimRef 回 Available），Delete 删了数据只能靠快照/备份恢复**”。
    - 一句话：“**误删 PVC 先看 PV 在不在——Retain 能救、Delete 靠快照、重要数据别用 Delete**”。

- **进阶思考**
    - **为什么删 `PVC` 不删 `PV`？**
        - `PVC` 是“申请单”，删它只是**释放绑定**；`PV`（真实存储）在不在取决于 `reclaimPolicy`——`Retain` 保留 PV（数据在）、`Delete` 删除 PV（数据删）。所以删 `PVC` 前先看 `PV` 的回收策略。
    - **什么场景最容易误删 `PVC` 且难恢复？**
        - **动态供给 + `Delete` 策略**（主流 `StorageClass` 默认 `Delete`）——删 `PVC` 连 `PV` 带数据一起删，无快照就丢数据。**重要数据/数据库卷应改 `Retain`** 或定期快照备份。

- **扩展信息**
    - **`claimRef` 清理**：`kubectl patch pv <name> -p '{"spec":{"claimRef":null}}'` 让 `Released` 的 `PV` 回到 `Available`（可被新 `PVC` 绑定）。
    - **`VolumeSnapshot`**：`CSI` 卷快照（`v1.20` GA），`PVC` 的 `dataSource: {kind: VolumeSnapshot, name: <snap>}` 从快照恢复——防误删的利器。
    - **预防**：重要存储用 `Retain` 策略、定期快照/备份、开启 `PVC` 保护（`kubernetes.io/pvc-protection` 终结器，删 `PVC` 前等 `Pod` 释放卷）、权限控制（防误删）。
    - **参考**：`kubectl get pv`（状态/reclaimPolicy）、`kubectl get volumesnapshot`、`kubectl patch pv`（清 claimRef）。

## 🤔 emptyDir 和 hostPath 卷的应用场景？ 
- **`emptyDir`（空目录卷）随 `Pod` 生灭、`Pod` 内容器共享；`hostPath`（主机路径卷）直接挂宿主节点目录、数据持久绑定节点。应用场景：`emptyDir` 适合同 Pod 内容器共享/临时缓存（如日志暂存、`sidecar` 共享数据）；`hostPath` 适合访问宿主机特定文件/目录（如读宿主机配置、日志、让容器跑在指定宿主机存储）。核心：“emptyDir 临时共享、hostPath 宿主机数据——前者随 Pod、后者绑节点”。**
    - **`emptyDir`（空目录卷，临时）**
        - **机制**：`Pod` 创建时分配一个**空目录**，`Pod` 内多个容器**共享**（同卷挂载）；`Pod` 删除（或被调度到别处）时**目录清空删除**（数据不持久；容器重启数据仍在）。
        - **特点**：随 `Pod` 生灭、同 `Pod` 多容器共享、无需 `PV`/`StorageClass`、默认空目录（可选 `emptyDir.medium: Memory` 用内存）。
        - **应用场景**：①`Pod` 内多个容器**共享数据**（如 web 容器 + 日志采集 `sidecar` 共享日志文件、业务 + 上传临时文件）②**临时缓存/中间数据**（短生命周期的 `Pod`，如批处理任务中间态）③`sidecar` 模式共享配置/临时文件。

    - **`hostPath`（主机路径卷，宿主机目录）**
        - **机制**：把宿主节点上的**指定目录/文件**挂载到容器——直接访问宿主机存储（如 `/var/log`、`/data`）。
        - **特点**：数据**持久**（存宿主节点、删 Pod 数据仍在）、**绑定具体节点**（不可跨节点迁移）、`K8s` 不管理生命周期、能访问宿主机目录（有安全考虑）。
        - **应用场景**：①容器要**读写宿主机特定文件**（如访问 `/etc` 配置、宿主机日志）②**`DaemonSet` 采集宿主日志**（`hostPath` 挂 `/var/log` 给容器）③单节点存储/测试（不跨节点）。

    - **区别与应用选型**
        - `emptyDir`：**临时/共享**（`Pod` 内、随 `Pod` 生命）、轻量；`hostPath`：**宿主机持久/特定文件**（绑节点、数据留宿主）。生产持久化/跨节点用 `PV/PVC` 或 `CSI`；`emptyDir`/`hostPath` 是基础卷。

    - **一句话理解**
        - `emptyDir` 像“**同屋室友共用的小白板**”——住一起（同 `Pod`）多人用，搬走（`Pod` 删除）就擦掉重来（临时）；`hostPath` 像“**家里固定墙上的储物柜**”——数据在自家（宿主节点）留着，但墙是固定的（绑节点，搬家（换节点）柜子带不走）。`PV` 是“**外面租的保险柜**”（独立持久、可移动），即专门持久化。

- **协助记忆**
    - 口诀：“**emptyDir 临时共享（随 Pod 生灭）、hostPath 宿主机数据（绑节点持久）——要持久跨节点用 PV/PVC**”。
    - 一句话：“**临时同 Pod 共享用 emptyDir、访问宿主机文件用 hostPath、生产持久化用 PV**”。

- **进阶思考**
    - **为什么 `hostPath` 生产要慎用？**
        - ①**绑节点**：`Pod` 被调度到别的节点，`hostPath` 数据不在那（丢/错位）②**安全**：容器能访问宿主机目录（权限/逃逸风险）③`K8s` 不管理、难备份/迁移——所以生产持久化多用 `PV/PVC`（`CSI`/`NFS`），`hostPath` 只在特定场景（如日志采集、跨节点无关的 `DaemonSet`）。
    - **`emptyDir` 能共享宿主机内存加速吗？**
        - 能：`emptyDir.medium: Memory` 用**节点内存**做卷（快、临时），适合高速缓存；数据在内存（`Pod` 删除即失；`Memory` 介质在**节点重启**时也丢失——`RAM`，但容器重启仍在），占节点内存，适合轻量暂存非持久化场景。

- **扩展信息**
    - **`emptyDir` 与 `sidecar`**：`sidecar` 容器（日志采集/代理）与主容器共享 `emptyDir`（同一卷）传数据——`K8s sidecar` 模式常用。
    - **`subPath`**：挂载卷的子目录（`mountPath` 映射卷内的子路径），`emptyDir`/`hostPath` 都可配。
    - **参考**：`Pod` YAML 的 `volumes`（`emptyDir`/`hostPath`）+ `volumeMounts`（挂载）；`kubectl exec` 进容器看挂载。

## 🤔 Secret 有哪些应用场景？ 
- **`Secret` 是 K8s 存敏感信息（密码/令牌/密钥/证书）的对象，用 base64 编码存储、可注入到 `Pod` 使用。应用场景：①存凭据（数据库密码/API Token）②存 `TLS` 证书（`HTTPS`）③存镜像拉取凭证（私有仓库 `dockerconfigjson`）④存 `SSH` 密钥/配置。核心：“Secret 存秘密，注入 Pod，避免硬编码在镜像/配置里”。**
    - **什么是 `Secret`**
        - `K8s` 对象，存敏感数据（键值对），值是 **base64 编码**（注意：base64 非加密，只是编码——真正安全靠 `RBAC` 权限 + 集群机制如加密 `etcd`）；`Pod` 通过挂载卷/环境变量引用。
        - 与 `ConfigMap` 对比：`ConfigMap` 存**非敏感**配置（普通配置），`Secret` 存**敏感**数据。

    - **`Secret` 类型与应用场景**
        - **`Opaque`（通用）**：存任意敏感键值——如**数据库密码/`API Key`/服务令牌**，最常用。
        - **`kubernetes.io/tls`**：存 `TLS` 证书（`tls.crt`/`tls.key`）——给 `Ingress`/`HTTPS` 服务引用（`K8s` 不自动生成证书，只存放用户提供的证书/私钥；自动签发要 `cert-manager`）。
        - **`kubernetes.io/dockerconfigjson`**：存**镜像仓库凭据**（`docker login` 的 `config.json`）——`Pod` 拉私有镜像时 `imagePullSecrets` 引用。
        - **`kubernetes.io/basic-auth`**：`Basic Auth` 用户名/密码（`HTTP` 基本认证）。
        - **`kubernetes.io/ssh-auth`**：`SSH` 私钥（`Git` 拉取等）。
        - **`ServiceAccount` 令牌**：`SA` 凭证（旧版 `kubernetes.io/service-account-token` Secret 已弃用；新版由 `TokenRequest`/投影卷按需签发）。

    - **`Pod` 怎么用 `Secret`（注入方式）**
        - **① 环境变量**：`env.valueFrom.secretKeyRef` 把 `Secret` 的值作为环境变量——应用到 `Pod`。
        - **② 挂载卷**：`volumes` 里 `secret.secretName` + `volumeMounts`，把 `Secret` 挂成**文件**（`/etc/secret/`）——应用读文件，更新 `Secret` 挂载自动刷新。
        - **③ `imagePullSecrets`**：拉私有镜像时引用 `dockerconfigjson` 类型 `Secret`。

    - **一句话理解**
        - `Secret` 像**保险柜里的密码本**——敏感信息（数据库密码/证书/镜像密钥）锁在“保险柜”（`Secret`），应用要用时从保险柜取（环境变量/挂载文件），**不直接写在镜像/代码/**，管理集中、可权限控制。

- **协助记忆**
    - 口诀：“**Secret 存敏感（密码/证书/镜像凭据），base64 编码非加密，注入 Pod 用环境变量或挂载，权限管控**”。
    - 一句话：“**敏感信息别硬编码，放 Secret——密码、证书、仓库凭据都归它**”。

- **进阶思考**
    - **`Secret` 是 base64 编码，安全吗？**
        - base64 **只是编码不是加密**——能被解码；真正的安全靠：**①`RBAC` 权限控制**（谁有权限看/用 `Secret`）②`etcd` `Secret` 加密（`kube-apiserver` 的 `--encryption-provider-config` 静态加密 `etcd` 里的 `Secret`）③最小使用。裸集群要配 `etcd` 加密，`Secret` 才真正保密。
    - **`ConfigMap` 和 `Secret` 什么时候用哪个？**
        - 非敏感配置（`app.yaml`/`server.conf`）→ `ConfigMap`（明文、易读）；敏感（密码/`Token`/证书）→ `Secret`（base64 + 权限 + 可加密）——敏感数据**必须** `Secret`，普通配置用 `ConfigMap`。

- **扩展信息**
    - **`Secret` 最小权限**：`RBAC` 控制谁可 `get`/`watch` `Secret`（不给普通用户/`Pod` 过多访问）。`Secret` 对象默认存 `etcd`（需配 `etcd` 加密）；作 `volume` 挂载时才以 `tmpfs` 落在节点内存。`secrets-store` 是外部密钥库 `CSI` 集成，与 `Secret` 是否落 `etcd` 是两回事。
    - **`SOPS`/`External Secrets`**：`Secret` 的敏感来源可用外部管理（`External Secrets Operator` 从 `Vault`/`AWS Secrets Manager` 同步 `Secret`）——云原生安全趋势。
    - **参考**：`kubectl create secret`（创建）、`kubectl get secret`、`kubectl describe secret`、`Pod` YAML 的 `env`/`volumes`/`imagePullSecrets`。

## 🤔 RBAC 中 Role 和 ClusterRole 区别？ 
- **`Role`（角色，命名空间级）：在某个命名空间内授权（只能管那个 `Namespace` 的资源）；`ClusterRole`（集群角色，集群级）：在整个集群授权（所有 `Namespace`/集群级资源）。核心区别：作用范围——Role 限一个 Namespace，ClusterRole 全集群。RoleBinding 绑 Role（限命名空间），ClusterRoleBinding 绑 ClusterRole（全集群）。**
    - **`Role`（命名空间级角色）**
        - 定义在**某个 `Namespace`**，只能在**那个命名空间**内授权（`get`/`list`/`create` 该 `Namespace` 的 `Pod`/`Deployment` 等资源）。
        - **`RoleBinding`** 绑定 `Role`（`RoleBinding` 也限命名空间）——授权只在那个 `Namespace` 生效。
        - **适用**：按命名空间隔离授权（如 `dev` 用户只能管 `dev` 命名空间、`ops` 只能管 `prod`）。

    - **`ClusterRole`（集群级角色）**
        - **不限命名空间**，可对整个集群授权：**集群级资源**（`Node`/`PersistentVolume`/`Namespace`）、**所有命名空间**的资源、非资源端点（`/healthz` 等）。
        - **`ClusterRoleBinding`** 绑定 `ClusterRole`——全集群生效；也可用 `RoleBinding` 绑 `ClusterRole`（把集群角色“收窄”到某命名空间）。
        - **适用**：管理员/全局授权（管整个集群、所有命名空间）、访问集群级资源（`Node`/`PV`）。

    - **绑定关系（4 种组合）**
        - **`Role` + `RoleBinding`**：命名空间级授权（最常用，按命名空间隔离）。
        - **`ClusterRole` + `ClusterRoleBinding`**：集群级授权（管理员/全局）。
        - **`ClusterRole` + `RoleBinding`（同命名空间）**：把集群角色**收窄**到某命名空间（如给 `dev` 命名空间绑只读 `ClusterRole`）。
        - **`Role` + `ClusterRoleBinding`**：**不合法**（`Role` 是命名空间级，不能绑集群级绑定）。

    - **一句话理解**
        - `Role` 像“**大堂经理**”（只管这一层——命名空间）；`ClusterRole` 像“**物业总部经理**”（管整栋楼——全集群）。`RoleBinding` 是“聘书”（人事任命限一层），`ClusterRoleBinding` 是“总部任命”（全楼）。

- **协助记忆**
    - 口诀：“**Role 管一个 Namespace、ClusterRole 管全集群；RoleBinding 绑 Role（限命名空间）、ClusterRoleBinding 绑 ClusterRole（全集群）；ClusterRole+RoleBinding 可收窄**”。
    - 一句话：“**Role 限命名空间、ClusterRole 全集群——按范围选绑定**”。

- **进阶思考**
    - **什么时候用 `ClusterRole` 而不是 `Role`？**
        - ①要管**集群级资源**（`Node`/`PV`/`Namespace`——这些只在集群级）②要管**所有命名空间**的资源 ③给管理员/角色全局权限。只管**某个命名空间**内普通资源 → 用 `Role`（最小权限、隔离好）。
    - **`ClusterRole` 用 `RoleBinding` 绑定是什么场景？**
        - 想用一个**现有的集群角色**（如只读 `view`）但只给**某个命名空间**授权——`RoleBinding` 在 `dev` 命名空间绑 `ClusterRole view`，用户只在 `dev` 有 `view` 权限、其他 `Namespace` 没有——“复用集群角色、收窄到命名空间”。

- **扩展信息**
    - **内置 `ClusterRole`**：`admin`（命名空间内全权，非集群级）、`edit`（可读写）、`view`（只读）、`cluster-admin`（集群管理员全部权限）——内置常用。
    - **`RoleBinding`/`ClusterRoleBinding` 绑定对象**：可绑 `User`（用户）、`Group`（组）、`ServiceAccount`（服务账号）——`Subject` 决定谁获得权限。
    - **参考**：`kubectl get role/clusterrole`、`kubectl get rolebinding/clusterrolebinding`、`kubectl describe role`。

## 🤔 RBAC 中 ServiceAccount 有什么作用？ 
- **`ServiceAccount`（`SA`，服务账号）是给“非人类身份”（`Pod`/应用/系统）用的账号，让 `Pod` 有身份去访问 `K8s` API（认证 + 授权）。核心作用：①给 `Pod` 提供访问集群 API 的身份 ②配合 `RBAC` 给 `Pod` 最小权限（只给它需要的）③承载令牌/Secret 供 `Pod` 调用 API。核心：“SA 是 Pod 的身份——用它 + RBAC 给 Pod 最小访问权限”。**
    - **什么是 `ServiceAccount`**
        - 与 `User`（人类用户）相对，`SA` 是**程序/`Pod`** 的身份——`Pod` 用它去认证 `K8s` API（而不是人类登录）。
        - 每个 `Pod` 默认关联一个 `SA`（`default`）；`SA` 的**服务账号令牌**作凭证（注意 `K8s 1.24` 起 `default SA` 不再自动创建 `service-account-token` `Secret`，凭证改由**投影卷**（`TokenRequest`）提供）。

    - **`ServiceAccount` 的作用**
        - **① `Pod` 访问集群 API 的身份**：`Pod` 用 `SA` 的**令牌**去调用 `K8s` API（如读 `Pod` 状态、创建资源）——`Pod` 有身份（`SA`）才能认证。
        - **② 配合 `RBAC` 最小权限**：`SA` 绑定 `Role`/`ClusterRole`（`RoleBinding`），给 `Pod` **只需要的权限**——`Pod` 只能访问授权范围（最小权限、安全）。
        - **③ 自动挂载令牌**：`Pod` 自动挂 `SA` 的 `service-account-token` 卷（到 `/var/run/secrets/kubernetes.io/serviceaccount/`），应用读令牌访问 API。
        - **④ 镜像拉取/外部认证**：`SA` 可关联 `imagePullSecrets`（拉私有镜像）、`Pod` 对外身份。

    - **`ServiceAccount` 与 `RBAC` 关系**
        - `SA` 是**身份**（Who），`Role`/`ClusterRole` 是**权限**（What），`RoleBinding`**绑定**——`SA` + `RBAC` 组合给 `Pod` 精确授权（如“只有 `prometheus` SA 能查 `Pod`/`Node`”）。
        - 生产常给不同 `Pod` 用**不同 `SA`**（不是全用 `default`）——最小权限、隔离。

    - **一句话理解**
        - `SA` 像“**机器人的工作证**”——机器人（`Pod`）干活前要有工作证（`SA`），证上写明能进哪些门（`RoleBinding` 绑定权限）；不给工作证（用默认 `SA`）或许可范围大，就像机器人乱闯（安全差）。给每个机器人（`Pod`）合适的证（最小权限 `SA`）才安全。

- **协助记忆**
    - 口诀：“**SA 是 Pod 身份——+RBAC 给最小权限，令牌自动挂载、Pod 凭它访问 API**”。
    - 一句话：“**ServiceAccount 是 Pod 的工作证，配 RBAC 只给它该有的权限**”。

- **进阶思考**
    - **为什么不用默认 `default` SA（每 Pod 一个专门 SA）？**
        - `default` SA 权限/审计不清晰、所有 `Pod` 用同一个（隔离差）；**专门 SA** 让每个 `Pod` 有独立身份 + 最小权限（如 `prometheus` 只读监控、`deploy` 只改 `Deployment`）——**最小权限、可审计、安全**（生产最佳实践）。
    - **`SA` 认证怎么做的（token 是啥）？**
        - `SA` 关联 **`ServiceAccount` 令牌**（`JWT`），`Pod` 挂载令牌卷，调用 API 时带 `Bearer token`——`kube-apiserver` 用 `TokenAuthentication` 验证 `SA` 身份；新版用**绑定的 `ServiceAccount` 令牌**（`TokenRequest`/投影卷，`v1.20` beta、`v1.22` 起 GA）。

- **扩展信息**
    - **自动挂载控制**：`automountServiceAccountToken: false`（某些 `Pod` 不需访问 API，关自动挂载——安全）。
    - **`SA` 令牌类型**：长期 `Secret` 令牌（旧）/`TokenRequest` 投影令牌（新，短时、`audience` 限定——更安全）。
    - **参考**：`kubectl get serviceaccount`、`kubectl create sa`、`Pod` 的 `spec.serviceAccountName`、`RoleBinding` 绑定 `ServiceAccount`。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-k8s%E5%AE%B9%E5%99%A8.1/  

