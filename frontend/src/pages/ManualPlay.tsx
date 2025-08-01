import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../Layout';
import { Typography, Box, Button, MenuItem, Select, Paper, Alert } from '@mui/material';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const TOOL_ICONS: Record<string, React.ReactNode> = {
  start: <span style={{ fontSize: 32 }}>🧑‍🌾</span>,
  goal: <span style={{ fontSize: 32 }}>🏁</span>,
  bonus: <span style={{ fontSize: 32 }}>🪙</span>,
  trap: <span style={{ fontSize: 32 }}>🕳️</span>,
  obstacle: <span style={{ fontSize: 32 }}>🪨</span>,
  empty: null,
};

function cellType(cell: string) {
  switch (cell) {
    case 'S': return 'start';
    case 'G': return 'goal';
    case 'R': return 'bonus';
    case 'T': return 'trap';
    case '1': return 'obstacle';
    default: return 'empty';
  }
}

const ManualPlay: React.FC = () => {
  // 地圖與規則選擇
  const [maps, setMaps] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [mapData, setMapData] = useState<string[][]>([]);
  const [ruleData, setRuleData] = useState<any>(null);
  // 遊戲狀態
  const [playerPos, setPlayerPos] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [steps, setSteps] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameMsg, setGameMsg] = useState('');
  // 當前遊戲的地圖和規則ID（用於重玩時保持相同設定）
  const [currentGameMapId, setCurrentGameMapId] = useState('');
  const [currentGameRuleId, setCurrentGameRuleId] = useState('');
  const [currentMapData, setCurrentMapData] = useState<string[][]>([]);  // 新增：當前遊戲中的地圖狀態

  // 載入地圖與規則列表
  useEffect(() => {
    axios.get(`${API_BASE}/maps/maps`).then(res => setMaps(res.data));
    axios.get(`${API_BASE}/rules/rules`).then(res => setRules(res.data));
  }, []);

  // 載入地圖內容
  const loadMap = async (id: string) => {
    const res = await axios.get(`${API_BASE}/maps/maps/${id}`);
    setMapData(res.data.map);
    setCurrentMapData(JSON.parse(JSON.stringify(res.data.map))); // 深度複製地圖
    // 找起點
    for (let i = 0; i < res.data.map.length; i++) {
      for (let j = 0; j < res.data.map[0].length; j++) {
        if (res.data.map[i][j] === 'S') {
          setPlayerPos([i, j]);
          return;
        }
      }
    }
    setPlayerPos([0, 0]);
  };
  // 載入規則內容
  const loadRule = (id: string) => {
    const rule = rules.find(r => r.id === id);
    setRuleData(rule);
  };

  // 開始遊戲
  const handleStart = async () => {
    if (!selectedMap || !selectedRule) return;
    
    // 檢查是否選擇了新的地圖或規則
    const isNewMap = selectedMap !== currentGameMapId;
    const isNewRule = selectedRule !== currentGameRuleId;
    
    // 只有當選擇了新的地圖或規則時，才更新當前遊戲設定
    if (isNewMap || isNewRule) {
      setCurrentGameMapId(selectedMap);
      setCurrentGameRuleId(selectedRule);
    }
    
    await loadMap(selectedMap);
    loadRule(selectedRule);
    setScore(0);
    setSteps(0);
    setGameOver(false);
    setGameMsg('');
  };

  // 移動
  const movePlayer = useCallback((di: number, dj: number) => {
    if (!playerPos || !currentMapData.length || !ruleData || gameOver) return;
    const [i, j] = playerPos;
    const ni = i + di;
    const nj = j + dj;
    const numRows = currentMapData.length;
    const numCols = currentMapData[0].length;
    let newScore = score;
    let newSteps = steps + 1;
    let msg = '';
    // 撞牆
    if (ni < 0 || ni >= numRows || nj < 0 || nj >= numCols || currentMapData[ni][nj] === '1') {
      newScore += ruleData.wallPenalty;
      msg = '撞牆！';
    } else {
      // 正常移動
      setPlayerPos([ni, nj]);
      // 每步懲罰
      newScore += ruleData.stepPenalty;
      // 寶箱（只能拿一次）
      if (currentMapData[ni][nj] === 'R') {
        newScore += ruleData.bonusReward;
        // 更新地圖，將寶箱位置變為空格
        const newMapData = [...currentMapData];
        newMapData[ni][nj] = '0';
        setCurrentMapData(newMapData);
      }
      // 終點
      if (currentMapData[ni][nj] === 'G') {
        newScore += ruleData.goalReward;
        setGameOver(true);
        setGameMsg('恭喜到達終點！');
      }
    }
    // 步數衰減
    newScore = Math.round(newScore * Math.pow(ruleData.stepDecay, newSteps));
    // 最大步數
    if (newSteps >= ruleData.maxSteps) {
      setGameOver(true);
      setGameMsg('已達最大步數，分數歸零！');
      newScore = 0;
    }
    setScore(newScore);
    setSteps(newSteps);
    if (!gameOver && msg) setGameMsg(msg);
  }, [playerPos, currentMapData, ruleData, score, steps, gameOver]);

  // 鍵盤操作
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowUp') movePlayer(-1, 0);
      if (e.key === 'ArrowDown') movePlayer(1, 0);
      if (e.key === 'ArrowLeft') movePlayer(0, -1);
      if (e.key === 'ArrowRight') movePlayer(0, 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [movePlayer, gameOver]);

  // 重玩（使用相同地圖與規則）
  const handleRestart = () => {
    // 確保有當前遊戲的地圖和規則設定
    if (!currentGameMapId || !currentGameRuleId) return;
    
    // 使用當前遊戲的地圖和規則設定
    setSelectedMap(currentGameMapId);
    setSelectedRule(currentGameRuleId);
    // 重新載入地圖和規則
    loadMap(currentGameMapId);
    loadRule(currentGameRuleId);
    // 重置遊戲狀態
    setScore(0);
    setSteps(0);
    setGameOver(false);
    setGameMsg('');
  };

  return (
    <Layout title="手動遊玩">
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography>選擇地圖：</Typography>
          <Select value={selectedMap} onChange={e => setSelectedMap(e.target.value)} sx={{ minWidth: 120 }}>
            {maps.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </Select>
          <Typography>選擇規則：</Typography>
          <Select value={selectedRule} onChange={e => setSelectedRule(e.target.value)} sx={{ minWidth: 120 }}>
            {rules.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </Select>
          <Button variant="contained" color="primary" onClick={handleStart} disabled={!selectedMap || !selectedRule}>
            開始遊戲
          </Button>
        </Box>
        {mapData.length > 0 && playerPos && ruleData && (
          <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
            {/* 地圖區域 */}
            <Box>
              <Paper sx={{ p: 2, display: 'inline-block', background: '#f5fbe7' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${currentMapData[0].length}, 48px)`, gap: 0 }}>
                  {currentMapData.map((row, i) =>
                    row.map((cell, j) => {
                      const type = cellType(cell);
                      const isPlayer = playerPos[0] === i && playerPos[1] === j;
                      return (
                        <Box key={`${i}-${j}`} sx={{ width: 48, height: 48, border: '1px solid #bdb76b', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: isPlayer ? '#b7e4c7' : '#e6f9d5', m: 0.2, position: 'relative' }}>
                          {TOOL_ICONS[type]}
                          {isPlayer && <Box sx={{ position: 'absolute', top: 2, right: 2, fontSize: 16, color: '#388e3c' }}>🧑‍🌾</Box>}
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Paper>
              <Box sx={{ mt: 2 }}>
                <Typography>分數：<b>{score}</b></Typography>
                <Typography>步數：<b>{steps} / {ruleData.maxSteps}</b></Typography>
              </Box>
              {gameMsg && <Alert sx={{ mt: 2 }} severity={gameOver ? 'success' : 'info'}>{gameMsg}</Alert>}
              {gameOver && (
                <Button variant="contained" color="secondary" sx={{ mt: 2 }} onClick={handleRestart}>
                  再玩一次
                </Button>
              )}
            </Box>
            {/* 右側說明與規則 */}
            <Box sx={{ minWidth: 260, maxWidth: 320, p: 2, background: '#f5fbe7', borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>【遊戲說明】</Typography>
              <Typography variant="body2" sx={{ color: '#555', mb: 2 }}>
                使用 <b>鍵盤方向鍵</b> 控制探險家移動。<br/>
                目標：收集寶箱，並在最大步數內抵達終點。<br/>
                撞牆、超過最大步數都會影響分數。
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>【AI 演算法差異】</Typography>
              <Typography variant="body2" sx={{ color: '#555', mb: 2 }}>
                <b>Q-Learning</b>：追求最優路徑，可能選擇冒險但收益高的路線。<br/>
                <b>SARSA</b>：選擇穩健路徑，避免風險，適合有陷阱的地圖。<br/>
                在 AI 訓練頁面可選擇不同演算法進行訓練。
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>【本局規則】</Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                <b>寶箱獎勵</b>：{ruleData.bonusReward}<br/>
                <b>步數衰減</b>：{ruleData.stepDecay}<br/>
                <b>每步懲罰</b>：{ruleData.stepPenalty}<br/>
                <b>終點獎勵</b>：{ruleData.goalReward}<br/>
                <b>撞牆懲罰</b>：{ruleData.wallPenalty}<br/>
                <b>最大步數</b>：{ruleData.maxSteps}<br/>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default ManualPlay; 