# Mysql优化


# 1. Mysql 优化
## 1.1. 索引优化 
1. 索引的种类
    - B树(b-tree B&#43;tree B*tree); 
    - R树; 
    - Hash索引
    - 全文索引
2. B树索引的类型
    - 聚簇索引(cluster index): 一般是基于主键的,自动生成,一般是建表时创建  
    - 辅助索引(普通索引:回表查询; 覆盖索引: 不回表查询): 认为创建(普通型,覆盖型)
    - 唯一键索引: 认为创建 

3. 作用 
在数据库中,索引是用来优化查询的.  
排除缓存之外,数据的查询: 1. 全表扫描; 2. 索引扫描 

### 1.1.1. 索引分类

- 主键索引  
```sql
--- 创建主键索引(推荐)
create table `&lt;table_name&gt;` (
`id` int(4) not null auto_increment,
`name` char(20) not null,
primary key (`id`)
) engine=innodb default charset=utf8

--- 创建主键索引 
create table `&lt;table_name&gt;` (
`id` int(4) not null,
`name` char(20) not null
) engine=innodb default charset=utf8

alter table &lt;table_name&gt; change id id int(4) primary key not null auto_increment

```
- 普通索引(`MUL`)  
```sql
--- 创建索引
mysql&gt; alter table &lt;table_name&gt; add index &lt;index_name&gt;(&lt;column_name&gt;);  # create index &lt;index_name&gt; on &lt;table_name&gt;(&lt;column_name&gt;);

--- 删除索引
mysql&gt; alter table &lt;table_name&gt; drop index &lt;index_name&gt;;    # drop index &lt;index_name&gt; on &lt;table_name&gt;;

--- 查看索引信息
mysql&gt; show index from &lt;table_name&gt;;
```
- 唯一索引   
```sql
mysql&gt; create unique index &lt;index_name&gt; on &lt;table_name&gt;(&lt;column_name&gt;)
```
- 前缀索引  
```sql
--- create index idx_phoneNum on phone(phoneNum(3)) 
mysql&gt; create index &lt;index_name&gt; on &lt;table_name&gt;(&lt;column_name&gt;(&lt;length&gt;))  
```
- 联合索引 
```sql
# index(a,b,c)
# a, ab, abc ,ac 走索引, 其他关联查询均不走索引(如 b,bc,c )
mysql&gt; alter table &lt;table_name&gt; add index &lt;index_name&gt;(&lt;cloumn_name1&gt;,&lt;cloumn_name2&gt;,&lt;cloumn_name3&gt;)
```
### 1.1.2. 查看某个语句在查询时是否使用了索引,使用了那些索引  
```sql
mysql&gt; explain select * from world.city where Name = &#39;Chongqing&#39;\G
***************************[ 1. row ]***************************
id            | 1
select_type   | SIMPLE
table         | city
type          | ref
possible_keys | idx_name
key           | idx_name
key_len       | 35
ref           | const
rows          | 1
Extra         | Using index condition

-- type: 表示mysql在表中找到所需行的方式,又称&#34;访问类型&#34;
--- 常见类型有: ALL,index,range,ref,eq_ref, const,system, NULL 从左到又,性能从差到好 
--- ALL: 全表扫描,未使用索引查询(1. 语句写的有问题, 2. 索引问题) 

--- index: 全索引扫描
---- explain select count(*) from city ;

--- range: 范围扫描, 关键字包含 &gt;、&lt;、&gt;=、&lt;=、between...and、in()、or、like &#39;x%&#39;
---- explain select * from city where `CountryCode` like &#39;CH%&#39;

--- ref: 使用非唯一索引(即非主键或唯一索引)扫描或者唯一的前缀扫描，返回匹配某个单独值的记录行
---- explain select * from city where Name = &#39;Chongqing&#39;

--- eq_ref: 类似ref，区别就是在使用的索引是唯一索引，对于每个索引键值，表中只有一条记录匹配(join条件使用的是primary key 或者 unique key)

--- const、system: 将组件设置为where 的条件
---- explain select * from city where id = 1;

--- NULL: --------

-- key_len: 代表索引长度，若索引长度较长，可以将其替换为前缀索引

-- Extra: 相当于一个描述吧 
--- 当出现 Using temporary; Using filesort; Using join buffer 时候，一般代表涉及到排序操作时部分数据可能未走索引，因此导致性能问题。

```

### 1.1.3. 索引设计的原则
  为了使索引的使用效率更高，在创建索引时，必须考虑在哪些字段上创建索引和创建什么类型的索引。
那么索引设计原则又是怎样的?  
#### 1.1.3.1. 运维规范 
1. 选择唯一性索引(重点关注)
    - 唯一性索引的值是唯一的，可以更快速的通过该索引来确定某条记录。例如，学生表中学号是具有唯一性的字段。为该字段建立唯一性索引可以很快的确定某个学生的信息。
如果使用姓名的话，可能存在同名现象，从而降低查询速度。主键索引和唯一键索引，在查询中使用是效率最高的。  
 
2. 为经常需要排序、分组和联合操作的字段建立索引(重点关注)
    - 经常需要`ORDER BY`、`GROUP BY`、`DISTINCT`和`UNION`等操作的字段，排序操作会浪费很多时间。  
    - 如果为其建立索引，可以有效地避免排序操作。  

3. 为常作为查询条件的字段建立索引(重点关注)
    - 如果某个字段经常用来做查询条件，那么该字段的查询速度会影响整个表的查询速度。因此，为这样的字段建立索引，可以提高整个表的查询速度。  
 
4. 尽量使用前缀来索引(重点关注)
    - 如果索引字段的值很长，最好使用值的前缀来索引。例如，TEXT和BLOG类型的字段，进行全文检索会很浪费时间。如果只检索字段的前面的若干个字符，这样可以提高检索速度。  
 
5. 限制索引的数目
    - 索引的数目不是越多越好。每个索引都需要占用磁盘空间，索引越多，需要的磁盘空间就越大(查询是IO消耗大)。修改表时，对索引的重构和更新很麻烦。越多的索引，会使更新表变得很浪费时间。  
 
6. 尽量使用数据量少的索引
    - 如果索引的值很长，那么查询的速度会受到影响。例如，对一个CHAR（100）类型的字段进行全文检索需要的时间肯定要比对CHAR（10）类型的字段需要的时间要多。  
 
7. 删除不再使用或者很少使用的索引
    - 表中的数据被大量更新，或者数据的使用方式被改变后，原有的一些索引可能不再需要。数据库管理员应当定期找出这些索引，将它们删除，从而减少索引对更新操作的影响。  
  
#### 1.1.3.2. 开发规范(草稿)  
不走索引的情况： 
重点关注：  
- 没有查询条件，或者查询条件没有建立索引  
`select * from tab;`   全表扫描。  
`select  * from tab where 1=1;`
 
在业务数据库中，特别是数据量比较大的表。  
是没有全表扫描这种需求。  
1. 对用户查看是非常痛苦的。  
2. 对服务器来讲毁灭性的。  
  `select * from tab;`

SQL改写成以下语句：  
- `selec  * from tab  order by  price  limit 10`  # 需要在price列上建立索引 
- `select  * from  tab where name=&#39;zhangsan&#39;`     # name列没有索引  
改：  
  - 换成有索引的列作为查询条件  
  - 将name列建立索引  


查询结果集是原表中的大部分数据，应该是30％以上。  
 
查询的结果集，超过了总数行数30%，优化器觉得就没有必要走索引了。  
假如：tab表 id，name    id:1-100w  ，id列有索引  
 
`select * from tab  where id&gt;500000; ` 
 
如果业务允许，可以使用limit控制。  
怎么改写 ？  
结合业务判断，有没有更好的方式。如果没有更好的改写方案  
尽量不要在`mysql`存放这个数据了。放到`redis`里面。  
 
- 索引本身失效，统计数据不真实   
索引有自我维护的能力。  
对于表内容变化比较频繁的情况下，有可能会出现索引失效。 
 
- 查询条件使用函数在索引列上，或者对索引列进行运算，运算包括(&#43;，-，*，/，! 等)  
例子：  
错误的例子：`select * from test where id-1=9;`  
正确的例子：`select * from test where id=10; ` 
 
 
- 隐式转换导致索引失效.这一点应当引起重视.也是开发中经常会犯的错误.  
由于表的字段tu_mdn定义为varchar2(20),但在查询时把该字段作为number类型以where条件传给数据库,  
这样会导致索引失效.   
错误的例子：`select * from test where tu_mdn=13333333333`;  
正确的例子：`select * from test where tu_mdn=&#39;13333333333&#39;`;  


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/mysql/mysql%E4%BC%98%E5%8C%96/  

