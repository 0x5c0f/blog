# 持续集成


# 持续集成  
## 什么是`DevOps`    
`DevOps` 是一个框架，是一种理论方法，并不是一套工具，他包括一系列的基本原则和实践。其核心价值着重于**更快速的交付，响应市场的变化。更多的关注业务的改进与提升。**  

# git 
`工作目录`-`暂存区域(git add)`-`本地仓库(git commit)`-`远程仓库(git push)`  

## 初始配置  
```bash
$&gt; git config --global user.name 0x5c0f
$&gt; git config --global user.email mail@0x5c0f.cc
$&gt; cat ~/.gitconfig # 系统层面位于/etc/ 下 ; 项目层面，项目根目录
[user]
	name = 0x5c0f
	email = mail@0x5c0f.cc

$&gt; git config  --list
user.name=0x5c0f
user.email=mail@0x5c0f.cc
```
## 初始项目 
### 基础操作 
```bash
$&gt; mkdir /data/gittest -p &amp;&amp; cd /data/gittest 
$&gt; git init 
$&gt; tree -a 
.
└── .git
    ├── branches
    ├── config
    ├── description
    ├── HEAD
    ├── hooks
    ......
    ├── objects     
    │   ├── info
    │   └── pack 
    ...... 

# 移除缓冲区文件 
$&gt; git rm --cached &lt;file&gt;

# 移除本地及缓冲区文件     
$&gt; git rm -f &lt;file&gt;

# 重命名 
$&gt; mv &lt;file&gt; &lt;file&gt;.txt 
$&gt; git rm --cached &lt;file&gt;
$&gt; git add &lt;file&gt;.txt       # git commit -m &#34;&#34;

# 查看修改详情 
$&gt; git diff &lt;file&gt;         

# 查看提交历史 
$&gt; git log 

# 查看提交历史(精简)
$&gt; git log --oneline 

# 撤回修改文件(未add时) 
$&gt; git checkout -- &lt;file&gt;

# 撤回修改文件(未commit时) 
$&gt; git reset HEAD &lt;file&gt;    # git checkout -- &lt;file&gt;

# 撤回修改文件(未push时)
$&gt; git reset --hard &lt;commitid&gt;

# 查看历史操作记录 
# 此命令大体执行在git reset --hard &lt;commitid&gt; 之后，因为执行了git reset --hard &lt;commitid&gt;后，git log将不再看到commitid之后的所有提交记录 
$&gt; git reflog

```

### 分支 
分支创建后，直接增删，各个分支不受影响  

```bash
# 创建分支 
$&gt; git branch test01    # 删除 git branch -d test01
# 查看分支 
$&gt; git branch
* master
  test01

# 切换分支 
$&gt; git checkout test01  # git status    # git log --oneline --decorate  

# 合并分支(比如：合并test01到master中，则当前需要切换到master中执行)
# 当两个分支中，同时修改了一个文件，则会出现合并冲突，此时需要手动处理冲突文件 
$&gt; git merge test01  

```

### 标签 
标签可以作为一个`commitid`的惟一标记，相当于给`commitid`取的别名吧 
```bash
# 给当前commit创建标签
$&gt; git tag v1.0     # git tag -a v1.0   # -a: 打开注释编辑页面 可使用-m &#34;message&#34;替代  
# 针对特定commit打标签
$&gt; git tag v1.0 &lt;commitid&gt;
# 查看所有标签
$&gt; git tag 

# 查看当前标签的详细信息 
$&gt; git show v1.0 

# 删除标签 
$&gt; git tag -d v1.0 

# 重置到某个标签(提交点)
$&gt; git reset --hard v1.0  # or git reset --hard &lt;commit&gt;
```

### 远程推送(gitlab) 
```bash

$&gt; git remote add origin http://xxxxxxx/xxx.git
$&gt; git push -u origin master

## gitlab 备份(/etc/gitlab.rb)
# 备份路径
gitlab_rails[&#39;backup_path&#39;] = &#39;/data/backup&#39;
# 备份保留时间(秒)
gitlab_rails[&#39;backup_keep_time&#39;] = 604800

# 执行备份
$&gt; /usr/bin/gitlab-rake gitlab:backup:create


# 数据恢复 
# 停止数据写入服务
$&gt; gitlab-ctl stop unicorn
$&gt; gitlab-ctl stop sidekiq

$&gt; gitlab-rake gitlab:backup:restore BACKUP=&lt;备份文件的数字部分&gt;  # 回车一路yes

$&gt; gitlab-ctl restart

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/%E6%8C%81%E7%BB%AD%E9%9B%86%E6%88%90/  

