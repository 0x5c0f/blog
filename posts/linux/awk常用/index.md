# AWK常用(半草稿)


&gt;[https://awk.readthedocs.io/en/latest/chapter-one.html](https://awk.readthedocs.io/en/latest/chapter-one.html)

# 1. 摘要 
`awk &#39; BEGIN{ 语句 } statements2 {语句} END{ 语句 } &#39;`
- `BEGIN { 语句 }`：在读取任何输入前执行一次 语句 
- `END { 语句 }`：读取所有输入之后执行一次 语句  
- `表达式 { 语句 }`： 对于 表达式 为真（即，非零或非空）的行，执行 语句  
- `/正则表达式/ { 语句 }`： 如果输入行包含字符串与 正则表达式 相匹配，则执行 语句  
- `组合模式 { 语句 }`： 一个 组合模式 通过与（`&amp;&amp;`），或（`||`），非（`|`），以及括弧来组合多个表达式；对于组合模式为真的每个输入行，执行 语句  
- `模式1，模式2 { 语句 }`：  范围模式(`range pattern`)匹配从与 模式1 相匹配的行到与 模式2 相匹配的行（包含该行）之间的所有行，对于这些输入行，执行 语句 。 `BEGIN`和`END`不与其他模式组合。范围模式不可以是任何其他模式的一部分。`BEGIN`和`END`是仅有的必须搭配动作的模式。  


# 2. awk 变量
- `$n`: 分割后，第`n`列的字段   
- `${1..n}` 代表当前行的`1-n`的列值 
- `$0`: 代表整行的数据  
- `FS`: 表示使用的列的分割符(默认空格,位于`BEGIN`模块,命令行中`-F`指定)  
- `OFS`: 输出列的分割符,默认`print $1,$2`的时候中间的`,`代表空格(默认),可使用`OFS`进行更改,位于`BEGIN`模块当中 
- `NF`: 分割后，当前行一共多少个字段(`$NF`最后一列,`$(NF-1)`倒数第2列)  
- `NR`: 记录行号,表示当前正在处理的记录的行的号码  
- `FNR`: 各文件分别计数的行号 
- `RS`: 表示行分隔符,表示每个记录输入的时候的分割符,即行与行是如何分割的(内置变量RS用来存放输入的记录分割符,可通过`BEGIN`模块来进行修改,支持正则表达式  
- `ORS`: 输出记录分隔符(输出换行符)，输出时用指定符号代替换行符,默认行的分割符为`\n`  
- `FILENAME`: 当前文件名 
- `ARGC`：命令行参数的个数
- `ARGV`: 数组，命令行参数的值 

## 示例 
- `RS`: 表示行分隔符,表示每个记录输入的时候的分割符,即行与行是如何分割的(内置变量RS用来存放输入的记录分割符,可通过`BEGIN`模块来进行修改,支持正则表达式  
    - 示例 `1` : 
        ```bash
        [root@00 ~]# head -2 /etc/passwd|awk &#39;BEGIN{RS=&#34;:&#34;}{print NR,$0}&#39;
        ### root:x:0:0:root:/root:/bin/bash  ###
        ### bin:x:1:1:bin:/bin:/sbin/nologin  ###
        1 root
        2 x
        3 0
        4 0
        5 root
        6 /root
        7 /bin/bash  # &lt;&lt;=== 此处本身包含一个换行符
        bin
        8 x
        9 1
        10 1
        11 bin
        12 /bin
        13 /sbin/nologin
        ```
    - 示例 `2` : 
        ```bash
        [root@00 ~]# head -n 3 /etc/passwd|awk &#39;BEGIN{RS=&#34;[:/0-9]&#43;|\n&#34;}{print $0}&#39; |sort|uniq -c
        ### root:x:0:0:root:/root:/bin/bash         ###
        ### bin:x:1:1:bin:/bin:/sbin/nologin        ###
        ### daemon:x:2:2:daemon:/sbin:/sbin/nologin ###
            1 bash
            4 bin
            2 daemon
            2 nologin
            3 root
            3 sbin
            3 x
        ```

- `FS`: 输入分割符，命令处理参数使用`-F`指定分割符,或者使用变量形式修改
    - 示例: 
        ```bash
            $&gt; awk -F &#34;:&#34; &#39;NR==12,NR==15{print NR,$1,$3}&#39; pwd.txt 
            12 ftp 14
            13 nobody 65534
            14 systemd-coredump 999
            15 systemd-network 192
            
            $&gt; awk -v FS=&#34;:&#34; &#39;NR==12,NR==15{print NR,$1,$3}&#39; pwd.txt 
            12 ftp 14
            13 nobody 65534
            14 systemd-coredump 999
            15 systemd-network 192
            
            $&gt;  head -1 passwd |awk &#39;BEGIN{FS=&#34;:&#34;}{print $1,$2}&#39;
            ### root:x:0:0:root:/root:/bin/bash         ###
            root x
        ```

- `OFS`: 输出分割符，使用`OFS`变量进行修改 
    - 示例: 
        ```bash
            $&gt; awk -F &#34;:&#34; -v OFS=&#34;--&#34; &#39;NR==12,NR==15{print NR,$1,$3}&#39; pwd.txt 
            12--ftp--14
            13--nobody--65534
            14--systemd-coredump--999
            15--systemd-network--192
        ```
- 其他示例 
    ```bash
    # 打印范围 
    $&gt; awk -F: &#39;NR==12,NR==15{print NR,$1,$3}&#39; pwd.txt 
    12 ftp 14
    13 nobody 65534
    14 systemd-coredump 999
    15 systemd-network 192

    # 自定义变量 
    awk -v param=n_user &#39;BEGIN{print &#34;当前用户: &#34; param}&#39;
    当前用户: n_user
    $&gt; param=$(whoami)
    $&gt; echo $param
    cxd
    $&gt; awk -v param=$param &#39;BEGIN{print &#34;当前用户: &#34; param}&#39;
    当前用户: cxd
    ```

# 3. 域 
- `awk` 默认分割符为空格,或者连续的空格,tab默认也为(连续)空格  
- 当`awk`中只存在条件时,默认输出整行  

# 4. 正则匹配  
- 搜索`/etc/passwd`中用户主目录在`root`下的用户名和`bash`   
- `变量~正则`  表示变量值匹配正则表达式  
- `变量!~正则` 表示变量值不匹配正则表达式    


```bash
[root@00 ~]# awk -F: &#39;$(NF-1)~/^\/root/{print $1,$NF}&#39; /etc/passwd  
### root:x:0:0:root:/root:/bin/bash              ###
### operator:x:11:0:operator:/root:/sbin/nologin ###
root /bin/bash
operator /sbin/nologin

```

# 5. BEGIN and END 
`BEGIN{变量定义}` `{判断和计算}` `END{判读和计算完结执行操作}`  
```bash
seq 100 | awk &#39;BEGIN{sum=0}{sum=$0&#43;sum}END{print sum}&#39;
```
## awk 格式化输出 
- 示例: 
```bash
$&gt; awk -F: &#39;BEGIN{printf &#34;%-25s\t%-25s\t%-25s\t\n&#34;,&#34;用户名&#34;,&#34;UID&#34;,&#34;GID&#34;}NR==2,NR==5{printf &#34;%-25s\t%-25s\t%-25s\n&#34;,$1,$3,$4}&#39; pwd.txt 
用户名                       UID                       	 GID                      	
bin                      	1                        	1                        
daemon                   	2                        	2                        
adm                      	3                        	4                        
lp                       	4                        	7  
```

## awk 模式 
```bash
awk &#39;
BEGIN { actions } 
/pattern/ { actions }
/pattern/ { actions }
……….
END { actions } 
&#39; filenames 
```

# 6. awk 数组
类似`key=value` 


# 7. awk 循环 
`foreach` 循环 


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/linux/awk%E5%B8%B8%E7%94%A8/  

