# Ansible常用


&gt; https://lework.github.io/2016/11/19/Ansible-zhuan-ti-wen-zhang-zong-lan/  


# 1. 主机配置文件 /etc/ansible/hosts 
```bash
# 主机组 
[example]
# 远程主机名或ip    ansible_user=&lt;远程主机用户&gt;   ansible_ssh_pass=&lt;远程主机密码&gt; ansible_port=&lt;远程主机端口,默认22&gt;  
# 远程主机名或ip    # 认证由ssh本身控制 

```
# 2. ansible 常用模块 
帮助命令: `ansible-doc -s &lt;模块名&gt;`  

## 2.1. 命令模块`command` 
`ansible &lt;组名|IP&gt; -m command  -a &lt;远程服务器要执行的命令或动作&gt; -u &lt;远程服务器以什么用户执行&gt;`

### 2.1.1. `chdir`: 执行命令前，先切换到该目录中   
```bash
ansible &lt;组名|IP&gt; -m command -a &#34;pwd chdir=/tmp&#34;
```

### 2.1.2. `creates`: 执行命令之前，判断当前文件或目录是否存在，**存在则不执行命令，不存在则执行**。
```bash
ansible &lt;组名|IP&gt; -m command -a &#34;pwd creates=/opt&#34;
```

### 2.1.3. `removes`: 执行命令之前，判断当前文件或目录是否存在，**存在则执行命令，不存在则不执行**
```bash
ansible &lt;组名|IP&gt; -m command -a &#34;ls -l /tmp removes=/opt&#34;
```

### 2.1.4. `warn`: 是否忽略告警信息 
```bash
ansible &lt;组名|IP&gt; -m command -a &#34;&lt;command&gt; warn=False&#34;
```

## 2.2. `shell` 模块 
`shell`模块与`command`模块类似，但可以使用管道符和特殊字符    

`ansible &lt;组名|IP&gt; -m shell  -a &lt;远程服务器要执行的命令或动作&gt; -u &lt;远程服务器以什么用户执行&gt;`

## 2.3. `script` 模块 
可以让脚本在每个节点上执行，脚本(shell脚本)存在位置为当前管理机上   
`ansible &lt;组名|IP&gt; -m script  -a &lt;本地脚本路径&gt;`  

## `copy` 模块 
用于复制本地文件到远程节点或向远程节点文件中写入新的数据
```bash
# 复制 
ansible &lt;组名|IP&gt; -m copy -a &#34;src=/pathto/test.txt dest=/data/ owner=www group=www mode=0644 backup=yes&#34;

# 追加内容 
ansible &lt;组名|IP&gt; -m copy -a &#34;content=&#39;test msg !&#39; dest=/tmp/aaa backup=yes&#34;
```

## `file` 模块 
用于在远程节点上创建文件(夹),或者软链接 
```bash

# 不存在，则忽略操作,此处为修改权限及用户所属 
ansible &lt;组名|IP&gt; -m file -a &#34;dest=/tmp/testfile state=file owner=www group=www mode=0644&#34;

# 若文件存在，则修改其属性，不存在则创建 
ansible &lt;组名|IP&gt; -m file -a &#34;dest=/tmp/testfile state=file owner=www group=www mode=0600&#34;

# 若目录存在，则不做操作，否则创建 
ansible &lt;组名|IP&gt; -m file -a &#34;dest=/tmp/testdir state=directory owner=www group=www mode=0600&#34;

```

## `yum` 模块 
用于远程安装软件包 
```bash
# 远程安装软件
ansible &lt;组名|IP&gt; -m yum -a &#34;name=nginx=1.14.2 state=installed&#34; 
# 更新系统，忽略nginx的更新
ansible &lt;组名|IP&gt; -m yum -a &#34;name=&#39;*&#39; state=latest exclude=&#39;nginx&#39;&#34; 

```


# `playbook` 
## 语法 
```yaml
- hosts: local_cluster        # 需要执行的远程主机节点,可以为ip/主机名/主机组
  remote_user: root           # 远程以那个用户执行
  gather_facts: false         # 执行前是否收集主机信息(默认收集)
  vars:                       # 用于定义后续可使用的变量 
    - message: &#34;hell word !&#34;  # 具体的变量及值

  tasks:
    - name: task1           # 任务标题
      shell:  echo {{message}} {{ item }} `date` by `hostname` &gt; /tmp/hello.log  # 具体执行什么模块 
      when: 1 == 1            # 任务中的条件分支，当满足此条件时执行当前任务  
      with_items:             # 在模块中循环执行以下信息，可为命令，模块中获取循环值的变量为 item
        - message1
        - message2

    - name: task2 
      command: uptime 
      .....
```

## 执行
```bash
# 查看脚本影响的主机列表信息 
$&gt; ansible-playbook  demo.yaml  --list-hosts 
# 指定脚本执行默认ansible 的 hosts文件，默认为(/etc/ansible/hosts)
$&gt; ansible-playbook demo.yaml -i /tmp/hosts   
# 检查语法
$&gt; ansible-playbook demo.yaml --syntax-check 
# 模拟执行（不影响实际节点服务器）
$&gt; ansible-playbook demo.yaml -C 

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/ansible%E5%B8%B8%E7%94%A8/  

