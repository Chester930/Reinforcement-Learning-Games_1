import matplotlib
matplotlib.use('Agg')  # 使用非交互式後端，避免GUI問題
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import JSONResponse
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import base64
from io import BytesIO
import json
import re
import requests
import markdown2
from datetime import datetime
import subprocess

app = FastAPI()
JOBS_DIR = 'jobs'

@app.get('/{job_id}/curve')
def get_learning_curve(job_id: str):
    log_path = os.path.join(JOBS_DIR, job_id, 'log.csv')
    if not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail='Log not found')
    df = pd.read_csv(log_path)
    rewards = df.groupby('episode')['reward'].sum().tolist()
    steps = df.groupby('episode')['step'].max().tolist()
    return {"rewards": rewards, "steps": steps}

@app.get('/{job_id}/heatmap')
def get_qtable_heatmap(job_id: str):
    qtable_path = os.path.join(JOBS_DIR, job_id, 'q_table.csv')
    if not os.path.exists(qtable_path):
        raise HTTPException(status_code=404, detail='Q-Table not found')
    
    df = pd.read_csv(qtable_path)
    
    # 檢查 Q-Table 是否為空
    if df.empty:
        raise HTTPException(status_code=400, detail='Q-Table is empty')
    
    # 檢查必要的欄位
    required_columns = ['state', 'action', 'value']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(status_code=400, detail=f'Q-Table missing columns: {missing_columns}')
    
    # 檢查是否有空值
    if df[required_columns].isnull().any().any():
        raise HTTPException(status_code=400, detail='Q-Table contains null values')
    
    # 以 state 為 row, action 為 column, value 為 cell
    try:
        pivot = df.pivot(index='state', columns='action', values='value').fillna(0)
        
        # 檢查 pivot 結果是否為空
        if pivot.empty:
            raise HTTPException(status_code=400, detail='Q-Table pivot result is empty')
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f'Q-Table pivot failed: {str(e)}')
    
    plt.figure(figsize=(8, 6))
    plt.title('Q-Table Heatmap')
    plt.imshow(pivot, cmap='viridis', aspect='auto')
    plt.xlabel('Action')
    plt.ylabel('State')
    plt.colorbar(label='Q-value')
    plt.xticks(ticks=np.arange(len(pivot.columns)), labels=pivot.columns)
    plt.yticks(ticks=np.arange(len(pivot.index)), labels=pivot.index)
    buf = BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format='png')
    plt.close()
    buf.seek(0)
    heatmap_png_base64 = base64.b64encode(buf.read()).decode('utf-8')
    
    # 檢查生成的圖像是否太小（可能有問題）
    if len(heatmap_png_base64) < 100:
        raise HTTPException(status_code=500, detail='Generated heatmap image is too small, possibly corrupted')
    
    return {"heatmap_png_base64": heatmap_png_base64}

@app.get('/{job_id}/optimal-path')
def get_optimal_path(job_id: str):
    qtable_path = os.path.join(JOBS_DIR, job_id, 'q_table.csv')
    map_path = os.path.join(JOBS_DIR, job_id, 'map.json')
    if not os.path.exists(qtable_path) or not os.path.exists(map_path):
        raise HTTPException(status_code=404, detail='Q-Table or map not found')
    df = pd.read_csv(qtable_path)
    with open(map_path, 'r', encoding='utf-8') as f:
        map_data = json.load(f)
    grid = map_data['map'] if 'map' in map_data else None
    if grid is None:
        raise HTTPException(status_code=400, detail='Map format error')
    # 找起點
    start = None
    for i, row in enumerate(grid):
        for j, cell in enumerate(row):
            if cell == 'S':
                start = (i, j)
    if start is None:
        raise HTTPException(status_code=400, detail='No start point')
    # 依 Q-Table 找最優路徑
    state = start
    path = [state]
    visited = set()
    actions = ['up', 'down', 'left', 'right']
    for _ in range(100):
        visited.add(state)
        q_vals = df[df['state'] == f"{state[0]},{state[1]}"]
        if q_vals.empty:
            break
        best = q_vals.loc[q_vals['value'].idxmax()]
        action = best['action']
        # 移動
        i, j = state
        if action == 'up':
            ni, nj = i-1, j
        elif action == 'down':
            ni, nj = i+1, j
        elif action == 'left':
            ni, nj = i, j-1
        elif action == 'right':
            ni, nj = i, j+1
        else:
            break
        if not (0 <= ni < len(grid) and 0 <= nj < len(grid[0])):
            break
        if grid[ni][nj] == '1':
            break
        state = (ni, nj)
        path.append(state)
        if grid[ni][nj] == 'G':
            break
        if state in visited:
            break
    
    # 生成最優路徑圖片
    plt.figure(figsize=(8, 6))
    plt.title('Optimal Path')
    # 繪製地圖網格
    for i, row in enumerate(grid):
        for j, cell in enumerate(row):
            if cell == 'S':
                plt.text(j, i, '🧑‍🌾', ha='center', va='center', fontsize=20)
            elif cell == 'G':
                plt.text(j, i, '🏁', ha='center', va='center', fontsize=20)
            elif cell == 'R':
                plt.text(j, i, '🪙', ha='center', va='center', fontsize=15)
            elif cell == 'T':
                plt.text(j, i, '🕳️', ha='center', va='center', fontsize=15)
            elif cell == '1':
                plt.text(j, i, '🪨', ha='center', 
                va='center', fontsize=15)
            else:
                plt.text(j, i, '·', ha='center', va='center', fontsize=10, color='lightgray')
    
    # 繪製路徑
    if len(path) > 1:
        path_x = [p[1] for p in path]
        path_y = [p[0] for p in path]
        plt.plot(path_x, path_y, 'r-', linewidth=3, alpha=0.7, label='Optimal Path')
        plt.scatter(path_x, path_y, color='red', s=50, alpha=0.7, marker='o')  # 避免 colorbar/sci 問題
    
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.xlim(-0.5, len(grid[0])-0.5)
    plt.ylim(len(grid)-0.5, -0.5)
    
    buf = BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    path_png_base64 = base64.b64encode(buf.read()).decode('utf-8')
    
    return {"optimal_path": path, "path_png_base64": path_png_base64}

def build_analysis_prompt(job_id, user_prompt):
    log_path = os.path.join(JOBS_DIR, job_id, 'log.csv')
    qtable_path = os.path.join(JOBS_DIR, job_id, 'q_table.csv')
    map_path = os.path.join(JOBS_DIR, job_id, 'map.json')
    # 學習曲線摘要
    rewards, steps = [], []
    training_summary = {}
    if os.path.exists(log_path):
        df_log = pd.read_csv(log_path)
        rewards = df_log.groupby('episode')['reward'].sum().tolist()[:20]
        steps = df_log.groupby('episode')['step'].max().tolist()[:20]
        
        # 計算訓練統計
        total_episodes = df_log['episode'].max()
        avg_reward = df_log.groupby('episode')['reward'].sum().mean()
        avg_steps = df_log.groupby('episode')['step'].max().mean()
        final_reward = df_log.groupby('episode')['reward'].sum().iloc[-1] if len(rewards) > 0 else 0
        final_steps = df_log.groupby('episode')['step'].max().iloc[-1] if len(steps) > 0 else 0
        
        training_summary = {
            'total_episodes': total_episodes,
            'avg_reward': round(avg_reward, 2),
            'avg_steps': round(avg_steps, 2),
            'final_reward': final_reward,
            'final_steps': final_steps,
            'reward_trend': '上升' if len(rewards) > 1 and rewards[-1] > rewards[0] else '下降' if len(rewards) > 1 and rewards[-1] < rewards[0] else '穩定',
            'steps_trend': '下降' if len(steps) > 1 and steps[-1] < steps[0] else '上升' if len(steps) > 1 and steps[-1] > steps[0] else '穩定'
        }
    # Q-Table 熱門狀態摘要
    qtable_str = ''
    if os.path.exists(qtable_path):
        df_q = pd.read_csv(qtable_path)
        qtable_top = df_q.sort_values('value', ascending=False).head(10)
        qtable_str = '\n'.join([f"{row['state']}, {row['action']}, {row['value']}" for _, row in qtable_top.iterrows()])
    # 最優路徑
    optimal_path = []
    if os.path.exists(qtable_path) and os.path.exists(map_path):
        # 直接複用 get_optimal_path 的邏輯
        with open(map_path, 'r', encoding='utf-8') as f:
            map_data = json.load(f)
        grid = map_data['map'] if 'map' in map_data else None
        if grid:
            df = pd.read_csv(qtable_path)
            start = None
            for i, row in enumerate(grid):
                for j, cell in enumerate(row):
                    if cell == 'S':
                        start = (i, j)
            if start:
                state = start
                path = [state]
                visited = set()
                for _ in range(100):
                    visited.add(state)
                    q_vals = df[df['state'] == f"{state[0]},{state[1]}"]
                    if q_vals.empty:
                        break
                    best = q_vals.loc[q_vals['value'].idxmax()]
                    action = best['action']
                    i, j = state
                    if action == 'up':
                        ni, nj = i-1, j
                    elif action == 'down':
                        ni, nj = i+1, j
                    elif action == 'left':
                        ni, nj = i, j-1
                    elif action == 'right':
                        ni, nj = i, j+1
                    else:
                        break
                    if not (0 <= ni < len(grid) and 0 <= nj < len(grid[0])):
                        break
                    if grid[ni][nj] == '1':
                        break
                    state = (ni, nj)
                    path.append(state)
                    if grid[ni][nj] == 'G':
                        break
                    if state in visited:
                        break
                optimal_path = path
    # 合併 prompt
    prompt = f"""{user_prompt}

## 訓練數據分析

### 訓練統計摘要
- **總回合數**: {training_summary.get('total_episodes', 0)}
- **平均獎勵**: {training_summary.get('avg_reward', 0)}
- **平均步數**: {training_summary.get('avg_steps', 0)}
- **最終獎勵**: {training_summary.get('final_reward', 0)}
- **最終步數**: {training_summary.get('final_steps', 0)}
- **獎勵趨勢**: {training_summary.get('reward_trend', '未知')}
- **步數趨勢**: {training_summary.get('steps_trend', '未知')}

### 學習曲線數據（前20回合）
- **獎勵序列**: {rewards}
- **步數序列**: {steps}

### Q-Table 分析
**最高價值狀態-動作對（前10筆）:**
{qtable_str}

### 最優路徑分析
**AI選擇的最優路徑**: {optimal_path}

## 分析要求

請根據以上數據進行詳細分析，並提供以下內容：

### 1. 學習效果評估
- 分析學習曲線的趨勢（獎勵和步數變化）
- 評估AI是否成功學習到有效策略
- 判斷訓練是否收斂
- 評估最終性能表現

### 2. 問題診斷
- 識別訓練過程中的問題（如循環、收斂失敗、探索不足等）
- 分析Q-Table的學習質量（是否有明顯的價值分布）
- 評估最優路徑的合理性（是否能到達目標）
- 檢查是否存在過擬合或欠擬合

### 3. 改進建議
- 針對發現的問題提供具體改進方案
- 建議參數調整方向（學習率、折扣因子、探索率等）
- 提供訓練策略優化建議
- 建議合適的訓練回合數

### 4. 算法特性分析
- 分析當前算法的優缺點
- 與其他強化學習算法的比較
- 適用場景評估
- 算法選擇建議

### 5. 總結與評分
- 整體訓練效果評分（1-10分）
- 主要成就和問題總結
- 實用性評估

請以結構化的方式呈現分析結果，使用清晰的標題和要點，並同時輸出 markdown 與 html 版本。"""
    return prompt

@app.post('/{job_id}/analyze-and-save')
def analyze_and_save(job_id: str, user_prompt: str = Body(..., embed=True)):
    job_dir = os.path.join(JOBS_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail='Job not found')
    
    # 創建分析記錄目錄
    analysis_log_dir = os.path.join(job_dir, 'analysis_logs')
    os.makedirs(analysis_log_dir, exist_ok=True)
    
    # 生成時間戳
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 讀取 AI 設定
    with open('settings.json', 'r', encoding='utf-8') as f:
        settings = json.load(f)
    system_prompt = settings.get('system_prompt', '')
    api_key = settings.get('api_key', '')
    model_name = settings.get('model_name', '')
    
    # 自動合併 prompt
    prompt = build_analysis_prompt(job_id, user_prompt)
    
    # 記錄完整的請求信息
    request_log = {
        'timestamp': timestamp,
        'job_id': job_id,
        'user_prompt': user_prompt,
        'system_prompt': system_prompt,
        'model_name': model_name,
        'full_prompt': system_prompt + "\n" + prompt,
        'request_data': {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt + "\n" + prompt}]}
            ]
        }
    }
    
    # 儲存請求記錄
    request_log_path = os.path.join(analysis_log_dir, f'request_{timestamp}.json')
    with open(request_log_path, 'w', encoding='utf-8') as f:
        json.dump(request_log, f, ensure_ascii=False, indent=2)
    
    # 呼叫 Gemini API
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}'
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [
            {"role": "user", "parts": [{"text": system_prompt + "\n" + prompt}]}
        ]
    }
    
    resp = requests.post(url, headers=headers, json=data)
    
    # 記錄API響應
    response_log = {
        'timestamp': timestamp,
        'job_id': job_id,
        'status_code': resp.status_code,
        'response_headers': dict(resp.headers),
        'response_text': resp.text,
        'success': resp.status_code == 200
    }
    
    # 儲存響應記錄
    response_log_path = os.path.join(analysis_log_dir, f'response_{timestamp}.json')
    with open(response_log_path, 'w', encoding='utf-8') as f:
        json.dump(response_log, f, ensure_ascii=False, indent=2)
    
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail=f'Gemini API error: {resp.text}')
    
    gemini_content = resp.json()['candidates'][0]['content']['parts'][0]['text']
    
    # 記錄原始AI回覆
    raw_response_log = {
        'timestamp': timestamp,
        'job_id': job_id,
        'raw_ai_response': gemini_content,
        'response_length': len(gemini_content)
    }
    
    # 儲存原始回覆記錄
    raw_response_log_path = os.path.join(analysis_log_dir, f'raw_response_{timestamp}.json')
    with open(raw_response_log_path, 'w', encoding='utf-8') as f:
        json.dump(raw_response_log, f, ensure_ascii=False, indent=2)
    
    # 儲存原始AI回覆為文本文件
    raw_response_text_path = os.path.join(analysis_log_dir, f'raw_response_{timestamp}.txt')
    with open(raw_response_text_path, 'w', encoding='utf-8') as f:
        f.write(gemini_content)
    
    # 處理 markdown 內容
    md_match = re.search(r"```markdown\s*([\s\S]+?)```", gemini_content)
    md_content = md_match.group(1).strip() if md_match else gemini_content
    
    # 記錄 markdown 處理過程
    md_processing_log = {
        'timestamp': timestamp,
        'job_id': job_id,
        'has_markdown_block': md_match is not None,
        'markdown_content_length': len(md_content),
        'markdown_content_preview': md_content[:500] + '...' if len(md_content) > 500 else md_content
    }
    
    # 儲存 markdown 處理記錄
    md_processing_log_path = os.path.join(analysis_log_dir, f'md_processing_{timestamp}.json')
    with open(md_processing_log_path, 'w', encoding='utf-8') as f:
        json.dump(md_processing_log, f, ensure_ascii=False, indent=2)
    
    # 儲存 .md
    md_path = os.path.join(job_dir, 'analysis.md')
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    
    # 處理 HTML 內容
    html_match = re.search(r"```html\s*([\s\S]+?)```", gemini_content)
    if html_match:
        html_content = html_match.group(1).strip()
        html_source = 'ai_generated'
    else:
        html_content = markdown2.markdown(md_content)
        html_source = 'markdown_converted'
    
    # 記錄 HTML 處理過程
    html_processing_log = {
        'timestamp': timestamp,
        'job_id': job_id,
        'html_source': html_source,
        'has_html_block': html_match is not None,
        'html_content_length': len(html_content),
        'html_content_preview': html_content[:500] + '...' if len(html_content) > 500 else html_content
    }
    
    # 儲存 HTML 處理記錄
    html_processing_log_path = os.path.join(analysis_log_dir, f'html_processing_{timestamp}.json')
    with open(html_processing_log_path, 'w', encoding='utf-8') as f:
        json.dump(html_processing_log, f, ensure_ascii=False, indent=2)
    
    # 儲存 .html
    html_path = os.path.join(job_dir, 'analysis.html')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # 創建分析摘要記錄
    analysis_summary = {
        'timestamp': timestamp,
        'job_id': job_id,
        'user_prompt': user_prompt,
        'analysis_files_created': {
            'analysis.md': os.path.exists(md_path),
            'analysis.html': os.path.exists(html_path),
            'request_log': os.path.exists(request_log_path),
            'response_log': os.path.exists(response_log_path),
            'raw_response_log': os.path.exists(raw_response_log_path),
            'raw_response_text': os.path.exists(raw_response_text_path),
            'md_processing_log': os.path.exists(md_processing_log_path),
            'html_processing_log': os.path.exists(html_processing_log_path)
        },
        'content_stats': {
            'raw_response_length': len(gemini_content),
            'markdown_length': len(md_content),
            'html_length': len(html_content),
            'html_source': html_source
        }
    }
    
    # 儲存分析摘要
    summary_log_path = os.path.join(analysis_log_dir, f'analysis_summary_{timestamp}.json')
    with open(summary_log_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_summary, f, ensure_ascii=False, indent=2)
    
    return {"message": "Analysis saved.", "md": md_content, "html": html_content}

@app.get('/{job_id}/report')
def get_analysis_report(job_id: str):
    report_path = os.path.join(JOBS_DIR, job_id, 'analysis.md')
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail='Analysis report not found')
    with open(report_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return {"content": content}

@app.get('/{job_id}/analysis.html')
def get_analysis_html(job_id: str):
    """直接返回 analysis.html 的內容供前端嵌入"""
    html_path = os.path.join(JOBS_DIR, job_id, 'analysis.html')
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail='Analysis HTML not found')
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return {"html_content": content}

@app.get('/{job_id}/config.json')
def get_job_config(job_id: str):
    """返回 job 的配置信息"""
    config_path = os.path.join(JOBS_DIR, job_id, 'config.json')
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail='Job config not found')
    with open(config_path, 'r', encoding='utf-8') as f:
        config_data = json.load(f)
    return config_data

@app.get('/{job_id}/rule.json')
def get_job_rule(job_id: str):
    """返回 job 專用的 rule.json"""
    rule_path = os.path.join(JOBS_DIR, job_id, 'rule.json')
    if not os.path.exists(rule_path):
        raise HTTPException(status_code=404, detail='Job rule not found')
    with open(rule_path, 'r', encoding='utf-8') as f:
        rule_data = json.load(f)
    return rule_data

@app.get('/{job_id}/map.json')
def get_job_map(job_id: str):
    """返回 job 專用的 map.json"""
    map_path = os.path.join(JOBS_DIR, job_id, 'map.json')
    if not os.path.exists(map_path):
        raise HTTPException(status_code=404, detail='Job map not found')
    with open(map_path, 'r', encoding='utf-8') as f:
        map_data = json.load(f)
    return map_data

@app.get('/{job_id}/verify')
def verify_training_api(job_id: str):
    log_path = os.path.join(JOBS_DIR, job_id, 'log.csv')
    if not os.path.exists(log_path):
        raise HTTPException(status_code=404, detail='Log not found')
    try:
        result = subprocess.run(['python', 'verify_training.py', log_path], capture_output=True, text=True, timeout=10)
        verify_ok = '[OK]' in result.stdout
        return {
            'verify_ok': verify_ok,
            'verify_output': result.stdout,
            'returncode': result.returncode
        }
    except Exception as e:
        return {
            'verify_ok': False,
            'verify_output': f'驗證過程發生錯誤: {str(e)}',
            'returncode': -1
        }

 