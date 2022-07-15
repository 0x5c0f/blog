# Python 基础语法



# 1. 循环注意  
```python
for item in range(10):
    print(item)
    if item == 2:
        break
        
else:       
    # 当上述循环正常完整的执行完后执行当前分支内容, break为非正常执行完成,不执行else内容 
    print("hello")

i=0
while i < 3:
    print(i)
    i +=1
else:
    # 当上述循环正常执行完成后执行当前分支内容,break为非正常执行
    print("i=3",i)
```

# 2. 三元运算
```python
# 如果条件成立  值1 否则 值2
result = 值1 if 条件 else 值2
```

# 3. range 
```python
# 共10个数, 从0 开始 打印到9 
for i in range(10) :
    print(i)

#共10个数,从0开始,每隔2个数打印一次 
for i in range(0,10,2):
    print(i)
```
# 4. python 模块 
## 4.1. sys 
```python
print(sys.path) # 打印系统环境变量 

print(sys.args) # 打印脚本传递参数 第一个为脚本名称($(pwd)/script_name) 后续为脚本传递的参数值 
```

## 4.2. os 
```python
print(os.system("ls")) # 执行系统命令,并将结果打印到前台,并返回执行状态(成功)0或非0(失败)

print(os.popen("ls").read()) # 执行系统命令,并将结果存入内存中,使用read读取并打印到前台
```

# 5. 数组类型 
## 5.1. bytes 
```python
msg = "你好 , Python! "
print(msg.encode(encoding="UTF-8"))
print(msg.encode(encoding="utf-8").decode(encoding="utf-8"))
```
## 5.2. 列表  
### 5.2.1. 列表就是java的数组,不过python的列表可以各个类型混用
```python
### 列表生成式 ###
# arr = [ i*2 for i in range(10) ] 列表中可以是函数调用 
# arr = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
### 列表生成式 ###

arr = ["a","b","c","d","e","z","z",1]
arr2 = [1,2,3,4]
arr3 = ["01", "02", "03"]

print(arr[0],arr[3])
#切片: 取出下标为0-2的字符串,包前不包后 
print(arr[0:3])
#切片:  取出最后一个值
print(arr[-1])
#切片:  取出最后3个值
print(arr[-3:])
#切片:  取出倒数第二个第三个值
print(arr[-3:-1])
#切片: 每隔一个值取值
print(arr[1:-1:2]) # == arr[::2]


# 增加
arr.append("zz")
# 插入
arr.insert(0,"aa")
# 修改
arr[2] == "bb"

# 删除 
arr.remove("d")
del arr[4]  # 4 : e 
# 默认删除最后一个值,
arr.pop()
# 删除倒数第二个值 和 del arr[-2] 等价
arr.pop(-2)
# 查询 
print(arr.index("aa"))
# 统计值总共的个数 
print(arr.count("z"))

# 反转列表值
arr.reverse()

# 列表合并,新列表追加到末尾 
arr.extend(arr2)

# 删除列表 
del arr2

arr.append(arr3)

# 列表复制(浅copy: 只复制第一层)
{
    # 作用: 用于创建联合账号 
    #arr4 = arr[:]
    #arr4 = list(arr)
    arr4 = arr.copy()
    del arr3
    arr[0] = "AA"
    arr[-1][0] = "001"

    print(arr)
    print(arr4)

# arr=['AA', 'a', 'bb', 'c', 'z', 'z', 1, 1, 2, 3, 4, ['001', '02', '03']]
# arr4=['aa', 'a', 'bb', 'c', 'z', 'z', 1, 1, 2, 3, 4, ['001', '02', '03']]
}

# 等号赋值
{
    arr5 = arr 
    arr[11][1] = "002"
    print(arr,arr5)

# ['AA', 'a', 'BB', 'c', 'z', 'z', 1, 1, 2, 3, 4, ['001', '002', '03']]
# ['AA', 'a', 'BB', 'c', 'z', 'z', 1, 1, 2, 3, 4, ['001', '002', '03']]
}

# 深COPY 
{
    import copy

    # copy.copy 相当于 列表的copy
    arr6 = copy.deepcopy(arr)

    arr[-1][2] = "003"
    arr[6] = 11

    print(arr,arr6)
    # ['AA', 'a', 'BB', 'c', 'z', 'z', 11, 1, 2, 3, 4, ['001', '002', '003']]
    # ['AA', 'a', 'BB', 'c', 'z', 'z', 1, 1, 2, 3, 4, ['001', '002', '03']]
}
```

### 5.2.2. 列表 COPY 图示 

<details>
<summary> 浅 copy 图示 </summary>

![python.arr.copy](../../Attach/images/python.arr.copy.png)
</details>

<details>
<summary> 等值图示 </summary>

![python.arr.eq](../../Attach/images/python.arr.eq.png)
</details>

<details>
<summary> 深 COPY 图示 </summary>

![python.arr.deepcopy](../../Attach/images/python.arr.deepcopy.png)
</details>

### 5.2.3. 列表遍历索引的几种方式  
```python
arr = ["a", "b", "c", "d", "e", "z", "z", 1]
# 1.
n = 0
for i in arr:
    print(n,i)
    n += 1

# 2.
print("-----------")
for i in range(len(arr)):
    print(i,arr[i])

# 3. 
print("-----------")
for i,item in enumerate(arr):
    print(i,item)

```

## 5.3. 元组(只读列表)
```python
# 只能查看、切片
arr = ("a","b","c","d","e","z","z",1)
```

## 5.4. 字典(map) key, value 
- 字典无序  
- key 唯一  
```python
info = {
    'A': "1", 
    "B": "2", 
    "C": "33"
}

print(info["A"])
# 存在修改 不存在 新增
info["A"] = "11"
info["D"] = "44"

# 删除 
del info["A"]
info.pop("D")
# 随机删除 
info.popitem()

## 查询 
info["A"]  # 存在返回值,不存在抛出异常 
print(info.get("B")) # 存在返回值,不存在返回None
print("B" in info)  # 存在返回True   不存在 返回False

# 若 key存在,则不做任何操作,若key不存在,则新增字典值 
info.setdefault("A","000")

info1 = {
    "A":"111",
    1 : "2"
}

# 合并两个字典的值,相同key则更新,不同直接合并
info.update(info1)
# 将字典转换为列表 
info2 = info.items()

# 初始化新的字典key 1,2,3 value: default (仅适用于创建一维字典,多为字典存在浅COPY的问题)
info3 = dict.fromkeys([1,2,3],"default")

# 字典循环
for i in info: 
    print("in:", i,info[i])

for k,v in info.items():
    print("kv:",k,v)

```

## 5.5. 集合 
```python

arr = ["a", "b", "c", "d", "e", "z", "z", 1]
# 将列表转换为集合(合并重复项,可用于列表去重复)
arr = set(arr)

# 集合定义
arr1 = set(["a", "b", "c", "dd", "ee", "z"])
arr2 = set(["aa", "bb", "cc", "dd", "ee", "zz"])
arr3 = set(["a", "b", "c"])

# 获取集合长度 
print(len(arr1))

# 判断字符串是否在集合内 True/False
print("a" in arr1)

# 判断字符串是否不在集合内 True/False
print("a" not in arr1)


# 获取集合交集
arr4 = arr1.intersection(arr2)  # (arr1 & arr2)
print(arr4)

# 获取集合并集
arr5 = arr1.union(arr2)     # (arr1 | arr2)
print(arr5)

# 获取集合差集(arr1中存在,arr2中不存在)
arr6 = arr1.difference(arr2)    # (arr1 - arr2 )
print(arr6)

# 判断 arr1 是不是arr3 的子集, 返回True/false
arr7 = arr1.issubset(arr3)
print(arr7)

# 判断 arr1 是不是arr3 的父集, 返回True/false
arr8 = arr1.issuperset(arr3)
print(arr8)

arr9 = set([1,2,3,4])
arr10 = set([3,4,5,6])

# 对称差集(交集取反?)  
arr11 = arr9.symmetric_difference(arr10)    #  (arr9 ^ arr10)
print(arr11)

```

# 6. 字符串操作 
```python
str="tHis is test Str"
# 首字母大写
print(str.capitalize())
# 统计字符在str中的个数
print(str.count("t"))
# 全小写
print(str.casefold())

# 让字符串居中显示,总共显示50个字符,不够使用# 填充 
print(str.center(50,"#"))

# 判断字符串以什么结尾 True/False
print(str.endswith("Str"))
# 判断字符串以什么开头 True/False
print(str.startswith("tHis"))
# 查找字符串下标位置,无结果返回-1,只搜索第一次匹配到的下标
print(str.find("H"))

# 判断字符串是否为一个阿拉伯数字或字符 True/False
# a-zA-Z0-9
print("str123".isalnum())
# 判断字符串是否为纯英文字符 True/False
print("Astr".isalpha())
# 判断字符串是否为一个合法的标识符(变量名)
print("_str".isidentifier())
# 判断字符串每个首字母是不是大写 True/False
print("Str Is tr".istitle())

{
    # 表示以str 分割##的每一个字符
    print(str.join("##"))

    # 可用于将列表转换为字符串
    print("".join(["1","2","3"])) 
}

# 指定字符串长度,若字符串长度不够,使用#在末尾填充
print(str.ljust(50,"#"))
# 指定字符串长度,若字符串长度不够,使用#在首列填充
print(str.rjust(50,"#"))
# 将字符串变成全小写
print(str.lower())

# 去除字符串左边的换行符和空格
print("\n str".lstrip())
# 去除字符串右边的换行符和空格
print("\nstr".rstrip())
# 去除左右两边的换行符和空格
print("\n  str  \n".strip())

{   
    # 算是一种加密解密的东西吧
    p = "".maketrans("abcd","1234")
    print("abcf".translate(p))
}

# 将字符串中的一个字符替换为另一个字符,可指定替换个数(从左向右)
print(str.replace("t","T"))
# 搜索字符串中最后一个匹配字符的下标
print(str.rfind("e"))

# 将字符串以特定字符分割(默认空格分割),返回一个列表 
print(str.split())

# 反转字符串中的大小写
print(str.swapcase())
```

