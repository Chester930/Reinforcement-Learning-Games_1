@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    🛑 停止強化學習遊戲平台
echo ========================================
echo.

echo 正在停止 Docker 服務...
docker-compose down

if errorlevel 1 (
    echo ❌ 停止失敗！
    pause
    exit /b 1
)

echo.
echo ✅ 服務已停止
echo.
echo 💡 提示：
echo    - 訓練數據已保存在 ./jobs 目錄中
echo    - 地圖和規則已保存在 ./maps 和 ./rules 目錄中
echo    - 如需完全清理，請執行：docker-compose down -v
echo.
pause 