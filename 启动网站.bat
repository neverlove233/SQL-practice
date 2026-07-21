@echo off
cd /d %~dp0
title SQL 练习平台

echo ==========================================
echo            SQL 练习平台
echo ==========================================
echo.

REM ---------- 第 1 步：检测 Python 是否可用 ----------
set "PYVER="
for /f "tokens=2" %%v in ('python --version 2^>nul') do if not defined PYVER set "PYVER=%%v"
if not defined PYVER (
    echo [错误] 没有检测到可用的 Python！
    echo.
    echo 解决办法：
    echo   1. 打开 https://www.python.org/downloads/ 下载并安装 Python
    echo   2. 安装时务必勾选 "Add python.exe to PATH" 选项
    echo   3. 安装完成后，重新双击本脚本
    echo.
    pause
    exit /b 1
)
echo 检测到 Python %PYVER%

REM ---------- 第 2 步：检测 / 修复虚拟环境 ----------
set "NEED_BUILD=0"
if not exist "venv\Scripts\python.exe" (
    set "NEED_BUILD=1"
) else (
    REM 验证 venv 健康：能运行且依赖齐全（防止从别的电脑拷贝来的坏 venv）
    venv\Scripts\python.exe -c "import flask, pandas, openpyxl" >nul 2>nul
    if errorlevel 1 (
        echo 检测到虚拟环境损坏或不兼容，正在自动修复...
        rmdir /s /q venv
        set "NEED_BUILD=1"
    )
)

if "%NEED_BUILD%"=="1" (
    echo [1/2] 正在创建虚拟环境（仅首次运行需要）...
    python -m venv venv
    if errorlevel 1 (
        echo [错误] 创建虚拟环境失败，请检查 Python 安装是否正常
        pause
        exit /b 1
    )
    echo [2/2] 正在安装依赖（需要联网，约 1-2 分钟，请耐心等待）...
    venv\Scripts\python.exe -m pip install -r requirements.txt --quiet --disable-pip-version-check
    if errorlevel 1 (
        echo 默认源下载失败，正在尝试清华镜像源...
        venv\Scripts\python.exe -m pip install -r requirements.txt --quiet --disable-pip-version-check -i https://pypi.tuna.tsinghua.edu.cn/simple
        if errorlevel 1 (
            echo [错误] 依赖安装失败，请检查网络连接后重新双击本脚本
            pause
            exit /b 1
        )
    )
    echo 依赖安装完成！
    echo.
)

REM ---------- 第 3 步：启动网站 ----------
echo 正在启动网站，浏览器将自动打开...
echo （使用期间请勿关闭本窗口，关闭即停止网站）
echo.
venv\Scripts\python.exe app.py
if errorlevel 1 (
    echo.
    echo [提示] 网站启动失败，通常是端口 5000 被占用：
    echo   - 如果之前已经启动过，直接在浏览器打开 http://127.0.0.1:5000 即可
    echo   - 或在任务管理器中结束多余的 python 进程后重试
    pause
    exit /b 1
)
pause
