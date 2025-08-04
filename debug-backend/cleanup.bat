@echo off
echo ========================================
echo    Sentinel 调试后端清理脚本
echo ========================================
echo.

echo 警告：此操作将删除整个debug-backend文件夹！
echo 请确认您要删除调试后端？
echo.
set /p confirm="输入 'yes' 确认删除: "

if /i "%confirm%"=="yes" (
    echo.
    echo 正在删除debug-backend文件夹...
    cd ..
    rmdir /s /q debug-backend
    echo ✅ 调试后端已删除
) else (
    echo ❌ 操作已取消
)

echo.
pause 