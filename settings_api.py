from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import json

app = FastAPI()
SETTINGS_PATH = 'settings.json'

class Settings(BaseModel):
    system_prompt: str = ''
    api_key: str = ''
    model_name: str = ''

@app.get('/settings', response_model=Settings)
def get_settings():
    if not os.path.exists(SETTINGS_PATH):
        return Settings()
    with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Settings(**data)

@app.post('/settings', response_model=Settings)
def update_settings(settings: Settings):
    with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
        json.dump(settings.dict(), f, ensure_ascii=False, indent=2)
    return settings 