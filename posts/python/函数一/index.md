# Python 函数相关(一)


# 1. 函数参数释义
1. 必选参数   
    函数定义时,定义了接收变量,那么在函数调用时就必须传递该参数值
2. 默认参数  
    在函数定义时,可为需要接受值的参数设置一个默认值,若函数调用时,该参数未传入值时,则使用默认值  
3. 可变参数  
    - `*args`(关键字参数) : 可向函数中传递0个或多个参数(类似String...args),内部变量若为`*args`,结果将为元组,独立值将会顺序接收  
    - `**kwargs`(命名关键字参数) : 可向函数中以键值对的形式传递0个或多个参数,内部变量若为`**kwargs`,结果将为字典,独立值将会顺序接收  
4. 组合参数  
    用必选参数、默认参数、可变参数、关键字参数和命名关键字参数，这5种参数可组合使用,但参数传递顺序必须是: 必选参数、默认参数、可变参数、命名关键字参数和关键字参数。


# 2. 函数即&#34;变量&#34;
# 3. 高阶函数 
一个变量可以指向函数，函数的参数能接收变量，那么一个函数就可以接收另一个函数作为参数，这种函数就称之为高阶函数
# 4. 嵌套函数    
一个函数中可以包含另一个函数

# 5. 装饰器 
1. 示例代码1: 
```python
import time
def wrapper(func):
    def demo(*args, **kwargs):
        print(&#34;装饰器函数参数调用层 : &#34;, time.time())
        res = func(*args, **kwargs)
        print(&#34;装饰器函数调用函数参数 : &#34;, args, kwargs)
        return res
    return demo

@wrapper  # 注入?
# 函数即变量
#@test == {
#    test2=test(test1);
#调用
#    test2(11, a=&#34;01&#34;)
#}  == { test1 = test(test1) }
def calc(x, **kwargs):
    y = x * 10
    return &#34;计算结果 y : %s&#34; % y

calc(11, a=&#34;01&#34;)

print(&#34;=======================&#34;)

print(calc(11, a=&#34;01&#34;))
```
2. 示例代码2: 
```python
import time
def wrapper(ltype):
    print(&#34;装饰器参数传递层 wrapper: &#34;,ltype)
    def demo(func):
        print(&#34;装饰器函数传递层 demo: &#34;, ltype, func)
        def A(*args, **kwargs):
            print(time.time())
            print(&#34;装饰器调用函数参数传递层 A : &#34;,  args, kwargs,ltype,func)
            res = func(*args,**kwargs)
            print(&#34;装饰器参数传递值 ltype :&#34;, ltype)
            return res
        return A
    return demo

@wrapper(ltype=&#34;Add&#34;)
def calc(x,y,name):
    z = x &#43; y
    print(z)
    return z

print(calc(1, 2,name=&#34;123&#34;))
```

# 6. 生成器
在`python`中, 一边循环,一边计算的机制,就叫做生成器.  
生成器不会第一时间将所有结果生成出来,他只会在循环到(调用)的时候才会生成需要的值,因此对于生成器产生的值是不允许切片的,另外,他每次调用也仅仅只保留当前正在被调用的这个值  
生成器定义, 对于列表生成式将`[]` 替换为 `()`,创建出来的结果就是一个生成器 ,对于函数,包含了`yelid`变量(可用于模拟多线程)的就是一个生成器.   

## 6.1. 生成器创建 
示例1: 
```python
# 列表创建
arr = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
# 列表生成式创建 
arr = ( i*2 for i in range(10) )
# arr = &lt;generator object &lt;genexpr&gt; at 0x7fa19c4b9570&gt;
arr.__next__()
```
示例2:
```python
# 菲波拉契数列
# 0 1 1 2 3 5 8 13 21 34 ...
def fib(max):
    n, a , b = 0, 0, 1
    while n &lt; max:
        yield b
        a, b = b, a&#43;b

        n = n &#43; 1
    return &#34;None&#34;

fib(10)
# fib(100) = &lt;generator object fib at 0x7efc212447c8&gt;

# fi = fib(10)
# print(next(fi))
# print(fi.__next__())

# 相关解释
# 1. yield 可以看成一个return但也有不同,当循环每次执行到此处的时候,他会返回结果值并暂停此次循环,以等待下一次的调用
#
# 2. 等式 a,b = b, a&#43;b 并不等于
# {
#  a = b
#  b = a&#43;b
# }
# 实际等于
# t = (a, a&#43;b)
# a = t[0]
# b = t[1]
# 关于函数的return
# 由于生成生成器的调用必须使用__next__()来进行,而数据的生成大部分的时候都将会有最终的结果,而__next__()的时候是不会知道下一个值是否真正的存在,
# 此时__next__()就将会抛出一个程序异常,而这个异常的值就是return返回的值 .
```
## 6.2. 生成器调用 
生成器的调用, 在2.7中使用的是 `next(arr)`, 3.x中使用的是`arr.__next__()`,不过`next(arr)` 在3.x同样也可以使用  

## 6.3. 生成器模拟多线程运行示例(协程)
```python
def work(name):
    print(&#34;%s 准备开始工作 !&#34; %name)
    while True:
        things = yield name     # yield 后面可跟一个值,该值为send()调用后返回结果  
        print(&#34;%d 号文件已经收到了 , %s 打开了电脑, 开始工作 !&#34; %(things,name))

import time
def people():
    w1 = work(&#34;用户1&#34;)      # 函数调用仅代表创出    w1 = work(&#34;用户1&#34;)      # 函数调用仅代表创出建一个生成器 
建一个生成器 
    w2 = work(&#34;用户2&#34;)
    w1.__next__()           # 只有在调用的时候才会进行第一次next,从而暂停到 yield 处 
    w2.__next__()
    for i in range(5):
        time.sleep(1)
        num = i&#43;1
        print(&#34;%s 号工作任务文件来了 ! &#34; % num)
        ww1 = w1.send(num)
        ww2 = w2.send(num)
        print(&#34;ww1: %s, ww2: %s&#34; %(ww1,ww2))

people() 
```

# 7. 构造函数和析构函数
```python
# 构造函数__init(self)__, 用于类被实例化时候使用，通常用于初始化实例变量 ,每个类必须有一个构造函数
# 析构函数__del(self)__, 一般用于在实例被销毁、释放的时候调用，通常用于一些收尾工作，比如数据库链接，打开的临时文件等
class Demo(object):
    c = 000
    def __init__(self,name):
        self.name = name

    def __del__(self):
        print(&#34;del: &#34;,self.name, self.c)
        print(&#34;函数关闭&#34;)

d = Demo(&#34;Tname&#34;)
d.c = 111
d.c1 = 222
print(d.c, d.c1 , d.name)
```
# 8. 私有属性和私有方法
在`Python`类中以`__`开头的变量为私有变量(属性)，以`__`开头的函数为私有函数(方法),他们在类的外部不可查，不可被调用  
```python
class Demo(object):
    __c = 111
    def __init__(self,name):
        self.name = name
        self.__age = 123

    def __b():
        print(&#34;hello&#34;)

d = Demo(&#34;Tname&#34;)

print(d.__c,  d.__age)
&#34;&#34;&#34;
Traceback (most recent call last):
  File &#34;/home/cxd/Projects/node/Python/python.project/practice_script/1.py&#34;, line 13, in &lt;module&gt;
    print(d.__c,  d.__age)
AttributeError: &#39;Demo&#39; object has no attribute &#39;__c&#39;
&#34;&#34;&#34;

d.__b()
&#34;&#34;&#34;
Traceback (most recent call last):
  File &#34;/home/cxd/Projects/node/Python/python.project/practice_script/1.py&#34;, line 22, in &lt;module&gt;
    d.__b()
AttributeError: &#39;Demo&#39; object has no attribute &#39;__b&#39;
&#34;&#34;&#34;
```

# 9. 迭代(Iterable) 
从某个地方（比如一个列表）取出一个元素的过程。当我们使用一个循环来遍历某个东西时，这个过程本身就叫迭代   
1. 判断对象是否可迭代(对象):  
```python
from collections.abc import Iterable
print(isinstance(&#39;abc&#39;, Iterable))
# True
print(isinstance([], Iterable))
# True
print(isinstance(10, Iterable))
# False
print(isinstance((x for x in range(10)), Iterable))
# True
```

# 10. 迭代器(Iterator) 
可以被next()函数调用并不断返回下一个值的对象被成为迭代器  
生成器一定是一个迭代器,但迭代器不一定是一个生成器(生成器可能是一个列表或其他不能被`next()`的可迭代对象,)   

1. 判断对象是否是一个迭代器(对象):  
```python
from collections.abc import Iterator
isinstance([], Iterator)
# False
isinstance(iter([]), Iterator)  ## 通过函数 iter() 可将列表等迭代对象变成迭代器 
# True
isinstance((i for i in range(12)), Iterator)
# True
```

# 11. 内置函数 
&gt; 详见官方文档 : [https://docs.python.org/zh-cn/3.7/library/functions.html](https://docs.python.org/zh-cn/3.7/library/functions.html)  

&gt; Map，Filter 和 Reduce [https://eastlakeside.gitbooks.io/interpy-zh/content/Map_n_Filter/](https://eastlakeside.gitbooks.io/interpy-zh/content/Map_n_Filter/)  


```python
# 判断可迭代对象内值是否全部为真(非0都为真),是:true 否:false
print(all([-1,0,1]))
# False

# 判断可迭代对象内值是否至少有一个为真,是:true 否:false
print(any([-1,0,1]))
# True

# 将10进制转换为二进制 
print(bin(1),bin(2),bin(4))
# 0b1 0b10 0b100

# 返回一个新的 bytes 数组。 bytearray 类是一个可变序列，包含范围为 0 &lt;= x &lt; 256 的整数。它有可变序列大部分常见的方法，见 可变序列类型 的描述；同时有 bytes 类型的大部分方法，参见 bytes 和 bytearray 操作。
{
    arr = bytearray(&#34;abc&#34;, encoding=&#34;utf-8&#34;)
    print(&#34;arr=%s, arr[0] = %s ,arr[1] = %s ,arr[2] = %s &#34;  %( arr, arr[0], arr[1],arr[2]))
    # arr = bytearray(b&#39;abc&#39;), arr[0] = 97, arr[1] = 98, arr[2] = 99
    arr[0] = 100
    print(&#34;arr=%s, arr[0] = %s ,arr[1] = %s ,arr[2] = %s &#34;  %( arr, arr[0], arr[1],arr[2]))
    # arr = bytearray(b&#39;dbc&#39;), arr[0] = 100, arr[1] = 98, arr[2] = 99
}

# 判断对象是否可被调用,是:true 否:false (即判断对象是否为一个函数或类或者说是是否可以在对象后面加上()进行调用)
print(callable(dir))        # dir 是一个函数,因此可以 dir()
# True 

# 将字符串转换为可执行的代码 (自动化 ?)
{
    str=&#34;&#34;&#34;
    def demo():
        print(&#34;hello word&#34;)

    demo()
    &#34;&#34;&#34;
    test = compile(str,&#39;&#39;,&#34;exec&#34;)
    exec(test)
    # hello word
}

# 从 iterable 对象中过滤出 function 中返回真的那些元素, (结果返回一个生成器) 
{
    # filter(function,iterable)
    res = filter(lambda n: n &lt; 5, range(9))
    for i in res:
        print(i)
    # 0 1 2 3 4 
}

# 将 iterable 中的值通过 function 进行处理从而返回处理结果 , (结果返回一个生成器) 
{
    # filter(function,iterable)
    res = map(lambda n: n * 2, range(5))
    for i in res:
        print(i)
    # 0 2 4 6 8
}   
# 创建不可遍集合 
arr = frozenset([1,2,3,4,5]) 

# 获取可迭代对象的中的最大值
max([1,2,3,4,5])
# max(1,2,3,4,5)

# 将可迭代对象进行排序
{
    arr1 = {
        1:1,
        4:3,
        2:4,
        3:5,
        7:6,
        8:22,
        11:3,
        5:51
    }
    print(sorted(arr1))
    # [1, 2, 3, 4, 5, 7, 8, 11]

    print(sorted(arr1.items()))
    # [(1, 1), (2, 4), (3, 5), (4, 3), (5, 51), (7, 6), (8, 22), (11, 3)]

    print(sorted(arr1.items(),key=lambda x:x[1]))
    # 
    # [(1, 1), (4, 3), (11, 3), (2, 4), (3, 5), (7, 6), (8, 22), (5, 51)]


    arr2 = [1,5,2,3,8,9,4]
    print(sorted(arr2))
    # [1, 2, 3, 4, 5, 8, 9]
}

# zip 合并可迭代对象,以最小长度显示合并后的长度 
a = [1,2,3,4,5,6]
b = [&#39;a&#39;,&#39;b&#39;,&#39;c&#39;,&#39;d&#39;]
c = zip(a,b)
for i in c :
    print(i)
    
# (1, &#39;a&#39;)
# (2, &#39;b&#39;)
# (3, &#39;c&#39;)
# (4, &#39;d&#39;)

```

# 12. 序列化与反序列化(pickle、json)
## 12.1. 序列化:      指将Python对象序列化为一个字节流，以便将它保存到一个文件、存储到数据库或者通过网络传输它。
## 12.2. 反序列化:    指从一个对象文件中读取序列化数据，将其反序列化之后返回一个对象

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/python/%E5%87%BD%E6%95%B0%E4%B8%80/  

