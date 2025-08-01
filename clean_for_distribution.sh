#!/bin/bash

echo "🧹 清理項目以準備分發..."
echo

# 停止可能運行的容器
echo "📦 停止 Docker 容器..."
docker-compose down 2>/dev/null

# 清理 jobs 目錄（保留結構）
echo "🗂️  清理訓練記錄..."
if [ -d "jobs" ]; then
    find jobs -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} \; 2>/dev/null
fi

# 清理 Python 緩存
echo "🐍 清理 Python 緩存..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null
find . -name "*.pyo" -delete 2>/dev/null

# 清理前端構建文件
echo "⚛️  清理前端構建文件..."
if [ -d "frontend/node_modules" ]; then
    rm -rf frontend/node_modules
fi
if [ -d "frontend/build" ]; then
    rm -rf frontend/build
fi

# 清理虛擬環境
echo "🏠 清理虛擬環境..."
if [ -d "venv" ]; then
    rm -rf venv
fi
if [ -d "env" ]; then
    rm -rf env
fi

# 清理日誌文件
echo "📝 清理日誌文件..."
find . -name "*.log" -delete 2>/dev/null

# 清理臨時文件
echo "🗑️  清理臨時文件..."
if [ -d "temp" ]; then
    rm -rf temp
fi
if [ -d "tmp" ]; then
    rm -rf tmp
fi

# 清理 Docker 構建緩存（可選）
echo "🐳 清理 Docker 構建緩存..."
docker system prune -f 2>/dev/null

echo
echo "✅ 清理完成！"
echo
echo "📦 現在可以創建壓縮檔了："
echo "   1. 選擇所有文件和文件夾"
echo "   2. 右鍵選擇「壓縮」或使用命令："
echo "      zip -r 強化學習遊戲平台_v1.0.zip . -x '*.git*' 'venv/*' 'node_modules/*'"
echo
echo "🚀 分發後，用戶只需："
echo "   - 解壓縮"
echo "   - 執行 ./start.sh 啟動"
echo "   - 訪問 http://localhost"
echo 