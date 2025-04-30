# Mysql程序模型(草稿)

# Mysql程序模型
{{< admonition type=tip open=false >}}
{{< image src="images/mysql.程序模型.png" caption="mysql程序模型" src_s="/images/mysql.程序模型.png" src_l="/images/mysql.程序模型.png" title="mysql程序模型" >}}
{{< /admonition >}}


## 连接层
- TCP/IP或Socket的连接方式   
- 验证用户名密码  
- 连接线程: 接收sql语句,返回执行结果  

## SQL层:
- 语法检查模块,检查上层发过来的SQL是否符合规范  
- 权限检查模块.检查当前登陆用户是否由权限操作数据库对象  
- 语法定义模块,识别语句种类  
- 解析器,解析出SQL语句所有可能的执行方式,这些方式被称为"执行计划"  
- 优化器,基于执行代价(基于系统资源的消耗作为维度 <cpu/mem/io>),管理员可以通过间接的方法,干预优化器的选择(索引) 
- 执行器,按照优化器选择的"最优"的执行计划执行SQL,得出结论: 某某磁盘的某某位置 
- 查询缓存,一般会用redis类产品替代
- 记录查询日志 

## 存储引擎层 
*根据SQL层的执行结果,去磁盘找到对应的数据,结构化为表的模式返回给用户*
- 和"磁盘(文件系统)"打交道的层次  

# 逻辑结构
## 抽象结构
库(databases,schema)    -- 文件夹 
表(table)               -- 文件

## 物理结构
...

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/mysql/mysql%E7%A8%8B%E5%BA%8F%E6%A8%A1%E5%9E%8B/  

