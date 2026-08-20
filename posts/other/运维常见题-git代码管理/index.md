# 运维常见题-Git代码管理


## 🤔 Git 和 SVN 的区别有哪些？  
- **核心区别：Git 是分布式版本控制系统（每个开发者本地都有完整仓库），SVN 是集中式版本控制系统（依赖中央服务器）。这个架构差异导致了分支模型、离线能力、提交速度、数据安全性等一系列区别。**  
    - **架构差异**
        - **Git（分布式）**：每个开发者本地都有完整的仓库历史（.git 目录），可以在本地提交、查看历史、创建分支，不依赖网络
        - **SVN（集中式）**：只在中央服务器保存完整历史，开发者本地只有工作副本，提交/查看历史都必须连接服务器

    - **核心差异对比**
        - **分支模型**：Git 分支极其轻量（本质是指针），创建/切换/合并几乎瞬间完成；SVN 分支是目录拷贝，开销大、合并困难
        - **离线能力**：Git 完全支持离线操作（提交、查看日志、创建分支）；SVN 离线基本无法工作
        - **提交速度**：Git 本地提交极快；SVN 提交需网络往返，延迟随服务器距离增大
        - **数据安全性**：Git 每个节点都有完整备份，服务器挂了可从任一节点恢复；SVN 服务器挂了，本地只有工作副本无历史
        - **寻址方式**：Git 按内容寻址（SHA-1 哈希，正在向 SHA-256 迁移），使历史篡改极难且可检测；SVN 按递增版本号（r1、r2...）
        - **冲突解决**：Git 合并冲突在本地解决；SVN 在提交时发现冲突

    - **工作模型**
        - Git：`修改 → 暂存（add）→ 提交（commit）→ 推送（push）`，有暂存区（Staging Area）
        - SVN：`修改 → 提交（commit）`，直接提交到中央服务器，无暂存区

- **协助记忆**
    - SVN 是"单点图书馆"：所有书在中央图书馆，借书还书都要去那里（在线）；Git 是"每人家里都有图书馆副本"：自己先记笔记（本地提交），想分享了再复印寄给别人（push）。
    - 核心区别一句话：SVN 集中式=依赖服务器，Git 分布式=人人有备份。

- **进阶思考**
    - **SVN 已经被淘汰了吗？还有什么场景用 SVN？**
        - SVN 未完全淘汰，在大型二进制文件管理（游戏美术资源、设计文件）和部分企业遗留系统中仍在使用。SVN 的部分拷贝（sparse checkout）和锁定机制对二进制文件友好，Git LFS 虽可处理大文件但仍有学习成本。
    - **Git 的分布式架构有什么代价？**
        - ①学习曲线较陡（概念多：暂存区、HEAD、分支模型）；②本地 .git 目录占用空间（需 clone 完整历史）；③大文件处理不佳（需 Git LFS）；④权限控制粒度粗（SVN 可按目录设权限，Git 难以做到）。

## 🤔 Git 的工作区、暂存区和本地仓库分别是什么？三者流转关系？  
- **Git 的核心数据模型是"三区架构"：工作区（Working Directory）是你直接编辑文件的地方；暂存区（Staging Area / Index）是"下次提交的预览"，记录了哪些修改要提交；本地仓库（Local Repository / .git）是提交历史的存储，保存了所有已提交的快照。理解三区流转是理解 Git 的基础。**  
    - **三个区域**
        - **工作区（Working Directory）**：项目目录下的实际文件，开发者直接编辑的地方
        - **暂存区（Staging Area / Index）**：`.git/index` 文件，记录了"下次提交要包含哪些修改"，是工作区和仓库之间的缓冲层
        - **本地仓库（Local Repository / .git）**：`.git/` 目录，保存了所有提交历史（Commit 对象）、分支指针、HEAD 等元数据

    - **三区流转关系**
        - `工作区 → 暂存区`：`git add <file>`（将修改添加到暂存区）
        - `暂存区 → 本地仓库`：`git commit -m "msg"`（将暂存区内容创建一个新的提交快照）
        - `本地仓库 → 工作区`：`git switch`（切换分支，2.23+ 推荐）/ `git checkout`（旧命令，仍可用）/ `git restore`（恢复文件到特定版本）
        - `暂存区 → 工作区`：`git restore --staged <file>`（取消暂存，把文件从暂存区移回工作区）
        - `本地仓库 → 远程仓库`：`git push`（推送本地提交到远程）
        - `远程仓库 → 本地仓库`：`git pull` / `git fetch`（拉取远程更新）

    - **数据流图**
        ```
        工作区（Working Directory）
          │ git add (→)          │ git restore ← 暂存区
          ↓
        暂存区（Staging Area / .git/index）
          │ git commit (→)       │ git restore --staged ← 本地仓库
          ↓
        本地仓库（.git/）
          │ git push (→)         │ git pull/fetch ← 远程仓库
          ↓
        远程仓库（Remote Repository）
        ```
        - 箭头方向：`add`/`commit`/`push` 向右/下推进，`restore`/`fetch` 向左/上回退

- **协助记忆**
    - 工作区 = "厨房"（做菜的地方），暂存区 = "传菜窗口"（菜做好了放这里等上桌），仓库 = "上桌的菜"（提交了就是正式记录）。
    - `git add` = 从厨房端到传菜窗口，`git commit` = 从窗口端上桌，`git push` = 把桌上的菜拍照发朋友圈（共享到远程）。
    - 一句话：add 是"选菜"，commit 是"上桌"，push 是"分享"。

- **进阶思考**
    - **为什么 Git 要设计暂存区？直接从工作区提交不行吗？**
        - 暂存区的价值：①精确控制提交内容（可以只 add 部分修改，实现"原子提交"）；②提交前预览（`git diff --cached` 看暂存区内容）；③大修改分批提交（逻辑清晰、便于 code review）。SVN 没有暂存区，所有修改一次性提交，粒度控制困难。
    - **`git commit -a` 跳过暂存区直接提交，和手动 add + commit 有什么区别？**
        - `git commit -a` 等价于先 `git add` 所有已跟踪文件的修改再 commit，但**不会添加新文件**（未跟踪的文件仍需手动 `git add`）。所以它简化了流程但不完全等价——新增文件仍需手动 add。

- **扩展信息**
    - **常用状态查看命令**：
        - `git status`：查看工作区和暂存区状态（哪些文件修改/暂存/未跟踪）
        - `git diff`：工作区 vs 暂存区的差异（未暂存的修改）
        - `git diff --cached`：暂存区 vs 最新提交的差异（即将提交的内容）
        - `git log --oneline`：查看提交历史
    - **Git 对象模型（进阶）**：
        - Git 底层用三种对象存储数据：`blob`（文件内容）、`tree`（目录结构）、`commit`（提交快照 + 元数据）
        - 所有对象按 SHA-1 哈希寻址，存放在 `.git/objects/` 目录
        - 理解对象模型有助于理解分支（指向 commit 的指针）、合并、rebase 等高级操作
## 🤔 git fetch 和 git pull 的区别是什么？  
- **核心区别：`git fetch` 是"只下载不合并"——从远程获取更新到本地仓库（更新远程跟踪分支如 `origin/main`），但不影响工作区；`git pull` 是"下载并合并"——等价于 `git fetch` + `git merge`（或 `git rebase`，取决于配置）。fetch 是安全的只读操作，pull 会改变当前分支。**  
    - **git fetch**
        - 从远程仓库获取最新数据，更新本地的远程跟踪分支（如 `origin/main`）
        - 不会修改工作区、暂存区或本地分支，完全安全
        - 用途：查看远程有什么变化（`git log origin/main`），再决定是否合并

    - **git pull**
        - 默认：`git fetch` + `git merge origin/<branch>`（将远程更新合并到当前分支）
        - 可配置为 rebase 模式：`git pull --rebase`（`git fetch` + `git rebase`），保持线性历史
        - 会直接修改工作区和当前分支，可能产生冲突

    - **对比速查**
        | 维度 | `git fetch` | `git pull` |
        |------|-----------|----------|
        | 下载远程数据 | ✅ | ✅（先 fetch） |
        | 修改工作区 | ❌ | ✅（merge/rebase） |
        | 修改当前分支 | ❌ | ✅ |
        | 安全性 | 只读，安全 | 可能产生冲突 |
        | 等价操作 | — | `fetch` + `merge`（或 `rebase`） |

    - **推荐用法**
        - 团队协作推荐 `fetch` + 手动 `merge`/`rebase`，先看清变化再合并
        - `pull --rebase` 比默认 `pull`（merge）更常用，避免无意义的 merge commit
        - 简单场景直接 `pull` 也可，但要理解它会改变当前分支

- **协助记忆**
    - `fetch` = "看看快递到了没"（下载但不开箱）；`pull` = "看看快递到了没，顺便开箱用上"（下载并合并）。
    - 安全策略：先 `fetch` 看变化（`git log HEAD..origin/main`），确认无误再 `merge`/`rebase`。

- **进阶思考**
    - **`git pull` 和 `git pull --rebase` 有什么区别？该用哪个？**
        - `git pull`（默认 merge）：产生一个 merge commit，保留分支合并历史，但历史图复杂
        - `git pull --rebase`：把本地提交"搬到"远程最新提交之后，保持线性历史，无多余的 merge commit
        - 推荐：个人分支/feature 分支用 `pull --rebase`（线性历史更清晰）；共享分支（如 main）用 `pull`（保留合并记录）。
    - **为什么有人说"永远不要用 git pull"？**
        - `pull` 默认行为（merge）在多人协作时容易产生复杂的 merge 历史；`pull --rebase` 又可能在 rebase 过程中产生冲突且处理方式与 merge 不同。安全做法是 `fetch` → 查看变化 → 手动 `merge`/`rebase`，每一步可控。

- **扩展信息**
    - **配置默认 pull 行为**：
        ```bash
        git config --global pull.rebase true   # 全局默认 --rebase
        git config --global pull.ff only       # 只在快进时合并，否则报错（最安全）
        ```
    - **查看远程变化（fetch 后）**：
        ```bash
        git fetch origin
        git log --oneline HEAD..origin/main   # 查看远程多了哪些提交
        git diff HEAD..origin/main            # 查看具体改动
        ```

## 🤔 Git 如何解决分支合并冲突？  
- **合并冲突（Merge Conflict）发生在两个分支修改了同一文件的同一位置，Git 无法自动决定保留哪个。解决流程：发现冲突 → 手动编辑冲突文件 → `git add` 标记解决 → `git commit` 完成合并。理解冲突标记（`<<<<<<<`/`=======`/`>>>>>>>`）是关键。**  
    - **冲突是怎么产生的**
        - `git merge <branch>`（或 `git rebase`）时，Git 尝试自动合并两个分支的修改
        - 如果同一文件的同一区域（行）被两个分支都修改了，Git 无法判断保留哪个，标记为冲突
        - 不同文件的修改、同一文件不同区域的修改，Git 可以自动合并，不冲突

    - **冲突标记（Conflict Markers）**
        ```
        <<<<<<< HEAD
        当前分支（HEAD）的内容
        =======
        合并分支的内容
        >>>>>>> feature-branch
        ```
        - `<<<<<<< HEAD` 到 `=======` 之间：当前分支的内容
        - `=======` 到 `>>>>>>> branch` 之间：要合并的分支的内容
        - 解决：手动选择保留哪个（或合并两者），然后删除冲突标记

    - **解决步骤**
        1. `git merge feature`（触发合并，遇到冲突会暂停）
        2. `git status`（查看哪些文件有冲突，标记为 `both modified`）
        3. 编辑冲突文件，手动选择/合并内容，删除冲突标记
        4. `git add <冲突文件>`（标记为已解决）
        5. `git commit`（完成合并，自动生成 merge commit）
        - rebase 冲突解决类似，但用 `git rebase --continue` 代替 `git commit`

    - **放弃合并**
        - `git merge --abort`：放弃当前 merge，回到合并前状态
        - `git rebase --abort`：放弃当前 rebase，回到 rebase 前状态
        - 这是"合并搞砸了"时的安全回退按钮

    - **合并工具**
        - `git mergetool`：启动配置的合并工具（如 VS Code、vimdiff、Beyond Compare）
        - VS Code 内置合并编辑器：点击 "Current Change" / "Incoming Change" / "Accept Both" 直观解决
        - 推荐新手用图形化工具，避免手动编辑冲突标记出错

- **协助记忆**
    - 冲突 = "两个人同时改了同一篇作文的同一段"，Git 没法帮你选，必须自己决定保留哪个版本。
    - 解决四步：编辑冲突 → `git add` → `git commit`；搞砸了 `git merge --abort` 重来。

- **进阶思考**
    - **merge 和 rebase 产生冲突有什么区别？**
        - merge 冲突：一次性解决所有冲突（所有文件冲突在一个 commit 里），解决后 `git commit`
        - rebase 冲突：逐个提交解决（每个被 rebase 的 commit 都可能单独冲突），解决后 `git rebase --continue`，冲突更多但每次更小
        - 复杂分支 rebase 可能冲突很多次，建议用 merge（一次性解决更简单）
    - **如何预防冲突？**
        - ①频繁合并（每天/每周 pull 主分支，减少积累差异）；②小批量提交（每次修改范围小，冲突概率低）；③团队沟通（避免多人同时改同一文件）；④用 `.gitattributes` 标记二进制文件（避免二进制文件被当作文本合并）。

- **扩展信息**
    - **merge 三种模式**：
        - `git merge <branch>`：默认三方合并（three-way merge），产生 merge commit
        - `git merge --squash <branch>`：压缩合并（把对方分支所有提交压成一个 commit），需手动 `git commit`，不保留原始分支的合并记录
        - `git merge --ff-only <branch>`：仅在快进时合并（对方分支是当前分支的直接后继），否则报错
    - **git rerere（记住冲突解决方案）**：
        - `git config rerere.enabled true`：开启后 Git 会记住冲突解决方案，下次遇到相同冲突自动应用——减少重复劳动
## 🤔 项目开发中常用的分支有哪些？各有什么作用？  
- **Git 分支策略没有唯一标准，但业界有几种成熟模型：`Git Flow`（完整五类分支，适合有明确发版周期的项目）、`GitHub Flow`（只有 main + feature，适合持续部署）、`GitLab Flow`（main + 环境分支，适合多环境部署）。选型核心："团队规模 × 发版频率 × 部署复杂度"决定分支复杂度。**  
    - **Git Flow（最经典的分支模型，Vincent Driessen 提出）**
        - `main`（或 `master`）：生产分支，始终是线上运行的稳定版本，只能通过 merge 进入
        - `develop`：开发集成分支，所有 feature 分支合并到这里，代表最新开发状态
        - `feature/*`：功能分支，从 develop 拉出，开发完合并回 develop，命名如 `feature/user-login`
        - `release/*`：发布分支，从 develop 拉出，做发布前的测试/修复，完成后同时合并到 main 和 develop
        - `hotfix/*`：热修复分支，从 main 拉出，紧急修复生产问题，完成后同时合并到 main 和 develop
        - 适用场景：有明确版本号、发版周期较长、需要同时维护多个版本的项目

    - **GitHub Flow（极简模型）**
        - 只有 `main`（或 `master`）+ `feature` 分支
        - 所有开发在 feature 分支进行，通过 Pull Request 合并到 main
        - main 始终可部署，合并后自动发布
        - 适用场景：持续部署（CI/CD）、SaaS 产品、小团队快速迭代

    - **GitLab Flow（环境分支模型）**
        - `main` + `production`（生产）+ `staging`（预发布）+ `development`（开发）
        - 代码从 development → staging → production 逐环境推进
        - 适用场景：多环境部署（开发/测试/预发布/生产），需要环境隔离

    - **分支命名规范（通用建议）**
        - `feature/功能描述`：新功能
        - `bugfix/问题描述`：Bug 修复
        - `hotfix/紧急问题`：生产紧急修复
        - `release/版本号`：发布准备
        - 命名建议用小写 + 短横线（`feature/user-login`），避免中文和特殊字符

- **协助记忆**
    - Git Flow = "五条线并行"（main/develop/feature/release/hotfix），适合大项目；GitHub Flow = "一条主线+短分支"，适合快速迭代；GitLab Flow = "环境分层推进"，适合多环境。
    - 分支命名口诀：功能用 feature、修复用 bugfix/hotfix、发布用 release。

- **进阶思考**
    - **什么时候该用 Git Flow，什么时候该用 GitHub Flow？**
        - Git Flow：有明确发版周期、需同时维护多个版本、团队较大（如传统软件、企业项目）
        - GitHub Flow：持续部署、SaaS 产品、小团队（feature → PR → merge → deploy，简单高效）
        - 核心判断："你有 develop 分支的需求吗？" ——如果主分支（main）始终可部署，不需要单独的 develop 集成分支，GitHub Flow 足够。
    - **Git Flow 中 hotfix 和 release 可以合并吗？**
        - 理论上可以，但语义不同：hotfix 是"紧急修复线上问题"，release 是"准备新版本发布"。如果团队小、发版频繁，可以简化为：紧急修复走 hotfix 直接到 main，新功能通过 feature → develop → main，省略 release 分支。

- **扩展信息**
    - **分支模型对比速查**：
        | 模型 | 分支数 | 适用场景 | 复杂度 |
        |------|--------|---------|--------|
        | Git Flow | 5 | 有版本号的传统项目 | 高 |
        | GitHub Flow | 2 | 持续部署/SaaS | 低 |
        | GitLab Flow | 3~4 | 多环境部署 | 中 |
    - **Trunk-Based Development（主干开发）**：另一种极端——所有开发直接在 main 上进行（或极短命的 feature 分支），频繁集成、持续部署，配合 feature flag 控制未完成功能。Google/Facebook 等大厂常用。

## 🤔 Git Hook 有哪些常用类型？有哪些应用场景？  
- **Git Hook 是 Git 内置的事件回调机制：在特定 Git 操作（如提交、推送、合并）前后自动触发用户自定义脚本。Hook 分客户端 Hook（本地执行）和服务端 Hook（服务器执行），是实现代码规范检查、自动化测试、CI/CD 触发的核心基础设施。**  
    - **客户端 Hook（本地，开发者机器上执行）**
        - `pre-commit`：提交前执行，最常用——代码风格检查（ESLint/Prettier）、单元测试、敏感信息检测
        - `prepare-commit-msg`：在提交消息编辑器打开前执行，可自动填充模板（如 JIRA 单号）
        - `commit-msg`：提交消息编辑后执行，验证提交消息格式（如 Conventional Commits 规范）
        - `post-commit`：提交完成后执行，触发本地通知/日志记录
        - `pre-push`：推送前执行，运行完整测试套件，防止推送有问题的代码
        - `pre-rebase`：rebase 前执行，可阻止对特定分支的 rebase

    - **服务端 Hook（服务器上执行，GitLab/GitHub 的 Webhook 可替代）**
        - `pre-receive`：接收推送前执行，最严格——可拒绝不符合规则的推送（如禁止 force push 到 main、禁止提交大文件）
        - `update`：每个引用（分支/tag）更新前执行，粒度比 pre-receive 更细
        - `post-receive`：推送完成后执行，触发 CI/CD 构建、发送通知、自动部署

    - **Hook 的实现方式**
        - 脚本文件：放在 `.git/hooks/` 目录下（默认不随仓库分发），shell/python/ruby 脚本均可
        - 前置条件：脚本文件必须有可执行权限（`chmod +x`）
        - 跳过 Hook：`git commit --no-verify`（跳过 `pre-commit`、`prepare-commit-msg`、`commit-msg` 三个 Hook），紧急情况可绕过

    - **常用工具（简化 Hook 管理）**
        - `husky`（Node.js 项目）：自动安装 Git Hook，配置简单，与 npm/yarn 集成
        - `pre-commit`（Python）：框架化管理多个 Hook，支持自定义检查器
        - `lefthook`：跨语言 Hook 管理工具，支持并行执行
        - 这些工具解决的核心问题：`.git/hooks/` 不随仓库分发，团队协作时需要统一 Hook 配置

- **协助记忆**
    - Git Hook = "Git 的自动化触发器"：提交前检查代码（pre-commit）、提交后验证格式（commit-msg）、推送前跑测试（pre-push）、推送后触发部署（post-receive）。
    - 客户端 Hook = "本地守门员"，服务端 Hook = "服务器门卫"；`--no-verify` 是紧急逃生通道。

- **进阶思考**
    - **pre-commit 检查太慢（跑全量测试），影响开发效率怎么办？**
        - 优化策略：①pre-commit 只跑快速检查（lint、格式化），慢测试放到 pre-push 或 CI；②用 `pre-commit` 框架的并行执行能力；③只检查本次修改的文件（`git diff --cached --name-only`），不检查全量；④设置超时（超时则跳过并警告）。
    - **服务端 Hook 和 GitLab/GitHub 的 Webhook 有什么区别？**
        - 服务端 Hook（如 `post-receive`）直接在 Git 服务器上执行，零延迟，但需要服务器端权限配置
        - Webhook（GitLab/GitHub）通过 HTTP 通知外部服务，更灵活（可对接 CI/CD、通知系统），但有网络延迟
        - 现代 CI/CD（GitLab CI、GitHub Actions）基本用 Webhook + Pipeline 替代了服务端 Hook

- **扩展信息**
    - **常用 Hook 配置示例（pre-commit，shell）**：
        ```bash
        #!/bin/bash
        # .git/hooks/pre-commit
        # 只对本次提交的文件运行 lint
        files=$(git diff --cached --name-only --diff-filter=ACMR | grep '\.py$')
        if [ -n "$files" ]; then
            pylint $files || { echo "Lint 失败，提交中止"; exit 1; }
        fi
        ```
    - **Conventional Commits 规范（配合 commit-msg Hook）**：
        - 格式：`<type>(<scope>): <description>`，如 `feat(auth): add login endpoint`、`fix(api): handle null response`
        - `commit-msg` Hook 可验证格式，强制团队遵循规范，便于自动生成 changelog
## 🤔 简述将代码提交到远程仓库的流程？  
- **将代码提交到远程仓库的标准流程：本地修改 → `git add` 暂存 → `git commit` 提交到本地仓库 → `git push` 推送到远程仓库。首次推送需先关联远程仓库（`git remote add`），并用 `-u` 设置上游分支。**  
    - **完整流程（首次提交）**
        ```bash
        # 1. 初始化或克隆
        git init                          # 新项目：初始化本地仓库
        # 或 git clone <url>             # 已有项目：克隆远程仓库

        # 2. 修改文件后，暂存并提交
        git add .                         # 暂存所有修改（或 git add <file> 指定文件）
        git commit -m "feat: 初始提交"   # 提交到本地仓库

        # 3. 关联远程仓库（首次）
        git remote add origin https://github.com/user/repo.git

        # 4. 推送到远程
        git push -u origin main          # -u 设置上游分支，后续直接 git push
        ```

    - **日常开发流程（已有远程仓库）**
        ```bash
        # 1. 拉取最新代码
        git pull origin main              # 或 git fetch + git merge

        # 2. 创建功能分支
        # 2. 创建功能分支（Git 2.23+ 推荐用 git switch）
        git switch -c feature/new-login    # 或 git checkout -b feature/new-login

        # 3. 开发并提交
        git add .
        git commit -m "feat: add login endpoint"

        # 4. 推送到远程
        git push -u origin feature/new-login

        # 5. 创建 Pull Request / Merge Request（在 GitLab/GitHub 上操作）
        # 6. Code Review + CI 通过后合并到 main
        # 7. 删除远程和本地的功能分支
        git push origin --delete feature/new-login
        git checkout main && git branch -d feature/new-login
        ```

    - **关键命令速查**
        | 命令 | 作用 |
        |------|------|
        | `git remote -v` | 查看已关联的远程仓库 |
        | `git push -u origin <branch>` | 推送并设置上游分支 |
        | `git push` | 推送到已设置的上游分支 |
        | `git pull` | 拉取远程更新并合并 |
        | `git fetch` | 只下载不合并 |
        | `git branch -r` | 查看远程分支 |

- **协助记忆**
    - 流程口诀："改（工作区）→ 存（add）→ 提（commit）→ 推（push）"，首次加"连（remote add）"。
    - 类比：写信 = 改（写内容）→ 存（装信封）→ 提（投入邮筒）→ 推（邮递员送走）。

- **进阶思考**
    - **`git push` 报错 `rejected (non-fast-forward)` 怎么解决？**
        - 原因：远程有本地没有的提交（别人先推了）。解决：`git pull --rebase origin main`（先拉取再推送），或 `git pull origin main`（产生 merge commit）。推荐 `pull --rebase` 保持线性历史。
    - **`git push --force` 和 `git push --force-with-lease` 有什么区别？**
        - `--force`：强制推送，覆盖远程历史，危险操作（可能丢失别人的工作）
        - `--force-with-lease`：只有在远程分支没有新提交时才允许强制推送，更安全——推荐用这个代替 `--force`
    - **为什么推送前建议先 pull？**
        - 避免 `non-fast-forward` 错误；先 pull 再 push 可以在本地解决冲突，而不是在远程产生冲突。养成 `git pull --rebase && git push` 的习惯。

- **扩展信息**
    - **Remote 管理命令**：
        ```bash
        git remote add <name> <url>      # 添加远程仓库
        git remote set-url origin <url>  # 修改远程 URL
        git remote remove <name>         # 删除远程仓库
        git remote prune origin          # 清理已删除的远程分支引用
        ```
    - **Push 相关安全配置**：
        ```bash
        git config --global push.default current   # 只推当前分支（默认行为）
        git config --global push.default simple    # 只推同名远程分支（更安全）
        ```

## 🤔 多人协同开发时，如何规范使用分支？  
- **分支规范的核心是"减少冲突、保证主分支稳定、让协作可追溯"。具体规范包括：分支命名统一、分支生命周期管理、PR/MR 流程、保护分支策略、合并方式约定。规范不是束缚，是让团队协作不混乱的基石。**  
    - **分支命名规范**
        - `feature/<功能描述>`：新功能，如 `feature/user-login`
        - `bugfix/<问题描述>`：Bug 修复，如 `bugfix/null-pointer-error`
        - `hotfix/<紧急问题>`：生产紧急修复，如 `hotfix/payment-timeout`
        - `release/<版本号>`：发布准备，如 `release/v2.1.0`
        - 命名建议：小写 + 短横线，简明描述改动内容

    - **分支生命周期管理**
        - 从主分支（main/develop）拉出功能分支，开发完合并回去，然后删除功能分支
        - 功能分支应短命（几天到一两周），避免长期不合并导致冲突积累
        - 定期从主分支同步更新到功能分支（`git pull --rebase origin main`），减少合并时冲突

    - **PR/MR 流程（Pull Request / Merge Request）**
        - 功能开发完成后，创建 PR/MR 请求合并到主分支
        - 流程：创建 PR → Code Review（至少一人审核）→ CI 自动测试通过 → 合并
        - 合并方式：`Squash merge`（压缩成一个 commit，保持主分支整洁）或 `Merge commit`（保留所有提交历史）
        - 合并后删除远程功能分支

    - **保护分支策略（Branch Protection）**
        - `main`/`develop` 设置为保护分支，禁止直接 push
        - 必须通过 PR/MR 合并，必须通过 CI 测试，必须至少 1 人 Code Review
        - 禁止 force push 到保护分支
        - GitLab/GitHub 前端配置：Settings → Repository → Protected Branches

    - **代码审查规范**
        - PR 标题和描述要清晰（改了什么、为什么改、怎么测的）
        - 审查重点：逻辑正确性、安全性、代码风格、测试覆盖
        - 通过后用 `Squash merge` 保持主分支历史干净（一个功能一个 commit）

- **协助记忆**
    - 分支规范五件事：命名（统一格式）、生命周期（短命分支）、PR 流程（Review+CI）、保护分支（禁止直推）、合并方式（Squash 更干净）。
    - 口诀："命名规范、分支短命、PR 审核、主干保护、Squash 合并"。

- **进阶思考**
    - **Squash merge 和普通 merge 该选哪个？**
        - Squash merge：把一个功能的所有 commit 压成一个，主分支历史干净，适合功能分支；缺点是丢失了分支的详细提交历史
        - 普通 merge：保留所有 commit 和 merge 记录，历史完整但可能杂乱
        - 建议：功能分支用 Squash merge（主分支干净），hotfix/release 用普通 merge（保留关键历史记录）。
    - **多人同时开发同一个功能怎么协作？**
        - 在同一个功能分支上协作（多人 push 到同一分支），或把大功能拆成多个子分支各自开发再合并到功能分支；推荐后者（子分支小、冲突少、review 范围小）。

- **扩展信息**
    - **GitLab/GitHub 分支保护配置要点**：
        - 要求 PR/MR 才能合并（禁止直接 push）
        - 要求 CI 流水线通过
        - 要求至少 N 人 Approve
        - 禁止 force push
        - 要求 Squash merge（可选）
    - **Conventional Commits 规范（提交消息规范）**：
        - 格式：`<type>(<scope>): <description>`
        - 类型：`feat`（新功能）、`fix`（修复）、`docs`（文档）、`style`（格式）、`refactor`（重构）、`test`（测试）、`chore`（杂项）
        - 用途：便于自动生成 changelog、自动化版本号（semantic versioning）
## 🤔 项目中如何配置忽略文件 .gitignore？  
- **`.gitignore` 文件告诉 Git "哪些文件/目录不需要被版本控制"，放在仓库根目录即可。核心价值：避免把临时文件、构建产物、敏感配置、依赖目录提交到仓库。语法支持通配符、目录匹配、取反规则。**  
    - **基本语法**
        - `*.log`：忽略所有 `.log` 文件
        - `node_modules/`：忽略 `node_modules` 目录（尾部 `/` 表示只匹配目录）
        - `/build`：只忽略根目录下的 `build`（前导 `/` 表示相对于 .gitignore 所在目录）
        - `!important.log`：取反，不忽略 `important.log`（即使 `*.log` 规则匹配）；注意取反限制：如果父目录已被忽略，无法用 `!` 重新包含其中的子文件——需先 `!` 取反父目录
        - `#` 开头：注释行
        - `**`：匹配多级目录，如 `**/temp` 匹配任意目录下的 `temp`，`a/**/b` 匹配 `a/b`、`a/x/b` 等

    - **常见忽略项（推荐模板）**
        ```gitignore
        # 依赖目录
        node_modules/
        vendor/
        __pycache__/
        .venv/

        # 构建产物
        build/
dist/
*.o
*.pyc

        # 环境配置（敏感信息）
        .env
        .env.local
        .env.production

        # 操作系统/IDE
        .DS_Store
        Thumbs.db
        .idea/
        .vscode/
        *.swp

        # 日志
        *.log
        logs/

        # 临时文件
        tmp/
        *.tmp
        ```

    - **重要注意事项**
        - `.gitignore` 只对**未跟踪文件**生效；已被 Git 跟踪的文件，即使加了 .gitignore 也不会自动忽略
        - 取消跟踪已提交的文件：`git rm --cached <file>`（不删除本地文件，只从 Git 中移除）
        - 全局忽略：`~/.gitignore_global`（`git config --global core.excludesfile ~/.gitignore_global`）
        - 仓库级 `.gitignore` 应提交到仓库，让所有协作者共享同一套忽略规则

    - **生成工具**
        - [gitignore.io](https://www.toptal.com/developers/gitignore)：根据项目类型自动生成 .gitignore 模板（输入 `node,python,macos` 即可）
        - GitHub 创建仓库时自动提供模板选择

- **协助记忆**
    - `.gitignore` = "Git 的黑名单"：告诉 Git "这些东西别管"。语法口诀：`*` 通配、`/` 目录、`!` 取反、`#` 注释。
    - 常见坑：已跟踪的文件 .gitignore 管不了，要用 `git rm --cached` 先解除跟踪。

- **进阶思考**
    - **`.gitignore` 和 `git rm --cached` 配合使用场景是什么？**
        - 典型场景：有人误提交了 `.env` 或 `node_modules/`，需要：①加 `.gitignore` 规则；②`git rm --cached -r .env` 从 Git 中移除（不删本地文件）；③`git commit` 提交更改。此后这些文件被忽略，但历史中的旧版本仍在（需用 filter-branch/BFG 清理历史）。
    - **`.gitignore` 和 `git clean` 有什么关系？**
        - `.gitignore` 控制"哪些文件不被跟踪"；`git clean -fdX` 删除工作区中所有被忽略的未跟踪文件（慎用）。两者互补：ignore 是"不跟踪"，clean 是"清理残留"。

- **扩展信息**
    - **`.gitignore` 规则优先级**：
        - 子目录的 `.gitignore` 规则优先于上级目录的规则（最靠近目标文件的规则优先）
        - `.git/info/exclude` 与 `.gitignore` 语法相同，但不随仓库分发（本地私有规则）
        - 全局 `core.excludesfile` 是最高优先级的忽略规则
    - **`.gitkeep` 的作用**：
        - Git 不追踪空目录，如果需要提交一个空目录，可在其中放一个 `.gitkeep` 文件（约定俗成，无特殊含义）
        - 与 `.gitignore` 无关，但常一起出现

## 🤔 当 GitLab 仓库出现大文件、仓库膨胀时，如何清理瘦身？  
- **Git 仓库膨胀的根源是"历史中存在大文件"——即使文件已被删除，Git 历史中仍保留。清理核心思路：①找到大文件 → ②从历史中移除 → ③GC 压缩 → ④强制推送 → ⑤所有人重新 clone。BFG Repo-Cleaner 是业界首选工具。**  
    - **为什么会膨胀**
        - `.git` 目录保存了所有历史数据，提交过大文件（如二进制包、数据集、视频）后，即使删除了文件，历史中仍有原始内容
        - `git clone` 时会下载完整历史，仓库越大 clone 越慢

    - **第一步：找到大文件**
        ```bash
        # 找出仓库中最大的 10 个对象
        git rev-list --objects --all |
          git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
          sed -n 's/^blob //p' |
          sort -rnk2 | head -10
        ```
        - 或用 `git-sizer` 工具（更直观）：`git-sizer --verbose`

    - **第二步：从历史中移除大文件**
        - **BFG Repo-Cleaner（推荐）**：
            ```bash
            # 安装 BFG（需 Java）
            java -jar bfg.jar --strip-blobs-bigger-than 10M repo.git
            # 或删除特定文件
            java -jar bfg.jar --delete-files "*.mp4" repo.git
            ```
            - BFG 比 `git filter-branch` 快 10~720 倍，且更安全
        - **git filter-repo（官方推荐）**：
            ```bash
            git filter-repo --strip-blobs-bigger-than 10M
            ```
            - `filter-repo` 是 `filter-branch` 的现代替代品（Git 官方推荐）
        - **git filter-branch（旧方案，不推荐）**：
            - 慢、复杂、容易出错，Git 官方强烈不建议使用（strongly discouraged）

    - **第三步：GC 压缩 + 强制推送**
        ```bash
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        git push --force --all
        git push --force --tags
        ```

    - **第四步：通知所有人重新 clone**
        - 历史被重写后，所有协作者必须重新 clone（不能 pull，会冲突）
        - 或用 `git fetch origin && git reset --hard origin/main`（但需谨慎）

    - **预防措施**
        - 用 `.gitignore` 排除大文件/构建产物
        - 配置 GitLab 文件大小限制（Push Rules → 最大文件大小）
        - 二进制文件用 Git LFS（Large File Storage）管理
        - CI/CD 构建产物不要提交到仓库

- **协助记忆**
    - 清理四步：找大文件（rev-list）→ 清历史（BFG/filter-repo）→ GC 压缩 → 强制推送。
    - 预防口诀："大文件不进仓库，二进制用 LFS，产物在 CI 生成"。

- **进阶思考**
    - **BFG 和 git filter-repo 该选哪个？**
        - BFG：简单场景好用（按大小/文件名清理），一行命令搞定，但需要 Java 环境
        - `filter-repo`：功能更全（支持复杂规则、保留部分历史），Git 官方推荐，无需额外依赖
        - 建议：简单清理用 BFG，复杂场景（需保留部分历史、重写作者等）用 `filter-repo`
    - **仓库瘦身会影响 GitLab CI/CD 或 Webhook 吗？**
        - 会。强制推送后 GitLab 会重新处理仓库，CI/CD 历史记录、MR 引用、部署记录可能受影响。建议在维护窗口操作，并提前通知团队重新 clone。
    - **Git LFS 是什么？什么时候该用？**
        - Git LFS（Large File Storage）：用指针文件替代大文件，实际内容存在 LFS 服务器，clone 时按需下载
        - 适用：二进制文件（图片、模型、数据集、可执行文件）、大于 1MB 的文件
        - 配置：`git lfs install && git lfs track "*.psd"`，然后正常 add/commit/push
## 🤔 Git 中 head、HEAD、head^、head~1 分别代表什么？  
- **Git 中 `HEAD` 是指向当前分支最新提交的"指针"（引用），`head^` 和 `head~1` 都表示 HEAD 的第一个父提交（两者等价），`head^2` 表示第二个父提交（用于 merge commit）。理解这些引用语法是高效使用 Git 历史导航和回滚的基础。**  
    - **核心概念**
        - **`HEAD`**（大写）：指向当前分支的符号引用（symbolic reference），分支名再指向具体的 commit。`HEAD` 通常指向某个分支名；仅在 detached HEAD 状态下才直接指向 commit
        - **`head`/`HEAD`**：在 Git 命令中，`HEAD` 就是"当前提交"的简写；小写 `head` 不是官方语法，官方只有大写 `HEAD`

    - **引用语法（`~` 和 `^`）**
        - `HEAD~1`（或 `HEAD~`）：HEAD 的第一个父提交（往上一代）
        - `HEAD~2`：HEAD 的祖父提交（往上两代，等同于 `HEAD~~`）
        - `HEAD~n`：往上数 n 代（第一个父提交链）
        - `HEAD^1`：等同于 `HEAD~1`（第一个父提交）
        - `HEAD^2`：HEAD 的**第二个父提交**（仅 merge commit 有两个父提交时有意义）

    - **`~` 和 `^` 的关键区别**
        - `~`：只沿**第一个父提交链**回溯（线性历史），`HEAD~3` = HEAD 的前前前代
        - `^`：指定**第几个父提交**（用于 merge commit），`HEAD^2` = 第二个父提交
        - 对于普通提交（只有一个父提交）：`HEAD^` = `HEAD~`
        - 对于 merge commit（两个父提交）：`HEAD^1` = 第一个父提交，`HEAD^2` = 第二个父提交
        - 组合使用：`HEAD~2^2` = HEAD 的祖父提交的第二个父提交

    - **引用速查表**
        | 引用 | 含义 | 等价 |
        |------|------|------|
        | `HEAD` | 当前提交 | — |
        | `HEAD~1` / `HEAD~` | 第一个父提交 | `HEAD^` / `HEAD^1` |
        | `HEAD~2` | 祖父提交 | `HEAD~~` / `HEAD~2` |
        | `HEAD^2` | 第二个父提交（merge 专属） | — |
        | `HEAD@{n}` | reflog 中第 n 次位置 | — |

- **协助记忆**
    - `HEAD` = "你在哪"（当前位置），`~` = "往上数几代"（线性回溯），`^` = "选第几个爸"（merge commit 时用）。
    - 口诀："`~` 一代代往上数，`^` 指定哪个爸；普通提交一样用，merge 时才需 `^2`"。

- **进阶思考**
    - **`HEAD^` 和 `HEAD~` 始终等价**（都等于 `HEAD^1`/`HEAD~1`，指向第一个父提交）；真正不等价的是 `HEAD~2` 与 `HEAD^2`——`HEAD~2` 沿第一父提交链回溯两代（祖父提交），`HEAD^2` 取第二个父提交（仅 merge commit 有意义）。
    - **`HEAD@{n}` 是什么？**
        - `HEAD@{n}` 是 `reflog` 引用，表示 HEAD 在过去第 n 次移动前的位置。`HEAD@{0}` = 当前位置，`HEAD@{1}` = 上一次位置。`git reflog` 可以查看所有 HEAD 移动历史，是"找回丢失提交"的神器。
    - **`git reset --soft HEAD~1` 和 `git revert HEAD` 有什么区别？**
        - `reset --soft HEAD~1`：回退一个提交，但保留修改在暂存区（可重新提交）；`revert HEAD`：创建一个新提交来撤销上一个提交的改动（历史不被修改）。安全回退用 revert，需要修改历史用 reset。

- **扩展信息**
    - **常用引用语法速查**：
        ```bash
        git log --oneline HEAD~5       # 查看最近 5 次提交
        git diff HEAD~1 HEAD           # 最近两次提交的差异
        git reset --hard HEAD~1        # 回退一个提交（慎用）
        git show HEAD^2                # 查看 merge commit 的第二个父提交
        git reflog                     # 查看 HEAD 移动历史（找回丢失提交）
        ```
    - **特殊引用符号**：
        - `HEAD`：当前提交
        - `ORIG_HEAD`：上一次重大 HEAD 变更前的位置（reset/merge/rebase 前自动保存）
        - `FETCH_HEAD`：最近一次 `git fetch` 获取的远程分支引用（多分支 fetch 时包含多条记录）
        - `MERGE_HEAD`：正在 merge 时对方分支的 HEAD
        - `CHERRY_PICK_HEAD`：正在 cherry-pick 时的源提交

## 🤔 在 GitLab 中如何保护分支并强制要求 Merge Request 流程？  
- **GitLab 通过"保护分支"（Protected Branches）+ "合并请求设置"（Merge Request Settings）两层配置实现：保护分支限制谁可以直接推送，MR 设置强制要求通过 Code Review + CI 测试才能合并到保护分支。两者配合使用，形成"必须通过 MR 才能修改主分支"的流程。**  
    - **保护分支配置**
        - 路径：`Settings → Repository → Branch rules`（17.x+，旧路径 `Protected branches` 仍可用）
        - 配置项：
            - `Allowed to merge`：谁可以合并 MR 到该分支（默认 Maintainer）
            - `Allowed to push`：谁可以直接 push 到该分支（默认 No one，即禁止直推）
            - `Allowed to force push`：是否允许 force push（建议关闭）
        - 推荐设置：`main`/`master` 分支 → 允许 merge（Maintainer）、禁止 push、禁止 force push

    - **合并请求设置**
        - 路径：`Settings → Merge requests`（Merge requests 是左侧栏一级菜单项）
        - 关键配置：
            - `Merge method`：合并方式（Merge commit / Merge commit with semi-linear history / Fast-forward merge）
            - `Squash commits when merging`：独立开关（Do not allow / Allow / Encourage / Require），与 Merge method 是两个独立配置项
            - `Merge checks`：要求流水线（Pipeline）通过才能合并
            - `Approvals`：要求至少 N 人 Approve 才能合并（**强制审批规则为 Premium/Ultimate 功能，GitLab Free 仅支持可选审批**）
            - `Prevent approval by author`：作者不能批准自己的 MR
            - `Require all discussions resolved`：所有讨论解决后才能合并

    - **Push Rules（推送规则）**
        - 路径：`Settings → Repository → Push rules`
        - 可限制：
            - 最大文件大小（禁止推送大文件）
            - 提交消息格式（正则匹配，如 Conventional Commits）
            - 禁止删除分支
            - 禁止未经验证的提交（要求 GPG 签名）

    - **完整流程示意**
        ```
        开发者：feature 分支开发 → push → 创建 MR
        GitLab：CI Pipeline 自动运行 → Code Review (≥1 Approve) → Merge checks 通过
        GitLab：合并到 main 分支（保护分支禁止直推）
        ```

- **协助记忆**
    - 保护分支 = "主干锁"（禁止直推），MR 设置 = "门禁"（必须 Review + CI 通过），Push Rules = "额外安检"（文件大小、消息格式）。
    - 配置口诀："保护分支锁直推，MR 审核必通过，Push Rules 加检查"。

- **进阶思考**
    - **GitLab 和 GitHub 的分支保护有什么区别？**
        - 核心概念相同（Protected Branches + Merge Rules），但配置路径和选项略有差异。GitHub 路径为 `Settings → Branches → Branch protection rules`；GitHub 的 `CODEOWNERS` 文件可自动指定不同目录的 reviewer，GitLab 用 `Approval Rules` 达到类似效果。
    - **保护分支配置后紧急修复怎么处理？**
        - ①热修复走 hotfix 分支 → MR → 快速审批合并（不跳过 CI）；②极紧急情况：临时放开保护分支限制（Maintainer 操作），修完后立即恢复保护；③GitLab 允许 Maintainer 强制合并（绕过 CI），但强烈不推荐。
    - **CI Pipeline 通过才能合并，CI 失败了 MR 怎么办？**
        - MR 状态显示"Pipeline failed"，无法合并（被 Merge checks 拦截）。修复 CI 失败原因 → push 修复 → CI 重新运行 → 通过后才能合并。这是保护分支 + CI 配合的核心价值：确保主分支始终处于可用状态。

- **扩展信息**
    - **CODEOWNERS 文件（GitLab/GitHub 通用）**：
        - 在仓库根目录创建 `CODEOWNERS` 文件，定义不同目录/文件的负责人
        - 示例：`/src/api/ @backend-team`、`/src/ui/ @frontend-team`
        - 配合 MR 自动指定 reviewer：修改 `/src/api/` 的 MR 自动请求 `@backend-team` 审核
    - **分支保护模板（推荐配置）**：
        ```
        分支：main/master
        ✅ Allowed to merge: Maintainer
        ❌ Allowed to push: No one（禁止直推）
        ❌ Allowed to force push: false
        ✅ Require pipeline to succeed
        ✅ Require approvals: ≥1
        ✅ Prevent approval by author
        ```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/other/%E8%BF%90%E7%BB%B4%E5%B8%B8%E8%A7%81%E9%A2%98-git%E4%BB%A3%E7%A0%81%E7%AE%A1%E7%90%86/  

