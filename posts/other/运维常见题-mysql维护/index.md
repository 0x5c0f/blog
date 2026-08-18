# 运维常见题-MySQL维护


## 🤔 MySQL 有哪些备份方案？
- **`MySQL` 备份方案按备份内容分为逻辑备份（导出 SQL/文本）与物理备份（复制数据文件），按备份时状态分为冷/温/热备份，按范围分为全量、增量、差异备份。实践中没有单一"最佳方案"，而是组合使用：定期全量 + 增量 + binlog 归档，才能实现时间点恢复（PITR）。选型核心看两个指标：RTO（恢复要多快）和 RPO（最多丢多少数据）。**
    - **第一层**：逻辑备份（导出为 SQL/文本）
        - **`mysqldump`**：官方自带、最经典的单线程逻辑备份工具，输出可读 SQL，适合中小数据量、跨版本迁移、按需导出单表。
            - **`InnoDB` 在线热备组合**：`mysqldump --single-transaction --source-data=2 --all-databases > backup.sql`。`--single-transaction` 把隔离级别设为 `REPEATABLE READ` 并发起 `START TRANSACTION`，对 `InnoDB` 做一致性快照且不阻塞读写；`--source-data=2` 把 `binlog` 位点以注释形式写入 `dump` 文件（`MySQL 8.0.26` 起官方推荐 `--source-data`，`MySQL 8.0` 中旧名 `--master-data` 仍可用）。
            - **恢复**：`mysql < backup.sql`。
            - **注意**：`--single-transaction` 只保证 `InnoDB` 一致，`MyISAM/MEMORY` 表可能处于不一致状态；且与 `--lock-tables` 互斥。

        - **`mysqlpump`**：`MySQL 5.7` 引入的并行逻辑备份工具，曾用于加速导出。但官方文档明确 `mysqlpump` 自 `MySQL 8.0.34` 起弃用（`deprecated`），预计未来版本移除，不推荐新项目使用，官方建议改用 `mysqldump` 或 `MySQL Shell`。
        - **`MySQL Shell dump utilities`（官方新一代推荐）** ：`util.dumpInstance()` / `util.dumpSchemas()` / `util.dumpTables()` 导出，`util.loadDump()` 导入。
            - **特性**：多线程并行、按表分块、压缩、进度显示；输出到本地目录，或写入 `OCI Object Storage` / `S3` 兼容服务 / · 存储。
            - 默认 `consistent=true` 使用 `LOCK INSTANCE FOR BACKUP` 保证一致性（`MySQL Shell 8.0.29` 之前要求 `BACKUP_ADMIN` 权限；`8.0.29` 起无该权限时降级为额外一致性检查）。
            - 数据一致性仅对 `InnoDB` 表保证。
            - **示例**：`mysqlsh --uri root@localhost -- util dump-instance /backup/dump --threads=4`；恢复  `mysqlsh --uri root@localhost -- util load-dump /backup/dump`。

        - **`SELECT ... INTO OUTFILE` / 导出 `CSV`**：按需导出查询结果，常用于数据交换，不是完整备份方案。

    - **第二层**：物理备份（复制数据文件）
        - **冷备份（停机复制）** ：停服后直接复制整个 `datadir`（`ibdata1`、`*.ibd`、`redo log` 等），恢复最快最简单，代价是停机窗口。
        - **`Percona XtraBackup`**：开源的 `InnoDB` 热备物理备份工具（事实标准），复制数据文件同时跟踪 `redo log`，支持全量/增量/压缩/加密/流式（`xbstream`）。
            - **全量**：`xtrabackup --backup --target-dir=/backup/full`；
            - **增量**：`xtrabackup --backup --target-dir=/backup/inc1 --incremental-basedir=/backup/full`。
            - 恢复前必须 `xtrabackup --prepare --target-dir=/backup/full`（用 `redo` 前滚、回滚未提交事务，把备份变成一致状态），再 `xtrabackup --copy-back --target-dir=/backup/full`。
            - **版本严格对应 `MySQL` 大版本**：`MySQL 8.0` 用 `XtraBackup 8.0.x`，`MySQL 8.4` 用 `8.4.x`，`MySQL 9.x` 用对应 `9.x` 系列，跨大版本不兼容（详见扩展信息）。

        - **`MySQL Enterprise Backup（mysqlbackup）`** ：`Oracle MySQL` 商业版附带的物理备份工具，官方文档在大型物理备份场景推荐。
        - **文件系统/存储快照**：`LVM snapshot`、`ZFS snapshot` 或云厂商快照（如 `EBS`），秒级生成、恢复快。
            - **流程**：先 `FLUSH TABLES WITH READ LOCK` 保证一致性 → `lvcreate -L 10G -s -n mysql-snap /dev/vg0/mysql` → 挂载快照复制数据 → 卸载并删除快照。前提是 `datadir` 位于支持快照的卷上。

    - **第三层**：`binlog` 日志备份（`PITR` 的关键）
        - 只有全量/增量备份只能恢复到备份时刻。要回放到任意时间点，必须持续归档 `binary log`：用 `mysqlbinlog  --read-from-remote-server` 从远端拉取，或直接复制 `binlog` 文件异地保存。
        - **恢复时先还原最近备份，再重放备份位点之后的 `binlog`**：`mysqlbinlog binlog.0000xx binlog.0000yy | mysql`。`GTID` 环境下用 `GTID` 集合定位位点更可靠。
        - **典型场景**：凌晨 3 点误删数据，备份是 0 点，重放 0 点到 2:59 的 binlog 即可精确恢复。

    - **第四层**：云数据库托管备份
        - `AWS RDS` / 阿里云 `RDS` / 腾讯云等托管数据库自带自动备份（每日全量 +` binlog/redo` 持续备份）与一键时间点恢复（PITR），支持手动快照。
        - 最省心，但受平台保留期与功能限制；跨云/下云迁移仍需自行导出（`mysqldump` 或 `MySQL Shell dump`）。

    - **第五层**：方案选型与策略
        - 数据量小、迁移/换库 → `mysqldump` 或 `MySQL Shell dump`；数据量大、要求快速恢复（短 `RTO`）→ `XtraBackup` 物理备份；云上托管实例 → 平台自动备份 + `PITR`。
        - 遵循 `3-2-1` 原则（`3` 份拷贝、`2` 种介质、`1` 份异地），并定期演练恢复——备份不可恢复等于没有备份。
        - 主从复制 / `Group Replication` 不是备份：复制是实时重放 `binlog`，人为误删、逻辑错误会同步传播到所有节点；官方做法是复制到副本后再对副本执行备份，且备份必须独立保存、验证可恢复。

- **协助记忆**
    - 逻辑备份像把整本书重新誊写成文本——可读、可改、速度慢；物理备份像直接打包硬盘——快而完整，但只能在同"环境"下还原。
    - 口诀：全量打底、增量跟进、binlog 回放、异地 3-2-1。

- **进阶思考**
    - **主从复制能当备份用吗？**
        - 不能。复制只是实时同步的冗余和高可用，误删/坏数据会经 `binlog` 同步传播到所有副本；官方建议"先复制到副本，再在副本上做备份"，并且备份本身要独立保存和定期验证。

    - **逻辑备份和物理备份怎么选？**
        - 看数据量与恢复目标：几十 GB 以内、要可读/可编辑、迁移换库选逻辑（`mysqldump` / `MySQL Shell`）；大库、要求分钟级恢复选物理（XtraBackup）；云上托管实例直接用平台备份。物理备份恢复快但依赖 `MySQL` 版本，逻辑备份可移植但大库恢复很慢。

    - **为什么必须有 `binlog` 备份才能做 `PITR`？**
        - 全量/增量快照只到备份时刻；`binlog` 记录此后每一次变更，重放 `binlog` 才能把数据回放到"备份之后、灾难之前"的任意时间点，这是 `RPO` 趋近于零的基础。

    - **`XtraBackup` 恢复时为什么必须先 `--prepare`？**
        - 热备时复制出的数据文件与 `redo log` 不在同一时点、内部不一致；`--prepare` 用 `redo` 前滚已提交事务、回滚未提交事务，把备份"抹平"成一致可用状态，之后才能 `--copy-back` 放回 `datadir`。

- **扩展信息**
    - `XtraBackup` 与 `MySQL` 版本对应矩阵：`XtraBackup 8.0.x` ↔ `MySQL 8.0`（该系列已结束支持 EOL，官方建议升级到 8.4）；`XtraBackup 8.4.x` ↔ `MySQL 8.4`（不支持 `8.0` 与 `9.x` 服务器）；`XtraBackup 9.x` ↔ 对应 `MySQL 9.x` 系列。跨大版本互不兼容，选错工具版本备份会直接失败。
    - **`mysqldump` 权限要点**：`--single-transaction` 在 `gtid_mode=ON` 且 `gtid_purged=ON|AUTO` 时需要 `RELOAD` 或  `FLUSH_TABLES` 权限；默认 `--opt` 开启（含 `--quick`，逐行读取避免大表占用内存）。

## 🤔 InnoDB 与 MyISAM 存储引擎有什么区别？
- **`InnoDB` 是事务型、行级锁、崩溃可恢复的通用默认引擎；`MyISAM` 是非事务型、表级锁、面向读多写少场景的轻量引擎。`MySQL 5.5.5` 起 `InnoDB` 成为默认引擎，`MySQL 8.0` 起系统表与数据字典全部基于 `InnoDB`；`MyISAM` 仍受支持但需显式 `ENGINE=MYISAM` 指定，且已不再演进（8.0 起移除其分区支持）**。

    - **第一层**：数据安全与一致性（本质差异）
        - **事务（ACID）** ：`InnoDB` 支持事务，具备提交、回滚、`MVCC` 多版本控制；`MyISAM` 不支持事务，一条语句要么成要么败，多条语句之间无法原子化
        - **崩溃恢复**：`InnoDB` 靠 `redo log` 前滚 + `undo log` 回滚 + `doublewrite buffer` 防半页写，崩溃后自动恢复；`MyISAM` 无 `redo/undo`、无事务性恢复，异常宕机表易损坏，需 `myisamchk` / `mysqlcheck` 手工修复（仅可配置启动时自动检查）
        - **外键**：`InnoDB` 原生支持外键约束，保证引用完整性；`MyISAM` 不支持，只能靠应用层保证
        - **锁粒度**：`InnoDB` 行级锁（辅以意向锁、间隙锁、临键锁），高并发下写互斥面小；`MyISAM` 表级锁，写操作锁整张表，读多写少尚可，读写混合时互相阻塞（例外：表尾 `INSERT` 可与 `SELECT` 并发）

    - **第二层**：存储与索引结构
        - **文件形态**：`InnoDB` 数据与索引存于表空间（独立表空间为 `.ibd` 文件）；`MyISAM` 数据文件 `.MYD` + 索引文件 `.MYI` 分离；表定义在 `8.0` 起统一由数据字典管理（取代 `.frm`）
        - **索引组织**：两者索引都是 `B+Tree`，但组织方式不同 ——— `InnoDB` 主键是聚簇索引，数据行直接存在主键叶子节点，二级索引叶子存主键值，回表取数据；`MyISAM` 是非聚簇，索引与数据分离，索引叶子存行指针，数据行物理存储与索引无关
        - **行数统计**：`MyISAM` 直接保存表行数，无 `WHERE` 的 `COUNT(*)` 直接返回`（O(1)）`；`InnoDB` 不维护精确行数，`COUNT(*)` 需扫描（优化器会尽量选最小的二级索引）

    - **第三层**：功能特性差异
        - **全文与空间索引**：`MyISAM` 原生支持 `FULLTEXT`、`SPATIAL`；`InnoDB` 自 `5.6` 起支持 `FULLTEXT`、`5.7` 起支持 `SPATIAL` ——— 中文全文检索需配合 `ngram parser`，且 `InnoDB` 全文检索只能看到已提交数据
        - **压缩**：`MyISAM` 可用 `myisampack` 压缩为只读表，省空间；`InnoDB` 支持表压缩（`KEY_BLOCK_SIZE`）与页压缩
        - **自增列**：`MyISAM` 支持复合索引中非首列作为自增列（多列联合自增）；`InnoDB` 自增列必须是索引首列；`8.0` 起 `InnoDB` 将自增计数器持久化到 `redo log` 与数据字典，重启/回滚不再回退计数
        - **缓存**：`MyISAM` 只有 `key cache`（索引缓存），数据依赖操作系统文件缓存；`InnoDB` 的 `buffer pool` 同时缓存数据页与索引页，命中率高、受控性好
        - **创建方式**：
            ```sql
            CREATE TABLE t1 (id INT PRIMARY KEY, name VARCHAR(20)) ENGINE=InnoDB;  -- 默认引擎，可省略
            CREATE TABLE t2 (id INT PRIMARY KEY, name VARCHAR(20)) ENGINE=MyISAM;  -- 显式指定
            ```
    - **第四层**：性能与选型场景
        - **`MyISAM` 适合**：读多写少、无事务要求、可接受手工修复风险的场景（如历史归档表、只读报表、经 `myisampack` 压缩的冷数据）；顺序读与无 WHERE 计数有优势
        - **`InnoDB` 适合**：高并发读写、事务、外键、需要崩溃安全的业务表——这也是它成为默认引擎的原因
        - **选型红线**：生产环境默认 `InnoDB`；除非明确只读归档场景，否则不要为了"读快"选 `MyISAM` ——— 表级锁在并发写时反而更慢，且无崩溃恢复的数据损失代价远大于那点读性能

- **协助记忆**
    - `InnoDB` 像银行账本 ——— 每笔流水都有日志（`redo/undo`）、坏了能对账恢复、按账户（行）记账互不干扰；`MyISAM` 像纸质登记簿——记一笔要整本锁住、没有备份日志、被水淹（宕机）后只能手工重抄，但查"总共有多少页"翻一眼封面就知道
    - 口诀：行锁事务能恢复，生产选 `InnoDB`；读多写少可归档，才用 `MyISAM`

- **进阶思考**
    - **`MyISAM` 读真的比 `InnoDB` 快吗？**
        - 仅在特定场景成立 ——— 无 `WHERE` 的 `COUNT(*)` 直接返回行数、顺序全表扫描；高并发下表级锁的读写互斥会抵消读优势。且"快"是以数据安全为代价换的，业务表不值得

    - **`MyISAM` 表级锁是不是读写完全互斥？**
        - 不是。它支持并发插入（`Concurrent Inserts`）：表尾无空洞的 `INSERT` 可与 `SELECT` 并发执行，这是它在读多写少场景能扛住一定写入的原因

    - **为什么网上说"`MySQL 8.0` 弃用了 `MyISAM`"？**
        - 官方文档并未把 `MyISAM` 引擎标记为 `deprecated`；事实是 `8.0` 起 `InnoDB` 全面接管系统表与数据字典、`MyISAM` 不再提供分区支持、功能停止演进，等于"不再被选择"而非"被宣布弃用"——两者表述要区分

    - **`InnoDB` 做中文全文检索要注意什么？**
        - 默认解析器按空格分词，不适合中文；需启用 `ngram parser（5.7.6+）`，按字符 `n-gram` 切分，并注意全文索引只检索已提交数据


- **扩展信息**
    - **边缘化时间线**：`5.5.5` 起 `InnoDB` 成为默认引擎 → `8.0` 起系统表/数据字典全部基于 `InnoDB`、`MyISAM` 分区支持被移除 → `MyISAM` 仅作为兼容选项保留
    - **`8.0` 自增改进**：自增计数器随 `redo log` 持久化并在检查点写入数据字典，解决旧版"重启后计数器从 `MAX(列)` 重新推断、可能回退"的问题

## 🤔 binlog 日志有什么作用？
- **`binlog`（二进制日志）是 `MySQL Server` 层的逻辑日志，记录所有数据变更操作，官方定义的两大核心用途是主从复制与时间点恢复（`PITR`），审计是它的衍生用途。`8.0` 起二进制日志默认开启、默认采用 `ROW` 记录格式；它和 `InnoDB` 的 `redo log` 通过两阶段提交配合，既保证崩溃一致性，又支撑数据恢复到任意时刻。**

    - **第一层**：`binlog` 是什么
        - **记录什么**：记录所有可能改变数据的语句（`DML`、`DDL`）；不记录 `SELECT` / `SHOW` 等不修改数据的查询。`STATEMENT` 格式下"可能造成变更"的语句（如匹配 `0` 行的 `DELETE`）也会被记录，`ROW` 格式下不记录
        - **日志层级**：`binlog` 属于 `MySQL Server` 层，与存储引擎无关，任何引擎都可用；而 `redo log` 是 `InnoDB` 引擎层的日志
        - **默认开启**：`8.0` 起二进制日志默认开启（`5.7` 默认关闭，需手动 `log_bin` 开启）；`8.0.14` 起支持加密（`binlog_encryption`）

    - **第二层**：三大核心作用
        - **主从复制**：主库将 `binlog` 作为变更数据源发送给从库，从库写入 `relay log` 后重放，实现数据同步——这是官方列出的第一用途
        - **时间点恢复（PITR）** ：先恢复全量备份，再用 `mysqlbinlog` 重放增量 `binlog`，把数据库恢复到指定时间点或 `binlog` 位置——误删数据、误操作后的救命手段，官方列出的第二用途
        - **变更审计**：`binlog` 记录了完整的变更历史（谁改了什么、何时改的），可作为审计依据——这是事实上的衍生用途，官方文档未将其列为主要目的

    - **第三层**：记录格式
        - **`STATEMENT`**：记录 `SQL` 语句本身，日志量小；但非确定性函数（`NOW()`、`UUID()`、`RAND()` 等）在主从执行结果可能不一致
        - **`ROW`**：记录行级变更的前后映像，最安全准确、主从绝对一致，但日志量大；`8.0` 起为默认格式，且自 `8.0.34` 起 `binlog_format` 参数被弃用，未来只保留 `ROW`
        - **`MIXED`**：默认按 `STATEMENT` 记录，遇到非安全语句自动切换为 `ROW`，兼顾日志量与安全性
        - **`DDL` 恒为 `statement` 记录**：无论 `binlog_format` 是什么，`DDL` 语句始终以 `statement`（`Query` 事件）格式写入 `binlog` ——— `8.0` 的变化是 `DDL` 变为原子操作（`Atomic DDL`），而非改用 `row` 事件
        - **行映像控制**：`binlog_row_image` 决定 `ROW` 格式记录哪些列 ——— `FULL`（前后映像全列）、`MINIMAL`（仅变更列 + 主键，日志最小）、`NOBLOB`（省略未变更的 `BLOB/TEXT` 列）
        - **事务压缩**：`8.0.20` 起支持 `binlog_transaction_compression`，对 `ROW` 格式的 `binlog` 事务做压缩以省空间（默认关闭，按需开启）

    - **第四层**：与 `redo log` 的区别及一致性保证
        - **`redo log`（`InnoDB` 物理日志）** ：记录数据页的物理修改，循环覆盖、大小固定，专用于崩溃恢复（前滚 + 回滚）
        - **`binlog`（`Server` 层逻辑日志）** ：记录语句或行变更，追加写入、可长期保留，服务于复制与 `PITR`
        - **两阶段提交**：事务提交时先写 `redo log`（`prepare` 状态）→ 写 `binlog` → 再提交 `redo`（`commit`）；崩溃恢复时，已成功写入 `binlog` 的 `prepared` 事务予以提交，未写入的予以回滚，并把 `binlog` 截断到最后有效位置 ——— 这就是"`binlog` 与 `InnoDB` 数据不丢不一致"的机制
        - **刷盘保证**：`sync_binlog=1`（默认值）每次提交将 `binlog` 刷盘，配合 `innodb_flush_log_at_trx_commit=1`，保证已提交事务不丢；`sync_binlog=N（N>1）`或 `0` 时，最多丢失最近未刷盘的提交组

    - **第五层**：关键参数与运维
        - **开启与格式**：`log_bin`（开启）、`binlog_format`（格式）、`binlog_row_image`（行映像）
        - **保留与清理**：`binlog_expire_logs_seconds` 控制保留时长（默认 `30` 天），自动清理发生在启动与 `FLUSH LOGS` 时；旧参数 `expire_logs_days` 已弃用并在 `8.2` 移除；也可 `PURGE BINARY LOGS TO 'mysql-bin.000123'` 手动清理
        - **查看**：`mysqlbinlog` 解析查看（`--base64-output=DECODE-ROWS -v` 可把 `ROW` 事件还原为可读 `SQL`）
        - **`PITR` 操作示例**：
            1. 先恢复最近一次全量备份
            2. 再重放备份时间点之后的 `binlog` 增量（可按时间或按位置）
                ```bash
                    mysqlbinlog --start-datetime="2025-01-01 00:00:00" \
                                --stop-datetime="2025-01-01 12:00:00" \
                                mysql-bin.* | mysql -uroot -p
                    # GTID 环境重放建议加 --skip-gtids
                ```
        - **`GTID` 关联**：复制可用 `GTID`（全局事务标识）替代基于文件+位置的定位，更可靠；`8.0` 默认关闭、`8.4` 起默认开启

- **协助记忆**
    - `binlog` 像快递公司的底单流水——每件货（每个事务）都留底，能按单号（`position`/时间点）查到发过什么、补发（恢复）到哪一步，还能把底单同步给分站（从库）；`redo log` 则像仓库自己墙上的流水账——写错了要能当场涂改恢复，账本小、只留最近一段，和底单（`binlog`）对得上才敢说这单真发出去了
    - 口诀：复制恢复靠 `binlog`，崩溃恢复靠 `redo`，两阶段提交保一致

- **进阶思考**
    - **`binlog` 会丢吗？**
        - `sync_binlog=1` 且配合 `innodb_flush_log_at_trx_commit=1` 时，已提交事务不会从 `binlog` 丢失；调低刷盘频率（`0` 或 `N>1`）是以性能换"最多丢最近一批未刷盘事务"的风险

    - **两阶段提交到底解决什么问题？**
        - 解决"`binlog` 写了但 `InnoDB` 没提交"或反过来的不一致。崩溃恢复时以 `binlog` 为准——写了 `binlog` 的 `prepared` 事务就提交，没写的就回滚，保证主库数据与 `binlog` 完全对齐，复制和恢复才不会错乱

    - **为什么 `8.0` 要把默认格式改成 `ROW` 并逐步弃用 `binlog_format`？**
        - `STATEMENT` 在非确定性函数、触发器等场景主从结果不可控，`ROW` 从根本上消除不一致；代价是日志变大，用事务压缩和 `binlog_row_image=MINIMAL` 缓解

    - **误删了整张表怎么恢复？**
        - 找误删前的全量备份恢复到临时实例，再用 `mysqlbinlog` 重放 `binlog` 到误删前一刻（`--stop-datetime` 或 `--stop-position`），导出数据导回线上；前提是 `binlog` 保留期覆盖了误删时间点——所以保留时长要按业务留够

- **扩展信息**
    - **`Atomic DDL（8.0）`** ：数据字典更新、存储引擎操作与 `binlog` 写入合并为单个原子事务，`DDL` 要么全部成功要么全部回滚，不再出现"表建了一半"或 `binlog` 与元数据不一致
    - **`Group Commit`**：多个事务按提交组批量写 `binlog` 并一次性 `fsync`，`sync_binlog=N` 的单位就是提交组，兼顾吞吐与持久性
    - **`binlog` 加密**：`8.0.14` 起 `binlog_encryption` 可加密 `binlog` 与 `relay log`；开启后 `mysqlbinlog` 无法直接读取 `binlog` 文件，需改用 `--read-from-remote-server` 从实例拉取，第三方解析工具同样受影响
    - **`binlog` 提取 `SQL` 的工具**：
        - **`mysqlbinlog`（官方自带，可离线）** ：`mysqlbinlog --base64-output=DECODE-ROWS -v mysql-bin.000123` 把 `ROW` 事件解码为 `###` 开头的伪 `SQL`（`UPDATE` 显示 `### WHERE` 前映像 + `### SET` 后映像），`-vv` 追加列类型注释；注意解码后列名显示为 `@N` 序号（原始列名丢失），且伪 `SQL` 仅供人读/审计、不可直接重放——真正可重放的是默认输出的 `base64 BINLOG '...'` 语句（管道交给 `mysql` 执行，需 `BINLOG_ADMIN/SUPER` 权限）
        - **`binlog2sql`（`Python` 开源）** ：把 `binlog` 逆向生成原始 `SQL`（`INSERT`/`UPDATE`/`DELETE`），`--flashback`（`-B`）生成回滚 `SQL` 实现闪回；兼容 `Python 2.7/3.4+`，原版已测试 `MySQL 5.6/5.7`（`8.0` 需依赖社区 `fork`）；必须连接在线 `MySQL`（经 `BINLOG_DUMP` 协议拉取并读 `information_schema` 元数据），需 `SELECT`, `REPLICATION SLAVE`, `REPLICATION CLIENT` 权限
        - **`my2sql`（`Go` 开源）** ：基于 `go-mysql` 解析库，`-work-type 2sql|rollback|stats` 分别提取 `SQL` / 生成回滚 `SQL` / 统计执行量，`-sql insert,update,delete` 过滤类型、`-file-per-table` 按表拆分、`-big-trx-row-limit` 定位大事务；`-mode file` 可离线解析 `binlog` 文件；`8.0` 可用但需 `mysql_native_password` 认证；回滚要求 `ROW+FULL`，无主键表需 `-full-columns`
        - **`CDC` 工具（`Canal` / `Maxwell` / `Debezium`）** ：伪装从库实时拉取 `binlog`，输出行级变更事件流（`Canal` 为自定义客户端协议、`Maxwell` 输出 `JSON`、`Debezium` 为跨库通用框架），不还原原始 `SQL` 文本，适合实时同步/异构数据管道
        - **闪回前提（两工具共同限制）** ：`binlog_format=ROW` 且 `binlog_row_image=FULL`（官方 `README` 均明示，不支持 `MINIMAL`）；只能回滚 `DML`，`DDL` 不可回滚；大事务回滚性能差，且解析段内夹杂 `DDL`（表结构变更）会导致回滚异常
        - 选型对比：应急闪回选 `binlog2sql`（需在线库）/ `my2sql`（可离线）；离线审计、还原用 `mysqlbinlog`；实时订阅选 `CDC` 工具；原版 `binlog2sql` 与 `my2sql` 均已多年无实质更新，生产使用需评估停更风险；`8.0.20+` 事务压缩（`binlog_transaction_compression`）下第三方解析工具的兼容性需现场验证

## 🤔 SHOW PROCESSLIST 命令有什么作用？
- **`SHOW PROCESSLIST` 用于查看 `MySQL` 服务器当前各客户端连接线程及部分系统线程的运行状态，是回答"数据库现在在干什么、谁在跑、跑了多久、卡在哪"的第一入口命令。**
    - **第一层**：命令形式与输出
        - **语法**：`SHOW [FULL] PROCESSLIST`；`FULL` 表示显示完整语句文本，不加时语句会被截断。
        - **输出列（每行代表一个线程）**：
            - **`Id`**：连接标识符，与 `CONNECTION_ID()`、`performance_schema.threads` 的 `PROCESSLIST_ID` 对应。
            - **`User`**：发出语句的 `MySQL` 用户。`system user` 表示内部非客户端线程（如复制 `I/O` 与 `SQL` 线程）；`unauthenticated user` 表示尚未完成认证的连接；另有 `event_scheduler` 表示事件调度线程。
            - **`Host`**：客户端主机，`TCP` 连接显示为 `host:port`。
            - **`db`**：线程当前默认数据库，可为 `NULL`。
            - **`Command`**：线程正在执行的命令类型，空闲连接为 `Sleep`。
            - **`Time`**：线程处于当前状态的秒数。
            - **`State`**：线程当前正在做什么的动作/状态。
            - **`Info`**：正在执行的语句；无语句时为 NULL。
        - **`Info` 截断规则**：不加 `FULL` 时 `Info` 仅显示语句前 `100` 个字符；`SHOW FULL PROCESSLIST` 在默认实现下显示完整语句。

    - **第二层**：权限要求
        - **拥有 `PROCESS` 权限**：可查看所有线程，包括属于其他用户的线程。
        - **无 `PROCESS` 权限**：非匿名用户只能看到自己的线程；匿名用户看不到任何线程信息。
        - **生产实践**：监控账号通常授予 `PROCESS` 权限，才能在全库范围定位

    - **第三层**：典型用途与排障手法
        - **"`too many connections`" 排障**：连接数占满时，`MySQL` 为拥有 `CONNECTION_ADMIN`（或已废弃的 `SUPER`）权限的账户保留一条额外连接，`DBA` 仍能连入执行本命令诊断。
        - 定位慢查询/卡住线程：结合 Time（当前状态持续秒数）与 State  态持续数秒不变化，通常值得关注——但先结合 Command 排除正常的Sleep 空闲态，并留意 Waiting for ... 类阻塞态（如 Waiting for table metadata lock）。
        - 终止线程：KILL <Id> 按 Id 终止；自己的线程可直接终止，终止 MIN（或已废弃的 SUPER）权限。

    - **第四层**：· 的演进
        - **废弃路径**：`INFORMATION_SCHEMA.PROCESSLIST` 表自 `8.0.22` 起标记废弃（`deprecated`），在 `8.4 LTS` 中仍保留但官方建议迁移。
        - **新实现**：`8.0.22` 起新增 `performance_schema.processlist` 表；设 `ocesslist=ON` 可让 `SHOW PROCESSLIST` 与 `mysqladmin processlist` 改用它（默认 `OFF`，仍走旧实现）。
        - **新实现的好处**：查询过程不持全局互斥锁——旧实现遍历线程时持有 。
        - **其他替代**：`performance_schema.threads` 表能显示 `SHOW PROCESSLIST` 看不到的后台线程；`sys.processlist` 与 `sys.session` 是面向人类阅读的便捷视图（`8.0.22+` 底层已基于 `processlist` 表）。


- **协助记忆**
    - `SHOW PROCESSLIST` 就像护士站的大屏 ——— 每个病人（连接/查询）显示姓名（User）、床位（Host）、所在科室（db）、在做什么（Command/State）
、待了多久（Time）、诊断记录（Info）。默认大屏只放一行摘要，SHO整病历。
    - 口诀：`PROCESS` 看全库线程，`FULL` 看完整 `SQL`，`KILL` 按 `Id` 处置。

- **进阶思考**
    - **`Info` 默认被截断，想看完整 `SQL` 怎么办？**
        - 用 `SHOW FULL PROCESSLIST`；或查 `INFORMATION_SCHEMA.PROCESSLIST` 的 `INFO` 列（类型 `varchar(65535)`，不截断）——但该表已废弃。注意若启用 `PS` 新实现，`Info` 上限为 `1024` 字符，超长语句仍会被截。
    - **如何区分"真卡住"和"正常慢"的查询？**
        - 看 `State` 是否长期停留在某非 `Sleep` 状态且 `Time` 持续增 驻几乎总是问题；`Sending data`、`Copying to tmp table` 这类执行中状态长驻则要先判断语句本身是否低效。定位到 `Id` 后可 `KILL <Id>`。
    - `SHOW PROCESSLIST` 与 `performance_schema.threads` 有何区别
        - 旧版 `SHOW PROCESSLIST` 遍历线程时持全局互斥锁，高并发下有开销；`threads` 表无锁且能看到后台线程；`8.0.22` 起可用 `performance_schema.processlist` 获得无锁的等价物。
    - **能杀掉其他用户的线程吗？**
        - 需要 `CONNECTION_ADMIN`（或已废弃的 `SUPER`）权限，否则 `<Id>` 只终止当前语句、`KILL <Id>` 断开整个连接。

- **扩展信息**
    - **`MariaDB` 兼容**：`MariaDB` 同样支持 `SHOW [FULL] PROCESSLIST`，输出列与 `Info` 默认截断为 `100` 字符的行为一致。
    - **常见误区**：`Time` 很大的 `Sleep` 线程不代表问题——那是空闲连接；`T` 非语句总耗时。
    - **命令行等价物**：`mysqladmin processlist` 与不加 `FULL` 等价（同样截断）；`mysqladmin --verbose processlist` 才等价于 `SHOW FULL PROCESSLIST`。

## 🤔 Innodb 缓冲池（innodb_buffer_pool_size）作用与调优思路？
- **`InnoDB` 缓冲池（`buffer pool`）是 `MySQL` 在内存中缓存表数据页与索引页的主缓存，是 `InnoDB` 读取性能的核心。调优本质是：给够内存（池越大越像内存数据库）、留足余量（不触发换页）、选对实例数与预热策略、用命中率验证。**

- **第一层**：缓冲池是什么、缓存什么
    - **定位**：`InnoDB` 在内存中划分的区域，缓存被访问过的表数据页和索引页；后续读取直接命中内存，避免每次访问磁盘。
    - **页面与链表**：缓冲池按页（`page`）管理，一页可容纳多行；用 `LRU` 变体组织——新页插入链表中部，把链表分为 `young`（新）和 `old`（旧）两个子链表；默认 `old` 子链表占缓冲池的 `3/8`。
    - **命中率含义**：池越大，**InnoDB** 越像内存数据库——数据从磁盘读一次后，后续访问全在内存。
    - **边界澄清**：`change buffer`（二级索引变更缓冲）与自适应哈希索引（`AHI`）是逻辑上独立的机制，但它们的内存都来自缓冲池，调优时与缓冲池共享同一份内存预算，不要理解为独立的内存区域。

- **第二层**：默认值与版本相关行为（MySQL 8.0）
    - **默认大小**：`innodb_buffer_pool_size` 默认 `128MB`（`134217728` 字节）。
    - **自动配置**：`innodb_dedicated_server`（默认 `OFF`）开启后，在专用服务器/容器上按检测到的物理内存自动计算缓冲池：内存  `<1GB` → `128MB`；`1GB~4GB` → 内存 × **0.5**； >`4GB` → 内存 × `0.75`。它不只调缓冲池，还会自动配置 `redo log` 容量与 `flush_method` 等。
    - **分片**：`innodb_buffer_pool_instances` 把池分成多个区域减少锁竞争；默认值：池 `≥1GB` 时为 `8`，`<1GB` 时为 `1`；上限 `64`；该选项仅在池 `≥1GB` 时生效；官方建议每个实例 `≥1GB`。
    - **块大小**：`innodb_buffer_pool_chunk_size` 默认 `128MB`，是池的动态调整单位；仅启动时可改（`1MB` 步长），运行期不可改。

- **第三层**：动态调整
    - **在线扩容/缩容**：`SET GLOBAL innodb_buffer_pool_size = 1073741824`; 由后台线程逐步执行，无需重启；调整前需等待活动事务完成，调整期间需要访问缓冲池的新事务会等待。
    - **倍数约束**：新值必须是 `chunk_size × instances` 的倍数，否则自动向上取整到下一个合法倍数（如 `16` 实例、`128MB` 块，请求 `9G` → 实际 `10G`）。改 `chunk_size` 或 `instances` 需重启。
    - **注意事项**：改大前先确认物理内存余量，避免换页；大池调整耗时较长，可观察 `Innodb_buffer_pool_resize_status`（`8.0.31` 起含 `status_code`/`progress`）。

- **第四层**：调优思路（评估 → 定大小 → 验证 → 防退化）
    - **先看当前命中率**：`SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%'`; 用 `(1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests) × 100` 估算；健康目标 `99%+`，长期低于 `95%` 说明池偏小（两个变量是近似口径，仅作趋势参考）。
    - **定大小**：官方文档指出"专用服务器上常把物理内存的 `80%` 分给缓冲池"；同时要留足内存给 `MySQL` 其他结构（线程栈、排序/连接缓冲等）和操作系统，避免触发换页。`50%~75%` 是常见工程经验值（建议，非官方规定）。
    - **专用机/容器**：直接 `innodb_dedicated_server=ON` 让服务器按内存自动配置。
    - **选实例数**：池达多 `GB` 时用多实例减少锁竞争，每个实例 `≥1GB`；一般从"每 `1GB` 一个实例"起步（建议）。
    - **防缓存污染**：大批量扫描（`mysqldump`、无 `WHERE` 的全表扫描）会用无用页冲刷热数据；用 `innodb_old_blocks_time` 让大扫描读入的数据快速老化、不被提升为热页。
    - **重启预热**：开启 `innodb_buffer_pool_dump_at_shutdown + innodb_buffer_pool_load_at_startup`，关库时把热页元数据落盘、启动时加载，避免每次重启后冷启动命中率骤降；`8.0.17` 起 `dump` 默认只落最近 `25%` 热页，大池可调大 `innodb_buffer_pool_dump_pct`。

- **协助记忆**
    - 缓冲池就像厨房的备菜台。客人（查询）点菜，厨师把常点的菜提前备在台面，取菜（命中内存）远快于现去冷藏库翻（读磁盘）。台子越大，常点菜越能摆下，InnoDB 就越像"全在台面上"的内存餐厅。调大 size 就是扩备菜台——但扩太大会把走廊（操作系统/其他进程内存）挤没，人过不去（换页）。
    - 口诀（一句）：Buffer Pool 越大越像内存库，命中率 99 起步；调大先看内存余量，chunk×instances 是倍数。

- **进阶思考**
    - **为什么 `buffer pool` 很大但命中率还是低？**
      - 可能热数据集（`working set`）已超出池容量；也可能缓存被扫描/批量任务污染；或读取模式本身不友好（大量全表扫描）。先看  `INNODB_BUFFER_POOL_STATS` 与缓冲池页构成，必要时用 `innodb_old_blocks_time` 治理污染，而不是一味加大。
    - **innodb_buffer_pool_size 能设多大？**
        - `64` 位系统上限很大，但实际受物理内存约束：缓冲池 + 其他内存结构 + 操作系统必须留在物理内存内，否则换页会让性能崩盘。官方给出的 `80%` 是经验指引，不是强制上限。
    - **在线调整池大小会阻塞业务吗？**
        - 调整由后台线程执行，但开始时须等活动事务结束，调整期间需要访问缓冲池的新事务会等待；池越大耗时越长。生产环境建议低峰操作，并观察 `Innodb_buffer_pool_resize_status`。
    - **实例数设多少合适？**
        - 池 `≥1GB` 时默认 `8`；每个实例建议 `≥1GB`。实例过少在多核高并发下锁竞争明显，过多则单实例过小无收益。一般从"每 `1GB` 一个实例"起步（建议），上限 `64`。

- **扩展信息**
    - **概念辨析**：`change buffer` 把二级索引的变更先缓存起来、延迟合并（待对应页读入缓冲池时再合并），其数据落盘于系统表空间、跨重启存活；自适应哈希索引（`AHI`）加速等值查询。三者机制各自独立，但 `AHI` 内存直接取自缓冲池、`change buffer` 页也缓存于缓冲池，调优时占用同一块缓冲池内存预算。
    - **`MariaDB` 差异**：`MariaDB` 同样使用 `innodb_buffer_pool_size`，机制类似（同为 `LRU` 分片），但默认值与自动配置逻辑与 `MySQL` 不同，跨发行版迁移时按所用版本确认。
    - **相关指标**：`SHOW ENGINE INNODB STATUS` 的 `BUFFER POOL AND MEMORY` 段直接给出 "`Buffer pool size` / `Free buffers` / `Database pages` / `Buffer pool hit rate`"；`information_schema.INNODB_BUFFER_POOL_STATS` 按 `POOL_ID` 每实例一行，逻辑读请求对应 `NUMBER_PAGES_GET` 列。
    - 关于 `innodb_buffer_pool_size` 参数的配置，在混合环境(代理、应用、数据库)下，根据个人经验，在非高并发场景下，可以尝试设置为总内存一半的一半的75%, 即总体内存的 18.75% ，以确保服务器的稳定运行。

## 🤔 performance_schema 数据库有什么作用？
- **`performance_schema` 是 `MySQL` 内置的服务端运行时性能监控数据库，用"插桩 + 事件采集"记录服务器内部底层活动——等待事件、语句执行、事务、内存、锁与 `I/O` 等，供性能分析与排障使用。它不是存业务数据的库，而是常驻内存的"服务器体检仪表盘"。**

    - **第一层**：它是什么、与普通库的区别
        - **性质**：名为 `performance_schema` 的 `schema`，底层由 `PERFORMANCE_SCHEMA` 存储引擎实现；表全在内存，重启即清空，不持久化、不写 `binlog`、不参与复制。
        - **定位分工**：`performance_schema` 回答"服务器正在发生/发生过什么"（运行时性能数据）； `information_schema` 回答"库里有什么对象"（元数据）。两者职责不同，不要混用。
        - **版本起源**（基线 5.x）：
            - `5.5.3` 引入，默认关闭；
            - `5.6.6` 起默认开启（`5.6.0~5.6.5` 仍默认关闭）；`5.6` 加入语句事件与 `digest` 汇总；
            - `5.7` 默认开启，并补全事务事件、内存统计、`metadata_locks` 表、`sys schema` 封装（`sys` 随 5.7 默认安装）。

    - **第二层**：它采集哪些数据（5.7 基线）
        - **等待事件 `events_waits_*`**：线程在等待什么（磁盘 `I/O`、锁、互斥量、`socket` 等），是定位瓶颈的关键信号。
        - **语句事件 `events_statements_*`**：`SQL` 的执行耗时、扫描行数、返回行数、错误数；可按 `digest`/用户/主机/账号汇总（`events_statements_summary_by_digest` 等）。
        - **阶段事件 `events_stages_*`**：语句执行的不同阶段（解析、排序等）。
        - **事务事件 `events_transactions_*`**：事务状态与耗时。
        - **内存统计 `memory_summary_*`**：各 `instrument`/线程/账号的当前与峰值内存。
        - **锁与 `I/O`**：`metadata_locks`（元数据锁）、`table_handles`、`table_io_waits_summary_*`、`file_summary_*`。
        - **连接与线程**：`threads`、`accounts`/`hosts`/`users` 等维度汇总。

    - **第三层**：怎么用它排障（核心用法）
        - **看当前在跑什么**：`SELECT * FROM performance_schema.events_statements_current\G`
        - **找慢语句 `Top`**：`SELECT DIGEST_TEXT, COUNT_STAR, SUM_TIMER_WAIT FROM performance_schema.events_statements_summary_by_digest ORDER BY SUM_TIMER_WAIT DESC LIMIT 10;`（`SUM_TIMER_WAIT` 单位为皮秒）
        - **定位瓶颈维度**：先看语句耗时，再看等待事件落到哪类（`I/O`、锁、还是 `CPU`）；`events_waits_summary_global_by_event_name` 看累计等待大头。
        - **查元数据锁**：`SELECT * FROM performance_schema.metadata_locks\G` 找谁持有/在等 `MDL`（`DDL` 阻塞排查）。注意前提：`5.7` 中支撑该表的插桩 `wait`/`lock`/`metadata`/`sql`/`mdl` 默认关闭，直接查会一直为空，需先开启——启动参数 `performance-schema-instrument='wait/lock/metadata/sql/mdl=ON'`，或运行时 `UPDATE performance_schema.setup_instruments SET ENABLED='YES' WHERE NAME='wait/lock/metadata/sql/mdl'`;（`8.0` 起该插桩默认开启）。
        - **内存大头**：`SELECT * FROM performance_schema.memory_summary_global_by_event_name ORDER BY CURRENT_NUMBER_OF_BYTES_USED DESC LIMIT 10`;
        - **便捷视图**：`sys schema` 提供 `sys.session`、`sys.schema_table_lock_waits`、`sys.statement_analysis` 等封装，少写 `join`（同样依赖上述 `mdl` 插桩时先开启）。

    - **第四层**：启用与开销
        - **默认开启**：`5.7`/`8.0` 默认 `ON`；`5.6` 需 `5.6.6+` 才默认 `ON`。主开关与 `performance_schema_max_*` 容量变量非动态，改配置需重启；插桩开关本身可动态改（setup 表）。
        - **开销**：常驻内存 + 少量 `CPU`；用 `performance_schema_max_*` 控制各表容量上限；不需要的插桩可在 `setup_instruments/setup_consumers` 中动态关闭。
        - **影响面**：`5.7` 默认配置下内存通常几十~几百 MB（经验值，非官方规定），高并发实例按需调上限；监控收益通常远大于开销。

- **协助记忆**
    - `performance_schema` 像车内的行车记录仪——不断记录车辆运行中的各种事件，比如“踩油门、刹车、等红灯”（对应 SQL、等待、阶段等事件），出问题时可以查看*当时发生了什么、在等什么*。**业务表是车上的货，负责存储业务数据；performance_schema 是行车记录仪，负责记录数据库运行状态。**关闭某些插桩，就像关闭记录仪的部分传感器：对应的监控数据就不会被采集。
    - 口诀：`PS` 管"发生了什么"，`I_S` 管"有什么"；慢语句看 `digest`，瓶颈看等待。

- **进阶思考**
    - ``performance_schema` 和 `information_schema` 到底什么区别？`
        - `I_S` 是对象元数据（表结构、列、权限等"静态存在"）；`PS` 是运行时性能数据（"动态发生"）。早期 `I_S` 里也有 `PROCESSLIST` 这类偏性能的表，职责上现已明确分离。
    - **为什么说它是"内存库"？重启数据会丢吗？**
        - `PERFORMANCE_SCHEMA` 引擎的表全在内存，启动时重建、关库即弃，不持久化。只有开关和容量上限这类配置写在配置文件里才持久。
    - **5.6 和 5.7 用起来最大差别是什么？**
        - `5.6.6` 前默认关闭需显式开启；`5.7` 默认开启，且多了事务事件、内存统计、`metadata_locks`、`digest` 汇总和 `sys` 封装，基本开箱即用。
    - **开启会拖慢服务器吗？**
        - 有内存和少量 `CPU` 开销，可通过 `performance_schema_max_*` 限内存、用 `setup_instruments/setup_consumers` 关不需要的插桩；对绝大多数实例收益远大于开销。

- **扩展信息（8.x 作为扩展点）**
    - **`8.0`**：新增 `variables_info`（变量类型/作用域）等表；`8.0.22` 起新增 `performance_schema.processlist` 表，作为 `SHOW PROCESSLIST` 的可选底层实现（`performance_schema_show_processlist=ON`，免全局互斥锁）；该能力也回补到了 `5.7.39+`（升级安装时 `5.7` 侧需按手册手工建表，新装则自动创建）。
    - `8.0` 起部分表与插桩行为有调整（如 mdl 插桩默认开启），具体以对应版本手册为准。
    - `MariaDB` 也有 `performance_schema`（自己的版本时间线），跨发行版按文档确认。

## 🤔 MySQL 出现大量 Sleep 线程是什么原因？如何优化？
- **`Sleep` 线程是 `PROCESSLIST` 中 `Command=Sleep` 的空闲连接——本身几乎不干活，但会占连接槽位、掩盖长事务和连接泄漏。大量出现几乎都是"应用连接池配置不当 + `MySQL` 空闲超时过大 + 代码连接未回收"叠加的结果，治理要"应用侧回收 + `MySQL` 侧超时 + 监控治理"三管齐下。**

    - **第一层**：先分清 `Sleep` 线程的正常与异常
        - **什么是 `Sleep`**：`PROCESSLIST` 中 `Command=Sleep` 表示该连接当前无正在执行的语句，处于空闲状态
        - **正常场景**：连接池预热、请求间隙的空闲连接，少量 `Sleep` 完全正常
        - **异常场景**：数量大且长时间（如 `Time` 列持续几分钟到几小时）不释放——连接池空闲连接堆积、连接泄漏、或事务挂起
        - **关键误区**：执行中的慢查询在 `PROCESSLIST` 里是 `Command=Query`，不是 `Sleep`；`Sleep` 持锁的真正来源是长事务未 `commit/rollback`、在语句执行间隙挂起，这种连接同时持有行锁/元数据锁，会阻塞其他事务

    - **第二层**：大量 `Sleep` 的原因
        - **应用连接池配置不当（最常见）** ：最大连接数设得过大（远高于业务并发）、空闲连接不回收（回收间隔未配或配置过大）、连接池预热创建了大量连接
        - **`MySQL` 参数过大**：`wait_timeout` / `interactive_timeout` 默认都是 `28800`（`8` 小时），空闲连接长时间不被服务端断开
        - **连接泄漏**：应用代码开了连接未 ·（异常分支未释放、ORM 未正确关闭），连接只增不减
        - **长事务/未提交事务**：事务开启后迟迟不提交，连接在语句间隙一直显示 `Sleep` 并持锁
        - **超时配置失配**：应用侧超时（如 `JDBC` 的 `socketTimeout`、连接池 `maxLifetime`）与 `MySQL` 的 `wait_timeout` 没有联动，两边都不主动断

    - **第三层**：危害有多大
        - **占连接槽位**：每个 `Sleep` 连接占一个 `max_connections` 名额（默认 `151`，`5.7`/`8.0` 相同），打满后新连接报 `Too many connections`；`MySQL` 会额外保留 1 个连接给 `CONNECTION_ADMIN/SUPER` 权限账户，供管理员应急登录
        - 占用线程与内存：非线程池模式下每连接独占一个线程及其栈内存、net buffer（thread pool 插件是 MySQL 企业版功能，社区版没有），`Sleep` 数量极大时内存/线程开销不可忽略
        - **持锁阻塞**：事务未提交的 `Sleep` 连接持有的行锁/元数据锁不释放，会让其他事务陷入 `LOCK WAIT`，甚至拖垮整个实例

    - **第四层**：如何诊断
        - **查看连接状态**：
            ```sql
            SHOW FULL PROCESSLIST;                                  -- 看 Command=Sleep、Time、Host、Info
            SELECT id, user, host, db, command, time, state
            FROM information_schema.processlist
            WHERE command = 'Sleep' ORDER BY time DESC;             -- 统计 Sleep 线程
            SHOW STATUS LIKE 'Threads_connected';                   -- 当前连接数
            SHOW STATUS LIKE 'Threads_running';                     -- 正在执行的线程数
            SHOW VARIABLES LIKE 'max_connections';                  -- 连接上限
            ```
        - **按来源聚合**：对 `processlist` 按 `host` 分组统计，定位是哪个应用/`IP` 产生的大量连接
        - **揪出事务中的 `Sleep`**：
            ```sql
            SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id, trx_rows_locked
            FROM information_schema.innodb_trx;                          -- 与 processlist.id 关联
            ```
        - 查询 `processlist` 与 `innodb_trx` 需要 `PROCESS` 权限；`8.0.22` 起可改用 `performance_schema.processlist` 表或 `sys.session` 视图，诊断更全面

    - **第五层**：如何优化（MySQL 侧）
        - **调小 `wait_timeout`**：把空闲连接超时调到合理范围（如 `60~300` 秒，经验值，需结合业务判断），让 `MySQL` 主动断开空闲连接：
            ```sql
            SET GLOBAL wait_timeout = 60;      -- 立即生效，但只对新连接有效
            -- 持久化：写入 my.cnf [mysqld] 段
            ```
        - `wait_timeout` 只作用于非交互连接（应用连接）；交互连接（`mysql` 客户端、`Workbench`）由 `interactive_timeout` 控制，治理时两者要一起看
        - **副作用**：调得过小会把连接池的空闲连接掐断，客户端可能报 `server has gone away` ——— 必须和连接池的空闲检测/`keepalive` 间隔匹配（连接池侧回收时间要小于服务端 `wait_timeout`）
        - `thread_cache_size`：缓存已断开连接的空闲线程供复用，减少频繁建连的线程创建开销（作用于线程而非连接，与 Sleep 治理是间接关系）

    - **第六层**：如何优化（应用侧，治本）
        - **连接池合理配置**：最大连接数与业务真实并发匹配，不盲目调大；配置空闲回收与有效性检测。以主流连接池为例：
            - **`HikariCP`**：`maximumPoolSize`（不宜过大）、`idleTimeout`、`maxLifetime`、`connectionTestQuery`
            - **`Druid`**：`maxActive`、`minIdle`、`timeBetweenEvictionRunsMillis`（回收扫描间隔）、`testWhileIdle`、`validationQuery`
        - **代码正确释放连接**：`try-with-resources / finally` 中 `close`，异常路径同样释放；定期代码审查排查泄漏
        - **联动超时**：应用连接池的 `maxLifetime`/`idleTimeout` 与 `MySQL wait_timeout` 保持"应用侧更短"的关系，避免两边都不回收

    - **第七层**：治理与监控
        - **谨慎 `kill`**：先查 `innodb_trx` 确认没有活动事务，再 `kill` 纯空闲连接；`KILL QUERY` 只终止正在执行的语句、保留连接（比 `KILL CONNECTION` 温和）；`KILL`（等价 `KILL CONNECTION`）终止连接及其语句
        - **工具化清理**：`Percona Toolkit` 的 `pt-kill --match-command sleep` 可按条件批量杀空闲连接，注意排除事务中的连接
        - **监控告警**：监控 `Threads_connected` / `max_connections` 比率（如 `>80%` 告警），同时看 `Threads_running` 差值识别空闲占比，避免夜间低峰误报；连接池侧同步监控活跃/空闲连接数

- **协助记忆**
    - `MySQL` 像停车场，`Sleep` 线程就是占着车位不开走的车。车（连接）本身不费油，但车位（`max_connections`）是有限的；真正危险的是占着车位还锁着方向盘的"事务车"（持锁），以及越来越多有进无出的"僵尸车"（连接泄漏）。治理就是三件事：停车场限时（`wait_timeout` 调小）、车主自觉挪车（应用连接池回收 + 代码关连接）、保安盯监控（`Threads_connected` 告警）
    - 口诀：连接池回收治本，`wait_timeout` 兜底，先查事务再 `kill`

- **进阶思考**
    - **`wait_timeout` 调到 `120` 后，为什么已有的 `Sleep` 连接还不断？**
        - 会话的 `wait_timeout` 在连接建立时从全局值初始化，改全局只影响之后新建的连接；要立即清理存量，得 `kill` 或等连接池回收

    - **`Sleep` 线程和慢查询是一回事吗？**
        - 不是。慢查询在执行中（`Command=Query`、`state` 有值），`Sleep` 是空闲（无语句在执行）；但长事务会在语句间隙显示 `Sleep` 且持锁，两者要分开排查——前者看慢查询日志，后者查 `innodb_trx`

    - **为什么 `Sleep` 线程打满连接后还能登录？**
        - `MySQL` 会额外保留一个连接名额给 `CONNECTION_ADMIN/SUPER` 账户，连接打满时管理员仍可登录杀连接、调整参数——这也是应急入口必须留好的原因

    - **连接池最大连接数设多大合适？**
        - 不是越大越好。连接数远超并发只会堆出一堆 `Sleep` 占用槽位；经验上结合 `Threads_running` 观察真实并发，按业务峰值留余量即可，宁可排队也不要无限放大

- **扩展信息**
    - **默认认证插件**：`8.0` 起默认 `caching_sha2_password`，旧驱动/中间件连接 `8.0` 报认证失败很常见（容易被误判为连接问题），需升级驱动；`5.7` 默认是 `mysql_native_password`
    - **诊断入口升级**：`8.0.22` 起 `SHOW PROCESSLIST` 的数据来源改为 `performance_schema.processlist` 表，可配合 `sys.session` 视图做更精细的连接/事务诊断
    - **`KILL` 语法**：`KILL [CONNECTION | QUERY]` 语法 `5.7` 已存在，并非 `8.0` 新增
    - **线程模型**：`Thread Pool`（线程池插件）在 `5.7` 与 `8.0` 均为 `MySQL` 企业版功能，社区版仍是每连接一线程

## 🤔 MySQL 查询慢，如何排查？
- **查询慢排查是一条"确认现象 → 慢日志定位 → `EXPLAIN` 看计划 → 分层找根因 → 针对性优化"的漏斗式链路；绝大多数慢查询根因集中在 `SQL` 写法与索引（约占八成），其余是锁等待、服务器资源与配置。先判断"全库慢还是单条慢、偶发还是持续"，再逐层下钻，避免一上来就调参数。**

    - **第一层**：排查总思路（先定性再定量）
        - **确认现象**：是单条 `SQL` 慢、某个业务接口慢，还是全库整体变慢？偶发一次还是持续？偶发优先查锁等待与资源抖动，持续优先查索引与 `SQL` 写法
        - **漏斗式排查**：现象 → 慢查询日志定位具体 `SQL` → `EXPLAIN` 分析执行计划 → 按"`SQL` 写法 / 索引 / 锁 / 服务器资源"分类定位根因 → 针对性优化 → 验证效果

    - **第二层**：开启慢查询日志定位问题 `SQL`
        - **参数配置**：
            ```ini
            [mysqld]
            slow_query_log = ON                    # 慢日志开关（5.7/8.0 默认关闭）
            long_query_time = 2                    # 超过 2 秒的记录（默认 10 秒，按业务调整）
            log_queries_not_using_indexes = ON     # 记录未走索引的查询（可选，默认 OFF）
            log_throttle_queries_not_using_indexes = 10   # 同类未用索引日志限流，防日志暴涨
            ```
        - 慢日志开启有 `IO` 代价，且语句在执行完、锁释放后才写入，日志顺序不等于执行顺序

        - **分析工具**：
            ```ini
            mysqldumpslow -s c /var/lib/mysql/*-slow.log  # 官方自带，按次数排序聚合
            pt-query-digest /var/lib/mysql/*-slow.log    # Percona Toolkit（第三方，需安装），分析更细
            ```

    - **第三层**：`EXPLAIN` 分析执行计划
        - **基本用法**：`EXPLAIN SELECT ...`（不实际执行语句，只给计划；`5.7/8.0` 均支持 `EXPLAIN FORMAT=JSON` 看成本细节）
        - **重点看四列**：
            - **`type`**：访问类型，从优到劣大致 `system` > `const` > `eq_ref` > `ref` > `range` > `index` > `ALL`；出现 `ALL`（全表扫描）通常就是慢的直接原因
            - **`key`**：实际使用的索引；`key` 为空说明没走索引
            - **`rows`**：估算扫描行数（注意是估算值，偏差大时先 `ANALYZE TABLE` 更新统计信息）
            - **`Extra`**：`Using filesort`（文件排序）、`Using temporary`（临时表）、`Using index`（覆盖索引，好）

        - **统计信息校正**：优化器依赖索引基数统计，数据量变化大导致走错索引时，`ANALYZE TABLE` 表名 可更新统计

    - **第四层**：常见根因分类
        - `SQL` 写法与索引失效：无索引；隐式类型转换（如字符串列与数字比较）；函数包裹索引列（`WHERE DATE(create_time)=...` 无法用索引）；联合索引未用前导列；`LIKE '%xxx'` 前置通配符；`OR` 条件多数场景失效（但两侧列各有索引时可能走 `index_merge`，视索引而定）
        - **深分页**：`LIMIT 100000, 20` 要扫描并丢弃前 `10` 万行；优化用延迟关联（先取主键再回表）或游标分页（基于上一页最后一条的 `id` 条件）
        - **排序与临时表**：`Using filesort / Using temporary` 出现时，检查 `sort_buffer_size`、`tmp_table_size` / `max_heap_table_size` 是否过小导致落盘；`5.7.6+` 磁盘临时表默认用 `InnoDB`
        - **锁等待**：行锁、元数据锁（`MDL`）、表锁阻塞查询。查看手段：`information_schema.innodb_trx` 看事务、`performance_schema.metadata_locks` 看 `MDL`（`5.7+`）、死锁看 `SHOW ENGINE INNODB STATUS 的 LATEST DETECTED DEADLOCK` 段
        - **服务器资源**：`CPU` 高（`SQL` 计算密集/未走索引）、磁盘 `IO` 慢（随机读放大）、`buffer pool` 命中率低、`swap`、网络延迟

    - **第五层**：服务器与配置层面排查
        - **看执行中的 `SQL`**：`SHOW PROCESSLIST / SHOW FULL PROCESSLIST`，观察 `state`（如 `Sending data`、`Waiting for table metadata lock`）
        - **看 `InnoDB` 状态**：`SHOW ENGINE INNODB STATUS`，关注事务、锁等待、死锁段
        - **看 `buffer pool` 命中率**：
            ```sql
            SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read_requests';  -- 逻辑读（命中 + 未命中）
            SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_reads';           -- 从磁盘读的次数
            -- 命中率 ≈ (read_requests - reads) / read_requests，过低说明 innodb_buffer_pool_size 偏小
            ```
        - **看系统层**：`top`（`CPU`/内存）、`iostat`（磁盘 `IO`）、`vmstat`（上下文切换/`swap`），定位是 `SQL` 慢还是资源不足
        - **配置热点**：`innodb_buffer_pool_size`（官方建议约为物理内存 `50%~75%`）、`sort_buffer_size`、`tmp_table_size` / `max_heap_table_size`

    - **第六层**：优化手段汇总
        - **索引优化**：加/改索引、覆盖索引（把查询列并入索引避免回表）、联合索引按"等值在前、排序/范围在后"设计
        - **`SQL` 改写**：避免 `SELECT *`、避免函数包裹索引列、深分页改游标/延迟关联、大 `IN` 列表拆分
        - **数据治理**：冷数据归档、历史表拆分、大事务拆小
        - **架构层面**：读写分离、分库分表（量大到单实例扛不住时）
        - **参数调优**：`buffer pool`、排序/临时表相关参数，改完压测验证

- **协助记忆**
    - 慢查询排查像导航提示"前方拥堵"后重新规划 ——— 先看走没走高速（`type` 是否 `ref/range` 而不是 `ALL`）、有没有绕远路（`rows` 估算）、是不是红绿灯卡死（锁等待）、还是整条路车太多（服务器资源）。`80%` 的情况是"导航没走高速"——索引问题，先看索引再看车流
    - 口诀：慢日志定位、`EXPLAIN` 看路、索引为主、锁和资源兜底

- **进阶思考**
    - **`EXPLAIN` 显示走了索引，为什么还是慢？**
        - 走了索引不等于最优：可能 `rows` 估算偏差（统计信息过时，先 `ANALYZE TABLE`）、回表次数多（改覆盖索引）、深分页、排序/临时表（看 `Extra`）、或数据分布不均导致优化器选错索引

    - **偶发慢查询怎么排查？**
        - 持续慢查索引，偶发慢优先查锁等待与资源抖动——看当时有没有大事务、`DDL`（`MDL` 阻塞）、磁盘 `IO` 尖峰、备份/大查询撞车；`performance_schema` 与慢日志时间戳可回看

    - **为什么"`OR 条件`"不建议写？**
        - 多数场景 `OR` 导致索引失效走全表扫描；但两侧列各有独立索引时可能触发 `index_merge` 合并索引，所以准确说法是"视索引情况，多数场景失效"——稳妥做法是拆成 `UNION` 或改 `IN`

    - **表数据量大了之后全表扫描无可避免吗？**
        - 单表千万级以内靠索引+覆盖索引通常够用；再大考虑冷数据归档、分区表、分库分表；同时监控 `buffer pool` 与磁盘 `IO`，避免内存装不下热点数据

- **扩展信息**
    - **`EXPLAIN ANALYZE（8.0.18+）`** ：实际执行语句并输出每个算子的真实耗时与行数，比估算的 `EXPLAIN` 更直观；`8.0` 还支持 `EXPLAIN FORMAT=TREE`
    - **直方图（8.0 引入）** ：`ANALYZE TABLE t UPDATE HISTOGRAM ON col` 手动为列建数据分布直方图，帮优化器对数据不均的列做出更准判断（5.7 无此能力）
    - **`invisible index（8.0）`** ：可把索引设为不可见（`ALTER TABLE ... ALTER INDEX ... INVISIBLE`），先验证去掉该索引的效果再删除，零风险测试
    - **降序索引（8.0）** ：支持 `INDEX (col DESC)`，解决"升序检索 + 降序排序"无法走索引的问题
    - **`hash join（8.0.18+）`** ：无索引等值连接自动启用哈希连接，替代旧版只能嵌套循环的低效执行
    - **函数索引（8.0.13+）** ：支持 `INDEX ((DATE(create_time)))` 这类函数索引，缓解函数包裹列导致失效的问题
    - **`query cache` 已移除**：`5.7.20` 起废弃（`query_cache_type` 默认 `OFF`）、`8.0` 彻底移除——别再指望它缓存结果

## 🤔 MySQL root 账号密码忘记怎么重置？

- **核心思路是"用特殊方式启动 `MySQL` 绕过认证 → 登录后重置密码 → 恢复正常启动"，主流两种方式：`--skip-grant-tables`（通用、应急）与 `--init-file`（官方文档主推、更安全）。命令按 5.7 为主线给出，8.0 差异在扩展点单独说明——关键是别把 5.6/5.7 的 `UPDATE` 老写法用到 8.0 上。**

    - **第一层**：重置前须知（先看再动手）
        - **高危操作**：`root` 密码重置影响所有依赖该账号的连接，生产环境应走变更流程、评估停机窗口
        - **分清版本**：重置命令分三档 —— `5.6` 及更早（`SET PASSWORD` / 写 `Password` 列）、`5.7`（`ALTER USER` 或 `UPDATE authentication_string`）、`8.0`（只能用 `ALTER USER`）
        - **确认账号 `host`**：实际账号可能是 `'root'@'localhost'` 也可能是 `'root'@'%'`，命令里的 `Host` 部分按 `SELECT user, host FROM mysql.user`; 实际结果写
        - **托管实例例外**：云 `RDS` 等托管实例不开放操作系统层，无法用本文方法，需走云厂商控制台重置

    - **第二层**：
        - 方法一 `--skip-grant-tables`（通用应急）
            ```bash
                # 1) 停止 MySQL 服务
                systemctl stop mysqld        # systemd 环境；SysV 用 service mysql stop

                # 2) 跳过授权表启动；5.7 手动加 --skip-networking 防止无认证远程访问（8.0 会自动禁用远程连接）
                mysqld --skip-grant-tables --skip-networking &

                # 3) 无密码登录
                mysql -uroot

                # 4) 在 mysql> 会话中执行：
                FLUSH PRIVILEGES;                                        # 必须先刷新，否则 ALTER USER 被禁用
                ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPass@123';

                # 5) 退出，恢复正常重启
                exit
                mysqladmin -uroot -p shutdown     # 或用 systemctl stop mysqld
                systemctl start mysqld
            ```

        - **`FLUSH PRIVILEGES` 是必须的**：`--skip-grant-tables` 模式会禁用 `ALTER USER` / `SET PASSWORD` 等账号管理语句，刷新后才恢复
        - 若账号被锁定（`account_locked='Y'`），先 `ALTER USER ... ACCOUNT UNLOCK`

    - **第三层**：
        - 方法二 --init-file（官方文档主推、更安全）
            ```bash
                # 1) 准备包含重置语句的 SQL 文件（属主设为 mysql 运行用户并限权，保证服务器可读）
                echo "ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPass@123';" > /tmp/mysql-init.sql
                chown mysql:mysql /tmp/mysql-init.sql
                chmod 600 /tmp/mysql-init.sql

                # 2) 停止服务，带 init-file 启动（启动时自动执行文件里的语句）
                systemctl stop mysqld
                mysqld --init-file=/tmp/mysql-init.sql &

                # 3) 确认启动成功后删除临时文件，恢复正常重启
                rm -f /tmp/mysql-init.sql
                mysqladmin -uroot -p shutdown
                systemctl start mysqld
            ```
        - 官方文档将 `init-file` 列为主推方法，把 `--skip-grant-tables` 标注为"`less secure`"的替代——因为它不跳过授权检查，只执行一次指定语句

    - **第四层**：
        - `5.x` 老方法（`UPDATE mysql.user`，仅 `5.x` 可用）
            ```sql
                -- 5.7 写法（注意：5.7 起密码存 authentication_string 列，且要同时清掉过期标记）
                UPDATE mysql.user
                SET authentication_string = PASSWORD('NewPass@123'), password_expired = 'N'
                WHERE User = 'root' AND Host = 'localhost';
                FLUSH PRIVILEGES;

                -- 5.6 及更早写法（5.6 的 mysql_native_password 读 Password 列，写 authentication_string 不生效）
                UPDATE mysql.user SET Password = PASSWORD('NewPass@123') WHERE User = 'root' AND Host = 'localhost';
                FLUSH PRIVILEGES;
            ```
        - `5.7` 中 `PASSWORD()` 函数已弃用但仍可用；`mysql.user` 的 `Password` 列在 `5.7` 中并未删除，只是弃用并存，认证数据存 `authentication_string`
        - `5.6` 与 `5.7` 写法不同：`5.6` 写 `Password` 列，5.7 写 `authentication_string`，别混用

    - **第五层**
        - **验证结果**
            - `mysql -uroot -p -e "SELECT 1"`     # 交互式输密码，避免明文出现在进程列表和 shell 历史
        - 若开启 `validate_password` 插件，弱密码会让 `ALTER USER` 直接报错，需按密码策略设置

- **协助记忆**
    - `--skip-grant-tables` 像撬锁进门——安保系统（授权表）整个关了才能进，进去后要先把安保系统重启（`FLUSH PRIVILEGES`）再换门锁密码（`ALTER USER`），走的时候记得把锁装回去；`init-file` 像请物业带钥匙——不开门禁，只让管理员进去换一次锁（执行一条语句），更安全。`8.0` 这个"新锁"（`caching_sha2_password`）换法特殊，不能再像 `5.6` 那样直接改登记表（`UPDATE`），必须走正规换锁流程（`ALTER USER`）
    - 口诀：先停库、跳过认证、刷新权限、`ALTER USER`、正常重启

- **进阶思考**
    - **为什么 `8.0` 不能用 `UPDATE mysql.user` 直接改密码？**
        - `8.0` 默认认证插件 `caching_sha2_password` 的存储值是带摘要轮数的专用哈希，认证时做 `challenge-response` 校验；直接写入明文或错误格式必然校验失败（此为机制解释；官方文档在 `8.0` 已整体删除 `UPDATE` 方式，只保留 `ALTER USER`）

    - **`skip-grant-tables` 启动时没加 `--skip-networking` 有什么风险？**
        - `MySQL` 会监听网络端口且无认证，任何能连到该端口的机器都能免密登录 —— `5.7` 需手动加，`8.0` 会自动启用 `skip_networking`；应急操作务必确认没有远程暴露

    - **主从环境下重置 `root` 密码要注意什么？**
        - 重置的是本机账号，复制账户不受影响；但 `skip-grant-tables` 停机窗口内复制线程停摆会累积延迟（`relay log` / `GTID` 不受影响），重启后主从需重新追平

    - **重置后密码不生效（还能用旧密码登录）？**
        - 多为 `auth_socket` / 无密码认证插件场景（如 `Debian/Ubuntu` 默认 `root` 走 `auth_socket`），此时 `ALTER USER` 改的密码不参与校验，需先 `ALTER USER ... IDENTIFIED WITH mysql_native_password BY '...'` 明确认证插件（`8.0` 推荐 `caching_sha2_password`）

## 🤔 MySQL 插入中文乱码怎么解决？
- **乱码的本质是字符集在"客户端 → 连接 → 服务器 → 库 → 表/列"链路各层不一致，编码被错误转换或贴错标签。解决分三步：先定位是"显示乱"还是"数据坏"，再按"新数据统一 `utf8mb4`、存量数据按字节实际编码转码修复"处理；`5.7` 默认字符集 `latin1` 是历史坑，全链路统一 `utf8mb4` 是根治方案。**

    - **第一层**：先定位——显示问题还是存储问题
        - **看存储字节**：`SELECT id, HEX(name) FROM t`;  ——— 若 `HEX` 是完整正确的 `UTF-8` 字节序列（如"中"是 `E4 B8 AD`），说明数据没坏只是显示乱，问题在客户端/终端/连接层；若字节本身是错的（如每个字只剩一个字节、变成 `?` 或乱字节），说明数据写入时就坏了
        - **对比验证**：同一数据在 `mysql` 客户端查是好的、应用查是乱的 → 问题在应用连接层；两边都乱 → 看存储字节判断是否写入时已坏
        - **关键原则**：列内容的实际编码必须与列声明的字符集一致（官方手册明确）；"`latin1` 列里存着 `utf8` 字节"是常见的"贴错标签"场景——字节没坏，只是声明错

    - **第二层**：字符集链路与常见原因
        - **四层链路**：客户端实际编码（应用/终端）→ 连接三件套（`character_set_client` / `character_set_connection` / `character_set_results`）→ 服务器（`character_set_server` 只作建库默认值，不参与连接转换）→ 库/表/列字符集
        - **常见原因**：
            - **连接字符集与实际数据编码不一致（最常见）**：终端/应用是 `UTF-8`，连接却是 `latin1` 或反之
            - **表/列字符集错误**：`latin1` 存中文、该用 `utf8mb4` 却用了 `utf8`（存不下 `emoji`/生僻字）
            - **写入时已乱码**：数据进库那一刻就错了，之后改字符集也救不回来
            - **纯显示问题**：`SSH` 终端、`Windows` 记事本、客户端工具显示编码不对
            - **应用层未指定字符集**：`JDBC URL`、`PHP`、`Python` 连接参数缺 `characterEncoding/charset`

    - **第三层**：诊断命令
        ```sql
        SHOW VARIABLES LIKE 'character_set%';   -- 看连接三件套与服务器/数据库字符集
        SHOW VARIABLES LIKE 'collation%';
        SHOW CREATE TABLE t;                     -- 看表与列的字符集
        SELECT HEX(name) FROM t LIMIT 5;         -- 看存储字节，判断数据是否已坏
        ```

    - **第四层**：解决方案（新数据——统一 `utf8mb4`）
        - **服务器层（my.cnf）**：
            ```ini
            [mysqld]
            character-set-server = utf8mb4
            collation-server = utf8mb4_unicode_ci     # 8.0 默认 utf8mb4_0900_ai_ci，5.7 建议 unicode_ci

            [client]
            default-character-set = utf8mb4
            ```

        - **连接层**：`SET NAMES utf8mb4`（等价于同时设置 `client/connection/results` 三变量，仅会话级，每次连接都要执行或靠连接池 `initSQL`/驱动参数）
        - **应用层**：
            - **`JDBC`**：`URL` 加 `characterEncoding=UTF-8`（`Connector/J 8.0.13+` 映射 `utf8mb4`；旧写法 `characterEncoding=utf8` 映射的是 `utf8mb3`，存 `emoji` 会失败；`8.0.26+` 连 `8.0` 服务器默认即 `utf8mb4`）
            - **`PHP`**：**`charset=utf8mb4；Python：charset='utf8mb4'`**

        - **建库建表显式指定（不依赖服务器默认值）**：
            ```sql
                CREATE DATABASE db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                CREATE TABLE t (id INT, name VARCHAR(100)) DEFAULT CHARACTER SET utf8mb4;
            ```

    - **第五层**：解决方案（存量数据——按字节实际编码处理）
        - **场景 `A`**：列声明 `utf8/latin1`，字节确实是该字符集编码（如 `latin1` 列存 `latin1` 字节）→ 直接转码： `ALTER TABLE t CONVERT TO CHARACTER SET utf8mb4;` 按旧字符集解释并转码到新字符集
        - **场景 `B`**：列声明 `latin1`，但实际字节是 `utf8` 编码（贴错标签） → 直接 `CONVERT` 会二次转码更乱，分两步：先 `ALTER TABLE t MODIFY col BLOB`（去掉字符集信息、字节原样保留），再 `MODIFY col VARCHAR(100) CHARACTER SET  utf8mb4`；也可用等价的一行写法：
            ```sql
                UPDATE t SET col = CONVERT(CAST(col AS BINARY) USING utf8mb4);  -- 字节原样取出，按 utf8mb4 解释
                -- 之后别忘了 ALTER 修改列声明，否则下次写入再次错位
            ```
        - **前提**：列内所有字节必须同一编码（混合编码无法正确转换，官方明确警告）

        - **场景 `C`**：
            - **整库迁移**：`mysqldump` 导出 → 修改 `dump` 文件的字符集声明（`SET NAMES` / `CHARSET`）→ 导入新库，比逐表 `ALTER` 更稳
        - **迁移注意**：`utf8mb3` → `utf8mb4` 时 `VARCHAR` 长度与索引前缀限制会收紧（如 `COMPACT` 行格式索引前缀 `191` vs `255`），迁移前先检查列长度与索引

- **协助记忆**
    - 字符集就像一本密码本。文字转换成字节后， `MySQL` 需要用对应的密码本把字节解读回来。客户端用 `utf8mb4` `编码，MySQL` 却用 `latin1` 解读，就相当于拿错了密码本，于是出现乱码。所以解决乱码的关键就是：编码和解码使用同一套字符集规则。
    - 口诀：先 `HEX` 验货，后统一 `utf8mb4`，存量按字节编码转码

- **进阶思考**
    - **`utf8` 和 `utf8mb4` 到底差在哪？**
        - `utf8` 是 `utf8mb3` 的别名，只能存 `BMP` 基本区字符；`emoji`（4 字节）、部分生僻字需要 `utf8mb4`（5.5.3 引入，最多 4 字节）。8.0 中 `utf8` 别名已弃用，新项目应显式写 `utf8mb4`

    - **为什么"查出来是 ? 或问号"和"查出来是锟斤拷"不一样？**
        - 问号通常是写入时编码无法映射（如 `utf8` 存 `emoji` 被截断丢弃）；"锟斤拷"是 `GBK` 字节被按 `UTF-8` 解释的典型乱码特征。两者修复路径不同：前者数据已损坏难恢复，后者改对解释方式即可

    - **改了 `my.cnf` 字符集，为什么已有连接还是乱？**
        - 字符集在连接建立时确定（三件套来自客户端握手请求），`my.cnf` 只影响新连接；已有连接需重连，且应用侧连接参数同样要改——服务器、连接、应用三层要一起动

    - **`8.0` 客户端连 `5.7` 服务器为什么反而乱码？**
        - `8.0` 默认 `--default-character-set=utf8mb4` 连带默认 `collation utf8mb4_0900_ai_ci`，而 `5.7` 不认识 `0900` 排序规则，会静默回退 `latin1`——跨版本连接要显式指定 `collation`（如 `utf8mb4_general_ci`）

- **扩展信息**
    - **默认字符集**：`8.0` 默认 `character_set_server=utf8mb4`、默认排序 `utf8mb4_0900_ai_ci`（`Unicode 9.0` 无重音不区分大小写）；`5.7` 默认 `latin1/latin1_swedish_ci` ——— 升级到 `8.0` 后新库默认就带中文支持
    - **`utf8` 别名弃用**： `8.0` 中 `utf8` 作为 `utf8mb3` 别名已标记弃用（`8.0.28` 起 `SHOW/Information Schema` 显示 `utf8mb3`），未来可能改指 `utf8mb4`，新代码显式写 `utf8mb4`
    - **连接回退坑**：`8.0` 客户端连 `5.7` 服务器时 `0900 collation` 不被识别会静默回退 `latin1`（高频乱码来源，见进阶思考）

## 🤔 什么是 MySQL 的表空间？
- **表空间（tablespace）是 InnoDB 存储引擎把数据组织到物理文件上的逻辑存储单元——表的数据和索引都存放在表空间中，向下对应具体的数据文件。InnoDB 的表空间体系分五类：系统表空间、独立表空间、通用表空间、undo 表空间、临时表空间；5.7 默认每张表独立一个 .ibd 文件，8.0 把数据字典迁出了 ibdata1（redo log 不属于表空间，别混淆）。**
    - **第一层**：表空间是什么
        - **逻辑 vs 物理**：表空间是 `InnoDB` 的逻辑存储容器，一个表空间对应一个或多个物理数据文件（如 `ibdata1`、`table.ibd`）
        - **包含什么**：表数据（聚簇索引）、二级索引、`undo` 日志、数据字典、`change buffer` 等按类型分散在不同表空间中
        - **注意区分**：`redo log（ib_logfile*）`是 `InnoDB` 的日志文件，不属于表空间

    - **第二层**：五大表空间（5.7 主线）
        - **系统表空间（system tablespace）** ：默认文件 `ibdata1`（`ibdata1:12M:autoextend`，可配置多个文件）。`5.7` 中承载数据字典、`doublewrite buffer`、`change buffer` 和 `undo log`；当 `innodb_file_per_table=OFF` 时，表数据也放这里
        - **独立表空间（file-per-table）** ：每张表一个 `.ibd` 文件（库名/`表名.ibd`），存该表的数据与索引；`innodb_file_per_table` 自 `5.6.6`（手册正文写"5.6 起"）默认开启——这是主流生产形态
        - **通用表空间（general tablespace）** ：`5.7.6+` 引入，`CREATE TABLESPACE` 创建，多张表共享一个 `.ibd`，介于系统表空间与独立表空间之间，适合同类小表归并
        - **`undo` 表空间**：存放回滚段（`undo log`）。`5.7` 默认放系统表空间（`innodb_undo_tablespaces` 默认 `0`），可配置独立 `undo` 表空间，但该参数已废弃、只能在实例初始化时配置；系统表空间始终保留 `1` 个 `rollback segment`（`innodb_rollback_segments` 默认 `128`）
        - **临时表空间（temporary tablespace）** ：`5.7` 引入的共享临时表空间 `ibtmp1`（默认 `ibtmp1:12M:autoextend`），存放磁盘临时表（非压缩）与内部临时表，随实例重启重建；压缩临时表（`ROW_FORMAT=COMPRESSED`）仍在独立表空间

    - **第三层**：关键参数
        ```ini
        [mysqld]
        innodb_data_file_path = ibdata1:12M:autoextend   # 系统表空间文件定义
        innodb_file_per_table = ON                       # 独立表空间（默认 ON）
        innodb_autoextend_increment = 64                 # 系统表空间自动扩展增量（M；只作用于系统表空间，不影响 .ibd）
        innodb_undo_tablespaces = 0                      # 5.7：独立 undo 数量（已废弃，初始化时配置）
        innodb_temp_data_file_path = ibtmp1:12M:autoextend  # 5.7：临时表空间
        ```

    - **第四层**：运维要点
        - **`ibdata1` 无法收缩**：系统表空间不能直接删文件缩小，官方唯一方案是导出数据 → 新实例导入（或重建实例）。这是"`ibdata1` 太大"的标准处理方式
        - **独立表空间的优缺点**：优点是 `DROP/TRUNCATE` 表直接删 `.ibd` 归还空间、避免系统表空间无限膨胀；缺点是每表独立 `fsync` 开销、小表碎片多、表多时文件描述符占用多
        - **`file_per_table=OFF` 时**：所有表数据都进系统表空间，`DROP` 表不归还空间（`ibdata1` 只增不减）——除非有特殊理由，不建议关
        - **`undo` 独立 ≠ `ibdata1` 收缩**：`5.7` 即使配置独立 `undo` 表空间，已写入 `ibdata1` 的历史 `undo` 空间也不会自动收回，收缩仍要走重建

- **协助记忆**
    - 表空间像图书馆的存放体系 ——— 独立表空间是一本书一个格子（`table.ibd`），系统表空间 `ibdata1` 是总档案柜（数据字典、双写缓冲、`change buffer` 全堆一起），通用表空间是"同类书共用一个柜子"，`undo` 表空间是"废纸回收箱"，临时表空间是"临时借阅台"。档案柜（`ibdata1`）一旦堆满没法直接换小，只能整个图书馆重建搬书——这就是"`ibdata1` 无法收缩"的本质
    - 口诀 ：表数据在 `.ibd`，元数据在 `ibdata1`，`redo` 是日志不是表空间

- **进阶思考**
    - **为什么要从"所有表都在 `ibdata1`"改成"一表一个 `.ibd`"？**
        - 早期（5.6.6 前）所有表挤在 `ibdata1`，`DROP` 表空间不归还、单文件巨大难维护；`file-per-table` 让每个表独立文件，删表即回收、备份/迁移按表粒度，代价是每表独立 `fsync` 与碎片

    - **ibdata1 已经 200G 了怎么处理？**
        - 不能在线收缩。标准做法：`mysqldump` 导出（或物理备份）→ 在新实例（或重建数据目录）导入；`8.0` 中数据字典已迁出 `ibdata1`，此问题已大幅缓解

    - **8.0 里 ibdata1 变小了吗？**
        - 是的。8.0 数据字典迁入 `mysql.ibd`，`ibdata1` 主要只剩 `change buffer`（8.0.20 起 `doublewrite` 也迁出到独立 `.dblwr` 文件），`ibdata1` 不再是"总档案柜"

    - **undo 表空间能删吗？**
        - 不能 `DROP`；只能 `truncate` 收缩（且需至少 2 个 `undo` 表空间才能轮换 `truncate`）。`8.0` 默认 2 个 undo 表空间（`undo_001`/`undo_002`），不再允许放回系统表空间

## 🤔 什么情况下会发生死锁？
- **死锁是多个事务互相持有对方需要的锁、谁也不释放，形成循环等待。`InnoDB` 有死锁检测器，检测到就自动回滚"修改行数最少"的事务，应用收到 `ERROR 1213`（`SQLSTATE 40001`）后重试即可。高发场景集中在加锁顺序不一致、间隙锁与范围更新、唯一键冲突、外键约束；避免的核心是"固定加锁顺序 + 短事务 + 缩小锁范围"。**
    - **第一层**：死锁是什么（先懂机制）
        - **定义**：每个事务都持有别人需要的锁、又在等待别人持有的锁，形成循环等待（`circular wait`）——官方定义："`each transaction holds a lock that is needed by another one`"
        - **四个必要条件（通用并发理论）**：互斥、持有并等待、不可剥夺、循环等待——四个同时满足才会死锁
        - **`InnoDB` 的应对**：不是等死，而是主动检测——事务等待锁时检查等待图有没有环，有环就回滚其中一个（挑选插入/更新/删除行数最少的小事务，官方是"`tries to pick small transactions`"，且可能回滚多个），释放它的锁让其他事务继续
        - **注意**：死锁报错是 `ERROR 1213` (`40001`)；锁等待超时是另一回事——等待超过 `innodb_lock_wait_timeout`（默认 `50` 秒）报 `ERROR 1205` (`HY000`)，一个是主动回滚、一个是被动放弃

    - **第二层**：`InnoDB` 高发死锁场景
        - **加锁顺序不一致（最常见）** ：事务 `A` 先锁表 `1` 再锁表 `2`，事务 `B` 先锁表 `2` 再锁表 `1`，互相卡住；多行更新顺序相反同理——官方明确"`transactions lock rows in multiple tables... in the opposite order`"
        - **二级索引与回表锁交叉**：`UPDATE/DELETE` 经二级索引定位时，先锁二级索引记录、再锁对应聚簇索引记录；两个事务走不同索引路径，锁的获取顺序交叉形成环
        - **范围查询的间隙锁（gap lock）** ：`RR` 隔离级别下范围条件加的是 `next-key lock`（记录锁 + 前间隙锁）；相邻范围的事务要插入新行，需先拿插入意向锁，与对方持有的 `gap` 锁冲突，形成死锁——这是 `RR` 下最常见的死锁来源
        - **唯一键冲突检查**：插入重复唯一键值时，`InnoDB` 会在唯一性检查阶段对已存在的重复记录加共享锁（`S` 锁） ；两个事务同时插入同一个唯一键，互相持 `S` 等对方释放，死锁
        - **外键约束**：插入/更新子表记录时，要对父表对应行加共享锁做外键检查；与父表行上的排他锁（`DELETE/UPDATE` 持有）交叉即死锁
        - **批量/范围 `UPDATE` 边界不同**：两个事务更新同一范围，因执行时序各自拿到部分锁，边界错位互相等对方释放
        - **单行也能死锁**：单行 `INSERT` 并非原子——它要在多个索引记录（含 `gap`、唯一键检查）上自动加锁，两个事务在相邻位置/同一唯一键上交错等待同样会死锁

    - **第三层**：死锁检测与相关参数
        - **检测器开关**：`innodb_deadlock_detect`（`5.7.15` 引入，`5.7/8.0` 均有）默认 `ON`；极高峰并发场景可关闭以减少检测开销，但关闭后死锁只能靠 `innodb_lock_wait_timeout`（默认 50 秒）兜底，等待期间锁会堆积，谨慎操作
        - **检测边界**：官方说明等待列表超过 `200` 个事务或锁检查超过 `1,000,000` 次时即视为死锁回滚
        - **检测开销**：大量线程等待同一把锁时，死锁检测本身也有开销——这是部分高并发场景关检测的原因

    - **第四层**：
        - **如何排查死锁**：`SHOW ENGINE INNODB STATUS;`   -- 看 `LATEST DETECTED DEADLOCK` 段：两个事务的 SQL、持有锁、等待锁
        - **全量记录**：`SET GLOBAL innodb_print_all_deadlocks = ON`;（5.6.2+）把每一次死锁都写入 MySQL 错误日志（默认只记最近一次）
        - **锁监控**：`5.7` 用 `performance_schema.data_locks / data_lock_waits`（5.7 起已存在）；应用侧捕获 ERROR 1213 并按业务重试

    - **第五层**：如何避免死锁
        - **固定加锁顺序**：所有事务按相同顺序访问多表/多行（如统一按主键升序），从根上消除循环等待——官方第一建议
        - **事务短小**：尽快提交释放锁，缩小"持有并等待"的时间窗口
        - **缩小锁范围**：等值条件代替范围条件（减少 gap 锁）、合理索引让锁少而准（官方明示"`well-chosen indexes... set fewer locks`"）、避免大范围批量更新
        - **降低隔离级别**：官方建议"`try using a lower isolation level such as READ COMMITTED`"——RC 下禁用 `gap locking`（next-key 退化为记录锁），能降低死锁概率；注意官方同时指出死锁的根源是写操作、与隔离级别无必然关系，RC 只是减少触发面
        - **应用层重试**：官方明确*always be prepared to re-issue a transaction if it fails due to deadlock*——1213 是预期内错误，重试机制必须有

- **协助记忆**
    - 死锁像单行桥上两车对向会车 —— `A` 车占着桥头等 `B` 让路，`B` 车占着桥尾等 `A` 让路，谁都不退。交警（死锁检测器）来了，直接拖走一辆车（回滚小事务），其余车继续走；但如果交警没来（检测关闭），两车只能干等到天荒地老（50 秒锁超时）。避免方法就是约定"都靠右走"（统一加锁顺序）和"别在桥上逗留"（短事务）
    - 口诀 ：顺序一致、事务短小、少用范围锁，1213 来了就重试

- **进阶思考**
    - **死锁和锁等待超时是一回事吗？**
        - 不是。死锁是检测器发现循环等待主动回滚，秒级报 `ERROR 1213`；锁等待超时是单方等待超过 `innodb_lock_wait_timeout`（默认 50 秒）被动放弃，报 `ERROR 1205`。前者是系统纠错，后者是系统放弃

    - **为什么"单行插入"也会死锁？**
        - 单行 `INSERT` 不是原子的，要插入意向锁 + 唯一键检查 + 多个索引记录（含 gap）上自动加锁；两个事务在相邻 gap 或同一唯一键上交错等待，同样形成环——这就是官方*even a single-row insert can deadlock*的原因

    - **关闭死锁检测有什么风险？**
        - 死锁不再被主动发现，只能靠 50 秒锁超时兜底；这 50 秒内锁一直被占、等待链堆积，可能拖垮高并发业务。除非压测证明检测开销是瓶颈，否则不建议关

    - **RC 隔离级别能彻底避免死锁吗？**
        - 不能。RC 只是禁用了 gap lock、减少死锁触发面，但加锁顺序不一致、唯一键冲突、外键检查等场景照样死锁——官方明确死锁的产生与隔离级别无必然关系，根源是写操作的锁交互


- **扩展信息**
    - 锁监控表更替：8.0 中 information_schema.innodb_locks / innodb_lock_waits 已移除，performance_schema.data_locks / data_lock_waits 成为唯一途径（这两张表 5.7 已存在，8.0 起完全取代 I_S 表）
    - 8.0 autoinc 相关：8.0 的 AUTO-INC 锁机制（默认 interleaved 模式）减少插入自增锁的互相阻塞，但仍需注意插入意向锁与 gap 的交互

## 🤔 MySQL 主流高可用方案有哪些？
- **高可用 = 复制（数据同步）+ 切换（故障转移）两层能力，评价看 RPO（最多丢多少数据）与 RTO（多久恢复）。主流方案分四类：经典 MHA（5.7 存量时代主力）、官方 MGR / InnoDB Cluster（8.x 主线）、Orchestrator（复杂拓扑）、云 RDS（托管免运维）；选型先定版本、再定可接受的 RPO/RTO。**

    - **第一层**：高可用的核心要素
        - **复制层**：把主库数据同步到备库——异步（默认，主库崩溃可能丢已提交事务）、半同步（至少一个备库确认才提交，缩小丢失窗口）、组复制（共识协议强一致）
        - **切换层**：主库故障时把流量切到新主——人工脚本、`MHA/Orchestrator` 自动切换、官方 `InnoDB Cluster` 自动选主、云 `RDS` 托管切换
        - **评价指标**：`RPO`（`Recovery Point Objective`，数据丢失上限）、`RTO`（`Recovery Time Objective`，恢复时长）；典型：`MHA` 秒级 `RTO`、异步复制有秒级~分钟级 `RPO`

    - **第二层**：复制基础层（先有数据同步）
        - **异步复制（默认）** ：主库提交即返回，不等待备库确认——性能好，但主库崩溃时已提交但未传到备库的事务会丢（官方原文：*if the source crashes, transactions that it has committed might not have been transmitted to any replica*）
        - **半同步复制（semi-sync）** ：官方插件（`5.5` 引入，需安装启用，默认关闭），主库等至少一个备库确认收到 `relay log` 才提交，把 `RPO` 压到接近 `0`；注意超时会自动回退异步，仍留丢失窗口
        - **`MGR`（`MySQL Group Replication`，5.7.17+ 官方插件）** ：基于 `Paxos` 共识协议，支持单主（自动选主）与多主模式，组内多数派存活即高可用，内置防脑裂机制；强制要求 `GTID`

    - **第三层**：切换/管理方案
        - **`MHA（Master High Availability）`** ：经典第三方方案（`yoshinorim` 开发）。监控主库，故障时自动选新主、从各从库补齐 `relay log` 后切换，秒级 `RTO`；原版已停更（最后推送约 `2020` 年） ，对 `MySQL 8.0` 支持有限（`8.0` 默认认证插件与 `MHA` 的 `Perl` 驱动兼容性问题是常见坑），社区有多个 `8.0 fork` 但无公认活跃维护版，需谨慎评估——属于"`5.7` 存量现状"而非推荐新用
        - **`Orchestrator`**：`GitHub` 开源（`openark/orchestrator`），管理 `MySQL` 复制拓扑（级联、多主、拓扑可视化），自动检测故障并重挂从库、切换；注意两点：`Raft` 只用于 `orchestrator` 自身多节点 `HA`（`leader` 选举），不参与 `MySQL` 数据面；原仓库已归档（`archived`） 、最后 `release 3.2.6`（2022 年），无公认活跃后继，生产使用需评估
        - **双主 + VIP（keepalived）** ：经典双主互备 + 虚拟 `IP` 漂移。简单直接，但有脑裂风险（两侧同时写），必须配 `fencing` 机制；生产建议"只写一侧 + 复制用于切换"，不要真双写

    - **第四层**：官方一体化方案（InnoDB Cluster）
        - **组成**：`MGR`（组复制）+ `MySQL Shell` 的 `AdminAPI`（`dba.createCluster` 一键建集群）+ `MySQL Router`（读写自动路由，主故障自动把应用流量切到新主）
        - **版本要求**：必须 `MySQL 8.0+`，`5.7` 只能用裸 `Group Replication`，组不了 `InnoDB Cluster`；官方要求至少 `3` 实例（多数派）
        - **适用**：新项目/8.0 环境官方推荐路线，自动化程度最高；配合 `Clone` 插件（`8.0.17+`）可快速加节点

    - **第五层**：中间件与云托管
        - **`ProxySQL` 等中间件**：做读写分离、后端健康检查与故障剔除（应用只连中间件，后端切换对应用透明）；注意 `ProxySQL` 不做复制切换决策——主从切换仍由 `MHA`/`Orchestrator`/人工完成后再改路由
        - **云 `RDS`**：`AWS Multi-AZ`、阿里云高可用版等自带主备切换与多可用区能力，`RPO≈0`（内部半同步）但 `RTO` 通常分钟级，且复制拓扑/账号权限受云厂商限制——云上首选，省运维

    - **第六层**：选型建议
        - **5.7 存量生产**：`MHA` + 半同步是历史主流组合（半同步保证备库有数据、`MHA` 切换时补齐 `relay log`，`RPO` 接近 `0`）；但要意识到 `5.7` 已 `EOL`、`MHA` 已停更，属存量维护策略
        - **新项目 / `8.x`**：官方路线 `InnoDB Cluster` / `MGR`（单主）+ `MySQL Router`；追求官方统一、少自研脚本
        - **复杂复制拓扑**：`Orchestrator` 曾是首选，鉴于已归档，需评估社区 `fork` 或自研兜底
        - **云上**：直接用云 `RDS` 高可用，别自己搭

- **协助记忆**
    - 复制像飞机的备份引擎——异步是"副引擎有没有同步看运气"（可能丢数据），半同步是"副引擎确认点火才起飞"（少丢数据）；切换像换飞行员——MHA
      是熟练老副驾（老牌但已退役），InnoDB Cluster 是自动驾驶系统（官方、自动接管），Orchestrator 是塔台调度（管多架飞机的拓扑），云 RDS
      是包机服务（托管，省心）。选型就是问自己：飞机多老（版本）、能接受丢多少（RPO）、多久能复飞（RTO）
    - 主库是发货仓，备库是分拨仓/备份仓，数据就是"货"; 
        - **异步复制**：货打包完先发出去再说——主仓出事时，还有货在路上/没打包（丢件 = RPO）
        - **半同步**：收件仓必须签收确认（ACK） 才算发货完成，货没签收不敢接下一单
        - **MGR**：多个分拨仓用多数派确认统一调度，防止各仓各说各话（防脑裂）
        - **MHA**：老调度员——经验丰富但已退休，只能翻旧记录，新系统（8.0）不太会用
        - **Orchestrator**：全网调度平台，管所有分拨仓的转运拓扑（级联、多仓）
        - **InnoDB Cluster**：智慧物流系统——自动调度 + 自动路由，货自动走可用仓
        - **云 RDS**：直接把物流外包给菜鸟驿站/顺丰托管，省心
    - 口诀：复制保数据、切换保可用，5.7 靠 MHA、8.x 走 Cluster

- **进阶思考**
    - **半同步 + `MHA` 为什么能接近零丢失？**
        - 半同步保证"已提交事务已写入至少一个备库的 `relay log`"；`MHA` 切换时从各备库收集并补齐 `relay log` 再提升新主——数据在主库和备库两侧都有，主库宕机也不丢。但半同步超时会自动回退异步，回退期间仍有丢失窗口

    - **`MGR` 和 `InnoDB Cluster` 是一回事吗？**
        - 不是。`MGR` 是复制引擎（共识协议，`5.7.17` 起有）；`InnoDB Cluster` 是"`MGR` + 管理工具 + 路由"的完整高可用方案（`8.0` 起，`5.7` 组不了 `Cluster`）。可以说 `InnoDB Cluster` 是"开箱即用的 `MGR`"

    - **双主 + `VIP` 和 `MGR` 都能防脑裂吗？**
        - 双主 + `VIP` 没有内置防脑裂，需要外部 `fencing`（如 `STONITH`）兜底；`MGR` 内置自动防脑裂机制（多数派存活才服务，`quorum` 丢失整体停服保护数据一致性）——这是官方方案更稳的关键差异


- **扩展信息**
    - **`ClusterSet（8.0.21+）`** ：`InnoDB Cluster` 的跨地域容灾方案，多个 `Cluster` 组成 `ClusterSet`，提供地域级故障转移
    - **`Clone` 插件（8.0.17+）** ：物理克隆加节点，替代传统备份恢复的 `provisioning` 方式，`InnoDB Cluster/MGR` 加节点更快
    - **`MGR` 演进**：`8.0.27` 引入 `group write consensus`、`8.4` 引入 `Single Consensus Leader`，持续优化共识路径
    - **生命周期提醒**：`5.7` 已 `EOL`、`8.0 Premier Support` 已结束（`Extended` 阶段），新项目考虑 `8.4 LTS`


## 🤔 简述 MySQL 主从复制工作原理？
- **主从复制的本质，是单向异步的"数据搬运"——主库把每次变更写进 binlog（源头流水账），从库两个线程接力搬：I/O 线程把 binlog 搬到本地 relay log，SQL 线程再照着重放；主库默认不等从库确认（异步），半同步是加一道"签收确认"的保险。**
    - **第一层**：三线程模型（搬运的"人"）
        - **主库 `dump` 线程（`binlog dump thread`）** ：从库一连接，主库就为它建一个专用线程，读取 `binlog` 并发送
        - **从库 `I/O` 线程**：连接主库、请求 `binlog`，把收到的事件写入本地 `relay log`
        - **从库 `SQL` 线程**：顺序读取 `relay log` 并重放执行（多线程复制开启时是 `coordinator` + 多个 `worker` 并行）

    - **第二层**：两个日志（搬运的"货"）
        - **`binlog`（主库）** ：记录所有数据变更（`DML/DDL`），是复制的数据源
        - **`relay log`（从库）** ：`I/O` 线程写入、`SQL` 线程读取，重放后自动清理（`relay_log_purge` 默认 `ON`）；事件格式与 `binlog` 一致，级联复制可无缝衔接
        - 本质链路：主库 `binlog` → 网络 → 从库 `relay log` → 从库数据

    - **第三层**：完整工作流程
        - **前提**：主库开启 `log_bin`（`5.7` 默认不开，需显式开启）；各节点 `server_id` 唯一；复制账号需 `REPLICATION SLAVE` 权限
        - **建立复制（5.7 语法）** ：
            ```sql
            CHANGE MASTER TO
            MASTER_HOST='主库IP', MASTER_PORT=3306,
            MASTER_USER='repl', MASTER_PASSWORD='密码',
            MASTER_LOG_FILE='mysql-bin.000123', MASTER_LOG_POS=154;
            START SLAVE;
            SHOW SLAVE STATUS\G    -- 看 Slave_IO_Running / Slave_SQL_Running / Seconds_Behind_Master
            ```

        - **运行**：`I/O` 线程按指定位置（文件+偏移或 `GTID`）请求 → `dump` 线程发送 → 写入 `relay log` → `SQL` 线程重放 → 持续记录已执行位置，断点续传
        - **`GTID` 复制（`5.6+`）** ：`gtid_mode` 默认 `OFF` 需显式开启，配 `MASTER_AUTO_POSITION=1`，按全局事务标识自动定位，比"文件+位置"可靠

    - **第四层**：复制模式与延迟
        - **默认异步**：主库提交不等从库确认——性能好，但主库崩溃时已提交未传到从库的事务会丢
        - **半同步（5.5+ 官方插件，需安装）** ：主库阻塞等至少一个从库确认已把事件写入 `relay log` 并刷盘（默认 `AFTER_SYNC` 等待点），丢失窗口接近 `0`；超时自动回退异步
        - **延迟指标**：`Seconds_Behind_Master`（`SQL` 线程落后秒数）；常见原因 ——— 大事务、无主键表、从库单线程重放（`8.0.27` 前默认）、硬件/网络差异；注意"`0 值陷阱`"（网络断开未被察觉时可能显示 0）

- **协助记忆**
    - **主库像报社**：新闻（变更）先写进"底稿库"（`binlog`）；从库像地方印刷厂，两个员工分工 ——— `I/O` 线程守在报社门口把传真件收回来存档（`relay log`），`SQL` 线程照着存档重新排版印刷（重放）。报社发报不等印刷厂回话（异步）；要求"印刷厂签收传真才定稿"就是半同步，新闻就不会丢在路上
    - **口诀**：主库写 `binlog`，从库两线程 ——— `IO` 收、`SQL` 放，`relay log` 中转

- **进阶思考**
    - **异步复制为什么默认？半同步解决了什么？**
        - 异步让主库提交不等待网络往返、性能最好；代价是主库崩溃瞬间可能有已提交事务没到从库。半同步要求至少一个从库确认收到 `relay log` 才提交，丢失窗口压到接近零，但提交延迟增加，且超时会自动退回异步

    - **`Seconds_Behind_Master` 显示 `0` 就一定没延迟吗？**
        - 不一定。它是 `SQL` 线程相对主库事件时间戳的差值估算；网络断开未被 `I/O` 线程察觉、或 `I/O` 线程排队新事件时可能瞬时为 `0` 或失真，要结合从库读取位置与主库 `binlog` 位置对比判断

    - **从库能当下一级主库（级联复制）吗？**
        - 可以，需开启 `log_slave_updates`（`5.7` 默认 `OFF`；`8.0` 开启 `binlog` 后默认记录），让从库把自己重放的事务写进自己的 `binlog` 再向下游传播

    - **`relay log` 与 `binlog` 格式一致为什么重要？**
        - 级联复制、以及 `MHA` 等切换工具"从各从库补齐 `relay log` 再提升新主"都依赖同一套事件格式，能无缝衔接

## 🤔 MySQL 主从同步延迟原因及解决方法？
- **主从延迟的本质，是从库"重放"跟不上主库"写入"——主库并发写、从库默认串行放，差距就出来了；九成延迟源于大事务、无主键表、从库单线程这三件事，解法对应就是拆事务、加主键、开并行复制，外加别让从库又读又写。**

    - **第一层**：先判断"真的延迟了吗"
        - **`Seconds_Behind_Master`（5.7 术语）** ：`SQL` 线程落后秒数，但有失真陷阱——网络断开未被 `I/O` 线程察觉（`slave_net_timeout` 未到）时可能显示 `0`；`SQL` 线程刚追上 `I/O` 线程时瞬时大值；事件时间戳旧导致 `0` 与大值反复跳变
        - 更准的对比法：比较主库 `binlog` 位置与从库执行位置——(`Master_Log_File`, `Read_Master_Log_Pos`) 与 (`Relay_Master_Log_File`, `Exec_Master_Log_Pos`)，两对坐标拉开差距才是真延迟
        - **`pt-heartbeat（Percona Toolkit）`** ：基于实际复制数据测延迟，不依赖复制机制自身（其官方文档明示 SBM 不可靠），复制中断时也能准确报出持续落后——生产监控推荐

    - **第二层**：延迟的主要原因
        - **大事务（最典型）** ：一次更新大量行或大 `DDL`（如 `ALTER` 重建表），主库已提交、从库还在慢慢重放；且官方机制上大事务会排空并阻塞所有并行 `worker` 及后续事务（`slave_pending_jobs_size_max` 条目），影响被放大
        - **从库单线程重放**：`5.7` 默认 `slave_parallel_workers=0` 单线程，主库并发写一多就跟不上
        - **无主键/无唯一键表**：`ROW` 格式下从库重放无法索引点查，退化为哈希定位/全表扫描；官方明示无主键表对并行复制从库的负面影响更大
        - **从库又读又写**：读写分离场景从库承担业务读，`CPU/IO` 与重放争抢（实践共识）
        - **硬件/网络差距**：主从机器配置不一致（`SSD vs HDD`）、跨机房带宽小导致 `I/O` 线程拉取慢（实践共识）
        - **大字段与日志体积**：`ROW` 格式 `binlog` 体积大、`BLOB/TEXT` 重放开销高（实践共识；`8.0.20+` 可用 `binlog` 事务压缩缓解）
        - **从库自身锁等待**：从库的慢查询/死锁触发 `slave_transaction_retries` 自动重试（默认 `10` 次），期间复制阻塞（官方机制）

    - **第三层**：解决方法
        - **拆大事务**：分批 `DML`、控制单事务行数（同时降低锁持有与 `undo` 膨胀）；大 `DDL` 错峰或改用 `pt-osc` / `gh-ost` 在线改表。注意拆批失去单事务原子性，业务需接受部分提交
        - **开启并行复制（MTS）**：
            ```ini
            # 5.7（5.7.6+ 才支持 LOGICAL_CLOCK；此前只有 DATABASE 级并行）
            [mysqld]
            slave_parallel_workers = 4        # 0=单线程（默认），>0 开启并行
            slave_parallel_type = LOGICAL_CLOCK   # 按事务间并行安全度并行
            slave_preserve_commit_order = ON  # 保持提交顺序（5.7 默认 OFF）
            ```

            - **启用前提（易踩坑）** ：`5.7` 及 `8.0.26` 之前，`slave_preserve_commit_order=ON` 要求从库开启 `log_bin` + `log_slave_updates` 且 `parallel_type` 为 `LOGICAL_CLOCK`；`8.0.19` 起不再要求从库开 `binlog`
            - **并行度来源**：依赖主库 `binlog group commit`；`5.7.22+` 可配 `binlog_transaction_dependency_tracking=WRITESET` 提升并行度；级联复制并行度逐层递减
            - **局限**：`DDL`、大事务、`LOAD DATA` 不并行且会排空 `worker`；`worker` 数不是越大越好（官方明示超过某点后并发争用反而降性能）

        - **表加主键/唯一键**：`ROW` 重放从全表扫描变索引点查，收益最大且一劳永逸
        - **从库专读分流**：读请求打到只读节点，别让主从库"既当爹又当妈"；硬件对齐（`SSD`、内存）
        - **网络与部署**：同机房部署、提升带宽
        - **监控告警**：`pt-heartbeat` 采集 + 延迟阈值告警，替代不可靠的 `Seconds_Behind_Master`

- **协助记忆**
    - 主库像高速印刷机（并发出报），从库像慢速人工装订线（单线程重放）——— 机器印 `1000` 份，人工只能装订 `100` 份，积压就是延迟。三个"元凶"对应三种堵法：一次送来一大摞（大事务）装订不动、稿件没编号（无主键）找起来费劲、只派一个工人（单线程）。解法就是：拆大摞、给稿件编号、多派工人（并行复制）
    - 口诀：拆事务、加主键、开并行，从库别读写两肩挑

- **进阶思考**
    - `Seconds_Behind_Master` 是 `0`，就真的不延迟吗？
        - 不一定。它是时间戳差值估算，网络断开未被察觉、`SQL` 线程刚追上 `I/O`、事件时间戳旧等场景都会失真；可靠做法是对比 `binlog` 位置或用 `pt-heartbeat` 基于实际数据测量

    - **为什么开启并行复制后反而更慢？**
        - `worker` 数不是越大越好——超过某点后线程争用（锁竞争、上下文切换）抵消并行收益；且 `DDL`/大事务/`LOAD DATA` 会排空所有 `worker`，若业务全是这类语句，并行形同虚设。另外级联从库并行度逐层递减

    - **拆大事务的代价是什么？**
        - 失去单事务原子性——拆成 `N` 批后中途失败会留下部分提交，需要业务侧有幂等/补偿机制；这是"延迟 vs 一致性"的权衡，不是无脑拆

    - **`5.7` 的并行复制为什么默认不开？**
        - 并行依赖事务间无冲突（`binlog group commit` 的并行安全判定），早于 `5.7.6` 的 `DATABASE` 级并行粒度太粗、收益有限，`LOGICAL_CLOCK` 引入后才有实用价值，但官方仍保持默认单线程以求稳妥——需要 `DBA` 按业务评估后开启


- **扩展信息**
    - **默认并行（8.0.27 起）** ：`replica_parallel_workers` 默认 `4`、`replica_preserve_commit_order` 默认 `ON`（此前默认 `0`/`OFF`），从库开箱即并行
    - **术语变更（8.0.26）** ：`slave_parallel_*` 全部更名 `replica_parallel_*`（旧名弃用为别名）；`8.0.29` 起 `replica_parallel_type` 弃用（`DATABASE` 并行将移除）；`8.0.30` 起 `replica_parallel_workers=0` 弃用（用 `1` 表示单线程）
    - **前提放宽（8.0.19）** ：`preserve_commit_order=ON` 不再要求从库开 `binlog`
    - **binlog 事务压缩（8.0.20）** ：缓解 `ROW` 格式日志体积带来的传输与重放开销
    - **注意**：`preserve_commit_order=ON` 不消除 `Exec_master_log_pos` 位置滞后；复制过滤（`binlog-do-db` 等）会破坏提交顺序保证


## 🤔 MySQL 主从复制，从库宕机 / 故障如何恢复？
- **从库宕机恢复的核心原则是：先判断故障类型（可重启 / 数据损坏 / binlog 丢失），再选择对应恢复路径，GTID 模式比传统模式更简单可靠。**

    - **第一层**：从库宕机后能正常重启（最常见）
        - **场景**：从库进程崩溃、服务器重启、网络中断等，MySQL 可以正常启动
        - **GTID 模式（推荐）** ：
            ```bash
            # 1. 启动从库
            systemctl start mysqld

            # 2. 检查复制状态
            mysql -e "SHOW SLAVE STATUS\G"

            # 3. 如果复制停止，自动跳过已执行的 GTID 事务
            mysql -e "STOP SLAVE; RESET SLAVE; START SLAVE;"
            # GTID 模式下 MySQL 会自动跳过已执行的事务，无需手动定位 binlog 位置
            ```

        - **传统模式（基于 binlog 位置）** ：
            ```bash
            # 1. 启动从库
            systemctl start mysqld

            # 2. 检查复制状态，查看 Executed_Gtid_Set 或 Relay_Master_Log_File + Exec_Master_Log_Pos
            mysql -e "SHOW SLAVE STATUS\G"

            # 3. 如果复制停止且报错（如 1062 主键冲突），跳过错误
            mysql -e "STOP SLAVE; SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1; START SLAVE;"
            # 注意：跳过错误可能导致主从不一致，仅用于临时应急

            # 4. 如果需要重新定位 binlog 位置
            mysql -e "STOP SLAVE; CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000XXX', MASTER_LOG_POS=YYY; START SLAVE;"
            ```

        - **关键检查**：
        - `Slave_IO_Running`: `Yes` — `IO` 线程正常
        - `Slave_SQL_Running`: `Yes` — `SQL` 线程正常
        - `Seconds_Behind_Master` — 复制延迟（`0` 表示同步完成）


    - **第二层**：从库数据损坏，无法启动（需要重建）
        - **场景**：磁盘故障、文件系统损坏、数据文件丢失等，MySQL 无法启动
        - **使用 xtrabackup 重建（推荐，热备份）** ：
            ```bash
            # 1. 在主库备份（不停主库）
            xtrabackup --backup --target-dir=/backup/full -u root -p

            # 2. 准备备份（应用 redo log）
            xtrabackup --prepare --target-dir=/backup/full

            # 3. 停止从库，清理数据目录
            systemctl stop mysqld
            rm -rf /var/lib/mysql/*

            # 4. 恢复备份到从库
            xtrabackup --copy-back --target-dir=/backup/full

            # 5. 修改权限
            chown -R mysql:mysql /var/lib/mysql

            # 6. 启动从库并配置复制
            systemctl start mysqld

            # GTID 模式：
            mysql -e "CHANGE MASTER TO MASTER_HOST='主库IP', MASTER_USER='repl', MASTER_PASSWORD='密码', MASTER_AUTO_POSITION=1;"
            mysql -e "START SLAVE;"

            # 传统模式（需要从备份中获取 binlog 位置）：
            # xtrabackup 备份完成后会生成 xtrabackup_binlog_info 文件，包含 binlog 文件和位置
            mysql -e "CHANGE MASTER TO MASTER_HOST='主库IP', MASTER_USER='repl', MASTER_PASSWORD='密码', MASTER_LOG_FILE='mysql-bin.000XXX', MASTER_LOG_POS=YYY;"
            mysql -e "START SLAVE;"
            ```

        - **使用 · 重建（逻辑备份，适合小数据量）** ：
            ```bash
            # 1. 在主库导出数据（包含 GTID 信息）
            mysqldump --single-transaction --routines --triggers --all-databases --master-data=2 --set-gtid-purged=ON > /backup/full.sql

            # 2. 停止从库，清理数据目录
            systemctl stop mysqld
            rm -rf /var/lib/mysql/*

            # 3. 初始化从库（如果需要）
            mysqld --initialize-insecure --user=mysql

            # 4. 启动从库
            systemctl start mysqld

            # 5. 导入数据
            mysql < /backup/full.sql

            # 6. 配置复制（GTID 模式）
            mysql -e "CHANGE MASTER TO MASTER_HOST='主库IP', MASTER_USER='repl', MASTER_PASSWORD='密码', MASTER_AUTO_POSITION=1;"
            ```

    - **第三层**：· 被清理，无法继续同步
        - **场景**：主库 `binlog` 过期被清理（`expire_logs_days`），从库需要的 `binlog` 已不存在
        - **诊断**： 在从库查看错误 `mysql -e "SHOW SLAVE STATUS\G"` ，常见错误：`1236` (`binlog not found`)
        - **解决方案**：需要全量重建从库（参考第二层的 `xtrabackup` 或 `mysqldump` 方法）
        - **预防措施**：
            ```bash
            # 在主库调整 binlog 保留时间（根据业务需求）
            # MySQL 8.0+
            mysql -e "SET GLOBAL binlog_expire_logs_seconds = 604800;"  # 7 天

            # MySQL 5.7
            mysql -e "SET GLOBAL expire_logs_days = 7;"

            # 永久配置写入 my.cnf
            # [mysqld]
            # binlog_expire_logs_seconds = 604800
            # 或
            # expire_logs_days = 7
            ```

    - **第四层**：数据一致性检查
        - **场景**：从库恢复后，需要验证主从数据是否一致
        - **使用 `pt-table-checksum`（`Percona Toolkit`）** ： `pt-table-checksum --replicate=percona.checksums h=主库IP,u=root,p=密码` 在主库执行（会自动检查主从一致性）

        - **使用 `pt-table-sync` 修复不一致（谨慎使用）** ：
            - 仅在确认不一致后使用，先 `dry-run` 查看: `pt-table-sync --print --replicate=percona.checksums h=主库IP,u=root,p=密码`
            - 确认无误后执行修复：`pt-table-sync --execute --replicate=percona.checksums h=主库IP,u=root,p=密码`

- **协助记忆**
    - 主库是总部发货中心，从库是各地分拣中心。分拣中心宕机就像分拣机器卡住了——如果只是卡住（可重启），重新启动后继续处理积压包裹；如果整个分拣中心烧毁（数据损坏），需要从总部重新调货（全量备份）；如果总部的发货记录被删了（binlog 被清理），分拣中心无法知道漏了哪些包裹，只能重新调全部货。
    - 口诀：能重启就重启，不能重启就重建，`binlog` 丢了全量来。

- **进阶思考**
    - **`GTID` 模式和传统模式最大的区别是什么？**
        - `GTID` 模式下，每个事务有全局唯一标识（`server_uuid:transaction_id`），从库自动跳过已执行的事务，无需手动定位 `binlog` 位置；传统模式需要手动指定 `MASTER_LOG_FILE` 和 `MASTER_LOG_POS`，容易出错。

    - **从库宕机期间主库写入的数据会丢失吗？**
        - 不会丢失。从库恢复后会从主库的 `binlog` 中读取宕机期间的事务并重放，直到追上主库。但如果主库 `binlog` 已被清理，则需要全量重建。

    - **如何避免从库长时间延迟？**
        1. 使用并行复制（`slave_parallel_workers`）；
        2. 从库硬件配置不低于主库；
        3. 监控 `Seconds_Behind_Master`，及时发现延迟；
        4. 避免在从库执行大事务或复杂查询。

    - **从库可以提升为主库吗？**
        - 可以。在主库故障时，可以将从库提升为主库（需要应用层切换或使用 `MHA/Orchestrator` 等工具自动故障转移）。GTID 模式下切换更简单，因为不需要记录 `binlog` 位置。

## 🤔 MHA 集群实现原理？
- **MHA 是一套"外挂式"的 MySQL 主从复制故障自愈方案——它不碰数据本身，只干三件事：盯住主库、选出数据最新的从库、把落后的从库补平，从而把主库宕机的切换时间从人工的分钟级压到官方口径的 10~30 秒。**

    - **核心定位**
        - **是什么**：`MHA`（`Master High Availability`）是 `Yoshinori Matsunobu`开发的开源主库高可用方案。
        - **前提**：跑在 `MySQL` 传统主从复制（异步/半同步）之上，本身不存储、不转发、不改数据，只负责"监控 + 自动切换"。
        - **定位边界**：它解决"主库挂了谁来接管"，不解决"复制本身的数据一致性"。
        - **现状**：已停止维护（最后 `release v0.58` 之后无官方更新），但仍是 `5.x` 时代运维面试的高频考点。

    - **架构组件（两件套）**
        - **`MHA Manager`（管理节点）** ：独立部署在一台监控机上，负责故障检测、选主、协调切换、调用脚本。核心脚本如 `masterha_check_repl`（检查复制状态）、`masterha_manager`（常驻监控进程）、`masterha_master_switch`（切换命令）。
        - **`MHA Node`（数据节点）** ：部署在每台 `MySQL` 服务器（主+从）上，提供四个关键脚本：
            - **`apply_diff_relay_logs`**：把"数据最新的从库"`relay log` 中、落后从库缺失的事件，应用给落后从库（补平从库差异）。
            - **`save_binary_logs`**：抢救崩溃主库的 `binlog`（若主库 `SSH` 可达），补回"已提交但尚未同步"的事务。
            - **`filter_mysqlbinlog`**：配合 `mysqlbinlog` 过滤、提取差异 `binlog` 事件。
            - **`purge_relay_logs`**：清理 `relay log`，防止无限增长。

        - **通信方式**：`Manager` 通过 `SSH` 免密登录各 `MySQL` 服务器，远程执行 `Node` 脚本。

    - **故障切换流程（核心四步）**
        - **故障检测**：`Manager` 周期性探测主库（默认每 `3` 秒执行一次 `SELECT` 探测），连续失败判定主库宕机；可配置 `secondary_check_script` 做二次确认，避免网络抖动误判。
        - **选新主**：比较各从库 `relay log` 的最新位置（`Read_Master_Log_Pos`，即最新收到的 `binlog` 位置），选出"数据最新"的从库作为新主；可用 `candidate_master=1` 指定优先候选、`no_master=1` 排除；`0.56` 起支持基于 `GTID` 的选主（更精确）。
        - **数据补偿（双向，MHA 的核心价值）** ：
            - **落后从库 ← 最新从库（新主）**：`apply_diff_relay_logs` 让所有从库数据对齐。
            - **新主 ← 崩溃主库**：`save_binary_logs` 抢救主库 `binlog`，把异步复制下"已提交未同步"的事务补回新主，尽量少丢数据——这是它比"随便挑个从库切换"高明的地方。

        - **切换**：其余从库 `CHANGE MASTER` 指向新主并 `START SLAVE`；触发 `master_ip_failover_script` 做 `VIP` 漂移/应用指向切换（`MHA` 只留扩展点，`VIP` 脚本需用户自写，通常配合 `keepalived`）。

    - **关键机制与边界**
        - **在线切换**：`masterha_master_switch --master_state=alive` 用于计划内主从切换，写阻塞仅 `0.5~2` 秒（`FLUSH TABLES WITH READ LOCK` → 等从库追平 → 切换），无数据丢失。
        - **防脑裂**：切换前用 `shutdown_script` 强制隔离/关机旧主，避免出现双主。
        - **拓扑边界**：单套集群是"一主多从"，不支持多主同时写入（但一个 Manager 可同时监控多套主从集群）。
        - **一致性边界**：异步复制仍可能丢已提交事务，半同步复制可显著减少；MHA 保证的是"从库之间最终一致 + 尽量少丢"。

- **协助记忆**
    - `MHA` 像大楼的备用发电机 + 自动切换开关——平时只盯主电表（主库），主电一断（主库宕机），立刻选一台电量最满的备用机（数据最新的从库）顶上，再把其他备用机的电量补平。
    - 口诀 ：盯主库、选新主、补差异、切 VIP。

- **进阶思考**
    - **为什么 MHA 能比普通"手动切换"少丢数据？**
        - 靠 `save_binary_logs` 抢救崩溃主库 `binlog + apply_diff_relay_logs` 补平从库差异，把异步复制下"已提交但还没同步"的事务尽量找回来；手动切换往往直接放弃这些事务。

    - **`MHA` 与 `MySQL 8.0` 的 `MGR` / `InnoDB Cluster` 本质区别？**
        - `MHA` 是"外挂式"——数据复制仍靠传统 `binlog` 主从，`MHA` 只做监控与切换；`MGR` 是"内建式"——通过 `Paxos` 协议在存储层实现多节点数据一致性，不依赖外部脚本与 `SSH`。


- **扩展信息**
    - 8.x 演进方向：MHA 主要适配 5.5/5.6/5.7 时代；8.x 场景下官方与社区多转向 MySQL Group Replication（MGR）、InnoDB Cluster、Orchestrator、ProxySQL + keepalived 等，可作为面试的迁移延伸点。

## 🤔 MGR 集群工作原理？
- **`MGR`（`MySQL Group Replication`）是 `MySQL` 官方的"多数派共识复制"——事务提交前把写集合广播给组，靠 `Paxos（XCom）`全局排序 + 多数派投票认证后才提交，用"少数服从多数"换来已提交数据零丢失（`RPO=0`），而代价是默认只保证最终一致、且对网络延迟敏感。**
    - **定位与架构**
        - **是什么**：官方提供的插件式高可用复制方案，底层核心是 `XCom`（`Paxos` 协议变体）实现的组通信引擎（`GCS`），对事务做全局排序和一致性决策。
        - **版本脉络**：`5.7.17` 引入（`GA`），`8.0` 成为官方主线；`5.7` 已结束官方支持（`EOL`），生产新部署以 `8.0` 为主，但存量 `5.7` 面试仍高频。
        - **组（Group）** ：一组互为成员的 `MySQL` 实例，上限 `9` 个成员；成员加入/退出、视图变更（`view change`）、组重配置全部自动完成。
        - **与 `InnoDB Cluster` 的关系**：`MGR` 本身不含客户端故障切换能力，官方 `HA` 栈是 `InnoDB Cluster = MySQL Shell` 管理 `MGR + MySQL Router` 路由（`8.0` 起，`5.7` 无法组建）。

    - **两种模式**
        - **单主模式（`single-primary`，默认）** ：只有 `primary` 可写，其余为 `secondary` 只读；`primary` 故障自动选举新 `primary`（`group_replication_single_primary_mode` 默认 `ON`）。
        - **多主模式（`multi-primary`）** ：所有成员均可写，靠认证（`certification`）做行级冲突检测，冲突事务回滚。

    - **工作流程（三步）**
        - **本地执行**：事务在发起成员上先本地执行，但不立即提交。
        - **广播 + 全序**：到达"`ready to commit`"时，把写集合（`write set`，被更新行的主键哈希）+ 变更行原子广播给组；`XCom/Paxos` 对事务做全局总排序（`total order`） ，保证所有成员看到一致的顺序。
        - **认证 + 提交**：认证（`certification`）在行级比较并发事务的写集合——单主模式天然无冲突；多主模式下后提交且写集冲突者回滚（"`distributed first commit wins`"）。认证通过后各成员按同一顺序应用并提交。

    - **一致性与容错**
        - **一致性级别（易错点）** ：`MGR` 默认是最终一致（`EVENTUAL`） ，不是强一致。强一致需显式配置 `group_replication_consistency`（`8.0.14` 起，取值 `BEFORE` / `AFTER` / `BEFORE_AND_AFTER`，由弱到强）。
        - **多数派（`quorum`）** ：组容错公式 `n = 2f+1`，超过半数成员存活才能达成决策；已提交事务在多数派存活时零丢失（`RPO=0`） 。
        - **防脑裂（易错点）** ：网络分区时少数派默认不会"自动退出"，而是无限等待 （`group_replication_unreachable_majority_timeout=0`）—— 它无法凑够多数、被阻塞无法推进，从而防脑裂；只有显式设置超时后少数派才进入 `ERROR`/退出。
        - **故障检测与选主**：成员故障检测 → 视图变更 → 组重配置 → 单主模式自动选主，全自动；选主权重用 `group_replication_member_weight`（8.0.12 起）。
        - **流控（flow control）** ：`group_replication_flow_control_mode=QUOTA`，按应用/认证队列阈值（各默认 `25000` 事务）限流，防止慢成员堆积拖垮全组。

    - **关键参数（5.7 语义为主）**
        - **`group_replication_group_name`**：组名，必须是有效 `UUID`。
        - **`group_replication_local_address / group_replication_group_seeds`**：本成员地址 / 组内种子地址。
        - **`group_replication_bootstrap_group=ON`**：首次引导组。
        - **`group_replication_single_primary_mode`**：单主模式开关（默认 ON）。
        - **`transaction_write_set_extraction`**：写集合提取算法（`XXHASH64`），注意它是 `replication` 变量而非 `group_replication_` 前缀，且 `8.0.26` 起弃用。
        - **`group_replication_transaction_size_limit`**：事务大小上限（默认约 143MB，0 为不限）。

    - **与异步/半同步复制的本质区别**
        - **异步**：主库提交即算完成，从库异步追，可能丢已提交事务。
        - **半同步**：主库等至少一个从库确认（确认的是"已接收"，而非"已应用"）。
        - **MGR**：多数派共识，事务需经组内多数成员认证后才提交，`RPO=0`；但一致性是"多数成员一致"，并非单主库那种即时强一致。

- **协助记忆**
    - `MGR` 像议会表决——每条事务提交前都要发给组内成员"投票"，过半数同意才生效；谁先提交谁赢，冲突的提案被打回重来，少数派意见（数据）不生效。
    - 口诀 ：提交前广播、全序排好队、多数派认证、冲突就回滚。

- **进阶思考**
    - **为什么说 MGR"零丢失"却又是"最终一致"，不矛盾吗？**
        - 不矛盾。零丢失指 ·——已提交事务在多数派存活时不会丢；最终一致指各成员看到新数据的时间点可能不同（无实时读一致性），读强一致需配置 `group_replication_consistency=BEFORE/AFTER`。

    - **MGR 与上一题 MHA 的根本区别？**
        - `MHA` 是"外挂式"——数据仍靠 `binlog` 主从，`MHA` 只监控+切换，异步下可能丢数据；MGR 是"内建式"——数据一致性由 Paxos 共识在存储层保证，自动选主且`RPO=0`，但强绑定 `MySQL` 版本、需官方插件与组通信网络。

- **扩展信息**
    - **8.0 增强点**：`group_replication_consistency` 一致性级别（`8.0.14`）、选主权重 `group_replication_member_weight`（`8.0.12`）、在线切换单主/多主（`8.0.16`）、`group_replication_paxos_single_leader` 单共识领导者（`8.0.27`）、消息压缩与分片、`InnoDB Cluster` + `MySQL Router` 组成官方 `HA` 栈。


## 🤔 InnoDB Cluster 集群的工作原理？
- `InnoDB Cluster` 是把「强一致复制 + 自动化管理 + 透明路由」三件事焊成的一个整体——对外像一台会自己切换的 `MySQL`，对内靠 `Group Replication` 的共识协议保证切换时已提交事务一条不丢。

    - **第一层**：它是什么——三件套各司其职
        - **`Group Replication`（数据面）** ：负责数据复制和自动故障转移，是集群的"心脏"
        - **`MySQL Shell`（管理面）** ：通过 `AdminAPI`（`dba.createCluster()` 等）一键建集群、加节点、改配置、看状态，把繁琐的手工配置封装成几行命令
        - **`MySQL Router`（接入面）** ：应用不直连后端节点，而是连 `Router`；`Router` 自动把读写路由到正确节点，节点切换对应用透明

    - **第二层**：数据怎么保持一致 —— `Group Replication` 的共识原理
        - **共识协议**：基于 `Paxos` 共识协议的变体，由 `XCom` 组通信引擎承载，保证事务在组内以全局一致顺序提交，所有节点最终落到同一份数据
        - **写集合认证（`certification`）** ：事务执行后、提交前，其 `write-set` 广播到组内做冲突检测；单主模式下写都来自 `PRIMARY`、天然有序，多主模式靠它回滚并发写冲突
        - **强约束**：强制开启 `GTID`（`gtid_mode=ON + enforce_gtid_consistency=ON`），这是共识复制能对齐事务身份的前提

    - **第三层**：故障怎么自动切换
        - **多数派（quorum）存活才继续服务**：节点宕机导致失去多数派时，组整体停止接受写——这是防脑裂的关键，保证任何时刻最多一个 `PRIMARY` 在写，杜绝"两边各自以为自己是主"
        - **自动选主**：`PRIMARY` 失效后，组内基于共识协议自动选举新 `PRIMARY`，无需人工介入
        - **`Router` 无感知路由**：`Router` 读元数据感知拓扑变化，把读写流量自动切到新 `PRIMARY`，应用侧连接串不变

    - **第四层**：两种部署模式
        - **单主（`single-primary`，默认推荐）** ：一个 `PRIMARY` 读写，其余 `SECONDARY` 只读，运维最简单
        - **多主（`multi-primary`，可选）** ：所有节点均可写，靠冲突检测回滚冲突事务，需要应用层配合处理写冲突，仅适合少数场景

- **协助记忆**
    - `Router` 是总机，永远把电话转给当前值班的主接线员，主接线员倒下马上换人顶上；三个人记的是同一本账（共识协议），所以换人不丢账目、不记错账。
    - 口诀 ：`Replication` 记账、`Shell` 排班、`Router` 转接。

- **进阶思考**
    - **为什么必须"多数派存活"才能切换？**
        - 防脑裂。若少数派就能自行选主继续写，网络分区时会同时出现两个 `PRIMARY`、两边各写各的，数据分叉无法收敛；要求多数派才能形成 `quorum`，就从数学上保证同一时刻至多一个主。

    - **它比"传统主从（异步/半同步）+ MHA"强在哪？**
        - 异步主从切换存在丢已提交事务的窗口，`MHA` 要靠补齐 `relay log` 来缩小；而 `Group Replication` 下已提交事务在多数派节点上均已落盘，切换不丢数据，且 `Router` 让切换对应用完全透明，不用改连接、不用脚本漂 `VIP`。

- **扩展信息**
    - **版本要点**：`Group Replication` 自 `5.7.17 GA`，`InnoDB Cluster` 自此即可用——并非 `8.0` 专属，`5.7.17+` 配合 `MySQL Shell` 同样能组；`8.0` 的 `Clone` 插件（`8.0.17+`）让新节点从备份恢复改为物理克隆，加节点更快、更简单
    - **`InnoDB ReplicaSet`**：基于异步复制的轻量单主方案，无自动故障转移（需手动/脚本切换），适合不想上共识复制、追求简单的场景
    - **`InnoDB ClusterSet`**：多个 `InnoDB Cluster` 组成的跨地域容灾（`8.0.27` 引入），提供地域级故障转移，是"集群的集群"


## 🤔 MySQL 如何实现读写分离？
- **读写分离的本质是"主从复制打底 + 一个分流器"——MySQL 本身不提供自动读写分离，必须靠外部组件（中间件/应用代码）把写路由到主库、读路由到从库，从而用一堆从库分摊读压力、实现读水平扩展。**
    - **核心定位**
        - **`MySQL` 不内置读写分离**：官方手册明确，写要发往主库（`source`）、读可发往主库或从库（`replica`），具体分流需在数据库访问层自行做抽象。
        - **数据基础是主从复制**：主库写、从库异步/半同步追平，读写分离才成立；复制断了，分离就没有意义。
        - **前提是"主写从读"拓扑**：经典一主多从，读多写少的业务才能明显受益。

    - **三层实现方式**
        - **应用代码层**：应用内维护多数据源，按 `SQL` 类型手写路由（写走主、读走从），或封装 `safe_writer_connect` / `reader` 包装器。灵活但侵入业务代码、维护成本高。
        - **中间件/代理层（最常见）** ：在应用与数据库之间放一个代理，应用无感知——这是生产主流方案。
        - **驱动/连接池层**：如 `ShardingSphere-JDBC` 以客户端库形式嵌入应用，配合连接池做多数据源切换。

    - **主流中间件方案**
        - **`ProxySQL`（`5.x` 时代首选，讲解主线）** ：高性能 `MySQL` 代理，核心是两层配置：
            - `mysql_servers` 定义 `hostgroup`（后端逻辑分组，如 0=写组、1=读组），并靠 `monitor` 探测各节点 `read_only` 状态自动维护读写组归属。
            - `mysql_query_rules` 按正则匹配 `SQL`（如 `^SELECT` → `读组`、`^SELECT ... FOR UPDATE`/写语句→写组），`destination_hostgroup` 指定去向；同时提供连接复用、查询结果缓存、读写一致性跟踪。
        - **`Atlas`**：`360` 开源，基于 `MySQL-Proxy 0.8.2`，提供读写分离 + 分表，多年无更新（社区共识已停更，生产慎用）。
        - **`Mycat / ShardingSphere`**：定位偏向"分库分表 + 读写分离"，读写分离是附带能力；`ShardingSphere` 有 `JDBC` 客户端与 `Proxy` 代理两种形态。
        - **`MaxScale`**：`MariaDB` 的代理，`readwritesplit` 路由器可对接 `MySQL` 主从，但其高级一致性功能（`causal_reads`、`sync_transaction`）偏 `MariaDB`，对 `MySQL` 支持弱于 `MariaDB`。

    - **关键机制（以 ProxySQL 为例）**
        - **路由规则**：`mysql_query_rules` 按 `match_pattern` 正则 + `destination_hostgroup` 把 `SQL` 分到读写组。
        - **自动故障感知**：`monitor` 模块持续探测主从状态，主库挂了能把读流量切到新主、剔除延迟过大的从库。
        - **连接复用（`multiplexing`）** ：代理层复用后端连接，显著降低 MySQL 连接压力。

    - **两大难题与应对**
        - **复制延迟（主从数据不一致）** ：
            - 写后立即读 → 强制走主库（`SELECT ... FOR UPDATE`、事务内、或写后的关键读）。
            - 半同步复制减少延迟窗口。
            - 延迟监控阈值剔除：5.7 用 `SHOW SLAVE STATUS\G` 的 `Seconds_Behind_Master` 字段判断，超过阈值把该从库踢出读池。

        - **事务内读写一致性**：同一事务内所有语句必须落同一库（通常走主），否则"写后读"可能读到旧数据——中间件用规则把事务语句整体定向到写组。

- **协助记忆**
    - 主库像银行总行柜员（只能他记账），从库像一排自助查询机；大堂经理（中间件）把"取钱/存钱"（写）领到总行，把"查余额"（读）领到查询机。
    - 口诀：主从打底、中间件分流、写走主读走从、延迟读主兜底。

- **进阶思考**
    - **为什么 `ProxySQL` 能识别哪个节点是主、哪个是从？**
        - 靠 `monitor` 模块探测每个节点的 `read_only` 状态——`read_only=OFF` 判定为可写（主），`ON` 判定为只读（从），自动归入写组/读组，主从切换后无需手工改配置。

    - **`MySQL Router` 和 `ProxySQL` 的读写分离有何本质不同？**
        - `MySQL Router` 传统上做协议级/连接级路由——按服务器角色开 `rw`（写）/`ro`（读）两个端口，应用自己选端口，`Router` 不解析 `SQL`；`ProxySQL` 是解析 `SQL` 后按规则细粒度分流。注意 `MySQL Router 8.2` 起新增 `access_mode=auto` 的 `SQL` 级读写分离，传统"不解析 `SQL`"的说法仅适用 `≤8.1`。

- **扩展信息**
    - 8.x 官方方案：InnoDB Cluster（MGR）+ MySQL Router 提供官方读写分离与高可用；另有轻量的 InnoDB ReplicaSet（异步复制 + Router）。5.x 时代则以主从复制 + ProxySQL/Atlas/Mycat 等第三方中间件为主。
    - 命令版本差异：8.0.22 起 SHOW SLAVE STATUS 弃用，改为 SHOW REPLICA STATUS，延迟字段由 Seconds_Behind_Master 改为 Seconds_Behind_Source。

## 🤔 MySQL 一般会监控哪些指标？
- **监控指标无非来自三类查询——`SHOW GLOBAL STATUS`（看计数器）、`SHOW GLOBAL VARIABLES`（看配置阈值）、`SHOW SLAVE/REPLICA STATUS`（看从库复制），锁与死锁另查 `SHOW ENGINE INNODB STATUS`；把连接、吞吐、缓冲池、锁、复制五类指标查出来、算成曲线，异常就能先于用户感知。**

    - **第一层**：连接与可用性（能不能连）
        - **`Threads_connected`**：当前打开的连接数，逼近上限说明连接快打满 → `SHOW GLOBAL STATUS LIKE 'Threads_connected';`
        - **`Threads_running`**：正在执行的非睡眠线程，持续偏高说明查询堆积 → `SHOW GLOBAL STATUS LIKE 'Threads_running'`;
        - **`Threads_created`**：累计创建的连接线程数，暴涨说明连接被反复重建（创建线程有开销）→ `SHOW GLOBAL STATUS LIKE 'Threads_created'`;
        - **`Max_used_connections`**：历史峰值连接数，评估要不要调上限 → `SHOW GLOBAL STATUS LIKE 'Max_used_connections'`;
        - **`max_connections`**：连接上限（默认 151）→ `SHOW GLOBAL VARIABLES LIKE 'max_connections'`;
        - **`Aborted_connects`**：连接失败次数，增长说明有连不上 → `SHOW GLOBAL STATUS LIKE 'Aborted_connects'`;
        - **`Connection_errors_max_connections`**：因超限被拒的连接次数 → `SHOW GLOBAL STATUS LIKE 'Connection_errors_max_connections';`
        - **一键看连接类全貌**：`SHOW GLOBAL STATUS LIKE 'Threads%'`; 与 `SHOW GLOBAL STATUS LIKE 'Connection%'`;

    - **第二层**：吞吐与慢查询（快不快）
        - **`Questions`**：客户端发来的语句数，算 `QPS` 的标准口径 → `SHOW GLOBAL STATUS LIKE 'Questions';`
        - **`Com_select` / `Com_insert` / `Com_update` / `Com_delete`**：分类语句计数，算 `TPS` 与读写比 → `SHOW GLOBAL STATUS LIKE 'Com_%'`;
        - **`Slow_queries`**：超过 `long_query_time` 的查询累计数，只要超时就会 `+1`、与日志开关无关 → `SHOW GLOBAL STATUS LIKE 'Slow_queries';`
        - **`long_query_time`**：慢查询阈值（默认 10 秒）→ `SHOW GLOBAL VARIABLES LIKE 'long_query_time'`;
        - **`slow_query_log`**：慢查询日志开关（默认 OFF）→ `SHOW GLOBAL VARIABLES LIKE 'slow_query_log';`
        - **口径辨析**：`Questions` 只统计客户端语句、不含存储程序内部语句；`Queries` 则包含存储程序内语句——做 `QPS` 用 `Questions`

    - **第三层**：`InnoDB` 缓冲池与磁盘 `I/O`（资源够不够）
        - **缓冲池命中率**：(`Innodb_buffer_pool_read_requests` - `Innodb_buffer_pool_reads`) / `Innodb_buffer_pool_read_requests` × `100%`，低于 `95%` 左右要关注（经验值）→ 一条 SQL 直出：
            ```sql
            -- 5.7/8.0+
            SELECT 
            ROUND(
                (
                SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_read_requests', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) 
                - SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_reads', CAST(VARIABLE_VALUE AS UNSIGNED), 0))
                ) 
                / NULLIF(SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_read_requests', CAST(VARIABLE_VALUE AS UNSIGNED), 0)), 0) 
                * 100, 
                2
            ) AS hit_rate_pct 
            FROM performance_schema.global_status 
            WHERE VARIABLE_NAME IN ('Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads');

            -- 5.6 
            SELECT 
            ROUND(
                (
                SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_read_requests', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) 
                - SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_reads', CAST(VARIABLE_VALUE AS UNSIGNED), 0))
                ) 
                / NULLIF(SUM(IF(VARIABLE_NAME = 'Innodb_buffer_pool_read_requests', CAST(VARIABLE_VALUE AS UNSIGNED), 0)), 0) 
                * 100, 
                2
            ) AS hit_rate_pct 
            FROM information_schema.GLOBAL_STATUS 
            WHERE VARIABLE_NAME IN ('Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_reads');
            ```
        - **`Innodb_buffer_pool_pages_free`**：空闲页数，持续为 0 说明缓冲池偏小 → `SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_free'`;
        - **`Innodb_buffer_pool_pages_dity`**：脏页数，过多说明刷脏跟不上写压力 → `SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_dirty'`;
        - **`Innodb_buffer_pool_wait_free`**：等待空闲页的次数，非 0 说明缓冲池严重不足 → `SHOW GLOBAL STATUS LIKE  'Innodb_buffer_pool_wait_free'`;
        - **`Innodb_data_reads` / `Innodb_data_writes`**：数据文件读/写次数，看磁盘 I/O 压力 → `SHOW GLOBAL STATUS LIKE 'Innodb_data%';`
        - **`Innodb_log_waits`**：redo log buffer 太小、需等待刷盘的次数，非 0 影响写性能 → `SHOW GLOBAL STATUS LIKE 'Innodb_log_waits';`

    - **第四层**：锁与事务（稳不稳）
        - **`Innodb_row_lock_current_waits`**：当前正在等待行锁的数量，瞬时锁竞争 → `SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_current_waits';`
        - **`Innodb_row_lock_waits` / `Innodb_row_lock_time`**：行锁等待次数 / 累计等待毫秒，看锁竞争烈度 → `SHOW GLOBAL STATUS LIKE 'Innodb_row_lock%';`
        - **死锁现场**：`LATEST DETECTED DEADLOCK` 段给出最近一次死锁的两方与 SQL → `SHOW ENGINE INNODB STATUS\G;`
        - **`Innodb_deadlocks`**：死锁累计计数 → `SHOW GLOBAL STATUS LIKE 'Innodb_deadlocks';`（官方状态变量文档未列出，需实测确认）
        - **8.0 精确定位锁与等待**：`SELECT * FROM performance_schema.data_lock_waits;` 与 `SELECT * FROM performance_schema.data_locks;`

    - **第五层**：复制与临时对象/表缓存（从库健康）
        - **复制延迟与线程（5.7）** ：`Seconds_Behind_Master`（延迟秒数）、`Slave_IO_Running` / `Slave_SQL_Running`（两个复制线程是否正常）→ `SHOW SLAVE STATUS\G;`
        - **复制延迟与线程（8.0.22+）** ：改用 `Seconds_Behind_Source`、`Replica_IO_Running`、`Replica_SQL_Running`（旧名保留但弃用）→ `SHOW REPLICA STATUS\G;`
        - **`Created_tmp_disk_tables` / `Created_tmp_tables`**：落磁盘/全部临时表数，磁盘临时表越多说明查询吃内存 → `SHOW GLOBAL STATUS LIKE 'Created_tmp%';`
        - **`Sort_merge_passes`**：排序归并趟数，非 0 说明排序吃内存 → `SHOW GLOBAL STATUS LIKE 'Sort_merge_passes';`
        - **`Select_scan`**：全表扫描次数 → `SHOW GLOBAL STATUS LIKE 'Select_scan';`
        - **`Opened_tables`**：累计打开表数，增长过快说明表缓存偏小 → `SHOW GLOBAL STATUS LIKE 'Opened_tables';`
        - **`table_open_cache`**：表缓存大小 → `SHOW GLOBAL VARIABLES LIKE 'table_open_cache';`
        - **表缓存命中情况**：`Table_open_cache_hits` / `misses` / `overflows` → `SHOW GLOBAL STATUS LIKE 'Table_open_cache%';`

- **协助记忆**
    - MySQL 是家餐厅，监控就是盯五件事——连接看门口：Threads_connected 是"现在坐了几桌客"、max_connections 是"一共几张桌"、Aborted_connects 是"客满没位子被拒"；吞吐/慢查询看出菜：Questions 是"一天接了多少单"、Slow_queries 是"超过阈值才端上桌的慢菜有几道"；缓冲池看冷藏柜：命中率高 = "要的食材冰箱里有货，不用现跑菜市场"，Innodb_buffer_pool_reads 是"跑市场补货的次数"；锁看后厨抢锅：Innodb_row_lock_waits 是"厨师排队等同一口锅的次数"；复制延迟看分店对账：Seconds_Behind_Source 是"分店账本落后总店多少秒"。
    - 口诀（一句） ：连得上、查得快、池命中、锁不堵、复制不滞后

- **进阶思考**
    - **Q：`QPS` / `TPS` 怎么用这些计数器算出来？**
        - **计算原理**：计数器是**累计值**，必须通过**两次采样差值 ÷ 间隔秒数**算出来。
            - $\text{QPS} = \frac{\Delta\text{Questions}}{\Delta t}$
            - $\text{TPS} = \frac{\Delta(\text{Com\_commit} + \text{Com\_rollback})}{\Delta t}$


        - **做 法**： 隔 $N$ 秒执行两次 `SHOW GLOBAL STATUS LIKE ...` 获取 `Questions`、`Com_commit` 与 `Com_rollback`，相减再除以 $N$ 。  
        - **实操落地**：
            - **方式一：运维命令行（最方便，自带每秒增量）**
                ```bash
                mysqladmin -u root -p extended-status -i 5 | grep -E "Questions|Com_commit|Com_rollback"
                ```

            - **方式二**：单条 SQL 一键直出（嵌套子查询）
                ```sql
                SELECT 
                ROUND((q2 - q1) / interval_sec, 2) AS calculated_qps,
                ROUND(((c2 + r2) - (c1 + r1)) / interval_sec, 2) AS calculated_tps
                FROM (
                SELECT 
                    t1.q1, t1.c1, t1.r1,
                    5 AS interval_sec,
                    SLEEP(5) AS s,
                    MAX(IF(VARIABLE_NAME = 'Questions', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS q2,
                    MAX(IF(VARIABLE_NAME = 'Com_commit', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS c2,
                    MAX(IF(VARIABLE_NAME = 'Com_rollback', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS r2
                FROM performance_schema.global_status
                CROSS JOIN (
                    SELECT 
                    MAX(IF(VARIABLE_NAME = 'Questions', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS q1,
                    MAX(IF(VARIABLE_NAME = 'Com_commit', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS c1,
                    MAX(IF(VARIABLE_NAME = 'Com_rollback', CAST(VARIABLE_VALUE AS UNSIGNED), 0)) AS r1
                    FROM performance_schema.global_status
                    WHERE VARIABLE_NAME IN ('Questions', 'Com_commit', 'Com_rollback')
                ) t1
                WHERE VARIABLE_NAME IN ('Questions', 'Com_commit', 'Com_rollback')
                ) result;
                ```

    - **缓冲池命中率是不是低了就要扩容？**
        - 不一定。冷数据首次访问必然 miss，命中率低不等于异常；看趋势比看绝对值更有意义——持续下滑才说明热数据装不下了，配合 wait_free 与磁盘 I/O 一起判断。

- **扩展信息**
    - 按 SQL 指纹看延迟：`SELECT DIGEST_TEXT, COUNT_STAR, ROUND(AVG_TIMER_WAIT/1e12,3) AS avg_sec FROM performance_schema.events_statements_summary_by_digest ORDER BY SUM_TIMER_WAIT DESC LIMIT 10`;
    - 8.0 相比 5.7 的监控变化：Query cache 已移除（Qcache_* 变量消失）；SLAVE→REPLICA、MASTER→SOURCE 术语改名（8.0.22）；新增 Innodb_redo_log_* 等监控量；information_schema.INNODB_LOCKS/INNODB_LOCK_WAITS 由 performance_schema.data_locks/data_lock_waits 取代


## 🤔 MySQL 数据库与 NoSQL 数据库有什么区别与适用场景？
- **MySQL（关系型）靠「固定表结构 + 强一致事务」换来数据的严谨可靠，NoSQL 靠「灵活结构 + 最终一致」换来海量数据下的水平扩展与高吞吐——选谁，取决于你的数据要「准」还是要「快和广」。**
    - **第一层**：数据模型差异（结构固定 vs 结构灵活）
        - **`MySQL`**：关系模型，建表时就要预先定义字段和类型（schema 固定），改表结构需 `ALTER`，有一定成本
        - **`NoSQL`**：键值 / 文档 / 宽列 / 图等多种模型，`schema` 灵活——尤其文档型（`MongoDB`）可随时给文档加字段，不用预先规划
        - **边界提醒**：`MySQL 8.0` 引入 `JSON` 类型与 `Document Store`，官方定位 `schema-less`, `schema-flexible`，有一定文档型能力，两者界限已部分模糊

    - **第二层**：事务与一致性差异（ACID vs BASE）
        - **`MySQL`**：靠 `InnoDB` 事务保证 `ACID`——原子性（Atomicity）、一致性（Consistency）、隔离性（Isolation）、持久性（Durability），是强一致：事务要么全做、要么全不做，读到的都是已提交的确定状态
        - **`NoSQL`**：多数走 `BASE`——基本可用（Basically Available）、软状态（Soft state）、最终一致（Eventually consistent）：允许短暂不一致，过一段时间自动收敛，换取更高性能和可用性

    - **第三层**：扩展方式差异（垂直 vs 水平）
        - **`MySQL`**：传统以垂直扩展为主（给单机加 CPU / 内存 / 磁盘）；水平扩展要靠分库分表、读写分离、中间件，非原生内置，架构复杂度高
        - **`NoSQL`**：天生为水平扩展 / 自动分片设计，数据自动分布到多节点，加节点就能扩容量和吞吐

    - **第四层**：查询能力差异（SQL 强关联 vs 按 key 取）
        - **`MySQL`**：标准 `SQL`，支持复杂 `JOIN`、聚合、子查询、外键约束、事务回滚——关联查询能力强
        - **`NoSQL`**：查询能力因类型而异，键值型只能按 key 查；文档型有查询语言但 JOIN / 跨集合关联弱；多数不支持复杂事务

    - **第五层**：CAP 视角（准确版）
        - **`CAP` 三要素**：一致性（Consistency）、可用性（Availability）、分区容错性（Partition tolerance）
        - 准确表述：网络分区（P）在分布式下无法回避、必须保证；分区发生时，系统只能在 C 和 A 之间取舍——MySQL 主从切换偏 C（宁可不服务也不返回不一致），`Cassandra` 类偏 A（宁可短暂不一致也要继续服务）
        - 注意"`CAP` 只能三选二"是易误导的简化：无分区时，三者本可同时满足

    - **适用场景**
        - **选 `MySQL`**：需要强一致事务、复杂关联查询、数据关系明确的业务——金融交易、订单账户、库存扣减、ERP/CRM 等
        - **选 `NoSQL`**：海量高并发读写、结构多变、低延迟——缓存（Redis）、日志/内容/文档（MongoDB）、宽表/时序（Cassandra、HBase）、社交关系图谱（Neo4j）

- **协助记忆**
    - `MySQL` 是银行账本——格式固定、每一笔都要核对（ACID）、能查复杂对账（JOIN），改格式得停业（DDL）；NoSQL 是便利贴墙——随手写、随便贴、想加哪贴哪（灵活 schema）、贴满一面墙再开一面（水平扩展），但别指望它做严谨的总账核对（弱一致、无复杂 JOIN）。
    - 口诀：关系型求"准"，NoSQL 求"快和广"。

- **进阶思考**
    - **`CAP` 定理是不是"只能三选二"？**
        - 不准确。P（分区容错）在分布式下必须保证，没有选择的余地；真正要权衡的是分区发生时在 C 和 A 之间二选一。无分区时三者可以同时满足，所以"三选二"是个容易误导的简化说法。

- **扩展信息**
    - NoSQL 四大类及代表：键值（Redis、Memcached）、文档（MongoDB）、宽列（Cassandra、HBase）、图（Neo4j）
    - NewSQL——第三条路：既要关系型 ACID 强一致、又要分布式水平扩展的代表（CockroachDB、TiDB、Spanner、YugabyteDB、VoltDB），填补了"传统单机 MySQL 难水平扩展、NoSQL 又没强事务"的中间地带

## 🤔 TB 级数据库怎么在线迁移？
- **在线迁移的本质是"全量打底 + 增量追平 + 一致性校验 + 短暂停写切换（反向兜底）"——把要跑数小时甚至数天的大库拷贝，压缩成秒级到分钟级的切换窗口，让业务近零停机。它的方法论对各类数据库通用，下面以生产主流的 MySQL（5.7 为主、8.0 为扩展）落地说明。**
    - **第一层**：四步主线（迁移的骨架）
        - **全量打底**：先把存量数据搬到新库，这是最耗时的一步。
            - **物理热备（快，适合 TB 级）**：`XtraBackup`（`2.4.x` 支持 `MySQL 5.1~5.7`，`8.0.x` 支持 `8.0`，两者不可交叉混用）、`MySQL Clone Plugin`（仅 `8.0.17+` 内置，`5.7` 无此能力）。
            - **逻辑导出（慢但跨版本/跨平台通用）**：`mysqldump --single-transaction`、`mydumper` 并行导出。
            - **关键**：全量备份必须同时保留一致性位点，这是下一步增量追平的起点——`XtraBackup` 看备份目录里的 `xtrabackup_binlog_info，mysqldump` 加 `--master-data=2`（`8.0` 为 `--source-data=2`），`Clone` 自带复制坐标。

        - **增量追平**：新库作为从库，从全量备份记录的那个位点起持续 `apply` 源库 `binlog`，追平迁移期间源源不断产生的新写入。
            - 用 `GTID`（`5.6` 引入，默认关闭、需手动开启）可让位点追踪、主从切换、断点续传更可靠；不用 `GTID` 就靠 `file+pos` 二进制位点。

        - **一致性校验**：用 `pt-table-checksum` 按 `chunk` 计算校验和、经复制链路下发到新库比对，发现差异后用 `pt-table-sync` 修复。注意它依赖复制拓扑（不直接连两库拉数据比对），所以适合放在"新库仍是源库从库"这个阶段做。
        - **切换与回滚**：短暂停写 → 追平最后一段 `binlog` → 切应用流量 → 反向建立同步兜底。反向同步同样要用 GTID/位点锚定，否则回滚时新库新增的写入无法准确回灌源库。

    - **第二层**：工具怎么选
        - **物理迁移**（文件级拷贝，快，要求同大版本同平台）：`XtraBackup`、`Clone Plugin`——`TB` 级首选。
        - **逻辑迁移**（经过 SQL 导出/导入，慢，但跨版本、跨平台通用）：`mysqldump`、`mydumper`。
        - **在线表结构变更**（`gh-ost` / `pt-online-schema-change`）：两者同源点是"影子表 + 增量拷贝 + 变更捕获 + 原子切换"，但变更捕获机制不同——gh-ost 用 binlog 回放（无触发器），pt-osc 用触发器（triggers）。
        - **一致性校验**：`pt-table-checksum`（校验）/ `pt-table-sync`（修复）。

    - **第三层**：几个容易踩的坑（边界与前提）
        - **为什么必须"追平再切"**：TB 级全量拷贝要数小时到数天，期间业务写入不能停，只能靠复制追增量，最后把停写窗口压到秒/分钟级。裸导出后再一次性导入，追不上期间的写入，就会丢数据。
        - **`--single-transaction` 的边界**：它只对事务表（InnoDB 等） 保证一致性快照；MyISAM/MEMORY 等非事务表 dump 期间仍可能变化，且默认仍会被 --lock-tables 锁表。
        - **版本前提**：`Clone Plugin` 仅 `8.0.17+`；`XtraBackup 2.4` 系列已停止维护（EOL），运维 `5.7` 时需要自行兜底。
        - `binlog_format=ROW` 更友好：`ROW` 格式对 `gh-ost`、`pt-table-checksum` 等工具更可靠（5.7.7 起及 8.0 默认均为 ROW）。
        - **切换前最终确认**：切流量前再做一次一致性校验，确认增量已追平、数据一致，再执行切换。

- **协助记忆**
    - 白天把大件家具（存量数据）慢慢搬进新家，期间新买的东西（增量写入）记在清单上；深夜清点完最后一批、确认件数一致，换掉门牌号（切流量）——住户几乎无感，搬错了还能照着清单搬回来。
    - 口诀：全量打底、增量追平、校验切换、反向兜底。

- **协助记忆**
    - 把一本还在不停记账的旧账本誊抄成新账本 —— 先整本抄完存量；旧账本每多记一笔，就照着它的流水号补抄一笔（增量追平 ）；追到只差最后几笔时，让记账的人停几秒，抄完收尾并逐笔对账（校验）；然后大家改看新账本（切换）；发现抄错了，把流水续回旧账本就能回退（兜底）。
    - **口诀（一句）**：全量打底、增量追平、校验切换、反向兜底。

- **进阶思考**
    - **TB 级库为什么不能 mysqldump 一把梭？**
        - `mysqldump` 是逻辑导出+导入，数据要经过 `SQL` 解析再执行，单线程慢、易中断，`TB` 级可能跑几天，且非事务表有锁风险；物理工具是文件级拷贝，快一个数量级，才是大库首选。

    - **5.7 和 8.0 迁移工具差在哪？**
        - `5.7` 无 `Clone Plugin`，物理迁移主要靠 `XtraBackup 2.4`（已 EOL，需自行兜底）；`8.0.17+` 官方内置 `Clone Plugin` 可做本地/远程物理克隆且自带复制坐标。另外 `5.7` 默认 `log_bin` 关闭、迁移前要先开启 `binlog`，`8.0` 默认开启。


- **扩展信息**
    - **方法论通用性**：这套"全量 + 增量追平 + 校验 + 切换"的骨架对其他数据库同样成立，只是工具换成对应生态——如 `PostgreSQL` 用 `pg_basebackup`/`pg_dump` + 逻辑复制或物理复制、`pglogical` 做跨版本在线迁移。
    - 同源异构/跨库：MySQL 迁到其他库（或反之）无法用物理/复制方案时，走逻辑导出 + 目标端并行导入 + 数据校验，必要时用消息队列做双写过渡


## 🤔 MySQL 数据库分库分表分区的作用？
- **三者都是给"膨胀的数据"分块，但层级完全不同：分区是单表内部切、MySQL 原生、应用无感；分表是拆成多张物理表、分库是摊到多个实例，后两者靠应用/中间件按分片键路由，属于数据库之外的水平扩展。**
    - **第一层**：三个概念先分清（层级与透明度不同）
        - **分区（Partition）** ：`MySQL` 原生功能，逻辑上仍是一张表，物理上按分区键切成多个分区；对应用完全透明，`SQL` 不用改，`MySQL` 自动只扫相关分区
        - **分表**：把一张大表拆成多张物理表（order_0、order_1…，同库或跨库），应用/中间件按分片键决定读写哪张表
        - **分库**：把数据分布到多个数据库实例，突破单机容量、连接数、性能上限

    - **第二层**：分区的作用与机制
        - **分区裁剪（`partition pruning`）** ：查询带分区键时，`MySQL` 只扫匹配的分区、不扫无关分区，减少扫描量
        - **快速归档清理**：`ALTER TABLE t DROP PARTITION p2022`; 或 `TRUNCATE PARTITION` 秒删整个分区，比 `DELETE` 大量行高效得多
        - **关键限制**：分区表达式中用到的所有列，必须被包含在表的每一个唯一键（含主键）里；`InnoDB` 分区表不支持外键；`5.7` 与 `8.0` 单表分区数上限均为 `8192`（含子分区）
        - **索引是本地索引**：每个分区各自维护自己的索引，不存在跨分区的全局索引（这点不同于 `Oracle` 等数据库）——所以分区裁剪后，仍要靠分区内索引快速定位行

    - **第三层**：分表的作用
        - 降低单表数据量 → B+ 树更矮、查询更快、行锁/表锁竞争更少、单表备份与 DDL 更快
        - 代价：必须按分片键路由；不带分片键的查询要扫多张表；跨表统计、分页变复杂

    - **第四层**：分库的作用
        - 突破单实例的容量、连接数、CPU/内存/磁盘 IO 瓶颈，让吞吐随实例数水平扩展
        - 代价：跨库 JOIN 困难（往往要字段冗余或应用层拼装）、分布式事务复杂（XA 或最终一致）、需要全局唯一 ID 生成、扩容时数据迁移复杂

    - **第五层**：选型时机（先分区、再分表、最后分库）
        - 单表大、查询总能带分区键 → 优先考虑分区（但要认清：分区是"减少扫描"的手段，不能替代索引）
        - 单表大到影响查询/DDL/备份 → 分表（拆小表）
        - 单实例整体到瓶颈（容量/连接/性能都扛不住）→ 分库分表（水平扩展）
        - 边界说明：分库分表不是 MySQL 官方内置功能，MySQL 也没有官方的"单表多少行"硬阈值，拆不拆要结合业务与硬件实测

- **协助记忆**
    - 分区是把一个大仓库内部划成 A/B/C 区， 门牌还是同一个、货架编号直达对应区；分表是把大仓库拆成几个独立小仓库，各存一类货；分库是把几个仓库建到不同城市，各自独立运营。
    - 口诀：分区表内切、分表拆表、分库拆库。

- **进阶思考**
    - **分区能替代索引吗？**
        - 不能。分区裁剪解决的是"少扫几个分区"，索引解决的是"分区内快速定位行"。只分区不建索引，进到目标分区后仍要全分区扫描，所以两者是互补的两个机制。

    - **分库分表后，事务和 JOIN 还能用吗？**
        - 能，但变难。跨库 JOIN 要么字段冗余、要么应用层多次查询拼装；分布式事务要么用 XA（两阶段提交，性能代价大），要么改造成最终一致（本地消息表、事务消息等）。这正是分库分表的隐藏成本。


- **扩展信息**
    - **分库分表中间件**：`ShardingSphere`（Apache 项目，Sharding-JDBC / Sharding-Proxy）、Mycat、Vitess（YouTube 开源、云原生 MySQL 集群方案）；TDSQL 是腾讯云分布式数据库产品（并非"中间件"，而是数据库服务）
    - 8.0 分区实现变化：MySQL 8.0 移除了 Server 层的通用分区，分区改由存储引擎的 native partitioning handler 原生实现，且仅 InnoDB 与 NDB 提供；5.7 与 8.0 分区数上限一致（8192）

## 🤔 国产数据库了解吗？（达梦 / OceanBase/MySQL 兼容类）
- **国产库选型其实只看一个三维坐标系——内核来源（自研 vs 开源衍生）× SQL 兼容（Oracle / MySQL / PostgreSQL 方言）× 架构（集中式 vs 分布式） 。达梦是"自研 + 集中式 + Oracle 兼容为主"，OceanBase 是"自研 + 分布式 + MySQL/Oracle 双兼容"，而"MySQL 兼容类"是"说 MySQL 方言"的一族，内核来源各不相同、不能一概而论。**
    - **第一层**：先把三个维度记住（分类的钥匙）
        - **内核来源**：自研（达梦、OceanBase、TiDB）还是基于开源衍生（GreatSQL 基于 MySQL、openGauss/KingbaseES 基于 PostgreSQL）。这是最本质的区分，决定后续的技术可控性与迭代方式。
        - **SQL 兼容**：说谁家的"方言"——Oracle、MySQL、PostgreSQL。兼容性决定应用改造成本，是信创迁移的第一道门槛。
        - **架构**：集中式（单机/共享存储，运维像传统 Oracle/MySQL）还是分布式（多节点、数据分片、多副本，运维模型完全不同）。

    - **第二层**：达梦 DM（自研集中式，Oracle 兼容为主）
        - **定位**：武汉达梦，官方口径"内核自主原创"，非 PG/MySQL 派生；主力版本 DM8，集中式为主。
        - **兼容**：以 Oracle 语法兼容为主线（主打"Oracle 无损迁移"），也具备 MySQL 兼容能力。
        - **配套**：DMDSC 共享存储集群、DMDPC 分布式计算集群，以及数据复制/异构同步工具（DMDRS 等）。
        - **场景**：党政、金融信创的主力选手，Oracle 存量系统迁移到它最顺。

    - **第三层**：`OceanBase`（自研分布式，双兼容）
        - **定位**：蚂蚁集团出品，原生分布式 Shared-Nothing，多副本一致性基于 Paxos 协议，存储引擎 LSM-Tree，已开源（Apache-2.0）。
        - **兼容**：同时提供 MySQL 模式与 Oracle 模式，一套内核两种方言。
        - **场景**：金融核心的典型代表——支付宝（蚂蚁金融）核心底层库，并曾登顶 TPC-C；适合对高可用、横向扩展、两地三中心有硬要求的业务。
        - **注意**：它不是"淘宝的底层库"，淘宝核心系统仍是 MySQL 生态，OceanBase 只在支付宝/蚂蚁金融与部分银行核心落地。

    - **第四层**：MySQL 兼容类（内核来源各异，别混为一谈）
        - **`TiDB`（自研分布式）** ：PingCAP 出品，自研内核、仅兼容 MySQL 协议/语法（不是 MySQL 衍生）；TiDB 计算层 + TiKV 存储层 + PD 调度，TiKV 用 Raft 保一致性，HTAP 定位（TiFlash 列存做分析加速），兼容 MySQL 5.7 大部分语法（8.0 兼容持续推进）。
        - **`GaussDB`（基于 PostgreSQL 衍生）** ：华为云出品，基于开源 PostgreSQL 衍生，兼容 MySQL/PostgreSQL 两种形态，共享存储存算分离，主打企业级特性。
        - **`GreatSQL`（基于 MySQL 衍生）** ：由 MySQL 官方创始人姜承尧发起，基于 MySQL 8.0 衍生，主打增强 MGR（组复制）——地理标签、仲裁节点、智能选主等，GPL 开源，可作为 MySQL/Percona 的平替。
        - **云上分布式 MySQL 兼容** ：PolarDB（阿里云，兼容 MySQL/PostgreSQL 两种形态，共享存储存算分离）、TDSQL（腾讯，分布式、MySQL 兼容为主，另有 PostgreSQL 版）。
        - **偏 `PostgreSQL/Oracle` 路线的"近亲"（不是 MySQL 兼容，但常被一起问）**：openGauss（华为开源，基于 PostgreSQL 9.2.4 派生，MulanPSL-2.0；注意它只是开源内核，华为云 GaussDB 家族还含数仓 DWS、GaussDB(for MySQL) 等多种形态）、KingbaseES（电科金仓，基于 PostgreSQL 派生，兼容 Oracle 为主，兼兼容 MySQL/SQL Server）。

- **进阶思考**
    - **面试常怎么考国产库？**
        - 常考"技术路线分类""某库的架构与兼容性""从 Oracle/MySQL 迁到国产库的方案与风险""OceanBase 与 TiDB 的异同"（都是自研分布式+MySQL 兼容，但一致性协议 Paxos vs Raft、存储 LSM-Tree vs Raft-KV、HTAP 能力不同）。

- **扩展信息**
    - **国产库全景**：除上文外还有 GaussDB（华为云，多形态家族）、openGauss、MogDB（云和恩墨，基于 openGauss）、GBase（南大通用）、GoldenDB（中兴，分布式 MySQL 兼容）、瀚高、AntDB 等；信创名录与行业案例是实际选型的重要参考。
    - 信创迁移主线：党政、金融、电信、能源等关键行业做国产化替代时，核心工作就是把存量 Oracle/DB2 迁到国产库，兼容性评估 + 数据迁移 + 应用改造 + 双轨并行是最常见的落地节奏。

## 🤔 高并发场景，MySQL 如何优化？
- **高并发优化的本质是"让 MySQL 少做无用功、把压力摊开"：先让 SQL 和索引少扫数据，再让连接与缓存复用结果，接着压榨引擎与 IO 参数，最后用读写分离、分库分表把流量分散出去——按"先 SQL 后参数、先单机后架构"的顺序推进，收益从大到小。**
    - **第一层**：SQL 与索引（最优先，收益最大）
        - **定位慢查询**：开 `slow_query_log`、设 `long_query_time`（默认 `10` 秒），再用 `EXPLAIN` 看执行计划有没有走索引、扫描行数多少
        - **建对索引**：优先覆盖索引（查询列全在索引里，回表都省了）、遵守最左前缀匹配、复合索引顺序按区分度排
        - **避免索引失效**：不在索引列上用函数、避免隐式类型转换（字符串列传数字）、避免前导模糊（`LIKE '%x'`）
        - **改 `SQL` 本身**：不用 `SELECT *`、拆大事务为小批量、`LIMIT` 深分页改成"游标/延迟关联"

    - **第二层**：连接层（复用与容纳）
        - **连接池复用**：应用侧用连接池（避免每次请求都建连、释放连接的高开销）
        - **`max_connections`**：连接上限（默认 151），按并发量合理上调，但别无脑放大
        - **`thread_cache_size`**：线程缓存，避免连接频繁创建/销毁线程（默认较小，约 9，高并发可调大）
        - **`skip_name_resolve`**：跳过 DNS 反向解析（默认 OFF，开启后连接建立更快，但权限表要用 IP 授权）

    - **第三层**：缓存与内存（少碰磁盘）
        - **`innodb_buffer_pool_size`**：缓冲池大小（默认 128MB），高并发下应设到物理内存的 50%–80%（实践共识），让热数据尽量留在内存
        - **`应用层缓存`**：用 Redis 挡热点读、缓存查询结果，大幅削减打到 MySQL 的 QPS
        - **不要用 `Query Cache`**：5.7.20 起默认关闭并标记弃用、8.0 已移除，且它粒度粗、写密集时反而拖慢，用 Redis 更可控

    - **第四层**：引擎与 IO 参数（写性能权衡）
        - `innodb_flush_log_at_trx_commit（默认 1）`：调成 2 改为每秒刷一次 redo，写性能显著提升，但宕机最多丢 1 秒已提交事务——高并发写可权衡，金融类必须保持 1
        - **`sync_binlog`**：5.7 默认 0、8.0 默认 1；调小可提性能但同样增加丢事务风险，需与上一条一起权衡
        - **`redo log` 大小**：5.7 的 `innodb_log_file_size`（默认 48MB）调大可减少 `checkpoint` 刷盘频率、缓解写抖动；8.0.30+ 改用 `innodb_redo_log_capacity`

    - **第五层**：架构层（单机扛不住后的横向扩展）
        - **读写分离**：主从复制 + 中间件（ProxySQL / MySQL Router），写走主库、读分摊到从库，是读多写少场景的第一道横向扩展
        - **分库分表**：数据按分片键摊到多个实例，突破单机容量与吞吐上限（跨库 JOIN、分布式事务是代价）
        - **削峰与异步**：消息队列把瞬时写请求削峰、异步化，缓存扛住热点读

- **协助记忆**
    - 索引是"ETC 车道"（不用每笔人工核对）、连接池是"固定开几个窗口别反复开关"、buffer pool 是"把常用找零放抽屉别老跑金库"、读写分离是"存取款分柜台"、分库分表是"多开几家分行"、消息队列是"错峰叫号"。
    - 口诀：先 SQL 后参数、先单机后架构。

- **进阶思考**
    - **`innodb_flush_log_at_trx_commit=2` 为什么不安全？**
        - 它改为每秒刷一次 `redo log`，两次刷新之间宕机，最近 1 秒内已提交的事务会丢。高并发写追求吞吐时可权衡使用；但对一致性要求高的业务（交易、账户）必须保持 1。

    - **为什么高并发优化不推荐 Query Cache？**
        - 它已弃用并被移除（5.7.20 弃用、8.0 移除），且本身有缺陷——任何一行数据变更都会失效相关缓存，写密集场景反而增加开销；用 Redis 做应用层缓存更可控、更细粒度。

- **扩展信息**
    - 5.7 与 8.0 高并发相关默认值差异：sync_binlog（5.7=0 → 8.0=1）；innodb_flush_neighbors（5.7=1 → 8.0=0，SSD 时代默认关闭邻页刷盘）；table_open_cache（5.7=2000 → 8.0=4000）；默认字符集（5.7=latin1 → 8.0=utf8mb4）；redo 参数（5.7 的 innodb_log_file_size → 8.0.30+ 的 innodb_redo_log_capacity）

## 🤔 简述 MySQL 索引及其作用？
- **索引是一份排序目录——用额外的存储空间和写入维护成本，把"全表扫描"变成"按序定位"，本质是空间换时间。**

    - **第一层**：索引是什么
        - **本质**：一种有序的数据结构，帮助 MySQL 快速定位数据，避免逐行全表扫描。
        - **结构**：`InnoDB` 官方称其为 B-tree（实现为 B+ 树变体——数据只存叶子节点、叶子之间用链表相连，故支持高效的范围查询）。此外还有哈希（Memory 引擎可建哈希索引）、全文（InnoDB 用倒排列表）、空间（R-Tree）索引。
        - **注意**：InnoDB 的"自适应哈希索引"（adaptive hash index）是内部自动机制，按访问模式对热点索引页自动建哈希以加速等值点查，不可用 DDL 手动创建，与"可建的哈希索引"要区分开。

    - **第二层**：索引的作用（为什么快）
        - **加速查询**：减少扫描行数，从 O(N) 降到按树查找。
        - **加速排序/分组**：B+ 树叶子有序，ORDER BY、GROUP BY 可顺着索引走，省去 filesort。
        - **加速 JOIN**：被驱动表走索引，避免嵌套循环全扫。
        - **保证唯一性**：唯一索引（含主键）在插入/更新时强制去重。
        - **覆盖索引免回表**：查询需要的列全在索引里，直接从索引树取结果。

    - **第三层**：索引分类
        - **按物理存储**：
            - **聚簇索引**：数据行直接存在叶子节点、按索引键物理排序。有主键时主键即聚簇索引；无主键则用第一个全列 NOT NULL 的唯一索引；都没有时 `InnoDB` 生成隐藏的 `GEN_CLUST_INDEX`（行 ID）兜底。
            - **二级索引**：非主键索引，叶子节点存的是索引键 + 主键值，不是整行数据。

        - **按逻辑/用途**：主键索引（·）、唯一索引（UNIQUE）、普通索引（INDEX）、联合索引（多列）、全文索引（FULLTEXT）、空间索引；前缀索引是对列取前缀的变体， 本质上仍属普通/唯一索引。
        - **`8.0` 扩展点（5.7 均不支持）** ：不可见索引（invisible index，8.0）、倒序索引（descending index，8.0）、函数索引（`functional key parts`，`8.0.13`）。

    - **第四层**：两个最常考的核心机制
        - **最左前缀原则**：联合索引 (a,b,c) 相当于支持 (a)、(a,b)、(a,b,c) 三种前缀的查询；跳过最左列（如单独按 b 或 c 查）就无法利用该索引做等值/范围定位。
        - **回表与覆盖索引**：二级索引先查到主键值，还要回到聚簇索引取整行，这叫回表；若查询列全部包含在索引中，则不用回表，即覆盖索引（EXP LAIN 的 Extra 会显示 Using index）。

    - **第五层**：代价与建议
        - **代价**：占用磁盘空间；INSERT/UPDATE/DELETE 需同步维护索引、写入变慢。所以索引不是越多越好。
        - **主键建议自增**：聚簇索引按主键物理排序，自增主键插入总是在末尾，通常能避免页分裂和碎片；随机主键（如 UUID）插入位置随机，容易引发页分裂与碎片（此为合理推论，方向与官方"无逻辑唯一列时建议加自增列"的推荐一致）。
        - 倒序索引注意：5.7 中 DESC 语法被解析但忽略、键值仍按升序存储；5.7 虽能反向扫描索引服务 ORDER BY ... DESC，但有一定性能代价，真正的倒序索引到 8.0 才支持。

- **协助记忆**
    - 索引像字典的拼音/部首目录——查一个字不用从头翻到尾，按目录直接翻到对应页（定位）；目录本身也占页数，而且每次新增字都要同步更新目录（空间与写入代价）。
    - 口诀：B+ 树排序、聚簇存整行、最左前缀、覆盖免回表。

- **进阶思考**
    - **为什么用 B+ 树，不用红黑树或哈希？**
        - B+ 树是多叉平衡树，矮胖、层数低，磁盘 IO 次数少，且叶子链表天然支持范围查询；哈希只支持等值、不支持范围与排序；红黑树是二叉、偏高，落盘后 IO 次数多。
    - **索引失效（用不上）有哪些常见场景？**
      - 对索引列做函数/运算、隐式类型转换、LIKE '%xx' 前导模糊、OR 两侧条件不一致、违反最左前缀、优化器认为全表扫更快（如小表或回表代价过高）等。
    - **联合索引怎么设计顺序？**
        - 把区分度高、经常被等值/范围查询、且常作为最左列的字段放前面；尽量让查询形成最左前缀，并优先设计成覆盖索引减少回表。

- **扩展信息**
    - **优化器视角**：建了索引不代表一定走索引，MySQL 优化器会估算成本（扫描行数、回表代价），覆盖索引、FORCE INDEX、统计信息（ANALYZE
      TABLE）都会影响选择。
    - **8.0 索引新特性的实用价值**：不可见索引用于"安全删索引"——先设 INVISIBLE 观察无性能影响再删；函数索引让 WHERE LOWER(col)=... 这类函数条件也能走索引。
    - **先分清几类"树"**（数据结构的基础概念）
        - **树（Tree）**：像公司组织架构图——一个根节点往下分叉，末端不再分叉的叫"叶子节点"。数据库索引、文件目录、JSON 都是树形结构。
        - **二叉树 / 二叉查找树（BST）**：每个节点最多两个分叉；"查找树"指"左小右大"——比当前节点小的放左边、大的放右边，查找就像玩猜数字，每次对半砍。
        - **红黑树**：一种自平衡二叉查找树，靠给节点标红/黑并旋转来保持左右大致等高，保证查找/插入/删除都是 O(log n)。它是内存里常用的有序结构（如 Java 的 TreeMap、C++ 的 std::map）。缺点是只有二叉、树比较高，放到磁盘上要读很多次，所以不适合做数据库索引。
        - **B 树 / B+ 树**：多叉平衡树，一个节点能装很多键、分很多叉，所以"矮胖"——同样数据量层数更少。磁盘每次按"页"读取，节点做大一点一次能读更多，减少 IO 次数，天生适合磁盘。B+ 树是 B 树的变体：数据只放叶子节点，叶子之间再用链表串起来，既能快速定位、又能顺序扫范围——MySQL InnoDB 的索引就是它。

    - **再分清"非树"的两类**
        - **哈希（Hash）/ 哈希表**：把"键"用一个函数算成一个固定位置，直接跳过去取，等值查找 O(1) 极快；但位置是"算出来的"、不保序，所以不支持范围查询和排序——这就是索引为什么不用它做主结构。
        - **倒排列表（Inverted List）**：全文索引用的结构，反着存——不是"某文档里有哪些词"，而是"每个词出现在哪些文档"，像书末的关键词索引页，搜词直接翻到对应行。
        - **R-Tree**：空间索引，把二维/多维位置（经纬度、矩形范围）组织成树，用于 GEOMETRY 地理查询。

        - **一句话串起来（选型的直觉）**
            - 磁盘要"矮胖多叉"→ 用 B+ 树（省 IO、可范围扫） ；内存要"简单保序"→ 红黑树，只要"等值点查"→ 哈希；索引落在磁盘上，所以 InnoDB 选 B+ 树，而哈希因不支持范围/排序只能作辅助（如自适应哈希、Memory 引擎的哈希索引）

    - B+ 树管磁盘范围、红黑树管内存保序、哈希管等值快查。

## 🤔 MySQL 有哪些索引类型？
- **MySQL 索引底层几乎都是 B+ 树，但换个角度能分出三类：按实现有 B+ 树 / 哈希 / 全文 / 空间，按逻辑有主键 / 唯一 / 普通 / 复合 / 前缀，按 InnoDB 存储有聚簇 / 二级——8.0 又补了降序、不可见、函数、多值一批增强索引。**

    - **第一层**：按底层实现分（引擎怎么存）
        - **B+ 树索引**：`InnoDB` 默认且最常用的结构（官方文档称 `B-tree`），支持等值、范围、排序，绝大多数索引都基于它
        - **哈希索引**：仅等值查询、O(1)，不支持范围与排序；由 `MEMORY` 引擎支持；`InnoDB` 的自适应哈希索引（AHI） 是自动维护的，不能手动创建
        - **全文索引（FULLTEXT）** ：用于 `MATCH ... AGAINST` 文本搜索，底层是倒排索引（非 B+ 树）；`InnoDB` 自 5.6 起支持（此前仅 MyISAM）
        - **空间索引（SPATIAL，R-Tree）** ：用于地理坐标等空间数据；`InnoDB` 自 5.7.5 起支持（此前仅 MyISAM）

    - **第二层**：按逻辑/功能分（怎么建）
        - **主键索引（PRIMARY KEY）** ：唯一、非空，一张表只能有一个；`InnoDB` 下它就是聚簇索引
        - **唯一索引（UNIQUE）** ：值唯一但允许 `NULL`（多个 `NULL` 不算重复）
        - **普通索引（INDEX）** ：非唯一，最常用
        - **复合索引（联合索引）** ：多列组合，遵循最左前缀原则——查询条件要命中索引最左列才能用上
        - **前缀索引**：对长字符串列只取前 N 个字符建索引，省空间，但牺牲精确性、可能增加回表
        - **覆盖索引**：不是"建"出来的索引类型，而是查询概念——查询所需的列恰好都在索引里，就无需回表

    - **第三层**：按 InnoDB 物理存储分（最要分清的一层）
        - **聚簇索引（clustered index）** ：即主键索引，叶子节点直接存整行数据，数据物理上按主键有序
        - **二级索引（secondary index）** ：主键之外的所有索引，叶子节点只存索引列 + 主键值；查非索引列时要拿主键回聚簇索引查整行，即回表

- **协助记忆**
    - 主键/聚簇索引是字典正文按拼音排序，字就印在这一页；二级索引是偏旁部首检字表，查到的是"页码"，还要翻回正文找字（回表）；覆盖索引是检字表里连读音释义都印全了，不用再翻正文。
    - 口诀：主键聚簇存整行、二级只存主键要回表。

- **进阶思考**
    - **为什么二级索引要"回表"？**
        - `InnoDB` 的数据物理上只存一份，就在聚簇索引（主键）的叶子节点里；二级索引叶子只存"索引列 + 主键"。查询要的非索引列不在二级索引里，就必须拿主键回到聚簇索引去取整行，这就是回表。覆盖索引正是为了省掉这一步。

    - **哈希索引和 B+ 树索引的本质区别？**
        - 哈希只支持等值、O(1)，不支持范围、排序、最左前缀；B+ 树支持范围与有序扫描、前缀匹配，所以是通用默认。`InnoDB` 的 `AHI` 是"自适应"的——引擎观察到频繁等值查询时自动在内存里建哈希加速，用户无法手动控制。

- **扩展信息**
    - 8.0 增强型索引（相对 5.7 的扩展） ：降序索引（descending index，8.0 起真正支持，5.7 声明 DESC 但被忽略）、不可见索引（invisible index，可用 use_invisible_indexes 临时启用）、函数索引（functional index，8.0.13，对表达式建索引）、多值索引（multi-valued index，8.0.17，索引 JSON 数组元素）
    - 相关概念：前缀索引取舍——前缀越短越省空间但选择性越低；8.0 还引入 skip scan（8.0.13，让复合索引在未命中最左列时仍有机会被用上）

## 🤔 MySQL 主从模式，如何保证强一致性？
- **MySQL 主从默认是异步复制，只能做到最终一致；要"强一致"必须付出性能/可用性代价，主流手段是半同步复制（让主库等从库确认，做到不丢数据）与组复制（多数派共识），而且一定要分清——"数据不丢"和"从库立刻读到最新"是两件独立的事。**
    - **第一层**：先看清默认——异步复制（最终一致）
        - **`MySQL` 复制默认 `asynchronous`**：主库提交事务后不等待从库确认就返回客户端，甚至官方表述比"最终一致"更弱——复制链路一旦中断，没有任何事件能保证到达从库。
        - **后果**：主库宕机可能丢已提交数据；从库因复制延迟，读到的可能是旧值。
        - **结论**：默认主从 ≠ 强一致，这是后面所有讨论的起点。

    - **第二层**：半同步复制（semi-sync）——最常用的"强一致"折中
        - **原理**：主库在提交事务时，等至少一个从库收到 binlog 事件并写入 relay log、落盘后返回 ACK，主库才把事务提交并返回客户端（5.7 默认时序是：先落 binlog → 等 ACK → 再提交）。
        - **保证**：在满足条件时做到"无损"——主库宕机时，至少一个从库已持有完整 binlog，切换后不丢已提交事务。
        - **关键参数（5.7）** ：
            - `rpl_semi_sync_master_wait_point = AFTER_SYNC`（5.7 默认；5.6 无此参数、行为即 AFTER_COMMIT）——先同步 binlog 给从库、再提交，避免 `AFTER_COMMIT` 模式"已提交但从库未收到"时切换丢数据的问题。
            - `rpl_semi_sync_master_timeout = 10000`（10s）——超时后静默降级为异步，这是"无损"被打破的最大风险点。
            - `rpl_semi_sync_master_wait_for_slave_count = 1`——等待几个从库 ACK，默认 1。

        - **边界（关键）** ：半同步保证的是"从库收到并落盘 `relay log`"，不是"从库已执行完事务"。所以它解决"不丢数据"，但不解决"从库立刻读到最新"——从库读仍可能读到旧值。
        - **注意**：5.7 插件名为 `rpl_semi_sync_master / rpl_semi_sync_slave`；8.0.26 起新增 `rpl_semi_sync_source / rpl_semi_sync_replica` 命名（旧名 deprecated 但仍可用）。

    - **第三层**：更严格——组复制 MGR（多数派共识，不是"全同步"）
        - **`MGR（Group Replication）`** ：基于 Paxos 协议，事务需多数派对全局顺序达成一致 + 认证后，各节点各自决定提交/回滚。它于 5.7.17 已 GA，8.0 主要是增强（如事务一致性级别 `group_replication_consistency`），不是"8.0 才稳定"。
        - **`Galera`（`Percona XtraDB Cluster` / `MariaDB`）** ：官方自称 `virtually synchronous`（准同步） 、基于写集合认证，也非绝对全同步——写集合广播给所有节点认证后才提交。
        - **共同点**：强一致 + 高可用，但受网络延迟影响大、写性能下降，且 MGR 不等于"全同步"（全同步的定义是"所有副本先提交、源才返回"，MGR 只要求多数派）。

    - **第四层**：要"从库读到最新"，还得显式等执行
        - **半同步/组复制保证的是"数据不丢"，不是"读一致"。要让从库读到最新已提交数据，需显式等待从库执行到位**：
            - `MASTER_POS_WAIT()`：等待从库把指定位点读取并应用完（5.x、8.0 均可用；8.0.26 起弃用，建议改用 `SOURCE_POS_WAIT()`）。
            - `WAIT_FOR_EXECUTED_GTID_SET()`：8.0 新增，等待指定 GTID 集进入 `gtid_executed`。
            - 5.7 另有 `WAIT_UNTIL_SQL_THREAD_AFTER_GTIDS()`（8.0 已弃用）。
        - 或者干脆把对一致性敏感的读强制走主库，绕开从库延迟。

- **协助记忆**
    - 默认异步像寄平信——投进邮筒（提交）就完事，不管对方收到没；半同步像寄挂号信——必须等对方签收（从库写 relay log 后 ACK）才算寄出成功，寄件人手里有凭据（不丢）；但"签收"≠"对方已读完信"（从库未必已执行完），想确认对方读完还得再打个电话问（显式等待）。
    - 口诀 ：异步是平信、半同步是挂号、组复制是多数派投票。

- **进阶思考**
    - **半同步能保证从库读到最新数据吗？**
        - 不能。它只保证从库收到并落盘 relay log，SQL 线程可能还没应用完，读从库仍可能读到旧值；要读最新必须显式等执行到位，或读主库。

    - **AFTER_SYNC 和 AFTER_COMMIT 到底差在哪？**
        - AFTER_COMMIT（5.6 行为）先提交、再等从库 ACK，存在窗口——主库已提交但从库还没收到，此时主库宕机切换会丢这批已提交事务；AFTER_SYNC（5.7 默认）先把 binlog 同步给从库、再提交，切换更"无损"。

    - **强一致是不是一定更好？**
        - 不是。等 ACK 增加写延迟，从库故障会拖住主库（靠 timeout 降级异步），强一致本质是拿性能和可用性换一致性；实际选型看业务对 RPO（丢多少）和 RTO（停多久）的容忍度。

- **扩展信息**
    - 为什么半同步"无损"也有前提：只有 AFTER_SYNC 下、从库成功 ACK、且切换目标就是那个已 ACK 的从库、原主库弃用，才真正做到不丢；一旦 timeout 触发，主库会静默退回异步，就又回到"可能丢数据"的状态——生产上要监控半同步是否被降级。
    - MGR 的一致性级别：8.0 的 group_replication_consistency 提供从 EVENTUAL 到 AFTER（BEFORE）等档位，可在"多数派一致性"之外进一步约束读一致，是多主模式下控制读写一致性的关键参数。

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-mysql%E7%BB%B4%E6%8A%A4/  

