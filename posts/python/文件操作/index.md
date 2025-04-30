# 文件操作


# 1. 文件操作
- 文件读取指针概念  
当`python` 使用`open().read()`读取文件时,是按行从上向下读取,当他读取一行时,会给那行设置一个下标(个人理解)来标注当前读取到那行了,在向下读取过程中,下标逐步增加,直至到最后一行,这个下标即为指针.    

- 模式说明  
    |标识符|描述|文件要求|
    |-|-|-|
    |`r `|只读模式, 只允许读取文件内容|文件必须存在|
    |`r+`|读写模式, 可读可写,不分先后,但写入只能写<br/>入到末尾行|文件必须存在|
    |`b`|二进制操作模式,使用场景一般文操作流文件|-|
    |`w `|新建模式, 写入新的文件内容|若存在文件,清空文件内容,不存在新建|
    |`w+`|写读模式, 可以边写边读,读是从实际的指针位<br/>置开始,可指定指针到开头读取写入内容|存在文件,清空文件内容,不存在新建|
    |`a`|追加模式, 可写但不允许读,只允许从最后一<br/>行开始追加 |存在直接操作,不存在新建|
    |`a+`| 追加读模式, 可读可写,写只能写入到末尾行 |存在直接操作,不存在新建|
    |`U`|表示在读取文件时候,将`\r\n`统一转成`\n`,<br />使用场景一般是在`linux`上读取`win`的文件|-|

## 1.1. 基础语法 

```python

# 打开为文件对象, 默认 mode = "r", encoding="系统编码" 
f = open("file.md") 

# 读取文件内容
data = f.read()

f1 = open("file1.md","w",encoding="utf-8")
# 写入内容到文件 
f1.write("hello python")

f2 = open("file1.md","a",encoding="utf-8")
f2.write("hello python2")

# 文件流关闭 在持续执行程序中必须在文件操作完毕后进行关闭
f.close()

```

## 1.2. 常规操作
```python
f = open("file1.md","r",encoding="utf-8")
# 打印一行 并将指针向下偏移一次
print(f.readline())

# 读取所有行类容,将其转换为以\n为结尾的列表,使用循环遍历每一行
print(f.readlines())

# 打印已读取的光标位置(列)从0开始,字符读取,字节计数(末尾\n)
print(f.tell())

# 读取3个字符 
print(f.read(3))

# 设置上一读取行指针位置
f.seek(2)

#打印文件编码
print(f.encoding)

# 判断文件是否是一个可读取的文件
print(f.seekable())

# 在文件写入后,清空缓存区内容到文件当中
f.flush()

# 在文件的追加模式下,从文件开头(0指针)位置开始截断并重新写入指定长度的字符串
f.truncate(6)

```

## 1.3. 文件读取 with语句
```python
with open("file1.md","r",encoding="utf-8") as f:
    for line in f:
        print(line)

# with 语句也可以同时打开多个文件 
with open("file1.md","r",encoding="utf-8") as f1,\
     open("file2.md","r",encoding="utf-8") as f2:
    print(f1.readlines())
    print(f2.readlines())

```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/python/%E6%96%87%E4%BB%B6%E6%93%8D%E4%BD%9C/  

