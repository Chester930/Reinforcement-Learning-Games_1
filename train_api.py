from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import json
import uuid
import shutil
from typing import Optional, List
import subprocess
from datetime import datetime

app = FastAPI()
JOBS_DIR = 'jobs'
MAPS_DIR = 'maps'
os.makedirs(JOBS_DIR, exist_ok=True)

class TrainRequest(BaseModel):
    map_id: str
    algorithm: str  # 'q_learning' or 'sarsa'
    episodes: int = 500
    learning_rate: float = 0.1
    discount_factor: float = 0.95
    epsilon: float = 1.0  # 更新為初始探索率
    job_name: str
    seed: Optional[int] = None  # 新增隨機種子參數
    optimistic: bool = False  # 新增樂觀初始化參數
    lambda_param: Optional[float] = None  # 新增 SARSA(λ) 的 λ 參數
    rule_id: Optional[str] = None # 新增規則 ID 參數

class JobInfo(BaseModel):
    job_id: str
    job_name: str
    created_at: str

@app.post('/train')
def start_train(req: TrainRequest):
    # 檢查地圖是否存在
    map_path = os.path.join(MAPS_DIR, f'{req.map_id}.json')
    if not os.path.exists(map_path):
        raise HTTPException(status_code=404, detail='Map not found')
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    # 儲存訓練設定
    config = req.dict()
    config['job_id'] = job_id
    config['created_at'] = datetime.now().isoformat()
    config_path = os.path.join(job_dir, 'config.json')
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    # 複製地圖檔到 job_dir
    shutil.copy(map_path, os.path.join(job_dir, 'map.json'))
    # 複製 rule json
    if config.get('rule_id'):
        rule_src = os.path.join('rules', f"{config['rule_id']}.json")
        rule_dst = os.path.join(job_dir, 'rule.json')
        if os.path.exists(rule_src):
            shutil.copyfile(rule_src, rule_dst)
    # 啟動訓練腳本
    algo_script = 'q_learning.py' if req.algorithm == 'q_learning' else 'sarsa.py'
    cmd = [
        'python', algo_script,
        '--map', os.path.join(job_dir, 'map.json'),
        '--episodes', str(req.episodes),
        '--learning_rate', str(req.learning_rate),
        '--discount_factor', str(req.discount_factor),
        '--epsilon', str(req.epsilon),
        '--output', job_dir
    ]
    
    # 新增隨機種子參數
    if req.seed is not None:
        cmd.extend(['--seed', str(req.seed)])
    
    # 新增樂觀初始化參數
    if req.optimistic:
        cmd.append('--optimistic')
    
    # 新增 SARSA(λ) 的 λ 參數
    if req.lambda_param is not None:
        cmd.extend(['--lambda_param', str(req.lambda_param)])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        status = 'completed'
    except Exception as e:
        status = 'failed'
        with open(os.path.join(job_dir, 'error.log'), 'w', encoding='utf-8') as f:
            f.write(str(e))
    with open(os.path.join(job_dir, 'status.json'), 'w', encoding='utf-8') as f:
        json.dump({'status': status}, f)
    return {'job_id': job_id, 'status': status}

@app.get('/train/{job_id}/status')
def get_train_status(job_id: str):
    job_dir = os.path.join(JOBS_DIR, job_id)
    status_path = os.path.join(job_dir, 'status.json')
    if not os.path.exists(status_path):
        raise HTTPException(status_code=404, detail='Job not found')
    with open(status_path, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.get('/train/{job_id}/result')
def get_train_result(job_id: str):
    job_dir = os.path.join(JOBS_DIR, job_id)
    qtable_path = os.path.join(job_dir, 'q_table.csv')
    log_path = os.path.join(job_dir, 'log.csv')
    if not os.path.exists(qtable_path) or not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail='Result not found')
    with open(qtable_path, 'r', encoding='utf-8') as f:
        qtable = f.read()
    with open(log_path, 'r', encoding='utf-8') as f:
        log = f.read()
    return {'q_table.csv': qtable, 'log.csv': log}

@app.get('/train/jobs', response_model=List[JobInfo])
def list_jobs():
    jobs = []
    for job_id in os.listdir(JOBS_DIR):
        job_dir = os.path.join(JOBS_DIR, job_id)
        config_path = os.path.join(job_dir, 'config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            jobs.append(JobInfo(
                job_id=job_id,
                job_name=config.get('job_name', ''),
                created_at=config.get('created_at', '')
            ))
    jobs.sort(key=lambda x: x.created_at, reverse=True)
    return jobs 