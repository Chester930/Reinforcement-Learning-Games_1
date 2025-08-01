# 使用多階段構建
FROM node:18-alpine AS frontend-builder

# 設置工作目錄
WORKDIR /app

# 複製前端檔案
COPY frontend/package*.json ./

# 安裝前端依賴
RUN npm ci --only=production

# 複製前端源碼
COPY frontend/ ./

# 構建前端
RUN npm run build

# 後端階段
FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製後端源碼
COPY *.py ./
COPY maps/ ./maps/
COPY rules/ ./rules/
COPY settings.json ./

# 創建必要的目錄
RUN mkdir -p jobs maps rules

# 從前端構建階段複製構建結果
COPY --from=frontend-builder /app/build ./frontend/build

# 暴露端口
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# 啟動命令
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 