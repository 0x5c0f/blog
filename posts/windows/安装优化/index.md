# Windows安装优化


# 1. 系统安全

显示电脑图标到桌面: `rundll32.exe shell32.dll,Control_RunDLL desk.cpl,,0`  
开始文件夹: `shell:startup`  
本地安全策略: `secpol.msc`    
计算机管理: `compmgmt.msc`  

## 1.1. 修改服务器名：按项目取名。

- 右键点击我的电脑-高级-计算机名-更改。英文: `my computer - proterties - Advanced system settings - Computer Name - Change`

## 1.2. 调整性能设置：

- 右键点击我的电脑-高级-性能中，选中“设置为最佳性能”英文: `my computer - proterties-Advanced - Performance-setting -Visual Effects (Adjust for best performance)`；
- 数据执行保护设置为“只为关键的`windows`程序保护”。

## 1.3. 允许 dump file 的产生：

- 右键点击我的电脑-高级-启动和故障恢复-写入调试信息 设置成“最小化记录模式”。英文版操作：右击 `My Computer-Advanced-Startup and recovery-write debugging infomation设置成“small…”`。

## 1.4. 禁用 NETBOIS:

网络连接属性-tcpip 属性-高级-wins-NetBios 设置 “禁用 Tcp/ip 上的 NetBios”选项

## 1.5. 禁止设置网卡为 Disable

- 运行`gpedit.msc`- 用户配置-管理模板-网络-网络连接下的&#34;启用/禁用 LAN 链接的能力(`Ability to Enable/Disable a LAN connection`)&#34;设置为`Disabled `
- 设置&#34;为管理员启用`windows2000`网路连接设置(`Enable Windows2000 Network Connections settings for Administrators`)&#34; 选项为`Enabled `

## 1.6. IIS 安装后修改站点日志目录

# 2. 用户安全

`netplwiz`用户名修改,安全策略里面也有设置方法

- 禁用`Guest`账号(设置复杂密码)
- 限制不必要的用户(如`aspnet`,`sqldebugger`等)
- 把系统`Administrator`账号改名
- 创建名称为`Administrator`陷阱用户  (正确设置描述信息,不给任何权限)
- 建立一个备用管理员帐户。
- 不让系统显示上次登录的用户名(后面本地策略中有)
- 通过`reg`脚本设置开机前 5 分钟自动登录

# 3. 本地安全策略设置

## 3.1. 本地安全策略设置

```
gpedit.msc-计算机配置-windows设置-安全设置
本地策略-审核策略

推荐的要审核的项目是：
策略更改     成功 失败
登录事件     成功 失败
对象访问     失败
过程追踪     无
目录服务访问 失败
特权使用     失败
系统事件     成功 失败
账户登录事件 成功 失败
账户管理     无

英文版：
Audit account logon events       Success,Failure
Audit account management         No auditing
Audit directory service access   Failure
Audit logon event                Success,Failure
Audit object access              Failure
Audit polic change		   Success,Failure
Audit privilege use              Failure
Audit process tracking           No auditing
Audit system events              Success,Failure

本地策略—&gt;用户权限分配
关闭系统(shut down the system)：
只有Administrators组、其它全部删除。 
通过终端服务允许登陆(Allow log on through Terminal services)：
只加入Administrators,Remote Desktop Users组，其他全部删除。

C、本地策略——&gt;安全选项
交互式登陆：不显示上次的用户名　　　　　　　启用
网络访问：不允许SAM帐户和共享的匿名枚举　 	启用
网络访问：不允许为网络身份验证储存凭证　　　启用
网络访问：可匿名访问的共享　　　　　　　　　全部删除
网络访问：可匿名访问的命名管道　　　　　　　全部删除
网络访问：可远程访问的注册表路径　　　　　　全部删除 
网络访问：可远程访问的注册表路径和子路径　　全部删除 
帐户：重命名系统管理员帐户　　　　　　　　重命名一个帐户（比如administrator改成lefux,不一定是lefux问清楚再改，改后最好重启一下服务器）

英文版本：
Interactive logon: Do not display last user name    Enabled
Network access: Do not allow anonymous enumeration of SAM accounts and share  Enabled
Network access: Do not allow storage of passwords and credentials for network authentication	 Enabled
Network access: Named Pipes that can be accessed anonymously      全删除
Network access: Remotely accessible registry paths               全删除
Network access: Remotely accessible registry paths and subpaths  全删除
Network access: Shares that can be accessed anonymously           全删除
```

# 4. 禁用以下的服务

```bash
Computer Browser；Portable Media Serial Number Service
Distributed File System; Windows Audio; Alert
Distributed linktracking client：
Error reporting service：
FTP Publishing Service
Messenger
Indexing Service
Microsoft Serch：
NT LM Security support provide：
server
PrintSpooler：
Remote Desktop Help Session Manager：
Remote Registry; Routing and Remote Access
Workstation (美国服务器不要关)
```

经测试可以关闭的其他服务也可以关


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/windows/%E5%AE%89%E8%A3%85%E4%BC%98%E5%8C%96/  

