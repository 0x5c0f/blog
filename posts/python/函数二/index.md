# Python 函数相关(二)



# 1. 多态
同一个方法在不同的类中最终呈现出不同的效果，即为多态。  
```python
class demo1(object):
    def __init__(self,width,height):
        self.width = width
        self.height = height
 
    def getArea(self):
        area=self.width* self.height / 2
        return area
 
class demo2(object):
    def __init__(self,size):
        self.size = size
 
    def getArea(self):    # 同一个方法在不同的类中最终呈现出不同的效果，即为多态
        area = self.size * self.size
        return area
 
 
a=demo1(5,5)
print(a.getArea())
b=demo2(5)
print(v.getArea())

```
# 2. 继承 重构 重写 重载 
`Python`的继承没有类似`java`中的`extends`关键字，当`Python`中一个类需要继承另一个类的时候,只需要将被继承的类通过变量形式传递给新类，即可完成继承  
`Python`还可以实现多继承，将多个被继承类通过变量形式传递给新类，即可完成多继承   
## 2.1. 重写
方法名相同，参数相同，内容不同
## 2.2. 重载
方法名字相同，参数不同  


# 3. 继承查询 
`Python2` 经典类都是按照深度类查询(及深度优先搜索算法)  
`Python2` 新式类都是按照广度类查询(及广度优先搜索算法)  
`Python3` 新式类和经典类都是按照广度类查询 

# 4. 示例： 
只能说是可以用，但还是有很大部分的疑问，只能用仅剩的一点`java`记忆强行解释了    
```python
class Farm(object):
    def __init__(self,name,addr):
        self.name = name
        self.addr = addr

    def Recruit(self,worker_obj):
        pass

    def BuyAnimal(self,animal_obj):
        pass

    def SellAnimal(self,animal_obj):
        pass

    def Resign(self,worker_obj):
        pass

class FarmMember(Farm):
    def __init__(self,name,addr):
        # 这种也应算重载
        super(FarmMember,self).__init__(name,addr)
        self.farmers = []

    def Recruit(self, farmer_obj):
        # 重写
        print(&#34;为农场申请了一个管理员 %s &#34; % farmer_obj.name)
        self.farmers.append(farmer_obj)

    def Info(self):
        pass

class Manager(FarmMember):
    def __init__(self,name,addr,age,sex):
        # 重载
        super(Manager, self).__init__(name, addr)
        self.age = age
        self.sex = sex
        self.workers = []

    def Info(self):
        #重写
        print(&#39;&#39;&#39;
        --- 管理员 Info %s --- 
        名字 : %s 
        年龄 : %s 
        性别 : %s 
        地址 : %s 
        &#39;&#39;&#39;%(self.name,self.name,self.age,self.sex,self.addr))

    def Recruit(self,worker_obj):
        #重写
        print(&#34;管理员招聘了一个名叫 %s 的员工 &#34; % worker_obj.name)
        self.workers.append(worker_obj)

    def BuyAnimal(self,animal_obj):
        #重写
        print(&#34;管理员购买了 %s 个 %s , 花费了 %s 元&#34;%(animal_obj.num, animal_obj.name ,(animal_obj.num * animal_obj.price)))

    def SellAnimal(self,animal_obj):
        #重写
        print(&#34;管理员出售了%s 个 %s, 卖了 %s 元&#34; % (animal_obj.num, animal_obj.name,(animal_obj.num * animal_obj.price)))

    def Resign(self, worker_obj):
        #重写
        print(&#34;管理员辞退了 %s &#34; % worker_obj.name)
        self.workers.remove(worker_obj)

class Home(object):
    def myHome(self):
        print(&#34;我的家在 %s &#34; % self.addr)

class Worker(Manager, Home):
    def __init__(self,name,addr,age,sex,id):
        # 广度查询 Manager --&gt; Home --&gt; Farm
        super(Worker,self).__init__(name, addr, age, sex)
        self.id = id
    def Info(self):
        # 重写
        print(&#39;&#39;&#39;
        --- 工人信息 %s ---
        编号： %s
        名字： %s
        性别： %s
        年龄： %s
        家庭地址： %s
        &#39;&#39;&#39; % (self.name,self.id,self.name,self.sex,self.age,self.addr))

class Animals(Manager, FarmMember):
    def __init__(self,name,num,price):
        # 重载
        self.name = name
        self.num = num
        self.price = price

    def Info(self):
        # 重写
        print(&#39;&#39;&#39;
        --- 动物信息 %s 
        名字: %s 
        数量：%s
        单价：%s 
        &#39;&#39;&#39; %(self.name,self.name,self.num,self.price))

# 实例化农场
fmmr = FarmMember(&#34;草原1号&#34;, &#34;山咔咔&#34;)

# 实例化管理员
fr = Manager(&#34;张三&#34;, &#34;重庆&#34;, &#34;33&#34;, &#34;男&#34;)
fmmr.Recruit(fr)
# 申请一个管理
fr.Info()

#实例化普通员工
wr1 = Worker(&#34;李四&#34;,&#34;北京&#34;,&#34;21&#34;,&#34;男&#34;,1001)
wr1.Info()
wr2 = Worker(&#34;王五&#34;,&#34;上海&#34;,&#34;22&#34;,&#34;男&#34;,1002)
wr2.Info()
wr3 = Worker(&#34;赵六&#34;, &#34;广州&#34;, &#34;22&#34;, &#34;男&#34;, 1003)
wr3.Info()

wr3.myHome()

# 招聘一个普通员工
fr.Recruit(wr1)
fr.Recruit(wr2)
fr.Recruit(wr3)

# 实例化动物
dw1 = Animals(&#34;小鸡&#34;,12,6.7)
dw2 = Animals(&#34;小鸭&#34;,22,4.5)

fr.BuyAnimal(dw1)
fr.SellAnimal(dw2)
fr.Resign(wr2)

print(&#34;%s 管理员下的工人还有 &#34; % fr.name)
for i in fr.workers:
    print(i.name)
```
# 5. 类方法、静态方法、属性方法、property 
- **静态方法：** 通过修饰器`@staticmethod`来进行修饰的方法，静态方法不需要定义参数，因此在静态方法中引用类属性的话，必须通过类对象来引用(实际上不可直接访问类和实例中的任何属性和方法)。可通过实例对象或类对象进行访问。  

- **类方法：** 是类对象所拥有的方法，需要用修饰器`@classmethod`来标识其为类方法，第一个参数必须是类对象，一般以`cls`作为第一个参数。可通过实例对象或类对象进行访问。类方法只能访问类变量，不可访问实例(`self`)变量。  

- **属性方法：** 通过`@property`来进行修饰，可以将类方法转换为属性对象，使其调用时候可以直接通过实例对象像调用类属性一样进行调用，其总共包含三种访问形式`@property`, `@方法名.setter`, `@方法名.deleter`。一般用来处理私有变量。和`java`的[`getter、setter`](https://segmentfault.com/q/1010000008022583)方法有点类似(吧？个人感觉没什么卵用的样子，可能是没有用到)    

- **`property`：**  大部分的解释是*函数的作用是在新式类中返回属性值*,个人还并不是特别理解这个的意思，不过用`java`来对比的话,就是`getter`、`setter`的升级版。`property`总共包含4个参数:  
    1. 第一个参数是*方法名*，在调用`(类/实例)对象.属性`自动触发执行方法;  
    2. 第二个参数是*方法名*，在调用`(类/实例)对象.属性=xx`时自动触发执行方法;  
    3. 第三个参数是*方法名*，在调用`del (类/实例)对象.属性`时自动触发执行方法;  
    4. 第四个参数是*字符串*，在调用`实例对象.属性.__doc__`,此参数是该属性的描述信息;  

示例： 
```python
class FarmMember(object):
    addr = &#34;xxx.xxx&#34;

    def __init__(self, title):
        self.title = title
        self.__ID = None
        self.__systemID = None

    @classmethod
    def classGetAddr(cls, param):
        print(&#34;动态方法: Farm 地址: %s 外部传递参数: %s&#34; % (cls.addr, param))

    @classmethod
    def classUpdateAddr(cls, param):
        cls.addr = &#34;---.---&#34;
        cls.classGetAddr(param)

    @staticmethod
    def staticGetAddr(param):
        print(&#34;静态方法: Farm 地址: %s 外部传递参数: %s &#34; % ( FarmMember.addr, param))

    @property
    def farmID(self):
        &#34;&#34;&#34;getFarmID(self)&#34;&#34;&#34;
        print(&#39;@property: addr = %s ,farmID = %s&#39; % (self.addr,self.__ID))

    @farmID.setter
    def farmID(self,value):
        &#34;&#34;&#34;setFarmID(self,value)&#34;&#34;&#34;
        print(&#34;@farmID.setter : addr = %s, farmID = %s&#34; % (self.addr, value))
        self.__ID = value

    @farmID.deleter
    def farmID(self):
        print(&#34;@farmID.deleter : addr = %s, farmID = %s&#34; % (self.addr,self.__ID))
        del self.__ID

    def __getSystemID(self):
        print(&#34;getSystemID: self.__systemID = %s&#34; % self.__systemID)

    def __setSystemID(self, value):
        &#34;&#34;&#34; 必须传递两个参数&#34;&#34;&#34;
        print(&#34;setSystemID: self.__systemID = %s, value = %s&#34; %(self.__systemID,value))
        self.__systemID = value

    def __delSystemID(self):
        print(&#34;delSystemID: self.__systemID = %s&#34;%self.__systemID)
        del self.__systemID

    systemId = property(__getSystemID, __setSystemID, __delSystemID,&#34;systemID descript&#34;)


fr = FarmMember(&#34;fr title&#34;)
fr.classGetAddr(&#34;实例对象访问&#34;)
FarmMember.classGetAddr(&#34;类对象访问&#34;)
print(&#34;---------&#34;)

fr.staticGetAddr(&#34;实例对象访问&#34;)
FarmMember.staticGetAddr(&#34;类对象访问&#34;)
print(&#34;---------&#34;)

fr.classUpdateAddr(&#34;类对象修改类变量&#34;)
print(&#34;---------&#34;)
# 自动执行@property修饰的farmID方法,并返回函数结果
fr.farmID
# 自动执行 @farmID.setter修饰的farmID方法,并将1001赋值给方法的参数
fr.farmID = &#34;1001&#34;
# 自动执行@farmID.deleter修饰的farmID方法
del fr.farmID

print(&#34;---------&#34;)
fr.systemId
fr.systemId = &#34;900001&#34;
del fr.systemId
print(FarmMember.systemId.__doc__)
```

# 6. __metaclass__ 
这个东西个人感觉又有点像注入的感觉吧，他的作用是在某个类中定义当前类按照什么方式来被初始化(或者创建)，大概就是这个意思吧 

# 7. 反射 
通过字符串映射或修改程序运行时的状态、属性、方法, 有以下4个方法  
- `getattr(object, str, default=None)` 得到对象中字符串表示的方法的内存地址  
- `hasattr(object, str): ` 判断一个对象中是否包含字符串表示的方法  
- `setattr(object, str, func): ` 为类添加一个新的函数(或变量)  `object.str = func`  
- `delattr(class_object,str): ` 删除类中表示字符串的变量(或函数),等价于 `del class_object.str`  

示例代码:  
```python
class Judge(object):

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def add(self):
        print(&#34;x &#43; y = %s&#34; % (self.x &#43; self.y))

    def sub(self):
        print(&#34;x - y = %s&#34; % (self.x - self.y))


def multiply(self):
    print(&#34;x * y = %s&#34; % (self.x * self.y))

m = Judge(100, 200)

cho = input(&#34;&gt;: &#34;).strip()

if hasattr(m, cho):
    if cho == &#34;sub&#34;:
        # 这个方法实际上是用于删除属性变量的，如果要删除函数，必须使用类对象，而不是类实例对象
        delattr(Judge, cho)
        # delattr(m, cho) # AttributeError
    else:
        func = getattr(m, cho)       # 函数及变量，因此如果此处输入的cho为类变量，则将直接返回变量值
        func()
else:
    if cho == &#34;mul&#34;:
        setattr(m, cho, multiply)
        # m.mul(m)     # 这个被调用的方法是cho的值,可以使用下面的方法进行调用
        func = getattr(m, cho)
        func(m)
    else:
        print(&#34;input error &#34;)

print(hasattr(m, cho))

```

# 8. 异常处理 
&lt;details&gt;
&lt;summary&gt; 常见异常 &lt;/summary&gt;

|异常名称| 描述|
|-|-|
|`BaseException`| 所有异常的基类|
|`SystemExit`| 解释器请求退出|
|`KeyboardInterrupt`| 用户中断执行(通常是输入^C)|
|`Exception`| 常规错误的基类|
|`StopIteration`| 迭代器没有更多的值|
|`GeneratorExit`| 生成器(generator)发生异常来通知退出|
|`StandardError`| 所有的内建标准异常的基类|
|`ArithmeticError`| 所有数值计算错误的基类|
|`FloatingPointError`| 浮点计算错误|
|`OverflowError`| 数值运算超出最大限制|
|`ZeroDivisionError`| 除(或取模)零 (所有数据类型)|
|`AssertionError`| 断言语句失败|
|`AttributeError`| 对象没有这个属性|
|`EOFError`| 没有内建输入,到达EOF 标记|
|`EnvironmentError`| 操作系统错误的基类|
|`IOError`| 输入/输出操作失败|
|`OSError`| 操作系统错误|
|`WindowsError`| 系统调用失败|
|`ImportError`| 导入模块/对象失败|
|`LookupError`| 无效数据查询的基类|
|`IndexError`| 序列中没有此索引(index)|
|`KeyError`| 映射中没有这个键|
|`MemoryError`| 内存溢出错误(对于Python 解释器不是致命的)|
|`NameError`| 未声明/初始化对象 (没有属性)|
|`UnboundLocalError`| 访问未初始化的本地变量|
|`ReferenceError`| 弱引用(Weak reference)试图访问已经垃圾回收了的对象|
|`RuntimeError`| 一般的运行时错误|
|`NotImplementedError`| 尚未实现的方法|
|`SyntaxError`| Python 语法错误|
|`IndentationError`| 缩进错误|
|`TabError`| Tab 和空格混用|
|`SystemError`| 一般的解释器系统错误|
|`TypeError`| 对类型无效的操作|
|`ValueError`| 传入无效的参数|
|`UnicodeError`| Unicode 相关的错误|
|`UnicodeDecodeError`| Unicode 解码时的错误|
|`UnicodeEncodeError`| Unicode 编码时错误|
|`UnicodeTranslateError`| Unicode 转换时错误|
|`Warning`| 警告的基类|
|`DeprecationWarning`| 关于被弃用的特征的警告|
|`FutureWarning`| 关于构造将来语义会有改变的警告|
|`OverflowWarning`| 旧的关于自动提升为长整型(long)的警告|
|`PendingDeprecationWarning`| 关于特性将会被废弃的警告|
|`RuntimeWarning`| 可疑的运行时行为(runtime behavior)的警告|
|`SyntaxWarning`| 可疑的语法的警告|
|`UserWarning`| 用户代码生成的警告|

&lt;/details&gt;

示例 1 :  
```python
try:
    print(1/0)
except ZeroDivisionError as e:
    print(&#34;不能除以0&#34;,e)
except Exception as e :
    print(e)
else:
    print(&#34;当没有错误的时候执行这个位置。。。&#34;)
finally:
    print(&#34;finally....&#34;)
```

示例 2 :  
```python
class customException(Exception):
    &#39;&#39;&#39;自定义异常&#39;&#39;&#39;
    def __init__(self,msg):
        self.message = msg 

try:
    raise customException(&#34;这是一个手动抛出的异常&#34;)
except customException as e:
    print(e)
```

# 9. 断言 assert 

语法格式:  
`assert condition,str `
用来判断条件真假,为真执行下一步，为假抛出`AssertionError` 异常   
其功能大致相当于 :
```python
if not condition:
    raise AssertionError()
```

示例 : 
```python
&gt;&gt;&gt; assert True 

&gt;&gt;&gt; assert False,&#34;Error info&#34;
Traceback (most recent call last):
  File &#34;&lt;stdin&gt;&#34;, line 1, in &lt;module&gt;
AssertionError: Error info 

&gt;&gt;&gt; assert 1&#43;1 == 3,&#34;1 &#43; 1 不等于 3 &#34;
Traceback (most recent call last):
  File &#34;&lt;stdin&gt;&#34;, line 1, in &lt;module&gt;
AssertionError: 1 &#43; 1 不等于 3 
 
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/python/%E5%87%BD%E6%95%B0%E4%BA%8C/  

