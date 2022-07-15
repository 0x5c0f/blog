# IIS命令操作

# 1. IIS 站点部署
{{< highlight batch >}}
@echo off

title Industrial belt project deployment script 
echo 1. This script is only suitable for the first installation  
echo 2. Please check and modify the following variable values before deployment  
echo   Sitename: Site name, please separate with spaces or commas  
echo   BackPort: Site bound port  
echo   NetVersion: .netVersion(as:v4.0)  
echo   NetModel: Program operation mode classic (Integrated) or integrated (Classic)

pause

set AppCmd=C:\Windows\System32\inetsrv\appcmd.exe
set Sitename=www.example.com admin.example.com
:: This is the project centralized deployment directory
set SitePath=C:\weboxb\example.com
set BackPort=80
set NetVersion=v4.0
set NetModel=Integrated

:: Specify log location
:: set LogPath=D:/iislogs/
:: /logfile.directory:%LogPath%


(for %%a in (%Sitename%) do ( 
  echo Create program pool.................
  echo .  
  %AppCmd% add apppool /name:%%a /managedRuntimeVersion:"v4.0" /managedPipelineMode:"Integrated"
  echo.
  echo Create a site directory.................
  echo .  
  mkdir %SitePath%\%%a
  echo.
  echo Create a site.................
  echo .    
  %AppCmd% add site /name:%%a /bindings:"http://%%a:%BackPort%" /physicalpath:%SitePath%\%%a
  echo.
  echo Associated program pool.................
  echo .    
  %AppCmd% set site /site.name:"%%a" /[path='/'].applicationPool:%%a

))

echo The execution is complete, please check the execution result...

pause
{{< /highlight >}}

# 2. IIS 站点域名修改 
{{< highlight batch >}}
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

%AppCmd% set SITE "www.%DomainName%" /bindings:"http://www.%NewDomainName%:%BackPort%"
:: %AppCmd% set SITE "www.%DomainName%" /bindings:"http://www.%NewDomainName%:%BackPort%,http://www.%NewDomainName%:%BackPort%"

echo The execution is complete, please check the execution result...

pause
{{< /highlight >}}
