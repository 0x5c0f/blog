# 运维常见题-Ansible自动化


## 🤔 简述 Ansible 工作架构和原理？  
- **Ansible 是"无代理（`Agentless`）"的自动化配置管理工具：控制机（`Controller`）通过 `SSH` 连接被管主机，把模块（`Module`）推送到目标执行并回收结果。核心原理：①Python 编写的控制机 ②`SSH`/agentless 传输 ③幂等性模块 ④声明式 `Playbook`。无需在目标机安装 `Agent`，使用简单、安全。**  
    - **架构组成**
        - **控制节点（Control Node）**：运行 `ansible`/`ansible-playbook` 的机器（Linux 为主），通过 `SSH` 管理目标
        - **被管节点（Managed Nodes）**：被自动化管理的主机（需要被控制机 `SSH` 访问，无需 `Agent`）
        - **Inventory（主机清单）**：定义被管主机和分组
        - **Modules（模块）**：`Ansible` 的执行单元（如 `command`、`copy`、`service`、`yum`）
        - **Playbook（剧本）**：用 `YAML` 声明式地描述要执行的任务集
        - **Plugins（插件）**：连接插件（`SSH`）、过滤器、回调等扩展

    - **工作原理（一次执行的流程）**
        ```
        1. 控制机读取 Inventory（主机列表）和 Playbook（任务定义）
        2. 通过 SSH 连接到目标主机（无需 Agent）
        3. 把要执行的模块（及参数）推送到目标
        4. 目标机执行模块（模块是幂等的）
        5. 收集执行结果并返回控制机（输出 ok/changed/failed）
        ```
    - **核心特性**
        - **无代理（`Agentless`）**：不需要目标机装 `Ansible` `Agent`，只需 `SSH`（Python 环境）
        - **幂等性（Idempotent）**：多次执行结果一致（已经是目标状态就不重复改），`Playbook` 可重复运行
        - **声明式（Declarative）**：描述"期望状态"，而非逐步命令
        - **基于 `SSH`**：安全（走 `SSH` 加密），默认推送模式无持久守护进程
        - **YAML 编排**：`Playbook` 直观易读
        - **无主节点单点**：控制机简单（不像 Puppet/Chef 的典型架构依赖中央 master）

    - **执行工具**
        - `ansible`：临时命令（`ad-hoc`），单条执行
        - `ansible-playbook`：执行 `Playbook`（定义好的任务集）
        - `ansible-doc`：查看模块文档
        - `ansible-galaxy`：管理 `Roles`（下载/创建）
        - `ansible-vault`：加密敏感数据
        - `ansible-inventory`：查看/操作 `Inventory`

- **协助记忆**
    - `Ansible` = "`SSH` + 模块 + `YAML`"：控制机通过 `SSH` 把模块推过去执行，`Playbook` 用 `YAML` 声明期望状态。
    - 关键词："无代理（`Agentless`）、幂等、声明式、基于 `SSH`"。

- **进阶思考**
    - **为什么 Ansible 是"无代理"的？相比 Puppet/Chef 有什么优势/劣势？**
        - 优势：部署简单（不用装 Agent）、安全（走 SSH）、无中央 master 依赖（控制机轻量）、上手快。劣势：每次都要传输执行（无 Agent 常驻，性能略低）、需要目标有 Python/SSH、不适合超大规模低延迟场景（Puppet/Chef 有 Agent 常驻更适合海量主机+持续收敛）。
    - **什么是"幂等性"？为什么重要？**
        - 幂等：同一操作执行多次结果相同（如"确保 nginx 已安装"——装了就不重复装）。它让 `Playbook` 可安全地重复运行（配置漂移检测），也保证"声明期望状态"而非"逐步操作"。这是配置管理工具的核心。
    - **Ansible 默认连不上目标机可能是什么原因？**
        - ①SSH 未开/端口不对 ②密钥未授权/密码错误 ③主机不可达（IP/网络）④`host_key_checking` 导致首次连接被拒 ⑤`become` 提权失败。逐项排查连接层（先在控制机手动 `ssh` 测试）。

- **扩展信息**
    - **同类工具对比**：
        - `Ansible`（无代理、`SSH`、`YAML`）、Puppet（有 `Agent`、Ruby DSL、声明式）、Chef（有 `Agent`、Ruby）、SaltStack（可代理/无代理、ZeroMQ）
    - **相关概念**：
        - ad-hoc 命令、`Module`、`Playbook`、`Role`、`Inventory`、`Facts`、`Handler`（notify）、`Vault`（加密）、Molecule（测试）

## 🤔 Ansible Inventory 是什么？  
- **Inventory（主机清单）是 Ansible 定义"管理哪些主机 + 如何分组 + 连接参数"的配置：默认是 `/etc/ansible/hosts`（INI/YAML 格式），也支持动态 `Inventory`。作用：指定被管主机、分组（便于批量管理）、定义每台主机的连接参数（IP/用户/端口）和变量。**  
    - **是什么（定义）**
        - 列出所有被管主机的清单（host 列表）
        - 可按组（group）管理（如 `web`、`db`、`app` 组）
        - 可定义主机/组的变量和连接参数
        - 类似"通讯录"：`Ansible` 根据它知道连哪些机器、怎么连、归哪组

    - **默认位置与格式**
        - 默认 `/etc/ansible/hosts` 或用 `-i <inventory>` 指定
        - 格式：INI 或 YAML
        ```ini
        # INI 格式
        [web]
        web1 ansible_host=192.168.1.10
        web2 ansible_host=192.168.1.11

        [db]
        db1 ansible_host=192.168.1.20 ansible_user=root

        [all:vars]
        ansible_user=ops
        ```
        ```yaml
        # YAML 格式
        all:
          hosts:
            web1:
              ansible_host: 192.168.1.10
          children:
            web:
              hosts:
                web1:
                web2:
        ```

    - **核心概念**
        - **主机（host）**：单台被管机器
        - **组（group）**：主机集合，可嵌套（组里有组）
        - **组变量/主机变量**：`[组名:vars]`（组变量，如 `[web:vars]`）；主机变量行内定义（`web1 ansible_user=root`）或放 `host_vars/` 文件（注意：INI 无 `[host:vars]` 段，`:vars` 只用于组）
        - **内置变量（ansible_*）**：`ansible_host`（真实 IP）、`ansible_user`（SSH 用户）、`ansible_port`（SSH 端口）、`ansible_ssh_private_key_file`（密钥）

    - **作用（为什么重要）**
        - **批量管理**：对组执行任务（`ansible web -m ping`）
        - **连接参数集中**：统一指定 SSH 用户/端口/密钥
        - **变量组织**：按组/主机定义变量（如不同环境配置）
        - **环境隔离**：dev/test/prod 不同 inventory

- **协助记忆**
    - `Inventory` = "被管机器的花名册"：哪些机（host）、分几组（group）、怎么连（`ansible_user`/IP/port）。
    - 口诀："`-i` 指定清单，组管理主机，`[组:vars]` 定义组变量"。

- **进阶思考**
    - **Inventory 静态和动态的区别？**
        - 静态：手工编辑 `hosts` 文件（适合主机数量少/固定）。动态：从外部数据源（云 API、`CMDB`、`AWS EC2`）动态拉取主机列表（适合云环境主机动态变化）。用 `-i` 指向动态 `inventory` 脚本/插件。
    - **如何按环境管理不同配置？**
        - 用不同 inventory 文件（`hosts-dev`、`hosts-prod`）+ 组变量分层（`group_vars/` 目录），或用 `Ansible Tower`/`AWX` 的 `inventory` 组织。环境差异通过 `inventory` 和变量体现。
    - **`ansible_host` 和主机名是什么关系？**
        - 主机名（`Inventory` 里的名字，如 `web1`）是"逻辑标识"；`ansible_host` 是该主机的真实连接 IP/域名。允许逻辑名与实际 IP 分离（如主机名用短名/别名，连接用 IP）。

- **扩展信息**
    - **Inventory 相关目录**：
        - `group_vars/`（组变量）、`host_vars/`（主机变量）——按文件名自动加载
        - 变量优先级：命令行 > `Playbook` > `Inventory` 组变量 > 默认
    - **常用命令**：
        ```bash
        ansible-inventory --list            # 查看 inventory 完整结构
        ansible-inventory --host web1       # 查看单主机
        ansible -i hosts web -m ping        # 指定 inventory 执行
        ```

## 🤔 动态 Inventory 有哪些应用场景？  
- **动态 Inventory 是"从外部数据源动态获取主机列表"的 inventory（对应静态 hosts 文件）：应用场景主要是①云主机动态变化（AWS/阿里云等，实例启停/伸缩）②大规模基础设施（主机多、手工维护不可行）③CMDB/配置库集成（主机信息集中管理）④多环境/多账号管理。核心：主机列表实时、自动、无需手工编辑。**  
    - **什么是动态 Inventory**
        - 通过脚本/插件从外部源（云 API、`CMDB`、数据库）实时获取主机清单
        - 用 `-i <动态inventory>` 或 `ansible.cfg` 配置
        - 常见：`AWS EC2` 动态 `inventory`、阿里云动态 `inventory`、脚本从数据库读主机

    - **主要应用场景**
        - **云主机动态管理**：云实例频繁创建/销毁/弹性伸缩，静态文件无法跟上 → 从云 API 自动发现实例（按标签/区域分组）
        - **大规模基础设施**：上千台主机，手工维护 `hosts` 不现实 → 从 `CMDB`/配置库自动同步
        - **CMDB/配置管理集成**：用 `CMDB` 作为单一数据源，`inventory` 从 `CMDB` 读取（主机归属/属性统一管理）
        - **多环境/多账号**：按云账号/环境（dev/prod）自动划分分组
        - **编排联动**：新机器上线自动纳入管理（配合云 provisioning 自动加 inventory）

    - **实现方式**
        - **云插件**：`aws_ec2`、阿里云、`Azure` 等的动态 `inventory` 插件（官方推荐）
        - **插件**：`AWX`/`Ansible Tower` 的内置动态 `inventory` 功能
        - **自定义脚本**：写脚本从 `CMDB`/数据库/API 返回 JSON（`--list` 和 `--host` 输出）
        - **Ansible 插件**：开发自定义 `inventory` 插件

    - **动态 Inventory 的价值**
        - **实时性**：主机列表始终最新（不用手动维护）
        - **自动化**：配合云伸缩，新实例自动纳入管理
        - **准确性**：消除手工编辑 `hosts` 的错误和滞后
        - **可扩展**：适合大规模、动态变化的基础设施

- **协助记忆**
    - 动态 Inventory = "从数据库/云 API 自动拉主机清单"（不用手写 `hosts`）。
    - 场景口诀："云主机动态、大规模基础设施、`CMDB` 集成、多环境"。

- **进阶思考**
    - **静态和动态 Inventory 怎么选？**
        - 静态：主机少/固定（如几十台固定服务器）——简单够用。动态：云环境/主机多变/超大规模——必须动态（否则维护不过来）。实践中常混用（静态写固定 IDC 主机 + 动态拉云主机）。
    - **动态 Inventory 的脚本要输出什么格式？**
        - 需要支持 `--list`（返回全量主机/组结构 JSON）和 `--host <host>`（返回单主机变量）。`Ansible` 调用脚本时带这两个参数，按返回的 `JSON` 构建主机清单。
    - **如何避免"动态 Inventory 拉慢/失败"影响执行？**
        - 动态拉取可能慢（调 API）或失败。优化：结果缓存（脚本支持缓存）、失败时回退（用缓存/上次结果）、对核心执行提前预热 `inventory`。`AWX` 等有 `inventory` 缓存机制。

- **扩展信息**
    - **常见动态 Inventory 源**：
        - AWS EC2（`aws_ec2` 插件）、阿里云、Azure、GCP、OpenStack
        - `CMDB`/资产系统（`netbox` 等）、数据库、`DNS`
    - **相关命令**：
        ```bash
        ansible-inventory --list -i aws_ec2.yml   # 查看动态 inventory 结果
        ansible -i aws_ec2.yml all -m ping         # 用动态 inventory 执行
        ```

## 🤔 Ansible 变量传递有哪几种方式？  
- **Ansible 变量传递有多种方式，按优先级从高到低：命令行（`-e` extra vars）> `Playbook` 内 `vars`/`set_fact` > `Inventory` 变量 > `Role` 变量 > 文件加载（`include_vars`）> 默认（`defaults`）> `Facts`。核心：变量来源多样，优先级决定覆盖关系；优先级从"命令行最高"到"默认最低"。**  
    - **变量传递/定义方式**
        - **命令行 extra vars（最高优先）**：`ansible-playbook -e "key=value"` 或 `-e @file.yml`，临时覆盖
        - **Playbook 内 vars**：`vars:` 段定义（Playbook 级）
        - **Playbook 内 vars_files**：`vars_files:` 加载外部变量文件
        - **set_fact**：任务中用 `set_fact` 动态设置（运行时赋值/计算，仅次于 extra vars）
        - **Inventory 变量**：`host_vars`/`group_vars`（按主机/组）
        - **Role 变量**：Role 的 `vars/`（高优先）和 `defaults/`（最低默认）
        - **include_vars/include_params**：任务中动态加载变量/传参
        - **Facts（主机事实）**：自动采集的主机信息（`ansible_facts`）
        - **环境变量**：`ansible_env`（目标主机环境变量）
        - **注册变量（register）**：把任务输出注册为变量（高优先）

    - **变量优先级（简化，从高到低）**
        ```
        1. 额外变量（-e extras，最高）
        2. set_fact / register（运行时）
        3. block/task 变量、include_vars、role/include 参数
        4. Role 变量（role vars）
        5. play vars / vars_files
        6. Facts（主机事实）
        7. host_vars / group_vars（Inventory）
        8. Role 默认变量（defaults，最低）
        ```
        - 同一变量在多处定义时，高优先级覆盖低优先级（此为简化版，完整链约 20+ 级）

    - **变量引用与使用**
        - `{{ var_name }}`：`Jinja2` 模板引用
        - 定义：`key: value`/`key: {{ other }}`
        - 访问字典/列表：`{{ a.b }}`/`{{ list[0] }}`
        - 过滤：`{{ var | default('默认值') }}`

- **协助记忆**
    - 变量口诀："`-e` 最高（extra）、`Playbook` 定义、`Inventory` 按组、`defaults` 最低"。
    - 优先级记忆："命令行 > 任务 > Play > 主机/组 > 默认"。

- **进阶思考**
    - **为什么需要那么多变量来源？变量优先级解决什么问题？**
        - 不同场景需要不同覆盖：默认值（`defaults`，可被覆盖）、环境差异（`Inventory`/`group_vars`）、临时覆盖/测试（`-e`）。优先级机制让"默认可用、按需覆盖"，避免了变量冲突时不知道谁生效。
    - **`extra vars（-e）` 为什么优先级最高？**
        - 因为它是"命令行/运行时"传入的，用于临时覆盖或紧急调整，不应被文件里的值覆盖。这是设计上的"最高覆盖权"（类似环境变量覆盖配置文件），适合 CI 传参/一次性覆盖。
    - **什么是 `set_fact` / `register`？**
        - `set_fact`：任务中显式设置变量；其值按主机分别设置（跨主机引用要用 `hostvars`），`cacheable` 只是让它持久化到事实缓存、后续 Play 也能用。`register`：把上一个任务的返回结果（stdout/rc 等）存为变量，供后续任务使用。两者都是"运行时动态变量"。

- **扩展信息**
    - **变量相关文件**：
        - `group_vars/`、`host_vars/`、`vars_files`、`defaults/main.yml`（Role）
    - **优先级详解（官方文档）**：
        - 完整优先级链（约 20+ 级），从 `-e` 到默认 Fact，日常记关键几级即可

## 🤔 Ansible Playbook 是什么？  
- **Ansible `Playbook`（剧本）是用 `YAML` 编写的声明式自动化脚本：它把多个任务（Task）编排成一个可执行的工作流，描述"要管理的目标主机（`hosts`）+ 以什么用户执行（`become`）+ 依次执行哪些任务（`tasks`）"。它是 `Ansible` 最核心的使用方式（相比临时 `ad-hoc` 命令）。**  
    - **是什么（定义）**
        - 一个或多个 `Play` 的集合，每个 `Play` 定义"对哪些主机 + 执行什么"
        - 用 `YAML` 编写（`.yml`/`.yaml`），人类可读
        - 描述期望状态（声明式），可重复执行（幂等）
        - 相比 `ansible` `ad-hoc`（临时单条命令），`Playbook` 适合编排复杂、可复用的任务

    - **基本结构**
        ```yaml
        ---
        - name: 部署 Web 服务
          hosts: web
          become: yes
          tasks:
            - name: 安装 nginx
              yum:
                name: nginx
                state: present
            - name: 启动 nginx
              service:
                name: nginx
                state: started
        ```

    - **核心组成部分**
        - `hosts`：目标主机/组（必须）
        - `become`：是否提权（sudo）
        - `tasks`：任务列表（依次执行）
        - `vars`：变量
        - `handlers`：处理器（被 notify 触发）
        - `tags`：标签（选择性执行）
        - `gather_facts`：是否采集 `Facts`

    - **执行与输出**
        - 执行：`ansible-playbook site.yml`
        - 输出状态：`ok`（无变化）、`changed`（有变化）、`failed`（失败）、`skipped`
        - 幂等：重复执行第二次，多数任务变 `ok`（不再改）

    - **与 ad-hoc 的区别**
        | 维度 | ad-hoc (`ansible`) | Playbook (`ansible-playbook`) |
        |------|-------------------|------------------------------|
        | 用途 | 临时单条命令 | 编排复杂任务/复用 |
        | 可维护 | 差（命令行） | 好（文件版本化） |
        | 条件/循环 | 弱 | 强（when/loop/handlers） |
        | 适合 | 快速验证 ping/查询 | 正式运维操作 |

- **协助记忆**
    - Playbook = "运维剧本"：写好剧本（`YAML`），按剧本要求主机执行每个任务（`tasks`）。
    - 三要素口诀："`hosts`（对谁）、`become`（以谁）、`tasks`（干啥）"。

- **进阶思考**
    - **Playbook 为什么能"幂等"？**
        - 因为模块是幂等的（如 `yum` 装 nginx，已装就不装；`service` 已启动就不启动）。`Playbook` 声明"期望状态"，模块判断当前状态，到达期望就不改（返回 `ok` 而非 `changed`）。所以 `Playbook` 可反复安全执行。
    - **Play 和 Task 的区别？**
        - `Play`（一个 Play）：{`hosts` + `become` + 一组 `tasks` + 变量等} 的完整段落；Task：`Play` 里单条任务（一个模块调用）。一个 `Playbook` 可有多个 `Play`（对不同主机/不同目标），每个 `Play` 包含多个 Task。
    - **什么时候用 Playbook 而不是 ad-hoc？**
        - 多步骤/有依赖/需复用的操作用 `Playbook`（可版本化、可复用、可审阅）；单条临时查询/测试用 `ad-hoc`（`ansible all -m ping`）。正式运维、部署、复杂配置一律 `Playbook`。

- **扩展信息**
    - **Playbook 进阶用法**：
        - 循环（`loop`）、条件（`when`）、模板（`template`）、角色（`roles`）、导入（`import_tasks`/`include_tasks`）
    - **执行参数**：
        ```bash
        ansible-playbook site.yml --syntax-check   # 语法检查
        ansible-playbook site.yml --list-tasks     # 列出任务
        ansible-playbook site.yml --check          # 只读模式（预演，不实际改）
        ansible-playbook site.yml --limit web      # 限制主机
        ansible-playbook site.yml --tags config    # 按标签
        ```

## 🤔 Playbook 包含哪些核心字段？  
- **Playbook 的核心字段：`hosts`（目标主机，必填）、`tasks`（任务列表，必填）、`become`（提权）、`vars`（变量）、`handlers`（处理器）、`tags`（标签）、`gather_facts`（是否采集 Facts）、`name`（描述）**。其中 `hosts` + `tasks` 是必须的，其余增强功能。**  
    - **核心字段详解**
        - `name`：Play/Task 的描述（可选但推荐，便于阅读输出）
        - `hosts`：目标主机/组（必填），指定对哪些主机执行
        - `tasks`：任务列表（每个任务调用一个模块；Play 至少须含 tasks/roles/pre_tasks/post_tasks/handlers 之一）
        - `become`：是否提权执行（`become: yes`，可配 `become_user`/`become_method`）
        - `vars`：定义变量（Play 级）
        - `handlers`：处理器（被 `notify` 触发，如"重启服务"）
        - `tags`：标签（按标签选择性执行任务）
        - `gather_facts`：是否自动采集 `Facts`（默认 yes；`no` 可提速）
        - `remote_user`：连接用户
        - `vars_files`：加载外部变量文件
        - `roles`：应用 Role（组织复用）
        - `pre_tasks`/`post_tasks`：Play 前后执行的额外任务

    - **示例注释**
        ```yaml
        - name: 部署 Web                          # 描述
          hosts: web                               # 目标主机（必填）
          become: yes                              # 提权 sudo
          vars:                                    # 变量
            app_port: 8080
          gather_facts: false                      # 不采集 Facts（提速）
          tasks:                                   # 任务列表（必填）
            - name: 安装 nginx
              yum: { name: nginx, state: present }
          handlers:                                # 处理器
            - name: restart nginx
              service: { name: nginx, state: restarted }
        ```

- **协助记忆**
    - 核心必填两字段："`hosts`（对谁）+ `tasks`（干啥）"。
    - 增强字段口诀："become 提权、vars 变量、handlers 响应、tags 标签、gather_facts 采集"。

- **进阶思考**
    - **`tasks` 和 `handlers` 的区别？**
        - tasks：Play 主流程中依次执行的任务（必执行）。handlers：只有当被 `notify` 通知时才执行的特殊任务（如配置变更后"重启服务"），且整个 Play 结束统一执行、只会执行一次（去重）。
    - **`gather_facts: no` 能带来什么好处？**
        - 跳过 `Facts` 采集可显著提升执行速度（减少一次到目标的 SSH 采集）。适用：任务不用 `Facts`（纯部署、用固定变量）时。但用到 `Facts`（如操作系统判断 `when: ansible_os_family`）时不能关。
    - **`become` 和 `become_user` 怎么配合？**
        - `become: yes` 开启提权；`become_user: root`/`become_user: postgres` 指定提权到哪个用户（默认 root）。实现方式默认 `sudo`（`become_method` 可改 su/sudo）——"以普通用户连接，再提权执行"。

- **扩展信息**
    - **模块参数简写**：
        - 模块参数可写一行（`yum: { name: nginx, state: present }`）或展开多行
    - **常用执行控制字段**：
        - `when`（条件）、`loop`/`with_items`（循环）、`register`（注册结果）、`ignore_errors`（忽略错误）、`failed_when`/`changed_when`（自定义状态）
## 🤔 Playbook 中 notify 和 handlers 的作用？  
- **`notify` 和 `handlers` 实现"配置变更后触发动作"：任务执行时若状态发生变化（`changed`）并声明了 `notify`，就会在 Play 所有任务执行完后触发对应的 `handler`（handler 通常是"重启/重载服务"）。作用：①按需触发（只有变化才执行）②延迟到 Play 末尾批量执行 ③去重（同一 handler 只执行一次）。**  
    - **是什么（定义）**
        - `handlers`：特殊任务列表，通常定义在 Playbook/Role 的 `handlers` 段，**只有被 `notify` 触发才执行**（默认不执行）
        - `notify`：任务里的声明，指示"如果本任务状态 changed，则触发指定 handler"

    - **典型用途（为什么用）**
        - 配置更改后重启/重载服务：如改了 `nginx.conf` → `notify: restart nginx` → 只有配置真变了才重启
        - 避免"每次执行都重启服务"（幂等：没变化不触发）

    - **工作机制**
        ```yaml
        tasks:
          - name: 修改 nginx 配置
            template:
              src: nginx.conf.j2
              dest: /etc/nginx/nginx.conf
            notify: restart nginx      # 配置 changed 时触发
        handlers:
          - name: restart nginx
            service:
              name: nginx
              state: restarted
        ```

    - **关键特性（执行时机）**
        - **状态变化才触发**：任务返回 `changed` 才触发 notify（`ok` 不触发）
        - **Play 末尾执行**：所有 tasks 执行完才统一执行 handlers（不是立刻）
        - **去重**：同一 handler 被多次 notify 也只执行一次
        - **失败注意**：若某任务失败导致 Play 提前终止，已通知的 handler 可能不执行

- **协助记忆**
    - notify/handlers = "发通知 + 收通知干活"：任务变了（notify），账记下来，Play 结束统一干（handler）。
    - 口诀："notify 触发、handler 执行、变了才做、末尾统一、只做一次"。

- **进阶思考**
    - **为什么要"Play 末尾才执行 handler"？**
        - 因为多个任务可能都 notify 同一个 handler（如改配置文件 + 改数据目录都需重启），若每个任务一变就重启会重复重启。末尾统一 + 去重，保证服务只重启一次，且所有配置改完才重启（一致）。
    - **如果 handler 因为前面的任务失败没执行怎么办？**
        - 场景：任务 A 通知重启，但任务 B 失败导致 Play 中断，handler 未执行。解决：`force_handlers: true`（即使中途失败也执行 handlers）；或把重启拆到 `post_tasks`/单独 Play。
    - **`handlers` 和普通 `tasks` 有什么区别？**
        - tasks 是主流程默认执行；handlers 默认不执行、需被 notify 触发、且末尾执行 + 去重。handlers 本质是"被动触发的特殊任务"。

- **扩展信息**
    - **相关参数**：`force_handlers: true`（Play 级，失败也执行 handler）、`listen`（按主题监听：一个 `notify` 触发所有 `listen` 该主题的 handler，即"一对多"）、`meta: flush_handlers`（立即执行已通知的 handler）
    - **常见 handler 场景**：重启/重载服务（`systemctl restart`、`nginx -s reload`）、清缓存、通知外部系统

## 🤔 Playbook 中 tags 有什么用？  
- **`tags`（标签）用于"给任务打标签，按标签选择性执行 Playbook 中的部分任务"：执行时用 `--tags` 只跑打了指定标签的任务（`--skip-tags` 跳过）。作用：①按需执行子集（如只执行配置、只重启）②分离不同阶段（安装/配置/启动）③加速调试与部分部署。**  
    - **是什么（定义）**
        - 给 Play/Task 打标签（可多个）：`tags: [config]`/`tags: [install, config]`
        - 执行时用 `--tags <tag>` 只运行标记了该标签的任务
        - 用 `--skip-tags <tag>` 跳过标记了该标签的任务

    - **典型用途**
        - **按功能选任务**：只想"重启服务"或只想"改配置"，不用跑完整 `Playbook`
        - **分阶段执行**：`install`/`config`/`start` 分标签（如先只跑到 install）
        - **调试/灰度**：调试时只跑部分任务，或灰度时跳过某步骤
        - **角色复用**：Role 里分层标签按需执行

    - **示例**
        ```yaml
        tasks:
          - name: 安装 nginx
            yum: { name: nginx, state: present }
            tags: [install]
          - name: 配置 nginx
            template: { src: nginx.conf.j2, dest: /etc/nginx/nginx.conf }
            tags: [config]
          - name: 启动 nginx
            service: { name: nginx, state: started }
            tags: [start]
        ```
        ```bash
        ansible-playbook site.yml --tags install    # 只执行安装任务
        ansible-playbook site.yml --skip-tags start # 跳过启动任务
        ```

    - **注意事项**
        - 标签是"选择性"：不打标签的任务在 `--tags` 时默认**不执行**（除非打 `always` 标签）
        - `always` 标签：打了 `always` 的任务总是执行（除非 `--skip-tags always`）；`never` 标签：默认不执行，需 `--tags never` 显式触发
        - 依赖关系：跳过某任务可能破坏依赖（要理解任务间依赖再选）

- **协助记忆**
    - tags = "给任务贴标签，按标签挑着跑"。
    - 口诀："`--tags` 只跑打标、`--skip-tags` 跳过打标、`always` 总是执行"。

- **进阶思考**
    - **tags 和 `when` 条件有什么区别？**
        - `tags`：编译期"选哪些任务跑"（由用户在命令行用 `--tags` 决定）。`when`：运行时"任务要不要执行"（由主机状态/变量判断）。tags 是用户外部选择，when 是运行条件。
    - **`--tags` 时未打标签的任务会执行吗？**
        - 默认不会（只执行匹配标签的任务）。若想"部分任务总是执行"（如基础环境准备），给它们打 `always` 标签。
    - **tags 和 Role 结合怎么用？**
        - Role 内任务也可打标签，执行时可 `--tags` 按需跑 Role 的特定部分；配合 Role 的 `tags` 可控制 Role 是否参与某次执行。

- **扩展信息**
    - **执行示例**：`ansible-playbook site.yml --tags config`、`--skip-tags start`、`--list-tags`（列出所有标签）
    - **`always` 标签**：always 任务总执行（如收集环境、初始化）

## 🤔 如何调整 ansible-playbook 执行任务时的并发数量？  
- **调整 Ansible 并发用 `-f`/`--forks` 参数：`ansible-playbook site.yml -f 20` 表示同时并发处理 20 台主机（默认 `forks=5`）。也可在 `ansible.cfg` 的 `[defaults]` 段设置 `forks = N`。并发越高，对多主机执行越快，但会增大控制机/网络资源消耗，且受 SSH 连接数限制。**  
    - **`forks`（并发分叉数）**
        - 定义 `Ansible` 一次并行的主机数上限（`linear` 策略下：每个任务至多 `forks` 台主机同时执行，全部主机完成当前任务才进入下一个任务）
        - 默认：`forks = 5`（`ansible.cfg`）

    - **调整方式**
        ```bash
        # 命令行参数
        ansible-playbook site.yml -f 20        # 20 台并发
        ansible-playbook site.yml --forks 20

        # ansible.cfg
        [defaults]
        forks = 20
        ```

    - **效果与取舍**
        - 并发高 → 多主机同时执行，整体更快（尤其大量小任务）
        - 但：①控制机 CPU/内存（每个 fork 是子进程）②SSH 连接数 ③被管主机/网络压力（同时批量操作）④目标服务资源（如同时重启大量服务可能瞬高）
        - 建议：根据控制机性能和任务负载合理设置（通常 10~50），不要盲目调高

    - **相关参数**
        - `--serial`（滚动，Play 级关键字 `serial`）：按批次串行（如先 10 台再 10 台）——适合分批发布，避免一次性全量
        - `strategy`：默认 `linear`（线性）；`free`（各主机独立跑完）效果不同
        - `poll`/`async`：异步任务

- **协助记忆**
    - 并发口诀："`-f/--forks` 调并发（默认 5），批次并行加速"。
    - 注意："并发高提速但有代价（控制机/SSH/目标压力）"。

- **进阶思考**
    - **`forks` 和 `--serial` 有什么区别？**
        - `forks`：每批**并行**处理多少台（一次 N 台同时跑）；`--serial`：把主机**分批串行**处理（每批 N 台跑完再下一批）。发布场景多用 `serial`（分批、避免全量同时改引发问题），一般批量用 `forks` 提速。
    - **并发过高会有什么问题？**
        - 控制机 fork 子进程多 → 资源耗尽；SSH 连接数超限；被管目标同时被大量操作（如同时重启 100 台 DB 可能雪崩）。所以并发不是越高越好，需按环境调。
    - **如何观察并发执行状态？**
        - 执行时看输出每个任务按"批次"进行；`--verbose` 更多细节；监控控制机 CPU/内存和 SSH 连接数，确认 forks 不成为瓶颈。

- **扩展信息**
    - **执行策略（strategy）**：`linear`（默认，一批一批）、`free`（主机独立执行，快的先跑完）
    - **分批发布示例**：`ansible-playbook deploy.yml --serial 10%`（每批 10%）、`--serial 10`（每批 10 台）

## 🤔 Playbook 与 Role 什么关系？  
- **Role（角色）是 `Playbook` 的"可复用、模块化、可组织"形式：`Role` 把一组相关的任务、变量、handler、模板、文件等按固定目录结构组织成可复用的单元，`Playbook` 通过 `roles:` 引用 `Role`（或 `include_role` 动态引入）。关系：`Playbook` 是"剧本"（编排），`Role` 是"标准化的可复用组件"（`Playbook` 可包含多个 `Role`）。**  
    - **是什么（定义）**
        - **`Playbook`**：一个完整的自动化脚本（`YAML`），定义 `hosts` + `tasks`，可直接执行
        - **`Role`**：可复用的结构化组件（任务 + 变量 + handler + 模板 + 文件的组合），有自己的标准目录（至少要含一个标准目录才合法；只提供变量/模板的 Role 也可被引用）

    - **关系（核心）**
        - **`Playbook` 引用 `Role`**：通过 `roles:` 段或 `include_role`/`import_role` 在 `Playbook` 中使用 `Role`
        - **`Role` 是 `Playbook` 的"可复用单元"**：一个 `Role` 完成一类功能（如 `nginx`、`mysql`），可在多个 `Playbook`/项目复用
        - **`Playbook` 可含多个 `Role`**：一个 `Play` 可引用多个 `Role`（`roles: [common, nginx, mysql]`）
        - **`Role` 更规范**：目录结构固定、变量分层（defaults/vars）、自带 handler/模板，利于团队协作与复用

    - **对比**
        | 维度 | Playbook | Role |
        |------|----------|------|
        | 本质 | 剧本（编排） | 可复用组件 |
        | 复用 | 低（独立脚本） | 高（多处复用） |
        | 结构 | 无强制 | 固定目录 |
        | 组织 | tasks 在内 | 任务/变量/handler/模板分层 |
        | 使用 | 直接执行 | 被 Playbook 引用 |

    - **典型用法**
        ```yaml
        - name: 部署全套
          hosts: web
          roles:
            - common
            - nginx
            - app
        ```

- **协助记忆**
    - Role = "标准化的乐高积木"（可复用组件）；`Playbook` = "搭积木的图纸"（编排）。
    - 口诀："`Playbook` 编排引用 `Role`，`Role` 是可复用组件"。

- **进阶思考**
    - **为什么要用 `Role` 而不是把所有任务写在一个 `Playbook`？**
        - ①复用（同样功能多处用）②模块化/可维护（职责单一、目录清晰）③团队协作（`Role` 可独立开发/共享，galaxy 下载）④变量/模板组织规范。正式项目都用 `Role` 组织。
    - **`import_role` 和 `include_role` 有什么区别？**
        - `import_role` 静态导入（编译期展开）：受限于 role 名称不可用变量、不支持 `loop`；但其 `vars:` 参数及内部任务仍可用运行时变量。`include_role` 动态包含（运行时解析）：支持循环/变量。
        - `when`/`tags` 语义不同：作用于 `import_role` 时应用到其全部内部任务；作用于 `include_role` 时仅作用于 include 语句本身，需用 `apply:` 传递到内部任务。
    - **Role 和单独 tasks 文件（include_tasks）怎么选？**
        - 简单/一次性小任务：Playbook 内写或 include_tasks；复杂/可复用/需变量模板组织：用 Role（最佳实践组织方式）。

- **扩展信息**
    - **`Role` 管理工具**：`ansible-galaxy init <role>`（创建）、`ansible-galaxy install`（下载）、`Ansible Galaxy`（公共仓库）
    - **相关概念**：`Role` 依赖（`meta/main.yml`）、`Ansible Collections`（`Role` 的新组织形态）

## 🤔 一个 Role 目录结构是怎样的？  
- **一个 Role 的标准目录结构包含：`tasks/`（主任务，必须）、`handlers/`（处理器）、`defaults/`（默认变量，最低优先级）、`vars/`（内部变量，高优先）、`files/`（静态文件）、`templates/`（模板 j2）、`meta/`（元数据/依赖）、`tests/`（测试）**。其中 `tasks/main.yml` 是 Role 入口（必须），其余可选。**  
    - **标准目录结构**
        ```
        roles/nginx/
        ├── tasks/            # 主任务（必须有 tasks/main.yml）
        │   └── main.yml
        ├── handlers/         # handlers（被 notify 触发）
        │   └── main.yml
        ├── defaults/         # 默认变量（最低优先级，可被覆盖）
        │   └── main.yml
        ├── vars/             # 内部变量（高优先级，覆盖 defaults）
        │   └── main.yml
        ├── files/            # 静态文件（copy 模块引用，直接复制）
        ├── templates/        # 模板文件（*.j2，template 模块渲染）
        ├── meta/             # Role 元数据（依赖 dependencies、galaxy 信息）
        │   └── main.yml
        └── tests/            # 测试（test 使用）
            ├── inventory
            └── test.yml
        ```

    - **各目录作用**
        - `tasks/`：主任务（要有任务可执行须提供 `main.yml`，Role 的执行入口）
        - `handlers/`：处理器（notify 触发的动作，如重启服务）
        - `defaults/`：默认变量（最低优先级，供使用者覆盖——因 role vars 优先级高于 play vars 难以覆盖，最佳实践把"可配置项"放 defaults）
        - `vars/`：Role 内部变量（高优先级，通常使用者不改）
        - `files/`：静态文件（`copy`/`script` 模块直接用 `files/` 下文件）
        - `templates/`：Jinja2 模板（`template` 模块渲染后部署，可含变量）
        - `meta/`：元数据（依赖的其他 Role、galaxy_info）
        - `tests/`：测试相关（molecule/自测；galaxy 脚手架附带，非七个标准目录之一）

    - **使用 Role**
        ```yaml
        # Playbook
        roles:
          - nginx
          - role: mysql
            vars: { db_user: ops }
        ```

    - **重要：优先级**
        - `defaults/` < `vars/`：同一变量在 defaults 和 vars 都定义时，vars 优先（vars 高于 play vars 难覆盖，故可配置项放 defaults）

- **协助记忆**
    - Role 目录口诀："tasks（入口必须）、handlers、defaults、vars、files、templates、meta、tests"。
    - 记忆："任务、响应、默认、内部、文件、模板、元数据、测试"。

- **进阶思考**
    - **为什么 `defaults` 和 `vars` 分开？有什么区别？**
        - `defaults`：默认值（使用者可覆盖，优先级最低）；`vars`：内部固定值（高优先级，通常不让使用者改）。所以 `Role` 作者把"可配置项"放 defaults（供 Playbook/inventory 传值覆盖），把"内部参数"放 vars。
    - **没有 `tasks/main.yml` 的 Role 能跑吗？**
        - 不能正常执行（Role 入口就是 `tasks/main.yml`，缺它 Role 无任务可做）。`meta/main.yml` 等可选，但 `tasks/main.yml` 是必须的入口。
    - **`files/` 和 `templates/` 的区别？**
        - files：静态文件（原样复制，不需要变量）；templates：Jinja2 模板（渲染后生成，可嵌入变量 `{{ }}`）。需要"按主机生成不同内容"用 template，纯静态文件用 copy（files）。

- **扩展信息**
    - **创建 Role**：`ansible-galaxy init nginx`（生成 Role 脚手架）
    - **Ansible Collections**：新的 `Role`/插件组织形态（`namespace.collection`），比单一 `Role` 更大粒度（含多个 `Role`/模块/插件）
## 🤔 Jinja2 模板是什么？  
- **Jinja2 是一个 Python 模板引擎，`Ansible` 用它做"动态配置生成"：模板文件（`.j2`）里嵌 `{{ 变量 }}` 表达式和 `{% 控制语句 %}`，由 `template` 模块按每台主机的变量/`Facts` 渲染成最终配置文件。作用：同一模板按不同主机/环境生成不同配置，避免手工维护多份配置文件。**  
    - **什么是 Jinja2（定义）**
        - Python 的模板引擎（网页/配置通用），`Ansible` 内置支持
        - 模板 = 静态文本 + 动态表达式（`{{ }}`）+ 控制逻辑（`{% %}`）
        - `Ansible` 用它渲染配置文件、生成文本（不只是 web）

    - **基本语法**
        - 变量插值：`{{ variable }}`（输出变量值）
        - 控制语句（if/for）：`{% if %}`、`{% for item in list %}`
        - 过滤器：`{{ var | upper }}`、`{{ var | default('x') }}`
        - 注释：`{# 注释 #}`

    - **模板示例**
        ```jinja2
        # nginx.conf.j2 模板
        server {
            listen {{ app_port }};
            server_name {{ domain }};
            {% if use_ssl %}
            ssl_certificate {{ ssl_cert_path }};
            {% endif %}
            location / {
                proxy_pass http://{{ backend_host }};
            }
        }
        ```

    - **在 Ansible 中使用（template 模块）**
        ```yaml
        - name: 渲染 nginx 配置
          template:
            src: nginx.conf.j2      # 模板文件（templates/ 下）
            dest: /etc/nginx/nginx.conf
          notify: restart nginx
        ```
        - `src`：模板文件（通常放 Role 的 `templates/`）
        - `dest`：渲染后输出到目标路径
        - 模板里可引用变量、`Facts`、`Inventory` 变量等（每台主机各自渲染）

    - **用途（为什么用）**
        - **按主机差异化**：同一模板，不同主机（IP/端口/环境）渲染出不同配置
        - **动态配置**：配置里引用变量/`Facts`（如按操作系统、内存生成参数）
        - **避免维护多份文件**：不用为每台机器手工写配置
        - **配合 notify**：配置变了触发重启

- **协助记忆**
    - Jinja2 = "模板填空"：`{{ 变量 }}` 插值、`{% 逻辑 %}` 控制、`template` 模块渲染。
    - 口诀："{{打洞插值}}、{%逻辑分支%}、.j2 模板、template 渲染"。

- **进阶思考**
    - **`copy` 和 `template` 模块的区别？**
        - `copy`：原样复制静态文件（不渲染）。`template`：渲染 Jinja2 模板后复制（文件里有 `{{ }}` 要被替换）。需要动态配置用 template，纯静态文件用 copy。
    - **模板里能引用哪些变量？**
        - 几乎所有 `Ansible` 变量：`Inventory` 变量、`Playbook` vars、`Facts`（`{{ ansible_facts.xxx }}`）、注册变量、`Role` 变量。模板按每台主机分别渲染（引用各自主机的事实）。
    - **过滤器（filter）有什么常见用法？**
        - `default`（默认值）、`upper`/`lower`（大小写）、`join`（列表连接）、`to_yaml`（转 YAML）。过滤器让模板更灵活，避免在模板里写复杂逻辑。

- **扩展信息**
    - **模板相关**：
        - `templates/` 目录（Role 内模板存放）、`src`/`dest` 参数、`template` 模块的 `mode`/`owner` 等参数
        - 模板路径解析：Role 的 `templates/`、`files/`、相对路径
    - **常用过滤器**：`default`、`ternary`、`map`、`select`、`join`、`to_json`/`to_yaml`（注：`ipaddr` 等自 Ansible 2.10 起隶属 `ansible.utils` 集合，需装 `netaddr`，非内置）

## 🤔 Ansible Facts 是什么？  
- **Facts（主机事实）是 Ansible 在执行前自动从目标主机采集的系统信息集（`ansible_facts`）：操作系统/版本、CPU/内存/磁盘、IP/网卡、主机名、内核、包管理器等。作用：①按主机特性做条件判断（`when`）②定制化配置（模板引用 Facts）③生成主机清单信息。可用 `gather_facts` 控制是否采集、`setup` 模块手动采集。**  
    - **是什么（定义）**
        - Ansible 自动采集的"目标主机信息"（元数据），存于 `ansible_facts`
        - 在每台主机上通过 `setup` 模块采集（Play 默认 `gather_facts: yes`）
        - 包含：`ansible_os_family`（OS 家族）、`ansible_distribution`（发行版）、`ansible_architecture`（架构）、`ansible_memtotal_mb`（内存）、`ansible_all_ipv4_addresses`（IP）、`ansible_hostname`（主机名）、`ansible_default_ipv4`（默认 IP）等

    - **作用（为什么用）**
        - **条件判断**：`when: ansible_os_family == "RedHat"`（按系统不同执行不同任务）
        - **定制配置**：模板里引用 Facts（如按内存生成 JVM 参数、按架构装包）
        - **主机清单信息**：生成主机概要（inventory 相关）
        - **动态适配**：同一 Playbook 适配不同环境（Ubuntu/CentOS 等）

    - **使用示例**
        ```yaml
        tasks:
          - name: 判断系统家族
            debug:
              msg: "系统是 {{ ansible_facts.ansible_os_family }}"
            when: ansible_facts.ansible_os_family == "Debian"
        ```

    - **采集控制**
        - `gather_facts: no`：Play 级跳过采集（提速）
        - `setup` 模块：手动采集/查看 `Facts`
        - `gather_subset`：只采集部分子集（控制范围/速度）
        - `Facts` 缓存：`fact_caching`（提升大数据量执行效率）

- **协助记忆**
    - Facts = "目标主机的体检报告"：OS/CPU/内存/IP 等，自动采集供条件/模板用。
    - 口诀："`ansible_facts` 自动采，`when` 判断、模板引用、`gather_facts` 控制"。

- **进阶思考**
    - **Facts 为什么重要（没有会怎样）？**
        - 没有 `Facts` 无法做"按主机自适应"：不能用 `when: ansible_os_family` 区分系统、不能在模板里引用主机属性。它让同一 `Playbook` 适配多样环境（跨 OS、跨配置的主机），是 `Ansible` 灵活性的基础。
    - **为什么要控制 Facts 采集？**
        - 采集 `Facts` 每次都要 SSH 到目标机执行 `setup`，大量主机时耗时。`gather_facts: no` 提升速度；`gather_subset` 少采；`Facts` 缓存（如 Redis/JSON 缓存）避免重复采集。在"任务不用 `Facts`"时关闭是性能优化。
    - **`ansible_facts` 和普通变量有什么区别？**
        - `Facts` 是"自动采集的主机事实"（来自 `setup`，前缀 `ansible_`）；普通变量是"人工定义/传值"。`Facts` 反映主机实际状态，普通变量反映期望/配置。模板和条件里都能引用两者。

- **扩展信息**
    - **常见 Facts 字段**：
        - `ansible_facts.ansible_os_family`、`ansible_distribution`、`ansible_distribution_version`、`ansible_architecture`、`ansible_memtotal_mb`、`ansible_processor_vcpus`、`ansible_all_ipv4_addresses`、`ansible_default_ipv4.address`、`ansible_hostname`、`ansible_kernel`
    - **查看 Facts**：`ansible host -m setup`（手动采集）
## 🤔 Ansible 中如何处理敏感数据，如密码、密钥？  
- **Ansible 处理敏感数据主要用 `ansible-vault`（加密）：用加密口令加密变量/文件（`Playbook`、`group_vars` 等），执行时提供密码解密。核心：①`ansible-vault` 加密文件/字符串 ②被加密的对象在执行时解密 ③配合 `--ask-vault-pass`/密码文件/环境变量提供密钥 ④敏感值不写明文到仓库。**  
    - **是什么（定义）**
        - `Ansible` 内置的敏感数据加密工具
        - 用对称加密（口令/密码）加密文件内容，执行时用同一密码解密
        - 保护 `Playbook`/变量/配置中的密码、密钥、Token，防止明文进 Git

    - **核心用法（ansible-vault 命令）**
        ```bash
        ansible-vault create secret.yml        # 创建加密文件
        ansible-vault encrypt group_vars/prod/passwd.yml   # 加密已存在文件
        ansible-vault edit secret.yml          # 编辑加密文件（需要密码）
        ansible-vault decrypt secret.yml       # 解密
        ansible-vault view secret.yml          # 查看（不解码保存）
        ansible-vault encrypt_string 'xxx' --name db_password   # 加密单个字符串
        ```

    - **执行时怎么解密（提供密码方式）**
        ```bash
        ansible-playbook site.yml --ask-vault-pass        # 交互输入密码
        ansible-playbook site.yml --vault-password-file /path/passfile  # 密码文件
        ANSIBLE_VAULT_PASSWORD_FILE=<file> ansible-playbook site.yml  # 环境变量
        ansible-playbook site.yml --vault-id prod@vault-pass.txt   # 按标识指定（现代推荐，支持多密码+标签）
        # 密码文件可配 ansible.cfg: vault_password_file = /path
        ```
        - 注：vault 默认用 AES256 对称加密（ansible-core 正计划替换该算法，向后兼容保留）

    - **支持加密的对象**
        - 变量文件（group_vars/host_vars/vars_files）
        - `Playbook` 本身（整个剧本加密）
        - `Inventory`（主机密码/连接参数）
        - 单个字符串（`encrypt_string`，嵌入变量）
        - Role 的 defaults/vars

    - **最佳实践**
        - **不明文存密码**：密码/密钥绝不写明文进 Git
        - **单独文件加密**：把敏感变量集中到加密文件（如 `group_vars/all/vault.yml`）
        - **密码管理**：vault 密码用安全方式保管（密码管理器/KMS/CI 密钥库），不与文件同库
        - **区分环境**：不同环境用不同 vault 密码
        - **配合 CI**：CI 里用密钥库/KMS 注入 vault 密码，不在流水线明文
        - 结合 `no_log: true`：防止任务输出泄露敏感值

- **协助记忆**
    - vault = "`Ansible` 的保险箱"：敏感数据加密入库（`ansible-vault`），执行时用密码解锁。
    - 口诀："`ansible-vault encrypt` 加密、`--ask-vault-pass` 解锁、别把密码整进 Git"。

- **进阶思考**
    - **vault 密码忘了/丢了怎么办？**
        - Ansible vault 没有后门，密码丢则无法解密（数据永久不可读）。所以 vault 密码要安全备份（密码管理器）并做团队交接；换密用 `ansible-vault rekey`。
    - **vault 和 HashiCorp Vault 有什么区别？**
        - `Ansible` vault：文件级加密（静态，执行时解密）。`HashiCorp Vault`：独立密钥/密码管理系统（动态密钥、集中、审计、API），`Ansible` 可经插件/模块从 `Vault` 动态拉取密钥。两者可结合（静态用 `ansible-vault`，动态用 `HashiCorp Vault`）。
    - **如何防止敏感值在执行输出/日志泄露？**
        - 用 `no_log: true`（任务不回显参数/输出）；避免 debug 打印敏感变量。敏感场景配合外部密钥库 + no_log 双保险。

- **扩展信息**
    - **相关参数**：`vault_password_file`（ansible.cfg）、`ANSIBLE_VAULT_PASSWORD_FILE`（环境变量）、`ansible-vault rekey`（改密）
    - **进阶**：多 vault 密码（多个加密 password id）、与 CI/CD 密钥库集成

## 🤔 Playbook 中 become /become_user 作用是什么？  
- **`become` 和 `become_user` 是 Ansible 的"提权"机制：`become: yes` 表示"以更高权限执行任务"（默认提权到 root，用 sudo）；`become_user: xxx` 指定提权到哪个用户（如 `postgres`、`app`）。作用：普通用户连接（安全），需要特权时再提权执行特定任务，实现"最小权限 + 按需提权"。**  
    - **是什么（定义）**
        - `become`：布尔值，是否启用"提权执行"（默认 no）
        - `become_user`：提权到哪个用户（默认 root）
        - `become_method`：提权方式（默认 sudo，可 su 等）
        - 解决：连接用普通用户（安全），执行需特权任务时提权

    - **基本用法**
        ```yaml
        # Play 级：整个 Play 提权
        - hosts: web
          become: yes

        # 任务级：单个任务提权
        tasks:
          - name: 重启 nginx
            service: { name: nginx, state: restarted }
            become: yes

        # 提权到指定用户
        - name: 以 postgres 用户执行
          command: psql -c "SELECT 1"
          become: yes
          become_user: postgres
        ```

    - **实现原理（sudo）**
        - 控制机用连接用户（如 `ops`）SSH 登录
        - 任务需要特权时：`sudo -u <become_user>` 提权执行
        - 需要目标机有 sudo 权限（连接用户的 sudoers 配置）

    - **作用（为什么用）**
        - **最小权限**：不用 root 直接连接（降低风险），普通用户 + 按需提权
        - **灵活性**：不同任务用不同身份（如系统任务 root、数据库任务 postgres）
        - **安全**：普通账号被攻破影响小，特权操作有限且可审计

    - **注意事项**
        - 目标机需配置连接用户的 sudo 权限（如 `ops ALL=(ALL) NOPASSWD: ALL`）
        - 提权需要密码时用 `ansible_become_password`/`--ask-become-pass`
        - `become` 在连接后、任务执行前提权

- **协助记忆**
    - become = "临时借身份执行"：`become: yes` 借 root，`become_user` 借指定用户。
    - 口诀："become 开提权、become_user 定身份、默认 root 用 sudo"。

- **进阶思考**
    - **`become` 和直接"用 root 连接"有什么区别？**
        - 直接以 root SSH 连接：权限最大但风险高。用普通用户 + become：先安全连接，再按需提权（最小权限），提权操作可控/可审计。
    - **什么时候需要 `become_user` 而不是默认 root？**
        - 需要"以应用/特定用户身份"执行时：如数据库操作以 `postgres` 用户（`psql` 需要 postgres 身份）、应用部署以 `app` 用户（保证文件属主正确）。
    - **常见报错"sudo: 需要密码"怎么解决？**
        - 连接用户 sudo 需要密码：①配置 sudoers 免密（`NOPASSWD`）②或提供 `ansible_become_password` / 用 `--ask-become-pass`。生产常用免密 sudo 白名单（限定命令）更安全。

- **扩展信息**
    - **相关参数**：`become`、`become_user`、`become_method`（sudo/su）、`ansible_become_password`、`--ask-become-pass`
    - **sudoers 示例**：`ops ALL=(ALL) NOPASSWD: ALL`（免密提权）
## 🤔 Ansible 执行报错 “Permission denied” 的排查思路？  
- **Ansible 报 "Permission denied" 常见于：①SSH 连接认证失败（密钥/密码）②`become` 提权失败（sudo 权限不足）③目标文件/目录权限不足（写权限）④远程 Python 权限。排查思路：分层定位——先分清是"连接阶段"还是"任务执行阶段"，再针对认证/提权/权限逐项排查。**  
    - **第一步：分清阶段（连接 vs 任务执行）**
        - 连接阶段失败：报在连不上/认证（SSH 相关）
        - 任务执行阶段失败：连接成功但任务操作被拒（文件/提权）
        - 看报错是 `unreachable`（连接层）还是 `failed`（执行层）区分阶段

    - **第二步：SSH 连接认证失败排查**
        - 密钥权限：`~/.ssh/id_rsa` 权限太宽（需 600）
        - 目标机 `authorized_keys` 权限/属主
        - 连接用户/密钥是否正确（`ansible_user`、`ansible_ssh_private_key_file`）
        - SSH 配置（`UsePAM`/`PasswordAuthentication`）
        - 手动 `ssh` 测试能否连上

    - **第三步：become 提权失败排查**
        - 连接用户是否在目标机 sudoers（`sudo -l` 检查）
        - sudoers 是否允许该命令（`NOPASSWD` 或需要密码）
        - 需要密码时是否提供（`ansible_become_password`/`--ask-become-pass`）
        - `become` 参数是否写对（`become: yes`/`become_user`）

    - **第四步：目标文件/目录权限排查**
        - 任务要写的路径权限：`dest` 目录是否可写（属主/写权限）
        - 目标文件属主：用普通用户还是提权后可写
        - `mode`/`owner`/`group` 参数是否正确
        - SELinux 上下文（`restorecon`/`chcon`）也可能导致 Permission denied

    - **第五步：其他可能**
        - 远程 Python 环境（`/usr/bin/python` 不可用/版本）
        - 目标机资源限制（磁盘满导致写失败误报权限）

- **协助记忆**
    - 排查口诀："连接（SSH/key）、提权（sudo）、写文件（权限）、Python、磁盘"。
    - 分层："先分阶段（连接 vs 任务），再查 认证/提权/文件权限"。

- **进阶思考**
    - **怎么快速区分"SSH 连不上"和"任务权限不足"？**
        - 连不上：报 `unreachable`（主机不可达，连接层）。任务权限：报 `failed`（连接成功，任务执行失败）。先看错误是 unreachable 还是 failed，基本能定位阶段。
    - **为什么"权限 denied"但手动 ssh/sudo 能成功？**
        - 常见原因：`requiretty`（无 TTY 时 sudo 拒绝执行）、`sudoers` 规则限定特定命令/TTY；或 non-interactive sudo 与交互 sudo 配置不同。排查 `sudoers` 和 `Ansible` 的 `become` 配置（注意 `NOPASSWD` 对非交互 sudo 同样生效，不是导致该差异的原因）。
    - **SELinux 导致的 Permission denied 怎么识别？**
        - 写入有 SELinux 上下文的位置可能被拒。用 `ausearch -m avc` 查 AVC denial；正确做法是调整上下文（`semanage`/`restorecon`）而非关 SELinux。
    - **"Python 环境"导致的执行失败怎么识别？**
        - 目标机缺 Python 通常报 MODULE FAILURE/解释器错误（非 Permission denied）。ansible-core 2.12 起自动解释器发现已弃用，建议显式配置 `ansible_python_interpreter`（如 `/usr/bin/python3`）。

- **扩展信息**
    - **排查命令**：`ansible host -m ping`（测连接）、`ssh ops@host`（手动 SSH）、`sudo -l`（检查 sudo 权限）、`ansible host -m setup`（检查 Python/`Facts`）
    - **常见解决**：密钥 600、sudoers 白名单、目录 mode 属主、SELinux context

## 🤔 Ansible 部分主机显示 “unreachable” 是什么原因及解决？  
- **Ansible 部分主机显示 `unreachable` 表示"SSH 连接层不可达"（连接/认证失败，不是任务失败）。常见原因：①网络不可达（IP/防火墙/DNS）②SSH 端口/服务未开 ③密钥/密码认证失败 ④`host_key_checking` 首次连接被拒 ⑤主机配置错误（`ansible_host`/IP）⑥资源不足/限流。解决：先用 `ping`/`ssh` 手动测试，再逐项排查连接参数。**  
    - **是什么（定义）**
        - `unreachable`：控制机无法连接到目标主机（SSH 层失败）
        - 区别于 `failed`：failed 是连接成功但任务执行失败
        - 表现为主机状态 `unreachable`，该主机任务不执行

    - **常见原因**
        - **网络不可达**：IP 错误/不通、防火墙拦截（22 端口）、DNS 解析失败
        - **SSH 未开放/端口错**：目标未装/未启动 SSH、`ansible_port` 不对
        - **认证失败**：密钥未授权、密码错误、`ansible_user` 不对
        - **host_key_checking**：首次连接主机 key 校验失败被拒（默认 yes）
        - **Inventory 配置**：`ansible_host` IP 配错、主机名无法解析
        - **资源/限流**：目标机 SSH 连接数满、控制机 forks 过多

    - **排查步骤**
        ```bash
        # 1. 测试网络/连通
        ping <host IP>
        # 2. 测试 SSH
        ssh <user>@<host>
        # 3. 检查端口
        nc -zv <host> 22  /  telnet <host> 22
        # 4. 检查 SSH 配置/密钥权限
        # 5. 查看 Inventory 的 ansible_host/ansible_user/ansible_port
        ```

    - **解决方式**
        - 网络：修 IP/防火墙放行 22/DNS
        - SSH：确认服务启动、端口、装 openssh-server
        - 认证：放 authorized_keys、用对密钥/用户
        - host_key_checking：测试/内网可设 `host_key_checking = False`（或 `-o StrictHostKeyChecking=no`）

    - **注意**
        - 部分主机 unreachable 时，用 `--limit` 隔离排查单台
        - 用 `-vvv` 看详细连接错误

- **协助记忆**
    - unreachable = "主机还没连上"（SSH/网络层）——先手动 ping/ssh 测试。
    - 排查口诀："先 ping 网络、再 ssh 认证、后查端口/配置、host_key_checking"。

- **进阶思考**
    - **`unreachable` 和 `failed` 的区别为什么重要？**
        - 定位分层：unreachable 是"连不上"（网络/认证/SSH），failed 是"连上了但任务错"（权限/模块/依赖）。先判断是哪种，决定排查方向完全不同。
    - **为什么手动 ssh 能连但 Ansible 报 unreachable？**
        - 可能：`Ansible` 用了不同的密钥/用户/端口（`Inventory` 配的和手动不同）；`host_key_checking` 校验失败；`ansible_host` IP 与 `Inventory` 名不一致。逐项核对连接参数。
    - **大规模主机批量 unreachable 说明什么？**
        - 很可能：网络（防火墙/网段变更）、控制机到主机的 SSH 拦截、密钥批量失效、目标资源被占用。先抽查单台逐步排查。

- **扩展信息**
    - **相关参数**：`ansible_host`、`ansible_user`、`ansible_port`、`ansible_ssh_private_key_file`、`host_key_checking`、`timeout`、`retries`
    - **排查命令**：`ansible host -m ping -vvv`（详细连接）
## 🤔 管理大量主机时，如何提升 Ansible 执行效率？  
- **管理大量主机提升 Ansible 效率的常用手段：①调整并发（`forks`）②关闭/缓存 `Facts`（`gather_facts: no`、`Facts` 缓存）③SSH 连接复用（`ssh pipelining`/`ControlPersist`）④异步执行（`async`/`poll`）⑤优化 `Inventory`/分组（`--limit`）⑥用 `serial` 分批。核心：减少重复 SSH 开销 + 并行化 + 按需采集。**  
    - **① 提升并发（forks）**
        - `-f N`/`forks = N` 调大并发主机数（默认 5），配合控制机资源
        - 作用：多主机同时执行，缩短总耗时

    - **② 控制 `Facts` 采集**
        - `gather_facts: no`：任务不需要 `Facts` 时跳过采集（大幅提速）
        - `Facts` 缓存：`fact_caching = redis/jsonfile`，跨 `Play` 复用
        - `gather_subset: minimal`：只采必要子集

    - **③ SSH 连接复用/优化**
        - `ssh_pipelining = True`：减少 SSH 往返（一次连接执行串联命令）
        - SSH ControlPersist：`ControlPersist=600s` 复用连接
        - `ssh_args`：`-o ControlMaster=auto -o ControlPersist=60s`（示例值可按需调整）
        - 减少连接开销（大量主机时 SSH 建立是主要耗时）

    - **④ 异步/后台执行**
        - `async: N` + `poll: M`：长任务异步执行（不阻塞），定期轮询
        - 适合：长耗时任务（重启/大文件拷贝）异步化，释放控制机

    - **⑤ 执行策略与范围控制**
        - `strategy: free`：主机独立推进（不等最慢的）
        - `--limit`：只对目标子集执行（分批）
        - `--serial`：分批滚动（配合发布）

    - **⑥ 其他优化**
        - 使用 `Role`/模块化（减少重复逻辑）
        - 用 `--check`/`--diff` 预演减少误操作
        - 控制机规格：forks 多时 CPU/内存要够
        - 网络优化：控制机靠近目标（内网/同区域）

- **协助记忆**
    - 提速口诀："并发 `forks`、关 `Facts`、`SSH` 复用（`pipelining`）、异步 `async`、控制范围（`limit`/`serial`）"。
    - 本质："减少 SSH 往返 + 并行化 + 按需采集"。

- **进阶思考**
    - **为什么 `ssh pipelining` 能提速？**
        - 默认 `Ansible` 执行需多次 SSH（传模块文件 → 执行 → 回收），往返慢。`ssh_pipelining` 让模块通过一条 SSH 管道直接执行（少传临时文件、少往返），尤其大量主机时显著提速。启用前提：目标机 sudo 关闭 `requiretty`（与 AllowTcpForwarding 无关）。
    - **`async` 异步和默认同步有什么区别？**
        - 同步：等任务完成（控制机阻塞）。异步（`async` + `poll`）：任务丢到后台，控制机不阻塞（`poll: 0` 完全不管，定期查 `async_status`）。长任务（如 yum 大安装、重启）用异步可提升整体效率。
    - **Facts 缓存为什么能大幅提速？**
        - 每个 `Play` 默认都采集 `Facts`（一次 SSH + `setup` 模块），大量主机时开销大。缓存（redis/jsonfile）后后续 `Play` 直接读缓存，免去重复采集——尤其多 `Playbook` 连环执行时提速明显。

- **扩展信息**
    - **ansible.cfg 优化片段**：
        ```ini
        [defaults]
        forks = 50
        gather_facts = False        # 全局默认关（需要时再开）
        ssh_pipelining = True
        [ssh_connection]
        ssh_args = -o ControlMaster=auto -o ControlPersist=600s        ```
    - **Facts 缓存配置**：`fact_caching = redis` / `fact_caching_timeout = 3600`（等）
## 🤔 Ansible 有哪些常用的模块？  
- **Ansible 常用模块覆盖：基础（`ping`/`command`/`shell`/`script`/`copy`/`fetch`）、软件包（`yum`/`apt`/`dnf`/`pip`）、服务（`service`/`systemd`）、文件（`file`/`template`/`lineinfile`/`synchronize`）、用户（`user`/`group`）、系统（`cron`/`mount`/`sysctl`）、网络（`uri`/`get_url`）、Git（`git`）、容器（`docker_*`/`kubernetes`）、云（`ec2` 等）。核心：按任务类型选用模块，体现"幂等 + 声明式"。**  
    - **基础/命令模块**
        - `ping`：连通性测试（不是 ICMP，是模块探测）
        - `command`：执行命令（不开 shell，不支持管道/通配符）
        - `shell`：执行 shell 命令（支持管道/重定向/通配符）
        - `script`：把本地脚本传到目标执行
        - `copy`：复制文件（本地→目标，可设属主/权限）
        - `fetch`：拉取目标文件到本地（相反方向）

    - **软件包模块**
        - `yum`/`dnf`（RHEL 系，`ansible-core` 已将 `yum` 模块重定向至 `dnf`，推荐用 `dnf`）、`apt`（Ubuntu/Debian）、`pip`（Python 包）
        - 幂等：`state: present/absent`（已装就不重装）；`latest` 会检查并升级到最新（每次可能变更）

    - **服务模块**
        - `service`（通用服务）/`systemd`（systemd 服务）：`state: started/stopped/restarted/reloaded`

    - **文件模块**
        - `file`：文件/目录管理（创建、权限、软链）
        - `template`：渲染 `Jinja2` 模板到目标
        - `lineinfile`：确保文件中某行存在/替换（配置管理）
        - `synchronize`：rsync 同步（大目录复制优）

    - **用户与系统模块**
        - `user`/`group`：用户/组管理
        - `cron`：定时任务管理
        - `mount`：挂载管理
        - `sysctl`：内核参数

    - **网络/应用模块**
        - `uri`：HTTP 请求（测试 URL/调用 API）
        - `get_url`：下载文件（wget/curl 类）
        - `git`：Git 仓库 checkout/部署
        - `docker_container`/`docker_image`：Docker 容器管理
        - `k8s`：Kubernetes 资源管理（K8s 编排）

- **协助记忆**
    - 模块口诀："ping 测连、command/shell 跑命令、copy/template 放文件、yum/apt 装包、service 起服务、user 管用户"。
    - 选模块："按任务类型选，多用幂等模块（state 声明）"。

- **进阶思考**
    - **`command` 和 `shell` 模块的区别？**
        - `command`：直接执行命令（不经 shell，不支持 `|`、`>`、`&&`、通配符、变量展开），更安全可控。`shell`：通过 shell 执行（支持管道/重定向/通配符/环境变量），灵活但需注意注入。默认优先用 `command`，需要 shell 特性才用 `shell`。
    - **为什么推荐用"声明式模块"而不是 `command`（如 yum install vs `yum` 模块）？**
        - 声明式模块（`yum` 模块 `state: present`）幂等：已装不重装（返回 ok）；用 `command yum install` 每次都会执行并可能报错。所以"能用专门模块就用专门模块"，这是 `Ansible` 最佳实践。
    - **`copy` 和 `synchronize` 怎么选？**
        - `copy`：单文件/小文件（简单、幂等）；`synchronize`：大批量目录同步（基于 rsync，高效增量）。目录/大量文件用 synchronize，单文件用 copy。

- **扩展信息**
    - **查看模块文档**：`ansible-doc <module>`（如 `ansible-doc copy`）
    - **模块分类（官方）**：文件、命令、软件包、服务、用户、网络、云、容器、数据库、消息等

## 🤔 Ansible 如何实现应用灰度发布？  
- **Ansible 实现应用灰度发布（金丝雀）的核心：用 `--limit`/`--serial` 控制发布范围与节奏——①分批发布（`--limit` 指定灰度组/`--serial` 分批滚动）②先灰度节点验证（部署到少量主机 → 检查健康 → 再扩大）③配合健康检查/回滚（验证失败 rollback 到上一版本）。思路："小批量验证 + 逐步扩大 + 可回滚"。**  
    - **灰度发布思路**
        - 不一次全量发布（风险大），先让部分节点（批次/灰度组）上新版本
        - 验证无误再扩大范围，异常快速回滚（只影响灰度部分）
        - `Ansible` 通过 `inventory` 分组 + `limit` 控制范围

    - **实现方式一：Inventory 分组 + --limit（按组灰度）**
        ```bash
        # inventory: [canary] 灰度组、[web] 全量组
        ansible-playbook deploy.yml --limit canary     # 先只发布灰度组
        # 验证 OK 后：
        ansible-playbook deploy.yml --limit web        # 再发布全量
        ```

    - **实现方式二：--serial 滚动（按百分比/数量分批）**
        ```bash
        ansible-playbook deploy.yml --serial "10%"    # 每批 10% 节点
        ansible-playbook deploy.yml --serial 5        # 每批 5 台
        # 注：--serial 批次间自动连续，本身不暂停、也无内置健康检查；
        # 需在 Playbook 内显式加 pause/健康检查任务实现"验完再继续"，批次内失败会中止
        ```
        - 进阶：`serial: [1, 2, 5]`（递增批次：先 1 台再 2 台再 5 台）、`max_fail_percentage`（失败比例控制）

    - **实现方式三：Playbook 内控制（when + 主机分组变量）**
        ```yaml
        - hosts: web
          tasks:
            - name: 部署新版本
              ...
              when: inventory_hostname in groups['canary']
        ```

    - **完整流程（推荐）**
        ```
        1. 构建新版本产物（代码/镜像）
        2. 灰度组（如 1~5 台/10%）发布新版本
        3. 验证：健康检查/业务验证/监控指标
        4. 验证通过 → 扩大范围（50% → 100%）
        5. 验证失败 → 回滚（部署上一版本/切回旧流量）
        ```

    - **配合手段**
        - 健康检查任务（验证部署后服务可用）
        - 备份/版本保留（回滚用旧产物）
        - 与负载均衡/网关配合：新版本切流量百分比
        - 监控告警：发布后观察错误率/延迟

- **协助记忆**
    - Ansible 灰度口诀："`--limit` 控制范围、`--serial` 分批滚动、先小后大、可回滚"。
    - 流程："灰度组 → 验证 → 扩大 → 回滚兜底"。

- **进阶思考**
    - **`--serial` 和 `--limit` 在灰度中的区别？**
        - `--serial`：把主机按批次有序滚动（一批验证后下一批，自动连续）；`--limit`：指定具体范围（如灰度组），手动控制发布节奏（先灰度组，验证后再全量）。用 `--limit` 分阶段更灵活（中间可插入验证步骤）。
    - **如何自动"验证失败就回滚"？**
        - 发布后加健康检查任务（如 `uri` 探测/`wait_for` 端口/脚本验证），失败则触发回滚 `Playbook`（部署旧版本）。纯 `Ansible` 手动控制较多，复杂发布常用 CI/CD + 监控系统自动决策。
    - **Ansible 灰度发布和 K8s 灰度（金丝雀）的区别？**
        - Ansible 灰度：主机级（逐台/逐批替换，跑 `Playbook`），适合传统 VM/物理机应用。K8s 灰度：Pod 级（`Deployment` 多版本 + 流量切分，更精细）。云原生环境（K8s）用 K8s 原生灰度更合适，`Ansible` 常用于传统基础设施。

- **扩展信息**
    - **相关命令**：`--limit`、`--serial`、`--tags`、`--check`（预演）、`--diff`（差异）
    - **配合工具**：监控（健康检查）、CI/CD（构建+触发）、负载均衡（批次摘挂）
## 🤔 Ansible 与 Terraform 有什么区别？  
- **Ansible 与 Terraform 的核心区别：①定位（`Ansible`=配置管理/编排，`Terraform`=基础设施 provisioning IaC）②状态管理（`Ansible` 无中央 state、面向"当前状态"，`Terraform` 有 state 文件、面向"期望状态即代码"）③执行（`Ansible` 幂等模块逐任务，`Terraform` plan/apply 按差异收敛）④领域（`Ansible` 软件/服务配置，`Terraform` 云资源/基础设施）。实际常配合使用：`Terraform` 建基础设施，`Ansible` 配软件。**  
    - **Terraform（基础设施即代码 IaC）**
        - 定位：创建/管理基础设施资源（云主机、网络、存储、负载均衡）
        - 声明式：用 `HCL` 声明完整期望状态，`terraform plan` 预览、`apply` 按差异收敛
        - 有 state：`.tfstate` 记录资源状态，增量变更
        - 幂等：声明状态，只创建/修改差异部分

    - **Ansible（配置管理/自动化）**
        - 定位：在已有主机上配置/部署/编排（装软件、配服务、发应用）
        - 执行式模块：逐任务在主机上执行（幂等）
        - 无中央 state：面向"主机当前状态"（每次执行都核对）
        - 主要面向软件/服务层，不擅长管理云资源生命周期

    - **核心对比**
        | 维度 | `Ansible` | `Terraform` |
        |------|---------|-----------|
        | 定位 | 配置管理/编排 | 基础设施即代码（provisioning） |
        | 对象 | 软件/服务/应用 | 云资源/基础设施 |
        | 声明方式 | 任务式（逐任务） | 资源声明（`HCL`，全量） |
        | 状态 | 无中央 state | `state` 文件（`.tfstate`） |
        | 幂等 | 模块幂等 | 声明状态增量 |
        | 执行 | 逐任务跑 | `plan` → `apply`（按差异收敛） |
        | 网络 | `SSH`（推送） | API（云厂商） |

    - **为什么互补（不是替代）**
        - `Terraform` 建好基础设施（VM/网络/存储）→ `Ansible` 在上面配置软件/发布
        - 常见组合：`Terraform` 创建 VM → `provisioner`/`Ansible` 配置应用
        - 也有重叠（`Terraform` 也能跑命令但 `provisioner` 是"最后手段"，官方优先推荐 `cloud-init`/`Ansible` 做配置；`Ansible` 也能建云资源），但各有所长，配合最佳

- **协助记忆**
    - 对比口诀："`Terraform` 造房子（基础设施/云资源），`Ansible` 装修（配软件/发应用）"。
    - 一句话："`Terraform` 管资源声明（state），`Ansible` 管主机配置（任务）——先建后配"。

- **进阶思考**
    - **为什么 Terraform 需要 state 文件而 Ansible 不需要？**
        - `Terraform` 管理"资源对象"（云资源有生命周期，需追踪状态做增量/删除）；state 记录已建资源，`plan` 对比 state+代码+`provider` API 刷新（refresh 真实资源属性）判断增删改。`Ansible` 管理"主机上的配置"（无资源生命周期，每次执行直接核对当前状态，无需 state）。
    - **什么时候用 Terraform，什么时候用 Ansible？**
        - 建资源（VM/网络/数据库/负载均衡）→ `Terraform`；已有资源上装软件/配服务/部署应用 → `Ansible`。也可：`Terraform` 创建主机 + `provisioner` 调用 `Ansible` 配软件（组合拳）。
    - **Terraform 和 Ansible 都会"幂等"，机制有什么不同？**
        - `Terraform`：声明期望状态 → 对比 state → 只改差异（资源级幂等）。`Ansible`：模块在每个主机上执行并判断当前状态（任务级幂等，如"已装就不装"）。方向不同：`Terraform` 面向"资源清单"，`Ansible` 面向"主机操作"。

- **扩展信息**
    - **Terraform 概念**：`HCL`、`state`、`provider`（云厂商插件）、`resource`/`data source`、`plan`/`apply`/`destroy`
    - **Ansible 概念**：`Module`、`Playbook`、`Role`、`Inventory`、`Facts`
    - **工具生态**：`Pulumi`（类 Terraform 的 IaC）、Chef/Puppet（配置管理同类）

## 🤔 简述 Terraform 工作原理？  
- **Terraform 是"基础设施即代码（IaC）"工具：用 HCL 声明式描述期望的基础设施资源（云主机/网络/存储），Terraform 对比"代码声明的期望状态"与"state 文件记录的实际状态"，生成执行计划（plan），再编排调用各云厂商 API 创建/修改/删除资源使实际状态收敛到期望状态。核心流程：写配置 → init → plan → apply →（state 记录）→ destroy。**  
    - **核心概念**
        - **HCL（HashiCorp Configuration Language）**：声明资源的配置语言（`.tf` 文件）
        - **Resource（资源）**：声明要管理的具体资源（`aws_instance`、`azurerm_virtual_machine`）
        - **Provider（提供商）**：云厂商/平台插件（AWS、Azure、阿里云），Terraform 通过它调用 API
        - **State（状态文件 .tfstate）**：记录当前已管理的资源状态（Terraform 的核心）
        - **Data Source（数据源）**：读取已有资源信息（不创建）

    - **工作原理（核心流程）**
        ```
        1. 写配置（HCL）：声明资源的期望状态（如创建 2 台 AWS EC2）
        2. terraform init：初始化（下载 provider、初始化后端）
        3. terraform plan：对比"期望（HCL）"vs"实际（state）"，生成执行计划（要创建/修改/删除什么）
        4. terraform apply：按计划调用 provider API 实际创建/修改资源
        5. 更新 state：记录新资源状态
        6. terraform destroy：按需删除资源（资源生命周期管理）
        ```

    - **工作示例**
        ```hcl
        # main.tf
        provider "aws" { region = "us-east-1" }

        resource "aws_instance" "web" {
          ami           = "ami-xxx"
          instance_type = "t3.micro"
          tags = { Name = "web-server" }
        }
        ```
        ```bash
        terraform init                       # 初始化
        terraform plan                       # 预览执行计划
        terraform apply                      # 应用（创建资源）
        terraform state list                 # 查看 state
        ```

    - **核心机制（为什么安全/可预测）**
        - **声明式**：描述"要什么"而非"怎么建"，代码即基础设施
        - **计划先行**：plan 对比期望（HCL）与 state + provider refresh 后生成计划（先看将做什么，不直接改），可审阅
        - **State 管理**：记录实际资源，支持增量变更/删除
        - **幂等/收敛**：重复 apply 状态一致（已存在的不重建）

- **协助记忆**
    - Terraform 流程口诀："写配置 → init → plan（看计划）→ apply（动手）→ state（记账）"。
    - 核心："HCL 声明期望，state 记实际，plan 对比，apply 收敛"。

- **进阶思考**
    - **State 文件为什么重要（丢了会怎样）？**
        - state 记录哪些资源由 Terraform 管理。丢了：Terraform 视资源未纳管（plan 显示"将新建"），同名资源通常触发云厂商冲突报错而非静默重复创建（可用 import 补救）。所以 state 要放远端（S3/Terraform Cloud backend）并加锁（防并发），团队协作必须远端共享。Terraform 1.5+ 也支持配置内 `import` block 导入。
    - **Terraform plan 和 apply 的区别？**
        - plan：只读对比（期望 vs state，含 provider API refresh 真实状态）生成计划，不实际改动（安全预览/审阅）；apply：按计划实际调用 API 创建/修改/删除。实践：先看 plan 确认，再 apply。
    - **Terraform 怎么管理"已有资源"（不是它建的）？**
        - 用 `terraform import` 导入已有资源到 state（纳入管理），或写 data source 只读引用（不纳入管理）。标准做法：新资源用 HCL 声明，已有资源选择性 import。

- **扩展信息**
    - **Terraform 进阶**：
        - Backend（远端 state：S3/Terraform Cloud）、Workspace（环境隔离）、Module（可复用模块）、远端 State 锁
        - Terraform Cloud/Enterprise（托管、策略、VCS 集成）
    - **与 Ansible 配合**：Terraform 建资源 + `remote-exec` provisioner 或 Ansible 配软件

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-ansible%E8%87%AA%E5%8A%A8%E5%8C%96/  

