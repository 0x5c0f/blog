# Shellscript相关


# 1. shell 脚本执行的几种方法

- `bash(sh) /path/script.sh`
- 赋予执行权限 `/path/script.sh ` 或 `./scripts.sh`

- `source script.sh` 或 `. script.sh`
  - 在此方法中执行,子 shell 中定义的变量,可在父 shell 中调用(其他方式父 shell 不能直接调用子 shell 的变量)
- `bash(sh) &lt; script.sh` 或 `cat script.sh | bash(sh) `

# 2. shell 脚本规范

1. 以 `#!/bin/bash` 或 `#!/bin/sh` 开头
2. 注释标注, 作者、联系方式、时间、版本、脚本描述
3. 脚本尽量不是使用中文注释
4. 脚本以`.sh` 为扩展名
5. 成对书写符号、条件控制语句等。如: `[]`、`{}`、`if []; then fi`

# 3. 变量的设置与取消

- 设置 : 变量名=值
  - 变量名一般大写
- 打印 : echo $变量名
- 取消 : unset 变量名

# 4. 变量定义

## 4.1. 普通变量定义

- `变量名=value`
- `变量名=&#39;value&#39;`
- `变量名=&#34;value&#34;`
- `变量名=$(ls)`
- `` 变量名=`ls`  ``

## 4.2. 变量名定义要求

变量名一般由字母、数字、下划线组成

## 4.3. 示例

- `a=123`
- `b=123-$a` ## 当值没有单(双)引号的时候,变量的值为 123-变量 a 的值,若变量值出现空格，则值为第一个空格之前的数据
- `c=&#39;123-$a&#39;` ## 当值存在单引号的时候,值为什么，打印结果则为什么，引号内内容视为一个整体
- `d=&#34;123-$a&#34;` ## 当值为双引号的时候,若值中存在变量、命令(需要转义)等，会优先把变量、命令结果输出,在打印所有值

# 5. 特殊、内置变量

| 变量名  | 说明                                                                                                                                                                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$0`    | 获取当前执行脚本的名称,如果执行脚本带有路径,则包含脚本路径                                                                                                                                                                                                                                |
| `$n`    | 获取当前执行脚本的第 n 个参数,n=1-9，n 为 0 时,表示脚本文件名,如果 n 大于 9,用大括号括起来${10},参数以空格隔开                                                                                                                                                                            |
| `$*`    | 获取当前脚本所有传入的参数,将所有的参数视为单个字符串,相当于&#34;$1$2$3&#34;...                                                                                                                                                                                                                   |
| `$#`    | 获取当前脚本传入参数的个数总数                                                                                                                                                                                                                                                            |
| `$@`    | 获取当前脚本所有传入参数,将所有的参数分别传入至其他变量或脚本(获取脚本最后一个参数:`${@: -1}`                                                                                                                                                                                             | `eval echo \$$#`)
| `$?`    | 确定上一个指令的返回值，0 成功, 非 0 不成功 &lt;br/&gt; `2`: 权限拒绝 ; &lt;br/&gt;`1-125`: 运行失败,参数传递错误 ; &lt;br/&gt;`126`: 找到该命令,但无法执行 ; &lt;br/&gt;`127`:未找到运行的命令 ; &lt;br/&gt;`128`: 命令被强行中断 ; &lt;br/&gt;脚本中一般用`exit 0` , 在执行脚本,返回值给$?, 函数中一般用return 返回值给`$?` |
| `$$`    | 当前脚本执行的进程号                                                                                                                                                                                                                                                                      |
| `$!`    | 获得之前(上一个)进程 ID                                                                                                                                                                                                                                                                   |
| `$_`    | 上一条命令的最后一个参数                                                                                                                                                                                                                                                                  |
| `$PPID` | 父进程的进程 ID                                                                                                                                                                                                                                                                           |
| `$PS1`  | 主提示符串，默认值是$                                                                                                                                                                                                                                                                     |

- `$*` 和 `$@` 的示例:

    ```bash
    [root@00 ~]# set -- hello my  &#34;linux shell&#34;
    [root@00 ~]# echo $#
    3
    [root@00 ~]# echo $1
    hello
    [root@00 ~]# echo $2
    my
    [root@00 ~]# echo $3
    linux shell
    [root@00 ~]# for i in &#34;$@&#34;; do echo $i;done
    hello
    my
    linux shell
    [root@00 ~]# for i in &#34;$*&#34;; do echo $i;done
    hello my linux shell
    ```

# 6. 常用操作表达式

| 表达式                         | 说明                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `${#string}`                   | 返回`$string`的长度                                            |
| `${string:position}`           | 在`$stirng`中,从`$position`之后开始提取子串                    |
| `${string:position:length}`    | 在`$string`,从位置`$position`之后开始提取长度为`$length`的子串 |
| `${string#substring}`          | 从变量`$string`开头开始删除最短匹配`$substring`的子串          |
| `${string##substring}`         | 从变量`$string`开头开始删除最长匹配`$substring`的子串          |
| `${string%substring}`          | 从变量`$string`结尾开始删除最短匹配`$substring`的子串          |
| `${string%%substring}`         | 从变量`$string`结尾开始删除最长匹配`$substring`的子串          |
| `${string/pattern/parameter}`  | 在变量`string`中,使用`parameter`替换`pattern`匹配的第一个值    |
| `${string//pattern/parameter}` | 在变量`string`中,使用`parameter`替换所有`pattern`匹配的值      |
| `${string/#pattern/parameter}` | 在变量`string`中,使用`parameter`替换以`pattern`开头的值        |
| `${string/%pattern/parameter}` | 在变量`string`中,使用`parameter`替换以`pattern`结尾的值        |


# 7. 变量替换表

| 运算符号            | 替换                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `${value:-word}`    | 如果变量`value`存在且非`null`，则返回变量的值,否则,返回`word`字符串. 例: `res=${value:-word}`,如果`value`未定义,则`res`的值为`word`                                                                           |
| `${value:=word}`    | 如果变量`value`存在且非`null`，则返回变量的值,否则,则设置这个变量值为`word`. 例: `res=${value:=word}`,如果`value`未定义,则`res`的值为`word`,`value`值也为`word`                                               |
| `${value:&#43;word}`    | 如果`value`存在且非`null`,则返回`word`,否则返回`null`.例`res=${value:&#43;word}`,如果`value`已经定义, 则`res`的值为`word`,如果`value`值未定义,则`res`值为`null(空)`                                               |
| `${value:?message}` | 如果变量`value`存在且非`null`，则返回变量`value`的值，否则返回信息`bash: value: message`,例 `echo ${value:?is null}`,如果`value`值已定义，则返回`value`定义值,否者返回 `bash: value: is null`,退出状态码为`1` |

# 8. 常见的运算符
在Shell脚本中，`[]`和`[[]]`都用于条件测试，但它们之间存在一些重要的差异  
- **兼容性**：`[]`是POSIX标准的测试语句，因此它在所有POSIX兼容的shell中都可以使用，包括bash、dash、ksh等。而`[[]]`是bash的扩展，只能在bash和一些兼容bash的shell中使用，如zsh。
- **排序**：在`[[]]`中，你可以使用`&lt;`和`&gt;`来比较字符串的字典序。例如，`[[ &#34;abc&#34; &lt; &#34;def&#34; ]]`会返回真。而在`[]`中，这样的比较会导致语法错误。
- **逻辑操作符**：在`[]`中，你需要使用`-a`和`-o`来表示逻辑与和逻辑或。例如，`[ &#34;$a&#34; -eq 1 -a &#34;$b&#34; -eq 2 ]`。而在`[[]]`中，你可以使用更直观的`&amp;&amp;`和`||`。例如，`[[ &#34;$a&#34; -eq 1 &amp;&amp; &#34;$b&#34; -eq 2 ]]`。
- **字符串匹配**：在`[[]]`中，`==`右边的字符串会被视为模式，而在`[]`中，它只是一个普通的字符串。例如，`[[ &#34;$a&#34; == a* ]]`会检查`$a`是否以`a`开头，而`[ &#34;$a&#34; == a* ]`会检查`$a`是否等于字符串`a*`。
- **正则匹配**：`[[]]`支持使用`=~`进行正则表达式匹配。例如，`[[ &#34;$a&#34; =~ ^a.* ]]`会检查`$a`是否以`a`开头。而`[]`不支持正则表达式。
- **变量引用**：在`[]`中，如果一个变量未定义，那么它会被视为一个空字符串，除非你用双引号引起来。例如，如果`$a`未定义，那么`[ $a == &#34;&#34; ]`会导致语法错误，而`[ &#34;$a&#34; == &#34;&#34; ]`则不会。而在`[[]]`中，即使变量未定义，也不需要引号。


## 8.1. 变量运算符

|                                     运算符                                      | 说明                                                           |                                                               |
| :-----------------------------------------------------------------------------: | :------------------------------------------------------------- | :------------------------------------------------------------ |
|                                     `&#43;&#43; --`                                     | 自增与自减; 符号在前代表先运算在赋值，符号在后代表先赋值在运算 | -                                                             |
|                                    `&#43; - ! ~`                                    | -                                                              | -                                                             |
|                                     `* / %`                                     | 乘、除、模                                                     | / 取整 ; % 取余                                               |
|                                      `&#43; -`                                      | 加、减                                                         | -                                                             |
|                                   `&lt; &lt;= &gt; &gt;=`                                   | 小于、小于等于、大于、大于等于                                 | -                                                             |
|                                   `== != =~`                                    | 等于、不等于、正则匹配符                                       | `[[ $VAR =~ ^[a-zA-Z] ]]`,正则不可用引号括起来,变量可单双引号 |
|                                     `&lt;&lt; &gt;&gt;`                                     | 位运算: 左移、右移                                             | 二进制计算                                                    |
|                                      `&amp;&amp;`                                       | 逻辑的 `and`                                                   | `true &amp;&amp; false` ,结果 `false`                                 |
| `          |                                                                | ` | 逻辑的 `or`                                                    | `true |     | false`,结果`true`                               |
|                               `= &#43;= -= *= /= %=`                                | 赋值运算                                                       | `(a&#43;=b) == (a=a&#43;b)`; 其他同理                                 |
|                                      `**`                                       | 幕运算                                                         | `2**3=8`                                                      |

## 8.2. 算术运算符

| 字符串比较运算符&lt;/br&gt;(建议在`(())`和`[[]]`中使用的) | 算术运算符&lt;/br&gt;(建议在`[]`以及`test`中使用的) | 说明                                                 |
| :-------------------------------------------------: | :-------------------------------------------: | :--------------------------------------------------- |
|                      `==`或`=`                      |                     `-eq`                     | 检测 2 个数是否相等，相等返回`true`                  |
|                        `!=`                         |                     `-ne`                     | 检测 2 个数是否不相等，相等返回`true`                |
|                         `&gt;`                         |                     `-gt`                     | 检测左边的数是否大于右边的，如果是，则返回`true`     |
|                        `&gt;=`                         |                     `-ge`                     | 检测左边的数是否大于等于右边的，如果是，则返回`true` |
|                         `&lt;`                         |                     `-lt`                     | 检测左边的数是否小于右边的，如果是，则返回`true`     |
|                        `&lt;=`                         |                     `-le`                     | 检测左边的数是否小于等于右边的，如果是，则返回`true` |

## 8.3. 逻辑运算符

| 运算符&lt;/br&gt;(建议在`[[]]`中使用) | 运算符&lt;/br&gt;(建议在`[]`和`test`中使用) | 说明                                                                            |
| :-----------------------------: | :-----------------------------------: | :------------------------------------------------------------------------------ |
|               `!`               |                  `!`                  | 非运算，表达式为`true`，则返回`false`，否则返回`true`; 例: `[!false]`返回`true` |
|            ``\|\|``             |                 `-o`                  | 或运算，有一个表达式为` true，则返回``true `                                    |
|              `&amp;&amp;`               |                 `-a`                  | 与运算，2 个表达式都为` true，才返回``true `                                    |

## 8.4. 条件判断符

| 判断符(man test) | 说明(如果存在为 true)                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `-e`             | 文件存在                                                                                 |
| `-f`             | 被测文件是一个 regular 文件（正常文件，非目录或设备）                                    |
| `-s`             | 如果文件存在且文件大小大于零，则返回真                                                   |
| `-d`             | 被测对象是目录                                                                           |
| `-b`             | 被测对象是块设备                                                                         |
| `-c`             | 被测对象是字符设备                                                                       |
| `-p`             | 被测对象是管道                                                                           |
| `-h`             | 被测文件是符号连接                                                                       |
| `-L`             | 被测文件是符号连接                                                                       |
| `-s`             | 被测文件是一个 socket                                                                    |
| `-t`             | 关联到一个终端设备的文件描述符。用来检测脚本的`stdin[-t0]`或`[-t1]`是一个终端            |
| `-r`             | 文件具有读权限，针对运行脚本的用户                                                       |
| `-w`             | 文件具有写权限，针对运行脚本的用户                                                       |
| `-x`             | 文件具有执行权限，针对运行脚本的用户                                                     |
| `-u`             | set-user-id(suid)标志到文件，即普通用户可以使用的 root 权限文件，通过 chmod &#43;s file 实现 |
| `-k`             | 设置粘贴位                                                                               |
| `-O`             | 运行脚本的用户是文件的所有者                                                             |
| `-G`             | 文件的 group-id 和运行脚本的用户相同                                                     |
| `-N`             | 从文件最后被阅读到现在，是否被修改                                                       |
| `-z`             | 字符串为 null，即长度为 0                                                                |
| `-n`             | 字符串不为 null，即长度不为 0                                                            |
| `=`              | 字符串是否相等,可以使用`==`代替`=`                                                       |
| `!=`             | 字符串是否不相等                                                                         |
| `f1 -nt f2`      | 文件 f1 是否比 f2 新                                                                     |
| `f1 -ot f2`      | 文件 f1 是否比 f2 旧                                                                     |
| `f1 -ef f2`      | 文件 f1 和 f2 是否硬连接到同一个文件                                                     |

## 8.5. 标准 I/O 重定向

|  重定向操作符  | 功能                                                      |
| :------------: | :-------------------------------------------------------- |
|  `&lt; filename`  | 重定向输入                                                |
|  `&gt; filename`  | 重定向输出                                                |
| `&gt;&gt; filename`  | 追加输出                                                  |
| `2&gt; filename`  | 重定向标准错误输出                                        |
| `2&gt;&gt; filename` | 重定向和追加标准错误输出                                  |
| `&amp;&gt; filename`  | 重定向标准输出和标准错误输出                              |
| `&gt;&amp; filename`  | 重定向标准输出和标准错误输出(首选方式)                    |
|     `2&gt;&amp;1`     | 将标准错误输出重定向到输出的去处                          |
|     `1&gt;&amp;2`     | 将输出重定向到标准错误输出的去处                          |
|      `&gt;`       | 重定向输出时忽略 noclobber                                |
| `&lt;&gt; filename`  | 如果是一个设备文件(/dev),使用巍峨年作为标准输入和标准输出 |

# 9. 变量的数值运算

- `(())`
  - 代表直接进行运算:,如: `echo $((1&#43;1&#43;2))` 或 `((a=1&#43;1&#43;2)) ; echo $a`
- `let`
  - 将等式直接进行运算, 如: `i=1; i=i&#43;1 ; (echo $i) == i&#43;1`, 使用`let`将等式直接进行计算`i=1;let i=i&#43;1; (echo $i) == 2`
- `expr`
  - 只能用于整数的计算,可用于判断变量是否为整数(运算符号两边必须有空格,特殊符号需要需要转移), 如 `(expr 1 &#43; 1) == 2; (expr 1 &#43; 1.1) == (expr: non-integer argument)`
  - 计算字符串长度`a=123456; expr length $a`
- `bc`
  - 可用于小数计算,进制之间的转换, 如: `(echo 1.1 &#43; 2| bc) == 3.1 `、`(echo &#34;obase=2;10&#34;|bc) == 1010 `
- `$[]`
  - 这个和`(())` 类似
- `typeset`
  - 个人的理解就是定义多个 int 类型的变量,若定义变量值为非数字,则值将被赋予为 0(建议自行测试). 如: `a=0;typeset -i b=1 c=a;(echo $b $c) == (1 0)`、`a=&#34;bb&#34; ; b=&#34;123&#34;;typeset -i c=a d=b e=222; (echo $c $d $e) == (0 123 222)`

# 10. 变量读入

## 10.1. read bash 内置变量

- `-p` 设置提示信息; 
- `-t` 设置输入等待时间(默认s),超过时间自动退出
    ```bash
    [root@00 ~]#  read -p &#34;hello bash :&#34; num1 num2  # &#34; 和变量之间需要一个空格
    hello bash : hello_1 hello_2
    [root@00 ~]#  echo $num1 $num2
    hello_1 hello_2
    ```

# 11. 条件测试与比较

## 11.1. 方法

1. `test &lt;表达式&gt;`,如: `test -f /etc/hosts`
2. `[ &lt;表达式&gt; ]` ,如: `[ -f /etc/hosts ]`
3. `[[ &lt;表达式&gt; ]]`,如: `[[ -f /etc/hosts ]]`、`[[ -d /etc &amp;&amp; -f /etc/hosts ]]`、`[[ -d /etc -a -f /etc/hosts ]]`、`[[ -d /etc || -f /etc/hosts ]]`、`[[ -d /etc -o -f /etc/hosts ]]`

## 11.2. 说明

- 上述一和二是等等价的, 如: `test -f /etc/hosts == [ -f /etc/hosts ]`
- `[[]]`与`[]`的区别是在`[[]]` 中可以使用通配符模式进行匹配(如`[[ hello == hell? ]] == true`:其匹配字符串或通配符时，可不需要引号,`[]`也可不需要引号,但据说有时候会出现故障,因此建议加上引号), `&amp;&amp;、||、&gt;、&lt;`等操作符也可以应用于`[[]]`中,但不能应用于`[]`中

## 11.3. 补充

关于`()`、`(())`、`[]`、`[[]]`、`{}`几个的区别,接入一个很详细的文档,但是我表示没怎么看懂,先记录下来,以后慢慢看

&gt; [https://blog.csdn.net/taiyang1987912/article/details/39551385](https://blog.csdn.net/taiyang1987912/article/details/39551385)

# 12. 函数

## 12.1. 语法

```bash
&lt;函数名&gt;(){
    ...
    return n
}

function &lt;函数名&gt;(){
    ...
    return n
}
```

## 12.2. 调用

1. 直接执行函数名即可
   - 执行函数的时候,不需要带括号
   - 函数定义必须在调用之前, shell 执行,从上向下
2. 带参数调用和脚本传参一样
3. 在函数中,`$0` 仍然是脚本名称 , `$1..n`代表是脚本参数
4. 在函数中使用`exit`会退出整个脚本,`return`是跳出当前函数
5. 函数脚本引用
   - 脚本内加载`. /path/scrpt.sh`,相当于将`/path/script.sh`内容[直接加载](#112)到当前脚本中

# 13. 判断分支

```bash
case $VAR in
    &#34;1&#34;|a) echo 1
    ;;
    2|3) echo 2 or 3
    ;;
    *) echo default
    ;;
esac

if [ $VAR == $VAR ]; then
    ...
fi
```

# 14. 循环

## 14.1. while 循环

```bash
# 满足条件进入(先判断,在执行)
while True ; do
    ...
done
# 先执行一次,在判断
until True ; do
    ...
done
```

### 14.1.1. 文件读取示例

```bash
# 示例1(文件最后一行内容需要换行符,否则将无法读取)
exec &lt; file
while read line; do
    echo $line
done

# 示例2 (文件最后一行内容需要换行符,否则将无法读取)
cat FILE | while read line ; do
    echo $line
done

# 示例3,此方法根据评测据说效率最高 (文件最后一行内容需要换行符,否则将无法读取)
while read line ; do
    ...
done &lt; FILE

```

## 14.2. select 循环

select 可用于选择包含多个选项的菜单

```bash
# set shuttle list
PS3=&#34;请选择要操作的编号 : &#34;

select shuttle in columbia endeavour challenger discovery atlantis enterprise pathfinder; do
    echo &#34;$REPLY. $shuttle selected&#34;
done
```

## 14.3. for 循环

```bash
    # foreach
    for i in &lt;...&gt; ; do
        ...
    done
    # for
    for ((&lt;..&gt;;&lt;..&gt;; &lt;..&gt; )); do
        ...
    done
```

### 14.3.1. 示例

```bash
for i in {1..100}; do
    echo $i
done

for (( i = 0; i &lt; 100; i &#43;&#43; )); do
    echo $i
done

# echo {1..100}&#43; |sed &#39;s#\&#43;$##g&#39;|bc

```

# 15. shell 数组

1. 定义 `array=(v1 v2 v3)`
   - `{ array=(v1 v2 v3) } == { declare -A array=([0]=v1 [1]=v2 [2]=v3) }`
2. 长度 `len=${#array[@]}` 或者 `len=${#array[*]}`
3. 打印 `echo ${array[0]}`、`echo ${array[1]}` ...
4. 变量列表 `${array[*]}`、`${array[@]}`
5. 增、删、改 `array[3]=v4` 、`unset array[0]`、`array[0]=v5`
   - 增加 :(整型数组) 在数组增加时候,需要指定下标,增加到那个下标下面,则取值的时候就应该从那个下标取定义的值(**如果要深入使用,此处一定要自行测试,他与其他语言数组有一定区别,个人理解,要说用其他语言来形容的话,他就相当于只有 map 或多维 map 的概念**)
   - 打印数组下标 `echo ${!array[@]}`

# 16. shell 调试

## 16.1. 全局调试

- `-n` 不会执行脚本,仅仅检查语法是否有问题,并给出错误提示
- `-v` 在执行脚本是时候,先将脚本的内容输出到屏幕上,然后执行脚本,也会提示错误信息,相当于先 cat 了
- `-x` 将执行的脚本内容即输出显示到屏幕上面
- `-e` 令脚本在发生错误时退出而不是继续运行
- `-u` 检查是否使用了未赋值的变量


## 16.2. 分段调试

- 脚本内 :
    ```bash
    #!/bin/bash
    for i in {1..20} ; do
        if [ $i -gt 10 ]; then
            set -x              # &lt;&lt;====== 分段调试开始
            echo &#34;i&gt;20: $i&#34;
            set &#43;x              # &lt;&lt;====== 分段调试结束
        else
            echo &#34;i&lt;=10: $i&#34;
        fi
    done
    ```

- 终端内
    ```bash
    [root@00 ~]# set -x             # &lt;&lt;==== 调试启动
    [root@00 ~]# for i in 1 2 3 ; do echo $i ; done
    &#43; for i in 1 2 3
    &#43; echo 1
    1
    &#43; for i in 1 2 3
    &#43; echo 2
    2
    &#43; for i in 1 2 3
    &#43; echo 3
    3
    [root@00 ~]# set &#43;x             # &lt;&lt;==== 调试结束
    ```

# 17. linux 信号

## 17.1. 常用信号

| 信号 | -                 | 说明(`stty -a`查看键盘按键对应的信号)                                                  |
| ---- | ----------------- | -------------------------------------------------------------------------------------- |
| `1`  | `HUP`\|`SIGHUP`   | 挂起,通常因终端雕像或用户退出引发                                                      |
| `2`  | `INT`\|`SIGINT`   | 中断,通常是按下`Ctrl&#43;C`引发                                                            |
| `3`  | `QUIT`\|`SIGQUIT` | 退出,通常是按下`Ctrl&#43;/`引发                                                            |
| `6`  | `ABRT`\|`SIGABRT` | 终止,通常因为严重的执行错误而引发                                                      |
| `9`  | `SIGKILL`         | 立即终止进程                                                                           |
| `14` | `ALRM`\|`SIGALRM` | 报警,通常用来处理超时                                                                  |
| `15` | `TERM`\|`SIGTERM` | 终止,通常在系统挂机时发送                                                              |
| `20` | `TSTP`\|`SIGSTP`  | 停止进程的运行,但该型号可以被处理和忽略,用户键入`SUSP`字符(通常是`Ctrl&#43;z`)发出这个信号 |

## 17.2. trap 命令

trap 命令用于在接受到信号后将要采取的行动,常用于脚本程序中断时完成清理工作,可用于跳板机脚本制作(由于脚本从上向下进行执行,因此需要将在要保护的程序片段之前进行 trap 设置)  
 语法:

- `trap -l ` 打印所有信号
- `trap -p ` 打印当前 trap 设置

示例:

- `trap &#34;&#34; signals` 为空表示这个信号失效
- `trap &#34;commands&#34; signals ` 表示收到`signals`信号时,信号功能副为同时执行`commands`命令
- `trap signals` 信号复原,取消已经设置的信号
    ```bash
    # 临时生效,终端退出失效
    [root@00 ~]# trap &#34;&#34; 2  # 设置信号
    [root@00 ~]# trap -p    # 打印设置信号
    trap -- &#39;&#39; SIGINT
    [root@00 ~]#            # &lt;&lt; 此时按Ctrl&#43;c  无任何反映
    [root@00 ~]# trap 2     # 信号复原
    [root@00 ~]# ^C         # 复员后 Ctrl&#43;c
    [root@00 ~]# ^C         # 复员后 Ctrl&#43;c
    ```

# 18. Advanced Bash-Scripting Guide(Contributed Scripts)

&gt; [http://tldp.org/LDP/abs/html/contributed-scripts.html](http://tldp.org/LDP/abs/html/contributed-scripts.html)

# 19. getops
- `example1`
    ```bash
    #!/bin/bash

    # 长短选项兼容

    # ./scripts.sh -h
    # ./scripts.sh -s &lt;values&gt;
    # ./scripts.sh --src_dir &lt;values&gt;
    # ./scripts.sh -k &lt;values&gt; 
    # ./scripts.sh --key_prefix &lt;values&gt;
    # ./scripts.sh -b &lt;values&gt;
    # ./scripts.sh --bucket &lt;values&gt;
    # ./scripts.sh -f &lt;values&gt;
    # ./scripts.sh --file_type &lt;values&gt;
    # ./scripts.sh --skip_fixed_strings &lt;values&gt;
    # ./scripts.sh --skip_file_prefixes &lt;values&gt;
    # ./scripts.sh --skip_path_prefixes &lt;values&gt;
    # ...

    while getopts &#34;hs:k:b:f:-:&#34; opt; do
    case $opt in
        s) SRC_DIR=$OPTARG;;
        k) KEY_PREFIX=$OPTARG;;
        b) BUCKET=$OPTARG;;
        f) FILE_TYPE=$OPTARG;;
        h) usage;;
        -)
        case $OPTARG in
            src_dir) SRC_DIR=$2; shift;;
            key_prefix) KEY_PREFIX=$2; shift;;
            bucket) BUCKET=$2; shift;;
            skip_fixed_strings) SKIP_FIXED_STRINGS=$2; shift;;
            skip_file_prefixes) SKIP_FILE_PREFIXES=$2; shift;;
            skip_path_prefixes) SKIP_PATH_PREFIXES=$2; shift;;
            skip_suffixes) SKIP_SUFFIXES=$2; shift;;
            file_type) FILE_TYPE=$2; shift;;
            ignore_dir) IGNORE_DIR=$2; shift;;
            check_exists) CHECK_EXISTS=$2; shift;;
            check_hash) CHECK_HASH=$2; shift;;
            rescan_local) RESCAN_LOCAL=$2; shift;;
            log_level) LOG_LEVEL=$2; shift;;
            log_file) LOG_FILE=$2; shift;;
            delete_on_success) DELETE_ON_SUCCESS=$2; shift;;
            *) echo &#34;Invalid option: --$OPTARG&#34;; exit 1;;
        esac;;
        :) echo &#34;Option -$OPTARG requires an argument.&#34;; exit 1;;
        \?) echo &#34;Invalid option: -$OPTARG&#34;; exit 1;;
    esac
    done
    ```
- `example3`
    ```bash
    # scripts.sh -h
    # scripts.sh -a action
    # scripts.sh -a action -n step1 -n step2
    # scripts.sh -a action -e &#34;var1=value1,var2=value2&#34;

    declare -- ACTIONS=&#34;&#34;
    declare -- STEPS=&#34;&#34;
    declare -- ENV_VARS=&#34;&#34;

    while getopts &#34;ha:n:e:&#34; opt; do
        case $opt in
        h)
            usage
            exit 0
            ;;
        a)
            ACTIONS=$OPTARG
            ;;
        n)
            STEPS&#43;=$OPTARG&#34; &#34;
            ;;
        e)
            ENV_VARS=$OPTARG
            ;;
        :)
            echo &#34;Option -$OPTARG requires an argument.&#34; &gt;&amp;2
            usage
            exit 1
            ;;
        \?)
            echo &#34;Invalid option: -$OPTARG&#34; &gt;&amp;2
            usage
            exit 1
            ;;
        esac
    done

    shift $((OPTIND - 1))

    # 将传入的key=value参数转换成环境变量
    # 例如: --env key=value
    IFS=&#39;,&#39; read -ra ENV_ARR &lt;&lt;&lt;&#34;$ENV_VARS&#34;
    for var in &#34;${ENV_ARR[@]}&#34;; do
        IFS=&#39;=&#39; read -ra VAR_ARR &lt;&lt;&lt;&#34;$var&#34;
        declare -g &#34;${VAR_ARR[0]}=${VAR_ARR[1]}&#34;
    done
    ```

- `example3`
    ```bash
    # 双冒号 双冒号短参数必须贴近或无参数,长参数必须等号赋值(长参数名可以不用写完)或无参数(注:无参数时变量偏移也是2位)
    # 单冒号参数可以贴近也可以不贴近,但参数必选
    # f d a 必须接受参数
    # s 参数可选
    #
    ARGS=`getopt -o f:s::d:a: --long filename:,source::,desc:,action:: -- &#34;$@&#34;`
    eval set -- &#34;$ARGS&#34;

    while true ; do
        case &#34;$1&#34; in
            -f|--filename)
                fileName=$2 ; shift 2 ;;
            -s|--source)
                case &#34;$2&#34; in
                    &#34;&#34;) sourceDir=&#39;.&#39; ; shift 2 ;;
                    *) sourceDir=$2 ; shift 2 ;;
                esac ;;
            -d|--desc)
                descDir=$2 ; shift 2;;
            -a|--action)
                case &#34;$2&#34; in
                    &#34;copy&#34;|&#34;move&#34;) action=$2 ; shift 2 ;;
                                *) action=&#34;copy&#34; ; shift 2 ;;
                esac ;;
            --) shift ; break ;;
            *) echo &#34;Internal error!&#34; ; exit 1 ;;
        esac
    done
    ```

# 20. 那些很神奇的操作

- shellscript 中转义 !
  ```bash
  #!/bin/bash
  echo -e &#34;\0041&#34;
  echo -e &#34;#\0041/bin/bash&#34;
  ```

# 21. 将脚本以特定用户运行 
```bash
# 一般放在 export PATH 之后 
if [ &#34;$(id -u)&#34; -eq 0 ]; then
  echo &#34;Switching to www user...&#34;
  exec runuser -u www -- &#34;$0&#34; &#34;$@&#34;
fi
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/shellscript%E7%9B%B8%E5%85%B3/  

