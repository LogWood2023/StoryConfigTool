@echo off
chcp 65001 >nul
title 剧情配置工具
cd /d "%~dp0"
echo ========================================
echo   剧情配置工具 - 启动中...
echo ========================================
echo.
python run.py
pause
