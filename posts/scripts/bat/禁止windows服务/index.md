# 禁止windows服务


{{< highlight batch >}}
@echo off
color 0A
title  ############ 禁用并停止系统服务 ###############
echo ############ start 禁用并停止系统服务 ###############
pause
echo 正在禁用Computer Browser服务
net stop Browser
sc config Browser start= disabled

echo 正在禁用Distributed File System服务
net stop Dfs
sc config Dfs start= disalbed

echo 正在禁用Distributed File System服务
net stop Dfs
sc config Dfs start= disabled

echo 正在禁用Distributed linktracking client服务
net stop TrkWks
sc config TrkWks start= disabled

echo 正在禁用Error reporting service服务
net stop ERSvc
sc config ERSvc start= disabled

echo 正在禁用Messenger 服务
net stop Messenger
sc config Messenger start= disabled

echo 正在禁用Windows Audio服务
net stop AudioSrv
sc config AudioSrv start= disabled

echo 正在禁用Alerter服务
net stop Alerter
sc config Alerter start= disabled

echo 正在禁用Help and Support 服务
net stop helpsvc
sc config helpsvc= disabled

echo 正在禁用Indexing Service 服务
net stop  CiSvc
sc config CiSvc start= disabled
echo 正在禁用FTP Publishing Service服务
net stop MSFtpsvc
sc config MSFtpsvc start= disabled

echo 正在禁用Microsoft Serch服务
net stop MSSEARCH
sc config MSSEARCH start= disabled

echo 正在禁用NT LM Security support provide服务
net stop NtLmSsp
sc config NtLmSsp start= disabled

echo 正在禁用Portable Media Serial Number Service服务
net stop WmdmPmSN
sc config WmdmPmSN start= disabled

echo 正在禁用Print Spooler服务
net stop Spooler
sc config Spooler start= disabled

echo 正在禁用Remote Desktop Help Session Manager服务
net stop RDSessMgr
sc config RDSessMgr start= disabled

echo 正在禁用Remote Registry服务
net stop RemoteRegistry
sc config RemoteRegistry start= disabled

echo 正在禁用server服务
net stop lanmanserver
sc config lanmanserver start= disabled
pause
echo 下面将禁用Workstation服务,美国服务器请选择N,国内选择Y
echo 正在禁用Workstation服务
net stop lanmanworkstation 
sc config lanmanworkstation start= disabled

echo 正在禁用Routing and Remote Access服务
net stop RemoteAccess
sc config RemoteAccess start= disabled

echo 正在禁用Help and Support服务
net stop helpsvc
sc config helpsvc start= disabled

echo 正在禁用FTP Publishing Service服务
net stop MSFTPSVC
sc config MSFTPSVC start= disabled


echo 正在禁用SNMP Service服务
net stop SNMP
sc config SNMP= disabled

echo 禁用coldfusion9相关服务
echo 正在禁用ColdFusion 9 .NET Service服务
net stop "ColdFusion 9 .NET Service"
sc config "ColdFusion 9 .NET Service" start= disabled

echo 正在禁用ColdFusion 9 ODBC Agent服务
net stop "ColdFusion 9 ODBC Agent"
sc config "ColdFusion 9 ODBC Agent" start= disabled

echo 正在禁用"ColdFusion 9 ODBC Server"服务
net stop "ColdFusion 9 ODBC Server"
sc config "ColdFusion 9 ODBC Server" start= disabled

echo 正在禁用ColdFusion 9 Solr Service服务
net stop CF9solr
sc config CF9solr start= disabled

echo 正在禁用ColdFusion 9 Search Server服务
net stop "ColdFusion 9 Search Server"
sc config "ColdFusion 9 Search Server" start= disabled

echo 禁用sql2008相关服务
echo 正在禁用SQL Server Integration Services 10.0服务
net stop MsDtsServer100
sc config MsDtsServer100 start= disabled

echo 正在禁用SQL Active Directory Helper Service服务
net stop MSSQLServerADHelper100
sc config MSSQLServerADHelper100 start= disabled

echo 正在禁用SQL Server Browser服务
net stop SQLBrowser
sc config SQLBrowser start= disabled

echo 正在禁用SQL Server VSS Writer服务
net stop SQLWriter
sc config SQLWriter start= disabled

{{< /highlight >}}

---

> 作者: [0x5c0f](https://blog.0x5c0f.cc)  
> URL: https://blog.0x5c0f.cc/posts/scripts/bat/%E7%A6%81%E6%AD%A2windows%E6%9C%8D%E5%8A%A1/  

