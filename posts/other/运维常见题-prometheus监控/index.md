# 运维常见题-Prometheus监控


## 🤔 Prometheus 有哪些核心组件及其作用？  
- **Prometheus 核心组件：①`Prometheus Server`（主服务：抓取/存储/查询/告警规则）②`exporter`（指标采集器）③`Pushgateway`（短任务指标汇聚）④`Alertmanager`（告警处理）⑤`Service Discovery`（服务发现）+ 可视化（`Grafana`）。核心是拉取（Pull）模型：Server 主动从 exporter 拉取指标。**  
    - **`Prometheus Server`（主服务）**
        - **指标抓取（Scraping）**：按间隔（`scrape_interval`）从 exporter 拉取指标
        - **存储**：时序数据库（TSDB），本地磁盘存储指标
        - **查询**：`PromQL` 查询语言、`promtool` 工具
        - **告警规则**：内置规则评估（`rules`），产生告警发送给 Alertmanager
        - 核心：`retrieval`（抓取）、`TSDB`（存储）、`promql`（查询）、`rule engine`（规则）

    - **`Exporter`（采集器）**
        - 运行在被监控目标上，把指标暴露成 HTTP 端点（`/metrics`）
        - 常见：`node_exporter`（主机）、`mysqld_exporter`、`nginx_exporter`、`blackbox_exporter` 等
        - `Server` 通过 `HTTP` 拉取 `exporter` 暴露的指标

    - **`Pushgateway`（推送网关）**
        - 用于"短生命周期任务"（批处理/定时任务）推送指标（因任务结束时 `exporter` 已消亡，无法被 `Pull`）
        - 任务执行时把指标 `Push` 到 `Pushgateway`，`Prometheus` 再拉取

    - **`Alertmanager`（告警管理）**
        - 接收 Prometheus 推送的告警，做去重、分组、抑制、静默
        - 通知到多种渠道（邮箱/钉钉/企业微信/Slack）

    - **`Service Discovery`（服务发现）**
        - 自动发现采集目标（文件、`Consul`、`K8s`、云），替代手工配置目标
        - 配合 `relabel_configs` 动态筛选目标

    - **`Grafana`（可视化，生态组件）**
        - 数据可视化面板（非 `Prometheus` 自带，常搭配使用）
        - 通过 `Prometheus` 数据源展示监控图表

- **协助记忆**
    - 核心四件套："`Server`（抓存储查）+ `exporter`（采集）+ `Alertmanager`（告警）+ `Pushgateway`（短任务）"。
    - 数据流："`exporter` 暴露 /`metrics` → `Server` 拉取 → `TSDB` 存储 → `PromQL` 查询/规则 → `Alertmanager` 告警 → `Grafana` 展示"。

- **进阶思考**
    - **为什么 `Pushgateway` 是"补丁"而不是主流？**
        - `Prometheus` 设计是 `Pull` 模型（`Server` 知道目标、可控制抓取）。`Pushgateway` 是给"无法被 `Pull`"的短任务（批处理）用的：任务结束进程就没了，无法被拉。但 `Pushgateway` 也引入风险（`Single Point`、指标 `TTL`）：任务挂了指标还在（陈旧），需注意清理。
    - **`Exporter` 和被监控对象是什么关系？**
        - `Exporter` 是"翻译官"：把被监控对象的信息（系统状态/应用指标）翻译成 `Prometheus` 能理解的 `/metrics` 格式。被监控对象自身的监控数据格式五花八门，`exporter` 统一转成 `Prometheus` 指标格式。
    - **Alertmanager 和 Prometheus 的告警分工？**
        - `Prometheus` 负责"评估规则"（指标值触发阈值 → 生成告警）；`Alertmanager` 负责"告警处理"（去重/分组/通知渠道）。告警从 `Prometheus` 发往 `Alertmanager`，由 `Alertmanager` 统一管理和发送。

- **扩展信息**
    - **架构示意图**：
        ```
        目标(Exporter) → Prometheus Server → Alertmanager → 通知渠道
                               ↓
                         TSDB → PromQL → Grafana
        ```
    - **核心内部模块**：`retrieval`（抓取）、`tsdb`（存储）、`promql`（查询）、`rule`（规则）、`discovery`（发现）、`notifier`（通知）

## 🤔 Prometheus 有哪些数据指标类型及其应用场景？  
- **`Prometheus` 4 种指标类型：`Counter`（计数器，只增不减）、`Gauge`（仪表盘，可增减）、`Histogram`（直方图，分布统计）、`Summary`（摘要，分位数）。应用：`Counter` 看累计量（请求数/错误数），`Gauge` 看当前值（CPU/连接数），`Histogram`/`Summary` 看延迟分布（P99 等）。**  
    - **Counter（计数器）**
        - 特点：只增不减（重启归零），累计值
        - 适用：请求总数、错误数、字节数（累计型指标）
        - 查询：用 `rate()` 算速率（每秒增量）
        - 例子：`http_requests_total`、`process_cpu_seconds_total`

    - **Gauge（仪表盘）**
        - 特点：可增可减，反映当前值（瞬时值）
        - 适用：CPU 使用率、内存使用、连接数、温度（状态型指标）
        - 查询：直接取值，可用 `min/max/avg` 聚合
        - 例子：`node_load1`（负载）、`node_memory_MemFree_bytes`、`node_network_up`

    - **Histogram（直方图）**
        - 特点：累积桶（bucket）统计分布（如 ≤0.1s 多少、≤0.5s 多少），可算分位数（`histogram_quantile`）
        - 适用：请求延迟分布、响应大小分布
        - 查询：`histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` 算 P99
        - 例子：`http_request_duration_seconds_bucket`、`_sum`、`_count`

    - **Summary（摘要）**
        - 特点：客户端算好的分位数（`φ` 分位数直接暴露），适合已知分位的场景
        - 适用：服务端算好的延迟分位数（如 `{quantile="0.99"}`）
        - 与 Histogram 区别：Summary 客户端计算分位（不可聚合）；Histogram 服务端算（可聚合，支持多标签维度）
        - 例子：`http_request_duration_seconds{quantile="0.99"}`

    - **选型（何时用哪种）**
        | 指标 | 特点 | 典型场景 |
        |------|------|---------|
        | `Counter` | 只增（累计） | 请求数/错误数 |
        | `Gauge` | 可增可减（瞬时） | CPU/内存/连接数 |
        | `Histogram` | 桶分布（可聚合分位） | 延迟分布（推荐） |
        | `Summary` | 客户端分位（不可聚合） | 已知分位的延迟 |

- **协助记忆**
    - 四类型口诀："`Counter` 计数（只增）、`Gauge` 仪表（可变）、`Histogram` 分桶、`Summary` 摘要"。
    - 延迟首选 Histogram（可聚合/多维度），旧系统用 `Summary`。

- **进阶思考**
    - **Histogram 和 Summary 怎么选？**
        - 需要"多标签/聚合分位数"（如按服务、按 URL 分别算 P99）用 `Histogram`（分位在 `Prometheus` 侧算，可聚合）；只需"单值分位"（固定 0.5/0.9/0.99）且不想存太多桶用 `Summary`（客户端算好）。现代推荐 `Histogram`（更灵活）。
    - **Counter 为什么常用 `rate()` 看？**
        - `Counter` 是累计值（无限增长），看"速率"更有意义（`rate()` 转每秒增量 = QPS）。但绝对值也能用（如 `increase()` 看区间增量、累计总量对比），并非只有 rate 一种用法。
    - **Gauge 可以算速率吗？**
        - 可以但语义不同：`Gauge` 是瞬时值，`rate()` 也能算变化速率（但更适合用 `delta`）。`Counter` 适合 `rate`（累计派生速率），`Gauge` 直接看当前值或变化量。

- **扩展信息**
    - **指标命名规范**：`<类型>_<单位>_<描述>`（如 `http_requests_total`）、`_total` 后缀（Counter）、`_bucket`/`_sum`/`_count`（`Histogram`）
    - **相关函数**：`rate()`、`irate()`、`increase()（Counter）`；`histogram_quantile()（Histogram）`；`min/max/avg（Gauge）`

## 🤔 Prometheus 支持哪些服务发现方式？  
- **Prometheus 服务发现（Service Discovery）用于自动发现采集目标：支持文件（`file_sd`）、`Consul`、`Kubernetes`、云（`AWS`/Azure/GCP）、DNS（`dns_sd`）、`EC2`、`K8s` 等。核心价值：动态环境（容器/云）中目标自动变化，无需手工维护 target 列表。**  
    - **服务发现方式列表**
        - **文件发现（`file_sd`）**：从文件中动态读目标列表（简单通用，可与 CMDB/脚本结合）
        - **`Kubernetes` 发现（`kubernetes_sd`）**：按 Pod/Service/Ingress/Node/Endpoint 发现 K8s 目标（云原生核心）
        - **`Consul` 发现（`consul_sd`）**：从 Consul 读取服务注册信息
        - **云发现**：`ec2_sd`（AWS）、Azure、GCP——按云实例发现
        - **DNS 发现（`dns_sd`）**：通过 DNS 记录（SRV/A/AAAA）发现
        - 其他：`Consul`、`Eureka`、`Zookeeper`/`Mesos`（注：`zookeeper_sd`/`mesos_sd` 在 Prometheus 3.0 已移除，仅 2.x 可用）

    - **为什么服务发现重要（场景）**
        - **动态环境**：K8s 里 Pod 频繁创建/销毁（伸缩/发布），IP 变化——手工配置不可能
        - **大规模**：上千台主机，手工维护 target 不可行
        - **自动化**：新实例自动纳入监控，销毁自动移除
        - **配合 relabel**：服务发现找到目标后，用 relabel 打标签/筛选

    - **K8s 服务发现（最常见的一种）**
        ```yaml
        scrape_configs:
          - job_name: kubernetes-pods
            kubernetes_sd_configs:
              - role: pod
            relabel_configs:
              - source_labels: [__meta_kubernetes_pod_label_app]
                target_label: app
        ```

    - **文件发现（file_sd，通用）**
        ```yaml
        scrape_configs:
          - job_name: custom
            file_sd_configs:
              - files: ['/etc/prometheus/targets/*.json']
        ```

- **协助记忆**
    - 服务发现口诀："文件（file_sd）、K8s（kubernetes_sd）、Consul、云、DNS"。
    - 核心："目标动态自动发现，配合 relabel 打标签筛选"。

- **进阶思考**
    - **服务发现和静态配置（static_configs）的区别？**
        - 静态：手工写目标 IP 列表（适合固定目标，简单）。服务发现：自动获取（适合动态环境/大规模）。静态配置不会自动更新，服务发现在目标变化时自动维护。
    - **`file_sd` 为什么不那么"高大上"但很实用？**
        - `file_sd` 从文件读目标：写个脚本/CMDB 导出 json 到文件，Prometheus 自动加载——简单、通用、不依赖具体注册中心。适合非 K8s 场景或与 CMDB 集成。
    - **服务发现和 relabel_configs 怎么配合？**
        - 服务发现找到目标（产生 `__meta_*` 元标签）→ relabel 用元标签筛选（只采某些）、重命名、打业务标签。流程：发现 → 筛选/打标（relabel）→ 抓取。

- **扩展信息**
    - **发现目标与 `__meta_` 标签**：服务发现的元信息存在 `__meta_*` 标签（K8s: `__meta_kubernetes_*`；AWS: `__meta_ec2_*`），relabel 引用它们
    - **常见 SD 配置**：`kubernetes_sd_configs`（`role`: `node`/`pod`/`service`/`endpoints`）、`ec2_sd_configs`、`consul_sd_configs`、`dns_sd_configs`

## 🤔 Pushgateway 的使用场景是什么？它解决了什么问题？  
- **Pushgateway（推送网关）解决"短生命周期任务无法被 Pull 采集"的问题：批处理/定时任务执行时自己把指标 Push 到 Pushgateway，Prometheus 再从 Pushgateway 拉取。场景：一次性/定时批处理、任务无法暴露 /metrics 端点、指标度量在任务结束时完成。核心：把"无法被拉"的任务指标"中转"。**  
    - **解决的场景（使用场景）**
        - **短生命周期任务**：批处理/定时任务（如每天跑一次的报表、数据同步），执行期间短暂，无法被 Prometheus 按间隔拉取（任务结束监就没了）
        - **任务完成才出指标**：如"本次任务处理了多少条、耗时多少"，只有任务结束时才知道，任务结束 exporter 已停
        - **无法暴露端点**：脚本/一次性程序不便起 HTTP 服务暴露 /metrics
        - 典型：`cron` 批处理、`CI/CD` 任务、一次性数据迁移

    - **工作原理**
        ```
        短任务(脚本) → 执行完成 → Push 指标到 Pushgateway
        → Prometheus 按间隔从 Pushgateway 拉取指标（Pushgateway 是"目标"）
        ```
        - 脚本：`echo 'job_done 1' | curl --data-binary @- http://pushgateway:9091/metrics/job/xxx`
        - **Pushgateway 聚合**：把所有推送的短任务指标集中汇聚（按 job/instance/分组键分组存储），Prometheus 拉它

    - **解决的问题**
        - 让 Prometheus 的 Pull 模型也能覆盖"不能持续运行"的任务
        - 任务指标集中在一个"常驻的汇聚点"（Pushgateway）被拉取

    - **注意/坑**
        - **指标陈旧**：任务挂了/没新数据，Pushgateway 里的旧指标还在（Prometheus 以为任务正常）→ `Pushgateway` 无内置 TTL/自动清理，需任务结束主动调 DELETE API 或外部脚本清理
        - **单点**：Pushgateway 是 SPOF（都推它）
        - **非通用**：长时间运行的服务不该用 Pushgateway（应直接暴露指标被拉）
        - 安全：Pushgateway 无认证，需限制访问

- **协助记忆**
    - `Pushgateway` = "短任务的指标信箱"：任务跑完把指标投进信箱，Prometheus 定期来取。
    - 场景口诀："批处理、短任务、任务结束出指标"。

- **进阶思考**
    - **为什么"长时间运行的服务不用 Pushgateway"？**
        - 常驻服务（Web/数据库）可以被 `Prometheus` 直接拉取（Pull），用 `Pushgateway` 反而多一跳、引入单点和指标陈旧问题。`Pushgateway` 是"补丁"，给无法被 Pull 的短任务用。
    - **Prometheus 什么时候用 Push？**
        - 标准做法主要是 `Pull`；`Push` 仅指短任务经 `Pushgateway`（间接 Push）。更广泛地，Prometheus 体系里 Push 用于短生命周期任务，长时间服务保持 Pull。
    - **Pushgateway 的"指标陈旧"问题怎么解决？**
        - ①任务结束时主动删除指标（`-X DELETE`）②外部脚本/工具定期清理 ③Prometheus 侧用 `absent()` 检测任务是否有新数据。注意：`Pushgateway` 官方明确不做内置 TTL（指标不会被自动清理），所以清理靠任务侧/外部。

- **扩展信息**
    - **Pushgateway 部署**：独立进程/容器，暴露 `9091` 端口
    - **推送示例**：
        ```bash
        echo "cron_job_duration_seconds 12.3" | curl -X POST --data-binary @- http://pushgw:9091/metrics/job/sync
        # 删除：curl -X DELETE http://pushgw:9091/metrics/job/sync
        ```
    - **Prometheus 侧**：`scrape_configs` 里加 `job: pushgateway`（target 指向它）

## 🤔 什么时候会用 relabel_configs？  
- **`relabel_configs`（重打标签）用于"在抓取前对发现的目标做标签/筛选处理"：①筛选目标（只抓某类）②重命名/添加标签（打业务标签）③从元数据提取标签（`__meta_*` → 业务标签）④修改抓取 URL/端口。典型：K8s 服务发现后按 Pod 标签筛选、把 `__meta_kubernetes_*` 转成业务标签、按 job/环境打标签。**  
    - **是什么（定义）**
        - 抓取前的"目标预处理"：对从服务发现/静态配置得到的目标做筛选和标签操作
        - 作用于"目标级别"（target relabeling），在抓取前生效
        - 另一个 `metric_relabel_configs`：作用于"指标级别"（抓取到的指标再处理）

    - **典型使用场景**
        - **筛选目标**：`keep`/`drop` 只保留/丢弃某些目标（如只监控打了 `app=web` 标签的 Pod）
        - **元信息转业务标签**：把服务发现的 `__meta_*` 标签转成业务标签（如 `__meta_kubernetes_pod_label_app_kubernetes_io_name` → `app`）
        - **打静态标签**：给该 job 的所有目标加固定标签（如 `env=prod`）
        - **修改抓取配置**：改 `__address__`（目标地址）、`__scheme__`（http/https）、`__metrics_path__`（路径）
        - **K8s 多角色发现**：同一 job 按 label 区分采集不同角色

    - **示例**
        ```yaml
        relabel_configs:
          # 只保留 app=web 的 Pod
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: web
            action: keep
          # 把元标签转成 app 标签
          - source_labels: [__meta_kubernetes_pod_label_app]
            target_label: app
          # 加固定标签
          - target_label: env
            replacement: prod
        ```

    - **action 类型**
        - `keep`：保留匹配的目标（不匹配丢弃）
        - `drop`：丢弃匹配的目标
        - `labelmap`：把源标签（含 `__meta_`）复制/改成新标签
        - `replace`（默认）：替换标签值（改值/改名）
        - `labeldrop`/`labelkeep`：删除/保留某标签

- **协助记忆**
    - relabel = "抓取前给目标"整容 + 筛选"：keep/drop 筛选，labelmap/replace 打标，`__meta_` → 业务标签。
    - action 口诀："keep 留、drop 丢、replace 换、labelmap 映射"。

- **进阶思考**
    - **`relabel_configs` 和 `metric_relabel_configs` 区别？**
        - `relabel_configs`：抓取**前**处理目标（筛选目标/打目标标签）；`metric_relabel_configs`：抓取**后**处理指标（筛选指标/给指标改名/删高基数标签）。两者作用对象不同（目标 vs 指标）。
    - **`keep` 和 `drop` 怎么用（默认效果）？**
        - `keep`：正则匹配的保留（**没匹配的丢弃**）；`drop`：正则匹配的丢弃（没匹配的保留）。场景：只想要某类目标用 keep；排除某类用 drop。
    - **为什么要"控制标签基数"（metric_relabel 场景）？**
        - 高基数标签（如请求 URL/用户 ID 作标签）会让指标组合爆炸、存储膨胀、查询慢。`metric_relabel_configs` 可在抓取时删除高基数标签/丢弃过高样本，控制数据量；聚合要靠 recording rule。这是大规模 Prometheus 必备优化。

- **扩展信息**
    - **`__meta_` 标签例**：K8s `__meta_kubernetes_pod_label_<label>`、`__meta_kubernetes_namespace`；EC2 `__meta_ec2_instance_id`
    - **内置标签**：`__address__`（抓取地址）、`__scheme__`、`__metrics_path__`、`instance`（默认目标标签）
    - **常用 action**：keep、drop、replace、labelmap、labeldrop、labelkeep

## 🤔 你都用过哪些 Exporter？  
- **常用 Exporter：主机（`node_exporter`）、数据库（`mysqld_exporter`、`postgres_exporter`、`redis_exporter`、`mongodb_exporter`）、中间件（`nginx_exporter`、`kafka_exporter`、`rabbitmq_exporter`）、网络（`blackbox_exporter` ICMP/TCP/HTTP 探活、`snmp_exporter`）、容器/K8s（`cadvisor`、`kube-state-metrics`、`process_exporter` 进程）等。核心：按监控对象选对应 exporter，暴露 `/metrics` 供 Prometheus 拉取。**  
    - **主机/系统类**
        - `node_exporter`：主机基础指标（CPU/内存/磁盘/网络/文件系统）——最常用
        - `process_exporter`：进程监控
        - `windows_exporter`：Windows 主机
        - `ipmi_exporter`：硬件监控（IPMI）
        - `smartmon_exporter`：磁盘 SMART
    - **数据库类**
        - `mysqld_exporter`：MySQL 指标（连接数/QPS/慢查询/主从）
        - `postgres_exporter`：PostgreSQL
        - `redis_exporter`：Redis（内存/命中率/客户端/持久化）
        - `mongodb_exporter`：MongoDB
    - **中间件/应用类**
        - `nginx_exporter`：Nginx（连接/请求/状态）
        - `kafka_exporter`：Kafka（分区/消费者/滞压）
        - `rabbitmq_exporter`：RabbitMQ
        - `jvm_exporter` → 正确命名是 `jmx_exporter`（prometheus/jmx_exporter，支持 javaagent），监控 Java 应用 JVM
        - 应用自定义：业务代码用 client library 暴露指标
    - **网络/探活类**
        - `blackbox_exporter`：黑盒探活（HTTP/TCP/ICMP/DNS）——测"服务通不通"
        - `snmp_exporter`：SNMP 设备（网络设备/打印机）
    - **容器/K8s 类**
        - `cadvisor`：容器资源指标（CPU/内存）——**现代 K8s 中 cAdvisor 已内嵌于 kubelet**（暴露在 `:10250/metrics/cadvisor`），独立部署时才是 8080 端口
        - `kube-state-metrics`：K8s 对象状态（Pod/Deployment 等）
        - `kubelet` 内置 `/metrics`：K8s 节点/容器基础
    - **Web 站点类**
        - `haproxy_exporter`、`coredns_exporter`、`etcd_exporter` 等

    - **选 Exporter 思路（怎么选）**
        - 官方/社区先找现成（GitHub exporterhub.io）
        - 没有现成的：用 `blackbox_exporter`（探活）/`snmp_exporter`（硬件）/写自定义 exporter（client library）

- **协助记忆**
    - `Exporter` 口诀："主机 node、数据库 mysqld、中间件 nginx/redis、探活 blackbox、K8s cadvisor/kube-state"。
    - 找不到现成：先 blackbox/snmp，再考虑自写。

- **进阶思考**
    - **`node_exporter` 和 `cadvisor` 有什么区别？**
        - `node_exporter`：主机层（OS 指标：CPU/内存/磁盘），每个节点一个。`cadvisor`：容器层（容器指标），K8s 里收集每个容器的资源。监控"主机"用 node，监控"容器"用 cadvisor。
    - **`blackbox_exporter` 为什么特殊？**
        - 它是"主动探测"（发 `HTTP`/`TCP`/`ICMP` 请求测目标通不通/响应时间），不需要目标装 `exporter`——适合测公网服务/URL/端口。生产里监控"外部依赖是否可达"用它。
    - **自定义业务指标的 exporter 怎么写？**
        - 用官方 `client library`（`prometheus/client_golang`、`Python`、`Java`）在应用里注册指标并暴露 `/metrics`；或写独立 `exporter` 调第三方 `API` 转指标。核心：指标命名/类型规范 + 暴露 `HTTP`。

- **扩展信息**
    - **Exporter 查找**：`exporterhub.io`、`GitHub` 搜索 `<对象> exporter`、官方文档列表
    - **常用 exporter 端口**：`node 9100`、`mysqld 9104`、`redis 9121`、`nginx 9113`、`blackbox 9115`、`cadvisor 8080`、`kube-state-metrics 8080`
    - **统一思路**：`<对象>_exporter` 命名规律（`<对象>` 即被监控对象）
## 🤔 你用过 Prometheus 哪些内置函数？  
- **Prometheus 常用内置函数：速率类（`rate`/`irate`/`increase`）、聚合类（`sum`/`avg`/`max`/`min`/`count`/`topk`/`quantile`）、数学类（`abs`/`ceil`/`floor`/`round`）、时间类（`time`/`timestamp`）、直方图（`histogram_quantile`）、状态类（`absent`）、标签类（`label_replace`/`label_join`）。核心：`rate` 算速率、`histogram_quantile` 算延迟分位、`sum by` 聚合。注：`up` 是内置指标（目标在线状态）而非函数。**  
    - **速率/增量类（Counter 用）**
        - `rate()`：区间内每秒平均速率（如 `rate(http_requests_total[5m])` = QPS）——平滑，适合长期趋势
        - `irate()`：区间内最后两个样本的瞬时速率——毛刺/突发行（比 rate 敏感）
        - `increase()`：区间内总增量（如 5 分钟请求增量）
        - `delta()`：Gauge 区间差值

    - **聚合类**
        - `sum`/`avg`/`max`/`min`/`count`（求和/平均/最大/最小/计数）
        - `topk(n)`/`bottomk(n)`（前 N/后 N）
        - `quantile(q)`（聚合分位）、`count_values`（按值分布计数）
        - `sum by (label)`：按标签分组聚合（如 `sum by (instance) (rate(http_requests[5m]))`）
        - `sum without (label)`：除指定标签外聚合

    - **直方图类**
        - `histogram_quantile(φ, rate(hist_bucket[5m]))`：从 Histogram 桶算分位数（P99 等）
        - `histogram_count()`/`histogram_sum()`（2.40+，主要为原生直方图 native histogram 设计；经典直方图常规仍用 `_count`/`_sum` 序列）

    - **状态/其他类**
        - `up`（内置指标：目标是否在线 0/1，**不是函数**）
        - `absent()`（指标不存在返回 1——可用来检测任务没新数据）
        - `absent_over_time()`（区间内无数据返回 1）
        - `label_replace()`（改标签值/名）、`label_join()`（合并标签）
        - `time()`（当前时间）、`timestamp()`（样本时间戳）
        - `clamp_max`/`clamp_min`（限制范围）、`predict_linear`（线性预测）；比较用运算符（`>`/`>=`/`==`）

    - **常用组合示例**
        ```promql
        # CPU 使用率
        100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
        # 请求 QPS 按实例分
        sum by (instance) (rate(http_requests_total[5m]))
        # P99 延迟
        histogram_quantile(0.99, sum by (le) (rate(http_request_duration_bucket[5m])))
        ```

- **协助记忆**
    - 函数口诀："速率 `rate`/`irate`、聚合 `sum by`、分位 `histogram_quantile`、状态 `up`/`absent`"。
    - 常用三步："`rate` 算速率 → `sum by` 聚合 → `topk`/`quantile` 筛选"。

- **进阶思考**
    - **`rate` 和 `irate` 区别/怎么选？**
        - `rate`：整个区间平均（平滑，适合看长期趋势/告警，抗毛刺）。`irate`：最新两个点算瞬时速率（敏感，适合看尖峰/瞬时异常）。长期趋势用 rate，抓瞬时突刺用 irate。
    - **`sum by` 和 `sum without` 的区别？**
        - `sum by (label)`：按指定标签分组（其他标签丢弃）；`sum without (label)`：排除指定标签聚合（其他保留）。结果区别在保留哪些维度——by 是"只要这几个"，without 是"去掉这几个"。
    - **为什么延迟分位要用 `histogram_quantile` 而不是直接用值？**
        - Histogram 存的是桶计数（≤0.1/0.5/1s 各多少），Prometheus 通过桶分布近似估算分位数（线性插值）——能看到 P50/P95/P99 等任意分位，且可聚合。直接存每请求延迟（Summary）不可聚合且数据量大。

- **扩展信息**
    - **告警常用表达式**：`rate()` + 阈值、`up == 0`、`absent()`（无数据告警）
    - **predic_promql 工具**：`promtool query`、Prometheus UI 的 Graph/Console 调试

## 🤔 Prometheus 存储机制是怎么样的？  
- **Prometheus 存储是"本地磁盘时序数据库（TSDB）"：按 2 小时一个 block（块）写入，内存（WAL）+ 持久化，支持数据压缩、采样与保留策略（`retention_time`）。核心：block 结构（`data/` 目录）、`WAL` 预写日志、`mmap`、块合并（compact）、按时间/标签索引查询。**  
    - **整体架构（本地 TSDB）**
        - Prometheus 把采集的时序数据存储到本地磁盘（默认 `data/` 目录）
        - 结构：按时间段分块（block）存储，每个 block 内按标签/指纹索引
        - 无外部依赖（单机即可），但本地存储限制（不适合跨机久存/大容量）

    - **核心机制**
        - **Block（块）**：数据按 2 小时切块（`01xxxx` 目录），含样本/索引/元数据
        - **WAL（预写日志）**：新数据先写内存 + WAL（崩溃恢复），2 小时后落盘成 block
        - **Head block（内存块）**：最近 2 小时数据在内存（可查询），定期落盘；head 溢出 chunk 用 mmap 存 `data/chunks_head`
        - **Compact（压缩合并）**：旧的 block 自动合并（减少文件数/存储）
        - **保留策略**：`--storage.tsdb.retention.time`（默认 15 天）自动删除旧 block
        - 注：降采样（downsampling）**非原生支持**，由 Thanos Compactor/VictoriaMetrics 等外部组件提供

    - **数据存储细节**
        - 数据格式：`<时间戳, 值>` + 标签（label）索引（倒排索引加速查询）
        - `mmap`：读优化（内存映射）
        - 查询：按标签选择器 + 时间范围定位 block

    - **存储命令/查看**
        ```bash
        ls data/                    # 查看 block 目录
        promtool tsdb list          # 列出 block
        promtool tsdb analyze       # 分析存储（label 基数/大小）
        ```

    - **存储限制（为什么不适合长期）**
        - 单机本地磁盘：不支持集群水平扩展（原生）
        - 高基数（many unique label 组合）→ 存储/内存膨胀
        - 长期留存需要大量磁盘 + 压缩
        - 数据持久性：单机磁盘故障丢数据（无副本）

- **协助记忆**
    - 存储口诀："2 小时一个块，WAL 预写内存先，落盘 block 压缩合并，retention 自动删老"。
    - 核心："本地 TSDB + block 结构 + WAL + 保留策略"。

- **进阶思考**
    - **为什么新数据先写内存 + WAL 而不是直接落盘？**
        - 性能：时序写入频繁，直接落盘慢；先写内存（查询快）再定期批量落盘。WAL 保证崩溃不丢数据（重放 WAL 恢复）。这是时序数据库的常规设计。
    - **为什么 2 小时一个 block？**
        - 平衡：块太小文件碎片多，太大合并/查询变慢。2 小时是 Prometheus 选择的折中（减少文件数、便于合并和 retention 删除）。
    - **数据保留（retention）怎么调？**
        - `--storage.tsdb.retention.time`（如 `90d`）/`--storage.tsdb.retention.size`（按容量）。默认 15 天。**注意**：时间与大小同时设时先达者触发删除。

- **扩展信息**
    - **文件布局**：`data/01xxxx/`（block：`chunks`/`index`/`meta.json`）、`data/wal/`（预写日志）、`data/chunks_head`（内存溢出 chunk）
    - **远端存储（remote write）**：Prometheus 可 `remote_write` 到外部存储（Thanos/VictoriaMetrics/云），突破本地限制
    - **快照**：`/api/v1/admin/tsdb/snapshot`（手动快照备份）

## 🤔 Prometheus 为什么不适合长期存储？  
- **Prometheus 原生不适合长期存储的原因：①本地磁盘单机（无集群/无副本，容量与可用性受限）②高基数导致存储/内存膨胀 ③数据量随留存时间线性增长（15 天→长期，磁盘巨大）④查询长周期变慢 ⑤无多副本/跨机房容灾。解决：`remote_write` 到外部存储（`Thanos`/`VictoriaMetrics`/云 TSDB）或联邦。**  
    - **原因一：本地磁盘单机**
        - Prometheus 默认数据存本地磁盘（单机），无原生集群/水平扩展
        - 磁盘容量有限（长期数据需要大量空间）
        - 无副本（磁盘故障丢数据）、无跨机房容灾

    - **原因二：数据量与留存线性增长**
        - 数据按保留期保留，留得越久数据越多（磁盘线性增长）
        - 默认 15 天，若留 1 年需要 ~24 倍空间
        - 高采样频率 + 多目标 → 数据量大

    - **原因三：高基数（cardinality）问题**
        - 高基数标签（URL/用户 ID）导致指标组合爆炸，存储/内存/查询成本剧增
        - 长期存储高基数数据几乎不可行

    - **原因四：查询性能**
        - 长时间范围的查询（如 1 年趋势）要跨大量 block 扫描，变慢
        - 内存要求随数据范围增长

    - **原因五：运维/容灾**
        - 数据备份/恢复无内置机制（要手动处理）
        - 单点（存储不可扩展/不可替换）

    - **解决方案（如何长期存储）**
        - **`remote_write` 到外部存储**：Thanos（对象存储 S3/GCS）、VictoriaMetrics、云 TSDB——存外部、无限扩展
        - **`Thanos`**：Prometheus + 对象存储（极致扩展 + 长期留存 + 高可用）
        - **`VictoriaMetrics`**：兼容 Prometheus 的时序库（存储压缩更好、支持长期）
        - **联邦（Federation）**：层级聚合计（但长期存储仍需外部）

- **协助记忆**
    - 不适合长期："单机磁盘（容量/可用性）、数据线性增长、高基数膨胀、查询变慢、无容灾"。
    - 解药口诀："remote_write 到 Thanos/VictoriaMetrics/云"。

- **进阶思考**
    - **Thanos 和 VictoriaMetrics 怎么解决"长期存储"？**
        - Thanos：把数据 push 到对象存储（S3）——容量近乎无限、跨集群聚合；VictoriaMetrics：兼容 Prometheus API 的高效库 + 更好的压缩（长期留存成本低）。两者都是"Prometheus 的长期存储后端"。
    - **为什么"高基数"是 Prometheus 的软肋？**
        - Prometheus 每个唯一"指标+标签组合"（series）都要建索引和存储序列。高基数（如 path 直接做标签）导致 series 爆炸：存储/内存/查询全炸。所以生产必须控制标签基数（relabel 删除、避免动态标签）。
    - **本地存储能提升（不改架构）吗？**
        - 有限：加大磁盘、增大 `retention`、优化采集间隔（降采样）、控制基数。但"单机 + 本地"的容量天花板仍在，真正长期存储必须 external（remote_write）。

- **扩展信息**
    - **`remote_write` 配置**：Prometheus 里加 `remote_write: - url: http://victoria:8428/api/v1/write`
    - **长期存储方案对比**：Thanos（对象存储，功能全）、VictoriaMetrics（高效压缩，单点简单）、Mimir/Cortex（多租户云原生）、云 TSDB（托管）

## 🤔 Prometheus 出现 OOM 的常见原因及解决方案？  
- **Prometheus OOM（Out of Memory）常见原因：①高基数（太多的唯一标签组合 → series 膨胀 → 内存爆）②抓取数据量过大（target/指标过多）③查询过重（大范围/高基数查询占用内存）④内存参数未调（默认内存限制、chunks 数量）⑤head block/内存块过大。解决：控基数、优化抓取、限制查询、调 `--storage.tsdb` 参数、加内存/降采样。**  
    - **常见原因**
        - **高基数（最常见）**：动态/高基数标签（URL、UserID、容器 ID 等做标签）→ series 爆炸 → 内存、存储、查询全爆
        - **抓取量大**：target 多、指标多、抓取频繁（`scrape_interval` 小）
        - **查询过重**：大范围、`sum` 没聚合、高基数查询（Prometheus 查询要载入 series 到内存）
        - **内存参数不当**：`GOGC`/`GOMEMLIMIT`（Go 内存参数）未调优、容器内存限制不足；head block 过大（大量短时间数据在内存未落盘）
        - 注：`--storage.tsdb.min-block-duration` 仅测试/调试用途（生产不应修改，影响 compactor），不是内存调优项
        - **规则过多**：告警规则/记录规则重（rule 评估载入大量数据）

    - **排查思路**
        - 看日志（OOM killer）/`/proc/PID/status` 内存
        - `promtool tsdb analyze`：分析 cardiality（高基数标签）
        - Grafana 查看内存趋势、`go_memstats` 指标
        - 查询过重：看查询日志/重启后内存恢复

    - **解决方案**
        - **控制基数**（治本）：relabel 删高基数标签、避免动态标签、聚合指标
        - **优化抓取**：降抓取频率（`scrape_interval`）、只采必要指标（`metric_relabel` 过滤）、减少 target
        - **限制查询**：查询加标签过滤/时间范围、记录规则（recording rule）预聚合常用查询
        - **调内存参数**：容器内存限制加足（Go 1.19+ 用 `GOMEMLIMIT` 设内存上限更稳；`GOGC` 调大会内存升高、CPU 下降，调小相反）；`--storage.tsdb.retention.size` 控制容量删除
        - **架构优化**：联邦/分片（多 Prometheus 分职责）、`remote_write` 分担、Thanos/VictoriaMetrics
        - **容量**：加内存（简单但治标）

- **协助记忆**
    - OOM 口诀："基数高（治本）、抓取多、查询重、参数未调"。
    - 解法："控基数 → 限抓取 → 限查询 → 调参数 → 分片/外部"。

- **进阶思考**
    - **为什么"高基数"会让 Prometheus OOM？**
        - Prometheus 每个唯一 series（指标+标签组合）在内存中维护索引和 head block。高基数 = 海量 series = 内存（+存储 + 查询暂存）暴涨。1000 个 URL 标签 → 1000 倍的 series。这是 Prometheus 第一大坑。
    - **怎么快速定位高基数？**
        - `promtool tsdb analyze`（Top 标签值数）、查询 `count(metric)`；Grafana 建"series 数量趋势"面板。定位后用 relabel/metric_relabel 清理。
    - **OOM 只加内存能解决吗？**
        - 治标：加内存让 Prometheus 暂时不崩。治本：减 series（控基数）、优化查询/抓取。数据量持续膨胀时加内存只是拖延，必须架构/数据优化。

- **扩展信息**
    - **相关参数**：`--storage.tsdb.retention.time`、`--storage.tsdb.min-block-duration`、`--storage.tsdb.wal-compression`、容器 `memory limit`
    - **工具**：`promtool tsdb analyze`（基数分析）、Grafana Prometheus 自查面板

## 🤔 Prometheus 有哪些主流高可用方案？  
- **Prometheus 高可用方案核心是"多副本 + 统一查询/存储"：①原生多副本（多 Prometheus 拉同一目标 + Alertmanager 集群去重告警）②`Thanos`（多 Prometheus + 对象存储 + 统一查询）③`VictoriaMetrics`（兼容库 + 复制/集群）④`Mimir`/`Cortex`（多租户云原生）⑤联邦（层级聚合）。核心：告警去重 + 数据冗余 + 统一查询。**  
    - **方案一：原生高可用（多副本 + Alertmanager 去重）**
        - 部署两套相同配置的 Prometheus 拉同一批目标（相同规则）——无需特殊 flag，就是多实例同配置
        - Alertmanager 集群模式（`--cluster.peer`，gossip 同步）+ alert fingerprint 去重：跨副本相同告警只发一次（分组 grouping 只是合并同类通知，不起去重作用）
        - 优点：简单（告警不重复）；缺点：数据各自独立（查询/存储无统一）

    - **方案二：Thanos（最主流）**
        - 多 Prometheus + Sidecar 上传对象存储（S3）+ Querier 统一查询
        - 优点：数据统一/长期留存/跨集群查询、Prometheus 可随意扩缩
        - 组成：Sidecar、Querier、Store、Compactor、Ruler

    - **方案三：VictoriaMetrics（vmcluster/vmsingle）**
        - 兼容 Prometheus API 的时序库，支持 `-replicationFactor` 复制、集群（vminsert/vmselect/vmstorage）
        - 更适合作为"后端存储"（remote_write），比 Thanos 部署简单、存储压缩好

    - **方案四：Mimir / Cortex（云原生多租户）**
        - 多租户 Prometheus 兼容方案（Grafana 的 Mimir、原 Cortex）
        - 适合"多团队/多集群统一监控平台"（数据统一、多租户隔离）

    - **方案五：联邦（Federation）**
        - 上级 Prometheus 从下级拉聚合指标（分层）
        - 作用：聚合/分级，不完全等于高可用（也有冗余作用）

    - **选型考虑**
        - 小规模/只需告警不重复：原生多副本
        - 需要统一查询/长期存储：Thanos
        - 追求简单高效/存储优：VictoriaMetrics
        - 多租户/云原生：Mimir/Cortex

- **协助记忆**
    - 高可用口诀："原生多副本（告警去重）、Thanos（统一查询+长期）、VictoriaMetrics（简单高效）、Mimir（多租户）"。
    - 核心："数据冗余 + 告警去重 + 统一查询"。

- **进阶思考**
    - **为什么"多副本 + Alertmanager 去重"只是最小高可用？**
        - 它解决了"告警不丢/不重复"（两个 Prometheus 都挂了才丢告警），但数据是两套独立存储：查询各自查、无统一视图、无长期留存。真正"数据高可用"需要 Thanos/Victoria 统一存储层。
    - **Thanos 和 VictoriaMetrics 怎么选？**
        - Thanos：用对象存储（S3）+ 组件多（Sidecar/Querier/Store），功能全（跨集群/长期/降采样），适合需要统一查询和长期留存的中大型。VictoriaMetrics：单二进制/集群简单、压缩优、部署运维轻，适合中小型或当后端存储。
    - **高可用和"可扩展/长期存储"是一回事吗？**
        - 不完全是：高可用=数据不丢/查询可用（多副本）；扩展/长期=容量和留存（对象存储/外部库）。Thanos/Victoria 两者都解决（副本+扩展+长期），原生多副本只解决告警不重复。

- **扩展信息**
    - **Thanos 组成**：Sidecar（上传数据）、Querier（统一查询）、Store（对象存储读取）、Compactor（压缩/降采样）、Ruler（独立告警）
    - **VictoriaMetrics 集群**：vminsert（写入）、vmselect（查询）、vmstorage（存储）
    - **Mimir**：Grafana 的多租户时序平台（Cortex 继承者）
## 🤔 Thanos 实现高可用的核心原理是什么？  
- **Thanos 实现高可用的核心原理：①多副本 Prometheus（各自采集，告警去重）②`Sidecar` 把每个 Prometheus 的本地时序数据上传到对象存储（S3），实现数据统一/长期留存 ③`Querier` 聚合查询多个 Prometheus + 对象存储，实现统一查询/跨集群 ④`Compactor` 压缩+降采样，`Ruler` 独立告警。核心："多副本数据冗余 + 对象存储长期留存 + 统一查询层"。**  
    - **核心原理拆解**
        - **数据冗余（HA）**：多个 Prometheus 副本拉同一批目标（各自有完整数据）——任一挂掉，另副本数据仍在
        - **统一存储（长期）**：`Sidecar` 把各 Prometheus 的数据上传到对象存储（S3/GCS）——数据脱离单机，容量近无限 + 长期留存
        - **统一查询（全局视图）**：`Querier` 对多副本 + 对象存储做聚合查询（去重、合并），一个 PromQL 查全部数据
        - **告警去重**：多副本的 Alertmanager 集群（gossip 同步）通过 alert fingerprint 去重（同告警只通知一次）

    - **高可用实现方式**
        ```
        Prom A(1副本) + Sidecar → 上传 S3
        Prom B(2副本) + Sidecar → 上传 S3
              ↓
        Thanos Querier（统一查询：合并 A/B/S3）→ Grafana
        Alertmanager（集群去重）
        ```
        - 多副本：任何一个 Prometheus 挂了，历史数据/查询不受影响（由其他副本 + S3 兜底）；注：最近约 2 小时未上传的本地 block 若本机故障会丢失（Sidecar 上传有周期）

    - **相比原生多副本的优势**
        - 原生多副本：只解决"告警不重复"，数据各查各的
        - Thanos：数据统一（一个查询看全部）、长期留存（S3）、跨集群/跨机房聚合、Prometheus 可无损扩缩（新实例上传 S3）

- **协助记忆**
    - Thanos 高可用 = "副本（数据冗余）+ S3（长期留存）+ Querier（统一查询）+ 去重（告警不重复）"。
    - 口诀："Sidecar 上传、Querier 查询、Compactor 压缩、Ruler 告警"。

- **进阶思考**
    - **为什么"Prometheus + Sidecar + S3"能实现"无限扩展"？**
        - 数据落 S3 后，本地 Prometheus 只是"采集器 + 短缓存"：磁盘/数据量不再限制（S3 承受），新加 Prometheus 实例只需上传 S3 即可被 Querier 查询到——解耦了"采集"和"存储"。
    - **Querier 查询会不会比原生慢？**
        - 会稍慢（要拉多副本 + S3 Store，且做去重/合并），尤其全查 S3 时。优化：S3 数据做压缩/降采样（Compactor）、查询加限定时间/标签、Store/Querier 加缓存。
    - **Thanos 的告警去重和原生 Alertmanager 去重一样吗？**
        - 机制相同（Alertmanager 分组去重），但 Thanos 有独立 `Ruler` 组件可统一管理告警规则（不依赖各 Prometheus 本地 rules）。

- **扩展信息**
    - **Thanos 架构图**：Sidecar（数据上传）、Querier（查询聚合）、Store（对象存储读取）、Compactor（压缩降采样）、Ruler（独立告警规则）、Receiver（可选，替代 Sidecar 的 Push）
    - **部署**：Thanos 组件各自独立可水平扩展；对象存储（S3/OSS/GCS/MinIO）作共享数据层

## 🤔 Thanos 有哪些核心组件及其作用？  
- **Thanos 核心组件：①`Sidecar`（每个 Prometheus 旁的边车：上传本地数据到对象存储 + 查询本地数据）②`Querier`（统一查询：聚合多个 Prometheus/Store，去重）③`Store`（读取对象存储数据供查询）④`Compactor`（对象存储数据压缩/降采样/删除）⑤`Ruler`（独立告警规则评估）⑥`Receiver`（可选：接收 Push 数据再上传）。核心：Sidecar 上传 + Store/Querier 读取查询 + Compactor 压缩。**  
    - **各组件职责**
        - **`Sidecar`（边车）**：部署在 Prometheus 旁，①把 Prometheus 本地 block 上传到对象存储（长期留存）②提供查询本地数据的接口给 Querier。无 Sidecar = 数据只在本机
        - **`Querier`（查询器）**：统一查询入口，聚合多个 Prometheus/Store 的数据（去重、合并），对 Grafana/PromQL 提供全局视图。无状态、可水平扩展
        - **`Store`（存储网关）**：从对象存储读取历史数据供 Querier 查询（缓存加速）。让对象存储的数据"可查询"
        - **`Compactor`（压缩器）**：对对象存储中的 block 做压缩合并 + 降采样（downsampling）、删除过期/损坏数据。控制存储成本和查询速度
        - **`Ruler`（规则器）**：独立的规则评估组件（告警规则/记录规则），不依赖各 Prometheus 本地 rules，集中管理。可选（也可用 Prometheus 本地 rules）
        - **`Receiver`（接收器）**：可选，接收 remote_write 推送（替代 Sidecar 的 Pull 上传），适合不想让 Prometheus 挂 Sidecar 的场景

    - **数据流**
        ```
        Prometheus + Sidecar → 上传 → 对象存储(S3)
                                     ↓
        Querier ← Store(读S3) + 各Sidecar(读本地) → 统一查询 → Grafana
        Compactor（后台压缩/降采样 S3 数据）
        ```

    - **部署形态**
        - 最小：每个 Prometheus + Sidecar + 单 Querier + Store + Compactor
        - 大规模：Querier/Store 多副本、对象存储（S3/OSS/MinIO）、Ruler 独立集群

- **协助记忆**
    - Thanos 组件口诀："Sidecar 上传、Querier 查询、Store 读存储、Compactor 压缩、Ruler 告警"。
    - 记忆："一个边车（Sidecar）传数据，四个中心（Querier/Store/Compactor/Ruler）各司其职"。

- **进阶思考**
    - **Sidecar 和 Receiver 的区别（什么时候用哪个）？**
        - Sidecar：Prometheus Pull 数据后由 Sidecar 主动上传（默认，Prometheus 本地必须有数据）；Receiver：接受 `remote_write` 推送（Prometheus 不存本地，直接推给 Receiver 转发到 S3）——适合不想 Prometheus 带磁盘或统一接收场景。
    - **Store 为什么需要？Sidecar 不是也能查本地吗？**
        - Sidecar 只能查"本 Prometheus 的本地数据"；历史数据已上传 S3 的不在本机（或本机 retention 删了），Store 负责从 S3 读出这些历史数据供 Querier 聚合——"S3 数据可被查询"靠 Store。
    - **Compactor 的"降采样"有什么用？**
        - 对象存储数据长期保留后体量大、查询慢。降采样把旧数据按粗粒度重采样（如 5m 间隔），查询长周期更快且存储减少——保留"趋势"而非"原始精度"，ExHalf 查询优化。

- **扩展信息**
    - **官方导航**：`thanos tools bucket ls`（列出对象存储数据）、其余工具（`thanos query`/`thanos store` 等）

## 🤔 VictoriaMetrics 实现高可用的核心原理是什么？  
- **VictoriaMetrics（VM）实现高可用的核心原理：①兼容 Prometheus API（Prometheus 通过 `remote_write` 把数据推给 VM）②`vmcluster` 集群三组件（`vminsert` 写入/`vmselect` 查询/`vmstorage` 存储，各自可水平扩展）③`-replicationFactor` 数据副本（多副本写入，单节点故障不丢）④存储引擎压缩优（长期留存成本低）。核心："集群水平扩展 + 数据副本 + 兼容即插即用"。**  
    - **核心原理**
        - **Prometheus 兼容**：Prometheus 配 `remote_write` 把数据推给 VM（VM 是后端存储/查询）
        - **数据副本（replicationFactor）**：写入时按副本数复制到多个 vmstorage 节点——单节点故障数据不丢
        - **读写分离/水平扩展**：vminsert（写）/vmselect（查）/vmstorage（存）分离，各自可扩——容量/并发可扩展
        - **高效存储**：压缩比高、快照、长期留存成本低

    - **架构（vmcluster）**
        ```
        Prometheus → remote_write → vminsert（写多副本）→ vmstorage x N
                                         ↓
                              vmselect（查询）→ Grafana
        ```
        - `vminsert`：接收写入，按副本分发到多个 vmstorage（写路径高可用）
        - `vmstorage`：数据节点（多副本 = 冗余）
        - `vmselect`：查询聚合（可扩展、无状态）

    - **单机模式（vmsingle）**
        - 单二进制（`vmsingle`）也可用（简单、部署零组件）
        - **注意：vmsingle 单机版不支持数据复制**（`-replicationFactor` 仅集群模式参数）；多份 vmsingle + LB 只做故障切换、不产生数据冗余。要存储层高可用需用 `vmcluster`

    - **高可用落点**
        - **存储高可用**：replicationFactor 副本（数据不因单节点故障丢失）
        - **写入高可用**：vminsert 多实例 + 前端（写入失败自动切换）
        - **查询高可用**：vmselect 多实例（无状态）
        - **对接 Prometheus**：Prometheus 是采集端（可多副本），数据统一在 VM

- **协助记忆**
    - VictoriaMetrics = "兼容 Prometheus 的高效时序库 + 集群 + 副本"：`remote_write` 推入、vminsert/vmselect/vmstorage 三件套、replicationFactor 副本。
    - 对比 Thanos："VM 简单高效（单二进制/压缩好），Thanos 对象存储（S3 无限/跨集群）"。

- **进阶思考**
    - **VictoriaMetrics 和 Thanos 高可用思路有什么区别？**
        - Thanos：Prometheus 自采 + Sidecar 上传 S3（对象存储为数据层，Prometheus 本地只是采集）；VM：`remote_write` 推送 + 自身集群（vmstorage 副本，数据在 VM 集群）。Thanos 强在"对象存储无限/跨集群"，VM 强在"部署简单/压缩好/一体"。
    - **为什么 VM 存储压缩好对"高可用/长期"重要？**
        - 长期留存 = 存储成本；VM 高压缩（比 Prometheus 原生小很多）→ 长期留存成本低 + 副本空间小。这也是 VM 在"长期存储场景"优于 Prometheus 原生的原因之一。
    - **`replicationFactor` 副本和"抓取两份"（多 Prometheus）相比？**
        - VM 副本：数据在存储层冗余（Prometheus 一份推给 VM，VM 内部复制）——简单、存储层保证。多 Prometheus 采集：采集层冗余（两个 Prometheus 各采一份）——适合要"采集也高可用"的场景。两者可叠加（多采集 + VM 副本）。

- **扩展信息**
    - **组件**：vminsert（8480 写入）、vmselect（8481 查询）、vmstorage（8482，内部 8400/8401）；vmsingle（8428 单机）
    - **参数**：`-replicationFactor=2`（副本数，集群模式）、`-dedup.minScrapeInterval`（RF>1 时去重）、`-storageDataPath`、`-retentionPeriod`（保留期）
    - **部署**：二进制/容器/K8s operator（VictoriaMetrics Operator）

## 🤔 Alertmanager 通过哪些机制减少无效告警？  
- **Alertmanager 减少无效告警的机制：①`grouping`（分组：同组告警合并为一条通知）②`inhibition`（抑制：上级/根因告警存在时抑制下级告警）③`slience`（静默：预定时间段/条件静默）④去重（相同告警去重）⑤路由/分级别（按严重程度路由，低危不扰人）⑥`repeat_interval`（重复通知间隔）。核心："合并同类、抑制从属、静默已知、控制噪音"。**  
    - **分组（Grouping）**
        - 同一分组（按 alertname/instance 等）的多条告警合并成**一条通知**
        - 例：同一主机 10 条告警 → 一条"包含 10 条"的通知
        - 配置：`group_by: ['alertname', 'instance']`、`group_wait`（等待期）/`group_interval`（组内间隔）

    - **抑制（Inhibition）**
        - 存在"更高级/根因"告警时，抑制"从属"告警（避免告警风暴）
        - 例：主机挂了（instance down）→ 抑制其上的所有服务告警（服务不可用是必然）
        - 配置：`inhibit_rules`（源/目标告警匹配）

    - **静默（Silence）**
        - 预定时间段/条件的告警静默（已知问题/维护窗口不打扰）
        - 配置：Alertmanager UI 创建 silence、`matchers` 匹配
        - 用于：计划维护、已知问题处理中

    - **去重（Deduplication）**
        - 多 Prometheus 副本产生的相同告警只发一次
        - 高可用部署时的去重（HA 基础设施）

    - **重复通知控制**
        - `repeat_interval`：重复发送间隔（如告警持续未恢复，每 4h 再提醒一次，不是一直轰炸）
        - 路由分级别：`routes` 按严重程度（critical/warning）路由，低危走轻通知（如仅 Email）

- **协助记忆**
    - 减噪四机制："分组（合并）、抑制（从属）、静默（已知）、去重（副本）"。
    - 口诀："合并同类（分组）、压住从属（抑制）、静默已知、去重副本、控制重复间隔"。

- **进阶思考**
    - **分组和抑制有什么区别（何时用哪个）？**
        - 分组：把多个告警**合并成一条通知**（减少通知条数）。抑制：有根因告警时**不发送**从属告警（避免内容噪音）。分组减少"条数"，抑制减少"无意义内容"。
    - **静默（Silence）和抑制（Inhibition）的区别？**
        - 静默：人工预定（主动静默某条件告警，如维护窗口）；抑制：规则自动（根因在→自动压住从属）。静默是人为管控，抑制是规则自动化。
    - **为什么高可用部署要"去重"？**
        - 两个 Prometheus 副本都报警 → Alertmanager 收到两条相同告警，不去重会发两次。Alertmanager 按分组/内容去掉重复（一条即可），避免用户收到 N 条相同告警。

- **扩展信息**
    - **配置结构**：`route`（路由树）、`group_by`/`group_wait`/`group_interval`，`inhibit_rules`、`silences`（API/UI 管理）、`receivers`（通知渠道）
    - **通知渠道**：Email/Webhook/钉钉/企业微信/Slack/PagerDuty 等 receiver

## 🤔 Prometheus 如何调整，可以缩短告警延迟？  
- **缩短告警延迟主要调三个时间维度：①`scrape_interval`（抓取间隔：数据多久采一次）②`evaluation_interval`（规则评估间隔：多久检查一次告警条件）③Alertmanager 的 `group_wait`（分组等待）。默认延迟 ≈ `scrape_interval + evaluation_interval + 分组等待`。缩短 = 调小这些间隔（但要平衡资源开销）。**  
    - **告警延迟链路（延迟从哪来）**
        ```
        指标产生 → 被抓取（scrape_interval）→ 规则评估（evaluation_interval）→ 分组等待（group_wait）→ 通知
        ```
        - 最大延迟 ≈ 抓取间隔 + 评估间隔 + 分组等待 + 通知耗时（最坏上限，非确定值）；配了 `for: N` 需再加 N（可能成为主导项）

    - **可调的参数**
        - **`scrape_interval`**（抓取间隔）：Prometheus 抓取目标的频率（默认 15s→ 调小如 5s = 更快发现指标变化）
        - **`evaluation_interval`**（评估间隔）：规则（告警/记录）评估频率（默认 15s → 调小如 5s = 更快触发告警）
        - **Alertmanager `group_wait`**：分组等待时间（默认 30s → 调小 = 告警更快发送）
        - `group_interval`/`repeat_interval`：组内/重复通知间隔（调小可加快后续通知）
        - `for` 时长：告警持续时间（规则里 `for: 5m` 需持续才告警，调短 = 更快触发但可能误报）

    - **配置示例**
        ```yaml
        # prometheus.yml
        global:
          scrape_interval: 5s        # 调小抓取间隔
          evaluation_interval: 5s    # 调小评估间隔
        # alertmanager.yml
        route:
          group_wait: 5s             # 调小分组等待
        ```

    - **平衡（权衡）**
        - 间隔越小 → 告警越快，但抓取/评估/存储/资源开销越大
        - `for` 调短 → 触发快但可能误报（瞬时抖动触发）
        - 关键链路（核心服务）调小，一般服务保留默认

- **协助记忆**
    - 缩短告警："抓取间隔（scrape）、评估间隔（evaluate）、分组等待（group_wait）三处调小"。
    - 延迟公式："scrape + evaluation + group_wait"。

- **进阶思考**
    - **告警延迟能极限压到多短？**
        - 理论：scrape(最小几秒) + evaluation(几秒) + group_wait(0~几秒) ≈ 10~30s。再短受限于采集/评估开销和 Prometheus 设计（非实时事件系统）。真需要秒级告警用其他方案（如日志实时告警）。
    - **`for` 参数对告警延迟的影响？**
        - `for: 5m` 要求条件持续 5 分钟才告警——故意延迟（排除瞬时抖动）。要更快告警可调短/去掉 for，但要接受误报风险。
    - **缩短告警延迟的"代价"是什么？**
        - 资源开销（更频繁抓取/评估）、存储增长（更多样本）、告警噪音（for 调短误报）。所以"核心告警调快，非核心保持默认"是平衡策略。

- **扩展信息**
    - **全局配置**：`global.scrape_interval`、`global.evaluation_interval`、job 级可覆盖
    - **Alertmanager 时间**：`group_wait`、`group_interval`、`repeat_interval`

## 🤔 Alertmanager 高可用如何实现？  
- **Alertmanager 高可用：①多实例部署（多个 Alertmanager 副本）②`--cluster` 集群模式（实例间 gossip 同步告警状态）③前端负载均衡分发（Prometheus 配多个 Alertmanager）。核心：多个 Alertmanager 组成集群（相互同步），Prometheus 把告警发给多个（去重由集群内协调，不会重复发送）。**  
    - **实现方式**
        - **多副本部署**：跑多个 Alertmanager 实例（至少 2 个）
        - **集群模式**：实例间 `--cluster`（gossip 协议）同步"已通知/静默"状态
        - **Prometheus 侧**：配置多个 Alertmanager 地址（`alertmanager: [a1, a2]`），Prometheus 把告警发给全部实例（fan-out 全量发送，任一实例在都能处理；官方建议不设 LB，直接配完整地址列表）

    - **为什么不会重复告警**
        - Alertmanager 集群内通过 gossip 同步"谁已通知过"——同一告警在集群内只通知一次（谁来处理由集群协调；正常情况下不重复，网络分区时官方 fail-open——宁可重复不漏报）
        - 静默（silence）也在集群内同步——任一实例创建的静默对所有实例生效

    - **架构示意**
        ```
        Prometheus → Alertmanager A ├→ 通知（集群内只发一次）
                  → Alertmanager B ┘
                    （A/B 通过 gossip 同步状态）
        ```

    - **配置要点**
        ```yaml
        # prometheus.yml 配置多个 alertmanager
        alerting:
          alertmanagers:
            - static_configs:
                - targets: ['am1:9093', 'am2:9093']
        # 启动参数（每个 Alertmanager；--cluster.peer 填对端地址）
        alertmanager --cluster.listen-address=0.0.0.0:9094 --cluster.peer=am2:9094,am3:9094
        ```

- **协助记忆**
    - Alertmanager 高可用："多副本 + 集群（gossip 同步）+ Prometheus 配多地址"。
    - 关键："集群内状态同步 → 去重/静默一致，不重复通知"。

- **进阶思考**
    - **Alertmanager 集群用什么协议同步？**
        - gossip 协议（`--cluster` 端口 9094）：实例间交换告警处理状态、静默、通知记录。无主（AP），即使部分实例挂活集群仍工作（Prometheus 发到任一活实例即可）。
    - **没有集群（独立多实例）会重复告警吗？**
        - 会：两个独立 Alertmanager 各自处理 → 相同告警各发一次（重复）。所以高可用必须"集群模式"让它们协作去重，而非简单多实例。
    - **Alertmanager 挂了会怎样？**
        - 告警无法通知（但 Prometheus 本身正常、数据继续采集）。所以多副本 + 集群保证任一实例存活即可通知。

- **扩展信息**
    - **参数**：`--cluster.listen-address`（监听 9094）、`--cluster.peer`（对端）、`--cluster.peer-timeout` 等
    - **部署**：容器（kube-prometheus 里默认多副本）、系统服务
    - **注意**：集群建议奇数实例（如 3）也不严格（gossip 非 Raft 无选主）
## 🤔 简述 Exporter 开发思路和核心细节？  
- **Exporter 开发思路：①用官方 client library（`prometheus/client_golang`/Python/Java）②定义指标（名称/类型/标签）③采集数据（从被监控对象 API/命令/文件读取）④暴露 `/metrics` 端点 ⑤注意指标命名规范、标签基数和采集性能。核心：把被监控对象的信息"翻译"成 Prometheus 指标格式，被动等待抓取。**  
    - **开发思路（步骤）**
        - **① 选语言/库**：Go（`client_golang`，标准）、Python（`prometheus_client`）、Java（`simpleclient`）
        - **② 定义指标**：明确采集什么（Counter/Gauge/Histogram/Summary）、命名、标签
        - **③ 采集数据**：从被监控对象获取数据（调用 API、执行命令、读文件、订阅事件）
        - **④ 更新指标**：采集到的值 set 到定义的指标
        - **⑤ 暴露 HTTP**：提供 `/metrics` 端点（标准 Text 格式，含 `# HELP`/`# TYPE` 元数据行）
        - **⑥ 测试/优化**：`curl /metrics` 验证格式、promtool 校验、控制采集开销

    - **核心细节（写对的关键）**
        - **并发安全**：指标更新要考虑并发（多 goroutine 安全）
        - **采集性能**：采集开销别太大（目标 API 慢、查询重）——设采集超时/缓存
        - **标签基数控制**：不要用高基数标签（URL/用户 ID）——会导致 series 爆炸
        - **命名规范**：`_total` 后缀（Counter）、单位前缀（`node_`/`mysqld_`）、`_seconds`/`_bytes` 单位
        - **HELP/TYPE**：提供指标说明（HELP）和类型（TYPE），符合格式规范
        - **错误处理**：采集失败返回部分数据 + 暴露采集状态指标（各 exporter 惯例用 `*_up`，如 `mysql_up`）
        - **自动发现嵌入**：支持 Prometheus 直接抓取（HTTP），地址/路径可配置

    - **Go 示例（client_golang）**
        ```go
        cache := prometheus.NewGauge(prometheus.GaugeOpts{
            Name: "myapp_cache_used_bytes",
            Help: "Cache used bytes",
        })
        // /metrics handler
        http.Handle("/metrics", promhttp.Handler())
        ```

    - **规范要点（对 Go/官方库）**
        - `Counter` 用 `_total` 后缀、提供 `rate` 用
        - `promhttp.Handler()` 暴露标准格式
        - `prometheus.NewXxx` 定义 + `Registerer` 注册

- **协助记忆**
    - 开发五步："选库（client_library）→ 定义指标 → 采集数据 → 更新值 → 暴露 /metrics"。
    - 核心："命名规范（_total/单位）、控基数、并发安全、采集别太重"。

- **进阶思考**
    - **怎么保证 exporter 采集"不拖垮被监控对象"？**
        - 控制采集频率（scrape_interval）、采集超时、批量查询（一次 SQL/API 取多个指标）、缓存（低频变化的指标缓存）、异步采集（后台刷新指标，抓取只读缓存）。
    - **从零写一个 exporter 和用现成的怎么权衡？**
        - 先找现成（exporterhub.io）；没有现成且对象有 API/命令行 → 自写（client library 很简单）；只是探活 → blackbox。自写成本低但维护要跟上。
    - **exporter 暴露的指标怎么确保格式正确？**
        - 用官方库（格式自动正确）、`curl /metrics` + `promtool check metrics` 校验、对照 Prometheus 文档的指标命名/类型规范。

- **扩展信息**
    - **官方库**：`prometheus/client_golang`、`prometheus/client_python`、`prometheus/client_java`（+ simpleclient）
    - **指标格式**：`# HELP`/`# TYPE` + `<metric>{<label>=<value>} <value>`
    - **最佳实践**：http 超时控制、采集性能、`Gatherer` 并发安全（抓取时全量输出）

## 🤔 监控一个 MySQL 是怎么样的流程？  
- **监控 MySQL 的流程：①部署 `mysqld_exporter`（连 MySQL 采集指标）②创建专用监控账号（最小权限 `PROCESS`/`REPLICATION` 等）③配置 Prometheus 抓取（job + 认证）④配置 Grafana 面板 ⑤设置告警规则（连接数/慢查询/主从/性能）⑥监控验证与优化。核心：exporter 采集 → 抓取存储 → 面板展示 + 告警。**  
    - **第一步：部署 mysqld_exporter**
        - 下载/部署 `mysqld_exporter`（二进制/容器）
        - 配置数据源：`DATA_SOURCE_NAME`（连接字符串）或配置文件
        - 启动后暴露 `:9104/metrics`

    - **第二步：创建监控账号（最小权限）**
        ```sql
        CREATE USER 'exporter'@'localhost' IDENTIFIED BY 'xxx' WITH MAX_USER_CONNECTIONS 3;
        GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'localhost';
        ```
        - 权限最小化（只读监控所需权限，不用 root）；`MAX_USER_CONNECTIONS` 限制连接数防监控挤占业务连接

    - **第三步：Prometheus 配置抓取**
        ```yaml
        scrape_configs:
          - job_name: mysql
            static_configs:
              - targets: ['db1:9104']
        ```
        - 多实例：每个 MySQL 一个 exporter（或共享）

    - **第四步：Grafana 面板**
        - 使用官方 dashboards（`mysqld_exporter` 面板：ID 7362 等）导入
        - 或自建面板（连接数/查询/缓冲池/主从状态）

    - **第五步：告警规则**
        ```promql
        # 连接数过高
        mysql_global_status_threads_connected / mysql_global_variables_max_connections > 0.8
        # 主从延迟
        mysql_slave_status_seconds_behind_master > 30
        # 慢查询增长
        rate(mysql_global_status_slow_queries[5m]) > 10
        ```

    - **第六步：验证与优化**
        - `curl localhost:9104/metrics` 看指标是否采集
        - Grafana 看面板数据，Prometheus 查 `up{job="mysql"}` 确认抓取
        - 优化：采集频率、指标数量（不需要的 relabel 掉）、告警阈值调优

- **协助记忆**
    - MySQL 监控流程："装 exporter → 建账号（最小权限）→ 配抓取 → 面板 → 告警 → 验证"。
    - 口令："exporter 采、Prometheus 存、Grafana 看、Alert 告"。

- **进阶思考**
    - **监控账号为什么不用 root？**
        - 最小权限原则：只用监控所需权限（READ PROCESS/REPLICATION CLIENT/SELECT），即使账号泄露也不能改库——降低风险。
    - **主从复制监控重点看什么？**
        - `mysql_slave_status_seconds_behind_master`（延迟秒数）、`Slave_IO_Running`/`Slave_SQL_Running`（IO/SQL 线程状态，变成 NO 说明主从断了）。主从异常是最常见的 MySQL 故障。
    - **哪些 MySQL 指标最重要（监控优先级）？**
        - 可用性（`up`）、连接数（vs max_connections）、慢查询速率、主从状态/延迟、Buffer Pool 命中率、InnoDB 状态、磁盘/存储（表空间）、QPS/TPS。先保"可用性 + 连接 + 主从 + 慢查询"。

- **扩展信息**
    - **常用指标**：`mysql_global_status_threads_connected`、`mysql_global_variables_max_connections`、`mysql_global_status_slow_queries`、`mysql_slave_status_seconds_behind_master`、`mysql_global_status_innodb_buffer_pool*`
    - **高可用监控**：`mysqld_exporter` 支持多实例（不同 data-source）、主从一键接入

## 🤔 新上 100 台服务器，Prometheus 如何快速接入监控？  
- **新上 100 台服务器快速接入 Prometheus 监控的思路：①批量部署 `node_exporter`（Ansible/Puppet/云镜像）②统一目标清单（`file_sd` 文件服务发现/`consul_sd` 接入 CMDB）③Prometheus 自动加载（`reload`/热加载）④Grafana 用模板面板 ⑤基础告警规则覆盖。核心："批量部署 exporter + 服务发现自动纳管 + 模板化展示"。**  
    - **第一步：批量部署 node_exporter**
        - 用 Ansible playbook 批量在 100 台装 `node_exporter`（二进制/包/容器）
        - 或：云镜像预装（imTemplate）、容器化（K8s DaemonSet）
        - 开机自启（systemd）、监听统一端口（9100）

    - **第二步：目标自动发现（不用手工加 100 台）**
        - **`file_sd`**：脚本/CMDB 生成主机清单 JSON → Prometheus 自动加载（推荐简单场景）
        ```yaml
        scrape_configs:
          - job_name: node
            file_sd_configs:
              - files: ['/etc/prometheus/targets/node/*.json']
        ```
        - **`consul_sd`**：主机注册到 Consul → 自动发现
        - **静态 + reload**：遇到手工配置（少临时，100 台不建议）

    - **第三步：Prometheus 热加载**
        - `kill -HUP <pid>` 或 `POST /-/reload`（配 `--web.enable-lifecycle`）
        - 或周期性 reload（`--web.enable-lifecycle` + `systemctl reload`）
        - file_sd 自动检测文件变化无需手动 reload

    - **第四步：Grafana 模板**
        - 导入官方 `Node Exporter Full` 面板（ID 1860）——一组面板覆盖所有主机
        - 用变量（`instance`）切换主机，一个面板看 100 台

    - **第五步：基础告警**
        - 集群基础告警规则：`up == 0`（主机挂）、CPU 高、磁盘高（`node_filesystem_avail_bytes / size < 0.1`）、内存高、负载高
        - 规则文件批量应用（rule files）

- **协助记忆**
    - 快速接入："Ansible 批量装 exporter → file_sd/consul 自动发现 → reload → 模板面板 → 基础告警"。
    - 核心："别手工加目标（100 台要自动化），用服务发现"。

- **进阶思考**
    - **为什么 100 台不能用"手工加 static_configs"？**
        - 100 台手写目标容易错、维护成本高、且新机/下机无法自动更新。
        - 服务发现（file_sd/consul）让"目标列表"自动化（从 CMDB/脚本生成），新增机器自动纳入。
    - **`file_sd` 和 `consul_sd` 怎么选？**
        - 有 CMDB/清单文件 → file_sd（简单，脚本输出 json）；已有 Consul 注册中心 → consul_sd（统一注册发现）；云环境主机 → 云 SD（ec2_sd 等）。按现有基础设施选。
    - **批量部署 node_exporter 有什么坑？**
        - 端口冲突（都用 9100 需确认）、认证（exporter 无认证需网络隔离）、防火墙放行 9100、版本一致、systemd 自启。用配置管理工具（Ansible）统一处理。

- **扩展信息**
    - **Ansible 批量部署示例思路**：hosts（新 100 台）→ role: node_exporter（下载/安装/systemd/启动）
    - **file_sd JSON 格式**：`[{"targets": ["ip:9100"], "labels": {"env":"prod"}}]`
    - **Grafana 变量**：面板加 `instance` 变量下拉切换主机

## 🤔 Prometheus 性能调优的核心手段有哪些？  
- **Prometheus 性能调优核心：①控制标签基数（series 数量）②优化抓取（频率/指标过滤）③预聚合（recording rule）④查询优化（标签过滤/时间范围）⑤存储调优（retention/压缩）⑥分片/分布式（联邦/Thanos）⑦资源分配（内存/磁盘 IO）。核心：减 series、减抓取量、预聚合、分布式。**  
    - **① 控制基数（最大头）**
        - 避免高基数标签（URL/用户 ID/随机串）——用 `metric_relabel_configs` 删除高基数标签/丢弃样本（不能聚合，聚合用 recording rule）
        - 控制标签数（标签多了 series 组合爆炸）
        - 定期 `promtool tsdb analyze` 检查

    - **② 优化抓取**
        - 调大 `scrape_interval`（如 15s→30s/60s，非关键指标）
        - `metric_relabel_configs` 过滤不需要的指标（少采）
        - 减少 target 数（合并/用服务发现收敛）

    - **③ 预聚合（recording rule）**
        - 高频查询的表达式预先算好存指标（`recording rules`）——查询快，减少重复计算
        - 例：`job:request_rate:sum = sum(rate(http_requests[5m]))` 预计算存储

    - **④ 查询优化**
        - 查询加标签过滤（`{job="x"}`）、限时间范围（少扫历史）
        - 避免大范围 `sum` 无过滤、避免高基数子查询
        - `--query.max-concurrency`/`--query.timeout` 控制

    - **⑤ 存储/资源调优**
        - `retention` 合理（时间/大小上限）
        - 磁盘 IO（SSD）、内存分配（`GOMEMLIMIT`/容器限制）
        - WAL 压缩（`--storage.tsdb.wal-compression`）

    - **⑥ 架构扩展（治本）**
        - **分片**：多 Prometheus 按职责/区域分（各管一部分目标）
        - **联邦**：层级聚合
        - **远端**：Thanos/VictoriaMetrics（数据/查询分担）

- **协助记忆**
    - 调优口诀："控基数、限抓取、预聚合（recording）、优查询、扩架构（分片/外部）"。
    - 优先级："基数 > 抓取 > 预聚合 > 查询 > 架构"。

- **进阶思考**
    - **什么情况下"加内存/加磁盘"就能解决性能问题？**
        - 中小规模、数据增长率一般时，加资源立竿见影。但高基数/海量数据时加资源只是拖延——必须控基数/分片。判断：`promtool tsdb analyze` 看 series 数，基数爆炸就要架构调整。
    - **recording rule 为什么能大幅提速？**
        - 把耗时的复杂表达式（多次聚合）预先算好存指标，查询直接读结果——避免每次查询重新计算。适合"高频且重复"的查询（如 dashboard 常用的聚合）。
    - **什么时候分片（多 Prometheus）？**
        - 单 Prometheus 扛不住（采集量大/查询慢/资源紧张）时：按业务/区域/职责拆多实例，每台管一部分（数据隔离+资源分摊）；配合联邦/Thanos 统一查询。

- **扩展信息**
    - **参数**：`--query.max-concurrency`、`--storage.tsdb.retention.*`、`--storage.tsdb.wal-compression`、`GOMEMLIMIT`、`GOGC`
    - **工具**：`promtool tsdb analyze`（基数/块分析）、Grafana Prometheus 自查面板、`curl /metrics` 体积检查

## 🤔 监控上千台服务器，如何保障 Prometheus 稳定运行？  
- **监控上千台服务器保障 Prometheus 稳定：①合理容量规划（内存/磁盘/采集量）②控制基数与采集量（relabel 过滤/降频）③分片/多 Prometheus 分摊（按区域/职责）④Thanos 统一查询/长期存储（数据/查询解耦）⑤监控 Prometheus 自身（自监控：`up`/内存/查询延迟）⑥告警/参数优化（慢查询、超时）。核心："减数据（基数/采集）+ 分摊（分片/外部）+ 自监控"。**  
    - **① 容量规划（先知容量）**
        - 估算：target 数 × 指标数 × 采样频率 × 保留期 = 数据量
        - 内存 ≈ series 数相关（每系列常驻内存）、磁盘随保留增长
        - 预留余量（建议只用到约 50% 容量，超水位告警）

    - **② 控制采集与基数**
        - `relabel`/`metric_relabel` 过滤高基数标签、减少无用指标
        - `scrape_interval` 合理（非关键 30s/60s）
        - `promtool tsdb analyze` 定期检查基数/爆炸

    - **③ 分片（多 Prometheus）**
        - 按区域/业务/职责拆多实例（每台管几百台目标，数据分摊）
        - 数据隔离 + 资源分摊（单机不超载）

    - **④ Thanos/Victoria 统一视图**
        - 多 Prometheus 通过 Thanos（S3 + Querier）统一查询/长期存储
        - 或 VictoriaMetrics 收 remote_write
        - 上层只用一套查询（Grafana 连 Querier/VM），Prometheus 只管采集

    - **⑤ 自监控（监控 Prometheus）**
        - Prometheus 监控自己（`up`/内存/系列数/抓取失败/查询延迟）
        - 关键自监控告警：Prometheus 挂了、抓取失败率高、内存高、查询慢
        - `Prometheus Operator`（K8s）或手工配置

    - **⑥ 参数/稳定性优化**
        - `--storage.tsdb.wal-compression`（WAL 压缩省磁盘）
        - 限制查询（`--query.max-concurrency`、timeout）防查询拖垮
        - 磁盘 SSD + 充足内存
        - 告警规则别过多（rule 评估开销）

- **协助记忆**
    - 千台稳定："容量规划、控基数、分片分摊、Thanos 统一、自监控、参数优"。
    - 核心："数据减不下来就分片，统一查询靠 Thanos，别忘了监控监控自己"。

- **进阶思考**
    - **上千台为什么要分片而不是一个大 Prometheus？**
        - 单实例内存/磁盘/查询有天花板，上千台 target + 海量 series 会把单 Prometheus 压垮（OOM/查询慢）。分片把负载分散到多个实例（资源分摊+故障隔离），这是规模化的必经之路。
    - **多 Prometheus 后"查询分散"怎么办？**
        - Thanos Querier 统一查询（跨实例聚合）；VictoriaMetrics 收 remote_write 统一存储；上层 Grafana 连统一查询层即可，用户只有一个视图。
    - **怎么发现 Prometheus 自己出问题？**
        - 自监控：Prometheus 抓自己的 `/metrics`（`up`/`process_resident_memory_bytes`/`tsdb_head_series`/`prometheus_tsdb_*`），配告警（进程挂/内存高/抓取失败率高/查询慢）。用 Grafana 自带 Prometheus 自检面板。

- **扩展信息**
    - **规模参考**：单 Prometheus 常见可管数百万 series（内存主导：16GB 内存跑数百万 series 为社区共识），具体用 `promtool tsdb analyze` 评估
    - **模式**：采集层（多 Prometheus）+ 查询层（Thanos/VM）解耦——标准规模化架构

## 🤔 Prometheus 的 Pull 模型相比 Push 模型优缺点？  
- **Prometheus 的 Pull（拉取）模型：Prometheus 主动按间隔从目标（exporter）拉指标；对比 Push（推送，如 Pushgateway/InfluxDB 风格）：Pull 优点——①控制权在监控端（知道目标、可调频率/超时）②故障发现（目标挂了 `up=0`，延迟一个抓取周期）③调试直观（curl /metrics）④安全（监控端发起、目标只暴露只读端点）；缺点——①目标需在线暴露端点（否则 up=0）②防火墙/NAT 场景难③短任务无法拉（配 Pushgateway）。核心：Pull 更可靠可探活，Push 适合短任务/网络受限。**  
    - **Pull 模型特点（Prometheus 默认）**
        - Prometheus 主动按 `scrape_interval` 从目标拉取
        - 监控端控制：知道有哪些目标、间隔、超时

    - **Pull 优点**
        - **探活信息**：抓不到目标 → `up == 0`（自动发现目标挂了）
        - **控制权在监控端**：频率/超时/重试可控
        - **调试直观**：`curl http://target:9100/metrics` 直接看
        - **安全**：目标只需开放 /metrics（只读、无状态），监控端发起到目标
        - **目标简化**：exporter 无状态、无推送逻辑

    - **Pull 缺点**
        - **目标需暴露端点**：必须开放 /metrics 端口（网络可达）
        - **网络受限/NAT/防火墙**：监控端到目标不通则无法拉（跨网段/公网难）
        - **短任务无法拉**：批处理/定时任务瞬间结束，来不及被拉（需 Pushgateway 补）
        - **目标量大时拉取开销**（监控端发起大量连接）

    - **Push 模型特点（对比）**
        - 目标主动把指标推送到监控端/网关（Pushgateway/InfluxDB 风格）
        - 适合：短任务、防火墙后目标、需要目标主动上报（IoT 设备）
        - 缺点：监控端不知道目标（探活难）、无统一控制、push 无认证风险、目标可能乱发

    - **对照**
        | 维度 | Pull（Prometheus） | Push |
        |------|-------------------|------|
        | 控制 | 监控端控制 | 目标主动 |
        | 探活 | 拉不到=挂了（up=0） | 难（不知道谁来） |
        | 网络 | 需目标暴露端点 | 目标能连即可 |
        | 短任务 | 不支持（靠 Pushgateway） | 适合 |
        | 调试 | curl /metrics 方便 | 需看网关 |

- **协助记忆**
    - Pull 口诀："监控端拉（可控/可探活/可调）、目标暴露端点、短任务靠 Pushgateway"。
    - 定位："Pull 是 Prometheus 的设计正统，Push 是短任务/受限网络的补丁"。

- **进阶思考**
    - **为什么 Prometheus 坚持 Pull 而不是全用 Push？**
        - Pull 让监控端"掌控全局"：目标列表（谁在监控）、间隔、超时、探活（up=0 立即发现故障）都归一监控端。Push 这些都没有（不知道目标、无法探活、无法统一控制）。这也是 Prometheus 设计哲学（黑盒从拉取探测）。
    - **Pull 模型遇到"防火墙后/公网目标"怎么解决？**
        - 目标不支持被拉时：①Pushgateway（目标推给它，Prometheus 拉它）②exporter 背后加"反向拉取"代理③网络打通（VPN/隧道）④云 SD 走内网。实际多为内网目标（Pull 都通），公网目标少。
    - **Pull 和 Push 能混用吗？**
        - 能：Prometheus 以 Pull 为主（标准 exporter 被拉）+ 短任务用 Pushgateway Push；也可 remote_write 推给后端（那是"Prometheus 对外推"）。核心目标是拉，Push 是补充。

- **扩展信息**
    - **相关场景**：`blackbox_exporter`（Pull 探测）、`Pushgateway`（Push 短任务）、`remote_write`（Prometheus 推送后端）
    - **对比系统**：InfluxDB（Push 风格）、Zabbix（Agent 主动/被动）
## 🤔 Prometheus 如何实现对 Kubernetes 集群自动发现监控？  
- **Prometheus 对 K8s 自动发现的核心：`kubernetes_sd_configs` 按角色（`node`/`pod`/`service`/`endpoints`/`ingress`）发现监控目标，配合 `relabel_configs` 从 `__meta_kubernetes_*` 元标签筛选/打业务标签。典型：node 角色监控节点（`node_exporter`）、pod 角色监控应用容器、endpoints 监控 Service。**  
    - **服务发现（kubernetes_sd）**
        - Prometheus 通过 K8s API 自动发现集群对象（不用手工配置目标）
        - 角色（role）：
            - `node`：发现所有节点（配 node_exporter 监控主机）
            - `pod`：发现所有 Pod（监控容器/应用指标）
            - `service`：发现 Service（监控服务端点）
            - `endpoints`/`endpointslices`：发现 Service 的端点（细粒度）
            - `ingress`：发现 Ingress
        - 每个角色产生 `__meta_kubernetes_*` 元标签（命名空间/名称/标签等）

    - **结合 relabel（筛选/打标）**
        ```yaml
        scrape_configs:
          - job_name: kubernetes-pods
            kubernetes_sd_configs:
              - role: pod
            relabel_configs:
              # 只采打了 prometheus.io/scrape=true 的 Pod
              - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                regex: "true"
                action: keep
              # 元标签转业务标签
              - source_labels: [__meta_kubernetes_pod_label_app]
                target_label: app
        ```

    - **典型监控场景**
        - **节点监控**：`role: node` + `node_exporter`（`:9100/metrics`）
        - **应用/容器监控**：`role: pod` + 应用暴露 `/metrics`（按注解 `prometheus.io/scrape=true` 筛选）
        - **Service 监控**：`role: service`/`endpoints`（按 Service 端口采集）
        - **K8s 自身**：`kube-state-metrics`（对象状态）、cadvisor/Kubelet `/metrics`

    - **监控矩阵（常用组合）**
        | 监控对象 | role | 采集源 |
        |---------|------|--------|
        | 节点指标 | node | node_exporter |
        | 容器资源 | node/endpoints+kubelet | Kubelet `/metrics/cadvisor` |
        | 应用指标 | pod/endpoints | 应用 `/metrics` |
        | K8s 对象状态 | （kube-state-metrics 暴露）| ksm `/metrics` |
        | 集群组件 | endpoints 角色（kubelet 等）| Kubelet/组件 `/metrics`（etcd 通常独立直连） |

- **协助记忆**
    - K8s 发现口诀："`kubernetes_sd` + role（node/pod/service/endpoints）+ relabel 打标筛选"。
    - 场景：节点用 node+node_exporter，应用用 pod+注解筛选，K8s 状态用 kube-state-metrics。

- **进阶思考**
    - **为什么要用"注解筛选"（prometheus.io/scrape=true）？**
        - 不是所有 Pod 都要被监控（有的无 /metrics）。约定：打上 `prometheus.io/scrape=true` 注解的 Pod 才被采集（keep 筛选）——避免给所有 Pod 抓取（浪费/噪音），也便于开发者自助开放监控。
    - **`role: pod` 和 `role: endpoints` 有什么区别？**
        - pod：发现每个 Pod（适合直接抓 Pod）；endpoints：发现 Service 的端点（适合抓 Service 对应的 Pod，可带 Service 语义）。Service 监控通常用 endpoints（拿 Service 名称作为分组）。
    - **Prometheus 权限怎么配（RBAC）？**
        - Prometheus 需 RBAC：`ServiceAccount` + `ClusterRole`（`list`/`watch` nodes/pods/services/endpoints）+ `ClusterRoleBinding`（kube-prometheus 已内置）。否则无法调 K8s API 做服务发现。

- **扩展信息**
    - **元标签示例**：`__meta_kubernetes_pod_label_app`、`__meta_kubernetes_namespace`、`__meta_kubernetes_pod_annotation_prometheus_io_scrape`
    - **部署**：kube-prometheus stack（Prometheus Operator 全套）、Helm chart

## 🤔 Prometheus 查询突然变慢，可能的原因与排查思路？  
- **Prometheus 查询突然变慢的原因：①数据量增大（target/指标/基数上升）②高基数查询（大量 series 扫描）③无过滤大范围查询（全量 sum/长时段）④资源不足（内存/CPU 被采集挤压）⑤规则（recording/alert）过重拖累。排查：分场景看（全变慢 vs 单查询变慢），用查询日志/top 定位，控基数/限范围/预聚合解决。**  
    - **常见原因分类**
        - **数据量增长**：target 增加、指标增加、采集频率调小（数据量↑）
        - **基数膨胀**：高基数标签引入（新版本加了 URL/用户 ID 标签）→ series 暴涨 → 查询扫描多
        - **查询本身重**：无过滤的 `sum`、大时间范围（扫全部历史 block）、`*` 全选（如 `{__name__=~...}`）
        - **资源被挤占**：采集/写入占内存/CPU，查询被饿
        - **规则重**：recording/alert 规则多且重（评估占资源）
        - **并发查询多**：Grafana 面板同时多查询

    - **排查思路（分场景）**
        - **全查询变慢**：看资源（内存/CPU/磁盘 IO）是否吃紧 → 数据量/资源问题
        - **部分查询变慢**：看查询表达式（是否高基数/大范围）→ 查询问题
        - **新增查询变慢**：新规则/新面板引入的重查询 → 预聚合

    - **定位手段**
        - Prometheus 开启查询日志（`--query.log-file`）看慢查询；`--query.max-samples` 超限报错
        - `curl /api/v1/query` 手动测各表达式耗时
        - `promtool tsdb analyze`（基数/块分析）
        - Grafana 面板逐个查（定位是哪条查询慢）
        - 监控 Prometheus 自身：`prometheus_engine_queries`、`rate(prometheus_tsdb_head_series)`

    - **解决方案**
        - **控基数**：relabel 删高基数标签（治本）
        - **限查询**：加标签过滤、限时间范围、避免 `*` 全选
        - **预聚合**：慢查询改 recording rule（预先算好）
        - **加资源**：内存/CPU/SSD（数据量正常但资源不足时）
        - **缩范围**：查询页/面板默认只查近期（而非全部保留期）

- **协助记忆**
    - 查询慢排查："数据涨？基数涨？查询重？资源紧？规则重？——用查询日志/tsdb analyze 定位，控基数/预聚合解决"。
    - 口诀："先分场景（全慢 vs 单慢），再看数据/查询/资源，最后控基数/预聚合"。

- **进阶思考**
    - **"突然变慢"通常是哪些原因（怎么快断）？**
        - 突然变慢（而非渐进）：①新发布引入了高基数标签（series 暴涨）②新面板/规则加了重查询 ③采集量突增（新 target/改频率）④资源被其他进程挤压。优先查：series 数趋势、新增查询/规则、资源占用。
    - **为什么"无过滤 sum"会慢？**
        - `sum(rate(metric[5m]))` 不带标签过滤 = 扫全部该指标的 series（全量）。series 多时扫描量大（且要加载到内存）。加过滤（`{job=...}`）或按维度聚合（`sum by`）大幅减少扫描。
    - **查询慢和 OOM 有关系吗？**
        - 有关：重查询会临时加载大量 series 到内存（`--query.max-samples` 超限或内存峰值），并发重查询可能引发 OOM。所以限制查询并发/样本是稳定性的重要一环。

- **扩展信息**
    - **相关参数**：`--query.max-concurrency`（并发查询数）、`--query.timeout`（查询超时）、`--query.max-samples`（样本上限）
    - **自查指标**：`prometheus_engine_queries`、`prometheus_tsdb_head_series`、`process_resident_memory_bytes`

## 🤔 如何评估 Prometheus 集群的容量？  
- **Prometheus 容量评估核心看四维：①series 数（内存主导，`promtool tsdb analyze`）②摄入速率（每秒样本数 = target×指标×频率，决定 CPU/写入）③磁盘（样本数×保留期×压缩比）④查询负载（并发/复杂度）。估算法：`每秒样本数 × 保留秒数 × 每样本字节` 等，再按目标/指标/频率核算。**  
    - **四维评估（核心）**
        - **① Series 数（最重要，内存主导）**：唯一"指标+标签组合"数。用 `promtool tsdb analyze`/`count(series)` 实测。内存 ≈ series 数 × 每系列开销（常见每百万 series 需数 GB 内存经验值）
        - **② 摄入速率（CPU/写入）**：每秒抓取的样本数 = target 数 × 每 target 指标数 × （1/抓取间隔）。决定 CPU 和写入吞吐
        - **③ 磁盘（存储）**：总样本数 = 摄入速率 × 保留时间；磁盘 = 样本数 × 每样本大小（压缩后 ~1~2 字节，经验）。高基数则磁盘暴涨
        - **④ 查询负载**：并发查询、复杂 PromQL（影响 CPU/内存）

    - **估算公式（经验）**
        ```
        每秒样本 = Σ(target 数 × 每 target 序列数) / scrape_interval
        总序列 = target 数 × 每 target 序列数（≈ series 数）
        磁盘 ≈ 每秒样本 × 保留秒数 × ~1.5 字节（压缩后经验值）
        内存 ≈ series 数 × 每系列内存（微量级，百万 series 约数 GB 经验）
        ```

    - **评估步骤**
        - ① 实测当前：`promtool tsdb analyze`（series 数/块）、Prometheus 自指标（`tsdb_head_series`、`tsdb_head_samples_appended_total`）
        - ② 预测增长：目标增加数 × 每目标指标数（新业务/扩机器）
        - ③ 按保留期算磁盘、按 series 算内存
        - ④ 对比硬件（内存/磁盘/CPU），留余量（>50%）

    - **优化容量**
        - 控基数（最多减 series）
        - 调 scrape_interval（降摄入）
        - 缩短保留期/降采样（外部存储）
        - 分片/Thanos（分摊）

- **协助记忆**
    - 容量四维："series（内存）、摄入（CPU）、磁盘（保留）、查询（负载）"。
    - 估法："每 target 序列 × target 数 = series；series × 压缩大小 × 保留 = 磁盘；series × 每系列内存 = 内存"。

- **进阶思考**
    - **为什么 series 数是"第一指标"（决定内存/存储）？**
        - 每个 series 都要在内存建索引 + 存储序列，series 数直接线性决定内存和磁盘（基数爆炸是最快撑爆容量的）。所以容量评估先测 series、控制基数。
    - **怎么预测"未来容量"（新业务上线前）？**
        - 预估：新 target 数 × 平均每 target 序列数（参考现有）+ 抓取频率 → 新增 series/摄入 → 折合内存/磁盘增量。最好在小环境压测验证。
    - **"余量 50%"实践指什么？**
        - 容量要留缓冲（突发流量/查询峰值/新业务）：评估容量建议只用到 50% 左右（如内存目标 50% 水位），超过即告警/扩容/优化。

- **扩展信息**
    - **工具**：`promtool tsdb analyze`、Grafana Prometheus 自身容量面板、`prometheus_tsdb_*` 指标
    - **经验值**：每 target 通常几十~几百序列（node_exporter ~数百、应用依实现）；压缩后每样本 ~1~2 字节（经验）

## 🤔 Grafana 图表不显示数据，怎么排查？  
- **Grafana 图表不显示数据的排查：①先看数据源（Prometheus 通不通）②Panel 查询是否返回数据（`query inspector` 测试）③时间范围/标签匹配是否对 ④指标名/单位/min step 是否对 ⑤权限/数据源变量。排查链路："数据源 → 查询 → 时间 → 标签 → 面板配置"逐层验证。**  
    - **第一步：数据源是否正常**
        - Grafana → 数据源（Prometheus）→ Test（能否连通）
        - Prometheus 数据源 URL/认证是否正确、版本兼容
        - Prometheus 自身 `up` 是否正常（Grafana 能连但 Prometheus 没数据）

    - **第二步：查询是否返回数据**
        - 面板编辑 → Query → 手动执行查询看返回（无数据 = 查询问题）
        - 用 **Inspect**（快捷键 `i`）→ Query 标签看原始请求/响应
        - 直接到 Prometheus 的 Graph/`curl /api/v1/query` 验证表达式

    - **第三步：时间范围**
        - 时间范围太短/太久（数据不在范围内）
        - 时区/时间手选（`now-1h` vs 固定日期）
        - Panel 的 `min step`（步长太大跨掉数据）

    - **第四步：标签/指标匹配**
        - 指标名拼错（`node_cpu` vs `node_cpu_seconds_total`）
        - 标签选择器不匹配（`{job="x"}` 实际 job 不同）
        - 用了 `{__name__=~"x|y"}` 语法错
        - PromQL 语法错误（Grafana 报错）

    - **第五步：其他**
        - 数据源变量（模板变量选的值无数据）
        - 面板权限（只读仪表盘但无查询权限）
        - Prometheus 数据未采集（目标挂了 `up=0`）
        - 浏览器缓存/时区

- **协助记忆**
    - Grafana 排查口诀："数据源先测、查询验证（Query Inspector）、时间范围、标签匹配、面板配置"。
    - 链路："数据源 → 查询语句 → 时间 → 标签 → 配置"。

- **进阶思考**
    - **怎么用 Query Inspector 快速定位？**
        - 面板 Edit → Inspect（Query）→ 看实际执行的请求（指标/标签/时间/原始响应）——直接在浏览器看 Prometheus 返回了什么（空/错误/数据），一步定位是"查询错"还是"数据源/时间"问题。
    - **Prometheus 有数据但 Grafana 不显示，常见坑？**
        - ①查询里变量引用错（`$var` 未定义/选空）②时间范围未覆盖数据（数据是旧的，面板默认 now-6h）③`min step` 太大（采样间隔长且步长大）④数据源 URL 配错（Grafana 连到另一个 Prometheus）⑤PromQL 语法错（如括号/引号、标签选择器语法）。
    - **数据源 "No data" 和 "Query error" 区别？**
        - No data：查询正常执行但无匹配数据（时间/标签/指标名问题）；Query error：查询本身报错（语法/超时/数据源问题）。先看报错类型再定位。

- **扩展信息**
    - **排查工具**：Prometheus Graph（原生查）、`curl 'http://prom:9090/api/v1/query?query=xxx'`、Grafana Query Inspector
    - **变量**：数据源变量（`$datasource`）、模板变量（`$instance` 等）—面板多选/筛选

## 🤔 Prometheus Operator 是什么？解决了什么问题？  
- **Prometheus Operator 是"用 K8s 原生方式（CRD/Controller）管理 Prometheus 生态"的工具：通过自定义资源（`Prometheus`/`ServiceMonitor`/`PodMonitor`/`Alertmanager`/`PrometheusRule`）声明式地管理监控栈，解决"K8s 里监控配置复杂、手工管理难"的问题——自动部署、自动发现目标（ServiceMonitor 声明式）、自动注入告警规则、自动配置 Alertmanager。**  
    - **是什么（定义）**
        - Operator 模式：用 K8s Controller + CRD 管理应用（运维逻辑代码化）
        - Prometheus Operator：管理 Prometheus/Alertmanager 生命周期 + 监控配置（目标/规则）
        - 部署后：创建 `Prometheus` CR → Operator 自动起 Prometheus 集群

    - **核心 CRD（自定义资源）**
        - **`Prometheus`**：声明 Prometheus 实例（版本/存储/资源/保留期）——Operator 自动部署/管理
        - **`ServiceMonitor`**：声明"监控哪些 Service"（选择器 + 端点 + 间隔）——自动生成抓取配置（替代手写 static_configs）
        - **`PodMonitor`**：声明"监控哪些 Pod"（类似 ServiceMonitor 但按 Pod）
        - **`PrometheusRule`**：声明告警/记录规则（替代手写 rule files）
        - **`Alertmanager`**：声明 Alertmanager 实例（高可用/配置）
        - **`Probe`**：blackbox 探活目标声明
        - 补充：`ScrapeConfig`（v0.68+，直接声明抓取配置，逐步主推）、`AlertmanagerConfig`（告警路由配置）、`ThanosRuler`（Thanos 规则）

    - **解决了什么问题**
        - **配置声明化**：监控目标（ServiceMonitor）、规则（PrometheusRule）用 YAML CR 声明，GitOps 可管理
        - **自动部署**：Prometheus/Alertmanager 生命周期（扩缩容/升级/高可用）由 Operator 管理
        - **自动发现目标**：新的 ServiceMonitor 创建 → 自动抓取（无需手工改 Prometheus 配置）
        - **K8s 原生集成**：与 K8s 服务发现/RBAC 天然结合
        - **可观测运维简单化**：一套 CR 管理监控栈（kube-prometheus stack 提供了全套）

    - **工作流程**
        ```
        创建 ServiceMonitor（声明监控某 Service）→ Operator 监听 → 生成 Prometheus 抓取配置 → 自动抓取
        创建 PrometheusRule → Operator → 注入告警规则 → 评估/告警
        ```

- **协助记忆**
    - Operator = "用 CRD 管理监控栈"：`Prometheus`（实例）、`ServiceMonitor`（目标）、`PrometheusRule`（规则）、`Alertmanager`（告警）。
    - 价值："声明式配置监控，自动部署 + 自动发现 + GitOps 友好"。

- **进阶思考**
    - **ServiceMonitor 和直接写 scrape_configs 的区别？**
        - 手写：改 Prometheus 配置文件 + reload。ServiceMonitor：创建 CR（选择器找 Service）→ Operator 自动生成抓取配置并应用——声明式、自动、可 GitOps、无需手工改配置。
    - **Prometheus Operator 和 kube-prometheus 是什么关系？**
        - kube-prometheus 是基于 Prometheus Operator 的"全家桶 stack"：Operator + Prometheus + Alertmanager + Grafana + node-exporter + kube-state-metrics + 默认告警规则，一键部署 K8s 监控全套。
    - **ServiceMonitor 的"选择器"怎么工作？**
        - 选择器按 label 匹配 Service/Pod（如 `matchLabels: {app: myapp}`）——匹配到的 Service 暴露的 metrics 端点自动被抓取。开发者只需给 Service 打 label + 暴露 /metrics。

- **扩展信息**
    - **kube-prometheus stack**：官方推荐的全套部署（Operator+CR 管理）
    - **基础监控**：默认带 node-exporter/kube-state-metrics/K8s 组件监控 + 告警规则
    - **相关 CRD**：Prometheus、Alertmanager、ServiceMonitor、PodMonitor、PrometheusRule、Probe

## 🤔 Prometheus 与 Zabbix 有什么区别？  
- **Prometheus 与 Zabbix 的核心区别：①采集模型（Prometheus：Pull 拉取/exporter；Zabbix：Agent 主动/被动上报）②定位（Prometheus：云原生/容器/动态环境、Metrics 驱动；Zabbix：传统主机/网络、全栈监控）③存储（Prometheus：本地 TSDB；Zabbix：数据库 MySQL/PostgreSQL）④告警（Prometheus：规则+Alertmanager；Zabbix：触发器+动作）⑤适用（Prometheus 适合云原生/容器/K8s 场景；Zabbix 适合传统主机/网络/基础设施）。两者互补，按环境选型。**  
    - **采集模型（最大的区别）**
        - **Prometheus：Pull（拉取）**——Prometheus 主动从 exporter 拉指标（监控端控制，容器/云原生友好）
        - **Zabbix：Agent（被动/主动上报）**——Zabbix Server 轮询 Agent（被动），或 Agent 主动上报（主动）；有 Agent 常驻

    - **定位与场景**
        - `Prometheus`：**云原生/容器/K8s**（服务发现、动态环境）、以"指标（Metrics）"为主
        - `Zabbix`：**传统基础设施**（主机/网络设备/SNMP/IPMI）、全栈（指标 + 日志 + 网络发现在一个平台）

    - **存储**
        - `Prometheus`：本地 TSDB（时序库，高效压缩，配合 Thanos/VM 扩展）
        - `Zabbix`：关系数据库（MySQL/PostgreSQL）+ 分区（历史/趋势表），数据量大时库压力大

    - **告警**
        - `Prometheus`：PromQL 规则 + Alertmanager（分组/抑制/静默/多渠道）
        - `Zabbix`：触发器（trigger）+ 动作（action），内置告警升级/依赖

    - **对比速查**
        | 维度 | `Prometheus` | `Zabbix` |
        |------|-----------|--------|
        | 模型 | Pull（exporter） | Agent 被动/主动 |
        | 场景 | 云原生/K8s/容器 | 传统主机/网络 |
        | 存储 | 本地 TSDB | 数据库（MySQL/PG） |
        | 告警 | PromQL 规则+Alertmanager | 触发器+动作 |
        | 动态发现 | 强（服务发现） | 有（自动发现） |
        | 学习曲线 | UI 弱（Grafana） | 自带 UI（较为直观） |
        | 适用 | 云原生/新架构 | 传统基础设施 |

    - **互补（如何共存）**
        - 传统主机/网络：Zabbix（全栈、模板丰富）；云原生/容器：Prometheus（原生态）
        - 可共存：物理横用 Zabbix，K8s/应用指标用 Prometheus

- **协助记忆**
    - 区别口诀："Prometheus 拉（Pull、K8s 原生、TSDB 存储）；Zabbix Agent 报（传统主机、数据库存储、全栈）"。
    - 选型："新架构/容器/云原生 → Prometheus；传统主机/网络 → Zabbix"。

- **进阶思考**
    - **能不能用 Zabbix 监控 K8s 容器？**
        - 能但非原生：Zabbix 可监控 K8s（通过官方 K8s 模板/API 发现 + 数据采集），但不如 Prometheus 原生（kubernetes_sd + ServiceMonitor）方便。云原生场景 Prometheus 生态更完整（Operator/告警规则/指标）。
    - **Prometheus 能监控网络设备吗？**
        - 能（snmp_exporter），但 Zabbix 的 SNMP/IPMI 网络监控更成熟（模板丰富、开箱即用）。网络/传统设备场景 Zabbix 更省事。
    - **两者共存是否浪费？**
        - 不浪费：各司其职（物理设备 Zabbix、应用/容器 Prometheus），监控数据可在 Grafana 统一展示（Grafana 支持 Zabbix 数据源插件的社区方案，或用 Prometheus 作为统一口径）。实际很多企业共存。

- **扩展信息**
    - **Zabbix 特点**：Agent（被动/主动）、SNMP/IPMI、自动发现、触发器/动作告警、模板
    - **Prometheus 特点**：Pull/exporter、服务发现、PromQL、Alertmanager、TSDB 存储
    - **融合方案**：Grafana 统一展示（Zabbix 数据源插件）、或 Zabbix 数据经外部导出到 Prometheus 生态

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-prometheus%E7%9B%91%E6%8E%A7/  

