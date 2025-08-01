@echo off
echo 🧹 清理項目以準備分發...
echo.

REM 停止可能運行的容器
echo 📦 停止 Docker 容器...
docker-compose down 2>nul

REM 清理 jobs 目錄（保留結構）
echo 🗂️  清理訓練記錄...
if exist "jobs" (
    for /d %%i in (jobs\*) do (
        if not "%%i"=="jobs\.gitkeep" (
            rmdir /s /q "%%i" 2>nul
        )
    )
)

REM 清理 Python 緩存
echo 🐍 清理 Python 緩存...
if exist "__pycache__" rmdir /s /q "__pycache__"
for /r %%i in (__pycache__) do if exist "%%i" rmdir /s /q "%%i" 2>nul
for /r %%i in (*.pyc) do if exist "%%i" del "%%i" 2>nul

REM 清理前端構建文件
echo ⚛️  清理前端構建文件...
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "frontend\build" rmdir /s /q "frontend\build"

REM 清理虛擬環境
echo 🏠 清理虛擬環境...
if exist "venv" rmdir /s /q "venv"
if exist "env" rmdir /s /q "env"

REM 清理日誌文件
echo 📝 清理日誌文件...
for /r %%i in (*.log) do if exist "%%i" del "%%i" 2>nul

REM 清理臨時文件
echo 🗑️  清理臨時文件...
if exist "temp" rmdir /s /q "temp" 2>nul
if exist "tmp" rmdir /s /q "tmp" 2>nul

REM 清理 Docker 構建緩存（可選）
echo 🐳 清理 Docker 構建緩存...
docker system prune -f 2>nul

echo.
echo ✅ 清理完成！
echo.
echo 📦 現在可以創建壓縮檔了：
echo    1. 選擇所有文件和文件夾
echo    2. 右鍵選擇「發送到」->「壓縮(zipped)文件夾」
echo    3. 命名為「強化學習遊戲平台_v1.0.zip」
echo.
echo 🚀 分發後，用戶只需：
echo    - 解壓縮
echo    - 雙擊 start.bat 啟動
echo    - 訪問 http://localhost
echo.
pause 