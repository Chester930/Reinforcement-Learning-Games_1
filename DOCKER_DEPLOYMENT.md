# 🐳 Docker 部署指南

本指南將幫助您使用 Docker 快速部署強化學習遊戲平台。

## 📋 前置需求

### 1. 安裝 Docker Desktop

#### Windows/macOS
1. 前往 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. 下載並安裝 Docker Desktop
3. 啟動 Docker Desktop

#### Linux (Ubuntu/Debian)
```bash
# 更新套件列表
sudo apt-get update

# 安裝 Docker
sudo apt-get install docker.io docker-compose

# 啟動 Docker 服務
sudo systemctl start docker
sudo systemctl enable docker

# 將當前用戶加入 docker 群組（可選）
sudo usermod -aG docker $USER
```

#### Linux (CentOS/RHEL)
```bash
# 安裝 Docker
sudo yum install docker docker-compose

# 啟動 Docker 服務
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 驗證安裝
```bash
# 檢查 Docker 版本
docker --version

# 檢查 Docker Compose 版本
docker-compose --version

# 測試 Docker 是否正常運行
docker run hello-world
```

## 🚀 快速啟動

### 方法一：使用一鍵啟動腳本（推薦）

#### Windows
```bash
# 雙擊執行
start.bat

# 或命令列執行
.\start.bat
```

#### Linux/macOS
```bash
# 設定執行權限
chmod +x start.sh

# 執行啟動腳本
./start.sh
```

### 方法二：使用 Makefile
```bash
# 啟動平台
make start

# 查看幫助
make help
```

### 方法三：手動執行 Docker Compose
```bash
# 構建並啟動
docker-compose up --build -d

# 僅啟動（如果已構建）
docker-compose up -d
```

## 🌐 訪問平台

啟動成功後，您可以通過以下地址訪問：

- **主要介面**: http://localhost
- **API 端點**: http://localhost:8000
- **健康檢查**: http://localhost:8000/

## 🛠️ 管理命令

### 基本管理
```bash
# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 重啟服務
docker-compose restart
```

### 使用 Makefile
```bash
# 啟動
make start

# 停止
make stop

# 重啟
make restart

# 查看日誌
make logs

# 查看狀態
make status

# 清理所有數據
make clean
```

### 使用腳本
```bash
# Windows
stop.bat

# Linux/macOS
./stop.sh
```

## 📁 數據持久化

平台會自動將以下數據保存到本地目錄：

- **訓練結果**: `./jobs/` - 所有訓練任務和結果
- **地圖檔案**: `./maps/` - 自定義地圖
- **規則檔案**: `./rules/` - 遊戲規則
- **設定檔案**: `./settings.json` - 系統設定

這些目錄會自動掛載到容器中，確保數據不會丟失。

## 🔧 進階配置

### 修改端口
編輯 `docker-compose.yml`：
```yaml
ports:
  - "8080:8000"  # 將外部端口改為 8080
```

### 啟用 Nginx 代理
```bash
# 使用 Nginx 代理（端口 80）
docker-compose --profile nginx up -d

# 或使用 Makefile
make dev
```

### 自定義環境變數
在 `docker-compose.yml` 中添加：
```yaml
environment:
  - PYTHONUNBUFFERED=1
  - DEBUG=1
```

## 🐛 故障排除

### 常見問題

#### 1. 端口被佔用
```bash
# 檢查端口使用情況
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/macOS

# 停止佔用端口的服務
docker-compose down
```

#### 2. Docker 未啟動
```bash
# Windows/macOS: 啟動 Docker Desktop
# Linux: 
sudo systemctl start docker
```

#### 3. 權限問題（Linux）
```bash
# 將用戶加入 docker 群組
sudo usermod -aG docker $USER

# 重新登入或執行
newgrp docker
```

#### 4. 構建失敗
```bash
# 清理並重新構建
docker-compose down
docker system prune -f
docker-compose up --build -d
```

### 查看詳細日誌
```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs rl-platform

# 實時查看日誌
docker-compose logs -f
```

### 進入容器調試
```bash
# 進入容器
docker-compose exec rl-platform bash

# 查看容器內部檔案
docker-compose exec rl-platform ls -la
```

## 🔒 安全考慮

### 生產環境部署
1. **修改預設端口**
2. **設定防火牆規則**
3. **使用 HTTPS**
4. **限制容器資源使用**

### 示例生產配置
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  rl-platform:
    build: .
    ports:
      - "127.0.0.1:8000:8000"  # 僅允許本地訪問
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

## 📊 監控和維護

### 健康檢查
平台內建健康檢查：
```bash
# 檢查服務健康狀態
docker-compose ps

# 手動健康檢查
curl http://localhost:8000/
```

### 備份數據
```bash
# 備份重要目錄
tar -czf backup-$(date +%Y%m%d).tar.gz jobs/ maps/ rules/ settings.json
```

### 更新平台
```bash
# 拉取最新代碼
git pull

# 重新構建並啟動
docker-compose up --build -d
```

## 🎯 最佳實踐

1. **定期備份數據**
2. **監控容器資源使用**
3. **定期更新 Docker 映像**
4. **使用 Docker Compose 管理服務**
5. **設定適當的日誌輪轉**

## 📞 支援

如果遇到問題，請：
1. 檢查本故障排除章節
2. 查看 Docker 日誌
3. 確認系統需求
4. 聯繫技術支援

---

🎉 **恭喜！您已成功部署強化學習遊戲平台！** 