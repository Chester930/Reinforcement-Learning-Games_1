from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# 匯入各子 app 的 router
from map_api import app as map_app
from train_api import app as train_app
from analysis_api import app as analysis_app
from settings_api import app as settings_app
from rules_api import app as rules_app

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 將各 app 的路由掛載到主 app
app.mount('/maps', map_app)
app.mount('/train', train_app)
app.mount('/analysis', analysis_app)
app.mount('/settings', settings_app)
app.mount('/rules', rules_app)
app.mount('/jobs', StaticFiles(directory='jobs'), name='jobs')

# 掛載前端靜態檔案（如果存在）
if os.path.exists("frontend/build"):
    app.mount('/static', StaticFiles(directory='frontend/build/static'), name='static')
    # 掛載整個前端構建目錄到根路徑
    app.mount('/', StaticFiles(directory='frontend/build', html=True), name='frontend')

# 如果前端文件不存在，提供 API 訊息
@app.get('/')
async def root():
    return {"message": "Reinforcement Learning API is running."} 