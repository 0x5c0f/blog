# 本地安全策略-安全选项


{{&lt; highlight batch &gt;}}
::本地安全策略--安全选项---需重启生效
::安全选项
::网络访问：可远程访问的注册表路径　
reg add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurePipeServers\winreg\AllowedPaths&#34; /v Machine /t REG_MULTI_SZ /f
::网络访问：可远程访问的注册表路径和子路径
reg add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SecurePipeServers\winreg\AllowedExactPaths&#34; /v Machine /t REG_MULTI_SZ /f
::网络访问：可匿名访问的共享
reg add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\lanmanserver\parameters&#34; /v NullSessionShares /t REG_MULTI_SZ /f
::网络访问：可匿名访问的命名管道
reg add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\lanmanserver\parameters&#34; /v NullSessionPipes /t REG_MULTI_SZ /f
::网络访问：不允许SAM帐户和共享的匿名枚举　
reg  add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa” /v restrictanonymous /t REG_DWORD /d 1 /f
::网络访问：不允许为网络身份验证储存凭证或.net passports
reg add &#34;HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Lsa&#34; /v &#34;disabledomaincreds&#34; /t reg_dword /d 1 /f
::交互式登陆：不显示上次的用户名
reg add &#34;HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\policies\system&#34; /v &#34;dontdisplaylastusername&#34; /t reg_dword /d 1 /f
::交互式登陆：会话锁定时显示用户信息
reg add &#34;HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\policies\system&#34; /v &#34;legalnoticetext&#34; /t reg_sz /d 不显示用户信息 /f
::重命名来宾用户
::wmic useraccountame=&#39;guest&#39; call Rename xxxgudsadsest
net user guest /active:no
wmic useraccount where name=&#39;guest&#39; call Rename xxxgudsadsest
::禁用aspnet用户
net user aspnet /active:no
::删除不安全组件
regsvr32 /u wshom.ocx
regsvr32 /u shell32.dll
reg add &#34;HKEY_CURRENT_USER\Control Panel\International&#34; /v sDate /t REG_SZ /d - /f
reg add &#34;HKEY_CURRENT_USER\Control Panel\International&#34; /v sShortDate /t REG_SZ /d yyyy-MM-dd /f
reg add &#34;HKEY_CURRENT_USER\Control Panel\International&#34; /v sTime /t REG_SZ /d : /f
reg add &#34;HKEY_CURRENT_USER\Control Panel\International&#34; /v sTimeFormat /t REG_SZ /d H:mm:ss /f

{{&lt; /highlight &gt;}}


---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: http://localhost:1313/posts/scripts/bat/%E6%9C%AC%E5%9C%B0%E5%AE%89%E5%85%A8%E7%AD%96%E7%95%A5/  

