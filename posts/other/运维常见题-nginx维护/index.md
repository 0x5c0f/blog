# 运维常见题-Nginx维护

## 🤔 Nginx 有哪些应用场景？  
- **Nginx 的核心定位是高性能的 HTTP 服务器与反向代理服务器，围绕"事件驱动、高并发、低内存"的架构特性，主要应用场景有六个：静态资源服务、反向代理与负载均衡、SSL/TLS 终止、缓存加速、限流与访问控制、API 网关。理解场景的关键不是"Nginx 能做什么"，而是"每种场景解决了什么问题、怎么选型"。**  
    - **静态资源服务（最基础）**
        - Nginx 天生擅长处理静态文件（HTML/CSS/JS/图片），`sendfile` 零拷贝让数据从磁盘页缓存直达 socket，几乎不占 CPU
        - 完整组合：`sendfile on;` + `tcp_nopush on;`（攒包）+ `gzip on;`（压缩文本）+ `expires`（缓存头）+ `try_files`（优雅降级）
        - 与 CDN 的分工：Nginx 是"源站静态服务"，CDN 是"边缘缓存"——大静态流量应前置 CDN，Nginx 只承担回源
        - 典型配置：`location /static/ { alias /data/static/; expires 7d; }`

    - **反向代理与负载均衡（最核心）**
        - 接收客户端请求，按配置转发给后端（Tomcat/Node/PHP-FPM/Go），再把响应返回——这是微服务/传统 Web 架构的"统一入口"
        - 负载均衡算法：轮询（默认）、加权轮询、`least_conn`、`ip_hash`、一致性 `hash`、`random`；详见"调度算法"一题
        - 关键配套：转发头（`X-Real-IP`/`X-Forwarded-For` 让后端拿到真实客户端 IP）、超时控制（`proxy_connect_timeout`/`proxy_read_timeout`）、健康检查（被动 `max_fails`，主动需 Plus/第三方模块）
        - 易错点：`proxy_pass` 带不带 `/` 会改变转发路径（详见对应题）；会话粘滞不要靠 IP 硬顶，优先 session 外置

    - **SSL/TLS 终止（HTTPS 边缘）**
        - 在边缘统一做 HTTPS 加解密，后端走 HTTP，降低每台后端的 SSL 计算开销，也把证书管理收敛到一处
        - 常见组合：`listen 443 ssl;` + `http2 on;`（1.25.1 起 `listen` 的 `http2` 参数已废弃，改用独立指令）+ 证书链 + `HSTS` + `OCSP Stapling` + TLS 1.3（`ssl_protocols`）；证书自动续期靠 `certbot` 等生态
        - 边界：Nginx 终止 TLS 后，后端之间的链路通常是明文——内网可接受，但安全要求高的场景需后端自身也启用 TLS 或走 mTLS

    - **缓存加速**
        - `proxy_cache` 缓存后端动态响应，命中直接返回，把"动态请求"变成"静态化"，大幅减轻应用服务器压力
        - 关键设计：缓存键（`proxy_cache_key`，区分 URL/参数/用户）、有效期（`proxy_cache_valid` 按状态码）、失效策略（`purge` 需 Plus 或第三方模块，开源版常用 `proxy_cache_bypass`/短 TTL）
        - 两级缓存链路：用户 → CDN → Nginx（proxy_cache）→ 应用，各管一段
        - 边界：缓存是"读多写少"场景的利器；个性化/强实时内容要小心串数据（详见"缓存键"相关讨论）

    - **限流与访问控制**
        - 限流：`limit_req_zone` 声明 zone + location 内 `limit_req` 执行（请求速率，漏桶）、`limit_conn_zone` + `limit_conn`（并发连接）——防 CC 攻击、防刷接口的第一道闸
        - 访问控制：`allow/deny`（IP 黑白名单）、`auth_basic`（基础认证）、`geo`/`map`（按来源/用户分级）
        - 安全扩展：可编译 WAF 模块（ModSecurity）或集成 OpenResty 做自定义防护（详见"限流"与"Lua"两题）

    - **API 网关（微服务入口）**
        - 作为轻量网关：路由转发、请求改写、鉴权前置、限流、日志；配合 `OpenResty`/`ngx_lua` 可做动态路由、灰度、流量染色
        - 对比专业网关：Kong/APISIX 功能全（插件生态、控制面），Nginx 原生偏基础但稳定、性能极高、资源占用极低
        - 选型：轻量微服务直接用 Nginx/OpenResty；需要可视化配置、多租户、复杂插件时再上专业网关

- **协助记忆**
    - Nginx 像"城市交通枢纽"：静态是仓库直发现货，反向代理是转交各配送站的调度，SSL 是统一安检口，缓存是热门商品提前备货，限流是控制进站人流，API 网关是按目的地分拣的总调度台。
    - 六字口诀：静态快、代理灵、SSL 省、缓存猛、限流稳、网关轻。

- **进阶思考**
    - **Nginx 和 Apache 在高并发上本质差别在哪？**
        - 架构模型不同（以 Apache `prefork` 为例）：Nginx 是事件驱动（异步非阻塞），一个 worker 用 `epoll` 同时处理成千上万连接，内存不随连接数线性增长；Apache `prefork` 是一个连接一个进程，高并发下内存和上下文切换开销巨大（Apache 2.4 的 `event` MPM 也引入事件驱动，但整体高并发表现仍弱于 Nginx）。
    - **Nginx 的四层（stream）与七层（http）代理分别用于什么场景？**
        - 四层（`stream` 模块，1.9.0+ 引入）基于 IP/端口转发，不解析应用层协议，适合 MySQL/Redis/SSH 等 TCP/UDP 代理；七层（`http`）解析 HTTP，可按 URL/Header/Cookie 精细路由，用于 Web 流量治理。两者常配合使用。
    - **Nginx 的 proxy_cache 和 CDN 缓存是对立还是互补？**
        - 互补。`proxy_cache` 是源站前置缓存，减轻应用服务器压力；CDN 是边缘缓存，离用户更近。典型链路：用户 → CDN → Nginx（proxy_cache）→ 应用，两级缓存各司其职。
    - **一个站点同时需要静态、反代、SSL、缓存、限流，怎么组织配置？**
        - 按"块"分层组织：`http`（全局 gzip/超时/限流 zone）→ `server`（域名、SSL、location 布局）→ `location`（静态/动态/接口分流）。静态用 `alias`+`expires`，动态用 `proxy_pass`，接口加 `limit_req`，HTTPS 在 server 级统一 `ssl` 配置。

- **扩展信息**
    - **场景选型速查**：
        - 静态站点/前端构建产物 → 静态资源服务（+ CDN）
        - 单体应用/微服务入口 → 反向代理 + 负载均衡
        - 对外 HTTPS 统一出口 → SSL/TLS 终止（+ 证书自动化）
        - 读多写少、可接受短暂不实时 → 加 proxy_cache
        - 公网接口防刷 → limit_req/limit_conn + WAF
        - 微服务治理/灰度 → OpenResty/API 网关
    - **最小反向代理骨架**（可作为新站点起点）：
        ```nginx
        http {
            limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
            upstream app { server 127.0.0.1:8080; }
            server {
                listen 80;
                location / { proxy_pass http://app; }
                location /api/ {
                    limit_req zone=api burst=20 nodelay;
                    proxy_pass http://app;
                }
            }
        }
        ```

## 🤔 Nginx 为什么能抗高并发？  
- **Nginx 抗高并发的核心是"事件驱动（异步非阻塞）+ 多进程模型"：master 管理多个 worker，每个 worker 用 `epoll` 同时处理成千上万连接，内存和 CPU 开销不随连接数爆炸式增长（每连接仅线性增加少量内存），而不是像传统服务器那样一连接一进程/线程。这本质上是针对 C10K 问题（1 万个并发连接时代）给出的工程答案。**  
    - **事件驱动架构（异步非阻塞）**
        - 一个 worker 进程可同时处理数万个连接：某个连接数据没就绪时不阻塞等待，而是去处理其他已就绪的连接
        - 数据就绪后由内核事件通知（Linux 用 `epoll`，事件多用边沿触发 `EPOLLET`；监听端口的读事件用水平触发 `EPOLLLT`）
        - worker 始终处于"忙碌"状态，不会因等待某个慢客户端而空转——"慢客户端不拖累快客户端"是事件驱动相比阻塞模型的根本优势
        - 事件来源（I/O 多路复用）：`select`/`poll`（O(n) 扫描，连接多时性能差）→ `epoll`（O(就绪数)，内核维护就绪链表）——这是 Nginx 在 Linux 上选 `epoll` 的原因

    - **多进程模型（master-worker）**
        - master 管理、worker 干活；多个 worker 共享监听端口会引发"惊群"（多个进程同时被唤醒但只有一个拿到连接）——早期靠 `accept_mutex` 锁（1.11.3 起默认 `off`）解决，现代 Nginx 默认自动用 Linux 4.5+ 的 `EPOLLEXCLUSIVE`，`reuseport`（`listen ... reuseport;`）需显式开启
        - 单个 worker 崩溃不影响其他 worker，master 会重新拉起——"进程级隔离"让单个 bug/慢处理不至于拖垮整个服务
        - 多进程 vs 多线程：Nginx 选多进程（而非线程）是为了避免线程间共享内存的锁竞争和单个线程崩溃拖垮全部

    - **对比 Apache prefork**
        - prefork：一个连接一个进程，10000 并发就要 10000 个进程，内存和上下文切换开销巨大
        - Nginx：worker 数少（默认 1，`auto` 时才取 CPU 核数）、单线程事件循环，上下文切换极少
        - Apache 2.4 的 `event` MPM（线程 + 事件驱动）也缓解了问题，但整体高并发表现仍弱于 Nginx

    - **内存消耗低**
        - worker 基础内存小且固定（几 MB~几十 MB），随连接数按"每连接少量内存 + 一个文件描述符"线性增加——相比一连接一进程，增长幅度小几个数量级
        - 内存池设计（`ngx_pool_t`）：连接/请求的内存从池中分配，请求结束整池释放，避免频繁 malloc/free 的碎片和开销

- **协助记忆**
    - Nginx 像"一个接线员盯着一块显示所有线路状态的大面板"（事件驱动），哪条线路有来电接哪条；Apache prefork 像"每条线路配一个接线员蹲守"，来电多了只能疯狂招人。
    - 三字口诀：事件驱、多进程、零拷贝、内存省。

- **进阶思考**
    - **Nginx 的事件驱动和 Node.js 的事件循环有什么本质区别？**
        - 思想相似（事件驱动 + 非阻塞 I/O），底层同样依赖内核通知——Node.js 的 `libuv` 在 Linux 上也是基于 `epoll` 封装。真正的差异在模型：Nginx 是多进程事件驱动（可吃满多核），Node.js 是单线程 JS 事件循环 + `libuv` 线程池（CPU 密集任务会阻塞事件循环）。
    - **worker_processes 设置多少合适？**
        - 一般等于 CPU 核心数（`worker_processes auto;`）。I/O 密集型（大量反向代理）可加到核心数的 1.5~2 倍；CPU 密集型（大量 SSL 加解密）不宜超过核心数。
    - **什么是 C10K 问题？Nginx 怎么解决的？**
        - C10K：2000 年前后提出的"1 万并发连接"难题——传统一连接一进程/线程模型在万级连接时内存与上下文切换开销不可承受。解决思路就是事件驱动 + I/O 多路复用（epoll）：用一个进程同时监听海量连接，只有就绪的事件才处理。Nginx 是 C10K 时代的典型答案，现在（C10M 时代）则要配合内核旁路（DPDK）、多队列网卡等进一步优化。

- **扩展信息**
    - **epoll 的关键机制（为什么比 select 快）**：
        - `select`/`poll`：每次调用都要把全部 fd 集合在用户态与内核态之间拷贝、线性扫描，连接数越大开销越大（O(n)）
        - `epoll`：内核维护一棵红黑树（注册 fd）+ 就绪链表（记录有事件的 fd）；`epoll_wait` 只返回就绪集合（O(就绪数)），且支持 `EPOLLET`（边沿触发，只在状态变化时通知一次）减少重复唤醒
        - 边沿触发 vs 水平触发：ET 需应用把数据读干净（否则下次不再通知），LT 只要有数据就反复通知；Nginx 用 ET 处理连接事件、LT 处理监听端口，是经过调优的组合
    - **Nginx 的 worker 数与系统瓶颈的常见关系**：
        - worker 太少：多核浪费，单核成为瓶颈
        - worker 超过核数：带来不必要的上下文切换和锁竞争，收益不增反降
        - 判断方法：`top` 看 worker 进程 CPU 是否整体接近 100%×核数，再决定加/减
## 🤔 Nginx 的 master 进程和 worker 进程分别作用是什么？  
- **Nginx 采用 master-worker 多进程架构：master 是"管理者"，负责配置加载、worker 的创建与监控、信号处理、热重载，自身不处理请求；worker 是"执行者"，负责实际接收和处理客户端请求。master 管调度，worker 管干活。**  
    - **master 进程（管理者）**
        - 读取并校验配置文件（`nginx.conf`），启动和重载时解析配置（`nginx -t` 是独立的配置测试命令，与运行中的 master 无交互）
        - `fork()` 创建 worker 进程，监控其状态，worker 异常退出时自动重新拉起
        - 接收外部信号并执行对应操作（`nginx -s reload/quit/stop/reopen` 底层就是给 master 发 `HUP`/`QUIT`/`TERM`/`USR1` 信号）
        - 热重载（`HUP`）：启动新配置的 worker → 新 worker 接新连接 → 旧 worker 处理完存量连接后优雅退出，实现零停机更新配置
        - 负责绑定特权端口（如 80/443），再把监听 socket 交给 worker（普通用户无需特权即可 accept）
        - 维护 pid 文件（`nginx.pid`）、日志重开（`USR1`，配合 `logrotate` 切割日志）、平滑升级（`USR2`/`WINCH`，见"版本升级"一题）

    - **worker 进程（执行者）**
        - 实际处理请求：接收连接、解析 HTTP 协议、处理静态文件、转发反向代理、执行 Lua 等
        - 单线程 + 事件驱动，一个 worker 可同时处理成千上万连接
        - 多个 worker 之间通过共享内存同步数据（如限流计数、`proxy_cache` 缓存、`stub_status` 计数）
        - worker 不处理管理任务，只专注事件循环，保证高吞吐

    - **协作流程（四个关键场景）**
        - 启动：master 读配置 → fork worker → worker 监听端口（master 已先 bind 并移交）
        - 运行：连接到来 → 某个 worker accept 并处理 → 响应返回
        - reload（HUP）：master 解析新配置 → 失败则回退旧配置继续跑；成功则起新 worker → 新 worker 接管新连接 → 旧 worker 处理完存量连接后退出（长连接可配 `worker_shutdown_timeout` 强制超时退出）
        - worker 崩溃：master 收到子进程退出信号 → 重新拉起新 worker（服务不中断）

- **协助记忆**
    - master 是"项目经理"：看图纸（读配置）、招工人（fork）、监工（worker 挂了重新招），自己不搬砖；worker 是"工人"：真砌墙（处理请求），每个人手头同时干很多活（事件驱动）。
    - 项目经理正常离开大楼停工（master 正常退出 Nginx 停），某个工人倒下不影响其他人（单 worker 崩溃不影响整体）。

- **进阶思考**
    - **reload 时旧 worker 什么时候退出？**
        - 旧 worker 收到 master 信号后不再接受新连接，但会继续处理已建立连接的请求，直到全部处理完才退出。所以有长连接（WebSocket/keepalive）时，旧 worker 可能长时间存在，可用 `worker_shutdown_timeout` 设置最长存活时间强制退出。
    - **worker_processes auto 在容器里有什么坑？**
        - `auto` 底层用 `sysconf(_SC_NPROCESSORS_ONLN)` 读取的是**宿主机在线核数**，并不感知 cgroup 的 CPU 配额（配额由内核 `cpu.max` 限制）。所以容器里设 `auto` 可能按宿主机核数启动大量 worker 导致超配；若要按配额自动调整，需显式启用官方镜像的 autotune 脚本（`NGINX_ENTRYPOINT_WORKER_PROCESSES_AUTOTUNE=1`），或手动按配额设置。
    - **reload 时新配置有语法错误会怎样？**
        - reload 时 master 内部重新解析配置，失败则**拒绝重载**并保持旧配置与旧 worker 继续运行（不会中断服务），同时输出错误日志——这是 Nginx 热重载安全性的关键设计。

- **扩展信息**
    - **常用信号速查表**（`kill -信号 <master pid>` 等价于 `nginx -s <command>`）：
        - `TERM`/`INT`（`nginx -s stop`）：快速停止
        - `QUIT`（`nginx -s quit`）：优雅停止（处理完存量连接后退出）
        - `HUP`（`nginx -s reload`）：重载配置
        - `USR1`（`nginx -s reopen`）：重新打开日志文件（配合 logrotate）
        - `USR2`：平滑升级新二进制（启动新 master）
        - `WINCH`：优雅关闭旧 worker（配合 USR2 完成升级）
        - 生产环境升级/切割日志都依赖这些信号，比直接 kill -9 安全得多

## 🤔 Nginx 处理请求的流程是怎样的？  
- **Nginx 处理请求按固定阶段流水线执行：连接建立 → 读取/解析请求 → 匹配 location → 执行访问控制与内容生成 → 返回响应。其中 HTTP 处理被划分为 11 个执行阶段（phases），每个阶段可插入模块或指令——理解阶段顺序，就能理解"为什么某些指令在某个位置生效"。**  
    - **请求到达与连接建立**
        - 客户端发起 TCP 连接，worker 通过事件机制接收连接事件（Linux 默认 `epoll`，其他平台 `kqueue`/`IOCP`）
        - `accept()` 获取连接，分配连接结构（`ngx_connection_t`）与内存池（`ngx_pool_t`），读取请求行与请求头（默认 `client_header_buffer_size` 1k，不足则用 `large_client_header_buffers`）
        - 连接与请求是"一个连接可承载多个请求"（keepalive），请求结构（`ngx_http_request_t`）按请求分配

    - **11 个处理阶段（按顺序，现行 1.13.4+ 布局）**
        - `POST_READ`：读取请求头完成后（模块可提前解析头）
        - `SERVER_REWRITE`：server 级 rewrite（在 location 匹配之前改写 URI）
        - `FIND_CONFIG`：匹配 location（按"最长前缀 + 修饰符短路 + 正则"规则，见 location 一题）
        - `REWRITE`：location 级 rewrite
        - `POST_REWRITE`：rewrite 结果提交（若 URI 被改写，重新回到 FIND_CONFIG）
        - `PREACCESS`：访问控制前置（`limit_req`、`limit_conn` 在这里限流）
        - `ACCESS`：访问控制（`allow/deny`、`auth_basic`）
        - `POST_ACCESS`：访问控制结果提交
        - `PRECONTENT`：内容生成前置（承载 `try_files`、`mirror`；1.13.4 起取代旧的 `TRY_FILES` 阶段）
        - `CONTENT`：内容生成（静态文件、`proxy_pass`、`fastcgi`）
        - `LOG`：日志记录

    - **内容生成阶段（CONTENT）**
        - 若 location 配置了独立 `content_handler`（如 `proxy_pass`、`fastcgi_pass`），直接执行该 handler，不再尝试默认逻辑
        - 否则按顺序尝试：`index` 文件 → `autoindex` 目录列表 → 静态文件模块
        - 产生的响应再经过 filter 链（`gzip` 压缩、响应头加工、`sub_filter` 替换等）后发送

    - **filter 链（响应的"加工流水线"）**
        - header 与 body 是两条并行 filter 链：每个过滤器模块（`gzip`、`chunked`、`sub_filter`）同时注册 header + body 两个回调；header 链终点 `ngx_http_header_filter` 组装输出响应头，body 逐段经 body 链加工，最终 `ngx_http_write_filter` 写回客户端
        - 与 CONTENT 的"生产"不同，filter 只"加工"——这是面试常考的"生产 vs 加工"概念

- **协助记忆**
    - 请求处理像"医院流程"：挂号（连接建立）→ 分诊（解析请求）→ 分配科室（匹配 location）→ 科室门口先量体温查证件（访问控制）→ 医生看病（内容生成）→ 开药盖章（filter 加工）→ 取药离院（响应+日志）。
    - 四步口诀：建连 → 解析 → 路由 → 响应；"限流在进门、鉴权在分诊后、内容在最后"。

- **进阶思考**
    - **CONTENT 阶段和 filter 链有什么区别？**
        - CONTENT 负责"产生"响应内容（读文件、取后端），filter 链负责"加工"响应内容（gzip、加响应头）。是"生产"和"加工"的关系——比如 gzip 不改变业务逻辑，只改变传输形态。
    - **try_files 在哪个阶段执行？**
        - 现行版本（1.13.4+）中在 `PRECONTENT` 阶段执行（访问控制之后、内容生成之前），仅当配置了 `try_files` 指令时生效：按顺序检查文件是否存在，命中则用，否则内部跳转到最后一个参数（跳转会重新匹配 location）。
    - **为什么 rewrite 指令放在 server 级和 location 级效果不同？**
        - server 级的 rewrite 在 `SERVER_REWRITE` 阶段执行，**先于 location 匹配**，改写的 URI 会影响最终落到哪个 location；location 级的 rewrite 在 `REWRITE` 阶段（匹配之后）执行，只影响本 location 内的后续处理（除非 `last` 重新匹配）。理解了阶段顺序，就理解了这种差异。

- **扩展信息**
    - **11 阶段与常见指令/模块的对应**：
        - `SERVER_REWRITE` → server 块里的 `rewrite`
        - `PREACCESS` → `limit_req`、`limit_conn`
        - `ACCESS` → `allow`/`deny`、`auth_basic`、`ngx_http_access_module`
        - `PRECONTENT` → `try_files`、`mirror`、`ngx_http_mirror_module`
        - `CONTENT` → `proxy_pass`、`fastcgi_pass`、`static`、`index`、`autoindex`
        - `LOG` → `access_log`（`log_format` 在这里写入）
    - **与请求生命周期相关的内存/连接**：请求结构（`ngx_http_request_t`）取自连接池（keepalive 复用连接），请求头等数据在新建的请求池（`r->pool`）中分配、请求结束整池释放——这也是 Nginx 高并发下内存不膨胀的原因之一
## 🤔 Nginx 中 worker_processes 和 worker_connections 参数含义与配置？  
- **`worker_processes` 指定 worker 进程数，`worker_connections` 指定每个 worker 能同时处理的最大连接数，二者共同决定 Nginx 的整体最大并发：`最大并发 = worker_processes × worker_connections`（反向代理场景需再除以 2，因为每个客户端请求要占用客户端→Nginx、Nginx→后端两个连接）。调参的本质是"匹配业务并发模型 + 不撞系统资源上限（CPU/fd/内存）"。**  
    - **worker_processes（worker 进程数）**
        - 默认 1；建议值：一般等于 CPU 核心数，用 `worker_processes auto;` 自动检测（`auto` 自 1.3.8/1.2.5 起支持；1.9.10 的 `auto` 是 `worker_cpu_affinity` 的自动绑定参数，别混淆）
        - CPU 密集型（大量 SSL 加解密）：不宜超过核心数，避免上下文切换
        - I/O 密集型（大量反向代理）：可设为核心数的 1.5~2 倍（worker 大多在等待 I/O，多开几个提高吞吐）
        - 判断依据：`top` 观察 worker 的 CPU 是否吃满，吃不满说明瓶颈在 I/O 或连接数而非进程数
        - 容器注意：`auto` 取宿主机在线核数（`sysconf(_SC_NPROCESSORS_ONLN)`），不感知 cgroup 配额，限核容器可能超配（详见 master/worker 一题）

    - **worker_connections（每个 worker 的最大连接数）**
        - 含义：单个 worker 能同时打开的最大连接数（含客户端连接、后端连接），默认 512
        - 受系统限制：不能超过 `ulimit -n`（单进程最大文件描述符数），需同步调大 `worker_rlimit_nofile`（建议为其 2 倍及以上，反代场景每请求至少 2 个 fd）
        - 建议值：小内存服务器 1024~4096，大内存服务器可到 65535+；连接数过大需评估每连接内存开销

    - **最大并发计算公式（理解"场景"再套公式）**
        - 公式：`最大并发连接数 = worker_processes × worker_connections`
        - 反向代理：每个客户端请求通常占 2 个连接（客户端↔Nginx、Nginx↔后端），所以有效并发 ÷2（最坏情况估算；若配置了上游 `keepalive` 复用连接，则不会恒为 2 个）
        - 静态文件：只占 1 个连接，直接相乘
        - HTTP/2 多路复用：一个连接承载多个请求，"连接数"不等于"请求数"，公式估算的是并发连接上限而非 QPS

    - **联动配置清单（最容易漏的三项）**
        - `worker_rlimit_nofile`：必须 ≥ worker_connections（实际建议 2 倍）
        - 系统级：`/etc/security/limits.conf` 的 `nofile` 软/硬限制、`/proc/sys/fs/file-max`
        - `ulimit -n` 与 worker 进程实际生效值（改配置后需重启 Nginx 才生效）

- **协助记忆**
    - `worker_processes` 是"餐厅厨师人数"，`worker_connections` 是"每位厨师能同时看的锅数"，总能力 = 人数 × 锅数；外卖模式（反向代理）每单占两个锅眼，能力要除以 2。
    - 两个约束：进程数看 CPU，连接数看内存和 `ulimit`。

- **进阶思考**
    - **worker_connections 设置多大合适？有上限吗？**
        - 上限受内存与 `ulimit -n` 限制（Linux 还有 `/proc/sys/fs/file-max` 系统级上限）。每个连接占少量内存（连接结构、缓冲区），过大可能耗尽内存。建议 `worker_connections` 小于 `worker_rlimit_nofile`，并逐步压测验证。
    - **为什么改完配置要重启而不是 reload？**
        - 这三个指令改后 reload 即对新 worker 完全生效（旧 worker 处理完存量退出），无需 stop/start；只有"系统级硬限制"（如 systemd `LimitNOFILE`、`limits.conf`）需要重启服务进程才重新读取——分清"配置内指令（reload 即可）"与"系统级限制（需重启）"。

- **扩展信息**
    - **常见生产配置参考**：
        ```nginx
        worker_processes auto;          # = CPU 核数
        worker_rlimit_nofile 65535;     # ≥ 2 × worker_connections
        events {
            worker_connections 20480;   # 每 worker 连接数（配合内核 fd 上限）
        }
        ```
        - 反向代理压测经验：`worker_connections` 通常设 10240~65535 区间，实际以压测（ab/wrk）确定瓶颈
        - 内存评估：每连接约几百字节到几 KB（连接结构 + 缓冲区），10 万连接约百 MB 级，远低于一连接一进程

## 🤔 Nginx 的 keepalive 连接作用是什么？  
- **`keepalive`（HTTP 长连接）让客户端与 Nginx 在同一个 TCP 连接上发送多个请求，避免每个请求都重新三次握手、四次挥手，从而减少延迟与系统资源消耗。核心配置是 `keepalive_timeout`（空闲超时）和 `keepalive_requests`（单连接最大请求数）。注意它同时作用于"下游"（客户端↔Nginx）和"上游"（Nginx↔后端），配置位置和指令完全不同。**  
    - **keepalive 的作用（为什么值得开）**
        - 减少 TCP 握手开销：复用连接后后续请求直接发送，省去约 1 次 RTT 的握手和 4 次挥手——对"一个页面几十个静态资源"的典型 Web 场景，通过复用少量连接免去后续资源的每次握手
        - 降低资源消耗：减少连接频繁创建/销毁带来的内存、端口、文件描述符开销
        - 配合 TLS：HTTPS 下握手还要加上 TLS 握手（多次 RTT），keepalive 收益更大
        - HTTP/1.1 默认开启（`Connection: keep-alive`）；HTTP/2 天然多路复用，连接复用是内置行为

    - **相关配置指令（下游）**
        - `keepalive_timeout <timeout>`：连接最大空闲时间，超时服务端主动关闭，默认 75s；可带第二参数控制 `Keep-Alive: timeout=` 响应头值
        - `keepalive_requests <number>`：单连接最多处理的请求数，达到上限后关闭，默认 1000（1.19.10 起；更早版本默认 100）——防止"一条连接无限期霸占"
        - `keepalive_disable`：对特定浏览器禁用（默认 `msie6`）

    - **下游与上游的区别（易混点）**
        - 下游（客户端→Nginx）：由 `keepalive_timeout`/`keepalive_requests` 控制，在 `http`/`server`/`location` 块配置
        - 上游（Nginx→后端）：`upstream` 块用 `keepalive <连接数>` 设置**每 worker 维度的连接池**大小，通常还需配合 `proxy_http_version 1.1;` 和 `proxy_set_header Connection "";`（1.29.7 起上游默认启用 HTTP/1.1 + keepalive、默认池容量每 worker 32 条，但绝大多数生产版本仍须显式配置）
        - 上游连接池：超过池容量的空闲连接会被关闭，池是"复用已有连接"不是"建好 N 条连接"——刚配置时不会立即建 N 条

- **协助记忆**
    - keepalive 像"VIP 通道"：第一次来要排队登记（三次握手），之后走 VIP 通道直接进（复用连接）；长时间不来（超时）通道回收，下次重新登记；`keepalive_requests` 是"VIP 卡使用次数上限"。
    - 三字口诀：复连接、减握手、提吞吐；"下游看两个参数，上游看 keepalive 连接池"。

- **进阶思考**
    - **keepalive_timeout 设太短或太长各有什么问题？**
        - 太短（如 1s）：页面里多个资源（CSS/JS/图片）的并发请求可能还没发出连接就被关，每个文件都要重新握手，延迟反而增加；太长（如 300s）：空闲连接长期占用内存/端口/文件描述符，高并发下可能资源耗尽。通常 30~65s 是合理折中。
    - **上游 keepalive 的"连接池"是提前建好连接吗？**
        - 不是。`keepalive 32;` 只是"最多缓存 32 条空闲上游连接供复用"，连接是按需建立的，用完保持空闲待复用；超过 32 条空闲时最早的空闲连接被关闭。配合 `proxy_http_version 1.1;` + `Connection "";` 才能让后端不主动断开、连接得以复用。
    - **keepalive 连接会一直留着不释放吗？**
        - 不会无限留：受 `keepalive_timeout`（空闲超时）、`keepalive_requests`（请求数上限）双重约束；上游池还受池容量约束。所以"长连接=资源泄漏"是误解，关键在于超时与上限设置合理。

- **扩展信息**
    - **压测中的 keepalive 影响**：
        - 开启 keepalive 后，压测工具（ab/wrk）需要支持连接复用才能真正测出长连接场景（ab 默认每请求新建连接，`-k` 开启 keepalive）
        - 收益参考（经验区间，随场景差异大）：跨网 RTT 大或 HTTPS 场景，keepalive 可能带来显著提升；同机房/本地纯 HTTP 场景握手成本极低，收益有限——应结合本业务实测，勿当普适结论
        - 反例：短连接场景（如 C 端随机访问、连接用完即断）keepalive 收益有限，还可能占用大量空闲连接，需按业务选型
## 🤔 location 匹配优先级是怎样的？  
- **`location` 匹配本质是一个"两阶段"过程：先把所有前缀型（`=`、`^~`、无符号）遍历一遍找到**最长前缀**，再看这个最长前缀的修饰符决定是否"短路"掉正则阶段；只有最长前缀是普通无符号时，正则才有机会出场。一句话：先最长前缀，再看修饰符，最后才是正则。**  
    - **四种匹配类型（修饰符）**
        - `=`：精确匹配，URI 必须与 location 完全一致（不含 query string）才命中，命中后立即定案、不再做任何后续匹配
        - `^~`：前缀匹配，若它是最长前缀，则命中后**停止**，不再检查正则
        - `~` / `~*`：正则匹配，`~` 区分大小写、`~*` 不区分；**按配置文件中出现的顺序**逐一匹配，第一个命中的即生效
        - 无符号：普通前缀匹配，若它是最长前缀，则**不停止**，继续执行正则匹配，正则全部未命中才使用它

    - **两阶段匹配流程（权威理解）**
        - 阶段一（找最长前缀）：
            1. 遍历所有前缀型 location（`=`、`^~`、无符号），按字符串比较找出"最长"的那一个（`=` 精确匹配本质是一种"恰好相等"的最长前缀）
            2. 若最长的是 `=` → 直接使用，结束
            3. 若最长的是 `^~` → 直接使用，结束（不再看正则）
            4. 若最长的是无符号 → 记住它，进入阶段二
        - 阶段二（正则匹配）：
            5. 按配置顺序依次执行所有正则 location（`~`/`~*`），第一个命中的即生效
            6. 全部正则都没命中 → 使用阶段一记住的"最长无符号前缀"
        - 关键：正则永远在"最长普通前缀"之后才被考虑；而 `=`、`^~` 一旦是最长前缀就彻底短路

    - **几个容易踩的坑（理解边界）**
        - `location` 匹配的是 **URI 路径部分，不含 query string**（`/user?id=1` 按 `/user` 匹配）
        - 大小写敏感：Linux 下路径区分大小写，`/Image` 与 `/image` 是两个 URI（只有 `~*` 正则不区分）
        - `merge_slashes` 默认开启：`//api//user` 会被合并成 `/api/user` 再匹配；需要保留双斜杠的场景可 `merge_slashes off`
        - `@` 命名 location（如 `@fallback`）**不参与 URI 匹配**，只能被 `try_files`、`error_page`、`rewrite` 等**内部跳转**引用
        - 正则 location 中的捕获组可用 `$1`/`$2` 引用：`location ~ ^/blog/(\d+)$ { ... }` 里 `$1` 就是数字部分
        - `location` 只能写在 `server` 块内、不能嵌套在其他 location 里；一个请求最多进入一个 location（`rewrite ... last` 这类内部重定向除外，会重新匹配，最多循环 10 次）

    - **配置示例与逐步验证**
        ```nginx
        location = / { ... }          # ① 精确匹配根
        location / { ... }            # ② 通用前缀（兜底）
        location /doc/ { ... }        # ③ 前缀
        location ^~ /images/ { ... }  # ④ 最长前缀短路正则
        location ~ \.png$ { ... }    # ⑤ 正则（区分大小写）
        location ~* \.jpg$ { ... }   # ⑥ 正则（不区分大小写）
        ```
        - `GET /` → ①（`=` 精确命中）
        - `GET /images/logo.png` → ④（最长前缀是 `/images/` 且是 `^~`，`\.png$` 正则本可命中但被短路）
        - `GET /doc/a.png` → ⑤（最长前缀 `/doc/` 是无符号，进入正则阶段命中）
        - `GET /doc/b.JPG` → ⑥（`\.png$` 不中，`~* \.jpg$` 不区分大小写命中）
        - `GET /doc/readme.txt` → ③（无正则命中，用最长普通前缀 `/doc/`）
        - `GET /other/file` → ②（无前缀、无正则命中，落到兜底 `/`）

- **协助记忆**
    - location 匹配像"快递分拣"：`=` 是精确地址直接送门口；`^~` 是指定小区且不再查门牌；`~` 是按特征在仓库翻一遍（先翻到哪个算哪个）；无符号是模糊地址先送这条街，但若仓库有特征规则（正则）还得先让它们翻。
    - 优先级口诀：`=` 最高、`^~` 其次、正则第三、普通最后；"正则只在最长前缀是普通前缀时才出场"。

- **进阶思考**
    - **为什么说"正则匹配优先级高于普通前缀"是常见误解？**
        - 更准确的说法是"正则**有机会**在最长普通前缀之前生效"，前提是它命中了。真正的规则：先确定最长前缀；最长前缀是 `=`/`^~` 则直接定案；只有最长前缀是无符号时，正则才作为更高优先级的候选参与竞争。所以 `^~ /static/` 可以"压过"正则，而普通前缀压不过正则——这正是很多人配 `^~` 想绕开正则命中的原因。
    - **`location ~ \.php$` 和 `try_files` 是怎么配合的（PHP 场景）？**
        - 经典组合：
            ```nginx
            location / {
                try_files $uri $uri/ /index.php?$args;   # 文件不存在内部跳转到 index.php
            }
            location ~ \.php$ {
                fastcgi_pass unix:/run/php-fpm.sock;     # 以 .php 结尾的请求走这里
            }
            ```
        - 原理：`try_files` 内部跳转到 `/index.php` 后，URI 变成 `.php` 结尾，**重新执行 location 匹配**落到 `location ~ \.php$`，由 FastCGI 处理——这正体现了"内部重定向会重新匹配 location"。
    - **`location = /` 和 `location /` 会同时命中吗？**
        - 不会。`=` 精确匹配一旦命中立即定案；`location /` 是兜底前缀。`GET /` 走 `=`，`GET /xxx` 走 `/`。这也是"用精确匹配放行特定路径、避免被正则/前缀拦截"的手法，如 `location = /favicon.ico { log_not_found off; }`。
    - **正则 `~` 和 `~*` 性能差异大吗？**
        - 差异不大，`~*` 忽略大小写理论上略慢；真正影响性能的是正则复杂度。高并发场景建议优先用前缀匹配（`^~`）而非正则。

- **扩展信息**
    - **高频实战 location 配置模板**（配合上文匹配规则直接套用）
        - **伪静态路由**（框架兜底 + PHP 处理）：
            ```nginx
            location / { try_files $uri $uri/ /index.php?$args; }
            location ~ \.php$ { fastcgi_pass unix:/run/php-fpm.sock; include fastcgi_params; }
            ```
        - **静态资源长缓存**：
            ```nginx
            location ~* \.(css|js|png|jpg|gif|svg|woff2?)$ {
                expires 1y;                                      # 配合文件名 hash 使用
            }
            ```
            - 提示：`expires` 已生成 `Cache-Control: max-age`，一般不必再 `add_header Cache-Control`（会造成双头）；`immutable`（RFC 8246）建议配 ≥1 年有效期才合理
        - **防盗链**（防止别人直接引用你的图片/视频）：
            ```nginx
            location ~* \.(gif|jpg|png|mp4)$ {
                valid_referers none blocked server_names *.example.com;
                if ($invalid_referer) { return 403; }   # 非法来源直接拒绝
            }
            ```
            - `valid_referers` 取值含义：`none`（直接输入 URL、无 Referer）、`blocked`（Referer 存在但协议头被剥除/异常，常见于代理）、`server_names`（本站域名）、`*.example.com`（指定的信任域）
        - **屏蔽敏感/隐藏文件**：
            ```nginx
            location ~ /\. { deny all; }                      # 点开头文件（.htaccess、.git 等）
            location ~ \.(env|log|sql)$ { deny all; }         # 敏感后缀
            location = /favicon.ico { log_not_found off; }     # 精确放行 + 不打 404 日志
            ```
        - **接口限流 + CORS**（前后端分离常见组合）：
            ```nginx
            location /api/ {
                limit_req zone=api_limit burst=20 nodelay;     # 需先定义 limit_req_zone
                add_header Access-Control-Allow-Origin "$http_origin" always;
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
                add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
                if ($request_method = OPTIONS) { return 204; } # 预检请求直接放行
                proxy_pass http://backend;
            }
            ```
        - **上传目录禁止执行脚本**（防上传马）：
            ```nginx
            location ^~ /uploads/ {
                expires 30d;
                # ^~ 短路正则：上传目录内的请求不会进入 location ~ \.php$，.php 不会被 FastCGI 执行
            }
            ```
            - 关键点：仅"不配 php 处理器"不够——若站点有全局 `location ~ \.php$`，上传的 `shell.php` 仍会落到那里被执行；必须用 `^~` 短路正则（或在上传目录内 `location ~ \.php$ { deny all; }` 并置于 php location 之前）才能真正阻止
        - 提示：防盗链与 CORS 中的 `if` 属于"合理使用 if"的场景（官方防盗链示例即如此写法），但 `if` 内不应放 `try_files`/`proxy_pass` 等非 rewrite 指令，复杂逻辑优先用 `map`。

## 🤔 root 和 alias 指令有什么区别？  
- **`root` 和 `alias` 都用于指定文件物理路径，核心区别在拼接方式：`root` 把 location 的 URI 拼接到根路径末尾；`alias` 用指定路径直接替换 location 的 URI 部分。一句话：root 是"追加"，alias 是"替换"。`alias` 只能用于 `location` 块，`root` 可用于 `http`/`server`/`location`。**  
    - **路径拼接方式（理解"替换的是哪一段"）**
        - `root`：物理路径 = root 路径 + **完整请求 URI**（含 location 前缀本身）
        - `alias`：物理路径 = alias 路径 + **location 前缀之后的部分**（前缀被整体换掉）
        - 示例：
            ```nginx
            location /static/ { root /var/www/; }
            # GET /static/css/style.css → /var/www/static/css/style.css
            # （root 把 /static/ 也拼进去了）
            ```
            ```nginx
            location /static/ { alias /var/www/images/; }
            # GET /static/logo.png → /var/www/images/logo.png
            # （alias 把 /static/ 替换成 /var/www/images/）
            ```

    - **尾部斜杠敏感度**
        - `root`：尾部斜杠效果等价（root 带 `/` 会产生双斜杠路径，Nginx 不去重，由文件系统容忍）
        - `alias`：**非常敏感**，必须与 location 的尾部斜杠一致，否则会拼接出错（如 `alias /var/www/images` 配 `/static/`，`/static/logo.png` 会被解析成 `/var/www/imageslogo.png`）
        - 建议：location 与 alias 都以 `/` 结尾

    - **适用场景（怎么选）**
        - `root`：整个 server 或 location 根目录统一（最常见），如 `root /var/www/html;` + 多个 location 共享
        - `alias`：location 的 URI 与实际物理路径不一致时，如把 `/img/` 映射到 `/data/images/`、把 `/download/` 映射到别的盘
        - 特例：`location = /favicon.ico { alias /data/assets/favicon.ico; }`（精确匹配 + 单文件，alias 很合适）

    - **与 try_files 的配合限制（易踩坑）**
        - `alias` 与 `try_files` 同时用时，`try_files` 的 file 参数应写**去掉 location 前缀、相对 alias 目录**的路径；`$uri`（含 location 前缀）在 alias 下会被追加到 alias 后导致查找错误（官方文档有长期公开记录的坑），组合前建议实测或改用 root

- **协助记忆**
    - `root` 是"追加路径"（根 + 完整 URI），`alias` 是"替换路径"（换掉 location 前缀）。
    - 两个坑：`alias` 尾部斜杠必须和 location 一致；`alias` 只能放 location 块。

- **进阶思考**
    - **root 和 alias 在同一个 location 同时使用会怎样？**
        - **同一 location 内同时写两者是配置错误**，`nginx -t` 会直接报 "root directive is duplicate" 启动失败。"alias 覆盖 root"只发生在**继承场景**：root 写在 `server`/`http` 级、alias 写在某 location 级时，该 location 内 alias 优先生效。
    - **什么场景必须用 alias 而不能用 root？**
        - 当"对外 URI 前缀"与"物理目录名"不一致时，root 无法表达——比如对外是 `/assets/`、物理在 `/opt/media-pool/`，root 会拼成 `/opt/media-pool/assets/...`（错），alias 才能正确映射到 `/opt/media-pool/...`。
    - **正则 location 里能用 alias 吗？**
        - 可以，且常配合捕获组：`location ~ ^/thumb/(\d+)$ { alias /data/thumb/$1.jpg; }`（Nginx 0.7.40+ 支持 alias 中使用正则捕获）。

- **扩展信息**
    - **root/alias 选择速查**：
        - 站点统一根目录 → `root`（server 级）
        - 单一目录映射、URI 与物理路径不同名 → `alias`
        - 静态资源目录 + 长缓存 → 两者都行，配 `expires`/`gzip`
        - 常见误区：`location / { root /data; }` 访问 `/a.txt` 时找的是 `/data/a.txt`（不是 `/data/` 下找 /a.txt 的"额外目录"）——root 是"拼"不是"跳"
## 🤔 什么情况下会用 rewrite？  
- **`rewrite` 用于根据正则匹配 URI 并做重写或重定向，核心场景：URL 规范化（301/302）、协议跳转（HTTP→HTTPS）、伪静态（美化 URL）、旧路径迁移。它通过正则捕获动态修改 URI，支持 `last`/`break`/`redirect`/`permanent` 四个标志。关键认知：rewrite 改的是 Nginx 内部的 URI，而"重定向"（redirect/permanent）是让浏览器重新请求——这是"内部"与"外部"两个世界的区别。**  
    - **语法与执行时机**
        - 语法：`rewrite <regex> <replacement> [flag];`（按顺序执行；无 flag 时匹配成功后**继续执行本组下一条规则**，对改写后的 URI 再次匹配；只有 `last`/`break` 或 replacement 以 `http(s)://` 开头才停止本组）
        - 执行时机：`server` 块（`SERVER_REWRITE` 阶段）和 `location` 块（`REWRITE` 阶段）
        - 关键：server 级 rewrite **先于 location 匹配**执行，改写的 URI 会直接影响最终落到哪个 location

    - **四个标志（flag）**
        - `last`：停止当前 rewrite 组，**重新匹配 location**（内部重定向）
        - `break`：停止当前 rewrite 组，**不重新匹配 location**，继续执行当前 location 内指令
        - `redirect`：返回 302 临时重定向（地址栏变化）
        - `permanent`：返回 301 永久重定向（地址栏变化，浏览器会缓存）

    - **last 和 break 的区别（面试高频）**
        - `last`：重写后重新走 FIND_CONFIG 匹配 location（可能落到不同 location，如 PHP 伪静态落到 `~ \.php$`）
        - `break`：重写后停留在当前 location，继续执行其后续指令（如 `proxy_pass`）
        - 注意：`location` 块内用 `last` 会重新搜索 location（若重写结果仍匹配本 location，可能循环最多 10 次并报 500），所以 location 内优先用 `break`；反而是在 `location` 外（server 级）`last` 与 `break` 效果相同。惯例：server 块用 `last`，location 块用 `break`

    - **典型使用场景**
        - 去尾部斜杠：`rewrite ^/(.*)/$ /$1 permanent;`（URL 规范化）
        - HTTP→HTTPS：`rewrite ^(.*)$ https://$host$1 permanent;`
        - 伪静态：`rewrite ^/article/(\d+)$ /index.php?id=$1 last;`（内部重定向，地址栏不变）
        - 路径迁移：`rewrite ^/oldpath/(.*)$ /newpath/$1 permanent;`（301 让爬虫跟到新地址）
        - 捕获组引用：replacement 中的 `$1`/`$2` 对应正则捕获；query string 默认保留（replacement 末尾加 `?` 可丢弃）

    - **rewrite 与 return 的区别**
        - `return`：直接返回指定状态码和内容，不改写 URI、不继续后续处理，简单高效
        - `rewrite`：动态修改 URI，支持正则捕获与复杂逻辑；无 `last`/`break` 时可能继续匹配下一条规则，易出循环
        - 简单跳转优先用 `return`（更高效且立即终止），复杂路径重写用 `rewrite`

- **协助记忆**
    - `rewrite` 像"快递中转站"：包裹来了看地址（URI），按规则重新贴地址（replacement），再决定重新分拣（last）、直接送（break）、还是通知地址永久变更（permanent）。
    - `last` 重新排队分拣，`break` 当前通道内直接处理；"要浏览器换地址就 redirect/permanent，要内部换就 last/break"。

- **进阶思考**
    - **rewrite 和 if 配合使用有什么陷阱？**
        - 社区广为引用的 IfIsEvil 文章（agentzh）：`if` 内安全用法就是 `return` 和 `rewrite ... last;`；真正危险的是在 `if` 内放 `try_files`、`proxy_pass` 等非 rewrite 模块指令。复杂逻辑仍建议优先用 `map` 替代 `if`。
    - **rewrite 的性能开销大吗？**
        - 单个 rewrite 开销很小（正则匹配 + 字符串替换），但高并发下大量复杂正则会增加 CPU 开销。能用前缀匹配（`^~`）或 `try_files` 替代的尽量不用 rewrite。
    - **为什么说"能用 return 就不用 rewrite 做重定向"？**
        - `return 301 https://...` 直接生成响应并终止请求，不经过正则匹配、不重新匹配 location；而 `rewrite ... permanent` 需要正则 + 重定向处理，且若没写对 flag 可能继续匹配下一组规则。功能等价时 return 更简单、更快、更不易出错。

- **扩展信息**
    - **rewrite 常见配置骨架**：
        ```nginx
        server {
            # server 级：URL 规范化 + 协议跳转（用 return 更稳）
            if ($scheme = http) { return 301 https://$host$request_uri; }
            rewrite ^/(.*)/$ /$1 permanent;          # 去尾部斜杠
            location / {
                try_files $uri $uri/ /index.php?$args;   # 优先 try_files 而非 rewrite 做伪静态
            }
        }
        ```
        - 实践建议：伪静态路由优先用 `try_files`（更高效、无循环风险），rewrite 用于"正则驱动的复杂改写"（带捕获、条件）

## 🤔 try_files 指令有什么作用？  
- **`try_files` 按顺序检查文件/目录是否存在，返回第一个命中结果，全部失败则执行兜底（如内部跳转到某 URI、某命名 location，或直接返回指定状态码）。它的核心价值是替代复杂的 rewrite 规则，让"静态文件优先、动态路由兜底"的逻辑清晰高效——它是 PHP/前端框架类应用的最常见标配。**  
    - **执行原理与阶段**
        - 在现行版本（1.13.4+）的 `PRECONTENT` 阶段执行（访问控制之后、内容生成之前）
        - 前 N-1 个参数映射为文件系统对象并检查存在性，命中则把请求 URI 改写为该对象；都不存在则内部跳转到最后一个参数（`uri`、`@location` 或 `=code`）
        - 内部跳转会**重新匹配 location**（这正是它能把请求交给 `location ~ \.php$` 的原因）

    - **语法规则**
        - `try_files file ... uri;`：都找不到则内部跳转到 `uri`
        - `try_files file ... @named;`：跳转到命名 location
        - `try_files file ... =code;`：都找不到则直接返回指定状态码（如 `=404`）
        - 参数可用 `$uri`（当前 URI）、`$uri/`（同名目录）、`$args`（query string）

    - **典型使用场景**
        - PHP 框架标配：`try_files $uri $uri/ /index.php?$args;`（先找文件/目录，没有则交给 index.php 处理——Laravel/WordPress 等）
        - SPA 前端：`try_files $uri $uri/ /index.html;`（前端路由 history 模式，刷新任意路径都回 index.html）
        - 自定义 404：`try_files $uri $uri/ =404;`
        - 命名 location 兜底：`try_files $uri $uri.html @fallback;`

    - **与 rewrite 的对比（为什么优先用 try_files）**
        - `try_files` 只检查文件系统存在性，不做 URI 正则匹配，效率更高
        - `try_files` 没有 rewrite 的"同组逐条继续匹配"机制，行为更可预测；但末参数 URI 若再次命中同一 try_files location 且文件始终无解，仍会报 `rewrite or internal redirection cycle` 500（如 `try_files $uri /index.html;` 且 index.html 不存在）——兜底目标要能真正命中
        - 能用 `try_files` 的场景优先使用；rewrite 留给"需要正则改写/条件"的复杂场景

- **协助记忆**
    - `try_files` 像"按清单找文件"：从上到下逐一排查备选路径，哪个存在用哪个，都不存在按兜底方案处理。
    - 口诀：找文件，按顺序；存在则用，不存在则跳。

- **进阶思考**
    - **`try_files $uri $uri/ /index.php` 中 `$uri/` 的作用？**
        - 检查请求 URI 是否对应真实目录；目录存在则尝试访问其默认文件（由 `index` 指令指定）。去掉 `$uri/` 则目录请求无法正确处理。
    - **try_files 和 index 在同一 location 的执行顺序？**
        - 只有 `$uri/` 对应目录**不存在**时，`try_files` 才会继续检查并落到最后一个参数；若目录存在但缺 index 文件且未开 autoindex，会直接返回 403（不回退到最后参数）。`$uri/` 命中目录后，内部跳转到目录 URI，由 CONTENT 阶段的 `index` 模块处理。
    - **try_files 和 alias 能一起用吗？有什么坑？**
        - 可以但需注意场景：**前缀 location + alias**（最常见）下 Nginx 会自动剥离 location 前缀，`$uri` 映射正确；真正会"alias 路径 + 完整 URI"拼错的是**正则 location + alias**——正则场景建议改用捕获变量（如 `$1`）或 `error_page 404` 兜底，或用 root（详见 root/alias 一题）。

- **扩展信息**
    - **常见 try_files 模板速查**：
        - 静态优先 + 动态兜底（PHP）：`try_files $uri $uri/ /index.php?$args;`
        - SPA history 路由：`try_files $uri $uri/ /index.html;`
        - 纯静态站点：`try_files $uri $uri/ =404;`
        - 带命名 location 兜底：`try_files $uri @maintenance;`（配合 `error_page 503` 做维护页）
    - **与 error_page 的联动**：`try_files ... =404` 可直接配合 `error_page 404 /404.html;` 自定义 404 页面，不必写命名 location
## 🤔 sendfile、tcp_nopush 指令有什么作用？  
- **`sendfile` 开启"内核态零拷贝"文件传输：数据直接从磁盘页缓存到 socket，绕过用户态内存拷贝，减少 CPU 与上下文切换；`tcp_nopush` 配合 `sendfile` 开启 `TCP_CORK`，让数据攒满再一次性发送，减少网络小包。两者都用于优化静态文件传输，属于"静态资源性能三件套"（sendfile + tcp_nopush + gzip）的一部分。**  
    - **sendfile 指令**
        - 作用：启用高效文件传输，数据从磁盘文件描述符直接到网络 socket（经页缓存），避免用户态内存拷贝，减少两次拷贝与多次上下文切换
        - 默认 `off`，配置位置 `http`/`server`/`location`
        - 注意：严格说是"内核态零拷贝"（页缓存到 socket 不走用户态），与完全零拷贝（如 DMA 直通）有区别，但行业通行简称零拷贝
        - 边界：只对"从磁盘读文件"的场景生效（静态文件、`X-Accel-Redirect` 内部重定向）；对后端代理响应（`proxy_pass`）不生效，那是另一条数据路径

    - **tcp_nopush 指令**
        - 作用：在 `sendfile` 开启时设置 `TCP_CORK`（FreeBSD/macOS 为 `TCP_NOPUSH`）选项，让 TCP 数据在缓冲区攒满或显式指示时才发送，减少小包数量
        - 默认 `off`，需与 `sendfile on;` 配合

    - **配合关系与注意**
        - `sendfile on;` 是前提；`tcp_nopush on;` 进一步合并网络包（大文件受益明显，小文件延迟影响小）
        - 两者同时开启可提高大文件传输效率，但会推迟发送、可能增加延迟——实时交互场景（WebSocket/SSE）应关闭 `tcp_nopush` 并开启 `tcp_nodelay`（两者语义相反，是替代关系而非搭配）

- **协助记忆**
    - `sendfile` 是"直通车"（磁盘到网卡不落地用户态），`tcp_nopush` 是"拼车"（小包拼成大包一起发）。
    - 两句口诀：`sendfile` 省 CPU，`tcp_nopush` 省网络包。

- **进阶思考**
    - **sendfile 在 aio（异步 I/O）场景下有什么限制？**
        - Linux 上 `aio` 需配合 `directio` 使用（否则仍是阻塞读）；达到 `directio` 阈值的文件走 AIO、不走 `sendfile`，小于阈值的文件仍走 `sendfile`（非全局互斥）。FreeBSD 曾有 `aio sendfile` 模式，1.7.11 弃用、1.21.5 移除。现行异步方案是 `aio threads`。
    - **sendfile 对 HTTPS/压缩场景还生效吗？**
        - 默认部署下不直接生效：HTTPS 需要 TLS 加密（数据必须过用户态做加密封装）、gzip 需要压缩——数据要先到用户态处理，sendfile 的"纯零拷贝"路径用不上（启用 kTLS 内核态加密的部署是例外，1.21.0+ 支持）。所以 sendfile 主要优化"明文 + 未压缩"的静态文件下载。

- **扩展信息**
    - **静态资源性能三件套（面试常整体问）**：
        ```nginx
        location ~* \.(css|js|png|jpg|gif|svg)$ {
            sendfile on;      # 零拷贝
            tcp_nopush on;    # 攒包
            gzip on;          # 压缩文本（图片视频不压）
            expires 30d;      # 长缓存
        }
        ```
        - 分工：sendfile 省 CPU、tcp_nopush 省网络包、gzip 省带宽、expires 省请求
        - 大文件下载场景：`tcp_nopush` 收益明显；小文件/高频场景收益有限，甚至因延迟增加不划算，需实测

## 🤔 expires 指令有什么作用？  
- **`expires` 用于在响应头设置 `Expires` 和 `Cache-Control`，告诉浏览器与中间缓存（CDN）资源缓存多久，从而减少重复请求、降低负载与延迟。它是 Nginx 静态资源缓存优化的核心指令。关键认知：它决定"谁能缓存、缓存多久"，配合版本号策略才能安全地长缓存。**  
    - **工作原理**
        - 同时设置两个头：`Expires`（绝对时间戳，HTTP/1.0 时代的语义）与 `Cache-Control: max-age=N`（相对秒数，HTTP/1.1 标准）
        - 两者并存时，HTTP/1.1 缓存策略优先使用 `Cache-Control`（max-age）
        - 仅对 200/201/204/206/301/302/303/304/307/308 等可缓存响应生效，404/5xx 不修改缓存头
        - 作用面：浏览器本地缓存 + 中间缓存（CDN/代理）都会遵守；带 `max-age` 或 `Expires` 的响应即可被共享缓存（CDN）缓存，`public` 并非前提（它的实际作用是允许共享缓存复用带 `Authorization` 头的请求缓存）

    - **参数取值**
        - `expires off;`：不添加/不修改缓存头
        - `expires epoch;`：`Expires` 设为 1970-01-01，`Cache-Control` 为 `no-cache`（可存储但每次使用前须回源校验）
        - `expires max;`：`Expires` 设为 2037-12-31，`Cache-Control` 为 `max-age=315360000`（10 年）
        - `expires 30d;`：正数 → `max-age=30d`；负数 → `no-cache`（如 `expires -1`，可存储但每次须回源校验）
        - `expires @15h30m;`：指定当天某个时间点过期（适合"每天更新"的内容）
        - 可用变量动态设置：`expires $expires;`（由业务逻辑决定时长）

    - **典型配置场景**
        - 静态资源长缓存：`location ~* \.(jpg|png|css|js|svg|woff2?)$ { expires 30d; }`（配文件名 hash 更安全）
        - HTML 禁止直接使用缓存：`expires -1;`（`Cache-Control: no-cache`，可存储但每次须回源校验；真正"不存储"用 no-store）
        - 接口不缓存：`expires off;` 或加 `Cache-Control: no-store`（彻底不存）

- **协助记忆**
    - `expires` 是给资源贴"保质期"：保质期内浏览器/CDN 直接用本地副本，不回来问。`max` 是"永久保质"，`epoch` 是"已过期"。
    - 三句口诀：静态资源加 `max`，频繁更新设短时，HTML 页面用负数。

- **进阶思考**
    - **expires max 设 10 年缓存安全吗？**
        - 对几乎不变的 JS/CSS/图片是安全的；但版本更新时须配合文件名加版本号（`app.v2.js`）或内容 hash 文件名，否则浏览器一直用旧缓存。注意：查询参数方式（`app.js?v=2`）在部分代理/CDN 下不参与缓存键，可能失效——文件名 hash 更可靠。
    - **expires 和 add_header Cache-Control 有什么区别？**
        - `expires` 是专用于缓存控制的指令，同时管理 `Expires` 与 `Cache-Control`；`add_header` 是通用加头指令。缓存场景优先用 `expires`（不要再用 add_header 重复加 Cache-Control，会形成双头）。
    - **no-cache 和 no-store 有什么区别？**
        - `no-cache`：可以存储，但**每次使用前必须回源校验**（配合 ETag/Last-Modified 做条件请求）；`no-store`：**完全不允许存储**（每次都要完整下载）。对"不想让浏览器缓存"的页面，no-store 更严格；对"缓存但必须保证最新"用 no-cache。

- **扩展信息**
    - **缓存策略选择速查**：
        - 带 hash 的静态资源（`app.a1b2c3.js`）→ 长缓存 + immutable（用 `add_header Cache-Control "public, max-age=31536000, immutable" always;`，注意 immutable 只能由 add_header 追加，与 expires 并存的双 Cache-Control 头会被浏览器合并，可接受）
        - 无 hash 但很少变的资源 → `expires 7d~30d`
        - HTML 页面 → `expires -1`（no-cache，保证拿到最新）
        - API 动态数据 → `expires off` 或 no-store
        - 缓存的"矛与盾"：长缓存省流量，但发版要"换文件名"而不是"改内容"——文件名 hash 是发版与缓存配合的标准解
## 🤔 gzip 指令有什么作用？  
- **`gzip` 用于启用/禁用 Nginx 对响应内容的 gzip 压缩，文本类响应压缩后通常减小 60%+，加快传输、节省带宽，是静态资源优化的核心配置。关键配套参数：`gzip_comp_level`（级别）、`gzip_min_length`（最小长度）、`gzip_types`（类型）、`gzip_vary`（Vary 头）。核心原则：文本压缩、二进制不压、小文件不压、级别适中。**  
    - **核心配置指令**
        - `gzip on | off;`：开关，默认 `off`
        - `gzip_comp_level 1~9;`：压缩级别，越高压缩率越大但越耗 CPU，推荐 1~5，默认 1（级别从 1→6 收益明显，6 以上性价比骤降）
        - `gzip_min_length 1024;`：小于该长度不压缩（默认 20，小响应压缩收益低甚至更大）
        - `gzip_types text/css application/javascript ...;`：指定压缩的 MIME 类型，`text/html` 始终压缩
        - `gzip_vary on;`：加 `Vary: Accept-Encoding`，让中间缓存按"是否支持 gzip"分别缓存，避免给不支持压缩的客户端返回乱码缓存
        - `gzip_disable "msie6";`：禁用老 IE 压缩（官方特殊掩码，等价于正则 `"MSIE [4-6]\\."`，老 IE 解压有 bug）

    - **典型配置**
        ```nginx
        gzip on;
        gzip_min_length 1024;
        gzip_comp_level 5;
        gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;
        gzip_vary on;
        gzip_disable "msie6";
        ```

    - **适合与不适合压缩的场景**
        - 适合：HTML/CSS/JS/XML/JSON/SVG 等文本类（重复字符多，通常减 60%+）
        - 不适合：JPEG/PNG/GIF/视频/PDF 等已压缩格式，再压收益极小、还耗 CPU，可能更大
        - 注意：`image/svg+xml` 虽是图片类型，但本质是 XML 文本，**值得压缩**（常被遗漏）

    - **与 brotli 的对比**
        - Brotli（`ngx_brotli` 模块）压缩率通常比 gzip 再高 10~20%，但构建/维护成本更高；现代浏览器都支持 `br`，可 gzip + brotli 并存（按 `Accept-Encoding` 协商）

    - **安全注意**
        - HTTPS 下压缩可能受 BREACH 侧信道攻击影响（主要针对响应中携带秘密的场景，如 CSRF token），敏感页面可单独关闭压缩

- **协助记忆**
    - gzip 像"快递打包"：同类小件捆一起体积变小、运输更快；级别越高打包越紧但越耗时。文本适合打包，图片视频本身已是压缩包。
    - 四句口诀：文本压缩效果好，图片视频没必要，级别适中省 CPU，`min_length` 过滤小文件。

- **进阶思考**
    - **gzip 和 gzip_static 有什么区别？**
        - `gzip` 是动态压缩（每次请求实时压缩，耗 CPU）；`gzip_static` 是静态预压缩（直接发送构建期预生成好的 `.gz` 文件，不耗 CPU，对静态文件更高效）。
    - **为什么推荐 gzip_min_length 调到 1k 左右而不是默认 20？**
        - 默认 20 字节意味着几乎所有响应都尝试压缩；但小于 1KB 的内容压缩后可能反而更大（压缩头开销），且白白消耗 CPU。调高阈值后，小请求直接原样返回，CPU 和延迟都更优。
    - **CDN/代理层也做压缩，会不会双重压缩？**
        - 多数 CDN 透传已压缩响应（不二次压缩），但部分 CDN 会解压后按更高等级重压或转 brotli——取决于 CDN 实现；真正要防的是"缓存了压缩版本、遇到不支持 gzip 的客户端"——所以 `gzip_vary on` 在生产是标配。

- **扩展信息**
    - **与 gzip 配合的"三减"体系**：
        - 减体积：gzip/brotli（传输层压缩）
        - 减次数：expires 长缓存（浏览器/CDN 命中不请求）
        - 减延迟：sendfile + tcp_nopush（传输效率）
        - 三者组合是 Nginx 静态资源优化的完整答案

## 🤔 反向代理与正向代理的区别是什么？  
- **核心区别在"代理谁"：正向代理代理的是客户端（帮客户端访问服务器，服务器不知道真实客户端）；反向代理代理的是服务器端（帮服务器接收请求，客户端不知道真实后端）。一个站在用户侧，一个站在服务侧。这也是"藏谁"的区别：正代藏客户端、反代藏后端。**  
    - **正向代理（代理客户端）**
        - 逻辑上代表客户端，通常部署在客户端可达的出口位置（公司网关、远端代理服务器），客户端显式配置代理地址，通过代理访问目标服务器
        - 目标服务器看到的是代理的 IP，而不是客户端真实 IP（隐藏了客户端）
        - 典型场景：访问受限资源（翻墙）、公司内网统一出口（缓存、审计、上网行为管理）
        - 典型工具：Squid、浏览器/系统代理配置
        - 请求方向：客户端 → 正向代理 → 目标服务器

    - **反向代理（代理服务器端）**
        - 部署在服务器一侧，客户端访问的是反向代理（对外地址），由它转发给后端真实服务器
        - 客户端感知不到后端服务器的存在（后端 IP 被隐藏，客户端只面对一个入口）
        - 典型场景：负载均衡、SSL 终止、缓存、统一入口（微服务网关）
        - 典型工具：Nginx、HAProxy、云 LB
        - 请求方向：客户端 → 反向代理 → 后端服务器

    - **对比小结**
        - 正向：帮客户端 → 客户端知道代理、服务器不知道客户端（"代你出门"）
        - 反向：帮服务器 → 服务器知道代理、客户端不知道后端（"替你守门"）
        - 部署位置：正向在用户侧，反向在服务侧
        - 谁配置：正向需客户端配置，反向只需服务端配置

- **协助记忆**
    - 正向代理是"助理替你出门办事"（对方只知道助理，不知道你）；反向代理是"前台替你挡访客"（访客只见到前台，不知道老板在哪个办公室）。
    - 区分口诀：正代藏"你"（客户端），反代藏"后端"（服务器）；"正出门、反守门"。

- **进阶思考**
    - **为什么说反向代理对客户端是"透明"的？**
        - 客户端只需要访问反向代理对外暴露的域名/IP，无需任何客户端配置，也感知不到请求被转发到了哪台后端——这种"无感"正是反向代理能用于负载均衡和故障切换的前提。正向代理通常需客户端显式配置（显式代理），但也存在无需配置的"透明代理"（由网关 `iptables TPROXY` 等拦截重定向），所以"透明与否"取决于部署方式，而非代理方向。
    - **正向代理和反向代理能同时存在吗？**
        - 能。典型链路：客户端 →（正向代理，公司出口）→ 反向代理（站点边缘）→ 后端。两者职责不同、互不冲突；同一台机器也可以既做某域名的反向代理、又被某场景配置为正向代理。
    - **为什么反代要转发 X-Forwarded-For？**
        - 反向代理隐藏了真实客户端，后端只能看到代理 IP；`X-Forwarded-For`/`X-Real-IP` 头携带真实客户端 IP，供后端做日志、限流、风控。注意：这些头可被伪造（客户端可自己发），信任它们时要做过滤或只在可信反代后取最后一个非可信值。

- **扩展信息**
    - **代理场景速查**：
        - 公司/家庭上网统一出口、访问受限内容 → 正向代理
        - 网站入口、负载均衡、HTTPS 卸载、微服务网关 → 反向代理
        - 数据库/缓存等 TCP 服务代理 → 反向代理的四层形态（stream，见 stream 一题）
        - 云上负载均衡：云 LB 本质是"托管反向代理"（L4/L7 两种），与自建 Nginx 反代二选一或叠加
## 🤔 proxy_pass 指令后加 / 和不加 / 有什么区别？  
- **区别在于 proxy_pass 是否带 URI 路径：`proxy_pass http://backend;`（不带 `/`）会把请求的原始 URI 原样转发给后端（未发生 rewrite 时）；`proxy_pass http://backend/;`（带 `/`）会用 proxy_pass 里的 URI 替换掉 location 匹配到的前缀。这是配置反向代理时最容易出错、也最容易排查半天的地方之一。**  
    - **不带 /（原样转发）**
        ```nginx
        location /api/ {
            proxy_pass http://backend;
        }
        # GET /api/user → 后端收到 /api/user（原始 URI 原样转发，含 location 前缀）
        ```
        - 转发时把整个原始 URI（含 location 前缀）传给后端，后端必须自己能处理 `/api/` 前缀

    - **带 /（替换前缀）**
        ```nginx
        location /api/ {
            proxy_pass http://backend/;
        }
        # GET /api/user → 后端收到 /user（location 前缀 /api/ 被 / 替换）
        ```
        - 带 URI 时，location 匹配的前缀被替换为 proxy_pass 的 URI 部分（基于解码规范化后的 URI；剩余部分的特殊字符会重新编码）
        - 也可以替换成别的路径：`proxy_pass http://backend/v2/;` → `/api/user` 变成 `/v2/user`
        - 边界：正则 location（`~`）或命名 location（`@`）内，`proxy_pass` **不能带 URI**（官方限制），只能不带 URI 或带变量

    - **通用规则（一句话记忆）**
        - `proxy_pass` **不带 URI**：转发完整原始 URI
        - `proxy_pass` **带 URI**（含 `/`）：用其 URI 替换 location 匹配部分
        - 反向代理时若不希望后端感知到 location 前缀（如前后端目录分离），就加 `/` 或其他路径
        - 判断口诀："没写路径就是原样，写了路径就是替换"

    - **与 rewrite 的交互（易混点）**
        - 若 URI 被 `rewrite` 改写，则"不带 URI"的 proxy_pass 转发的是**改写后的 URI**（rewrite 会改变传给后端的路径）
        - 实际排查中"为什么后端收到的路径不对"，往往就是 rewrite + proxy_pass 组合导致的，建议逐步验证

- **协助记忆**
    - 不带 `/` = "原封不动转交"（包裹上的完整地址照旧）；带 `/` = "撕掉前缀重新贴地址"（location 前缀被剥掉换成新路径）。
    - 一句话：没写路径 = 原样；写了路径 = 替换。

- **进阶思考**
    - **proxy_pass 里带变量（如 $request_uri）时行为有什么不同？**
        - 使用变量时行为不同：请求的原始 URI 被整体忽略，变量展开值**原样**作为完整 URI 发给后端（不做规范化，前缀替换失效）；域名形式（如 `http://$backend/`）还需配 `resolver` 解析域名。若要保留原始 URI（含编码），应显式用 `$request_uri`。普通反向代理建议用固定地址，避免意外行为。
    - **为什么说"不带 URI 的 proxy_pass 是原样"不完全准确？**
        - 若请求经过了 `rewrite` 改写，则转发的是改写后的规范化 URI，而不是浏览器原始 URI（浏览器原始的 `$request_uri` 才是不变的值）。所以严格说：不带 URI 转发的是"当前请求的（可能已被改写的）URI"。

- **扩展信息**
    - **proxy_pass 转发头清单（配套必配）**：
        ```nginx
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;                        # 保持原 Host，避免后端按代理地址处理
            proxy_set_header X-Real-IP $remote_addr;           # 真实客户端 IP（直连场景；前置 CDN/LB 时需取 XFF 非信任段）
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 追加链路
            proxy_set_header X-Forwarded-Proto $scheme;         # 原始协议（http/https）
        }
        ```
        - 漏配 `Host` 的典型症状：后端按错误域名/默认站点处理（如 302 跳到别处）
        - 后端拿不到真实 IP 的典型症状：日志/限流看到的一直是反代 IP
    - **常见配置对照**：
        - `proxy_pass http://backend;` → `/api/user` → `/api/user`（原样）
        - `proxy_pass http://backend/;` → `/api/user` → `/user`（剥前缀）
        - `proxy_pass http://backend/v2/;` → `/api/user` → `/v2/user`（换前缀）

## 🤔 Nginx 怎么配置负载均衡？  
- **Nginx 负载均衡的核心是 `upstream` 块：定义一组后端服务器（可加权重、备份、down、健康检查等参数），再用 `proxy_pass` 指向这个 upstream 组，请求按调度算法分发到各后端。配置重点是"组（upstream）+ 转发（proxy_pass）+ 配套（转发头/连接复用/健康检查）"三部分。**  
    - **基本配置**
        ```nginx
        upstream backend {
            server 10.0.0.1:8080 weight=3;
            server 10.0.0.2:8080 weight=1;
            server 10.0.0.3:8080 backup;   # 备用，主节点全挂才启用
        }
        server {
            listen 80;
            location / {
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            }
        }
        ```
        - `upstream` 只能定义在 `http` 块顶层；多个 `server`/`location` 可共用同一个 upstream

    - **server 指令的常用参数**
        - `weight=N`：权重（默认 1），按比例分发（适合后端性能不均）
        - `backup`：标记为备用节点，主节点全部不可用时才接管（主恢复后自动让位）
        - `down`：手动下线标记（需 reload 生效；运行期动态调整上游是 Nginx Plus 的 API 功能）
        - `max_fails` + `fail_timeout`：失败计数，超过后在 `fail_timeout` 窗口内摘除该节点（被动健康检查/熔断；跨后端重试由 `proxy_next_upstream` 控制）
        - `resolve`：配合 DNS 动态解析后端域名（开源版 1.27.3+；需在 upstream 内配 `zone` 共享内存，`resolver` 可放 http 块或 1.27.3+ 的 upstream 块）

    - **关键配套（漏配会踩坑）**
        - 转发头：`X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Proto`（让后端拿到真实客户端 IP 与原始协议，否则日志/限流看到的都是反代 IP）
        - 连接复用：`upstream` 内加 `keepalive 32;`（每 worker 维度的连接池）+ `proxy_http_version 1.1;` + `Connection "";`（1.29.7 起上游默认启用 HTTP/1.1 + keepalive，旧三件套写法主要用于更早版本）
        - 超时：`proxy_connect_timeout`/`proxy_read_timeout`/`proxy_send_timeout`（默认 60s，慢接口需调大）
        - 调度算法默认轮询，可通过 `least_conn`、`ip_hash`、`hash` 修改（见下一题）

    - **排查与验证**
        - `nginx -t` 校验配置；`curl` 多次请求观察是否分发到不同后端（可临时在 location 返回 `$upstream_addr` 验证）
        - 看日志字段 `upstream_addr`/`upstream_status` 确认实际转发到哪台、结果如何（需在 `log_format` 中显式引用这两个变量，默认 combined 格式不输出）

- **协助记忆**
    - `upstream` 是"后端花名册"（列出所有服务器和属性），`proxy_pass http://backend;` 是"把活派给花名册"，调度算法决定"按什么顺序派活"。
    - 三件套：组（upstream）+ 派活（proxy_pass）+ 配套（头/复用/超时）。

- **进阶思考**
    - **配置了多个后端，怎么保证同一用户的会话（session）落在同一台？**
        - 用 `ip_hash`（按客户端 IP 哈希）或 `hash $cookie_xxx`（按 Cookie 哈希）实现会话粘滞；更推荐的做法是 session 外置（Redis 等共享存储），避免依赖节点粘滞（节点重启/扩容都会打散）。
    - **backup 节点什么时候会接管流量？**
        - 仅当"所有非 backup 节点都不可用"（被健康检查摘除或 down）时，backup 节点才参与分发；主节点恢复后 backup 自动退出。适合"主集群 + 冷备"的容灾场景。
    - **上游域名写域名而非 IP，解析是每次请求都做吗？**
        - 默认启动时解析一次并缓存；域名变化不会自动感知。要动态解析：配 `resolver` + `server 域名 resolve;`（1.27.3+ 开源版支持），用于后端 IP 频繁变动的场景（如云环境）。

- **扩展信息**
    - **常见生产 upstream 模板**：
        ```nginx
        upstream app {
            least_conn;
            server 10.0.0.1:8080 max_fails=3 fail_timeout=30s;
            server 10.0.0.2:8080 max_fails=3 fail_timeout=30s;
            keepalive 32;
        }
        server {
            location / {
                proxy_pass http://app;
                proxy_http_version 1.1;
                proxy_set_header Connection "";
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            }
        }
        ```
        - 演进建议：会话一致性优先"session 外置 + 无粘滞"（利于弹性扩缩容）；实在需要粘滞再用 `ip_hash`/`hash`，并注意 NAT 下 IP 集中导致不均

- **协助记忆**
    - `upstream` 是"后端花名册"（列出所有服务器和属性），`proxy_pass http://backend;` 是"把活派给花名册"，调度算法决定"按什么顺序派活"。

- **进阶思考**
    - **配置了多个后端，怎么保证同一用户的会话（session）落在同一台？**
        - 用 `ip_hash`（按客户端 IP 哈希）或 `hash $cookie_xxx`（按 Cookie 哈希）实现会话粘滞；更推荐的做法是 session 外置（Redis 等共享存储），避免依赖节点粘滞。
## 🤔 Nginx 负载均衡支持哪些调度算法及应用场景？  
- **Nginx `upstream` 支持的调度算法：轮询（默认）、加权轮询、`least_conn`（最少连接）、`random`（随机）、`ip_hash`（IP 哈希）、`hash`（通用哈希，可加 `consistent` 一致性哈希）。选择依据是三个问题：请求是否均匀？是否需要会话粘滞？节点能力是否相同？**  
    - **轮询（默认）**
        - 请求按顺序轮流分发到各后端，无权重时均匀
        - 适合：后端能力相近、请求处理时间接近的通用场景
        - 局限：不感知后端负载，慢请求多的后端会被继续压（慢请求累积效应）

    - **加权轮询（weight）**
        - 按 `weight` 比例分发，如 weight=3 与 weight=1 按 3:1 分配（实现为"平滑加权轮询"，高权重节点不会被连续打满）
        - 适合：后端机器性能不一（高配给大权重）；可配合权重做灰度放量

    - **least_conn（最少连接）**
        - 分发给当前活跃连接数最少的后端
        - 适合：请求处理时长差异大的场景（如长连接、慢接口），避免"轮询"导致慢请求堆积
        - 可与 `weight` 组合：在最少连接基础上按权重倾向（"最少连接 + 权重"）

    - **random（随机）**
        - 随机分发，可配 `two least_conn`（先随机取两台、再选连接少的一台，降低最坏情况）
        - 适合：负载大致均衡、对"确定性"无要求的场景；比轮询多一层随机性

    - **ip_hash**
        - 按客户端 IP 哈希，同一 IP 固定落同一台后端（IPv4 实际取前 3 段，即 /24 网段作为哈希键，IPv6 取完整地址）
        - 适合：需要会话粘滞（session）且后端无共享存储的旧架构
        - 注意：NAT/代理下大量用户同源 IP、同网段用户多，会导致严重不均；节点增减会重映射（无一致性）

    - **hash（通用哈希）**
        - 按指定 key 哈希（如 `hash $request_uri`、`hash $cookie_user`、`hash $remote_addr`）
        - 加 `consistent` 用一致性哈希：节点增减时只有少量 key 重映射（适合缓存亲和）
        - 适合：按 URL/用户粒度做缓存亲和、CDN 回源、一致性要求高的场景

- **协助记忆**
    - 轮询 = 轮流值班；加权 = 能干的多排班；least_conn = 谁闲给谁；random = 抓阄（可选"先抓俩选个闲的"）；ip_hash = 老熟客固定找同一个窗口；hash = 按号码牌分配、挂了号就不换窗口（consistent 是"换号牌也尽量不换窗口"）。

- **进阶思考**
    - **least_conn 和加权轮询冲突吗？怎么同时用？**
        - 不冲突：`least_conn` 与 `weight` 可组合，调度器在"最少连接"的基础上按权重倾向，适合"机器性能不一 + 请求时长不均"的场景。
    - **会话粘滞和"节点增减重映射"怎么权衡？**
        - `ip_hash`/`hash`（非 consistent）在节点增减时大部分 key 会重新映射（session 或缓存被打散）；`hash consistent` 只影响少量 key，适合缓存亲和但实现更复杂。业务上更推荐：session 外置（Redis）+ 无粘滞调度，兼顾弹性与均匀。
    - **负载均衡算法选型的判断路径？**
        - 后端同质、请求短平快 → 轮询
        - 后端异构 → 加权轮询
        - 请求时长差异大 → least_conn
        - 需要粘滞（且接受不均） → ip_hash / hash
        - 缓存/一致性要求高 → hash consistent

- **扩展信息**
    - **算法对比速查**：
        | 算法 | 依据 | 是否粘滞 | 适合 |
        |------|------|---------|------|
        | 轮询 | 顺序 | 否 | 同质后端 |
        | 加权轮询 | 权重 | 否 | 异构后端 |
        | least_conn | 连接数 | 否 | 时长不均 |
        | random | 随机 | 否 | 无要求 |
        | ip_hash | 客户端 IP | 是 | 会话粘滞 |
        | hash consistent | 指定 key | 是 | 缓存/一致性 |
        - 注：`least_time`（平均响应时间最短且活跃连接数最少，可配 `header`/`last_byte`/`inflight`）开源版自 1.31.0 起支持，此前及当前 stable 分支仍为 Nginx Plus 专有

## 🤔 Nginx 如何实现后端服务的健康检查？  
- **健康检查分两类：被动检查（开源版内置，基于 `max_fails` + `fail_timeout` 的失败计数摘除）和主动检查（Nginx Plus 或第三方模块，如 `nginx_upstream_check_module`，定时主动探测）。核心区别：被动靠"真实请求的失败"发现问题，主动靠"定时探测"提前发现问题——开源版开箱即用的是被动检查。**  
    - **被动健康检查（开源版内置）**
        - 原理：在 `fail_timeout` 窗口内累计 `max_fails` 次失败后，该节点被标记为不可用并摘除 `fail_timeout` 时长，时间到后重新尝试（默认 `max_fails=1`、`fail_timeout=10s`；上游仅一台服务器时 `max_fails`/`fail_timeout` 被忽略、该节点永远不会被标记不可用——刻意设计，防止瞬时故障导致整体无可用节点）
        - 配置：
            ```nginx
            upstream backend {
                server 10.0.0.1:8080 max_fails=3 fail_timeout=30s;
            }
            ```
        - 特点："被动" = 靠真实请求的失败来发现故障（连接错误、超时、`invalid_header` 等都会计入 `max_fails`，业务层 500 默认不计），无需额外探测、零额外开销；但不主动发现"半死"节点（能连上但响应慢/业务错误），且"第一个失败请求"必然落到故障节点
        - 关键参数：`proxy_next_upstream` 决定"何时把请求重试到下一台上游"（默认 `error timeout`，可加 `http_500 http_502 ...`）——注意 `error`/`timeout`/`invalid_header` 是**恒计入** `max_fails` 的，状态码类（500 等）才需要显式配置才计入

    - **主动健康检查（Plus / 第三方模块）**
        - Nginx Plus：`health_check` 指令，可定义 URI、间隔、超时、期望状态码（`match` 块），主动定期探测（要求 upstream 配 `zone` 共享内存）
        - 开源版替代：编译 `nginx_upstream_check_module`（社区开源），提供 `check` 指令
        - 特点："主动" = 定时发探测请求（HTTP/TCP），能提前发现异常并摘除，故障感知更快、更准（可探测业务就绪性如 `/health` 返回 200）；代价是额外的探测流量与配置复杂度

    - **查看上游状态**
        - `upstream_status` 变量记录每次请求所选上游的状态（需在 `log_format` 引用）
        - Nginx Plus 提供 `/api` 接口（`ngx_http_api_module`）查看/动态管理上游；第三方模块可暴露 `check_status` 页面

- **协助记忆**
    - 被动检查像"出事才知道"（用户访问失败才摘除），主动检查像"定期体检"（主动探测、提前发现）。开源版默认是前者，是"最低成本的兜底"。

- **进阶思考**
    - **主动健康检查为什么对"能连上但业务异常"的后端更有效？**
        - 被动检查只依赖连接/响应失败，如果后端进程活着但业务错误（如返回 500）不算"失败"（除非配置 `proxy_next_upstream` 把 500 也算），可能长期带病运行；主动检查可以探测业务就绪性（如检查 `/health` 接口返回 200），提前把异常节点摘除。
    - **被动检查的"第一个失败请求"必然打到故障节点，怎么缓解？**
        - 无法完全避免（被动就是事后发现），缓解手段：①调小 `fail_timeout`/`max_fails` 让摘除更快；②配合 `proxy_next_upstream` 让失败请求自动重试到其他节点（用户无感）；③对关键服务用主动检查（Plus/第三方模块）提前摘除。
    - **健康检查和"负载均衡选型"怎么配合？**
        - 摘除的节点要能"自动回归"（时间到重新尝试/探测恢复后重新加入）；生产常配：被动检查兜底 + 关键接口主动检查，两者叠加覆盖"快失败"与"半死"两类故障。

- **扩展信息**
    - **被动 + 主动配合的典型配置**：
        ```nginx
        upstream app {
            server 10.0.0.1:8080 max_fails=3 fail_timeout=30s;   # 被动兜底
            server 10.0.0.2:8080 max_fails=3 fail_timeout=30s;
            keepalive 32;
        }
        location / {
            proxy_pass http://app;
            proxy_next_upstream error timeout http_500 http_502;   # 这些情况算失败并重试
        }
        ```
        - 主动检查（Plus/模块）再叠加 `health_check`/`check` 定时探测业务就绪性
        - 日志配合：`log_format` 加 `$upstream_addr`/`$upstream_status`/`$upstream_response_time` 观察摘除与重试
## 🤔 proxy_cache 与 fastcgi_cache 的作用分别是什么？  
- **两者都是 Nginx 的响应缓存，区别在缓存对象：`proxy_cache` 缓存反向代理（HTTP 上游，如 Tomcat/Node）的响应，`fastcgi_cache` 缓存 FastCGI 协议后端（如 PHP-FPM）的响应。配置思路一致：定义缓存路径（`*_cache_path`）→ 指定缓存键（`*_cache_key`）→ 按状态码设置有效期（`*_cache_valid`）→ 在 location 启用（`*_cache`）。命中后不再请求后端，把"动态请求"变成"静态化"。**  
    - **proxy_cache（HTTP 上游缓存）**
        - 缓存 `proxy_pass` 转发对象的响应，适合缓存 API 动态响应、防刷热点接口
        - 关键配置：
            ```nginx
            proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:10m max_size=1g inactive=60m;
            location /api/ {
                proxy_cache api;
                proxy_cache_key $uri$is_args$args;
                proxy_cache_valid 200 10m;
                proxy_pass http://backend;
            }
            ```
        - 参数：`levels=1:2`（目录层级）、`keys_zone`（共享内存键区大小）、`max_size`（磁盘上限，超限由 manager 进程按 LRU 淘汰）、`inactive`（多久未访问即删，与有效期无关）

    - **fastcgi_cache（FastCGI 上游缓存）**
        - 缓存 `fastcgi_pass`（PHP-FPM）生成的页面，适合 PHP 站点整页缓存（未登录页面收益大）
        - 关键配置与 proxy_cache 对应：`fastcgi_cache_path`、`fastcgi_cache`、`fastcgi_cache_key`、`fastcgi_cache_valid`
        - 典型：`fastcgi_cache_key $scheme$request_method$host$request_uri;`（区分协议/方法/域名/URI）

    - **两者的共同点与区别**
        - 共同点：同一套缓存框架（路径、keys_zone、缓存键、有效期、命中后不再请求后端）
        - 区别：后端协议不同——`proxy_pass`（HTTP）vs `fastcgi_pass`（FastCGI），指令前缀不同

    - **配套注意（坑）**
        - 缓存键要区分用户：带 cookie/个性化页面不能共用缓存（加 `$http_cookie` 到键，或用 `proxy_cache_bypass`/响应头 `no-cache` 绕过）
        - 默认仅缓存 GET/HEAD（`proxy_cache_methods`），POST 不缓存；GET 动态接口只要满足 `proxy_cache_valid` 且响应头无 `Cache-Control: no-cache`/`Set-Cookie` 等就会被缓存
        - 响应头 `Set-Cookie` 及 `Cache-Control: no-cache/no-store/private` 会抑制缓存；而 `Cache-Control: max-age`/`public` 会被 Nginx 采纳并**覆盖** `proxy_cache_valid`（优先级：`X-Accel-Expires` > `Cache-Control: max-age` > `Expires` > `proxy_cache_valid`），需按业务用 `proxy_ignore_headers` 调整
        - `proxy_cache_lock`：并发同键请求只让一个回源、其余等待，防"缓存击穿"（热点 key 同时失效时打爆后端）

- **协助记忆**
    - `proxy_cache` 是"给 HTTP 后端的响应备货"，`fastcgi_cache` 是"给 PHP-FPM 的页面备货"——进货渠道不同，仓库（缓存）逻辑一样。
    - 四步口诀：建库（path）→ 定键（key）→ 设期（valid）→ 启用（cache）。

- **进阶思考**
    - **为什么说"缓存键"是缓存最容易出错的地方？**
        - 缓存键决定"什么算同一个资源"。如果键只含 URL，不同用户、不同 Cookie 的内容会串；如果键区分了 cookie 又可能导致缓存命中率极低。需要根据业务（公开接口 vs 个性化页面）设计缓存键与 bypass 策略。
    - **缓存穿透、击穿、雪崩分别是什么？怎么用 Nginx 缓解？**
        - 穿透：请求缓存里永远没有的 key（如恶意遍历）→ 每次都打后端，可对空结果也缓存/限流；
        - 击穿：热点 key 过期瞬间大量并发回源 → `proxy_cache_lock` 只让一个回源；
        - 雪崩：大量 key 同时过期 → 错峰失效：在后端响应头加随机 `Cache-Control: max-age`（Nginx 会采纳上游 max-age 覆盖 `proxy_cache_valid`），或按 URI 拆分为多个 location 配不同有效期。（注意：`proxy_cache_valid` 本身**不支持变量**）
    - **怎么验证缓存是否命中？**
        - 加 `add_header X-Cache-Status $upstream_cache_status;`，响应头会显示 `HIT`/`MISS`/`BYPASS`/`EXPIRED` 等，配合日志验证命中率与绕过行为。

- **扩展信息**
    - **缓存状态变量（调试利器）**：
        - `$upstream_cache_status`：`HIT`（命中）、`MISS`（未命中）、`EXPIRED`（过期重取）、`BYPASS`（被 bypass）、`STALE`（使用过期内容）等
        - 生产排查缓存问题先看这个头/日志字段，再决定调键、调期还是加锁
    - **fastcgi_cache 的 PHP 注意**：PHP 响应默认可能带 `Set-Cookie`（session）导致不缓存——公开/未登录页面缓存前需确认无 Cookie 或忽略之；缓存后登录态页面要用 `$http_cookie` 区分或 bypass

## 🤔 stream 模块作用是什么？  
- **`stream` 是 Nginx 的四层（L4）代理模块，负责 TCP/UDP 流量的转发与负载均衡，不解析应用层协议。常用于代理 MySQL、Redis、SSH、MQTT、gRPC 等非 HTTP 服务，与 `http` 模块（七层）分工互补：Web 流量用 http，数据库/缓存/二进制协议用 stream。**  
    - **stream 能做什么**
        - TCP/UDP 反向代理与负载均衡（如把 MySQL 3306 负载均衡到多台从库、Redis 多主多从代理）
        - SSL/TLS 终结（`listen ... ssl` 由 nginx 解密后转发）、按 SNI 透传分流（`ssl_preread` 只读 ClientHello 不解密，用于按域名区分后端）、访问控制（`allow/deny`）、`limit_conn` 连接数限流
        - 端口转发（统一入口映射到内网多台机器）、UDP 代理（DNS、syslog 等）

    - **基本配置**
        ```nginx
        stream {
            upstream mysql_backend {
                server 10.0.0.1:3306;
                server 10.0.0.2:3306;
            }
            server {
                listen 3306;
                proxy_pass mysql_backend;
            }
        }
        ```
        - stream 的 `upstream`/`server` 语法与 http 类似，但**没有** location、rewrite、limit_req 等 HTTP 专属指令

    - **与 http 模块的区别**
        - `http`：七层，解析 HTTP 协议，可按 URL/Header/Cookie 路由
        - `stream`：四层，只认 IP/端口，转发原始字节流，协议无关
        - 场景：数据库/缓存/SSH 用 stream，Web 流量治理用 http

    - **注意点**
        - stream 是独立于 http 的**顶层配置块**（`http {}` 之外的兄弟块，不能嵌在 http 内）
        - 四层转发无法按 URL 路由（不解析内容），粒度只能是 IP:端口
        - TCP 长连接场景注意 stream 的超时指令（`proxy_timeout` 是 stream 独有，读写空闲超时；`proxy_connect_timeout` 在 http 模块也有同名指令）
        - 会话/连接级粘滞：stream **没有** http 模块的 `ip_hash`/`sticky`，连接级粘滞需用 `hash $remote_addr [consistent];`（即按源 IP 哈希），需要按业务选型（见进阶思考）

- **协助记忆**
    - `http` 是"能读懂快递单的转运站"（按地址/备注分拣），`stream` 是"只管箱子往哪条传送带送"（不拆箱，只看目的地 IP:端口）。
    - 一句话：七层读内容、四层只看端口；数据库用四层、Web 用七层。

- **进阶思考**
    - **stream 做 MySQL 负载均衡要注意什么？**
        - MySQL 是有状态连接，简单的轮询会把同一会话分到不同库导致不一致。生产常用：读流量走多个从库（配合中间件），写流量走主库；或直接用 `hash $remote_addr` 做连接级粘滞（需客户端源 IP 相对稳定，NAT/统一出口下所有用户同源 IP 会落到同一台）。
        - 另外四层代理看不到 SQL 内容，做不到按库/表路由，这类需求要靠数据库中间件（如 ProxySQL）。
    - **ssl_preread 按 SNI 分流是怎么实现的？**
        - 用 `ssl_preread` 在**不解密** TLS 的情况下读 ClientHello 里的 SNI（域名），再用 `map` 映射域名→upstream，实现"同一个 IP:端口按域名转发到不同后端"（如多个 HTTPS 服务共享 443）。
        - 对比：`listen ... ssl` 是 Nginx 自己解密（解密为明文后透传，但 stream 仍不解析 HTTP 内容）；`ssl_preread` 只是"偷看域名"再透传，适合后端自己做 TLS 的场景。

- **扩展信息**
    - **stream 典型场景速查**：
        - MySQL/Redis/PostgreSQL 集群代理与读写分离入口 → stream + upstream
        - 多域名共用 443 端口（按 SNI 分流）→ ssl_preread + map
        - SSH 跳板/堡垒机端口转发 → stream 简单转发
        - 日志/监控 UDP 收集 → stream 的 UDP 支持
        - 微服务 gRPC（HTTP/2 over TCP）→ 用 http 的 `grpc_pass` 更合适（能读路由），纯二进制协议才用 stream
## 🤔 Nginx 如何实现限流？  
- **Nginx 限流分两类：`limit_req` 限制请求速率（单位时间请求数，基于漏桶算法）和 `limit_conn` 限制并发连接数。配置分两步：先在 `http` 块用 `limit_req_zone`/`limit_conn_zone` 定义"限流区"（zone，声明按什么 key 限、速率/内存大小），再在 location 用 `limit_req`/`limit_conn` 生效。**  
    - **请求速率限流（limit_req，漏桶算法）**
        ```nginx
        http {
            limit_req_zone $binary_remote_addr zone=req_limit:10m rate=10r/s;
            server {
                location /api/ {
                    limit_req zone=req_limit burst=20 nodelay;
                }
            }
        }
        ```
        - `rate=10r/s`：速率，可写 `1r/s`、`10r/m`
        - `burst=20`：允许的突发队列（超过速率的部分先排队）
        - `nodelay`：排队请求不延时直接处理（否则会按速率排队延后返回）；超过 `rate+burst` 的请求默认返回 503（可用 `limit_req_status` 改为 429）
        - 算法本质：漏桶——请求以固定速率"漏"出，突发流量先进桶排队，桶满（rate+burst）则溢出拒绝

    - **并发连接数限流（limit_conn）**
        ```nginx
        http {
            limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
            server {
                location / {
                    limit_conn conn_limit 20;
                }
            }
        }
        ```
        - 同一 key（如客户端 IP）超过 20 个并发连接则拒绝
        - 注意：`limit_conn` 是"同一时刻的连接数"，`limit_req` 是"单位时间的请求数"，两者管的事不同——防 CC 常两个一起上

    - **按什么限（key 的选择）**
        - 通常按客户端 IP（`$binary_remote_addr`，比 `$remote_addr` 省内存），也可按 `$server_name`、自定义变量（如按 user id、按接口）限（`limit_req_zone` 必须显式指定 key，没有默认）
        - 注意 NAT/代理场景：所有用户同源 IP 会被一起限流（误伤），可按需混用"IP + 其他特征"

    - **自定义限流响应**
        - `limit_req_status 429;` 可把默认 503 改成 429（更语义化，429 = Too Many Requests）
        - 配合 `error_page 429 = @rate_limit;` 跳转自定义页面
        - 排查：`$limit_req_status` 变量可看限流状态（`PASSED`/`REJECTED`/`DELAYED`），日志可记录

- **协助记忆**
    - `limit_req` 是"景区限流"（每小时只放 N 人进门），`limit_conn` 是"场馆限流"（同时在场最多 N 人）。
    - 两步走：先建"限流区"（zone，定义按什么限、多快），再在 location"生效"。

- **进阶思考**
    - **limit_req 的 burst 和 nodelay 组合效果是什么？**
        - `burst=20 nodelay`：突发 20 个请求会被立刻处理（不排队等待），但超过突发量的请求直接拒绝。去掉 `nodelay` 时，突发请求会排队按速率逐批放行（延迟增高，burst 内不拒绝、超出 rate+burst 仍拒绝）；还可写 `burst=20 delay=5`（1.15.7+）让前 5 个突发立即放行、其余排队。适合"允许短时突刺、但拒绝持续超速"的场景。
    - **限流是按 worker 独立计数吗？会不会不准？**
        - `limit_req_zone`/`limit_conn_zone` 用的是**共享内存**（zone 的大小就是共享内存大小），所有 worker 共享同一计数器，限流是全局准确的；`limit_req_zone` 内存满时按 LRU 淘汰最久未用的 key（可能短暂放行），而 `limit_conn_zone` 满时不淘汰、会对后续请求返回错误。
    - **怎么按"用户维度"限流而不用 IP？**
        - 用 `$cookie_userid`、`$http_x_user_id` 等变量做 key：`limit_req_zone $cookie_userid zone=user:10m rate=5r/s;`。注意：key 变量为空/缺失时该请求**不被计数、绕过限流**（官方行为），需业务兜底（如空值回退到 IP）以免匿名流量不受限。

- **扩展信息**
    - **限流与防护的组合套路（面试常整体问）**：
        - 接口级限流：`limit_req`（按 IP/用户/接口）
        - 连接级限流：`limit_conn`（防连接耗尽）
        - IP 黑名单：`allow`/`deny` + `geo`（来源分级）
        - 防刷验证：配合业务层验证码/风控（Nginx 限流只能挡"量"，挡不了"人"）
        - 分布式限流：单机 Nginx 限流在多实例下不共享，需配合网关层（如 Kong/APISIX 的限流插件）或 Redis 计数实现全局限流

## 🤔 如何实现 URL 重定向，同时保持浏览器 URL 不变？  
- **让"后端看到的 URL"变化、但"浏览器地址栏不变"，靠的是 Nginx 的"内部重定向"：用 `rewrite ... last`（或 `try_files` 末参数内部跳转）改写请求 URI 并重新匹配 location，全程在 Nginx 内部完成，浏览器只发了一次请求、无感知、地址栏不变。关键区分："内部"是 Nginx 内部换 URI（地址栏不变），"外部"是让浏览器重新请求新地址（地址栏变）。**  
    - **内部重定向 vs 外部重定向（先分清"谁换地址"）**
        - 外部重定向：`return 301/302` 或 `rewrite ... redirect/permanent`，服务端返回 3xx + `Location`，浏览器**再次请求新地址，地址栏变化**
        - 内部重定向：`rewrite ... last`、`try_files` 末参数跳转、`error_page` 内部跳转——Nginx 内部换一个 URI/location 继续处理，**地址栏不变**，浏览器全程只发过一次请求
        - 判断口诀：地址栏变=外部（浏览器感知），不变=内部（浏览器无感）

    - **典型配置（内部重定向）**
        ```nginx
        location /article/ {
            rewrite ^/article/(\d+)$ /index.php?id=$1 last;
        }
        # 浏览器访问 /article/123，地址栏不变，实际由 /index.php?id=123 处理
        ```
        - 原理：`last` 改写 URI 后重新匹配 location（如落到 `location ~ \.php$`），浏览器全程只发过一次请求

    - **其他实现方式**
        - `try_files $uri $uri/ /index.php?$args;`：文件不存在时内部跳转到 index.php（PHP 框架标配，同样地址栏不变）
        - `error_page 404 =200 @fallback;`：错误页内部跳转到命名 location 并把状态码改为 200（SPA 刷新兜底常用；`=` 后不带状态码会保留 404，影响监控与 SEO）
        - 反向代理效果类似（地址栏不变）：浏览器请求 Nginx 的 URL，由后端处理——但这是"代理转发"而非"重定向"，两者机制不同

    - **应用场景**
        - 伪静态/美化 URL（动态页面对外表现为静态地址，如 `/article/123` → `/index.php?id=123`）
        - SPA history 路由刷新兜底（`try_files ... /index.html`）
        - 旧路径平滑迁移（内部转到新路径）——注意仅适合临时过渡，长期迁移应配合 301 让爬虫/收藏更新到新地址

- **协助记忆**
    - 外部重定向是"快递改投新地址并通知收件人"（地址栏变，收件人重新寄）；内部重定向是"前台把件转到内部其他部门"（外面看起来还是同一个窗口，用户无感）。
    - 口诀：地址栏变=外部，不变=内部；伪静态/路由用内部，迁移/规范化用外部。

- **进阶思考**
    - **什么时候必须用外部重定向而不是内部重定向？**
        - 当"新地址需要被用户收藏/分享、或爬虫需要跟随到最终地址"时（如域名迁移、HTTP→HTTPS、去掉尾部斜杠的规范化），必须用 301/302 外部重定向；内部重定向适合"对用户透明"的场景（伪静态、内部路由）。
    - **内部重定向对 SEO 有影响吗？**
        - 有。内部重定向后爬虫看到的仍是原 URL（无 3xx），对"伪静态"场景这是优点（URL 对外统一、无重复内容）；但如果旧路径已变更且希望爬虫更新索引，必须用 301，否则旧 URL 永不"毕业"、权重不转移。
    - **rewrite last 和 try_files 的"内部跳转"有什么本质区别？**
        - `rewrite ... last`：改的是 URI 字符串，然后重新执行 location 匹配；`try_files` 末参数：同样是内部跳转重新匹配 location。区别在使用场景：rewrite 适合"正则驱动的改写"，try_files 适合"文件存在性优先、路由兜底"（不改写 $uri 本身、通常不易写错，但配置不当同样可能循环——内部重定向有 10 次上限）。
## 🤔 301 和 302 重定向有什么区别？Nginx 如何配置？  
- **核心区别在"是否永久"：301（Moved Permanently）表示永久重定向，浏览器和搜索引擎会缓存新地址；302（Found）表示临时重定向，默认不缓存，下次还访问旧地址。Nginx 用 `return` 或 `rewrite` 配置。选型口诀："永久迁移用 301，临时跳转用 302，要保方法用 307/308"。**  
    - **区别详解**
        - 301：永久，浏览器/代理/CDN 缓存新地址，搜索引擎把权重转移到新地址（SEO 需要）；适合域名迁移、永久改版、去尾部斜杠规范化
        - 302：临时，默认不缓存（可显式 `Cache-Control` 允许），每次仍先请求旧地址；适合临时维护、活动页跳转
        - 方法语义：301/302 默认都可能改变请求方法（POST 变 GET，RFC 措辞为 MAY）；307 保留方法+临时、308 保留方法+永久；303 See Other 则强制转 GET（常用于表单提交后跳转避免重复提交）
        - 301 的缓存风险：浏览器对 301 的缓存难以撤销（需强刷/清缓存），测试期误配 301 代价高

    - **Nginx 配置**
        ```nginx
        # 用 return（推荐，高效）
        return 301 https://$host$request_uri;      # HTTP→HTTPS 永久跳转
        return 302 /new-page;                      # 临时跳转
        return 301 /new-path;                      # 永久跳转（return 没有 permanent 参数，那是 rewrite 的 flag）

        # 用 rewrite（redirect=302，permanent=301）
        rewrite ^/old$ /new permanent;             # 301
        rewrite ^/old$ /new redirect;              # 302
        ```
        - 简单重定向优先用 `return`（不解析正则、开销更小，且立即终止后续处理）
        - 复杂路径重写用 `rewrite`
        - 注意：`$host` 不含端口，非标准端口场景会丢失端口（`$server_name` 同样不含端口，需用 `$http_host`（保留 host:port）或显式拼接端口）

    - **常用场景清单**
        - HTTP→HTTPS：`return 301 https://$host$request_uri;`
        - 域名迁移：`server { server_name old.com; return 301 https://new.com$request_uri; }`
        - 去尾部斜杠/规范化：`rewrite ^/(.*)/$ /$1 permanent;` 或 `return 301 $scheme://$host$uri/...`
        - 临时维护：`return 302 /maintenance.html;`
        - 保留 POST 的永久跳转：`return 308 https://new.com$request_uri;`

- **协助记忆**
    - 301 是"搬家并贴了新地址"（以后直接去新家，旧地址作废）；302 是"暂时在隔壁避雨"（雨停还回老地方）。
    - 一对记：301=永久=SEO 转移权重+缓存；302=临时=不缓存；要保方法：307=临时、308=永久。

- **进阶思考**
    - **什么场景下应该用 308 而不是 301？**
        - 当需要保留请求方法（尤其 POST/PUT）时用 308：301 在部分客户端/场景会把 POST 改成 GET 重放，可能造成重复提交等语义变化；308 永久重定向会原样保留方法。
    - **为什么搜索引擎喜欢 301 而不是 302？**
        - 302 转移权重的信号弱且不稳定（Google 将 301 视为强信号、302 为弱信号，但长期存在的 302 可能被搜索引擎当作 301 处理）——用 302 做迁移会导致新地址权重积累慢；301 明确告知"永久搬家"，权重转移更可靠。
    - **return 和 rewrite 做重定向，性能差多少？**
        - 功能等价时 return 更优：直接生成响应终止请求，不经过正则匹配、不重新匹配 location；rewrite 需正则 + 可能继续匹配后续规则。量级差异在高并发下才明显，但 return 的"更不易出错"价值大于性能。

- **扩展信息**
    - **状态码速查（重定向家族）**：
        - 301 永久（可能改方法）、302 临时（可能改方法）
        - 303 临时 + 强制转 GET（表单提交后）
        - 307 临时 + 保留方法（WebDAV/API 场景）
        - 308 永久 + 保留方法（API 迁移）
        - 选择逻辑：要不要永久？要不要保方法？——永久+不保方法=301，临时+不保方法=302，永久+保方法=308，临时+保方法=307

## 🤔 Nginx 环境，提示上传文件过大如何解决？  
- **上传文件过大报 413（Request Entity Too Large），根因是 Nginx 的 `client_max_body_size` 默认只有 1m。解决：在 `http`/`server`/`location` 块调大该值，并注意反向代理场景还要联动后端自身的上传限制——只改 Nginx 不改后端，仍会 413 或 500。**  
    - **问题根因**
        - `client_max_body_size` 默认 `1m`，请求体超过即返回 413
        - 注意：413 是 Nginx 在**读请求体前**就根据 `Content-Length` 头判断的（无该头的 chunked 上传在接收过程中判断）

    - **解决步骤**
        ```nginx
        http {
            client_max_body_size 100m;   # 建议放 server 或 location 更精确
        }
        ```
        - 调整后 `nginx -s reload` 生效
        - 若只要某个接口允许大文件，可只在对应 `location` 设置（`client_max_body_size` 可继承/覆盖）
        - 注意单位：`1m`/`100k`（大小写敏感？不——`m`/`k` 均可，数字无后缀时按字节）

    - **反向代理场景的联动配置（漏一个都失败）**
        - 后端也要能接收大请求体：
            - PHP-FPM：`php.ini` 的 `upload_max_filesize`、`post_max_size`（`post_max_size` 须 ≥ `upload_max_filesize`，否则仍失败）
            - Tomcat：`maxPostSize`（默认 2MB，仅表单类 POST）；`maxSwallowSize` 只影响"被中止的上传"时吞掉 body 以复用连接，不限制正常大上传
            - Spring Boot：`server.tomcat.max-http-form-post-size`（表单类）；multipart 上传受 `spring.servlet.multipart.max-file-size`/`max-request-size` 限制
            - 网关/中间层（如后端也有 Nginx/代理）同样要放开
        - 只改 Nginx 不改后端，仍会 413 或 500

- **协助记忆**
    - 413 就像"门太窄"——Nginx 这道门默认只让 1m 的包裹过，先把门加宽（client_max_body_size），还要确认后院仓库的门（后端限制）也够宽，否则包裹还是进不去。
    - 联动链条：Nginx →（如有）网关 → 后端容器（Tomcat/Spring Boot）→ 应用层（PHP upload_max_filesize），每一环都要放开。

- **进阶思考**
    - **上传超时/中断一般怎么排查？**
        - 除了 413，大文件上传还常见：`client_body_timeout`（两次连续读取请求体之间的间隔超时，默认 60s，慢速大文件可调大——注意它不限制总时长）、`client_body_buffer_size`（默认 8k/16k，缓冲不足时写临时文件，一般无需改）；网络差时可用分片上传 + 断点续传。
    - **上传到一半断了/超时，是 Nginx 还是后端的锅？**
        - 看错误日志分界：`client_body_timeout` 触发 → Nginx 层（慢速链路）；后端超时（如 PHP `max_execution_time`、Tomcat `connectionTimeout`）→ 应用层。可用 `$request_length`（含请求行/头/体）与 `Content-Length` 对比确认 Nginx 是否收完整。
    - **大文件上传应该走什么架构？**
        - 直传 Nginx → 后端会占用后端连接与内存；更优做法：对象存储直传（前端 → OSS/S3，签名 URL）+ 后端只拿元数据。注意：Nginx 的 `limit_rate` 限制的是响应发送速率、不限制上传，Nginx 侧无法对上传做限速。

- **扩展信息**
    - **相关指令速查**：
        - `client_max_body_size`：请求体上限（默认 1m，413）
        - `client_body_buffer_size`：请求体缓冲（默认 8k/16k，超出写临时文件）
        - `client_body_timeout`：两次读请求体的间隔超时（默认 60s）
        - `client_body_temp_path`：请求体临时文件目录（大上传需关注磁盘）
        - 排查大上传：配合 `access_log` 的 `$request_length`、`$upstream_response_time` 定位瓶颈
## 🤔 Nginx 如何实现动静分离？  
- **动静分离就是把"静态资源"（HTML/CSS/JS/图片/字体）和"动态请求"（需要后端计算）分开处理：静态由 Nginx 直接高效返回，动态转发给后端（Tomcat/PHP-FPM/Node）。好处是发挥 Nginx 静态处理优势（事件驱动 + sendfile 零拷贝）、大幅减轻后端压力——动态应用只处理真正的业务请求。**  
    - **核心思路**
        - 静态资源（`location` 匹配后缀/目录）→ Nginx 直接读文件返回（`sendfile` + `expires` 缓存头 + `gzip`）
        - 动态请求（其余）→ `proxy_pass`/`fastcgi_pass` 转发后端
        - 判断口诀："后缀/目录是静态，其余是动态"

    - **典型配置（后缀拆分）**
        ```nginx
        server {
            listen 80;
            server_name example.com;

            # 静态资源：Nginx 直接处理（带 hash 的静态资源长缓存）
            location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
                root /data/www;
                expires 30d;
                sendfile on;
            }
            # HTML 不缓存（页面入口需跟随发版）
            location ~* \.html$ { root /data/www; expires -1; }

            # 动态请求：转发后端
            location / {
                proxy_pass http://backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }
        }
        ```
        - 注意：正则 location 命中静态但文件不存在时返回 404、**不会回落到 `location /`**——若存在"静态后缀但由后端动态生成"的路径，需 `try_files` 兜底到命名 location（如 `try_files $uri @backend;`，不能回退到普通前缀块）

    - **更推荐的按目录拆分（生产常用）**
        - 按目录分：`location /static/ { alias /data/static/; expires 30d; }` 与 `location / { proxy_pass ...; }`——静态目录与业务路径彻底分离
        - 静态走 CDN/独立域名（如 `static.example.com`、`img.example.com`）效果更好：CDN 边缘缓存 + 独立域名免带业务 Cookie，进一步减少回源压力

    - **好处（为什么值得做）**
        - 静态不经过后端应用服务器，显著降低其 CPU/内存/连接压力（应用服务器只跑业务）
        - Nginx 处理静态文件性能高（事件驱动 + sendfile 零拷贝 + gzip）
        - 静态资源可长期缓存（`expires` + 版本号），动态部分单独缓存策略（如接口 `proxy_cache`）

- **协助记忆**
    - 动静分离像"超市分工"：方便面这类标准品（静态）直接上货架自取，现做熟食（动态）才叫后厨（后端）做——后厨不用天天补方便面。
    - 口诀：静态 Nginx 直返、动态转发后端；后缀或目录拆，CDN 扛大头。

- **进阶思考**
    - **动静分离后，静态资源的缓存更新怎么做？**
        - 静态资源带版本号（`app.v2.js`）或内容 hash 文件名（`app.a1b2c3.js`），发新版时文件名变化、缓存自动失效；或用 `expires` 控制缓存时长 + 发布时 CDN 刷新。注意：查询参数方式（`app.js?v=2`）在部分 CDN/代理下不参与缓存键，文件名 hash 更可靠。
    - **为什么静态要走独立域名/不带头 Cookie？**
        - ① 静态请求若带业务 Cookie，CDN 可能按用户缓存或拒绝缓存；② 独立域名（`static.`）的 Cookie 范围可单独控制（主域 cookie 若不设通配 `Domain=.example.com`，请求静态域不会携带）；③ HTTP/1.1 下同域连接数约 6 条、分域可并行更多（HTTP/2 多路复用后此动机基本消失，分域主要是为了 CDN 缓存与免 Cookie）。
    - **"动静分离"和"前后端分离"是一回事吗？**
        - 不是。动静分离指"静态文件 vs 动态请求"的分流（Nginx 层面）；前后端分离指"前端工程化产物（SPA） vs 后端 API"的架构（一般配合动静分离：前端构建产物当静态、API 反代到后端，如 SPA + `try_files /index.html` + `/api` 反代）。

- **扩展信息**
    - **动静分离 + SPA 典型组合**：
        ```nginx
        server {
            listen 80;
            root /data/www/spa;                    # 前端构建产物
            index index.html;
            # 静态资源长缓存
            location ~* \.(js|css|png|jpg|svg|woff2?)$ { expires 30d; }
            # SPA 路由兜底
            location / { try_files $uri $uri/ /index.html; }
            # 业务 API 反代
            location /api/ { proxy_pass http://backend; }
        }
        ```
        - 动静分离的进阶形态：静态上 CDN（域名分离）、动态走网关（限流/鉴权/灰度），Nginx 成为统一入口

## 🤔 Nginx 如何实现灰度发布？  
- **Nginx 灰度发布的核心是"按条件分流"：把一部分流量（按权重、特定 IP、特定 Header/Cookie/用户）导到新版本后端，其余走老版本，观察无异常后再逐步放量。实现方式从简单权重到 Lua 动态分流都有——选型的本质是"要多久生效、要多精细"：权重最快（reload 即换），map 按条件，Lua 按配置动态。**  
    - **方式一：权重灰度（最简单）**
        ```nginx
        upstream backend {
            server 10.0.0.1:8080 weight=90;   # 老版本 90%
            server 10.0.0.2:8080 weight=10;   # 新版本 10%
        }
        ```
        - 通过调整 weight 逐步放量（10% → 50% → 100%），每次 reload
        - 缺点：按"请求比例"而非"用户"，同一用户可能新旧版本交替（会话漂移）；无法精确到某个用户/白名单

    - **方式二：按 IP / Header / Cookie 分流（map 实现）**
        ```nginx
        map $cookie_user $backend_group {
            default         backend_old;
            ~^test_  backend_new;   # 测试账号走新版
        }
        upstream backend_old { server 10.0.0.1:8080; }
        upstream backend_new { server 10.0.0.2:8080; }
        server {
            location / { proxy_pass http://$backend_group; }
        }
        ```
        - 可实现"内测用户/特定 IP 段/指定 Header 先上新版"
        - 注意：变量值解析为 **upstream 组名** 时 keepalive 连接池仍可复用；仅当变量是需 `resolver` 解析的域名时才每请求新建连接（无连接池）——所以用 map 指向命名 upstream 是安全且高性能的。IP 网段匹配建议用 `geo` 模块（`map` 不支持 CIDR）
        - 变体：Cookie 钉住（响应 `Set-Cookie: version=new` + 用 `map $cookie_version` 路由，用户一旦进入新版本就持续在新版本）

    - **方式三：Lua 动态分流（OpenResty/ngx_lua）**
        - 用 `init_worker_by_lua` 定时器把 Redis/DB 中的灰度配置拉入 `ngx.shared.DICT`，再在 `balancer_by_lua`/`set_by_lua` 按用户维度（uid 哈希、白名单、百分比）动态决定后端，**无需 reload**
        - 适合精细化灰度（按用户/按地区/按比例渐进、随时调参），代价是需要 Lua 开发能力（注意 `balancer_by_lua` 禁用 cosocket，不能在该阶段直连 Redis）

    - **配套（灰度不是只改分流）**
        - 前提：监控对比（新旧版本的错误率、延迟、业务指标）、日志可区分版本
        - 快速回滚：权重归零 / 切回旧 upstream / 配置回滚
        - 灰度放量节奏：小流量验证（10%）→ 扩大（50%）→ 全量（100%），每步观察指标

- **协助记忆**
    - 灰度像"新菜试卖"：先把 10% 的流量（约 10% 的请求，或特定用户）导到新版本尝尝，没问题再逐步放量，出了事随时撤下。
    - 三档选型：权重=粗放快、map=按条件、Lua=精细动态。

- **进阶思考**
    - **权重灰度的"会话漂移"问题怎么解决？**
        - 权重轮询下同一用户可能这次老版本下次新版本，导致体验不一致。解决：结合 `hash $cookie_user`（同一用户固定后端）或 Cookie/Header 灰度（用户一旦进入新版本就持续在新版本）。
    - **灰度发布和"蓝绿部署"、"金丝雀发布"是一回事吗？**
        - 金丝雀（Canary）≈ 灰度：新版本先小流量验证再放量（本文说的就是这个）；蓝绿（Blue-Green）：新旧两套环境共存，通过入口一次性切换（切蓝切绿），回滚也是整体切回。灰度是"渐进式"，蓝绿是"全量切换"，可结合：蓝绿环境 + 灰度放量。
    - **灰度期间怎么知道用户落在哪个版本（排查/审计）？**
        - 在响应加头（`add_header X-Version new;`）或用日志变量标记（`$upstream_addr` 或自定义变量），灰度期间按版本分组统计错误率/延迟；用户反馈问题时也能通过版本头确认其在哪个版本。

- **扩展信息**
    - **灰度方案对照速查**：
        | 方案 | 生效方式 | 粒度 | 运维成本 | 适用 |
        |------|---------|------|---------|------|
        | 权重 | reload | 请求比例 | 低 | 快速放量 |
        | map 分流 | reload | IP/Header/Cookie | 低 | 内测/定向 |
        | Lua 分流 | 无需 reload | 用户/地区/比例 | 高 | 精细灰度 |
        | Cookie 钉住 | 响应头 | 用户会话 | 中 | 会话级灰度 |
        - 生产建议：小步快跑用权重；需要"指定用户先上新"用 map/Cookie；大规模精细灰度配合 Lua + 配置中心
## 🤔 简述 Nginx 版本升级流程？  
- **升级核心是"平滑、可回滚"：先备份配置、`nginx -t` 校验语法，再升级二进制，最后用信号完成平滑切换（新 master 接管、旧 worker 处理完存量连接后退出），全程不中断服务。理解 USR2/WINCH/QUIT 三个信号的交接流程是关键。**  
    - **升级前准备**
        - 备份现有配置与二进制：`cp -r /etc/nginx /etc/nginx.bak`、`cp /usr/sbin/nginx /usr/sbin/nginx.bak`
        - `nginx -t` 校验当前配置，确认无语法错误；`nginx -V` 记录当前编译参数（新版本要保留原参数）
        - 确认新版本变更（CHANGES，特别是配置项/模块变化），规划回滚预案

    - **二进制升级（编译安装场景）**
        - 编译新版本（保持原编译参数，可用 `nginx -V` 查看）：`./configure ... && make`
        - **平滑升级（信号交接流程）**：
            1. 新二进制覆盖到安装路径（如 `cp objs/nginx /usr/local/nginx/sbin/`）
            2. `kill -USR2 <旧masterPID>`：旧 master 启动**新 master**（加载新二进制）和新 worker；pid 文件改为 `nginx.pid.oldbin`
            3. 确认新 master 正常（`ps` 看进程、日志无错误）后，`kill -WINCH <旧masterPID>`：旧 worker 优雅退出（处理完存量连接后退出，新连接由新 worker 接管）
            4. `kill -QUIT <旧masterPID>`：退出旧 master（确认新版本稳定后再做，可延迟数天以保留回滚能力）

    - **包管理器升级（yum/apt 场景）**
        - 官方源升级：`yum update nginx` / `apt upgrade nginx`
        - 注意：`nginx -s reload`（HUP）只重读配置，**不会切换新版本二进制**——包升级后需 `nginx -t` 校验并执行平滑升级（USR2 流程）或重启使其生效，最后用 `nginx -V` 验证版本号
        - 某些发行版升级脚本会自动做 USR2 平滑升级，但不要依赖，按需手动确认

    - **回滚预案**
        - 用备份二进制覆盖回去，`kill -USR2` 类似流程切回旧版本（未发 WINCH 前旧 worker 从未退出、天然继续服务；新 master 启动失败时旧 master 改回 pid 文件名，服务不受影响）
        - 配置回滚：直接恢复 `/etc/nginx.bak` 后 reload
        - 平滑升级期间（旧 master 未 QUIT 前）随时可以 WINCH/QUIT 或切回，是最佳回滚窗口

- **协助记忆**
    - 升级 = 先备好"后路"（备份配置+二进制）→ 换"新引擎"（新二进制）→ 用信号"新旧无缝交接"（USR2 起新、WINCH 退旧、QUIT 收尾）→ 出问题"换回旧引擎"（回滚）。
    - 三个信号的记忆：USR2=起新、WINCH=退旧、QUIT=收尾；"旧 master 最后才退，留足回滚窗口"。

- **进阶思考**
    - **为什么要用信号而不是直接 kill 重启？**
        - 直接杀进程重启会有服务中断窗口（连接断开、请求丢失）。信号平滑升级让新旧进程并存交接：旧 worker 把已建立的连接处理完再退出，新连接直接给新 worker，实现"零停机"。
    - **升级后旧 master 一直不 QUIT 会怎样？**
        - 不 QUIT 则新旧两个 master 并存（旧 master 只剩管理职责、无 worker），新 master 已接管全部流量——这是刻意的"回滚窗口"设计；确认稳定后再 QUIT 旧 master。期间回滚：`kill -HUP` 旧 master 拉起旧 worker，再 `kill -QUIT` **新** master（或直接 TERM 新 master）完成切换回旧版本。
    - **reload 和 USR2 平滑升级的本质区别？**
        - reload（HUP）：同一二进制，只重读配置、重启 worker；USR2：换新二进制（新 master），常用于版本升级。改配置用 reload，换版本用 USR2。

- **扩展信息**
    - **平滑升级速查脚本（主干）**：
        ```bash
        # 1. 编译新版本并覆盖二进制后
        kill -USR2 $(cat /usr/local/nginx/logs/nginx.pid)   # 起新 master
        sleep 1
        # 2. 确认新 master 正常（ps -ef | grep nginx 应有两个 master）
        kill -WINCH $(cat /usr/local/nginx/logs/nginx.pid.oldbin)  # 退旧 worker
        # 3. 稳定后（可延迟几天）
        kill -QUIT $(cat /usr/local/nginx/logs/nginx.pid.oldbin)   # 退旧 master
        ```
        - 升级检查清单：备份 → `nginx -t` → 覆盖二进制 → USR2 → 验证（`nginx -V`、请求正常）→ WINCH → 稳定后 QUIT

## 🤔 Nginx 出现 499 状态码的常见原因是什么？  
- **499 是 Nginx 的自定义状态码（标准里没有），含义是"客户端在 Nginx 返回响应之前就关闭了连接"（源码 `NGX_HTTP_CLIENT_CLOSED_REQUEST`）。最常见原因是后端响应太慢、客户端等不及主动断开（尤其超时短的前端/爬虫/监控探活）。关键认知：499 是"客户端先走"，504 是"Nginx 自己等超时"——两者不要混。**  
    - **499 的含义**
        - Nginx 已收到请求但尚未把响应发回，客户端提前关闭了连接（记 `$status` 为 499）
        - 触发边界：仅在"请求已到达（请求行之后）至响应开始发送前"客户端断开才记 499；客户端连接建立后、请求行到达前断开（error.log 记 `client closed connection while waiting for request`，不记 499）、响应已开始发送后断开（记实际状态码）都不算

    - **常见原因**
        - **后端处理慢**：后端迟迟不返回，客户端等不及先行断开（最常见）——注意：Nginx 自身读超时（`proxy_read_timeout`）到期产生的是 **504**，不是 499
        - **客户端主动断开**：浏览器用户关闭页面、爬虫/脚本超时、健康检查探活等（这类少量 499 属正常）
        - **前端/网关超时短**：CDN、负载均衡器对上游等待时间设得比 Nginx 短（中间层先断开 → 499）
        - **网络抖动**：中间链路断开导致客户端连接异常关闭

    - **排查思路**
        - 看后端：接口是否慢（慢查询、死锁、依赖超时），用 `upstream_response_time` 日志分析耗时分布
        - 看超时配置：对 499 决定性的是"客户端/中间层（CDN、LB）超时是否短于后端耗时"（中间层先断开 → 499）；`proxy_read_timeout`（默认 60s）过短导致的是 504
        - 看客户端：请求方超时设置是否小于服务端处理时间
        - 区分是否正常：主动关闭的请求（探活、已取消请求）少量 499 属正常，大量 499 才需警惕；监控/告警统计需单独纳入 499（多数工具默认不统计非标准码）

- **协助记忆**
    - 499 = "客人等不及先走了"：菜（响应）还没上桌，客人（客户端）就走了。先怪后厨慢（后端），再怪等位时间设置（超时配置）。
    - 对比记：499=客人先走（客户端断开）、504=后厨超时（Nginx 等超时）、502=后厨没开门（后端连不上）。

- **进阶思考**
    - **大量 499 应该往哪个方向查？**
        - 优先查后端响应耗时（`upstream_response_time` 高的接口）、慢 SQL、锁等待；其次检查是否有人在用短超时批量请求（如某些爬虫/监控）；再看客户端/中间层超时配置。若想"客户端断开后后端仍把活干完"（避免后端无用功/重复计算），可设 `proxy_ignore_client_abort on;`（默认 off，客户端断开即中断上游连接）。
    - **499 和 504 在日志里怎么区分定位？**
        - 499：`$upstream_status` 往往为空/未完成（上游还没返回就被客户端断开）；504：`upstream timed out (110: Connection timed out)` 出现在 error.log，`$upstream_response_time` 接近超时阈值。一条日志同时看 `$status` + `$upstream_status` + `$upstream_response_time` 即可区分。

- **扩展信息**
    - **499 相关监控建议**：
        - 非标准状态码，多数监控/统计工具默认不纳入——告警与日志分析需单独配置（如 Prometheus 按 `status==499` 单独计数）
        - 探活类请求（健康检查、长轮询被取消）会造成"结构性 499"，基线内属正常；对比基线看突增才告警
        - 生产常用手段：日志加 `$upstream_response_time`、`$request_time`，499 高时按接口聚合定位慢接口
## 🤔 Nginx 出现 502 Bad Gateway 的常见原因与解决办法？  
- **502（Bad Gateway）表示 Nginx 作为网关/代理时，从上游（后端）收到了无效响应——通常是"连不上后端"或"后端进程异常"。排查主线：后端是否活着 → 端口/网络是否通 → 后端日志说了什么。区分关键：502 是"接不上/响应无效"，504 是"接上了但超时"。**  
    - **常见原因**
        - **后端服务未启动/崩溃**：应用进程挂了（含被 OOM Kill），Nginx 连不上端口
        - **端口或网络不通**：后端端口写错、监听在 127.0.0.1 而 Nginx 从外部访问、防火墙/安全组拦截、容器网络未通
        - **PHP-FPM 异常**（fastcgi 场景）：php-fpm 进程挂了、`fastcgi_pass` 地址错误、socket 权限不足
        - **后端响应异常**：后端返回非法响应（如提前关闭连接、响应头错误）——注意：连接/读超时（`proxy_connect_timeout`/`proxy_read_timeout` 到期）返回的是 **504** 而非 502
        - **后端负载过高**：连接数打满（`accept` 队列满/拒绝新连接），拒绝新连接
        - **DNS 解析失败**：`upstream` 用域名且解析不到（error.log 出现 `host not found in upstream`），也会 502

    - **排查步骤（按序执行）**
        1. 先确认后端：`curl http://后端IP:端口/health`、`telnet 端口` 或 `nc -zv IP 端口` 是否通
        2. 看后端日志：应用日志、`php-fpm` 日志（`php-fpm.log`）、`dmesg`/`journalctl -k` 是否有 OOM（`dmesg` 可能受 `kernel.dmesg_restrict` 限制）
        3. 看 Nginx 错误日志：`/var/log/nginx/error.log` 中 502 前后的 `upstream` 报错（`connect() failed`、`no live upstreams`、`host not found in upstream` 等）
        4. 检查配置：`proxy_pass` 地址、`upstream` 里的服务器 IP/端口、`fastcgi_pass`、`resolver`（域名场景）
        5. 重启/拉起后端，验证恢复

    - **解决方向**
        - 拉起/重启后端服务；修复端口与网络（防火墙、监听地址、容器网络）
        - 后端压力大则扩容或加限流；OOM 则调大内存或优化应用
        - PHP-FPM 常配 `pm.max_children`、`request_terminate_timeout`，避免子进程耗尽/卡死
        - 多实例场景：健康检查摘除故障节点（`max_fails`/主动检查），让 Nginx 自动避开坏后端

- **协助记忆**
    - 502 = "中转站把货转给仓库，仓库却没人接/接了说货不对"——先看仓库（后端）是否开门（进程活着）、门牌对不对（端口/网络）、仓管日志（后端日志）。
    - 三兄弟记法：502=连不上/响应坏（后厨没开门）、504=超时（后厨太慢）、499=客户端先走。

- **进阶思考**
    - **502 和 504 怎么区分定位？**
        - 502 = 后端"接不上/响应无效"（连接失败、进程崩溃）；504 = "未在时限内获得有效响应"（含连接超时 `proxy_connect_timeout`、读超时 `proxy_read_timeout`、发送超时到期——注意连接超时到期时后端并没连上，也是 504）。先看 error.log 是 `connect() failed`（502）还是 `upstream timed out`（504），方向完全不同。
    - **后端进程活着但 curl 通、Nginx 仍 502，还可能是哪里？**
        - 常见盲区：①监听地址是 `127.0.0.1` 而 Nginx 在别的机器/网络命名空间；②后端只是"能连上"但响应非法（`upstream sent invalid header`）；③`upstream` 里 IP 写错但恰好有别的服务在监听该端口；④容器场景 `docker` 网络没连对。逐项用 `curl`/`nc` 在 Nginx 侧实测，不要只看后端本机。

- **扩展信息**
    - **error.log 关键词速查**：
        - `connect() failed (111: Connection refused)` → 端口没服务/被拒
        - `connect() failed (110: Connection timed out)` → 网络不通/防火墙丢包（注意超时相关）
        - `no live upstreams while connecting` → 上游全部暂时不可用（被被动检查 `max_fails`/`fail_timeout` 标记，`fail_timeout` 到期自动恢复）
        - `host not found in upstream` → DNS 解析失败
        - `upstream sent invalid header` → 后端返回了非法响应
        - `upstream prematurely closed connection` → 后端在处理中途断开

## 🤔 Nginx 出现 403 Forbidden 的常见原因是什么？  
- **403（Forbidden）表示"服务器理解请求但拒绝访问"。常见根因：文件/目录权限不足、没有 index 文件且未开目录列表、`allow/deny` 访问控制拒绝、SELinux 限制、WAF/安全插件拦截。核心排查法：error.log 会直接写明拒绝原因，先看日志再动手。**  
    - **常见原因与解决**
        - **文件/目录权限不足**：worker 用户（通常 `nginx`/`www-data`）对文件无读权限、对路径无执行（x）权限 → `chmod`/`chown` 修正属主和权限（注意父目录每一级都需要 x 权限）
        - **目录无 index 文件且 autoindex 关**：访问目录时没有 `index.html` 等默认文件 → 加 index 文件或开 `autoindex on;`（error.log 记 `directory index of ... is forbidden`）
        - **allow/deny 规则拒绝**：配置了 IP 白/黑名单，来源 IP 不在允许范围 → 检查并修正 `allow`/`deny` 规则（error.log 记 `access forbidden by rule`）
        - **SELinux 限制**：`httpd_sys_content_t` 等上下文标签不匹配，Nginx 无权限读 → 用 `semanage fcontext` 设置正确标签（`chcon` 只临时改），或临时 `setenforce 0` 验证
        - **root/alias 路径错误**：路径**存在但无权限** → 403；路径**不存在** → 404（注意区分）
        - **防火墙/WAF/安全插件**拦截：外部防护层拒绝访问（需到对应层排查）

    - **排查思路（先日志后猜测）**
        - 看 error.log 具体原因（`Permission denied`、`directory index of ... is forbidden`、`access forbidden by rule` 等）——每个原因基本对应一类根因
        - `ls -l` 检查文件属主权限、`namei -l` 检查路径每一级的权限（父目录缺 x 也会 403）
        - 用 `curl -I` 与浏览器对比，确认是否与来源 IP 相关（访问控制）
        - 浏览器访问 vs curl 差异：浏览器带 Referer/Cookie，可能触发防盗链或 WAF；curl 无这些，可帮定位

- **协助记忆**
    - 403 = "门开了但保安不让进"——要么你没钥匙（文件权限）、要么这层楼没房间可看（无 index）、要么你上了黑名单（allow/deny）、要么物业规定（SELinux）。看门卫（error.log）怎么说。
    - 四类口诀：权限、索引、规则、SELinux；先看日志再排查。

- **进阶思考**
    - **SELinux 导致的 403 怎么快速确认？**
        - 执行 `setenforce 0`（临时放行）后再访问，若 403 消失基本可判定是 SELinux（用完恢复 Enforcing）；更规范的确认是查 `audit.log`（`ausearch -m avc`/`audit2why`）。修复用 `semanage fcontext -a -t httpd_sys_content_t 路径` + `restorecon -Rv` 持久生效（`chcon` 只改 xattr、不写入 fcontext 策略库，`restorecon` 或全盘重标后会还原）。
    - **403 和 401 有什么区别？**
        - 401（Unauthorized）：未认证/认证失败——先要证明"你是谁"（RFC 要求携带 `WWW-Authenticate` 头，如 `auth_basic` 弹窗、JWT 缺失）；403（Forbidden）：拒绝访问——可能"已认证但无权限"，也可能未认证就直接被拒（如 `deny all`、WAF 拦截发生在认证之前）。排查 401 看认证配置（`auth_basic`/鉴权服务），403 看权限与访问控制——两者方向不同。
    - **"文件权限看起来没问题"但还是 403，还可能是哪里？**
        - 常见盲区：①父目录缺 x（`namei -l` 逐级查）；②SELinux 上下文（`ls -Z` 看标签）；③`allow/deny` 与 `geo` 组合的规则顺序（`allow` 在前 `deny all` 在后才生效）；④`try_files`/内部跳转后落到无权限的 location；⑤挂载文件系统选项（`noexec`/`nodev` 等不影响读，但 NFS 挂载的权限映射会）。
## 🤔 如何优化 Nginx 性能？  
- **Nginx 性能优化分三层：进程/连接层（worker 数、连接数、fd 上限、事件模型）、静态资源层（sendfile/gzip/expires/缓存）、反向代理层（缓冲、upstream keepalive、超时），再配合系统内核参数。核心思路是"让 Nginx 少等待（事件驱动）、少拷贝（sendfile）、少建连（keepalive）"——但前提是先量化瓶颈，避免盲目调参。**  
    - **进程与连接层**
        - `worker_processes` 设为 CPU 核心数（或 `auto`）；`worker_connections` 调大，并设 `worker_rlimit_nofile` 为其 2 倍及以上（反代场景每请求至少 2 个 fd）
        - 事件模型：Linux 默认 `epoll`（无需改），必要时 `worker_priority -10` 提优先级
        - 确认 `ulimit -n`（fd 上限）足够，系统 `fs.file-max` 足够；`worker_connections` 不是越大越好，要匹配内存与真实并发

    - **静态资源层**
        - `sendfile on;`（零拷贝）+ `tcp_nopush on;`（攒包）+ `tcp_nodelay on;`（小响应及时发，避免 Nagle 延迟）
        - `gzip on;` 压缩文本（级别适中，1~5）+ `gzip_min_length` 过滤小文件
        - `expires` 长缓存静态资源 + 文件名 hash（减请求）
        - 减少正则 location，优先前缀匹配（`^~`）（正则匹配有开销，高并发热路径明显）

    - **反向代理层**
        - 上游 `keepalive` 连接池（+ `proxy_http_version 1.1;` + `Connection "";`，旧版本需显式配置；1.29.7 起上游默认启用 HTTP/1.1 + keepalive）减少与后端的建连开销
        - `proxy_buffering`：默认开启，缓冲响应减少后端压力、防慢客户端拖住后端连接；大响应或流式（SSE/下载）场景可关闭
        - `proxy_buffer_size`/`proxy_buffers`：响应头超过 `proxy_buffer_size` 会直接 **502**（`upstream sent too big header`，需调大）；响应体超过 `proxy_buffers` 总容量且未关缓冲时才会写 `proxy_temp_path` 临时文件
        - 合理设置 `proxy_read_timeout` 等超时，及时释放被慢上游挂起的连接/fd

    - **系统内核参数（可选）**
        - 调大 `net.core.somaxconn`、`net.ipv4.tcp_max_syn_backlog`（高并发队列；需同步配 `listen ... backlog=N` 才能生效，且开启 syncookies 时 syn_backlog 作用有限）
        - 调大本地端口范围 `net.ipv4.ip_local_port_range`（大量出站连接，默认 32768~60999 约 2.8 万个，高并发反代易耗尽）
        - 开启 `tcp_tw_reuse`（依赖 `tcp_timestamps=1`，仅对出站连接生效）复用 TIME_WAIT
        - 其他：`tcp_fin_timeout`（缩短 FIN_WAIT）、`tcp_max_tw_buckets`（限制 TIME_WAIT 上限）

- **协助记忆**
    - 优化 = "多雇人"（worker 数）、"每人多干活"（连接数/fd）、"走高速"（sendfile/gzip/缓存）、"少跑腿"（keepalive 复用连接）。
    - 先测量再调参：瓶颈在 CPU、IO 还是连接，决定调哪一层。

- **进阶思考**
    - **优化前应该先做什么？**
        - 先量化瓶颈再优化：用 `stub_status`/监控看 QPS、连接数、CPU、内存，用日志聚合分析 `upstream_response_time` 分布（`stub_status` 不含该字段，需日志或 Plus/第三方模块），确定是 CPU 密集、IO 密集还是连接瓶颈，避免盲目调参。
    - **worker_processes 超过核数为什么反而更差？**
        - 超过核数的 worker 无法并行执行（CPU 就那么多），只会增加上下文切换、锁竞争和共享内存访问开销。I/O 密集场景 1.5~2 倍核数的价值在于"更多进程等待 I/O"，但超量仍是负收益——判断依据是 `top` 看 worker CPU 是否吃满。
    - **Nginx 高并发下的常见瓶颈有哪些？**
        - ①fd 上限（`worker_connections`/`ulimit`）——报 `worker_connections are not enough`；②本地端口耗尽（出站连接，`ip_local_port_range`）；③accept 队列满（`somaxconn`）；④单核 CPU 吃满（SSL 加解密、正则、gzip 级别过高）；⑤磁盘 IO（静态大文件、日志写）。逐项对照监控定位。

- **扩展信息**
    - **优化排查命令速查**：
        - `top`/`htop`：worker CPU/内存，是否吃满
        - `ss -s`：连接状态统计（TIME_WAIT/ESTABLISHED 分布）
        - `ss -lnt`：监听队列溢出（`Recv-Q` 列）
        - `stub_status`/`nginx-prometheus-exporter`：QPS、活跃连接
        - `vmstat`/`iostat`：CPU 态、磁盘 IO 等待
        - 结论导向：`worker_connections are not enough` → 调连接/fd；TIME_WAIT 爆表 → 端口/tw_reuse；CPU 满 → 静态优化（sendfile/gzip 级别/减少正则）或加机器

## 🤔 如何监控 Nginx 的运行状态？  
- **Nginx 监控分三层：内置 `stub_status`（实时基础指标）、访问/错误日志分析（QPS、状态码、慢接口）、以及对接外部监控系统（Prometheus/ELK 等）做告警与可视化。核心原则：先定"看什么指标"（QPS/连接/错误率/延迟），再选"怎么采集"（内置/日志/导出器），最后配"告警阈值"。**  
    - **stub_status（内置指标）**
        ```nginx
        location = /nginx_status {
            stub_status on;
            allow 127.0.0.1;
            deny all;
        }
        ```
        - 输出：`Active connections`、`accepts`/`handled`/`requests`（进程启动以来累计）、`Reading`/`Writing`/`Waiting`（当前值）
        - `Active` = Reading + Writing + Waiting，含 keepalive 空闲连接（偏高属正常）；`accepts` vs `handled` 差异大说明连接处理瓶颈
        - 模块默认不编译，主流发行版已内置；自编译需 `--with-http_stub_status_module`
        - 注意：只能看本机（`allow 127.0.0.1`），不要暴露到公网（无鉴权）

    - **日志分析（更细的维度）**
        - 访问日志：统计 QPS、状态码分布、P95/P99 响应时间（配合 `$request_time`/`$upstream_response_time` 字段——默认 combined 格式不含这些，需自定义 `log_format`）
        - 错误日志：`error.log` 只含错误消息（`connect() failed`、`worker_connections are not enough` 等），不含状态码——5xx 需从 access.log 统计，再与 error.log 的失败记录关联分析
        - 工具：`goaccess`（实时单机）、ELK/Loki + Grafana（集中式）、按接口/状态码/耗时聚合

    - **对接外部监控系统**
        - Prometheus：`nginx-prometheus-exporter`（`--nginx.scrape-uri` 指向 stub_status）+ Grafana 面板与告警规则
        - 更细的指标：`nginx-vts-module`（编译进 Nginx 的第三方模块，提供虚拟主机级指标）或 access.log 经 Filebeat/promtail 采集入 Loki/ELK
        - 商业/云监控：Datadog、New Relic、云厂商监控 Agent

    - **关键监控指标（建告警先想清楚这些）**
        - QPS/请求量、活跃连接数（Active/Writing）、错误率（4xx/5xx 占比）
        - 上游健康：`upstream_status`、`upstream_response_time` 均值/峰值（慢接口/故障摘除预警）
        - 资源：CPU/内存/连接数是否接近上限（`worker_connections are not enough` 告警）
        - 错误码专项：499（客户端断开）、502/503/504（上游问题）突增要单独告警

- **协助记忆**
    - 监控 = "仪表盘"（stub_status 实时数字）+ "行车记录仪"（日志回放分析）+ "远程监控室"（Prometheus/ELK 告警）。
    - 三步走：定指标 → 选采集 → 配告警；"先看整体（连接/QPS），再看细分（错误码/延迟），最后看上游（健康/耗时）"。

- **进阶思考**
    - **stub_status 的计数器是累计值，怎么算 QPS？**
        - `requests` 是进程启动以来的累计值。两次采样做差再除以时间间隔即可得到 QPS：`QPS = (requests2 - requests1) / Δt`。想要自动化，可由 Prometheus 的 `rate(nginx_http_requests_total[1m])` 基于 scrape 间隔自动计算。
    - **为什么监控要同时看"日志"和"stub_status"？**
        - stub_status 只有连接/请求计数，看不到状态码分布、响应时间、具体接口——这些只能从日志拿到；而日志有延迟（批量采集），实时性不如 stub_status。两者互补：stub_status 看"忙不忙"，日志看"哪里有问题"。
    - **哪些指标适合设告警？**
        - ①错误率突增（5xx 占比超过基线）；②`upstream_response_time` P99 超过阈值（慢接口）；③`worker_connections are not enough`（容量告警）；④连接数/内存接近上限；⑤499 突增（结合业务判断）。告警要配"基线对比"而非绝对值，避免误报。

- **扩展信息**
    - **常用 log_format 建议**（采集关键字段）：
        ```nginx
        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for" '
                        'rt=$request_time uct=$upstream_connect_time '
                        'urt=$upstream_response_time ua=$upstream_addr us=$upstream_status';
        ```
        - 字段含义：`rt`（总耗时）、`uct`（上游建连耗时）、`urt`（上游响应耗时）、`ua`（实际转发到的上游）、`us`（上游状态码）——排查 499/502/慢接口全靠这些
## 🤔 Nginx 如何实现高可用性（HA）？  
- **经典方案是"Nginx + Keepalived 双机热备"：两台 Nginx 节点共享一个虚拟 IP（VIP），由 Keepalived 通过 VRRP 协议决定谁持有 VIP；主节点故障时备节点自动接管 VIP，客户端无需感知。配合健康检查脚本可同时感知 Nginx 进程/服务异常。核心思想：让"对外入口"（VIP）与"实际节点"解耦。**  
    - **核心原理（Keepalived + VRRP）**
        - 两台（或多台）节点组成一个 VRRP 组，按优先级确定 MASTER（默认高优先级优先，可抢占）持有 VIP
        - 客户端访问 VIP（如 192.168.1.100），请求实际落在当前 MASTER 的 Nginx 上
        - MASTER 故障（宕机/网卡断/keepalived 停止）时 BACKUP 在数秒内接管 VIP，实现故障转移
        - 关键：VIP 是"浮动的"——跟随 MASTER 移动，客户端永远只认 VIP，节点切换无感知

    - **健康检查脚本（可选但强烈推荐）**
        - 单纯 VRRP 只在"节点宕机"时切换，Nginx 进程挂了但节点活着不会切——所以配一个检测脚本：
            ```bash
            #!/bin/bash
            # /etc/keepalived/check_nginx.sh
            if ! kill -0 $(cat /var/run/nginx.pid) 2>/dev/null; then
                exit 1   # nginx 挂了，触发 VIP 转移
            fi
            ```
        - 在 keepalived 配置中指定：`track_script { chk_nginx { script "/etc/keepalived/check_nginx.sh"; } }`
        - 更稳的做法是探测 HTTP（如 `curl -f http://127.0.0.1/health`）确认服务可用而非只查进程（kill -0 无法发现假死）
        - 注意：脚本失败是"降低本机优先级"（配合足够大的 `weight`），backup 优先级超过后才会接管——weight 配置不当可能不切换

    - **其他高可用方案（对比选型）**
        - 前置负载均衡器（云 LB/硬件 LB）：LB 做健康检查，摘除故障 Nginx——云上首选，无需自建 keepalived
        - DNS 轮询：多台 Nginx 域名解析到多个 IP，客户端随机（粗粒度；基础 DNS 无法自动摘除故障，需配合托管 DNS 的健康检查 failover，如 Route 53）
        - 容器/编排平台：K8s 的 Service + Ingress 自带探活与故障转移——容器化场景首选

    - **注意点（生产必看）**
        - 会话/一致性：多节点 Nginx 尽量无状态（session 外置到 Redis），否则故障转移后会话丢失
        - 脑裂风险：Keepalived 主备切换要留意网络分区导致的"双主"（两台都持有 VIP 抢流量）——通过心跳多路/仲裁节点/优先级约束缓解
        - VIP 与后端联动：切换后新 MASTER 的 Nginx 要能正常访问后端（配置一致），否则"入口切了服务还是断"

- **协助记忆**
    - Keepalived 像"VIP 门牌接力"：门口挂着一块可以移动的 VIP 门牌，谁健康谁拿着（MASTER），拿门牌的人出事了，另一个人几秒内把门牌抢过来（接管），客人永远只认这块门牌。
    - 三件套：VIP（对外入口）+ VRRP（谁持有）+ 健康检查（何时切换）；"入口解耦节点，切换无感"。

- **进阶思考**
    - **Keepalived 主备切换的"几秒"延迟能接受吗？有更快的方案吗？**
        - VRRP 默认切换延迟约 3 秒（`advert_int=1` 时 master_down_timer = 3×advert_int + skew，调小 `advert_int` 可提速但增加心跳带宽），对大多数 Web 业务可接受；要求更快的场景可用前置云 LB（健康检查+摘除通常在秒级但可并发）或 TCP Anycast/BGP 路由级切换（需配合 BFD 快速收敛才能到毫秒级，成本高）。
    - **脑裂（双主）是怎么发生的？怎么防？**
        - 主备之间心跳网络中断（交换机故障/网卡问题），双方都认为对方失联，BACKUP 抢占 VIP 导致两台同时持有——客户端流量被撕成两半。缓解：①心跳走独立网卡/多路心跳；②仲裁机制（第三方节点判定，如 etcd/脚本）；③`nopreempt` 减少"原主恢复后"的回切抢占抖动（注意：它不阻止分区期间双方同时持 VIP，且仅 `state BACKUP` 下生效）。
    - **Keepalived 和"前置云 LB"怎么选？**
        - 云上：直接云 LB（自愈、免运维、可弹性），keepalived 用于需要 VIP 直连内网、或纯裸机/IDC 环境；自建 keepalived 需要自己维护心跳、脑裂、VIP 冲突，裸机/内网场景才划算。

- **扩展信息**
    - **Keepalived 核心配置骨架**：
        ```
        vrrp_instance VI_1 {
            state BACKUP            # 两台都配 BACKUP，靠 priority 决主（避免抢占抖动）
            interface eth0
            virtual_router_id 51    # 同一组必须一致
            priority 100            # 主 100 / 备 90
            advert_int 1
            virtual_ipaddress { 192.168.1.100/24 }   # VIP
            track_script { chk_nginx }               # 关联健康检查脚本
        }
        ```
        - 生产建议：state 都用 BACKUP + priority 区分（主 100/备 90），避免 `nopreempt` 之外的手动抢占；VIP 与业务同网段（VRRP 切换靠 gratuitous ARP 在本网段更新交换机，跨网段需额外配置 ARP 代理/路由）

## 🤔 你使用 Nginx 集成过 Lua 脚本吗？做过哪些业务场景？  
- **Nginx 集成 Lua 需要 OpenResty（或编译 ngx_lua 模块），它让 Nginx 具备脚本化能力，能在请求各阶段（`rewrite_by_lua`/`access_by_lua`/`content_by_lua`/`balancer_by_lua` 等）执行 Lua 逻辑。典型业务场景：灰度发布、动态限流、请求改写与鉴权、动态路由、缓存控制、统计分析、安全防护。核心价值：把"需要读配置、算逻辑、调外部服务"的动态决策从"写死配置"变成"运行时脚本"。**  
    - **常用 API 与阶段（先理解"在哪个阶段干什么"）**
        - `rewrite_by_lua`：改写 URI/变量（REWRITE 阶段）
        - `access_by_lua`：鉴权/限流（ACCESS 阶段，适合放业务入口逻辑）
        - `content_by_lua`：直接生成响应（CONTENT 阶段，适合轻量 API/网关逻辑）
        - `balancer_by_lua`：动态选择上游（upstream 选择，自定义负载均衡）
        - `log_by_lua`：请求结束后处理（日志、统计、采样）
        - 常用 API：`ngx.var`（变量读写）、`ngx.req`（请求头/体）、`ngx.header`/`ngx.say`（响应）、`ngx.shared.DICT`（共享内存，跨 worker 计数/缓存）、`resty.redis` 等外部调用库（redis/mysql/string 等默认捆绑；`resty.http`/`redis-cluster` 需另行安装）
        - 重要限制：部分阶段禁用 cosocket（`balancer_by_lua`/`set_by_lua`/`log_by_lua` 等不能直连 Redis/HTTP），需先用 `init_worker_by_lua` 定时器预取到共享内存，或用 `ngx.timer` 异步上报

    - **典型业务场景（每个都能展开说）**
        - **灰度发布**：`init_worker_by_lua` 定时器把 Redis 灰度配置拉入 `ngx.shared.DICT`，`balancer_by_lua` 按用户维度（cookie/uid 哈希/白名单/百分比）动态选后端，**无需 reload**
        - **动态限流/防刷**：`ngx.shared.DICT` 计数 + 自定义规则（按接口、按用户分级、动态阈值），比静态 `limit_req` 灵活；可对接 Redis 做全局限流
        - **请求改写与鉴权**：`access_by_lua` 调鉴权服务（JWT 校验、token 验证、白名单），通过才继续；`rewrite_by_lua` 动态改写 URL/参数
        - **动态路由**：按请求头/路径/用户属性动态选择 upstream，或按库分表路由（如按 uid 尾号路由到不同后端）
        - **缓存控制**：按业务规则决定缓存/绕过缓存（配合 `proxy_cache`，`ngx.var.upstream_cache_status` 判断）
        - **安全防护**：自定义 WAF 规则（URL 黑名单、SQL 注入特征匹配、UA 过滤）、动态拉黑（对接威胁情报）、验证码下发
        - **统计分析**：`log_by_lua` 实时计数（UV/PV）、采样打点到 Kafka/日志

    - **选型边界（什么时候不值得用 Lua）**
        - 简单/静态的需求（固定限流、固定路由）用原生指令更稳（`limit_req`/`proxy_pass`/`map`），少一层脚本就是少一层故障面
        - 需要复杂动态逻辑、需要读外部配置、需要自定义协议时，Lua 的价值才体现
        - Lua 脚本本身也要注意：避免阻塞事件循环（禁 `os.execute`/同步 sleep 等耗时调用；`ngx.sleep` 是非阻塞的可用）、控制共享内存大小、做好异常处理（ngx_lua 会捕获未处理异常返回 500，但业务上仍建议 `pcall` 包裹以便降级处理）

- **协助记忆**
    - 原生 Nginx 是"固定电路"（配置写死），加 Lua 后是"可编程 PLC"——想要什么逻辑都能在脚本里动态实现，尤其适合灰度、限流、鉴权这类"需要读配置/算逻辑"的场景。
    - 阶段口诀：改写在前（rewrite）、鉴权中间（access）、出内容（content）、选后端（balancer）、收尾统计（log）。

- **进阶思考**
    - **Lua 方案和 Nginx Plus 的"动态"能力怎么选？**
        - 若只需"动态改 upstream"（增减节点），可用 `resolve`（开源版 1.27.3 起支持 DNS 重解析）或 Nginx Plus 的 `api` 动态配置接口；若需要"按业务规则做分流/限流/鉴权"这类复杂逻辑，OpenResty/Lua 更灵活且开源免费。生产中常见组合：核心流量治理用原生+Plus，灰度/定制逻辑用 Lua。
    - **为什么 OpenResty 比"Nginx + 自己写 C 模块"流行？**
        - ①LuaJIT 性能接近 C、开发效率远高；②OpenResty 自带丰富的 `resty.*` 库（redis/http/redis-cluster 等）；③`ngx_lua` 的请求生命周期与 Nginx 完美集成（不阻塞事件循环）。对比之下，C 模块开发维护成本极高，只适合深度定制场景。
    - **Lua 在高并发下有什么性能/稳定性注意点？**
        - ①不要阻塞：避免同步 sleep、串行多次 cosocket 调用（用 `ngx.timer` 异步化）；②共享内存（`ngx.shared.DICT`）容量有限，满了会淘汰，注意命中率；③`resty.http` 等库的 keepalive 连接池要配置合理；④脚本要 `pcall` 包裹防异常拖垮 worker；⑤上线前压测（Lua 在每请求热路径上，性能影响需量化）。

- **扩展信息**
    - **最小可运行示例（灰度分流）**：
        ```nginx
        http {
            upstream app_old { server 10.0.0.1:8080; }
            upstream app_new { server 10.0.0.2:8080; }
            server {
                location / {
                    access_by_lua_block {
                        -- 按 uid 尾号灰度 10% 到新版本
                        local uid = ngx.var.cookie_uid or ""
                        if uid ~= "" and (tonumber(uid:sub(-1)) or 0) % 10 == 0 then
                            ngx.var.upstream = "app_new"
                        else
                            ngx.var.upstream = "app_old"
                        end
                    }
                    proxy_pass http://$upstream;
                }
            }
        }
        ```
        - 说明：示例展示"按用户维度分流"的骨架；生产应把规则/白名单放配置中心 + `ngx.shared`，用 `balancer_by_lua` 而非每请求改变量（性能更好）

## 🤔 Nginx 如何配置跨域（CORS）？  
- **跨域是浏览器"同源策略"导致的限制：协议、域名、端口任一不同即算跨域，浏览器会拦截页面脚本读取跨域响应（请求其实已发出）。CORS（跨域资源共享）通过响应头告诉浏览器"允许哪些来源访问"；Nginx 作为网关，最适合在边缘统一处理 CORS——核心是正确放行 `OPTIONS` 预检 + 输出 `Access-Control-*` 头。**  
    - **先理解跨域与同源策略**
        - 同源 = 协议 + 域名 + 端口都相同；任一不同即跨域（`http://a.com` 访问 `https://a.com` 也算）
        - 关键认知：浏览器拦截的是"页面脚本读取响应"，不是请求本身——所以跨域问题在服务端配置 CORS 头即可解决
        - 常见触发场景：前后端分离（前端 3000 端口调后端 8080）、不同子域互调

    - **两种 CORS 请求（决定要不要处理 OPTIONS）**
        - **简单请求**：`GET`/`POST`/`HEAD` + 仅使用简单头（`Accept`/`Accept-Language`/`Content-Language`/`Content-Type` 限 `text/plain`/`application/x-www-form-urlencoded`/`multipart/form-data` 等 safelisted 头）——浏览器直接发，只需响应带 `Access-Control-Allow-Origin`
        - **预检请求（Preflight）**：复杂方法（`PUT`/`DELETE`/`PATCH`）或自定义头（`Authorization`、`Content-Type: application/json`）——浏览器先发 `OPTIONS` 探路，服务端需响应 2xx 且带 `Access-Control-Allow-Methods`/`Allow-Headers`，否则真实请求被拦截

    - **Nginx 配置模板**
        ```nginx
        location /api/ {
            # 允许的来源：用 $http_origin 按请求来源动态回显（不建议写死 *）
            add_header Access-Control-Allow-Origin "$http_origin" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
            add_header Access-Control-Allow-Credentials "true" always;   # 跨域带 Cookie 时需要
            add_header Access-Control-Max-Age 86400 always;              # 预检结果缓存（浏览器自行封顶，Chrome 实际约 2 小时）
            # 预检请求直接返回 204，不转后端
            if ($request_method = OPTIONS) { return 204; }
            proxy_pass http://backend;
        }
        ```

    - **常见坑（高频踩点）**
        - `add_header` 默认只在 2xx/3xx 响应生效，4xx/5xx 不带——加 `always` 参数强制所有状态码携带
        - `Access-Control-Allow-Origin: *` 与 `Allow-Credentials: true` 冲突：带凭据（Cookie）时 Origin 必须回显具体来源（`$http_origin`），不能用 `*`
        - 用 `$http_origin` 回显时要做**来源白名单校验**（`map` 过滤），否则任意站点都能带上你的 Cookie 发起跨域请求
        - 预检 `OPTIONS` 也要带 CORS 头，且应返回 `204`/`200` 而不是落到后端业务逻辑
        - 多 location 重复配置易漏——可提到 `http`/`server` 级用 `add_header` 继承（注意 location 级会覆盖 server 级，需统一）

- **协助记忆**
    - 跨域像"小区门禁"：浏览器是门卫，同源=本小区随便走，跨域=外来车辆要登记（预检 OPTIONS），门卫放行靠的是"登记表"（`Access-Control-Allow-*` 响应头）。
    - 三要素：放行来源（Origin）、放行方法（Methods）、放行请求头（Headers）；带 Cookie 还要"指名道姓"（不能用 *）。

- **进阶思考**
    - **为什么跨域请求要先发 OPTIONS？能不能省掉？**
        - 预检是浏览器在"非简单方法/自定义头"（可能产生副作用）前，先问服务端"你允许这么干吗"——防止恶意站点用 `DELETE` 等危险操作直接打后端。简单请求免预检的真实原因是**历史兼容**：CORS 出现前浏览器就已允许表单/脚本发这类请求，为不破坏旧页面而豁免（并非因为"无副作用"，POST 就是有副作用的简单请求）。服务端可用 `Access-Control-Max-Age` 让浏览器缓存预检结果，减少重复探路。
    - **Nginx 配好 CORS 后还有哪些跨域方案？**
        - 反向代理"同源化"：前端请求发给同源的 Nginx，由 Nginx 转发到后端（`proxy_pass`）——前端视角变成同源，无需 CORS，这是前后端分离最常见的做法，与 CORS 方案可二选一
        - JSONP（仅 GET、老方案）、WebSocket（不受同源策略限制）等

- **扩展信息**
    - **安全来源白名单 + CORS 组合模板**：
        ```nginx
        map $http_origin $cors_origin {
            default "";
            "~^https?://(www\.)?example\.com$" $http_origin;   # 仅白名单内的来源回显
        }
        server {
            location /api/ {
                add_header Access-Control-Allow-Origin "$cors_origin" always;
                if ($cors_origin = "") { return 403; }   # 非白名单来源拒绝（可选）
                # ...其余 CORS 头与 OPTIONS 处理同模板
            }
        }
        ```
        - 生产建议：CORS 头统一收敛在网关层（Nginx），后端不各自配，避免漏配/不一致

## 🤔 Nginx 安全防护有哪些手段？  
- **Nginx 安全防护是"纵深防御"，从四层入手：①安全响应头（`add_header` 加固浏览器端防护）②WAF（ModSecurity/OpenResty）③流量与访问防护（限流、IP 黑名单、防盗链、防爬、屏蔽敏感文件）④信息隐藏与 TLS 安全。核心思路：把攻击面尽量挡在 Nginx 这一层。**  
    - **安全响应头（浏览器端加固）**
        ```nginx
        add_header X-Frame-Options "SAMEORIGIN" always;          # 防点击劫持（frame 嵌套；已被 CSP frame-ancestors 取代，可并存过渡）
        add_header X-Content-Type-Options "nosniff" always;      # 防 MIME 类型嗅探
        add_header Content-Security-Policy "default-src 'self'" always;  # CSP，防脚本注入（XSS），不能防 SQL 注入
        add_header Strict-Transport-Security "max-age=31536000" always;  # HSTS，强制 HTTPS
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "geolocation=(), camera=()" always;
        ```
        - 注意：`add_header` 默认不作用于 4xx/5xx，安全头务必加 `always`；CSP 需按业务白名单配置（`script-src`/`style-src` 等），配错可能影响页面功能
        - 安全头建议在 `server` 级统一加（location 级会覆盖），配合 `include` 文件维护

    - **WAF（Web 应用防火墙）**
        - ModSecurity：编译进 Nginx 的 WAF 模块，配合 OWASP CRS（核心规则集）拦截 SQL 注入、XSS、命令注入等；注意原厂已终止官方支持（2024），现为社区维护，替代方案可关注 Coraza
        - OpenResty 自研 WAF：用 `ngx_lua` 实现（如 `ngx_lua_waf`），按业务定制规则、动态拉黑，灵活但需自研
        - 云 WAF/商业 WAF：托管在 CDN/网关层，规则托管、开箱即用
        - 定位：WAF 挡"应用层攻击"，与"流量层防护"（限流/黑名单）互补

    - **流量与访问防护**
        - 防 CC/防刷：`limit_req`/`limit_conn`（详见"限流"一题）
        - IP 黑白名单：`allow`/`deny`、`geo` 模块按来源分级
        - 防盗链：`valid_referers` + `if ($invalid_referer)`（详见 location 扩展信息）——注意 Referer 可被伪造，属"防误引"的便利性措施而非安全边界
        - 屏蔽敏感文件：`location ~ /\. { deny all; }`（.git/.env 等）、`location ~ \.(sql|log)$ { deny all; }`
        - 防爬虫/恶意 UA：`if ($http_user_agent ~* (bot|scanner)) { return 403; }`（配合 map 更规范）
        - 防上传马：上传目录 `^~` 短路正则（详见 location 扩展信息）

    - **信息隐藏与 TLS 安全**
        - `server_tokens off;`：隐藏 Nginx 版本号（避免被针对性利用已知漏洞）
        - 自定义错误页：不暴露内部路径/栈信息
        - TLS：`ssl_protocols TLSv1.2 TLSv1.3;`（禁用 SSLv3/TLS1.0/1.1）、强加密套件（`ssl_ciphers`；`ssl_prefer_server_ciphers` 现代建议 `off`，且只影响 TLS 1.2 及以下）、HSTS、OCSP Stapling、证书链完整

- **协助记忆**
    - 安全 = "门上锁（安全头）+ 门口安检（WAF）+ 门卫查人（限流/黑名单）+ 不挂招牌（隐藏版本）"。
    - 口诀：头（安全头）、墙（WAF）、流（限流）、藏（信息隐藏）、链（TLS）。

- **进阶思考**
    - **CSP（内容安全策略）是什么？为什么它是防 XSS 的核心？**
        - CSP 通过 `Content-Security-Policy` 头声明"页面允许加载哪些来源的资源"（`default-src`/`script-src`/`style-src`/`img-src` 等）。即使攻击者注入了脚本，浏览器也会因来源不在白名单而拒绝执行——是纵深防御里最有效的 XSS 缓解手段之一。注意要按业务实际资源来源配置白名单，否则会误伤正常功能。
    - **ModSecurity 和 OpenResty WAF 怎么选？**
        - ModSecurity：现成规则（OWASP CRS）开箱即用，适合"快速上 WAF"；缺点是与 Nginx 主版本绑定、规则误报需调。OpenResty WAF：灵活可编程（按业务定制规则、动态拉黑、对接威胁情报），适合需要精细化控制的中大型团队；缺点是需要 Lua 开发能力。
    - **安全头都在 Nginx 加，后端还需要做什么？**
        - Nginx 加头属于"边缘防御"，后端仍需做：输入校验/参数化查询（防注入本体）、鉴权授权、防 CSRF token、敏感数据脱敏——Nginx 安全头是"减少暴露面"，不是安全本体。


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-nginx%E7%BB%B4%E6%8A%A4/  

