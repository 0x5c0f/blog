# IIS命令操作

# 1. IIS 站点部署
{{&lt; highlight batch &gt;}}
@echo off

title Industrial belt project deployment script 
echo 1. This script is only suitable for the first installation  
echo 2. Please check and modify the following variable values before deployment  
echo   Sitename: Site name, please separate with spaces or commas  
echo   BackPort: Site bound port  
echo   NetVersion: .netVersion(as:v4.0)  
echo   NetModel: Program operation mode classic (Integrated) or integrated (Classic)

set AppCmd=C:\Windows\System32\inetsrv\appcmd.exe
set Sitename=admin.example.com www.example.com
set SitePath=C:\weboxb\example.com
set BackPort=8010
set NetVersion=v4.0
set NetModel=Integrated
set LogPath=D:\iislogs\

:: Confirm variable initialisation
echo Confirming the initialisation:
echo AppCmd=%AppCmd%
echo Sitename=%Sitename%
echo SitePath=%SitePath%
echo BackPort=%BackPort%
echo NetVersion=%NetVersion%
echo NetModel=%NetModel%
echo LogPath=%LogPath%

pause

(for %%a in (%Sitename%) do ( 
  echo Creating application pool for %%a
  %AppCmd% add apppool /name:%%a /managedRuntimeVersion:%NetVersion% /managedPipelineMode:%NetModel%
  if errorlevel 1 goto Error
  
  echo Creating site directory for %%a
  mkdir %SitePath%\%%a
  if errorlevel 1 goto Error
  
  echo Creating site for %%a
  %AppCmd% add site /name:%%a /bindings:&#34;http://%%a:%BackPort%&#34; /physicalpath:%SitePath%\%%a
  if errorlevel 1 goto Error
  
  echo Associating application pool for %%a
  %AppCmd% set site /site.name:%%a /[path=&#39;/&#39;].applicationPool:%%a
  if errorlevel 1 goto Error

  echo.
))

echo The execution is complete, please check the execution log at %LogPath%.
goto End

:Error
echo An error occurred. Please check the configurations and try again.
pause
exit

:End
pause
{{&lt; /highlight &gt;}}

# 2. IIS 站点域名修改 
{{&lt; highlight batch &gt;}}
@echo off

title update site bind domain 
echo Please carefully check the configuration content!
pause

set AppCmd=C:\Windows\System32\inetsrv\appcmd.exe
set BackPort=80
set DomainName=example.cn
set NewDomainName=example.com

:: Specify log location
:: set LogPath=D:/iislogs/
:: /logfile.directory:%LogPath%

%AppCmd% set SITE &#34;www.%DomainName%&#34; /bindings:&#34;http://www.%NewDomainName%:%BackPort%&#34;
:: %AppCmd% set SITE &#34;www.%DomainName%&#34; /bindings:&#34;http://www.%NewDomainName%:%BackPort%,http://www.%NewDomainName%:%BackPort%&#34;

echo The execution is complete, please check the execution result...

pause
{{&lt; /highlight &gt;}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/bat/iis%E5%91%BD%E4%BB%A4%E6%93%8D%E4%BD%9C/  

