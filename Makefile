.PHONY: help start stop restart build logs clean status

# 預設目標
help:
	@echo "🎮 強化學習遊戲平台 - Docker 管理命令"
	@echo "========================================"
	@echo "start    - 啟動平台"
	@echo "stop     - 停止平台"
	@echo "restart  - 重啟平台"
	@echo "build    - 重新構建"
	@echo "logs     - 查看日誌"
	@echo "status   - 查看狀態"
	@echo "clean    - 清理所有數據"
	@echo "help     - 顯示此幫助"

# 啟動平台
start:
	@echo "🚀 啟動強化學習平台..."
	docker-compose up -d
	@echo "✅ 平台已啟動"
	@echo "🌐 訪問地址: http://localhost"

# 停止平台
stop:
	@echo "🛑 停止強化學習平台..."
	docker-compose down
	@echo "✅ 平台已停止"

# 重啟平台
restart: stop start

# 重新構建
build:
	@echo "🔨 重新構建平台..."
	docker-compose up --build -d
	@echo "✅ 構建完成"

# 查看日誌
logs:
	@echo "📋 查看平台日誌..."
	docker-compose logs -f

# 查看狀態
status:
	@echo "📊 平台狀態:"
	docker-compose ps

# 清理所有數據
clean:
	@echo "🧹 清理所有數據..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ 清理完成"

# 開發模式（包含 Nginx）
dev:
	@echo "🔧 啟動開發模式（包含 Nginx）..."
	docker-compose --profile nginx up -d
	@echo "✅ 開發模式已啟動"
	@echo "🌐 訪問地址: http://localhost" 