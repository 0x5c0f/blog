@echo off
@echo 定时清理历史数据...

rem 设置备份目录
set backpath=E:\wxDownload

rem 删除190天前的备份
forfiles /p "%backpath%" /m * -d -190 /c "cmd /c del /f @path\" 