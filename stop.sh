#!/bin/bash

# 設置顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================"
echo "   🛑 停止強化學習遊戲平台"
echo "========================================"
echo -e "${NC}"

echo "正在停止 Docker 服務..."
docker-compose down

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 停止失敗！${NC}"
    exit 1
fi

echo
echo -e "${GREEN}✅ 服務已停止${NC}"
echo
echo -e "${GREEN}💡 提示：${NC}"
echo "   - 訓練數據已保存在 ./jobs 目錄中"
echo "   - 地圖和規則已保存在 ./maps 和 ./rules 目錄中"
echo "   - 如需完全清理，請執行：docker-compose down -v"
echo 