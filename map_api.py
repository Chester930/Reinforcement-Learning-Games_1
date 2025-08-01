from fastapi import FastAPI, HTTPException, UploadFile, File, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import json
import uuid
from typing import List

app = FastAPI()
MAPS_DIR = 'maps'
os.makedirs(MAPS_DIR, exist_ok=True)

class MapMeta(BaseModel):
    id: str
    name: str
    size: List[int]
    start: List[int]
    goal: List[int]

# 取得所有地圖列表
@app.get('/maps', response_model=List[MapMeta])
def list_maps():
    maps = []
    for fname in os.listdir(MAPS_DIR):
        if fname.endswith('.json'):
            with open(os.path.join(MAPS_DIR, fname), 'r', encoding='utf-8') as f:
                data = json.load(f)
                maps.append(MapMeta(
                    id=fname[:-5],
                    name=data.get('name', fname[:-5]),
                    size=data.get('size', []),
                    start=data.get('start', []),
                    goal=data.get('goal', [])
                ))
    return maps

# 取得單一地圖內容
@app.get('/maps/{map_id}')
def get_map(map_id: str):
    path = os.path.join(MAPS_DIR, f'{map_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Map not found')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

# 上傳/建立新地圖
@app.post('/maps')
def create_map(file: UploadFile = File(...)):
    try:
        data = json.load(file.file)
        map_id = str(uuid.uuid4())
        path = os.path.join(MAPS_DIR, f'{map_id}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"id": map_id, "message": "Map created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid map file: {e}')

# 刪除地圖
@app.delete('/maps/{map_id}')
def delete_map(map_id: str):
    path = os.path.join(MAPS_DIR, f'{map_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Map not found')
    os.remove(path)
    return {"id": map_id, "message": "Map deleted"}

@app.post('/maps/json')
def create_map_json(data: dict = Body(...)):
    try:
        map_id = str(uuid.uuid4())
        path = os.path.join(MAPS_DIR, f'{map_id}.json')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"id": map_id, "message": "Map created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid map data: {e}') 