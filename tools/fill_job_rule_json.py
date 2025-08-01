import os
import json
import shutil

JOBS_DIR = 'jobs'
RULES_DIR = 'rules'

for job_id in os.listdir(JOBS_DIR):
    job_dir = os.path.join(JOBS_DIR, job_id)
    config_path = os.path.join(job_dir, 'config.json')
    rule_json_path = os.path.join(job_dir, 'rule.json')
    if not os.path.exists(config_path):
        continue
    if os.path.exists(rule_json_path):
        continue  # 已有 rule.json
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    rule_id = config.get('rule_id')
    if not rule_id:
        continue
    rule_src = os.path.join(RULES_DIR, f'{rule_id}.json')
    if os.path.exists(rule_src):
        shutil.copyfile(rule_src, rule_json_path)
        print(f'補全 {job_id} 的 rule.json')
    else:
        print(f'找不到規則 {rule_id}，無法補全 {job_id}') 