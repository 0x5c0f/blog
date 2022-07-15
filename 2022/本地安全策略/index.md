# 本地安全策略-安全选项


{{< highlight batch >}}
::本地安全策略--安全选项---需重启生效
::安全选项
::网络访问：可远程访问的注册表路径　
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurePipeServers\winreg\AllowedPaths" /v Machine /t REG_MULTI_SZ /f
::网络访问：可远程访问的注册表路径和子路径
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurePipeServers\winreg\AllowedExactPaths" /v Machine /t REG_MULTI_SZ /f
::网络访问：可匿名访问的共享
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\lanmanserver\parameters" /v NullSessionShares /t REG_MULTI_SZ /f
::网络访问：可匿名访问的命名管道
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\lanmanserver\parameters" /v NullSessionPipes /t REG_MULTI_SZ /f
::网络访问：不允许SAM帐户和共享的匿名枚举　
reg  add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa” /v restrictanonymous /t REG_DWORD /d 1 /f
::网络访问：不允许为网络身份验证储存凭证或.net passports
reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa" /v "disabledomaincreds" /t reg_dword /d 1 /f
::交互式登陆：不显示上次的用户名
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\policies\system" /v "dontdisplaylastusername" /t reg_dword /d 1 /f
::交互式登陆：会话锁定时显示用户信息
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\policies\system" /v "legalnoticetext" /t reg_sz /d 不显示用户信息 /f
::重命名来宾用户
::wmic useraccountame='guest' call Rename xxxgudsadsest
net user guest /active:no
wmic useraccount where name='guest' call Rename xxxgudsadsest
::禁用aspnet用户
net user aspnet /active:no
::删除不安全组件
regsvr32 /u wshom.ocx
regsvr32 /u shell32.dll
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sDate /t REG_SZ /d - /f
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sShortDate /t REG_SZ /d yyyy-MM-dd /f
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sTime /t REG_SZ /d : /f
reg add "HKEY_CURRENT_USER\Control Panel\International" /v sTimeFormat /t REG_SZ /d H:mm:ss /f

{{< /highlight >}}

