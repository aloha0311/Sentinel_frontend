@echo off
echo ========================================
echo    Sentinel 调试后端启动脚本
echo ========================================
echo.

echo 正在检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到Node.js，请先安装Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js版本：
node --version

echo.
echo 正在安装依赖...
npm install

echo.
echo 正在启动调试后端服务器...
echo 服务器地址：http://localhost:3001
echo 健康检查：http://localhost:3001/health
echo.
echo 按 Ctrl+C 停止服务器
echo.

npm start

pause 