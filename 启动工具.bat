@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================
echo   剧情配置工具 - 开发模式
echo ======================================
echo.
echo [清理旧编译缓存]
if exist "node_modules\.vite"  (rmdir /s /q "node_modules\.vite" 2>nul)
if exist "dist-electron"       (rmdir /s /q "dist-electron" 2>nul)
if exist "dist"                (rmdir /s /q "dist" 2>nul)
echo done.
echo.
echo [启动 Vite + Electron]
echo 等待 Electron 窗口弹出... ^(只弹一个^)
echo 如仍加载旧版: 在 Electron 窗口内按 Ctrl+Shift+R 强制刷新
echo.
set ELECTRON_DISABLE_HTTP_CACHE=true
npx vite
pause
