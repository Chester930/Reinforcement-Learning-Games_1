@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    🎮 強化學習遊戲平台 - Docker 啟動
echo ========================================
echo.

REM 檢查 Docker 是否安裝
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：Docker 未安裝或未啟動
    echo.
    echo 請先安裝 Docker Desktop：
    echo https://www.docker.com/products/docker-desktop/
    echo.
    echo 安裝完成後，請啟動 Docker Desktop 並重新執行此腳本
    pause
    exit /b 1
)

echo ✅ Docker 已安裝
echo.

REM 檢查 Docker Compose 是否可用
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：Docker Compose 不可用
    echo 請確保 Docker Desktop 已正確安裝並啟動
    pause
    exit /b 1
)

echo ✅ Docker Compose 可用
echo.

REM 檢查端口是否被佔用
netstat -ano | findstr :8000 >nul
if not errorlevel 1 (
    echo ⚠️  警告：端口 8000 已被佔用
    echo 正在嘗試停止現有服務...
    docker-compose down >nul 2>&1
    timeout /t 3 >nul
)

       netstat -ano | findstr :8080 >nul
       if not errorlevel 1 (
           echo ⚠️  警告：端口 8080 已被佔用
           echo 請關閉佔用端口 8080 的服務後重試
           pause
           exit /b 1
       )

echo ✅ 端口檢查完成
echo.

echo 🚀 開始構建和啟動服務...
echo 這可能需要幾分鐘時間，請耐心等待...
echo.

REM 構建和啟動服務
docker-compose up --build -d

if errorlevel 1 (
    echo.
    echo ❌ 啟動失敗！請檢查錯誤訊息
    pause
    exit /b 1
)

echo.
echo ✅ 服務啟動成功！
echo.

REM 等待服務完全啟動
echo ⏳ 等待服務完全啟動...
timeout /t 10 >nul

REM 檢查服務狀態
echo 🔍 檢查服務狀態...
docker-compose ps

echo.
echo ========================================
echo    🎉 平台已成功啟動！
echo ========================================
echo.
       echo 🌐 訪問地址：
       echo    http://localhost:8000  (直接訪問後端 API)
       echo    http://localhost:8080  (通過 Nginx 代理，推薦)
echo.
echo 📋 常用命令：
echo    docker-compose logs -f    # 查看日誌
echo    docker-compose down       # 停止服務
echo    docker-compose restart    # 重啟服務
echo.
echo 💡 提示：
echo    - 首次訪問可能需要等待幾秒鐘
echo    - 如果無法訪問，請檢查防火牆設定
echo    - 訓練數據會保存在 ./jobs 目錄中
echo.
echo 按任意鍵打開瀏覽器...
pause >nul

       REM 嘗試打開瀏覽器
       start http://localhost:8080

echo.
echo 🎮 開始您的強化學習之旅吧！
echo.
pause 