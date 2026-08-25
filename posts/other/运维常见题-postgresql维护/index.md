# 运维常见题-PostgreSQL维护


## 🤔 PostgreSQL 与 MySQL 的核心区别有哪些？  
- **PG 与 MySQL 的核心区别：①进程模型（PG 多进程 vs MySQL 默认一连接一线程）②MVCC 实现（PG 用 `xmin/xmax` 快照、旧版本留堆内待 VACUUM；MySQL InnoDB 用 undo log）③复制（PG 物理流复制强大；MySQL 基于 binlog）④查询能力（PG 函数/扩展/复杂查询更强）⑤生态（PG 功能全、MySQL Web/云生态多）⑥许可（PG 开源友好；MySQL 双许可）。选型：PG 重功能/复杂查询/数据一致性，MySQL 重简单/高并发 Web/生态。**  
    - **架构与模型**
        - **进程模型**：PG 多进程（每连接一个进程，连接多开销大，需连接池）；MySQL 默认一连接一线程（线程池是插件/企业版特性，非标配）——高并发下 MySQL 连接更轻
        - **存储引擎**：PG 统一堆存储（无引擎切换）；MySQL 多引擎（InnoDB/MyISAM 等，默认 InnoDB）
        - **配置**：PG `postgresql.conf`；MySQL `my.cnf`（部分参数支持在线改；PG 按参数 context 分 reload/restart，如 `shared_buffers`/`max_connections` 需重启）

    - **MVCC/事务**
        - **MVCC 实现**：PG 用系统列 `xmin`/`xmax` + 快照实现（旧版本留在堆内由 VACUUM 清理——表膨胀的根源）；MySQL InnoDB 用 `undo log` + 回滚段
        - **事务**：PG 支持完整 SQL 标准（外键/检查约束/窗口函数等实现更全）；MySQL 逐步补齐
        - **隔离级别**：PG 默认 `Read Committed`（可实现 Serializable）；MySQL 默认 `Repeatable Read`

    - **复制与高可用**
        - **PG**：物理流复制（WAL 传送）+ 同步/异步，高可用方案成熟（Patroni 等）；逻辑复制也强
        - **MySQL**：基于 binlog 的主从（半同步/GTID），MGR 组复制

    - **查询与扩展**
        - **PG**：功能全（JSONB 索引/全文检索/PostGIS/物化视图/递归查询/大量扩展），复杂查询/分析更强
        - **MySQL**：简单查询/高并发 Web 场景优化好，生态（LAMP）成熟

    - **选型建议**
        - 选 PG：复杂查询/分析、数据完整性要求高（金融）、JSON/地理空间、PostGIS、需要强扩展
        - 选 MySQL：简单 CRUD 高并发 Web、云托管生态、团队更熟悉 MySQL

- **协助记忆**
    - 对比口诀："PG 多进程重功能（复杂查询/扩展/一致性），MySQL 线程模型重简单（Web 高并发/生态）"。
    - 一句话："PG 是功能全的瑞士军刀，MySQL 是简单高效的 Web 利器"。

- **进阶思考**
    - **为什么 PG 在高并发连接多时性能下降？**
        - PG 每连接一个进程（fork/资源开销：内存/调度），连接多时进程开销大。所以 PG 生产要配连接池（PgBouncer/Pgpool）限制连接数。
    - **PG 和 MySQL 的 MVCC 有什么区别？**
        - 都基于多版本：PG 的版本信息在堆元组（`xmin`/`xmax`），旧版本留在堆内待 `VACUUM` 清理；MySQL InnoDB 旧版本在 `undo log` 回滚段。核心都是"读不阻塞写、写不阻塞读"，实现细节不同（PG 无回滚段）。
    - **什么时候从 MySQL 迁到 PG（或反之）？**
        - 需要复杂查询/JSONB/PostGIS/更强约束 → PG；高并发简单 CRUD + 已有 MySQL 生态 → MySQL。迁移成本高，选型要慎重（评估团队技能/生态/性能需求）。

- **扩展信息**
    - **版本对比**：PG 16/17/18（持续演进，PG 18 于 2025-09 发布）、MySQL 8.0/9.x
    - **生态工具**：PG（PgBouncer/Pgpool/Patroni/Barman）、MySQL（ProxySQL/MHA/Orchestrator）
    - **JSON 对比**：PG JSONB（索引/操作符强）、MySQL JSON（功能较弱）

## 🤔 简述 PostgreSQL 进程架构？  
- **PostgreSQL 是"多进程架构"：一个主进程（`postmaster`）+ 多个后台进程 + 每连接一个后端进程。核心进程：`postmaster`（主控）、`backend`（每连接）、`walwriter`（WAL 写入）、`checkpointer`（检查点）、`bgwriter`（脏页）、`autovacuum`（自动清理）。理解：一连接一进程，进程分工协作。**  
    - **整体架构（多进程）**
        - `postmaster`（主进程）：启动/管理所有进程，监听连接，fork 后端进程
        - 每连接一个 `backend` 进程：处理该连接的查询/事务（所有 backend 以同一 OS 用户 `postgres` 运行，权限在 SQL 层校验）
        - 共享内存：所有进程共享缓冲池（`shared_buffers`）、锁、事务日志等

    - **核心后台进程**
        - **`walwriter`（WAL 写入）**：把 WAL 日志从内存刷到磁盘（保证崩溃恢复；注意事务提交时的 WAL 落盘由 backend 自身 XLogFlush 完成，walwriter 只做后台写入）
        - **`checkpointer`（检查点）**：定期把脏数据页刷盘并做检查点（缩短恢复时间）
        - **`bgwriter`（后台写）**：后台把脏页刷到磁盘（减少检查点压力）
        - **`autovacuum launcher`/`worker`（自动清理）**：自动执行 VACUUM（清理死元组、防膨胀）
        - **统计（PG 15 起无独立进程）**：早期有 `stats collector` 进程，PG 15 起移除，统计由各进程写共享内存（供 `pg_stat_*` 视图；优化器用的是 `ANALYZE` 生成的 `pg_statistic`，两者勿混）
        - **`walreceiver`/`walsender`（复制）**：主库 walsender 发送 WAL 给从库 walreceiver
        - **逻辑复制**：logical replication launcher/worker 等

    - **关键机制（理解架构核心）**
        - **共享缓冲池**：数据页缓存（`shared_buffers`），所有进程共享
        - **WAL 与检查点**：写操作先写 WAL（walwriter 后台写 + 提交时 backend 刷盘）再异步落盘数据页（bgwriter/checkpointer），崩溃时靠 WAL 重放恢复
        - **一连接一进程**：连接数 = 进程数（连接多了进程开销大，需连接池）

    - **进程职责分工示意**
        ```
        postmaster（主控）
        ├── backend x N（每连接一个，处理查询）
        ├── walwriter（后台写 WAL）
        ├── checkpointer（检查点刷盘）
        ├── bgwriter（后台脏页刷盘）
        ├── autovacuum launcher/worker（自动清理）
        └── walreceiver/walsender（流复制）
        ```

- **协助记忆**
    - 进程架构 = "一个老板（postmaster）+ 每连接一个伙计（backend）+ 一堆后勤（walwriter/checkpointer/bgwriter/autovacuum）"。
    - 口诀："postmaster 主控、backend 连接、walwriter 写日志、checkpointer 检查点、autovacuum 清理"。

- **进阶思考**
    - **为什么 PG 用多进程而不是多线程？**
        - 历史原因 + 稳定性：多进程隔离好（一个进程崩溃不影响其他，可重启）。注意：所有 backend 以同一 OS 用户（`postgres`）运行，连接级权限在 SQL 层校验（不存在"每进程不同系统用户"）。代价：连接多时进程开销大，所以高并发要连接池。
    - **WAL、bgwriter、checkpointer 的分工（为什么都刷盘）？**
        - walwriter 后台写 WAL（日志，保证不丢）；bgwriter 平时慢慢刷脏数据页（减少检查点压力）；checkpointer 定期做检查点（强制刷盘 + 记录重放起点）。三者配合：数据最终落盘 + 崩溃可恢复。
    - **`pg_stat_*` 视图的数据从哪来？**
        - PG 15 起统计由各进程写入共享内存，`pg_stat_*` 视图读共享内存展示（表/索引访问、事务数、连接数等）——DBA 排查用。注意与优化器的 `pg_statistic`（ANALYZE 生成）区分。

- **扩展信息**
    - **相关视图**：`pg_stat_activity`（连接/活动）、`pg_stat_database`、`pg_stat_bgwriter`、`pg_stat_replication`（复制）
    - **相关命令**：`ps -ef | grep postgres`（看进程）；`pg_stat_statements`（扩展，需 `shared_preload_libraries` 加载后提供 SQL 统计）

## 🤔 WAL 机制的核心作用是什么？  
- **WAL（Write-Ahead Logging，预写日志）的核心作用：①崩溃恢复（数据持久性：先写日志再写数据，崩溃时重放日志恢复）②性能（批量顺序写日志 vs 随机写数据页，写 WAL 快）③复制（流复制靠 WAL 传送）④在线备份（PITR：WAL 归档 + 基础备份恢复）。核心："先写日志后写数据，日志是恢复/复制的根本"。**  
    - **是什么（定义）**
        - 数据修改前先把变更记录写入 WAL 日志，再改数据页——注意"先日志后数据"指**磁盘落盘次序**：脏数据页落盘前，WAL 必须先落盘（内存中先改页、提交时刷 WAL、数据页延迟落盘）
        - 如果崩溃：从 WAL 重放未落盘的修改，保证数据不丢

    - **核心作用**
        - **崩溃恢复（持久性）**：崩溃后靠 WAL 重放恢复到最新状态（数据不丢）
        - **性能提升**：写 WAL 是顺序写（快），数据页可延迟落盘（bgwriter/checkpointer）——把"逐事务的随机写数据页"改为"先顺序写 WAL + 数据页延迟批量落盘"（数据页落盘仍是随机写，只是延迟批量），大幅提升写性能
        - **复制基础**：主库产生 WAL → 传从库重放（流复制/逻辑复制）
        - **PITR（时间点恢复）**：基础备份 + WAL 归档 → 恢复到任意时间点

    - **工作流程**
        ```
        事务执行中：修改内存中的数据页（共享缓冲区）
        事务提交 → 确保 WAL 已刷盘（synchronous_commit 控制）——"先日志后数据"指磁盘落盘次序
        → 后台（bgwriter/checkpointer）延迟落盘数据页
        崩溃 → 重启 → 从 WAL 重放未落盘部分 → 数据恢复
        ```

    - **相关参数**
        - `synchronous_commit`：事务提交时 WAL 是否同步刷盘（on 持久、off 快但可能丢）
        - `wal_level`：`replica`（流复制）/`logical`（逻辑复制）
        - `max_wal_size`/`min_wal_size`：WAL 大小
        - `archive_mode`/`archive_command`：WAL 归档（PITR）

    - **WAL 与复制**
        - 流复制：主库 `walsender` 把 WAL 发送给从库 `walreceiver` 重放
        - 归档：WAL 文件归档到外部（配合基础备份做 PITR）

- **协助记忆**
    - WAL = "先记账（日志）后干活（写数据）"：崩溃了按账本（WAL）重算，副本按账本同步。
    - 四作用："崩溃恢复、顺序写提速、复制基础、PITR 归档"。

- **进阶思考**
    - **为什么"先写 WAL 再改数据页"能提升性能？**
        - WAL 是顺序追加写（磁盘顺序写快），数据页是随机写（慢）。把"每次修改都要随机写数据页"改成"先顺序写日志 + 数据页延迟批量落盘"——用顺序写换取速度，同时日志保证不丢。
    - **`synchronous_commit` 怎么选？**
        - `on`（默认）：事务提交必须 WAL 落盘（安全，性能稍低）；`off`：提交不等待落盘（快，但**系统崩溃/断电**可能丢失最近提交——进程崩溃不丢已提交事务）。高可用/金融选 on，追求性能可 off（接受少量丢失）。
    - **WAL 和检查点是什么关系？**
        - WAL 记录所有变更；检查点（checkpoint）是"把脏数据页刷盘 + 更新恢复起点"。检查点后，之前的 WAL 在**无归档/无复制保留需求时**才可不再需要（有 `archive_mode` 归档或复制槽/`wal_keep_size` 时旧 WAL 必须保留）。WAL 负责恢复，检查点缩短恢复时间。

- **扩展信息**
    - **相关视图**：`pg_walfile_name()`、`pg_current_wal_lsn()`、`pg_stat_replication`（复制）
    - **目录**：`pg_wal/`（WAL 文件，默认 16MB 一段）、`archive`（归档目录）

## 🤔 新部署的 PGSQL，如何优化配置？  
- **新部署 PG 优化配置核心（`postgresql.conf`）：①内存（`shared_buffers`=内存 1/4、`work_mem`、`effective_cache_size`）②并发（`max_connections`、连接池）③写入（`synchronous_commit`、WAL 参数）④查询（`default_statistics_target`）⑤维护（`autovacuum` 开启、`maintenance_work_mem`）⑥其他（`fsync`、checkpoint 参数）。核心：按硬件内存/磁盘/并发规模合理设置，避免默认值。**  
    - **内存类参数（最重要）**
        - `shared_buffers`：共享缓冲池，建议内存的 1/4（如 64GB 内存设 16GB）
        - `effective_cache_size`：操作系统缓存评估（给优化器用），建议内存的 3/4（如 48GB）
        - `work_mem`：排序/哈希操作内存（按需，太大易 OOM；如 4~16MB 起）
        - `maintenance_work_mem`：VACUUM/索引等维护操作内存（可较大，如 1~2GB；PG 14+ 按 autovacuum worker 各自分配）

    - **并发/连接类**
        - `max_connections`：最大连接数（默认 100，按业务评估；过多进程开销大）
        - 生产建议配连接池（PgBouncer）限制到库连接数
        - `max_wal_size`/`min_wal_size`：WAL 大小（影响检查点频率）

    - **写入/持久性类**
        - `synchronous_commit`：按需求（on 安全/off 快）
        - `wal_level`：`replica`（流复制）或 `logical`（逻辑复制）——按是否要用复制
        - `fsync`：保持 on（关掉丢数据风险）
        - `checkpoint_completion_target`：检查点完成目标（0.9 平滑）

    - **查询/统计类**
        - `default_statistics_target`：统计采样（默认 100，可调大提升复杂查询计划）
        - `random_page_cost`：随机 IO 成本（SSD 可调小，如 1.1）

    - **维护/自动清理类**
        - `autovacuum`：确保开启（默认 on，防表膨胀）
        - `autovacuum_vacuum_scale_factor`/`threshold`：清理触发阈值
        - `log_min_duration_statement`：慢查询日志阈值（如 1s）

    - **优化思路（按硬件配置）**
        - 内存大：shared_buffers/effective_cache_size 调大
        - SSD：random_page_cost 调小
        - 高并发：max_connections + 连接池
        - 只读/写多：按负载调 WAL/checkpoint
        - 用工具：`pgtune`（按硬件生成推荐配置）

- **协助记忆**
    - 配置口诀："内存（shared_buffers 1/4 + work_mem + cache_size）、并发（max_connections + 池）、写入（WAL/commit）、清理（autovacuum 开）、慢查询（log_min_duration）"。
    - 工具："pgtune 一键生成，按硬件调"。

- **进阶思考**
    - **`shared_buffers` 为什么建议 1/4 内存而不是越大越好？**
        - 太大：①与操作系统缓存"双缓冲"（挤压 OS 缓存）②缓冲表管理开销增加（B-tree/锁/LRU）③崩溃恢复时间变长（受检查点间隔影响）。1/4 是社区经验平衡（再大收益递减），且要与 `effective_cache_size` 配合（PG 缓冲 + OS 缓存）。
    - **`work_mem` 调大为什么可能 OOM？**
        - `work_mem` 是**每个排序/哈希操作**的内存，并发多操作时内存 = work_mem × 并发数（可爆炸）。所以 work_mem 不能设太大，按实际查询评估。
    - **为什么新部署要调而不是用默认？**
        - 默认值是"能跑"的保守值（小内存/低并发），不匹配生产硬件（大内存/高并发/SSD），导致性能浪费或瓶颈。按硬件/负载调优是上线前必做。

- **扩展信息**
    - **常用工具**：`pgtune`（按内存/磁盘生成推荐）、`pgbench`（压测）、`EXPLAIN ANALYZE`（验证）
    - **关键参数速查**：`shared_buffers`、`effective_cache_size`、`work_mem`、`maintenance_work_mem`、`max_connections`、`synchronous_commit`、`autovacuum`、`log_min_duration_statement`
## 🤔 Autovacuum 是什么？有什么作用？  
- **Autovacuum（自动清理）是 PG 的后台自动维护机制：自动执行 `VACUUM` 清理"死元组"（删除/更新产生的旧版本行），并更新统计信息（`ANALYZE`），防止表膨胀、优化查询计划。核心作用：清理死元组（防膨胀）+ 更新统计（优化器用）。**  
    - **是什么（定义）**
        - PG 内置的自动维护进程（`autovacuum launcher` 定期启动 `worker`）
        - 自动执行 `VACUUM`（清理死元组）和 `ANALYZE`（收集统计）
        - 默认开启（`autovacuum = on`），按阈值自动触发

    - **核心作用**
        - **清理死元组（防表膨胀）**：删除/更新的旧版本行（MVCC 残留）需要清理，否则表/索引膨胀（磁盘大、查询慢）
        - **更新统计信息（优化器）**：定期 `ANALYZE` 让优化器用最新统计生成好执行计划
        - **防 XID 回卷（事务 ID 冻结）**：`VACUUM FREEZE` 处理事务 ID 回卷（防数据库不可用）
        - **维护可见性映射（VM）**：帮助 index-only scan

    - **工作原理**
        ```
        autovacuum launcher（每 autovacuum_naptime 检查）
          → 发现表死元组超阈值（autovacuum_vacuum_scale_factor/threshold）
          → 启动 worker 对该表执行 VACUUM + ANALYZE
        ```
        - 触发：死元组数 > `threshold + scale_factor × 行数`
        - 默认：`autovacuum_vacuum_scale_factor = 0.2`（20% 行数为死元组触发）

    - **相关参数**
        - `autovacuum`：总开关（默认 on）
        - `autovacuum_vacuum_scale_factor`/`autovacuum_vacuum_threshold`：触发阈值
        - `autovacuum_naptime`：检查间隔（默认 1 分钟）
        - `autovacuum_max_workers`：最大 worker 数
        - `autovacuum_vacuum_cost_delay`/`limit`：清理代价限制（别影响业务）
        - 表级可单独调：`ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.1)`

- **协助记忆**
    - Autovacuum = "数据库的扫地机器人"：自动清理死元组（防膨胀）+ 更新统计（优化器）。
    - 口诀："清死元组（防膨胀）、更新统计（好计划）、防 XID 回卷（保可用）"。

- **进阶思考**
    - **为什么"更新统计"很重要（没统计查询会怎样）？**
        - 优化器靠统计信息选执行计划（走索引/全表扫/连接顺序）。统计过期 → 选了错计划 → 查询巨慢。所以 autovacuum 的 ANALYZE 让统计保持新鲜，是查询性能的基础保障。
    - **`VACUUM` 和 `ANALYZE` 有什么区别？**
        - `VACUUM`：清理死元组、回收空间（防膨胀）。`ANALYZE`：收集统计信息（优化器用）。Autovacuum 默认两者都做（清理后顺带分析）。
    - **`VACUUM FULL` 和普通 `VACUUM` 区别？**
        - 普通 VACUUM：清理死元组、空间可复用（但表文件不缩小，不锁表）。`VACUUM FULL`：重写表（压缩表文件、空间还给 OS）但**锁表**（阻塞读写）——大表慎用（停机窗口做）。

- **扩展信息**
    - **相关视图**：`pg_stat_user_tables`（last_autovacuum/dead_tuples/n_live_tup）、`pg_stat_all_tables`
    - **手动命令**：`VACUUM (VERBOSE, ANALYZE) 表名`、`VACUUM FULL 表名`、`ANALYZE 表名`
    - **日志**：`log_autovacuum_min_duration`（记录耗时清理）

## 🤔 Autovacuum 失效会有什么后果？  
- **Autovacuum 失效（被关/无法执行）的后果：①表膨胀（死元组堆积，表/索引文件巨大，磁盘暴涨）②查询变慢（扫描大量死元组、索引失效）③统计过期（执行计划变差）④XID 回卷风险（最严重：数据库强制只读/停机）。核心："膨胀 + 慢 + 统计旧 + 回卷风险"，其中 XID 回卷是灾难级。**  
    - **后果一：表膨胀（最直接）**
        - 死元组不断积累，表/索引文件变大（磁盘暴涨）
        - 表文件不回收（空间占用，需 VACUUM FULL 或重建才能还 OS）
        - 极端：几十 GB 表膨胀到几百 GB

    - **后果二：查询变慢**
        - 扫描要读大量死元组（即使可见行少，也要扫文件）
        - 索引膨胀 → 索引扫描变慢
        - 热路径查询性能断崖下降

    - **后果三：统计信息过期**
        - 不 ANALYZE → 优化器用旧统计 → 执行计划错（该走索引走全表）
        - 查询计划恶化，性能不可预测

    - **后果四：XID 回卷（最严重）**
        - 事务 ID（XID）32 位有上限（约 42 亿），接近极限时若未 VACUUM FREEZE，数据库会**强制进入只读/停止**（防数据损坏）
        - 这是灾难级：业务中断，需紧急处理
        - `datfrozenxid` 接近阈值时告警

    - **失效原因（为什么失效）**
        - `autovacuum = off`（手动关）
        - worker 不够（`autovacuum_max_workers` 小、长事务占住）
        - 大表清理慢（VACUUM 跟不上产生速度）
        - 锁冲突（VACUUM 被其他会话阻塞）
        - 资源不足（IO/CPU）

    - **排查/预防**
        - 监控：`pg_stat_user_tables` 看 `dead_tuples`/`last_autovacuum` 是否正常
        - 告警：膨胀率、dead_tuples 超阈值、`datfrozenxid` 接近
        - 手工补救：`VACUUM (VERBOSE, ANALYZE)`、必要时 `VACUUM FULL`（停机窗）

- **协助记忆**
    - 失效后果："膨胀（磁盘爆）、慢（扫描多）、统计旧（计划差）、XID 回卷（强制停）"。
    - 最严重：XID 回卷（数据库强制只读）——必须监控 datfrozenxid。

- **进阶思考**
    - **为什么 XID 回卷会导致"强制停机"？**
        - XID 是 32 位（约 42 亿），旧事务 ID 会"回卷"（wrap-around）导致数据可见性错乱（旧数据被误判为未来/已删）。PG 通过 `VACUUM FREEZE` 标记老事务防止回卷；不清理则超过阈值强制只读（保护数据）→ 业务中断。
    - **怎么监控 autovacuum 是否正常工作？**
        - 看 `pg_stat_user_tables.last_autovacuum`（上次清理时间，太久没跑 = 异常）、`n_dead_tup`（死元组数，持续涨 = 没清）、日志（`log_autovacuum_min_duration`）。
    - **膨胀了但不想停机（VACUUM FULL 锁表）怎么办？**
        - 用 `pg_repack`（在线重建表，不锁业务）替代 VACUUM FULL；或分批迁移（新表/交换）。高频更新表可调表级 autovacuum 阈值更激进。

- **扩展信息**
    - **相关监控**：`pg_stat_user_tables`（dead_tuples）、`pg_database`（datfrozenxid）、`pg_stat_all_tables`
    - **工具**：`pg_repack`（在线重建）、`VACUUM FULL`（停机）、`autovacuum` 参数调优

## 🤔 MVCC 是什么？有什么作用？  
- **MVCC（多版本并发控制，Multi-Version Concurrency Control）是数据库并发控制机制：每个事务/语句看到的是"快照"对应的数据版本，读写互不阻塞（读不阻塞写、写不阻塞读）。作用：①高并发下读写并行不冲突 ②快照一致性（隔离级别决定快照时点：`READ COMMITTED` 每条语句取新快照，`REPEATABLE READ`/`SERIALIZABLE` 才是事务级快照）③避免读写锁竞争。PG 实现：元组带版本（`xmin`/`xmax`）+ 快照，旧版本留堆内待 VACUUM。**  
    - **是什么（定义）**
        - 数据库保存行的多个版本（旧版本保留），每个事务看到一致快照
        - 读写互不阻塞：读事务不锁写、写事务不锁读
        - 相比"锁锁串行"：MVCC 用多版本 + 可见性判断替代部分锁

    - **核心作用**
        - **读写并行**：读不阻塞写、写不阻塞读（高并发 OLTP 关键）
        - **快照一致性**：`READ COMMITTED` 避免脏读（不可重复读仍可能）；`REPEATABLE READ`/`SERIALIZABLE` 事务内一致（避免不可重复读）
        - **减少锁竞争**：读操作不加共享锁（读永远可进行）
        - **回滚简单**：abort 事务后新版本转为不可见（死元组，待 VACUUM 清理）——PG 无 undo/回滚段

    - **PG 的 MVCC 实现**
        - 行版本（元组）带系统列：`xmin`（创建该版本的事务 ID）、`xmax`（删除/更新该版本的事务 ID）
        - 事务根据 `xmin`/`xmax` + 快照判断行的可见性
        - 删除/更新：旧版本保留（新版本插入），旧版本成为"死元组"（等 VACUUM 清理）
        - 快照：`pg_current_snapshot()` 可看

    - **MVCC 与锁（配合）**
        - MVCC 解决"读写冲突"；写写冲突仍用锁（行锁）
        - 事务隔离级别控制快照行为（Read Committed 每次读新快照、Repeatable Read 事务内一致）

- **协助记忆**
    - MVCC = "拍照记状态"：每个事务看自己"拍照时"的版本，别人改不影响我。
    - 口诀："读不阻塞写、写不阻塞读、多版本快照、旧版本待清理"。

- **进阶思考**
    - **MVCC 的"代价"是什么？**
        - 旧版本（死元组）堆积 → 表膨胀 → 需要 VACUUM 清理（这就是 autovacuum 存在的原因）。MVCC 用"空间换并发"：多版本占空间，清理靠后台。
    - **PG 和 MySQL 的 MVCC 可见性判断有什么不同？**
        - PG 靠元组 `xmin`/`xmax` + 事务快照判断（无回滚段，旧版本留堆内）；MySQL InnoDB 靠 `undo log` + ReadView。理念相同（多版本+快照），实现不同。
    - **MVCC 下"写写冲突"怎么处理？**
        - MVCC 只解决读写；写写冲突（两个事务改同一行）用行锁 + 等锁（可能死锁，PG 自动检测回滚一方）。

- **扩展信息**
    - **相关概念**：快照隔离（Snapshot Isolation）、`xmin`/`xmax`、死元组（dead tuple）、`VACUUM`
    - **隔离级别**：`READ COMMITTED`（默认）、`REPEATABLE READ`、`SERIALIZABLE`
    - **查看**：`SELECT xmin, xmax, * FROM 表`（看版本列）

## 🤔 PGSQL 查询慢，如何排查？  
- **PGSQL 查询慢排查核心：①`EXPLAIN ANALYZE` 看执行计划（是否走索引/全表扫/行数估算）②定位慢查询（`pg_stat_statements`/慢查询日志）③常见原因：缺索引/统计过期/表膨胀/锁等待/资源不足 ④对症：建索引/ANALYZE/VACUUM/查锁/加资源。核心："先 EXPLAIN 看计划，再按计划找根因"。**  
    - **第一步：定位慢查询**
        - 慢查询日志：`log_min_duration_statement`（如 1s 记日志）
        - `pg_stat_statements`：按总耗时/次数排（常用慢 SQL）
        - `pg_stat_activity`：看正在跑的查询（state/wait_event）
        - 应用侧抓慢 SQL

    - **第二步：EXPLAIN 分析（核心）**
        ```sql
        EXPLAIN (ANALYZE, BUFFERS) SELECT ...;
        ```
        - 看：是否走索引（Index Scan vs Seq Scan）、预估 vs 实际行数（差别大=统计旧）、是否有排序/哈希/嵌套循环
        - 常见：全表扫描（缺索引/统计错）、行数估算偏差大（统计过期）、Buffer 大量读

    - **第三步：定位根因（常见原因）**
        - **缺索引/索引没走**：加索引、检查统计
        - **统计过期**：`ANALYZE` 更新统计（autovacuum 未跑/表更新快）
        - **表膨胀**：死元组多 → `VACUUM`/检查膨胀
        - **锁等待**：`pg_locks`/`wait_event` 看是否被锁阻塞
        - **资源不足**：CPU/IO/内存、连接数满
        - **SQL 本身差**：`NOT IN`/无过滤/函数索引缺失/大范围
        - **配置差**：work_mem 小（排序落盘）等

    - **第四步：解决**
        - 建索引（`CREATE INDEX`/复合索引/部分索引）
        - `ANALYZE`/`VACUUM`（统计/膨胀）
        - 重写 SQL（避免全表/加过滤/分页优化）
        - 查锁（`pg_locks`/解除阻塞事务）
        - 加资源/调配置（work_mem/内存）

- **协助记忆**
    - 排查口诀："先定位（慢日志/pg_stat_statements）→ EXPLAIN 看计划 → 找根因（索引/统计/膨胀/锁/资源）→ 对症下药"。
    - 核心："EXPLAIN ANALYZE 是眼睛，统计/索引/膨胀/锁是常见病"。

- **进阶思考**
    - **`EXPLAIN ANALYZE` 和 `EXPLAIN` 区别？**
        - `EXPLAIN`：只给执行计划（估算）；`EXPLAIN ANALYZE`：实际执行并给出实际耗时/行数。实际行数 vs 估算差异大 → 统计过期。生产排查用 `EXPLAIN (ANALYZE, BUFFERS)`（真实但会执行）。
    - **"统计过期"怎么看出来的？**
        - EXPLAIN 里 `rows`（预估）与 `actual rows`（实际）差很多（如预估 10 实际 10 万）→ 统计过期。解决：`ANALYZE` 更新。
    - **怎么判断是"查询慢"还是"锁等"？**
        - `pg_stat_activity` 看 `state`（active 还是等待）和 `wait_event_type`（`Lock` = 等锁）。等待锁不是查询本身慢，是并发冲突，需处理锁（谁占着）。

- **扩展信息**
    - **常用工具**：`pg_stat_statements`（扩展）、`EXPLAIN ANALYZE`、`pg_stat_activity`、`pg_locks`、`pg_stat_user_tables`
    - **索引类型**：B-tree（默认）、Hash、GIN（JSON/数组）、GiST、BRIN——按查询类型选
## 🤔 PGSQL 有哪些备份方案？  
- **PG 备份方案分逻辑备份和物理备份：①逻辑备份（`pg_dump`/`pg_dumpall`：SQL 转储，跨版本/跨库迁移）②物理备份（文件级拷贝/`pg_basebackup`：整库副本，适合大数据量）③`PITR`（基础备份 + WAL 归档：时间点恢复）④外部工具（`Barman`/`pgBackRest`/云快照）。核心：按场景选（逻辑=迁移/单库，物理=PITR/大数据），生产用 PITR。**  
    - **逻辑备份（pg_dump）**
        - `pg_dump`：单库/单表转储（SQL 或自定义格式）
        - `pg_dumpall`：整个集群（含角色/全局对象；仅纯文本格式，不支持 `-Fc`，大库不建议用它备数据）
        - 优点：跨版本（可恢复到**更高**大版本）、跨架构可恢复、可只备单表、粒度细
        - 缺点：大数据量慢（逐行导出）、不支持增量、恢复慢
        - 适用：单库/单表备份、迁移、结构备份

    - **物理备份（文件级/basebackup）**
        - `pg_basebackup`：整库物理副本（备份数据文件+WAL）
        - 文件拷贝（需停库或一致性处理）
        - 优点：快（文件复制）、完整（全库）、恢复快
        - 缺点：需同**大版本**（major version）恢复（跨大版本需 `pg_upgrade`）、占空间大
        - 适用：大数据量、整库恢复、配合 PITR

        - **PITR（时间点恢复，生产标准）**
        - 基础备份（`pg_basebackup`）+ WAL 归档（`archive_mode` + `archive_command`）
        - 恢复：基础备份 + 重放 WAL 到任意时间点（受 WAL 归档完整性与目标点长事务等限制）
        - 优点：可恢复到任意时刻（误删/误操作可救）；无归档时只能回到备份时刻
        - 适用：生产标准方案（配合 Barman/pgBackRest 自动化）

    - **外部工具**
        - `Barman`：PG 备份管理工具（自动化备份/归档/恢复）
        - `pgBackRest`：备份恢复工具（增量/并行/压缩）
        - 云快照：云盘快照（最快但粒度粗）
        - `pgcopydb`/`pg_dump` 管道：迁移

    - **备份选择建议**
        - 单库/迁移：`pg_dump`
        - 整库大数据：`pg_basebackup`
        - 生产（可恢复到任意点）：`pg_basebackup` + WAL 归档 + Barman/pgBackRest
        - 快速恢复：云快照 + WAL 归档

- **协助记忆**
    - 备份分三类："逻辑（pg_dump 迁移/单库）、物理（basebackup 整库）、PITR（base+WAL 任意点）"。
    - 生产口诀："基础备份 + WAL 归档 = 可回到任意时间点"。

- **进阶思考**
    - **为什么生产要用 PITR 而不是纯物理/逻辑备份？**
        - 纯备份只能回到"备份时刻"，备份后的数据（误删/故障）丢失。PITR 靠 WAL 归档可恢复到"任意时间点"（如误删前 1 分钟）——这是生产必备的恢复能力。
    - **`pg_dump` 和 `pg_basebackup` 恢复的区别？**
        - pg_dump 恢复：用 `psql` 导入 SQL（逐条执行，慢，但跨版本/选择性）；basebackup 恢复：解压文件/重放 WAL（快，需同版本）。
    - **备份怎么验证（防"备份失效"）？**
        - 定期恢复演练（在测试环境实际恢复验证）、备份完整性检查（`pg_verifybackup`）、备份监控（备份任务是否成功/告警）。"能恢复的备份才是备份"。

- **扩展信息**
    - **命令示例**：
        ```bash
        pg_dump -h localhost -U postgres -d mydb -Fc -f mydb.dump   # 逻辑备份（自定义格式）
        pg_basebackup -h localhost -D /backup/base -X stream       # 物理备份（含 WAL）
        ```
    - **相关工具**：`pg_verifybackup`（校验）、`pg_restore`（恢复 dump）、`Barman`/`pgBackRest`

## 🤔 PGSQL 当前连接数如何查看？  
- **查看 PG 连接数：①`pg_stat_activity` 视图（当前连接/活动查询详情）②`pg_stat_database`（每库连接数/统计）③快捷查询（`SELECT count(*) FROM pg_stat_activity`）④对比 `max_connections`（连接是否满）。核心：`pg_stat_activity` 看实时连接，结合 `max_connections` 判断是否耗尽。**  
    - **常用查询**
        ```sql
        -- 当前总连接数（客户端连接，排除后台/复制进程）
        SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend';
        -- 全部服务器进程（含 autovacuum/walsender/parallel worker 等，会高估客户端连接）
        SELECT count(*) FROM pg_stat_activity;
        -- 各状态连接（active/idle 等）
        SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
        -- 各库连接数
        SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
        -- 最大连接数配置
        SHOW max_connections;
        -- 活跃连接详情（谁在跑什么）
        SELECT pid, usename, datname, state, wait_event_type, query FROM pg_stat_activity;
        ```

    - **核心视图说明**
        - **`pg_stat_activity`**：每个后端进程一行——pid/用户/库/状态（active/idle/...）/等待事件/查询。排查连接和活动查询的主视图
        - **`pg_stat_database`**：每库一行——连接数（`numbackends`）、事务/死锁/缓存命中率等
        - **`pg_stat_activity` 的 `state`**：`active`（正在执行）、`idle`（空闲连接）、`idle in transaction`（事务内空闲，可能是长事务隐患）

    - **连接耗尽（连接数满）**
        - 报错：`FATAL: sorry, too many clients already`（连接数达 `max_connections`）；`remaining connection slots` 是保留槽位（超级用户/复制连接预留）耗尽的另一种报错，两者不同
        - 原因：连接数达到 `max_connections`（默认 100）
        - 处理：①看 `pg_stat_activity` 找空闲/长连接清理 ②调大 `max_connections`（需重启）③上连接池（PgBouncer）

- **协助记忆**
    - 连接数口诀："`pg_stat_activity` 看实时（count 统计），`max_connections` 看上限，满了报 too many clients"。
    - 定位："先 count 看满没满，再按 state/datname 分组找谁占的"。

- **进阶思考**
    - **`idle in transaction` 连接有什么隐患？**
        - 事务开启后长时间不提交（如程序异常/漏提交）：占住连接 + 持有锁 + 阻塞 autovacuum（阻止清理）。监控此状态并及时终止（`pg_terminate_backend(pid)`）是运维重点。
    - **连接数"满了"怎么快速处理？**
        - ①`pg_stat_activity` 找 `idle`（空闲）或 `idle in transaction` 连接终止（`pg_terminate_backend`）②连接池（PgBouncer）复用连接（治本，防连接风暴）③评估 `max_connections` 是否合理。
    - **为什么"每连接一个进程"导致连接数不能太大？**
        - 每连接一个后端进程（内存/调度开销），几千连接 = 几千进程，内存和切换开销巨大。所以 PG 高并发靠连接池（PgBouncer）复用连接，而非无限加 max_connections。

- **扩展信息**
    - **相关命令**：`pg_terminate_backend(pid)`（终止连接）、`pg_cancel_backend(pid)`（取消查询）、`pg_stat_activity`
    - **连接池**：`PgBouncer`（轻量）、`Pgpool-II`（连接池+读写分离）

## 🤔 PGSQL 怎么查看锁等待与死锁？  
- **查看 PG 锁：①`pg_locks` 视图（当前所有锁）②`pg_stat_activity` 的 `wait_event_type=Lock`（谁在等锁）③专用查询（锁等待链/阻塞关系）④死锁日志（`deadlock detected`）。核心：`pg_locks` + `pg_stat_activity` 关联看谁等谁，定位阻塞源头。**  
    - **核心视图**
        - **`pg_locks`**：当前所有锁（locked relation/pid/模式 locktype/mode）
        - **`pg_stat_activity`**：结合 pid 看每个连接的查询/状态/wait_event（`wait_event_type='Lock'` = 在等锁）
        - 关联：`pg_locks.pid` = `pg_stat_activity.pid`（找到持锁和等锁的会话）

    - **常用查询（锁等待/阻塞）**
        ```sql
        -- 正在等待锁的会话（推荐：pg_blocking_pids 直接看阻塞者）
        SELECT pid, pg_blocking_pids(pid) AS blocking_pids, state, wait_event_type, wait_event, query
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock';
        ```
        - 注：手工 join `pg_locks` 的阻塞查询模板需同时比对 `locktype`/`database`/`relation` 才准确；行级锁冲突（UPDATE/DELETE 同行）落在 transactionid/tuple 锁上（`relation` 为空），简单按 relation 匹配会漏报/误报——优先用 `pg_blocking_pids(pid)`

    - **死锁**
        - 死锁：两个事务互相持有对方要的锁（循环等待）
        - PG 自动检测：`deadlock detected` 日志，自动回滚一方（不会永久卡死）
        - 排查：死锁日志（`log_min_messages`/`log_lock_waits`）看死锁 SQL
        - 预防：统一锁顺序、短事务、避免长事务

    - **处理（解除阻塞）**
        - 找到阻塞源头（blocking_pid）→ 分析其查询（是否长事务/大查询）
        - `pg_cancel_backend(pid)`（取消查询）或 `pg_terminate_backend(pid)`（终止会话）
        - 应用层修复（事务逻辑/锁顺序）

- **协助记忆**
    - 查锁口诀："`pg_locks` 看锁、`pg_stat_activity` 看谁在等（wait_event=Lock）、关联 pid 找阻塞源、死锁自动回滚"。
    - 处理："找到持锁的 → 取消/终止 → 修应用"。

- **进阶思考**
    - **怎么区分"死锁"和"长事务阻塞"？**
        - 死锁：循环等待，PG 自动检测回滚一方（报 deadlock detected，事务失败）。长事务阻塞：一个事务长期持锁不放，其他事务无限等待（不报错，就是慢/卡）。两者都看 `pg_locks`，但死锁有日志、阻塞无报错。
    - **`pg_locks` 里的 `granted` 字段含义？**
        - `granted = true`：已获得锁（持有）；`granted = false`：在等待锁（被阻塞）。关联 granted=false 的会话找其等待的锁，再找 granted=true 持有者 = 阻塞源头。
    - **如何预防锁问题（运维层面）？**
        - 监控 `wait_event_type='Lock'` 的会话、长事务告警（`state='idle in transaction'`）、统一业务锁顺序、控制事务时长、`log_lock_waits` 开启（记录锁等待日志）。

- **扩展信息**
    - **相关参数**：`log_lock_waits`（记录锁等待）、`deadlock_timeout`（死锁检测间隔，默认 1s）
    - **相关视图**：`pg_locks`、`pg_stat_activity`、`pg_blocking_pids(pid)`（直接看阻塞者）
    - **命令**：`pg_cancel_backend`/`pg_terminate_backend`（解除）

## 🤔 PGSQL 出现 OOM 有哪些常见原因及解决办法？  
- **PG OOM（Out of Memory）常见原因：①`work_mem` 设置过大（排序/哈希×并发爆内存）②`shared_buffers` 过大（挤占系统内存）③连接过多（每连接进程内存累加）④大查询（大排序/哈希/聚合）⑤OS 内存紧张（其他进程挤占）。解决：调小 work_mem/连接数、合理 shared_buffers、限大查询、加内存、检查系统内存。**  
    - **常见原因**
        - **`work_mem` 过大（最常见）**：每个排序/哈希操作分配 work_mem，并发×操作数累加爆炸（如 work_mem 1GB × 并发 50 = 50GB）
        - **`shared_buffers` 过大**：挤占系统可用内存（预分配，更多是挤占系统缓存而非直接触发 OOM）
        - **连接过多**：每连接一个 backend 进程（各占内存），连接数多内存累计
        - **大查询**：大排序/大哈希/大聚合/递归查询（单查询吃大内存）
        - **OS 内存被挤占**：其他进程/缓存占用导致 PG 无内存可用
        - **`maintenance_work_mem` 过大**：VACUUM/建索引时占大内存
        - **`hash_mem_multiplier`/`temp_buffers`**：哈希操作内存倍增（PG 13+，与 work_mem 联动）、临时表缓冲——也是内存变量

    - **排查思路**
        - 看日志：OOM 报错（`out of memory`）/系统 `dmesg`（OOM Killer 杀 PG）
        - 看 `pg_stat_activity`：是否有大查询/多连接在跑
        - 监控内存：PG 进程内存（`ps aux`/RSS）、系统内存（free）
        - `pg_stat_statements`：找内存消耗大的 SQL

    - **解决**
        - **调小 `work_mem`**（治本）：按实际查询评估（4~64MB 常见），让大排序走临时文件（落盘）而非内存
        - **限连接**：连接池（PgBouncer）、`max_connections` 合理
        - **限大查询**：超时/资源限制（`statement_timeout`）、优化 SQL（避免大排序/哈希）
        - **`shared_buffers` 合理**（1/4）、`maintenance_work_mem` 按需
        - **加内存**（治标）：服务器内存扩容
        - **OS 层**：检查是否有内存泄漏的其他进程、swap 配置

- **协助记忆**
    - OOM 口诀："work_mem 大（×并发爆）、连接多、大查询、shared_buffers 大、系统内存紧"。
    - 解决："调小 work_mem/限连接/限大查询/加内存"。

- **进阶思考**
    - **为什么 `work_mem` 是 OOM 第一嫌疑？**
        - work_mem 是"每个操作"的内存（不是全局），并发排序/哈希 = work_mem × 操作数 × 并发——最容易失控。生产常见：work_mem 设大后高并发查询直接 OOM。
    - **大排序一定 OOM 吗？怎么避免？**
        - 不一定：work_mem 不够时 PG 会用临时文件（落盘排序），只是慢。真正 OOM 是 work_mem 大 + 并发多（内存远超可用）。避免：work_mem 适中、SQL 优化（走索引避免排序）、`enable_sort=off`（临时）。
    - **怎么判断是"PG 自己内存问题"还是"系统内存不足"？**
        - 看系统内存（`free -h`/`dmesg`）：若系统内存被其他进程占满（OOM Killer 杀 PG）→ 系统问题；若 PG 进程 RSS 异常高（work_mem/连接）→ PG 问题。结合两者定位。

- **扩展信息**
    - **相关参数**：`work_mem`、`maintenance_work_mem`、`shared_buffers`、`max_connections`、`statement_timeout`
    - **监控**：PG 内存（`ps aux` RSS）、系统 `dmesg`/`free`、OOM Killer 日志
## 🤔 PGSQL 主流高可用方案有哪些？  
- **PG 高可用方案核心是"流复制做主从 + 自动故障切换"：①流复制（异步/同步，主备数据一致或接近一致）②自动切换（`Patroni` 最主流：管理流复制 + 选主 + VIP/接入切换；`repmgr` 备用）③读写分离（备库扛读）④存储层（云盘/存储复制）。核心："主备流复制 + 自动 failover + 数据不丢（同步/多数派）"。**  
    - **基础：流复制（主备）**
        - 主库 WAL → 备库重放（异步默认/同步可选）
        - 异步：主备可能有少量延迟（主故障可能丢少量数据）
        - 同步：备库确认才提交（不丢但性能降/备库故障阻塞）

    - **自动切换工具（高可用核心）**
        - **`Patroni`**（最主流）：管理流复制集群——健康检查、自动选主、故障切换、VIP/负载均衡接入
        - **`repmgr`**：复制管理 + 自动/手动切换（轻量）
        - 传统：手工切换（`pg_ctl promote`/`pg_rewind`）

    - **方案形态**
        - **Patroni + 流复制**（标准）：主 + 备 + etcd/Consul（选主协调）+ VIP/HAProxy（接入切换）
        - **同步流复制 + 多数派**：`synchronous_standby_names` 配置多数派（`ANY 2`）——数据不丢（故障切换不丢已提交事务）
        - **读写分离**：备库做只读（配合负载均衡，Pgpool/HAProxy）
        - **云方案**：云 RDS（托管高可用）、云盘故障切换（存储层复制）

    - **高可用要素**
        - **数据不丢**：同步复制/多数派（`synchronous_standby_names`）
        - **快速切换**：Patroni 自动 failover（秒级~分钟级）
        - **接入切换**：VIP/负载均衡（应用无感）
        - **选主协调**：etcd/Consul（Patroni 用 DCS 协调，防双主）

- **协助记忆**
    - 高可用口诀："流复制做备、Patroni 自动切换、同步多数派保数据、VIP/负载均衡切接入"。
    - 核心："主备复制 + 自动 failover + 防双主（DCS 协调）"。

- **进阶思考**
    - **异步和同步复制怎么权衡？**
        - 异步：性能好、主故障可能丢少量数据（RPO>0）；同步：提交等备确认（不丢，但备故障会阻塞写，性能降）。折中：多数派同步（`synchronous_standby_names = ANY 2`）——备多数确认才提交，容忍单个备故障，兼顾数据安全与可用。
    - **Patroni 用什么"选主"？为什么需要？**
        - Patroni 用 DCS（etcd/Consul/ZooKeeper）存储集群状态和锁——主故障时各节点竞争选主（DCS 锁保证只有一个赢家），避免"双主"（脑裂）。DCS 是 Patroni 的核心依赖。
    - **主故障切换后旧主怎么回来？**
        - 用 `pg_rewind` 让旧主以新主为源重新同步（避免全量重建）；Patroni 自动处理。前提：旧主数据不落后太多（wal_keep_size/复制槽）。

- **扩展信息**
    - **工具**：Patroni（+ etcd/Consul + HAProxy/VIP）、repmgr、pgpool-II（读写分离/负载）
    - **参数**：`synchronous_standby_names`、`synchronous_commit`、`wal_keep_size`、`max_wal_senders`
    - **相关**：`pg_rewind`（快速追赶）、`pg_ctl promote`（手动提升）

## 🤔 简述 PGSQL 流复制工作原理？  
- **PG 流复制（Streaming Replication）原理：主库的 `walsender` 进程把 WAL 日志实时流式发送给备库的 `walreceiver` 进程，备库接收后由 `startup` 进程重放 WAL，保持与主库一致。核心："主库 WAL 流式传输 + 备库实时重放"，异步默认/同步可选。**  
    - **工作原理（流程）**
        ```
        主库：事务提交 → 写 WAL → walsender 把 WAL 流式发送
        备库：walreceiver 接收 → 写入备库 WAL → startup 进程重放 → 数据更新
        ```
        - `walsender`（主库）：WAL 发送进程（每备库一个）
        - `walreceiver`（备库）：接收 WAL
        - `startup`（备库）：重放 WAL（把日志变成数据）
        - 备库处于 `recovery` 模式（只读，可查）

    - **配置要素**
        - 主库：`wal_level = replica`（或 logical）、`max_wal_senders`、`max_replication_slots`（可选）
        - 备库：`primary_conninfo`（连主库）、`standby.signal`（标记备库）
        - 认证：复制用户 + `pg_hba.conf` 放行 replication

    - **同步/异步**
        - 异步（默认）：主库不等备库确认（快，可能丢少量数据）
        - 同步：`synchronous_standby_names` 指定备库，主库等**首个或前 n 个**同步备库确认才提交（备库 `application_name` 需匹配；不丢但性能降、备库故障阻塞）
        - 多数派同步（`ANY n`）：等 n 个备库确认（兼顾；n 需超过候选同步备库半数）

    - **状态查看**
        ```sql
        SELECT * FROM pg_stat_replication;  -- 主库看发送状态（write/flush/replay 位置）
        SELECT pg_is_in_recovery();          -- 备库判断是否在恢复模式
        SELECT pg_wal_lsn_diff(...);         -- 延迟计算
        ```

    - **与归档/逻辑复制的区别**
        - 流复制：实时 WAL 流（备库常驻，延迟小）
        - WAL 归档：文件级归档（不实时，用于 PITR）
        - 逻辑复制：逻辑变更（跨版本/表级）

- **协助记忆**
    - 流复制 = "主库 WAL 实时直播（walsender → walreceiver → 重放）"。
    - 口诀："walsender 发、walreceiver 收、startup 重放，异步默认同步可选"。

- **进阶思考**
    - **流复制和"WAL 归档"是什么关系（都要吗）？**
        - 流复制：备库实时（高可用）；WAL 归档：备份/PITR。生产通常两者都要：流复制保高可用 + 归档保可恢复（如误删需回到任意点）。流复制不替代归档。
    - **同步流复制"备库故障"会怎样？**
        - 同步备库故障：主库提交会阻塞（等不到确认）。处理：临时降级 `synchronous_commit`（如 `off`/`local`）、清空或调整 `synchronous_standby_names`、或改用多数派同步（`ANY n`）容忍单备故障（注意：`n` 需超过候选同步备库半数，如 3 备配 `ANY 2`；只有 2 备配 `ANY 2` 单备故障仍会阻塞）。
    - **备库能做什么（只读/备份）？**
        - 备库只读：可跑只读查询（读写分离）、做备份（`pg_basebackup`/快照）、监控。写操作不行（recovery 模式）。

- **扩展信息**
    - **相关视图**：`pg_stat_replication`（发送状态）、`pg_stat_wal_receiver`（接收）
    - **相关参数**：`wal_level`、`max_wal_senders`、`synchronous_standby_names`、`hot_standby`（备库可查询）
    - **相关命令**：`pg_ctl promote`（提升备库）、`pg_rewind`（重建备库）

## 🤔 PGSQL 主从延迟原因及优化方法？  
- **PG 主从延迟原因：①网络带宽/延迟（WAL 传输慢）②备库重放慢（备库 IO/CPU 不足）③大事务/大表更新（单事务产生大量 WAL，重放慢）④索引维护（重放时建索引慢）⑤备库只读查询竞争（读查询占用资源影响重放）⑥同步配置影响（同步模式下主库等备库）。优化：网络优化/带宽、备库硬件、拆大事务、分区表、`max_parallel_*`/重放加速、监控延迟。**  
    - **常见原因**
        - **网络问题**：主备网络带宽/延迟（WAL 传输慢）
        - **备库重放慢**：备库 IO/CPU 不足（重放 WAL 跟不上产生）
        - **大事务/大更新**：单事务产生大量 WAL（如大表 update/delete、大批量导入）——备库要重放全部
        - **索引维护**：建索引/DDL 在备库重放慢
        - **备库只读查询竞争**：备库跑重查询，资源被占影响重放
        - **注意**：主库无写入时 replay_lsn 会追上、延迟为 0（"长时间无活动"非异常）；真正风险是**备库落后超过 `wal_keep_size`/复制槽保留范围会被断连**，需重建同步（常见生产故障，务必监控延迟）

    - **延迟查看**
        ```sql
        -- 主库看各备库发送/重放位置与延迟
        SELECT * FROM pg_stat_replication;
        -- 计算延迟：主库 WAL 位置 vs 备库 replay 位置
        SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) FROM pg_stat_replication;
        ```

    - **优化方法**
        - **网络**：主备同机房/同区域、带宽充足、专线
        - **备库硬件**：备库磁盘/CPU 与主库相当（重放也是写负载）
        - **拆大事务**：大更新分批（避免单事务 WAL 洪峰）
        - **分区表**：大表分区（更新/维护分散）
        - **索引维护优化**：`CREATE INDEX CONCURRENTLY`（不阻塞主库写入，减少 DDL 对主库影响）
        - **备库查询限制**：备库只读查询控制（不跑重查询/加资源隔离）
        - **重放加速**：备库 `max_parallel_apply_workers_per_subscription`（逻辑复制）/物理复制靠 CPU
        - **监控**：延迟告警（超过阈值）、`pg_stat_replication` 定期看

- **协助记忆**
    - 延迟原因口诀："网络慢、备库弱、大事务、索引维护、备库查询抢"。
    - 优化："同机房、备库够硬、拆大事务、监控告警"。

- **进阶思考**
    - **怎么区分"延迟是网络还是重放"？**
        - 看 `pg_stat_replication`：`write_lsn`/`flush_lsn`（收到/落盘位置）vs `replay_lsn`（重放位置）。网络慢 → 备库 receive/flush 落后；重放慢 → replay 落后（flush 追上但 replay 差）。据此定位瓶颈。
    - **为什么"备库跑重查询"会影响复制延迟？**
        - 备库单实例资源（CPU/IO）既要服务只读查询又要重放 WAL——重查询占资源 → 重放变慢 → 延迟增大。备库若既要扛读又要及时复制，硬件要够或读走其他备库。
    - **同步复制下"延迟"意味着什么？**
        - 同步模式：主库提交要等备库确认（write/flush/replay 之一），备库重放慢 → 主库提交也变慢（写性能受影响）。所以同步复制对备库性能要求更高。

- **扩展信息**
    - **相关视图**：`pg_stat_replication`（write/flush/replay_lsn）、`pg_stat_wal_receiver`
    - **相关参数**：`wal_keep_size`、`max_wal_senders`、`synchronous_commit`、`hot_standby_feedback`（防备库 vacuum 冲突）

## 🤔 实际工作中遇到过表膨胀吗？如何定位和处理？  
- **PG 表膨胀：表和索引因死元组/空闲空间堆积而体积远超实际数据量（MVCC 旧版本未及时清理 + 高更新/删除）。定位：①`pg_stat_user_tables` 看 `n_dead_tup`/`last_vacuum` ②比较表大小 vs 实际行数（`pg_total_relation_size` vs `count(*)`）③`pgstattuple` 看死元组占比。处理：`VACUUM`（常规）/`VACUUM FULL`（锁表，停机窗）/`pg_repack`（在线重建）/调 autovacuum。**  
    - **表膨胀的成因**
        - MVCC 旧版本（死元组）未及时清理（autovacuum 失效/清理慢）
        - 高更新/删除（大量死元组产生，如频繁 update/批量 delete）
        - 长事务（阻止死元组复用）
        - `VACUUM FULL` 没做过（表文件只增不减）

    - **定位（判断是否膨胀）**
        ```sql
        -- 1. 死元组与上次清理（n_dead_tup 为估算值，VACUUM 后归零）
        SELECT relname, n_dead_tup, n_live_tup, last_vacuum, last_autovacuum
        FROM pg_stat_user_tables WHERE relname='表名';
        -- 2. 表总大小 vs 数据行数（膨胀率）
        SELECT pg_total_relation_size('表名') / 1024 / 1024 AS size_mb;  -- 表大小
        SELECT count(*) FROM 表名;                                       -- 实际行数
        -- 3. 精确死元组占比（需装 pgstattuple）
        SELECT * FROM pgstattuple('表名');  -- dead_tuple_percent 高 = 膨胀
        ```
        - 指标：`n_dead_tup` 持续大、表大小 >> 数据量、`dead_tuple_percent` 高（>20% 明显膨胀）

    - **处理（按严重程度）**
        - **常规：`VACUUM`**（`VACUUM (VERBOSE, ANALYZE) 表`）——清理死元组、空间可复用（不缩小文件，不锁表）
        - **严重：`VACUUM FULL`**——重写表压缩（缩小文件）但**锁表**（停机窗口做）
        - **在线：`pg_repack`**——重建表不锁业务（生产推荐，替代 VACUUM FULL；前置条件：表需有主键/唯一索引 + 约 2 倍空闲磁盘）
        - **根治：调 autovacuum**——该表调更激进阈值（`ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.05)`）
        - 检查长事务（`pg_stat_activity` 的 `idle in transaction`）——阻止清理

    - **预防（日常）**
        - autovacuum 开启 + 监控 `n_dead_tup`/`last_autovacuum`
        - 高更新表调表级 autovacuum
        - 批量 delete/update 分批（避免一次性大量死元组）

- **协助记忆**
    - 膨胀 = "死元组堆太多、表文件虚胖"（MVCC 旧版本没清掉）。
    - 处理口诀："先 VACUUM 常规清、严重 VACUUM FULL/pg_repack、根治调 autovacuum、查长事务"。

- **进阶思考**
    - **为什么高更新表容易膨胀（update 特别伤）？**
        - PG update 是"删除旧版本 + 插入新版本"（两个元组），高 update = 大量死元组。且索引也要更新（索引膨胀）。所以频繁 update 的表膨胀最快，必须靠 autovacuum 跟紧。
    - **`VACUUM` 和 `VACUUM FULL` 什么时候用哪个？**
        - VACUUM：日常（死元组清理、空间可复用、不锁表），膨胀不严重时够用；VACUUM FULL：空间要还给 OS/文件太大（锁表，停机窗）。生产膨胀严重用 pg_repack（在线）替代 FULL。
    - **膨胀的表查询一定慢吗？**
        - 不一定立刻慢，但会：扫描更多页（死元组也扫）、索引大（扫描慢）、缓存命中率降、磁盘紧张。膨胀是"慢性病"，影响逐渐显现，需监控预警。

- **扩展信息**
    - **相关工具**：`pgstattuple`（死元组分析）、`pg_repack`（在线重建）、`VACUUM FULL`、`pg_stat_user_tables`
    - **相关参数**：`autovacuum_vacuum_scale_factor`、`autovacuum_vacuum_threshold`、`vacuum_cost_*`
## 🤔 PGSQL 如何实现读写分离？  
- **PG 读写分离核心："主库写 + 备库读"——用流复制把数据同步到备库，通过中间层把读流量分发到备库。实现：①流复制搭主备（备库只读）②中间层分流（`Pgpool-II` 读写分离/负载、`HAProxy` 按端口/路由、应用层读写分离）③只读连接连备库。核心：读走备库减轻主库压力，但注意复制延迟导致读"旧数据"。**  
    - **基础：主备流复制**
        - 主库写（可读写）；备库只读（recovery 模式，`hot_standby` 可查询）
        - 流复制把主库变更同步到备库（异步/同步）

    - **读写分离的中间层（怎么分流）**
        - **`Pgpool-II`**：内置读写分离 + 负载均衡（按 SQL 类型分：写→主、读→备）——功能全（连接池/连接限制/负载）
        - **`HAProxy`**：按端口/规则路由（应用把读和写连不同端口）——轻量，需应用配合
        - **应用层**：ORM/连接池配置读写分离（读连接连备库、写连接连主库）——最灵活，应用可控
        - 云 RDS：云厂商托管读写分离（自动）

    - **实现步骤（以 Pgpool-II 为例）**
        ```
        1. 流复制搭好主备（主库写、备库只读）
        2. 部署 Pgpool-II：配置后端（主/备）
        3. 应用连接 Pgpool-II（一个地址）
        4. Pgpool 自动分流：SELECT → 备库，INSERT/UPDATE → 主库
        ```

    - **注意事项**
        - **复制延迟**：备库读到的可能是"旧数据"（异步复制有延迟）——读延迟敏感业务要注意
        - **事务内一致性**：事务内先写后读可能读不到刚写的数据（走备库）——需读主库或事务级路由（注：Pgpool-II 事务内出现写操作后会把后续语句全路由到主库；应用层/部分中间件是语句级路由，需区分实现）
        - **备库只读**：写操作只能走主库（备库拒绝写）
        - **连接分配**：只读比例/连接池管理

- **协助记忆**
    - 读写分离 = "主库写、备库读，中间层（Pgpool/HAProxy/应用）分流"。
    - 口诀："流复制搭备、中间层分流（SELECT 走备）、注意复制延迟旧数据"。

- **进阶思考**
    - **读写分离能解决什么（什么时候需要）？**
        - 读多写少的业务：备库扛读压力，主库专注写——提升读吞吐、减轻主库。不适合：写多读少/强一致读场景（读必须即时）。
    - **"复制延迟"导致读到旧数据怎么解决？**
        - ①读延迟敏感业务走主库 ②同步复制（备库 flush 才提交，牺牲写性能）③应用层路由（关键读走主库）④监控延迟（超过阈值告警）。权衡：读一致性 vs 性能。
    - **读写分离和连接池的关系？**
        - 连接池（PgBouncer）管"连接复用"；读写分离管"流量分流"。Pgpool-II 两者都有（连接池+读写分离+负载均衡）；PgBouncer 只有连接池（分流靠应用/HAProxy）。

- **扩展信息**
    - **工具**：`Pgpool-II`（读写分离+连接池）、`HAProxy`（端口路由）、应用层 ORM/DataSource、云 RDS 读写分离
    - **相关**：流复制（备库只读）、`hot_standby`（备库查询）、复制延迟监控

## 🤔 PGSQL 一般会监控哪些指标？  
- **PG 监控指标分几层：①可用性（`up`/连接是否正常）②连接（连接数 vs `max_connections`、空闲/长事务）③性能（QPS/TPS、锁等待、缓存命中率）④复制（主从延迟、复制状态）⑤存储（磁盘、WAL 增长）⑥关键进程/视图（`pg_stat_database`/`pg_stat_activity`/`pg_stat_replication`）。核心："可用性 + 连接 + 锁 + 复制 + 资源"，配 Prometheus 的 `postgres_exporter`。**  
    - **可用性/基础**
        - `up`（连接是否正常）、`pg_is_in_recovery`（主/备状态）
        - 数据库状态、进程存活

    - **连接监控**
        - 连接数 vs `max_connections`（使用率告警）
        - `pg_stat_activity`：`state` 分布（active/idle/idle in transaction）、长事务、等待锁
        - 空闲连接清理

    - **性能指标**
        - QPS/TPS（事务数：`xact_commit`/`xact_rollback` 速率）
        - 缓存命中率（`blks_hit`/(`blks_hit`+`blks_read`)）：**共享缓冲区**命中率，低说明大量读未命中共享缓冲、较多物理 IO，可调 `shared_buffers`/查大表扫描；注意 OS 页缓存命中不计入此比率）
        - 锁等待（`wait_event_type='Lock'` 会话数）
        - 慢查询（`log_min_duration_statement`/pg_stat_statements）

    - **复制监控**
        - 主从延迟（`pg_stat_replication` 的 `replay_lsn` 差）
        - 复制状态（`pg_stat_wal_receiver`、备库是否正常）
        - `max_wal_senders`/复制槽

    - **资源/存储**
        - 磁盘使用率（数据目录/WAL 目录/表空间）
        - WAL 增长（`pg_wal` 大小）
        - 系统资源（CPU/内存/IO）

    - **实现**
        - `postgres_exporter`（Prometheus）：采集上述指标
        - `pg_stat_database`（每库统计）、`pg_stat_activity`（会话）、`pg_stat_replication`（复制）、`pg_stat_user_tables`（表级）
        - 告警：连接数满、主从延迟、锁等待、磁盘高、复制断开

- **协助记忆**
    - 监控分层："可用性、连接、性能（QPS/锁/缓存）、复制、资源（磁盘/WAL）"。
    - 工具："postgres_exporter + pg_stat_* 视图，配告警"。

- **进阶思考**
    - **哪些指标最容易"出事"（监控优先级）？**
        - ①连接数满（业务直接不可用）②主从延迟/断开（高可用失效）③锁等待/死锁（查询卡住）④磁盘满（写不进去）⑤长事务/膨胀（慢性问题）。先保"连接+复制+锁+磁盘"。
    - **缓存命中率怎么看（低了说明什么）？**
        - `blks_hit/(blks_hit+blks_read)`：数据从共享缓冲/OS 缓存读的比例。低（如 <95%）= 大量物理 IO（磁盘读多）→ 查 shared_buffers/查询是否扫大表。
    - **主从延迟监控用什么看？**
        - 主库 `pg_stat_replication.replay_lsn` vs `pg_current_wal_lsn()` 的差（`pg_wal_lsn_diff`）；备库 `pg_last_wal_replay_lsn()`。差为 0/小 = 正常，持续增大 = 延迟。

- **扩展信息**
    - **常用 exporter**：`prometheus-community/postgres_exporter`（Prometheus 采集）
    - **核心视图**：`pg_stat_database`、`pg_stat_activity`、`pg_stat_replication`、`pg_stat_user_tables`、`pg_locks`
    - **告警示例**：连接数 > 80% max_connections、主从延迟 > 阈值、`wait_event_type='Lock'` 会话 > N、磁盘 > 85%

## 🤔 PGSQL 物理流复制与逻辑复制有什么区别及适用场景？  
- **物理复制（流复制）复制"数据文件变更"（WAL 字节级），逻辑复制复制"逻辑变更"（行级 INSERT/UPDATE/DELETE 记录）。区别：①对象粒度（物理=整库所有对象；逻辑=按表/库选择性复制）②版本兼容（物理需同大版本；逻辑跨版本可）③类型支持（物理全部；逻辑仅 DML，DDL 需手动）④冲突处理（逻辑有主键/冲突处理）⑤性能（物理简单高效；逻辑有解析开销）。适用：物理=高可用/整库；逻辑=迁移/跨版本/部分表/数据同步到异构。**  
    - **物理复制（流复制）**
        - 复制 WAL（数据文件级别），备库字节级一致
        - 对象：**全部**（所有库/表，无需选择）
        - 版本：需同大版本（major version）
        - 类型：支持全部（DDL/DML 都复制）
        - 用途：高可用（主备）、整库备份
        - 限制：不能选择性复制（要么全库）、备库只读

    - **逻辑复制**
        - 复制逻辑变更（发布/订阅：`CREATE PUBLICATION`/`CREATE SUBSCRIPTION`）
        - 对象：**按表选择**（发布指定表/库）
        - 版本：可跨大版本（PG 10+ 支持；主版本 ≥10 可不同）
        - 类型：**仅 DML**（INSERT/UPDATE/DELETE/TRUNCATE）；DDL 需手动同步
        - 副本标识：需要 `REPLICA IDENTITY`——默认取主键，也可用唯一索引或 `REPLICA IDENTITY FULL`（整行比对，性能差）；无任何副本标识时 UPDATE/DELETE 报错
        - 冲突处理：订阅端有数据冲突需处理（跳过/报错）
        - 用途：数据同步（部分表）、跨版本迁移、多库汇聚、下游消费

    - **对比速查**
        | 维度 | 物理复制 | 逻辑复制 |
        |------|---------|---------|
        | 复制内容 | WAL（文件级） | 行级变更（DML） |
        | 对象粒度 | 整库（全部） | 按表选择 |
        | 版本兼容 | 同大版本 | 跨版本 |
        | DDL | 自动复制 | 不复制（手动） |
        | 副本标识 | 无 | 需（默认主键/唯一索引/FULL） |
        | 备库读写 | 只读 | 可读写（订阅端可写） |
        | 适用 | 高可用/整库备份 | 迁移/部分同步/汇聚 |

    - **选型建议**
        - 高可用/整库 → 物理复制
        - 部分表同步/跨版本迁移/数据汇聚 → 逻辑复制

- **协助记忆**
    - 对比口诀："物理复制文件级（整库/高可用/同版本），逻辑复制行级（按表/跨版本/仅 DML）"。
    - 选型："高可用用物理，迁移/部分表用逻辑"。

- **进阶思考**
    - **逻辑复制为什么"DDL 不自动复制"？**
        - 逻辑复制基于逻辑变更流（行级），DDL（建表/改结构）不是行级变更、无法在流里表达，需在订阅端手动执行（或工具同步）。这是逻辑复制的常见坑（改表结构要两边都改）。
    - **物理和逻辑能混用吗？**
        - 能：如主库物理复制给高可用备库 + 逻辑复制把部分表同步到报表库/跨版本库。两者互补（物理保高可用，逻辑做数据分发）。
    - **逻辑复制的"冲突"是什么？怎么处理？**
        - 订阅端表有数据时，发布端的变更可能与订阅端冲突（如主键重复）——复制报错。处理：订阅端保持空表/初始化数据一致、`ALTER SUBSCRIPTION ... SKIP`（PG 16+，可逐事务手动跳过）或 `pg_replication_origin_advance()`（旧版）、监控复制错误。

- **扩展信息**
    - **相关命令**：`CREATE PUBLICATION`/`CREATE SUBSCRIPTION`（逻辑）、`primary_conninfo`（物理）
    - **相关视图**：`pg_stat_subscription`/`pg_stat_replication`
    - **工具**：pglogical（第三方逻辑复制）、逻辑复制槽

## 🤔 PGSQL 从库复制出错常见原因及解决方案  
- **PG 从库（备库）复制出错常见原因：①网络问题（主备断连，WAL 传不过来）②WAL 被清理（备库追不上，主库 `wal_keep_size`/复制槽不足）③磁盘满（备库写不了 WAL/数据）④`hot_standby_feedback` 冲突（备库查询与 vacuum 冲突）⑤权限/认证错误（复制用户/`pg_hba.conf`）⑥主库参数变更（`wal_level` 等）。解决：看 `pg_stat_replication`/日志定位，补 WAL/重建备库（`pg_rewind`/重建）。**  
    - **常见原因**
        - **网络断连**：主备网络故障/超时（WAL 流中断）
        - **WAL 被清理**：备库长期落后，主库 WAL 已回收（`wal_keep_size` 不够/无复制槽）→ 备库追不上，报"requested WAL segment has already been removed"
        - **磁盘满**：备库数据/WAL 磁盘满（写不了）
        - **vacuum 冲突（recovery conflict）**：主库 vacuum 清理了备库还需要的元组，导致备库查询被取消（报 `canceling statement due to conflict with recovery`）——用 `hot_standby_feedback = on` 缓解
        - **认证/权限**：复制用户权限/`pg_hba.conf` 配置错（连不上主库）
        - **主库配置变更**：`wal_level`/`max_wal_senders` 等改动需重启

    - **排查思路**
        - 备库日志：看复制错误（`FATAL`/`ERROR`）
        - `pg_stat_wal_receiver`（备库接收状态）、`pg_stat_replication`（主库发送状态）
        - 网络测试：主备连通性
        - 磁盘：备库磁盘空间
        - 复制槽：`pg_replication_slots` 查看/管理

    - **解决方案**
        - **网络**：修网络/重连
        - **WAL 被清理**：①临时调大 `wal_keep_size` ②用**物理复制槽**（`pg_create_physical_replication_slot`/`pg_basebackup -S` 创建；`max_replication_slots` 只是上限参数）保证 WAL 保留 ③重建备库（`pg_basebackup`）
        - **磁盘**：清理/扩容备库磁盘
        - **vacuum 冲突**：备库 `hot_standby_feedback = on`（通知主库不要清理备库还需要的）
        - **认证**：修正复制用户/`pg_hba.conf`
        - **重建备库（兜底）**：备库**单纯落后/WAL 被清（无时间线分叉）**用 `pg_basebackup`；`pg_rewind` 仅用于"旧主 failover 后与新主时间线分叉"的快速回归场景

- **协助记忆**
    - 复制出错口诀："网络、WAL 被清、磁盘满、vacuum 冲突、认证错"。
    - 兜底："追不上就重建（pg_rewind/basebackup）"。

- **进阶思考**
    - **"requested WAL segment has already been removed" 是什么？怎么解决？**
        - 备库落后于主库 WAL 保留范围（主库 WAL 已回收）——备库需要的 WAL 没了。解决：用复制槽（WAL 不被删直到备库消费）或重建备库。生产建议开复制槽防此问题。
    - **复制槽是什么？有什么坑？**
        - 复制槽（replication slot）保证主库 WAL 保留到备库消费（防止 WAL 被清）。坑：备库长期断连时主库 WAL 无限堆积（磁盘爆）——需监控复制槽活跃度和 WAL 增长。
    - **备库 vacuum 冲突怎么避免？**
        - `hot_standby_feedback = on`（备库告诉主库它还在用的最小 XID，主库 vacuum 不清理）。代价：可能延迟主库 vacuum（备库长事务时）——权衡设置。

- **扩展信息**
    - **相关视图**：`pg_stat_replication`、`pg_stat_wal_receiver`、`pg_replication_slots`
    - **相关参数**：`wal_keep_size`、`max_replication_slots`、`hot_standby_feedback`、`max_wal_senders`
    - **重建命令**：`pg_rewind`、`pg_basebackup`

## 🤔 简述 Patroni 高可用集群的工作原理？  
- **Patroni 是 PG 高可用管理工具：用"分布式共识存储（DCS）+ 流复制 + 自动选主"管理 PG 主备集群。原理：①每个 PG 节点跑 Patroni，注册到 DCS（etcd/Consul）②DCS 存集群状态 + 领导锁（谁做主）③主库故障 → DCS 锁释放 → 备节点竞争选主（锁保证唯一主，防脑裂）④自动提升备库（promote）+ 更新接入（VIP/HAProxy）⑤新主接管后旧主回归用 `pg_rewind` 重新同步。核心："DCS 协调选主 + 流复制 + 自动 failover + 防双主"。**  
    - **核心组件/角色**
        - **`Patroni` agent**：每个 PG 节点上的管理进程（健康检查/选主/执行切换）
        - **DCS（分布式共识存储）**：etcd/Consul/ZooKeeper——存集群状态、领导者（主节点）锁、配置
        - **PG 节点**：主（读写）+ 备（只读，流复制）
        - **接入层**：VIP（虚拟 IP）/HAProxy/负载均衡——流量切到新主

    - **工作原理（流程）**
        ```
        1. 每个节点 Patroni 启动 → 注册到 DCS（争夺主节点锁）
        2. 主节点：持有 DCS 领导锁 + 对外提供服务（写）
        3. 备节点：流复制从主节点同步 + 健康检查
        4. 主节点故障 → 领导锁释放（TTL 过期）
        5. 备节点竞争获取锁 → 唯一获胜者 promote 为新主
        6. 接入层（VIP/HAProxy）切到新主 → 应用无感
        7. 旧主恢复 → 以新主为源 pg_rewind 重新同步（变为备库）
        ```

    - **关键机制**
        - **选主唯一性（防脑裂）**：DCS 领导锁保证同时只有一个主（两个节点都认为自己是主 = 脑裂，锁防止）；注意锁仅在多数派可达时有效——旧主失联但存活时可能存在短暂双主窗口（Patroni 3.x 的 failsafe mode 即弥补此场景，靠锁 + 失联检测）
        - **健康检查**：Patroni 定期检查主节点健康（DB 可达性/TTL）
        - **自动 failover**：主故障自动提升备库（秒级~分钟级）
        - **数据安全**：配合同步复制/多数派（`synchronous_mode`）保证不丢数据
        - **配置中心**：Patroni 配置也存 DCS（动态调整）

    - **部署形态**
        - 节点：主 + 1~N 备（建议 ≥2 备）
        - DCS：etcd 集群（3 节点，高可用）
        - 接入：VIP（Keepalived）或 HAProxy
        - 监控：Patroni API（`/health` 等）

- **协助记忆**
    - Patroni = "PG 高可用的总指挥"：DCS 选主（防脑裂）+ 流复制 + 主故障自动 promote + VIP 切接入。
    - 口诀："DCS 锁选主、流复制同步、故障自动切、旧主 rewind 回归"。

- **进阶思考**
    - **为什么 Patroni 必须有 DCS（etcd）？**
        - DCS 提供"选主共识"：所有节点共享状态 + 领导锁——保证故障切换时只有一个赢家（防双主/脑裂）。没有 DCS，两个备库可能同时认为自己被提升 = 数据损坏风险。DCS 是 Patroni 的"决策中心"。
    - **Patroni 切换后数据会不会丢？**
        - 取决于复制模式：异步复制下主故障可能丢最近未同步数据（RPO>0）；同步模式（`synchronous_mode`/多数派）保证已提交事务不丢（RPO=0）。生产高可用要同步模式 + 多数派。
    - **旧主恢复后怎么回到集群？**
        - 旧主以新主为源，用 `pg_rewind`（快速追平，丢弃旧主上超出新主的 WAL）重新同步，自动变回备库（前置条件：旧主 clean shutdown + 开启 `wal_log_hints` 或 data checksums，否则无法 rewind 只能重建）。Patroni 自动处理。

- **扩展信息**
    - **组件**：Patroni + etcd/Consul（DCS）+ VIP/HAProxy（接入）+ PG 流复制
    - **API**：`/health`（健康）、`/primary`（当前主）、`/switchover`（手动切换）
    - **参数**：`synchronous_mode`（同步复制）、`maximum_lag_on_failover`（切换最大延迟）、`retry_timeout`

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-postgresql%E7%BB%B4%E6%8A%A4/  

