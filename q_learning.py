import json
import numpy as np
import pandas as pd
import os
import argparse
import copy  # 新增 copy 模組

# 參數設定
MAP_PATH = 'maps/example_map.json'
EPISODES = 500
MAX_STEPS = 100
LEARNING_RATE = 0.1
DISCOUNT_FACTOR = 0.95
EPSILON_START = 1.0  # 初始探索率
EPSILON_END = 0.01   # 最終探索率
EPSILON_DECAY = 0.995  # 探索率衰減因子
ACTIONS = ['up', 'down', 'left', 'right']

# 地圖元素標記
START = 'S'
GOAL = 'G'
REWARD = 'R'
TRAP = 'T'
OBSTACLE = '1'
EMPTY = '0'

# Q-Table 初始化設定
OPTIMISTIC_INIT = False  # 是否使用樂觀初始化
OPTIMISTIC_VALUE = 1.0   # 樂觀初始值
STRICT_GOAL_REWARD_ZERO = True  # 預設開啟 reward 歸零


def load_map(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['map']


def load_rule(rule_id):
    """載入規則設定"""
    try:
        with open('rules.json', 'r', encoding='utf-8') as f:
            rules = json.load(f)
            for rule in rules:
                if rule['id'] == rule_id:
                    return rule
    except Exception as e:
        print(f"載入規則失敗: {str(e)}")
        return None


def validate_map(map_grid):
    """驗證地圖的有效性"""
    has_start = False
    has_goal = False
    has_trap = False
    
    for i, row in enumerate(map_grid):
        for j, cell in enumerate(row):
            if cell == START:
                has_start = True
            elif cell == GOAL:
                has_goal = True
            elif cell == TRAP:
                has_trap = True
    
    if not has_start:
        raise ValueError('地圖中沒有起點 (S)')
    if not has_goal:
        raise ValueError('地圖中沒有目標 (G)')
    
    print(f"地圖驗證通過：起點 ✓, 目標 ✓, 陷阱 {'✓' if has_trap else '✗'}")
    return True


def find_start(map_grid):
    for i, row in enumerate(map_grid):
        for j, cell in enumerate(row):
            if cell == START:
                return (i, j)
    raise ValueError('No start point found')


def is_terminal(cell):
    """判斷是否為終止狀態（目標或陷阱）"""
    return cell in [GOAL, TRAP]


def get_valid_actions(map_grid, pos):
    actions = []
    rows, cols = len(map_grid), len(map_grid[0])
    i, j = pos
    for idx, (di, dj) in enumerate([(-1,0),(1,0),(0,-1),(0,1)]):
        ni, nj = i+di, j+dj
        if 0 <= ni < rows and 0 <= nj < cols:
            if map_grid[ni][nj] != OBSTACLE:
                actions.append(ACTIONS[idx])
    return actions


def move(map_grid, pos, action):
    i, j = pos
    if action == 'up':
        ni, nj = i-1, j
    elif action == 'down':
        ni, nj = i+1, j
    elif action == 'left':
        ni, nj = i, j-1
    elif action == 'right':
        ni, nj = i, j+1
    else:
        raise ValueError('Invalid action')
    rows, cols = len(map_grid), len(map_grid[0])
    if 0 <= ni < rows and 0 <= nj < cols and map_grid[ni][nj] != OBSTACLE:
        return (ni, nj)
    return pos  # 撞牆或障礙物不動


def get_reward(cell, rule_data):
    """獲取獎勵值（使用規則設定）"""
    if cell == GOAL:
        return rule_data['goalReward']
    elif cell == REWARD:
        return rule_data['bonusReward']
    elif cell == TRAP:
        return 0  # 陷阱不給予懲罰，只用於結束回合
    else:
        return rule_data['stepPenalty']


def state_to_str(pos):
    return f"{pos[0]},{pos[1]}"


def get_epsilon(episode, total_episodes):
    """計算當前探索率（指數衰減）"""
    if EPSILON_DECAY == 1.0:
        return EPSILON_START
    
    # 指數衰減
    decay_rate = (EPSILON_END / EPSILON_START) ** (1 / total_episodes)
    epsilon = EPSILON_START * (decay_rate ** episode)
    return max(epsilon, EPSILON_END)


def main(map_path, episodes, learning_rate, discount_factor, epsilon_start, output_dir, seed=None, strict_goal_reward_zero=True, rule_id=None):
    # 設定隨機種子以提高可重現性
    if seed is not None:
        np.random.seed(seed)
        print(f"隨機種子設定為: {seed}")
    
    # 載入規則
    rule_data = load_rule(rule_id) if rule_id else {
        'goalReward': 100,
        'bonusReward': 10,
        'trapPenalty': -50,
        'stepPenalty': -1,
        'wallPenalty': -1,
        'stepDecay': 1.0,
        'maxSteps': MAX_STEPS
    }
    
    map_grid = load_map(map_path)
    validate_map(map_grid)  # 驗證地圖有效性
    
    rows, cols = len(map_grid), len(map_grid[0])
    
    # 初始化 Q-Table
    q_table = {}
    initial_value = OPTIMISTIC_VALUE if OPTIMISTIC_INIT else 0.0
    
    for i in range(rows):
        for j in range(cols):
            if map_grid[i][j] != OBSTACLE:
                for action in get_valid_actions(map_grid, (i, j)):
                    q_table[(i, j, action)] = initial_value
    
    log_records = []
    episode_rewards = []  # 記錄每回合的總獎勵
    
    print(f"開始訓練：{episodes} 回合")
    print(f"學習率: {learning_rate}, 折扣因子: {discount_factor}")
    print(f"探索率: {epsilon_start} → {EPSILON_END} (衰減: {EPSILON_DECAY})")
    print(f"使用規則：{rule_data}")
    
    for episode in range(1, episodes+1):
        # 每回合開始時重置地圖
        current_map = copy.deepcopy(map_grid)
        pos = find_start(current_map)
        episode_reward = 0
        current_epsilon = get_epsilon(episode, episodes)
        success = False
        last_cell = None
        for step in range(1, rule_data['maxSteps']+1):
            state = pos
            valid_actions = get_valid_actions(current_map, state)
            
            # ε-greedy 策略
            if np.random.rand() < current_epsilon:
                action = np.random.choice(valid_actions)
            else:
                q_vals = [q_table.get((state[0], state[1], a), -np.inf) for a in valid_actions]
                max_q = np.max(q_vals)
                best_actions = [a for a, q in zip(valid_actions, q_vals) if q == max_q]
                action = np.random.choice(best_actions)
            
            next_pos = move(current_map, state, action)
            cell = current_map[next_pos[0]][next_pos[1]]
            reward = get_reward(cell, rule_data)
            
            # 如果是獎勵格，取得後變為空格
            if cell == REWARD:
                current_map[next_pos[0]][next_pos[1]] = EMPTY
            
            # 應用步數衰減
            reward = round(reward * (rule_data['stepDecay'] ** step))
            
            episode_reward += reward
            last_cell = cell
            
            next_valid_actions = get_valid_actions(current_map, next_pos)
            next_qs = [q_table.get((next_pos[0], next_pos[1], a), 0.0) for a in next_valid_actions]
            max_next_q = max(next_qs) if next_qs else 0.0
            
            # Q-Learning 更新
            q_key = (state[0], state[1], action)
            q_table[q_key] = q_table.get(q_key, 0.0) + learning_rate * (reward + discount_factor * max_next_q - q_table.get(q_key, 0.0))
            
            log_records.append({
                'episode': episode,
                'step': step,
                'state': state_to_str(state),
                'action': action,
                'reward': reward,
                'next_state': state_to_str(next_pos),
                'done': is_terminal(cell),
                'epsilon': current_epsilon,
                'success': cell == GOAL
            })
            
            # 修正終止條件：目標或陷阱都終止回合
            if is_terminal(cell) or step == rule_data['maxSteps']:
                if cell == GOAL:
                    success = True
                break
            pos = next_pos
        # 最終 reward 歸零判斷
        if strict_goal_reward_zero and last_cell != GOAL:
            episode_reward = 0
        episode_rewards.append(episode_reward)
        
        # 每 50 回合顯示進度
        if episode % 50 == 0:
            avg_reward = np.mean(episode_rewards[-50:])
            print(f"回合 {episode}/{episodes}, 平均獎勵: {avg_reward:.2f}, 探索率: {current_epsilon:.3f}")
    
    # 輸出 Q-Table
    os.makedirs(output_dir, exist_ok=True)
    qtable_rows = []
    for (i, j, action), value in q_table.items():
        qtable_rows.append({'state': state_to_str((i, j)), 'action': action, 'value': value})
    
    qtable_output = os.path.join(output_dir, 'q_table.csv')
    log_output = os.path.join(output_dir, 'log.csv')
    
    pd.DataFrame(qtable_rows).to_csv(qtable_output, index=False)
    pd.DataFrame(log_records).to_csv(log_output, index=False)
    
    # 輸出訓練統計
    final_avg_reward = np.mean(episode_rewards[-100:]) if len(episode_rewards) >= 100 else np.mean(episode_rewards)
    print(f"\n訓練完成！")
    print(f"Q-Table 已儲存至: {qtable_output}")
    print(f"訓練記錄已儲存至: {log_output}")
    print(f"最終 100 回合平均獎勵: {final_avg_reward:.2f}")
    print(f"總回合數: {len(episode_rewards)}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Q-Learning 強化學習演算法')
    parser.add_argument('--map', type=str, default=MAP_PATH, help='地圖檔路徑')
    parser.add_argument('--episodes', type=int, default=EPISODES, help='訓練回合數')
    parser.add_argument('--learning_rate', type=float, default=LEARNING_RATE, help='學習率')
    parser.add_argument('--discount_factor', type=float, default=DISCOUNT_FACTOR, help='折扣因子')
    parser.add_argument('--epsilon', type=float, default=EPSILON_START, help='初始探索率')
    parser.add_argument('--output', type=str, default='output', help='輸出目錄')
    parser.add_argument('--seed', type=int, default=None, help='隨機種子（用於可重現性）')
    parser.add_argument('--optimistic', action='store_true', help='使用樂觀初始化')
    parser.add_argument('--strict_goal_reward_zero', action='store_true', default=True, help='沒到終點時分數歸零（預設開啟）')
    parser.add_argument('--rule', type=str, default=None, help='規則ID')
    
    args = parser.parse_args()
    
    # 設定樂觀初始化
    if args.optimistic:
        OPTIMISTIC_INIT = True
        print("使用樂觀初始化")
    
    main(args.map, args.episodes, args.learning_rate, args.discount_factor, args.epsilon, args.output, args.seed, args.strict_goal_reward_zero, args.rule) 