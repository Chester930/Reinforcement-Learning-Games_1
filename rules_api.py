from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import os
import json
import uuid
from typing import List, Optional

app = FastAPI()
RULES_DIR = 'rules'
os.makedirs(RULES_DIR, exist_ok=True)

class Rule(BaseModel):
    id: str = ""  # 創建時自動生成
    name: str = "新規則"  # 預設名稱
    # 遊戲規則參數
    bonusReward: int = 10
    stepDecay: float = 1.0
    stepPenalty: float = -1
    goalReward: int = 100
    wallPenalty: int = -1
    maxSteps: int = 100
    # 強化學習參數
    learningRate: float = 0.1
    discountFactor: float = 0.95
    epsilon: float = 1.0
    seed: Optional[int] = None
    optimistic: bool = False

# 取得所有規則
@app.get('/rules', response_model=List[Rule])
def list_rules():
    rules = []
    for fname in os.listdir(RULES_DIR):
        if fname.endswith('.json'):
            with open(os.path.join(RULES_DIR, fname), 'r', encoding='utf-8') as f:
                data = json.load(f)
                rules.append(Rule(**data))
    return rules

# 取得單一規則
@app.get('/rules/{rule_id}', response_model=Rule)
def get_rule(rule_id: str):
    path = os.path.join(RULES_DIR, f'{rule_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Rule not found')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Rule(**data)

# 建立新規則
@app.post('/rules', response_model=Rule)
def create_rule(rule: Rule = Body(...)):
    rule_id = str(uuid.uuid4())
    rule.id = rule_id
    path = os.path.join(RULES_DIR, f'{rule_id}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(rule.dict(), f, ensure_ascii=False, indent=2)
    return rule

# 編輯規則
@app.put('/rules/{rule_id}', response_model=Rule)
def update_rule(rule_id: str, rule: Rule = Body(...)):
    path = os.path.join(RULES_DIR, f'{rule_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Rule not found')
    rule.id = rule_id
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(rule.dict(), f, ensure_ascii=False, indent=2)
    return rule

# 刪除規則
@app.delete('/rules/{rule_id}')
def delete_rule(rule_id: str):
    path = os.path.join(RULES_DIR, f'{rule_id}.json')
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail='Rule not found')
    os.remove(path)
    return {"id": rule_id, "message": "Rule deleted"} 