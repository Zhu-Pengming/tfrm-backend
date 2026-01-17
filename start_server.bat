@echo off
REM 启动TFRM服务器

echo ================================================================================
echo 启动TFRM服务器
echo ================================================================================
echo.

REM 检查是否在正确的目录
if not exist "app\main.py" (
    echo 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo [1/3] 检查数据库连接...
python -c "from app.infra.db import engine; engine.connect()" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo   警告: 数据库连接失败，请检查PostgreSQL是否运行
    echo.
)

echo [2/3] 检查环境配置...
if not exist ".env" (
    echo   警告: .env文件不存在
    echo.
)

echo [3/3] 启动FastAPI服务器...
echo.
echo 服务器将运行在: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务器
echo ================================================================================
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
