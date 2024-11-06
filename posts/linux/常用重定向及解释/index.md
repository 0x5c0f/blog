# 常用重定向及解释



# Linux 标准输出(stdout)和标准错误(stderr)的重定向

### 1. 重定向符号和语句
```bash 
&gt; 以擦写的模式重定向至...
&gt;&gt; 以追加的模式重定向至...
1 代表stdout标准输出
2 代表stderr标准错误
```

### 2. 标准错误重定向到标准输出,然后合并重定向到文件
```bash
command 2&gt;&amp;1 output.txt
```

### 3. 标准输出流将仅重定向到文件，在终端中不可见。如果该文件已存在，则会被覆盖。
```bash
command &gt; output.txt
#command &amp;1&gt; output.txt
```

### 4. 标准输出流将仅重定向到文件，在终端中不可见。如果文件已存在，则新数据将附加到文件末尾。
```bash
command &gt;&gt; output.txt
```

### 5. 标准错误流将仅重定向到文件，在终端中不可见。如果该文件已存在，则会被覆盖。
```bash
command 2&gt; output.txt
```

### 6. 标准错误流将仅重定向到文件，在终端中不可见。如果文件已存在，则新数据将附加到文件末尾。
```bash
command 2&gt;&gt; output.txt
```

### 7. 标准输出和标准错误流都将仅重定向到文件，终端中不会显示任何内容。如果该文件已存在，则会被覆盖。
```bash
command &amp;&gt; output.txt
```

### 8. 标准输出和标准错误流都将仅重定向到文件，终端中不会显示任何内容。如果文件已存在，则新数据将附加到文件末尾。
```bash
command &amp;&gt;&gt; output.txt
```

### 9. 标准输出流将被复制到文件中，它仍将在终端中可见。如果该文件已存在，则会被覆盖。
```bash
command | tee output.txt
```

### 10. 标准输出流将被复制到文件中，它仍将在终端中可见。如果文件已存在，则新数据将附加到文件末尾。
```bash
command | tee -a output.txt
```

### 11. Bash没有简写语法，只允许StdErr管道到第二个命令，这里需要再次与tee组合来完成表格。如果你真的需要这样的东西，请看“如何管道stderr，而不是stdout？” 有关如何通过交换流或使用进程替换来完成此操作的Stack Overflow。
```bash
(*)
```
### 12. 标准输出和标准错误流都将被复制到文件中，同时仍在终端中可见。如果该文件已存在，则会被覆盖。
```bash
command |&amp; tee output.txt
```

### 13. 标准输出和标准错误流都将被复制到文件中，同时仍在终端中可见。如果文件已存在，则新数据将附加到文件末尾。
```bash
command |&amp; tee -a output.txt
```

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/linux/%E5%B8%B8%E7%94%A8%E9%87%8D%E5%AE%9A%E5%90%91%E5%8F%8A%E8%A7%A3%E9%87%8A/  

