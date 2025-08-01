#!/bin/bash

# 設置顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "========================================"
echo "   🎮 強化學習遊戲平台 - Docker 啟動"
echo "========================================"
echo -e "${NC}"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 錯誤：Docker 未安裝${NC}"
    echo
    echo "請先安裝 Docker："
    echo "Ubuntu/Debian: sudo apt-get install docker.io docker-compose"
    echo "macOS: https://docs.docker.com/desktop/mac/install/"
    echo "CentOS/RHEL: sudo yum install docker docker-compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker 已安裝${NC}"

# 檢查 Docker 是否運行
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ 錯誤：Docker 未運行${NC}"
    echo "請啟動 Docker 服務："
    echo "sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✅ Docker 正在運行${NC}"

# 檢查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ 錯誤：Docker Compose 未安裝${NC}"
    echo "請安裝 Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose 可用${NC}"

# 檢查端口是否被佔用
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  警告：端口 8000 已被佔用${NC}"
    echo "正在嘗試停止現有服務..."
    docker-compose down >/dev/null 2>&1
    sleep 3
fi

       if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
           echo -e "${YELLOW}⚠️  警告：端口 8080 已被佔用${NC}"
           echo "請關閉佔用端口 8080 的服務後重試"
           exit 1
       fi

echo -e "${GREEN}✅ 端口檢查完成${NC}"

echo
echo -e "${BLUE}🚀 開始構建和啟動服務...${NC}"
echo "這可能需要幾分鐘時間，請耐心等待..."
echo

# 構建和啟動服務
docker-compose up --build -d

if [ $? -ne 0 ]; then
    echo
    echo -e "${RED}❌ 啟動失敗！請檢查錯誤訊息${NC}"
    exit 1
fi

echo
echo -e "${GREEN}✅ 服務啟動成功！${NC}"

# 等待服務完全啟動
echo -e "${YELLOW}⏳ 等待服務完全啟動...${NC}"
sleep 10

# 檢查服務狀態
echo -e "${BLUE}🔍 檢查服務狀態...${NC}"
docker-compose ps

echo
echo -e "${BLUE}========================================"
echo "   🎉 平台已成功啟動！"
echo "========================================"
echo -e "${NC}"
       echo -e "${GREEN}🌐 訪問地址：${NC}"
       echo "   http://localhost:8000  (直接訪問後端 API)"
       echo "   http://localhost:8080  (通過 Nginx 代理，推薦)"
echo
echo -e "${GREEN}📋 常用命令：${NC}"
echo "   docker-compose logs -f    # 查看日誌"
echo "   docker-compose down       # 停止服務"
echo "   docker-compose restart    # 重啟服務"
echo
echo -e "${GREEN}💡 提示：${NC}"
echo "   - 首次訪問可能需要等待幾秒鐘"
echo "   - 如果無法訪問，請檢查防火牆設定"
echo "   - 訓練數據會保存在 ./jobs 目錄中"
echo

       # 嘗試打開瀏覽器
       if command -v xdg-open &> /dev/null; then
           # Linux
           xdg-open http://localhost:8080 &
       elif command -v open &> /dev/null; then
           # macOS
           open http://localhost:8080 &
       fi

echo -e "${GREEN}🎮 開始您的強化學習之旅吧！${NC}"
echo 