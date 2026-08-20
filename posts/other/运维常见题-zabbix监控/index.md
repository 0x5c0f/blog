# 运维常见题-Zabbix监控


## 🤔 简述 Zabbix 核心组件及作用？  
- **Zabbix 是一个企业级开源监控平台，由五个核心组件协作：`Server`（核心调度与计算）、`Agent`/`Agent2`（主机数据采集）、`Proxy`（分布式代理采集）、`Frontend`（Web 管理界面）、`Database`（数据存储）。Server 是大脑，Agent 是眼睛，Proxy 是分布式分身，Frontend 是操作台，Database 是记忆库。**  
    - **Zabbix Server（核心）**
        - 负责数据采集调度（polling/trapping）、触发器（trigger）计算、告警通知发送、配置管理
        - 所有配置、历史数据、告警记录都汇总到 Server，它是整个监控体系的"指挥中心"
        - Server 可直接通过网络轮询（HTTP/ICMP/SNMP/TCP 等）检查服务可用性，也接收 Agent/Proxy 上报的数据

    - **Zabbix Agent / Agent2（主机采集）**
        - 部署在被监控主机上，采集 CPU/内存/磁盘/网络/进程等系统指标
        - Agent（C 实现）：经典版本，支持主动/被动两种模式
        - Agent2（Go 实现，Zabbix 5.0+ 引入）：插件化架构，原生支持并发采集，内置官方插件（Redis/MySQL/HTTP 等），推荐新部署使用
        - Agent 是轻量级进程，资源占用极低

    - **Zabbix Proxy（分布式代理，可选）**
        - 代理 Server 采集数据，适用于跨机房/跨网段/防火墙隔离/大规模场景
        - 数据本地缓存后异步上报 Server，减少 Server 直连压力
        - 7.0 起新增 Proxy HA 集群（主备切换），提升 Proxy 层高可用

    - **Zabbix Frontend（Web 界面）**
        - PHP 实现的 Web 管理界面，用于配置监控（主机/模板/告警规则）、查看图表、管理告警、用户权限
        - 可部署在独立 Web 服务器（Nginx/Apache）上，连接 Server 和 Database

    - **Database（数据存储）**
        - 存储所有配置信息和监控数据，支持 MySQL（最常用）、PostgreSQL、Oracle、SQLite（仅测试）
        - 监控数据量大时需重点优化（分区/清理策略）

- **协助记忆**
    - 五大件：Server=大脑，Agent/Agent2=眼睛，Proxy=分身（可选），Frontend=操作台，Database=记忆库。
    - 数据流：Agent 采集 → Server 计算/告警 → Frontend 展示；Proxy 是可选中间层。

- **进阶思考**
    - **Agent 和 Agent2 有什么本质区别？该用哪个？**
        - Agent（C）是传统版本，单线程，每项采集按顺序执行；Agent2（Go）是重写版，插件化、原生并发、内置官方插件（Redis/MySQL/HTTP/PostgreSQL 等），采集效率更高。新环境推荐 Agent2，老环境迁移需评估兼容性。
    - **什么时候需要用 Proxy？**
        - ①跨机房/跨网段（防火墙只开一条到 Proxy 的连接）；②Server 直连主机太多（分布式负载）；③网络不稳定（Proxy 本地缓存，断网不丢数据）。
    - **Zabbix Server 本身监控不到怎么办？**
        - Server 自身也需要监控（自监控）。通常用 Agent 采集 Server 主机指标，或用 Zabbix 内置的 `zabbix[进程]`/`zabbix[队列]` 等内部 key 监控 Server 健康状态。

- **扩展信息**
    - **架构拓扑速查**：
        - Agent 直连模式：`Agent → Server → Database ← Frontend`
        - Proxy 分布式模式：`Agent → Proxy → Server → Database ← Frontend`
        - Server 可同时直连部分主机 + 通过 Proxy 连接其他主机（混合模式）
    - **进程列表（Server 核心进程）**：
        - `zabbix_server` 包含多个内部进程：poller（轮询）、trapper（接收数据）、alerter（告警）、escalator（升级）、housekeeper（清理）、timer（定时任务）、preprocessing（预处理）等
        - 每类进程数可通过配置文件调整（如 `StartPollers`、`StartTrappers`），是性能调优的重要手段

## 🤔 简述 Zabbix 中 Host、Host Group、Template 三者关系？  
- **Host 是被监控的对象（任何物理/虚拟设备、应用、服务），Host Group 是对 Host 的逻辑分组（用于权限控制和批量管理），Template 是可复用的监控规则包（包含 Item/Trigger/Graph 等，关联到多个 Host 实现批量监控）。核心关系：Template "套用" 到 Host，Host Group "归类" Host，三者共同构成 Zabbix 的配置骨架。**  
    - **Host（主机）**
        - 任何被监控的对象：物理服务器、虚拟机、网络设备、应用、服务等
        - 每个 Host 包含：主机名、IP/接口、关联的监控项（Item）、触发器（Trigger）、宏（Macro）
        - 一个 Host 可属于多个 Host Group，可关联多个 Template

    - **Host Group（主机组）**
        - 对 Host 的逻辑分组（如 `Linux Servers`、`MySQL Servers`、`Network Devices`）
        - 核心作用：①**权限控制**（Zabbix 所有权限基于 Group，用户组对主机组的读/写权限决定可见范围）②批量管理（批量操作、批量关联模板）③告警升级（按组配置通知策略）
        - 一个 Host 必须至少属于一个 Host Group；一个 Group 可包含多个 Host

    - **Template（模板）**
        - 可复用的监控规则包，包含 Item（监控项）、Trigger（触发器）、Graph（图表）、Discovery Rule（自动发现）等
        - 关联到 Host 后，Host 自动继承 Template 中的所有规则，无需逐台配置
        - 修改 Template 会自动同步到所有关联的 Host（继承机制）
        - 一个 Template 可关联多个 Host，一个 Host 可关联多个 Template；但同 key Item 会冲突导致关联失败，应通过 Template 继承层级避免重复定义

    - **三者关系**
        - Template → Host：模板关联到主机，主机继承监控规则（批量复用）
        - Host → Host Group：主机归入组，组控制权限和管理粒度
        - Template 本身也有 Template Group（Zabbix 5.4+），进一步组织模板层级
        - 一句话："Host 是被监控对象，Host Group 是管理分组，Template 是规则模板"

- **协助记忆**
    - Host = 学生，Host Group = 班级，Template = 课程表。课程表（Template）套用到每个学生（Host），班级（Host Group）用来管理学生和控制谁能看这个班的成绩（权限）。
    - 三字口诀：Host 管对象，Group 管分组，Template 管规则。

- **进阶思考**
    - **为什么 Zabbix 的权限系统是"基于 Group"的？**
        - 官方文档明确："In Zabbix, all permissions are based on groups: user groups, host groups, and template groups"。用户组（User Group）对主机组（Host Group）的读/写权限，决定了该用户能看到哪些 Host 的数据。即使只有一个用户需要访问一台主机，也必须通过 Group 授权。这是 Zabbix 的核心权限设计。
    - **Host 上的 Item 和 Template 继承来的 Item 冲突了怎么办？**
        - Host 直接定义的 Item 优先级高于 Template 继承来的同名 Item。实际使用中应避免冲突——直接在 Host 上定义的 Item 用于"这个主机独有的监控"，通用监控放 Template。
    - **一个 Host 可以同时关联多个 Template，会不会冲突？**
        - 可以关联多个（如同时关联 `Linux OS`、`MySQL`、`Nginx`），但同名 Item 会冲突（最后关联的覆盖前面的）。建议通过 Template 的继承层级（如 `Template MySQL` 继承 `Template Linux`）来避免重复定义。

- **扩展信息**
    - **配置层级关系速查**：
        ```
        Template Group
          └─ Template
               └─ Item / Trigger / Graph / Discovery Rule
        Host Group
          └─ Host
               └─ 关联 Template（继承规则）
               └─ 直接定义的 Item / Trigger（覆盖继承）
        User Group
          └─ User
          └─ 对 Host Group 的读/写权限
        ```
    - **低级发现规则（Low-Level Discovery，LLD）**：
        - Template 中可定义 LLD 规则，自动发现主机上的资源（如磁盘分区、网卡、MySQL 数据库）并批量生成 Item/Trigger
        - 大规模监控的基础能力：一次定义 Template，自动适配不同主机的资源差异
## 🤔 简述 Zabbix 中 Item、Trigger、Action 的作用与流程？  
- **Item（监控项）定义"采什么数据"，Trigger（触发器）定义"什么情况算异常"，Action（动作）定义"异常发生后做什么"。三者串起 Zabbix 的核心监控链路：Item 采集数据 → Trigger 评估条件 → Action 执行响应（告警/脚本/通知）。**  
    - **Item（监控项）**
        - 数据采集单元：定义"采集什么指标"以及"怎么采集"
        - 类型（数据来源）：`Zabbix Agent`（系统指标）、`SNMP`（网络设备）、`JMX`（Java 应用）、`HTTP`（Web 接口）、`IPMI`（硬件）、`Calculated`（计算型）、`Internal`（Zabbix 自身监控）、`Dependent`（依赖其他 Item）、`Trapper`（主动接收数据）、`External`（外部脚本）等——此处列举常见类型，完整列表参见官方文档
        - 每个 Item 有采集间隔（`Update interval`），可按需调整（如 CPU 每 30s，业务指标每 5m）
        - 支持预处理（`Preprocessing`）：采集到原始数据后可做单位转换、正则提取、JSON 解析等再存储

    - **Trigger（触发器）**
        - 逻辑表达式，持续评估 Item 数据是否满足告警条件
        - 触发器表达式：`function(/host/key, parameter) operator constant`，如 `last(/web01/cpu.util)>90`（最近一次 CPU > 90%）
        - 严重等级（6 级）：`Not classified`（未分类）、`Information`（信息）、`Warning`（警告）、`Average`（一般）、`High`（严重）、`Disaster`（灾难）——不同等级可配置不同通知方式
        - 状态：`OK`（正常）↔ `PROBLEM`（异常），状态变化时生成事件
        - 支持恢复表达式、依赖关系、事件闭合等高级配置

    - **Action（动作）**
        - 响应事件的执行规则：配置"什么条件下执行"+ "执行什么操作"
        - 事件来源类型：Trigger（触发器状态变化）、Service（服务状态变化）、Discovery（发现）、Auto-registration（自动注册）、Internal（内部事件）
        - 条件（Conditions）：如"触发器严重等级 >= High"且"主机组 = Linux Servers"且"不在维护期"
        - 操作（Operations）：发送通知（Email/Slack/Webhook/自定义脚本）、执行远程命令、创建工单、自动恢复等
        - 支持升级（Escalation）：操作超时未恢复时自动升级通知级别或通知对象

- **协助记忆**
    - Item = 传感器（采集数据），Trigger = 报警器（判断是否异常），Action = 应急预案（异常后执行什么）。
    - 流程口诀：采集（Item）→ 评估（Trigger）→ 响应（Action）；"先装传感器，再设报警线，最后配应急预案"。

- **进阶思考**
    - **Trigger 表达式中的 `last()`、`avg()`、`min()`、`max()` 有什么区别？**
        - `last()`：最近 N 次值中的最后一个；`avg(/host/key,5m)`：最近 5 分钟的平均值；`min()`/`max()`：最近 N 次值中的最小/最大。选择哪个取决于监控逻辑——瞬时告警用 `last()`，趋势告警用 `avg()`，峰值告警用 `max()`。
    - **Action 的操作超时和升级（Escalation）怎么配合？**
        - 可以配置：第一次操作（如发邮件给值班人）→ 超时 5 分钟未恢复 → 升级操作（如发短信给主管）→ 超时仍未恢复 → 再升级（如执行自动重启脚本）。这是 Zabbix 告警升级机制的核心。
    - **Item 的预处理（Preprocessing）有什么用？**
        - 采集原始数据后、存储前的加工步骤。例如：采集 JSON 格式的 API 响应，用 `JSONPath` 提取特定字段再存储；或采集字节数后除以 1024 转换为 KB。避免在 Trigger 表达式里做复杂计算。

- **扩展信息**
    - **Zabbix 数据流全景**：
        ```
        Agent/SNMP/JMX → 采集数据（Item）
            → 预处理（Preprocessing）
            → 存储（Database）
            → 评估（Trigger）
            → 生成事件（Event）
            → 条件匹配（Action）
            → 执行操作（通知/脚本/命令）
            → 前端展示（Graph/Dashboard）
        ```
    - **Trigger 表达式语法变迁**：Zabbix 5.4+ 后统一使用新表达式语法 `last(/host/key)>90`（旧语法 `{host:key.last()}>90` 已废弃），7.0 后完全移除旧语法，新部署必须用新语法

## 🤔 Zabbix Agent 的主动模式和被动模式有什么区别及适用场景？  
- **核心区别在"谁发起请求"：被动模式（Passive）是 Server 主动连接 Agent 拉取数据（Server→Agent，poll 模式），主动模式（Active）是 Agent 主动连接 Server 获取任务清单后推送数据（Agent→Server，push 模式）。一个 Agent 可同时运行两种模式。**  
    - **被动模式（Passive Check）**
        - 工作流程：Server 根据配置的 Item，定时主动连接 Agent（默认端口 10050）请求数据，Agent 被动响应
        - Agent 配置：`Server=10.0.0.1`（允许哪些 Server 连接）
        - 通过 `StartAgents` 参数控制被动检查的进程数（默认 10），设为 0 可完全禁用被动模式
        - 适用场景：Server 能直接连通 Agent、网络简单、规模不大的环境

    - **主动模式（Active Check）**
        - 工作流程：Agent 主动连接 Server（默认端口 10051），获取需要采集的 Item 清单，采集完成后把数据推送给 Server
        - Agent 配置：`ServerActive=10.0.0.1`（Server 地址，主动模式专用）
        - 适用场景：①大规模监控（Server 不需要逐台轮询，由 Agent 主动上报）②Agent 在防火墙/NAT 后面（Server 无法主动连接 Agent）③分布式/跨机房场景
        - Zabbix 7.0 起 Agent 和 Agent2 协议统一，主动模式的性能进一步优化

    - **对比速查**
        | 维度 | 被动模式 | 主动模式 |
        |------|---------|----------|
        | 发起方 | Server（轮询） | Agent（上报） |
        | 默认端口 | Agent 监听 10050 | Agent 连接 Server 10051 |
        | Agent 配置 | `Server=` | `ServerActive=` |
        | 扩展性 | Server 轮询压力大 | Server 只接收，压力小 |
        | 防火墙 | 需要 Server→Agent 端口可达 | 需要 Agent→Server 端口可达 |
        | 适用 | 小规模、直连环境 | 大规模、防火墙/NAT、分布式 |

- **协助记忆**
    - 被动模式：Server 是"巡检员"，挨家挨户上门问数据（轮询）；主动模式：Agent 是"汇报员"，自己去 Server 那里领任务、交数据（上报）。
    - 口诀：被动=Server 拉，主动=Agent 推；大规模用主动，小规模用被动。

- **进阶思考**
    - **大规模监控环境应该用哪种模式？**
        - 大规模（数千主机以上）推荐主动模式：Agent 主动上报，Server 只接收数据不轮询，大幅减轻 Server 压力。被动模式下 Server 需要逐台轮询，主机越多轮询周期越长、Server 负载越重。
    - **一个 Agent 可以同时用两种模式吗？**
        - 可以，且很常见。同一个 Agent 可以同时配置 `Server=`（被动）和 `ServerActive=`（主动），不同 Item 分别指定被动或主动采集。实际使用中，部分 Item 用被动（如需要 Server 触发的检查），部分用主动（如高频采集由 Agent 自主执行）。
    - **Agent2 的主动/被动模式有什么变化？**
        - Agent2 的协议在 7.0 起与 Agent 统一，且 Agent2 的主动模式支持更灵活的调度（插件化，可并发采集多个 Item），在大规模场景下性能优势更明显。
## 🤔 简述 Zabbix 监控一台新的 Linux 主机流程？  
- **核心流程："装 Agent → 配置 → 启动 → 前端建主机 → 关联模板"。Agent 负责采集数据上报 Server，前端负责配置管理。整套流程 5 步即可完成从零到监控的上线。**  
    - **第一步：安装 Zabbix Agent**
        - 官方提供二进制包（RHEL/Debian/Ubuntu 等）、源码编译、Docker 镜像等多种安装方式
        - 推荐 Agent2（Go 版，5.0+ 正式支持）：插件化、并发采集、内置官方插件
        - 示例（RHEL/CentOS）：
            ```bash
            rpm -Uvh https://repo.zabbix.com/zabbix/7.0/rhel/8/x86_64/zabbix-release-latest.el8.noarch.rpm
            dnf install zabbix-agent2
            ```
        - 示例（Debian/Ubuntu）：
            ```bash
            wget https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_latest_7.0-1+ubuntu22.04_all.deb
            dpkg -i zabbix-release_latest_7.0-1+ubuntu22.04_all.deb
            apt update && apt install zabbix-agent2
            ```

    - **第二步：配置 Agent**
        - 编辑配置文件（`/etc/zabbix/zabbix_agent2.conf`）：
            ```
            Server=10.0.0.1             # 被动模式：允许哪个 Server 连接
            ServerActive=10.0.0.1       # 主动模式：Agent 连接哪个 Server 上报数据
            Hostname=web-01             # 本机唯一主机名（前端建主机时必须一致）
            ```
        - `Server`：允许哪些 IP 连接 Agent（被动模式），支持逗号分隔多 IP 或 CIDR
        - `ServerActive`：Agent 主动上报的目标地址（主动模式）
        - `Hostname`：必须与前端创建的主机名一致（主动模式下靠此匹配）

    - **第三步：启动 Agent 服务**
        ```bash
        systemctl enable --now zabbix-agent2   # 开机自启 + 立即启动
        systemctl status zabbix-agent2          # 确认运行状态
        firewall-cmd --add-port=10050/tcp --permanent && firewall-cmd --reload   # 开放 Agent 端口（被动模式需要）
        ```
        - Agent 默认端口：10050（被动模式 Server 连入 Agent）、10051（主动模式 Agent 连出至 Server，需在 Server 端开放）

    - **第四步：在前端创建主机**
        - 导航：Data collection → Hosts → Create host
        - 填写：
            - `Host name`：与 Agent 配置的 `Hostname` 一致（主动模式必须）
            - `Groups`：选择 Host Group（如 `Linux servers`）
            - `Interfaces`：添加 Agent 接口（IP 地址 + 端口 10050）
        - 如果用主动模式，Host name 必须与 Agent 的 Hostname 完全一致，否则数据无法关联

    - **第五步：关联监控模板**
        - 在 Host 的 Templates 页签下，关联 `Linux by Zabbix agent`（或 `Linux by Zabbix agent active`）
        - 模板自动继承：CPU/内存/磁盘/网络/进程等基础监控项和触发器
        - 保存后等待 Agent 上报数据（主动模式通常几十秒内出数据，被动模式等 Server 轮询周期）

- **协助记忆**
    - 五步流程：装（Agent）→ 配（Server/Hostname）→ 启（服务）→ 建（前端主机）→ 套（模板）。
    - 最常见的坑：Hostname 不一致（前端建的主机名和 Agent 配置不一致，主动模式数据对不上）。

- **进阶思考**
    - **用被动模式和主动模式建主机有什么不同？**
        - 被动模式：前端建主机时填 Agent 的 IP 地址，Server 主动连 IP 拉数据；主动模式：前端建主机时 Hostname 必须与 Agent 的 Hostname 完全匹配（Server 靠 Hostname 匹配 Agent 上报的数据），模板也要用对应的 `Linux by Zabbix agent active`。
    - **大规模批量部署怎么自动化？**
        - ①Ansible/Puppet 批量安装 Agent + 推送配置文件；②Zabbix 自动注册（Auto-registration）：Agent 主动上报后 Server 自动创建主机 + 关联模板，无需手动建主机；③自动发现（Network discovery）：Server 扫描网段自动发现主机。

## 🤔 Zabbix 如何监控一台 MySQL 服务器？  
- **三种方式：Agent2 MySQL 插件（推荐）、Agent UserParameter（自定义脚本）、ODBC。Agent2 推荐方案最简单——配置文件里填 MySQL 连接信息即可，官方模板自动采集 QPS/慢查询/连接数/主从延迟等核心指标。**  
    - **方式一：Agent2 MySQL 插件（推荐）**
        - Agent2 内置 MySQL 插件，原生支持并发采集，配置简单
        - 配置文件 `/etc/zabbix/zabbix_agent2.d/plugins.d/mysql.conf`：
            ```
            Plugins.Mysql.Sessions.default.Uri=tcp://localhost:3306
            Plugins.Mysql.Sessions.default.User=zbx_monitor
            Plugins.Mysql.Sessions.default.Password=<password>
            Plugins.Mysql.Sessions.default.Database=
            ```
        - 或使用 `.my.cnf` 文件存储凭据（更安全）
        - 关联模板：`MySQL by Zabbix agent 2`（内置大量监控项：QPS/慢查询/连接数/主从延迟/表空间等）

    - **方式二：Agent UserParameter（自定义脚本，Agent C 版常用）**
        - 在 Agent 配置文件中定义 `UserParameter`，调用 `mysqladmin`/`mysql` 命令采集指标
        - 示例：`UserParameter=mysql.ping[*], mysqladmin -h"$1" -P"$2" ping`
        - 适用于 Agent C 版或需要采集官方模板未覆盖的自定义指标
        - 优缺点：灵活但需手动维护脚本，性能不如 Agent2 原生插件

    - **方式三：ODBC**
        - 通过 ODBC 驱动连接 MySQL，使用 SQL 查询采集指标
        - 适用场景：采集自定义 SQL 查询结果（如业务表行数、特定状态记录数）
        - 配置较复杂，性能一般，通常作为补充手段

    - **MySQL 监控用户创建（通用前置步骤）**
        ```sql
        CREATE USER 'zbx_monitor'@'%' IDENTIFIED BY '<password>';
        GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'zbx_monitor'@'%';
        GRANT SELECT ON performance_schema.* TO 'zbx_monitor'@'%';
        FLUSH PRIVILEGES;
        ```
        - `PROCESS`：查看进程列表；`REPLICATION CLIENT`：查看主从状态；`performance_schema`：性能指标

- **协助记忆**
    - Agent2 插件 = "插电即用"（配置连接信息 + 关联模板）；UserParameter = "自定义脚本采集"（灵活但需维护）；ODBC = "SQL 查询"（补充手段）。
    - 核心三件事：①建监控用户（权限）②配 Agent 连接信息 ③关联 MySQL 模板。

- **进阶思考**
    - **用 Agent2 插件和用 UserParameter 采集 MySQL 指标有什么本质区别？**
        - Agent2 插件是原生实现（Go 连接 MySQL，内置连接池、并发采集、错误重试），配置简单、性能好；UserParameter 是调用外部命令（`mysqladmin`/`mysql` CLI），每次采集 fork 进程 + 执行命令，性能差、脚本维护成本高。新环境推荐 Agent2。
    - **MySQL 主从监控怎么配？**
        - Agent2 模板内置主从延迟检测（`Seconds_Behind_Master` 或 `SHOW REPLICA STATUS`）；Agent C 版需用 UserParameter 采集 `mysql -e "SHOW SLAVE STATUS"`。主库和从库分别建主机、分别关联模板即可。

- **扩展信息**
    - **MySQL 监控常见指标（官方模板覆盖）**：
        - 连接：当前连接数、最大连接数、连接错误数
        - 查询：QPS、慢查询数、Select/Insert/Update/Delete 频率
        - 主从：复制延迟（Seconds_Behind_Master）、IO/SQL 线程状态
        - 存储：表空间大小、InnoDB Buffer Pool 命中率
        - 性能：临时表创建、全表扫描次数、锁等待
## 🤔 Zabbix UserParameter 有什么作用？  
- **UserParameter 是 Zabbix Agent 的自定义监控扩展机制：当内置检查项不满足需求时，用户可在 Agent 配置文件中定义自定义命令，Zabbix 通过指定的 key 执行该命令并返回结果。语法：`UserParameter=<key>,<command>`。**  
    - **基本语法**
        - `UserParameter=<key>,<command>`：定义一个名为 `key` 的监控项，执行 `command` 返回结果
        - 示例：`UserParameter=mysql.questions,mysqladmin -uroot status | cut -f4 -d":" | cut -f1 -d"S"`
        - 在前端 Item 配置中，Type 选 `Zabbix Agent`，Key 填 `mysql.questions`，即可采集该指标

    - **带参数的 UserParameter**
        - `UserParameter=<key>[*],<command> $1 $2 ...`：支持在 Item Key 中传参
        - 示例：`UserParameter=check.port[*],nc -z $1 $2 >/dev/null 2>&1 && echo 1 || echo 0`
        - 前端使用：`check.port[10.0.0.1,3306]`
        - 适用场景：一个脚本检测不同主机/端口，通过参数复用

    - **测试与重载**
        - 测试：`zabbix_agentd -t mysql.questions`（Agent C 版）或 `zabbix_agent2 -t mysql.questions`（Agent2），不经过 Server
        - 重载：`zabbix_agentd -R userparameter_reload`（Agent C）或 `zabbix_agent2 -R userparameter_reload`（Agent2），运行时重新加载无需重启
        - 也可用 `zabbix_get -s 127.0.0.1 -k mysql.questions` 在 Server 端测试

    - **注意事项**
        - 每个 key 必须全局唯一（同一 Agent 上不能有重名 key）
        - 命令以 Agent 用户权限通过 `/bin/sh` 执行（fork 子进程运行），注意安全性
        - 默认超时 3 秒（可通过 `Timeout` 参数调整，最大 30 秒）
        - Agent2 优先使用原生插件（内置 MySQL/Redis/HTTP 等），仅在内置插件不覆盖时才用 UserParameter

- **协助记忆**
    - UserParameter = "自定义监控项": 内置检查项（CPU/内存等）不够用时，用 UserParameter 把自定义脚本/命令包装成 Agent 可采集的监控项。
    - 三步：写脚本 → 配 Agent（UserParameter=key,command）→ 前端建 Item（Type=Agent, Key=key）。

- **进阶思考**
    - **UserParameter 和 Agent2 插件有什么区别？该用哪个？**
        - UserParameter：Agent C 版的通用扩展机制，每次采集 fork 进程执行命令，适合自定义脚本/一次性指标
        - Agent2 插件：Go 原生实现，内置连接池、并发采集、错误重试，性能更好，适用于 Agent2 覆盖的场景（MySQL/Redis/HTTP 等）
        - 原则：Agent2 有原生插件的场景用插件，其余用 UserParameter
    - **UserParameter 命令失败了会怎样？**
        - Agent 返回 `ZBX_NOTSUPPORTED`（item 不支持）或超时错误，Server 端会在该 Item 上显示"Not supported"状态。排查时看 Agent 日志（`/var/log/zabbix/zabbix_agent2.log`），常见原因：命令不存在、权限不足、超时。

## 🤔 Zabbix 模板中的宏有什么作用？  
- **宏（Macro）是 Zabbix 的变量机制，用 `$\{...\}` 语法表示，在运行时被替换为实际值。核心价值：让模板参数化——同一个模板关联到不同主机时，通过宏注入不同的阈值、连接信息、环境变量，实现"一套模板适配多台主机"。**  
    - **宏的类型（四类）**
        - `{$MACRO}`：用户自定义宏，可在全局/模板/主机三级定义，主机级优先于模板级优先于全局级
        - `{MACRO}`：内置宏，Zabbix 自动解析（如 `{HOST.HOST}` = 主机名、`{HOST.IP}` = IP、`{TRIGGER.NAME}` = 触发器名）
        - `{#MACRO}`：低级发现宏（LLD），用于发现规则中动态生成的资源名
        - `{?EXPRESSION}`：表达式宏（Zabbix 6.0+），支持在宏中使用表达式

    - **用户自定义宏的使用场景**
        - 模板中写 `{$MYSQL_PASSWORD}`，不同主机设置不同值（密码不写在模板里，写在主机级宏中）
        - Trigger 阈值参数化：`{$CPU_THRESHOLD}` = 90（全局），某台主机设 80（覆盖）
        - 配置连接信息：`{$MYSQL_PORT}` = 3306（全局默认），某台用 3307

    - **宏的优先级（解析顺序）**
        - 主机级宏 > 模板级宏 > 全局宏
        - 同名宏在不同层级定义时，越具体越优先
        - 触发器表达式中用 `{$THRESHOLD}` 可按主机定制告警阈值，无需为每台主机单独建触发器

    - **秘密宏（Secret Macros，Zabbix 6.0+）**
        - `{$SECRET_MACRO}`：宏值在前端隐藏（不可明文查看），用于存储密码/API Key 等敏感信息
        - 支持两种存储方式：①Zabbix 前端直接录入（加密存储）②对接外部 Vault（HashiCorp Vault 等）
        - 注意：秘密宏仍可被 Item 命令使用（如 UserParameter 中 echo 出来），需确保命令本身不泄露

- **协助记忆**
    - 宏 = "模板里的变量"：把密码、阈值、端口等"会变的东西"用 `{$VAR}` 代替，不同主机填不同值，模板就不用重复建了。
    - 口诀：`{$...}` 用户自定义，`{...}` 系统内置，`{#...}` 发现宏，`{?...}` 表达式宏。

- **进阶思考**
    - **为什么模板里推荐用宏而不是硬编码？**
        - 模板的目标是"一套规则适配多台主机"。如果密码/阈值硬编码在模板里，每台主机都要单独改模板，维护成本极高。用宏后，主机级只需设置不同宏值，模板层完全复用。
    - **Zabbix 的内置宏有哪些常用的？**
        - `{HOST.HOST}`：Host 配置中的 Host name 字段（非操作系统主机名）；`{HOST.IP}`：Host Interfaces 中配置的 Agent 接口 IP（非操作系统实际 IP）；`{TRIGGER.NAME}`：触发器名；`{EVENT.SEVERITY}`：事件严重等级；`{ITEM.LASTVALUE}`：监控项最新值
        - 内置宏常用于通知模板（如邮件/微信告警消息中引用 `{TRIGGER.SEVERITY}` 和 `{EVENT.NAME}`）。

- **扩展信息**
    - **宏的典型告警消息模板**：
        ```
        主机：{HOST.HOST}（{HOST.IP}）
        问题：{TRIGGER.NAME}
        等级：{TRIGGER.SEVERITY}
        时间：{EVENT.DATE} {EVENT.TIME}
        详情：{ITEM.NAME} = {ITEM.LASTVALUE}
        ```
        - 这条模板用了 6 个内置宏，每条告警自动填充主机/触发器/等级/时间/数值
    - **带上下文的宏（User macros with context，6.0+）**：
        - `{$REGEX:pattern}`：按上下文匹配不同值，如 `{$CONN:MySQL}` = 3306、`{$CONN:PostgreSQL}` = 5432
        - 适用于同一模板需要根据不同条件（如操作系统、数据库类型）返回不同宏值
## 🤔 Zabbix 告警机制是如何实现的？  
- **Zabbix 告警机制是 "Action（动作）+ Media Type（通知渠道）+ Escalation（升级）" 三层配合：Action 根据事件来源（Trigger/Discovery/Auto-registration 等）定义"什么条件 → 执行什么操作"，Media Type 定义"通知通过什么渠道发出"（Email/Slack/Webhook/Script），Escalation 定义"通知升级策略"（超时未恢复时升级通知对象或执行远程命令）。**  
    - **Action（动作）**
        - 配置路径：Alerts → Actions，按事件来源分类（Trigger/Service/Discovery/Auto-registration/Internal）
        - 两个核心配置：①Conditions（条件）：如"Trigger severity >= High"且"Host group = Linux Servers"且"不在维护期"；②Operations（操作）：发送消息、执行远程命令
        - 三种操作类型：
            - `Operations`：事件发生时执行（如发邮件通知值班人）
            - `Recovery operations`：恢复时执行（如发"已恢复"通知）
            - `Update operations`：事件被确认时执行（如通知确认人）

    - **Media Type（通知渠道）**
        - 定义通知的投递方式，Zabbix 内置多种：`Email`（SMTP）、`Webhook`（Slack/钉钉/企业微信）、`Script`（自定义脚本）、`SMS`（短信网关）、`Jabber`/`Ez Texting` 等
        - 配置路径：Alerts → Media types，每个类型有独立参数（如 SMTP 服务器、Webhook URL）
        - 用户必须在个人资料中配置 Media（如绑定 Email 地址），否则收不到通知

    - **Escalation（升级策略）**
        - 告警升级：第一次操作（如发邮件）→ 超时未恢复 → 升级操作（如发短信给主管）→ 再超时 → 再升级（如执行远程重启脚本）
        - 支持重复通知（`Send to` + `Every` 周期）、延迟发送（`Start in` 步骤偏移）、发送给不同用户组
        - 适用场景：故障未及时处理时自动升级通知级别，避免"告警石沉大海"

    - **完整告警链路**
        ```
        Item 采集数据
        → Trigger 评估条件（OK → PROBLEM）
        → Event 生成事件
        → Action 匹配条件
        → Operations 执行操作（通过 Media Type 发通知 / 执行远程命令）
        → Escalation 超时升级
        → Recovery operations 恢复通知
        ```

- **协助记忆**
    - Action = "告警规则引擎"（什么条件做什么事），Media Type = "通知渠道"（邮件/钉钉/脚本），Escalation = "升级策略"（超时后升级通知对象）。
    - 三层口诀：定条件（Action）、选渠道（Media）、配升级（Escalation）。

- **进阶思考**
    - **为什么我配了 Action 但收不到通知？**
        - 常见原因：①用户未绑定 Media（个人资料中 Email/Phone 为空）；②用户所在 User Group 对 Trigger 所在 Host Group 无读权限；③Media Type 配置错误（SMTP 服务器地址/端口错误、Webhook URL 不通）；④Action 的 Conditions 不匹配（如严重等级不够、在维护期、时间窗口不符）；⑤`Not classified` 严重等级默认不触发通知（需在 Media 中勾选）。
    - **Webhook 通知渠道怎么配（如钉钉/企业微信）？**
        - 使用 Zabbix 内置的 Webhook Media Type，在参数中填入 Webhook URL（如钉钉机器人的 API 地址）；自定义消息模板（JSON 格式），Zabbix 在触发告警时 POST 到该 URL。6.0+ 版本内置了更多 Webhook 模板（Alerta、Slack、Teams 等），可直接使用。
    - **Action 的"维护期"（Maintenance period）怎么影响告警？**
        - 主机处于维护期时，默认该主机的 Trigger 事件不会触发 Action（除非 Action 明确勾选"在维护期也执行"）。这是避免维护期间"告警轰炸"的重要机制。

- **扩展信息**
    - **告警流程全景（官方架构）**：
        ```
        Item → Trigger → Event → Action → Operations
                                        ├→ Media Type (通知)
                                        ├→ Remote Command (自动修复)
                                        └→ Escalation (升级)
        ```
    - **Media Type 配置关键参数（Email 示例）**：
        - SMTP Server / Port / TLS / Authentication
        - From address / To address（可在 Action 中动态指定收件人）
        - 消息模板：支持宏变量（`{TRIGGER.NAME}`、`{ITEM.LASTVALUE}` 等），不同严重等级可配不同模板
    - **Zabbix 6.0+ 的"自定义告警消息"（Custom alert scripts）**：
        - 允许用脚本发送通知，脚本接收参数（收件人、主题、内容），脚本内部实现投递逻辑（如调用企业微信 API），是最灵活的通知方式

## 🤔 Zabbix 监控图表出现中断，如何排查？  
- **监控图表中断的本质是"数据没采集到"或"数据没存进去"，排查思路是顺着数据链路逐层排查：Agent → 网络 → Server → Database → Frontend，同时看 Item 状态和日志定位卡点。**  
    - **常见原因分类**
        - **Agent 层**：Agent 进程挂了、Agent 配置错误（ServerActive 地址错、Hostname 不匹配）、Agent 被防火墙拦截（10050/10051 端口不通）
        - **网络层**：Server 与 Agent 之间网络抖动/中断、防火墙/安全组误拦截、VPN/专线断开
        - **Server 层**：Zabbix Server 进程异常（poller/trapper 进程耗尽）、内部队列堆积（`Zabbix queue` 看是否有延迟）、触发器预处理超时
        - **Database 层**：数据库写入慢（磁盘 IO 瓶颈）、history/trends 表空间不足、housekeeper 清理过于激进
        - **Proxy 层**（如用 Proxy）：Proxy 进程挂了、Proxy 与 Server 通信中断、Proxy 本地缓存满了

    - **排查步骤**
        1. 前端看 Item 状态：`Monitoring → Latest data`，看该 Item 是否有数据、状态是 `Normal` 还是 `Not supported`（采集失败）
        2. 前端看队列：`Administration → Queue`，是否有大量延迟（延迟说明 Server 来不及处理）
        3. 看 Agent 日志：`/var/log/zabbix/zabbix_agent2.log`，是否有连接错误、超时、权限问题
        4. 看 Server 日志：`/var/log/zabbix/zabbix_server.log`，是否有 poller 超时、数据库连接错误
        5. 网络测试：从 Server 端 `zabbix_get -s <agent_ip> -k agent.ping` 测试连通性
        6. 检查数据库：history 表是否满了（磁盘空间）、Housekeeper 是否在运行

- **协助记忆**
    - 排查五查：查 Item 状态 → 查 Server 队列 → 查 Agent 日志 → 查网络连通 → 查数据库空间。"数据链路哪个环节断了就查哪个"。

- **进阶思考**
    - **Item 状态显示 `Not supported` 是什么意思？**
        - 表示 Agent 采集该 Item 失败（如 key 不支持、脚本超时、权限不足），Agent 会标记该 Item 为不支持并停止采集，直到恢复。排查：看 Agent 日志中的具体错误信息，或在 Agent 端用 `zabbix_agentd -t <key>` 测试。
    - **图表只在特定时间段中断，怎么排查？**
        - ①该时间段是否有网络抖动/防火墙变更；②Agent/Server 是否重启过（`systemctl status`、日志时间线）；③Housekeeper 是否在此期间清理了数据；④数据库是否有锁/慢查询；⑤该时间段是否有高负载导致 Server 采样延迟。

## 🤔 Zabbix 数据库膨胀很大，如何清理？  
- **Zabbix 数据库膨胀是监控规模增长的常见问题，核心原因是 history/trends 表不断累积数据。清理策略分三层：①Housekeeper 自动清理过期数据 ②手动清理历史数据/大表 ③优化存储（分区表、TimescaleDB）。**  
    - **为什么会膨胀**
        - Zabbix 为每个 Item 存储 `history`（原始数据）和 `trends`（小时级聚合数据），数据量 = 主机数 × Item 数 × 采集频率 × 保留时长
        - 默认保留：history 90 天、trends 365 天，大规模环境（数千主机、数万 Item）每天可产生数十 GB 数据

    - **第一层：Housekeeper 自动清理**
        - Zabbix 内置 Housekeeper 进程，按配置的保留时长自动清理过期数据
        - 配置：`Administration → General → Housekeeper`，按 Item 类型设置 history/trends 保留天数
        - Zabbix 7.0+ 持续优化 Housekeeper 效率，但仍建议非高峰期运行；社区和第三方有分批删除脚本可缓解
        - 官方文档注明：Housekeeper 使用 DELETE 语句**按 item 逐一删除**过期数据，每次 DELETE 可能影响大量行，但针对单个 itemid，大规模时仍产生数据库压力

    - **第二层：手动清理**
        - 直接 truncate 大表（需谨慎，确认数据不再需要）：
            ```sql
            -- 查看表大小
            SELECT table_name, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;
            -- 清理（PostgreSQL 示例）
            TRUNCATE TABLE history;
            TRUNCATE TABLE history_uint;
            ```
        - 或按时间范围删除：`DELETE FROM history WHERE clock < extract(epoch from now() - interval '30 days');`
        - **注意**：truncate 会锁表，生产环境需在维护窗口操作，并先备份

    - **第三层：优化存储**
        - **分区表（Partitioning）**：按时间对 history/trends 表分区，清理时直接 drop 分区（比 DELETE 快得多），Zabbix 社区有成熟的分区脚本
        - **TimescaleDB**（5.0+ 正式支持，4.2 起实验性支持）：PostgreSQL 的时序扩展，自动压缩历史数据、支持按策略自动下采样，大规模场景首选
        - **缩短保留时长**：history 改为 7~30 天，trends 改为 90~180 天，按业务需求平衡

- **协助记忆**
    - 三板斧：自动清理（Housekeeper）→ 手动清理（truncate/delete）→ 架构优化（分区/TimescaleDB）。
    - 预防口诀："数据量 = 主机×指标×频率×天数"，调前三个因子减少入库量，调最后一个因子控制保留时长。

- **进阶思考**
    - **Housekeeper 执行时为什么会影响监控性能？**
        - Housekeeper 用 DELETE 语句删除历史数据，大规模删除时会锁表、产生大量 WAL/redo log，占用数据库 IO，导致写入延迟。缓解：①缩短 history 保留天数（减少删除量）；②使用分区表（drop partition 比 DELETE 快得多）；③TimescaleDB 的自动压缩和 retention policy 更高效。
    - **history 和 trends 的区别是什么？哪个更占空间？**
        - `history` 存原始采集值（每采集一次一条记录），数据量最大；`trends` 按小时聚合（每小时一条 min/max/avg/count），数据量远小于 history。大规模环境中 history 表通常占数据库总空间的 60%~80%，是清理的首要目标。
## 🤔 Zabbix 分布式架构如何实现的？  
- **Zabbix 的分布式架构主要通过 Proxy 实现：Server 是中心节点，Proxy 部署在远程机房/网段，代理 Server 采集数据并本地缓存后异步上报，从而实现跨机房/跨网段/大规模分布式监控。架构本质是 "Server → Proxy → Agent" 三层，Proxy 是 Server 的分布式分身。**  
    - **架构模式**
        - **直连模式（无 Proxy）**：Agent 直连 Server，适用于同机房/同网段/规模不大的场景
        - **Proxy 模式**：Agent → Proxy → Server，Proxy 本地缓存采集数据后异步上报 Server
        - **混合模式**：部分主机直连 Server，部分通过 Proxy 连接——灵活适配不同网络环境

    - **Proxy 的核心价值**
        - **跨机房/跨网段**：只需 Server ↔ Proxy 一条网络通路，Agent 不需要直连 Server
        - **分散 Server 负载**：由 Proxy 承担采集和预处理，Server 只接收 Proxy 汇总数据
        - **断网容灾**：Proxy 本地缓存（默认保留 1 小时数据），网络断开不丢数据，恢复后自动同步
        - **7.0 Proxy HA 集群**（详见下一题）：多 Proxy 组成高可用组，自动故障转移

    - **Proxy 的配置要点**
        - Proxy 配置文件：`zabbix_proxy.conf`（指定 Server 地址、Proxy 模式、数据库/缓存）
        - Proxy 模式：`ProxyMode=0`（主动 Proxy，向 Server 推送数据，默认）/ `ProxyMode=1`（被动 Proxy，Server 拉取数据）
        - Proxy 本地存储：可选内嵌数据库（SQLite，仅 Proxy 可用）或独立数据库
        - Agent 配置：`Server=<Proxy IP>` + `ServerActive=<Proxy IP>`，Agent 只与 Proxy 通信

    - **大规模场景的典型架构**
        ```
        数据中心 A:  Agent → Proxy A → Server
        数据中心 B:  Agent → Proxy B → Server
        办公网络:    Agent → 直连 Server
        ```
        - 每个数据中心部署一个 Proxy，Server 统一管理所有 Proxy

- **协助记忆**
    - Proxy 是 Server 的"分身"：在各地设分站（Proxy），分站收本地数据后汇总寄回总部（Server）。
    - 口诀：直连模式小规模，Proxy 模式跨机房；主动 Proxy 推数据，被动 Proxy 被 Server 拉。

- **进阶思考**
    - **Proxy 主动模式和被动模式有什么区别？**
        - 主动（`ProxyMode=0`）：Proxy 主动把数据推送给 Server，Server 被动接收——推荐模式，Server 压力小
        - 被动（`ProxyMode=1`）：Server 主动从 Proxy 拉取数据——适合 Server 和 Proxy 之间网络单向通（Server 能连 Proxy，Proxy 连不上 Server）的场景
    - **Proxy 用 SQLite 还是独立数据库好？**
        - SQLite（内嵌，无需额外部署）：小规模 Proxy、主机数不多，简单易维护
        - 独立数据库（MySQL/PostgreSQL）：大规模 Proxy（数千主机+），需高吞吐和更可靠的持久化
        - 注意：SQLite 仅限 Proxy 使用，Server 必须用独立数据库

## 🤔 Zabbix 7.0 新增 Proxy HA 集群了解吗？实现原理？  
- **Zabbix 7.0 引入 Proxy HA（High Availability）集群：多个 Proxy 组成一个 Proxy Group，对 Server 而言像一个 Proxy——当活跃 Proxy 故障时，其他 Proxy 自动接管并继续采集数据，实现 Proxy 层高可用。核心变化是从"单点 Proxy"到"Proxy Group 负载均衡 + 自动故障转移"。**  
    - **传统 Proxy 的问题**
        - 单点故障：Proxy 挂了，该 Proxy 下所有主机的监控中断
        - 虽然可用多 Proxy 分散，但每个 Proxy 独立管理主机，无法自动故障转移

    - **Proxy HA 的实现原理**
        - 多个 Proxy 加入同一个 `Proxy Group`（前端配置）
        - 每个 Proxy 连接同一个 Server，共享 Proxy Group 的配置和主机分配
        - 活跃 Proxy 故障时，Server 自动将该 Proxy 管理的主机**重分配**给组内其他活跃 Proxy
        - 主机对 Proxy 的切换对 Agent 透明——Agent 需配置 Proxy Group 内所有 Proxy 的 IP 列表（或通过 DNS/负载均衡覆盖）

    - **与传统主备模式的区别**
        - 不是传统主备（active/standby），而是**多活 + 负载均衡 + 自动重分配**
        - 所有 Proxy 都可以同时采集数据，故障时只是"故障 Proxy 的主机被重新分配"，不是"备节点接管全部"
        - 更接近 K8s Pod 的调度模式：健康节点接管故障节点的工作负载

    - **配置要点**
        - 前端：Administration → Proxies → Proxy groups，创建组并添加多个 Proxy
        - Host 配置：关联到 Proxy Group（而非单个 Proxy）
        - Agent 需配置 Proxy Group 内所有 Proxy 的 IP 列表（被动模式：`Server=`；主动模式：`ServerActive=`），或通过 DNS 轮询覆盖

- **协助记忆**
    - 传统 Proxy = "一个人干活，生病了就停工"；Proxy HA = "一个小组轮流干，谁病了别人接活"。
    - 关键词：Proxy Group（不是单点）、多活（不是主备）、自动重分配（不是手动切换）。

- **进阶思考**
    - **Proxy HA 和 Keepalived VIP 方案有什么区别？**
        - Keepalived VIP：网络层故障转移，VIP 切换但 Proxy 进程状态不同步，切换后可能丢缓存数据
        - Proxy HA：应用层感知，Server 知道每个 Proxy 的状态，主机重分配是状态感知的，数据不丢失
        - Proxy HA 是 Zabbix 原生能力，Keepalived 是外挂方案——Proxy HA 更优但需 7.0+
    - **Proxy HA 的性能开销大吗？**
        - 不大：Proxy Group 内各 Proxy 独立采集，只有故障时才触发主机重分配，正常运行时无额外开销

- **扩展信息**
    - **Proxy 架构演进**：
        - Zabbix 2.x~6.x：单点 Proxy，无内置 HA
        - 传统方案：Keepalived VIP + 两个 Proxy（active/standby）——需外部组件，切换有风险
        - Zabbix 7.0：Proxy HA 集群（内置，多活，自动重分配）——推荐方案
## 🤔 Zabbix 监控系统如何优化？  
- **Zabbix 性能优化分三层：Server 进程调优（poller/trapper/进程数）、数据库优化（索引/分区/TimescaleDB）、采集策略优化（Item 间隔/预处理/代理分散）。核心思路是"减少 Server 压力 + 减少数据库写入 + 减少网络开销"。**  
    - **Server 进程调优**
        - `StartPollers`：轮询进程数（默认 5），根据主机数和采集间隔调大
        - `StartTrappers`：接收数据进程数（默认 5），大规模环境需调大
        - `StartPreprocessors`：预处理进程数（默认 3），大量 Item 有预处理时需增加
        - 配置路径：`/etc/zabbix/zabbix_server.conf`，调整后重启 Server

    - **数据库优化**
        - 索引：确保 history/trends 表的 `(itemid, clock)` 索引存在且有效
        - 分区表：对 history/trends 按时间分区，清理时直接 drop partition（比 DELETE 快得多）
        - TimescaleDB（5.0+ 正式支持，4.2 起实验性支持）：自动压缩历史数据、支持 retention policy，大规模场景首选
        - 连接池：配置足够的数据库连接数（`DBSocket`/`Timeout`）

    - **采集策略优化**
        - 调整采集间隔：非关键 Item（如系统基础指标）设为 1~5 分钟，关键业务 Item 设为 30s~1m
        - 减少 Item 数量：合并相关指标（如一次 shell 脚本返回多个指标）
        - 使用主动模式（Agent 主动上报），减轻 Server 轮询压力
        - Proxy 分担：跨机房用 Proxy 采集，减少 Server 直连压力

    - **历史数据优化**
        - 缩短保留时长：history 7~30 天，trends 90~180 天（按需调整）
        - Housekeeper 配置合理，非高峰期清理

- **协助记忆**
    - 优化三板斧：调进程（Server 参数）→ 优数据库（分区/TimescaleDB）→ 控采集（间隔/主动/Proxy）。
    - 口诀："Server 调进程，数据库加分区，采集用主动，数据早清理"。

- **进阶思考**
    - **大规模环境（万级主机）的优化重点是什么？**
        - ①用 Proxy 分散采集压力；②用 Agent 主动模式（Server 只接收不轮询）；③数据库用 TimescaleDB 或分区表；④history 保留 7 天、trends 保留 90 天；⑤调整 poller/trapper 数量匹配负载。

## 🤔 自动发现和自动注册是什么？有什么应用场景？  
- **自动发现（Network Discovery）是 Server 主动扫描网段发现新主机；自动注册（Auto-registration）是 Agent 主动上报后 Server 自动创建主机。两者都能实现"零手动建主机"，区别在于"谁发起"——发现是 Server 拉，注册是 Agent 推。**  
    - **自动发现（Network Discovery）**
        - Server 主动扫描指定网段（IP 范围），检测端口/服务是否可达
        - 发现新主机后，可自动执行：创建主机、关联模板、加入主机组、发送通知
        - 配置路径：`Configuration → Discovery rules`
        - 扫描方式：`Zabbix agent`（检测 Agent 端口）、`SNMP`、`ICMP ping`、`TCP/UDP` 端口
        - 适用场景：扫描已知网段中的新主机，自动化接入

    - **自动注册（Auto-registration）**
        - Agent（主动模式）首次连接 Server 时，Server 识别到未知主机，自动创建主机并关联模板
        - 配置路径：`Configuration → Actions → Autoregistration actions`
        - Agent 需配置：`ServerActive=<server_ip>`（主动模式）+ 有意义的 `Hostname`
        - 适用场景：批量部署 Agent 后自动接入，无需手动在前端建主机

    - **对比**
        | 维度 | 自动发现 | 自动注册 |
        |------|---------|----------|
        | 发起方 | Server（扫描） | Agent（上报） |
        | 前提 | 需要知道网段范围 | 需要 Agent 已部署并配置 |
        | 发现方式 | 端口/服务探测 | Agent 主动连接 |
        | 适用 | 发现未部署 Agent 的主机 | 已部署 Agent 的批量接入 |

- **协助记忆**
    - 自动发现 = "巡检员扫楼"（Server 主动扫描网段）；自动注册 = "新人报到"（Agent 主动来登记）。
    - 选型：未装 Agent 的主机用发现；已装 Agent 的主机用注册。

- **进阶思考**
    - **自动发现和自动注册可以结合使用吗？**
        - 可以。典型流程：先用自动发现扫描网段（发现新 IP），触发 Action（通过远程命令或外部自动化工具）安装 Agent，Agent 启动后通过自动注册接入 Zabbix，实现"发现新机器 → 自动安装 → 自动接入"的全自动化。
    - **自动注册时如何区分不同类型主机（如 Linux/Windows/网络设备）？**
        - 可在 Auto-registration action 中设置条件（如 Agent metadata 字段），不同类型的 Agent 上报不同 metadata，Server 根据 metadata 匹配不同模板和主机组。
## 🤔 如何监控 Web 服务的可用性和响应时间？  
- **Zabbix 内置 Web 场景监控（Web scenarios）：在前端配置 HTTP/HTTPS 请求序列（含 URL、方法、超时、期望状态码、内容匹配），Server 周期性执行并记录响应时间、状态码、下载速度等指标，实现 Web 服务的可用性与性能监控。**  
    - **Web 场景（Web Scenarios）配置**
        - 配置路径：`Configuration → Hosts → Web → Create web scenario`
        - 每个场景包含：一个或多个 `Steps`（请求步骤），每个 Step 有：
            - `URL`：请求地址（支持变量宏）
            - `Timeout`：超时时间
            - `Required status codes`：期望状态码（如 200）
            - `Required string`：页面内容必须包含的字符串（内容匹配，验证页面功能正常）
            - `Retrieve mode`：`Headers only`（只检查状态码）/ `Body`（下载内容）/ `Body and headers`

    - **采集的指标**
        - `web.test.fail`：场景失败次数
        - `web.test.error`：最后一次错误信息
        - `web.test.time`：总响应时间（DNS + TCP + TLS + 服务端处理 + 下载，端到端）
        - `web.test.in`：单个 Step 的下载速度（`bytes per second`，可按 `[scenario,step]` 引用；单步响应时间用 `web.test.time[scenario,step]`）
        - `web.test.rspcode`：HTTP 状态码
        - `web.test.download.speed`：下载速度
        - 可基于这些指标创建 Trigger（如"连续 3 次失败则告警"、"响应时间 > 5s 告警"）

    - **高级功能**
        - 多步操作：先访问首页 → 再访问登录页 → 再访问 API 接口，模拟用户操作流程
        - 认证：支持 HTTP Basic 认证、NTLM 认证
        - 代理：可通过代理访问内网 Web
        - 宏变量：URL 中可用宏（如 `{$WEB_URL}`），不同主机配置不同 URL

    - **内容匹配（Required string）的妙用**
        - 用于验证"页面功能正常"而非仅"HTTP 200"。例如 API 返回 `{"status":"ok"}` 时，检查包含 `status` 字样即可确认后端正常；防止返回了错误页面但仍返回 200 的情况

- **协助记忆**
    - Web 场景 = "定期自动用 curl 测试网站"：配 URL → 设期望状态码/内容匹配 → 周期执行 → 超时/状态码异常就告警。
    - 核心指标：fail（失败次数）、error（错误信息）、time（响应时间）、rspcode（状态码）。

- **进阶思考**
    - **Web 场景的响应时间包含了哪些部分？**
        - `web.test.time` = DNS 解析 + TCP 连接 + TLS 握手（HTTPS）+ 请求发送 + 服务端处理 + 响应下载，是端到端全链路时间。如需拆分各阶段耗时，需借助外部监控（如 curl `--write-out`）。

## 🤔 Zabbix 如何实现自动监控上百台服务器？  
- **核心思路："自动化部署 Agent + 自动接入 Zabbix + 模板批量关联"。三个环节自动化后，新增服务器只需装好 Agent，Zabbix 自动识别、自动关联监控规则、自动告警，无需手动逐台配置。**  
    - **第一步：自动化部署 Agent**
        - 配置管理工具（Ansible/Puppet/Chef）批量安装 Agent2 并推送配置文件
        - 配置模板：`Server=<server_ip>`、`ServerActive=<server_ip>`、`Hostname={{ inventory_hostname }}`
        - 启动服务：`systemctl enable --now zabbix-agent2`

    - **第二步：自动接入 Zabbix**
        - **自动注册（推荐）**：Agent 主动连接 Server → Server 识别未知主机 → Action 自动创建主机 + 关联模板 + 加入主机组
        - **自动发现**：Server 扫描网段发现新主机 → Action 触发安装/接入
        - 自动注册更稳定（Agent 主动上报），大规模环境首选

    - **第三步：模板批量关联**
        - 创建标准化模板（`Linux by Zabbix agent active`、`MySQL by Zabbix agent 2` 等）
        - 自动注册 Action 中配置：新主机自动关联对应模板
        - 不同类型主机（Linux/Windows/MySQL）用不同模板，通过 Agent metadata 或主机组区分

    - **进阶：LLD 自动发现**
        - Template 中的 Low-Level Discovery 规则自动发现主机上的资源（磁盘分区、网卡、MySQL 数据库、容器等）
        - 一次定义，多台主机自动适配不同资源数量

- **协助记忆**
    - 三步自动化：装 Agent（Ansible）→ 接 Zabbix（自动注册）→ 套模板（Action 关联）。
    - 核心："装好就能监控"的关键是自动注册 + 标准化模板。

- **进阶思考**
    - **不同环境（开发/测试/生产）的监控怎么隔离？**
        - 用 Host Group（如 `Development`/`Testing`/`Production`）分组 + User Group 权限控制（不同组的用户只能看到自己负责的环境）+ 不同模板（生产用严格阈值，开发用宽松阈值）。
    - **Agent 部署后多久能出监控数据？**
        - 自动注册 + 主动模式：Agent 启动后几十秒内（主动连接 Server → 获取 Item 清单 → 开始采集上报）；被动模式：需等 Server 轮询周期（通常 30s~1m）。

## 🤔 Zabbix 如何有效避免告警风暴？  
- **告警风暴（短时间内大量告警）是大规模监控的常见痛点，Zabbix 提供多种机制遏制：升级策略控制重复通知、维护期避免非工作时间干扰、触发器依赖消除派生告警、抖动检测抑制反复。核心思路是"减少告警量 + 延迟通知 + 依赖消除"。**  
    - **升级策略（Escalation）控制重复**
        - Action 中配置：首次通知后，若未恢复则间隔 N 分钟重复通知，但有总次数限制
        - 支持延迟通知：`Start in` 步骤偏移，可延迟 N 分钟再通知（给运维自动恢复的时间）
        - 支持发送给不同用户组（升级通知）

    - **维护期（Maintenance）**
        - 为主机/主机组设置维护窗口，维护期内不触发 Action（默认行为）
        - 适用场景：计划内维护、重启、升级期间避免无意义告警
        - 配置路径：`Configuration → Maintenance`

    - **触发器依赖（Dependencies）**
        - 设置触发器依赖关系：当父触发器（如"网络不可达"）触发时，子触发器（如"HTTP 服务异常"）自动抑制
        - 避免同一个故障产生多个衍生告警（如网络断了导致所有服务同时告警）
        - 配置路径：Trigger 配置中的 `Dependencies`

    - **抖动检测（Flapping detection）**
        - 6.0+ 支持：当触发器在短时间内频繁切换 OK↔PROBLEM 时，自动标记为 flapping 状态（可在事件标签中可见），但**不会自动抑制通知**——需额外在 Action 中配置排除 flapping 事件的条件
        - 配合触发器依赖使用效果更好：抖动标记后配合依赖关系可减少误报

    - **根因分析（Root cause analysis，6.0+）**
        - 定义触发器间的因果关系：Root cause（根因）事件与 Symptom（症状）事件标记区分，Symptom 事件可被抑制——同一故障的多个衍生告警只显示根因
        - 例如："网络中断"是根因，"HTTP 服务异常"、"Agent 不可达"是症状，网络恢复后症状告警自动闭合

- **协助记忆**
    - 防风暴四招：升级策略（控制重复）、维护期（计划屏蔽）、触发器依赖（消除衍生告警）、抖动检测（抑制反复）。
    - 口诀："限重复、设维护、加依赖、防抖动"。

- **进阶思考**
    - **为什么一个网络故障会导致"告警风暴"？**
        - 网络中断后，该网段内所有主机的 Agent 都无法连接 Server，导致每个主机的"Agent 不可达"触发器同时触发，加上所有依赖 Agent 采集的 Item 也触发"数据丢失"告警——数量 = 主机数 × Item 数，瞬间爆炸。解决：设置触发器依赖（"Agent 不可达"依赖"网络不可达"），网络恢复后衍生告警自动闭合。
    - **Zabbix 6.0+ 的根因分析（Root cause analysis）怎么用？**
        - 在 Trigger 配置中定义 `Tags`（标记 Root cause/Symptom），当多个事件同时发生时，Symptom 事件被标记并可配置抑制通知，只通知 Root cause 事件。例如："网络中断"标记为根因，"HTTP 服务异常"标记为症状——网络故障恢复后，症状告警自动闭合。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-zabbix%E7%9B%91%E6%8E%A7/  

