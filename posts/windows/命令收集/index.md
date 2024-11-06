# Windows命令收集


# 1. windows 服务安装卸载
```batch
:: 注意空格
sc create &#34;Memcached_11233&#34; start= auto binPath= &#34;D:\box\memcached\memcached.exe -d runservice  -m 128 -c 512 -p 11233 -l 127.0.0.1&#34;  DisplayName= &#34;Memcached_11233&#34; 
----
sc delete Memcached_11233
```

# 2. 删除`windows\temp` 5天前以sess*开头的文件
```batch
forfiles /p &#34;C:\Windows\Temp&#34; /s /d -5 /m sess* /c &#34;cmd /c del /f /q /s @path&#34;
```

# 3. windows 端口转发  
```bat
:: 转发不生效需先安装 ipv6 
C:\&gt; netsh interface ipv6 install

:: 转发本机ip端口 到其他服务器ip端口
:: netsh interface portproxy add v4tov4 listenaddress=[外网IP] listenport=[外网端口] connectaddress=[内网IP] connectport=[内网端口]
C:\&gt; netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=10055 connectaddress=10.42.0.58 connectport=10050

:: 查看已设置的转发 
C:\&gt; netsh interface portproxy show all

:: 删除端口转发
:: netsh interface portproxy delete v4tov4 listenaddress=[外网IP] listenport=[外网端口]
C:\&gt; netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=10055

```

# 4. 修改ntp同步频率
```batch
regedit:
HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\W32Time\TimeProviders\NtpClient\SpecialPollInterval
900=15分钟
3600=1小时
默认: 604800是由7(天)×24(时)×60(分)×60(秒)
```
# 5. windows mysql 备份
```batch
@echo off
title mysql-client
set &#34;Ymd=%date:~,4%%date:~5,2%%date:~8,2%&#34;
echo %Ymd%
C:
&#34;D:\xx\mysqldump.exe&#34; -h&lt;ip&gt; -P&lt;port&gt; -u&lt;user&gt; -p&lt;passwrod&gt; -R &lt;数据库名称&gt;  &gt; D:\DatabaseBak\xxx_%Ymd%.sql
```
# 6. 查看80端口连接数
```batch 
netstat -an -p tcp | find /c &#34;80&#34;
```
# 7. windows 时间获取方式 
```bat
:: 编码格式 ANSI
:: 脚本创建时最好选择ANSI编码(防止中文乱码)
:: @echo off 表示不回显执行的命令
@echo off 
@echo =========Windows的原本日期时间格式=======================
:: 设置变量，使用变量时需要用一对%包起来
set ORIGINAL_DATE=%date% 
echo %ORIGINAL_DATE%
 
@echo =========日期按照YYYY-MM-DD格式显示======================
:: 日期截取遵从格式 %date:~x,y%，表示从第x位开始，截取y个长度(x,y的起始值为0)
:: 年份从第0位开始截取4位，月份从第5位开始截取2位，日期从第8位开始截取2位
 
set YEAR=%date:~0,4%
set MONTH=%date:~5,2%
set DAY=%date:~8,2%
set CURRENT_DATE=%YEAR%-%MONTH%-%DAY%
echo %CURRENT_DATE%
 
@echo =========时间按照HH:MM:SS格式显示========================
:: 时间截取遵从格式 %time:~x,y%，表示从第x位开始，截取y个长度(x,y的起始值为0)
:: 时钟从第0位开始截取2位，分钟从第3位开始截取2位，秒钟从第6位开始截取2位
 
set HOUR=%time:~0,2%
set MINUTE=%time:~3,2%
set SECOND=%time:~6,2%
 
:: 当时钟小于等于9时,前面有个空格，这时我们少截取一位，从第1位开始截取
set TMP_HOUR=%time:~1,1%
set NINE=9
set ZERO=0
:: 处理时钟是个位数的时候前面补上一个0, LEQ表示小于等于https://www.coder.work/article/6503907
if %HOUR% LEQ %NINE% set HOUR=%ZERO%%TMP_HOUR%
 
set CURRENT_TIME=%HOUR%:%MINUTE%:%SECOND%
echo %CURRENT_TIME%
 
@echo =========日期时间按照YYYY-MM-DD HH:MM:SS格式显示=========
set CURRENT_DATE_TIME=%YEAR%-%MONTH%-%DAY% %HOUR%:%MINUTE%:%SECOND%
echo %CURRENT_DATE_TIME%
 
@echo =========日期时间按照YYYYMMDD_HHMMSS格式显示=============
set CURRENT_DATE_TIME_STAMP=%YEAR%%MONTH%%DAY%_%HOUR%%MINUTE%%SECOND%
echo %CURRENT_DATE_TIME_STAMP%
@echo =========================================================
pause
```

# 8. 按照时间创建文件夹 
```batch
:: 编码格式 ANSI
:: 脚本创建时最好选择ANSI编码(防止中文乱码)
:: @echo off 表示不回显执行的命令
@echo off 
 
:: 日期截取遵从格式 %date:~x,y%，表示从第x位开始，截取y个长度(x,y的起始值为0)
:: 年份从第0位开始截取4位，月份从第5位开始截取2位，日期从第8位开始截取2位
set YEAR=%date:~0,4%
set MONTH=%date:~5,2%
set DAY=%date:~8,2%
 
:: 时间截取遵从格式 %time:~x,y%，表示从第x位开始，截取y个长度(x,y的起始值为0)
:: 时钟从第0位开始截取2位，分钟从第3位开始截取2位，秒钟从第6位开始截取2位
set HOUR=%time:~0,2%
set MINUTE=%time:~3,2%
set SECOND=%time:~6,2%
:: 毫秒
set MILLISECIOND=%time:~9,2%
 
:: 当时钟小于等于9时,前面有个空格，这时我们少截取一位，从第1位开始截取
set TMP_HOUR=%time:~1,1%
set NINE=9
set ZERO=0
:: 处理时钟是个位数的时候前面补上一个0, LEQ表示小于等于
if %HOUR% LEQ %NINE% set HOUR=%ZERO%%TMP_HOUR%
 
set CURRENT_DATE_TIME_STAMP=%YEAR%%MONTH%%DAY%%HOUR%%MINUTE%%SECOND%%MILLISECIOND%
mkdir %CURRENT_DATE_TIME_STAMP%
```

# 9. windows前台程序运行到后台
```vb
&#39; 运行到后台
&#39; start.vbs 
Set ws = CreateObject(&#34;Wscript.Shell&#34;)  
ws.run &#34;example.exe&#34;,vbhide

&#39;
&#39; 程序关闭
&#39; stop.vbs
Dim Wsh
Set Wsh = WScript.CreateObject(&#34;WScript.Shell&#34;)
Wsh.Run &#34;taskkill /f /im example.exe&#34;,0
Set Wsh=NoThing
WScript.quit
```


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/windows/%E5%91%BD%E4%BB%A4%E6%94%B6%E9%9B%86/  

