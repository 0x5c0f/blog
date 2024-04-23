# Shellexpect自动交互脚本


看不懂没关系,但是我可以套代码啊 

>[http://xstarcd.github.io/wiki/shell/expect.html](http://xstarcd.github.io/wiki/shell/expect.html)  

>[https://segmentfault.com/a/1190000012194543](https://segmentfault.com/a/1190000012194543)  

# spawn 调用要执行的命令

`expect`脚本必须以`interact`或`expect eof`结束，执行自动化任务通常`expect eof`就够了。 

|命令|说明|示例|
|-|-|-|
|`expect`|等待命令提示信息的出现，也就是捕捉用户输入的提示 |***`expect "*password:"`*** 捕捉匹配到 `password:` 的值后等待用户输入|
|`send`|发送需要交互的值，替代了用户手动输入内容|***`send "1\r"`*** 发送数字`1`到上一个`expect`并回车|
|`set`|设置变量值|***`set pw "123"`*** 设置变量`pw`值为`123`|
|`interact` |执行完成后保持交互状态，把控制权交给控制台，这个时候就可以手工操作了。如果没有这一句登录完成后会退出，而不是留在远程终端上。|-|
|`expect eof` ||
