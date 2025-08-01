# 🚀 強化學習遊戲平台 - 快速啟動指南

## 📋 系統需求
- **Docker Desktop** (必須安裝並啟動)
- **Windows 10/11** 或 **Linux/macOS**

## ⚡ 一鍵啟動

### Windows 用戶
```bash
# 雙擊執行
start.bat
```

### Linux/macOS 用戶
```bash
# 給予執行權限
chmod +x start.sh

# 執行啟動腳本
./start.sh
```

## 🌐 訪問平台
啟動完成後，在瀏覽器中訪問：
- **主要地址**: http://localhost
- **備用地址**: http://localhost:8000

## 🛑 停止平台
```bash
# Windows
stop.bat

# Linux/macOS
./stop.sh
```

## 📁 項目結構
```
強化學習遊戲平台/
├── start.bat          # Windows 一鍵啟動
├── start.sh           # Linux/macOS 一鍵啟動
├── stop.bat           # Windows 停止腳本
├── stop.sh            # Linux/macOS 停止腳本
├── README.md          # 詳細說明文檔
├── DOCKER_DEPLOYMENT.md # Docker 部署指南
├── frontend/          # React 前端
├── maps/              # 遊戲地圖
├── rules/             # 遊戲規則
└── jobs/              # 訓練任務（自動創建）
```

## 🔧 故障排除

### 1. Docker 未啟動
- 確保 Docker Desktop 已安裝並運行
- 在終端執行 `docker --version` 確認

### 2. 端口被佔用
- 腳本會自動檢測並提示解決方案
- 或手動停止佔用端口的程序

### 3. 構建失敗
- 檢查網絡連接
- 重新執行啟動腳本

## 📞 支援
如遇問題，請查看：
- `README.md` - 詳細技術文檔
- `DOCKER_DEPLOYMENT.md` - Docker 部署指南 