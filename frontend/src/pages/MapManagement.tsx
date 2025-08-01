import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Tabs, Tab, Paper, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, FormControlLabel, Switch, FormControl, InputLabel, Input } from '@mui/material';
import Layout from '../Layout';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const API_BASE = 'http://localhost:8000';

// 拖拉式地圖編輯器元件（簡化版）
const TOOL_ICONS = [
  { type: 'start', icon: <span style={{ fontSize: 32 }}>🧑‍🌾</span>, label: '起點' },
  { type: 'goal', icon: <span style={{ fontSize: 32 }}>🏁</span>, label: '終點' },
  { type: 'bonus', icon: <span style={{ fontSize: 32 }}>🪙</span>, label: '寶箱' },
  { type: 'trap', icon: <span style={{ fontSize: 32 }}>🕳️</span>, label: '陷阱' },
  { type: 'obstacle', icon: <span style={{ fontSize: 32 }}>🪨</span>, label: '障礙物' },
];

// 型別定義
interface MapCell { type: string; value?: number; }
interface DragMapEditorProps {
  mapData: MapCell[][];
  setMapData: React.Dispatch<React.SetStateAction<MapCell[][]>>;
  mapName: string;
  setMapName: React.Dispatch<React.SetStateAction<string>>;
  size: [number, number];
  setSize: React.Dispatch<React.SetStateAction<[number, number]>>;
}

function DragMapEditor({
  mapData,
  setMapData,
  mapName,
  setMapName,
  size,
  setSize,
}: DragMapEditorProps) {
  const [selectedTool, setSelectedTool] = useState<string>('');
  // 初始化地圖
  useEffect(() => {
    if (!mapData.length || mapData.length !== size[0] || mapData[0].length !== size[1]) {
      const newMap = Array.from({ length: size[0] }, () => Array.from({ length: size[1] }, () => ({ type: 'empty' })));
      setMapData(newMap);
    }
    // eslint-disable-next-line
  }, [size[0], size[1]]);
  // 點擊格子放置
  const handleCellClick = (row: number, col: number) => {
    if (!selectedTool) return;
    const newMap = mapData.map((r: MapCell[]) => r.slice());
    newMap[row][col] = { type: selectedTool };
    setMapData(newMap);
    setSelectedTool('');
  };
  // 拖拉放置（支援工具列與地圖內互拖）
  const handleDrop = (row: number, col: number, e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    const fromRow = e.dataTransfer.getData('fromRow');
    const fromCol = e.dataTransfer.getData('fromCol');
    const newMap = mapData.map((r: MapCell[]) => r.slice());
    if (fromRow && fromCol) {
      // 地圖內互拖
      const fr = parseInt(fromRow, 10);
      const fc = parseInt(fromCol, 10);
      const temp = newMap[row][col];
      newMap[row][col] = newMap[fr][fc];
      newMap[fr][fc] = temp;
    } else if (type) {
      // 工具列拖進來
      newMap[row][col] = { type };
    }
    setMapData(newMap);
  };

  // 新增：處理拖拽到地圖外的刪除功能
  const handleMapAreaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromRow = e.dataTransfer.getData('fromRow');
    const fromCol = e.dataTransfer.getData('fromCol');
    
    if (fromRow && fromCol) {
      // 從地圖內拖拽到地圖外，刪除該元件
      const fr = parseInt(fromRow, 10);
      const fc = parseInt(fromCol, 10);
      const newMap = mapData.map((r: MapCell[]) => r.slice());
      newMap[fr][fc] = { type: 'empty' };
      setMapData(newMap);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
      {/* 左側工具列 */}
      <Box sx={{ minWidth: 280, maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {/* <TextField label="地圖名稱" value={mapName} onChange={e => setMapName(e.target.value)} sx={{ width: 220, mb: 2 }} /> */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, width: '100%', justifyContent: 'center' }}>
          <FormControl sx={{ width: 120 }}>
            <InputLabel htmlFor="rows-input">行數</InputLabel>
            <Input
              id="rows-input"
              type="number"
              value={size[0]}
              onChange={e => setSize([Number(e.target.value), size[1]])}
            />
          </FormControl>
          <FormControl sx={{ width: 120 }}>
            <InputLabel htmlFor="cols-input">列數</InputLabel>
            <Input
              id="cols-input"
              type="number"
              value={size[1]}
              onChange={e => setSize([size[0], Number(e.target.value)])}
            />
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {TOOL_ICONS.map(tool => (
            <Box key={tool.type} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'grab' }}
              draggable
              onDragStart={e => e.dataTransfer.setData('type', tool.type)}
              onClick={() => setSelectedTool(tool.type)}
            >
              {tool.icon}
              <Typography variant="caption">{tool.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* 右側地圖格子 */}
      <Paper sx={{ p: 2, background: '#f5fbe7', minWidth: 48 * size[1] + 16, maxHeight: '60vh', overflow: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${size[1]}, 48px)`, gap: 0 }}>
          {mapData.map((row: MapCell[], rowIdx: number) =>
            row.map((cell: MapCell, colIdx: number) => {
              const isDraggable = cell.type !== 'empty';
              return (
                <Box key={`${rowIdx}-${colIdx}`} sx={{ width: 48, height: 48, border: '1px solid #bdb76b', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: '#e6f9d5', cursor: 'pointer', m: 0.2 }}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  onDrop={e => handleDrop(rowIdx, colIdx, e)}
                  onDragOver={handleDragOver}
                >
                  {isDraggable ? (
                    <Box
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('type', cell.type);
                        e.dataTransfer.setData('fromRow', rowIdx.toString());
                        e.dataTransfer.setData('fromCol', colIdx.toString());
                      }}
                      sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {TOOL_ICONS.find(t => t.type === cell.type)?.icon}
                    </Box>
                  ) : TOOL_ICONS.find(t => t.type === cell.type)?.icon}
                </Box>
              );
            })
          )}
        </Box>
        {/* 新增：地圖外刪除區域 */}
        <Box 
          sx={{ 
            mt: 2, 
            p: 2, 
            border: '2px dashed #ff6b6b', 
            borderRadius: 2, 
            background: '#fff5f5', 
            textAlign: 'center',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: '#ffe6e6',
              borderColor: '#ff4757'
            }
          }}
          onDrop={handleMapAreaDrop}
          onDragOver={handleDragOver}
        >
          <Typography variant="body2" sx={{ color: '#ff6b6b', fontWeight: 600 }}>
            🗑️ 拖拽元件到此處刪除
          </Typography>
          <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 0.5 }}>
            將地圖內的元件拖拽到此區域即可刪除
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

// 規則型別
interface RuleForm {
  id: string;
  name: string;
  // 遊戲規則參數
  bonusReward: number;
  stepDecay: number;
  stepPenalty: number;
  goalReward: number;
  wallPenalty: number;
  maxSteps: number;
  // 強化學習參數
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  seed: number | null;
  optimistic: boolean;
}

const MapManagement: React.FC = () => {
  const [tab, setTab] = useState(0);
  // 地圖管理狀態
  const [maps, setMaps] = useState<any[]>([]);
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [isEditMap, setIsEditMap] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [mapForm, setMapForm] = useState({ name: '', size: [6, 6] });

  // 規則管理狀態
  const [rules, setRules] = useState<any[]>([]);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleForm>({
    id: '',
    name: '',
    bonusReward: 20,
    stepDecay: 0.99,
    stepPenalty: 0,
    goalReward: 100,
    wallPenalty: -5,
    maxSteps: 100,
    learningRate: 0.1,
    discountFactor: 0.95,
    epsilon: 1.0,
    seed: null,
    optimistic: false,
  });
  const [isEditRule, setIsEditRule] = useState(false);

  // 地圖編輯器狀態
  const [mapData, setMapData] = useState<MapCell[][]>([]);
  const [mapName, setMapName] = useState('');
  const [mapSize, setMapSize] = useState<[number, number]>([6, 6]);

  // 預覽展開狀態
  const [previewMapId, setPreviewMapId] = useState<string | null>(null);
  const [previewMapData, setPreviewMapData] = useState<any>(null);

  // Tab 切換
  const handleTabChange = (_: any, newValue: number) => setTab(newValue);

  // 載入地圖列表
  useEffect(() => {
    if (tab === 0) fetchMaps();
    if (tab === 1) fetchRules();
    // eslint-disable-next-line
  }, [tab]);

  const fetchMaps = async () => {
    const res = await axios.get(`${API_BASE}/maps/maps`);
    setMaps(res.data);
  };

  // 創建地圖
  const handleCreateMap = () => {
    setMapForm({ name: '', size: [6, 6] });
    setMapName('');
    setMapSize([6, 6]);
    setMapData([]);
    setIsEditMap(false);
    setEditingMapId(null);
    setShowMapDialog(true);
  };

  // 編輯地圖
  const handleEditMap = async (map: any) => {
    const res = await axios.get(`${API_BASE}/maps/maps/${map.id}`);
    setMapForm({ name: res.data.name, size: res.data.size });
    setMapName(res.data.name);
    setMapSize(res.data.size);
    setMapData(res.data.map.map((row: string[]) => row.map((cell: string) => {
      switch (cell) {
        case 'S': return { type: 'start' };
        case 'G': return { type: 'goal' };
        case 'R': return { type: 'bonus' };
        case 'T': return { type: 'trap' };
        case '1': return { type: 'obstacle' };
        default: return { type: 'empty' };
      }
    })));
    setIsEditMap(true);
    setEditingMapId(map.id);
    setShowMapDialog(true);
  };

  // 地圖儲存
  const handleSaveMap = async () => {
    // 轉換為 API 格式
    const numRows = mapSize[0];
    const numCols = mapSize[1];
    let start: [number, number] = [0, 0];
    let goal: [number, number] = [0, 0];
    const obstacles: [number, number][] = [];
    const bonuses: { [key: string]: number } = {};
    const traps: { [key: string]: number } = {};
    const mapGrid: string[][] = [];
    for (let i = 0; i < numRows; i++) {
      mapGrid[i] = [];
      for (let j = 0; j < numCols; j++) {
        const cell = mapData[i]?.[j] || { type: 'empty' };
        switch (cell.type) {
          case 'start': start = [i, j]; mapGrid[i][j] = 'S'; break;
          case 'goal': goal = [i, j]; mapGrid[i][j] = 'G'; break;
          case 'bonus': bonuses[`${i},${j}`] = 20; mapGrid[i][j] = 'R'; break;
          case 'trap': traps[`${i},${j}`] = -20; mapGrid[i][j] = 'T'; break;
          case 'obstacle': obstacles.push([i, j]); mapGrid[i][j] = '1'; break;
          default: mapGrid[i][j] = '0';
        }
      }
    }
    const apiData = {
      name: mapName,
      size: [numRows, numCols],
      start,
      goal,
      obstacles,
      bonuses,
      traps,
      map: mapGrid
    };
    if (isEditMap && editingMapId) {
      await axios.put(`${API_BASE}/maps/maps/${editingMapId}`, apiData);
    } else {
      await axios.post(`${API_BASE}/maps/maps/json`, apiData);
    }
    setShowMapDialog(false);
    fetchMaps();
  };

  // 刪除地圖
  const handleDeleteMap = async () => {
    if (editingMapId) {
      await axios.delete(`${API_BASE}/maps/maps/${editingMapId}`);
      setShowMapDialog(false);
      fetchMaps();
    }
  };

  // 載入規則列表
  useEffect(() => {
    if (tab === 1) fetchRules();
    // eslint-disable-next-line
  }, [tab]);

  const fetchRules = async () => {
    const res = await axios.get(`${API_BASE}/rules/rules`);
    setRules(res.data);
  };

  // 建立/編輯規則表單處理
  const handleRuleChange = (name: string, value: any) => {
    setRuleForm({
      ...ruleForm,
      [name]: value
    });
  };

  // 新增規則
  const handleCreateRule = async () => {
    await axios.post(`${API_BASE}/rules/rules`, ruleForm);
    setShowRuleDialog(false);
    setRuleForm({
      id: '',
      name: '',
      bonusReward: 20,
      stepDecay: 0.99,
      stepPenalty: 0,
      goalReward: 100,
      wallPenalty: -5,
      maxSteps: 100,
      learningRate: 0.1,
      discountFactor: 0.95,
      epsilon: 1.0,
      seed: null,
      optimistic: false,
    });
    fetchRules();
  };

  // 編輯規則
  const handleEditRule = (rule: any) => {
    setRuleForm({
      id: rule.id,
      name: rule.name,
      bonusReward: rule.bonusReward ?? 20,
      stepDecay: rule.stepDecay ?? 0.99,
      stepPenalty: rule.stepPenalty ?? 0,
      goalReward: rule.goalReward ?? 100,
      wallPenalty: rule.wallPenalty ?? -5,
      maxSteps: rule.maxSteps ?? 100,
      learningRate: rule.learningRate ?? 0.1,
      discountFactor: rule.discountFactor ?? 0.95,
      epsilon: rule.epsilon ?? 1.0,
      seed: rule.seed ?? null,
      optimistic: rule.optimistic ?? false,
    });
    setIsEditRule(true);
    setShowRuleDialog(true);
  };
  const handleUpdateRule = async () => {
    await axios.put(`${API_BASE}/rules/rules/${ruleForm.id}`, ruleForm);
    setShowRuleDialog(false);
    setIsEditRule(false);
    setRuleForm({
      id: '',
      name: '',
      bonusReward: 20,
      stepDecay: 0.99,
      stepPenalty: 0,
      goalReward: 100,
      wallPenalty: -5,
      maxSteps: 100,
      learningRate: 0.1,
      discountFactor: 0.95,
      epsilon: 1.0,
      seed: null,
      optimistic: false,
    });
    fetchRules();
  };

  // 刪除規則
  const handleDeleteRule = async (id: string) => {
    await axios.delete(`${API_BASE}/rules/rules/${id}`);
    fetchRules();
  };

  // 展開/收合預覽
  const handleTogglePreview = async (map: any) => {
    if (previewMapId === map.id) {
      setPreviewMapId(null);
      setPreviewMapData(null);
    } else {
      const res = await axios.get(`${API_BASE}/maps/maps/${map.id}`);
      setPreviewMapId(map.id);
      setPreviewMapData(res.data.map);
    }
  };

  // 小地圖預覽元件
  function MiniMapPreview({ map }: { map: string[][] }) {
    if (!map) return null;
    return (
      <Paper sx={{ p: 1, mt: 1, display: 'inline-block', background: '#f5fbe7' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${map[0]?.length || 0}, 24px)`, gap: 0 }}>
          {map.map((row: string[], rowIdx: number) =>
            row.map((cell: string, colIdx: number) => {
              let icon = null;
              switch (cell) {
                case 'S': icon = <span style={{ fontSize: 18 }}>🧑‍🌾</span>; break;
                case 'G': icon = <span style={{ fontSize: 18 }}>🏁</span>; break;
                case 'R': icon = <span style={{ fontSize: 18 }}>🪙</span>; break;
                case 'T': icon = <span style={{ fontSize: 18 }}>🕳️</span>; break;
                case '1': icon = <span style={{ fontSize: 18 }}>🪨</span>; break;
                default: icon = null;
              }
              return (
                <Box key={`${rowIdx}-${colIdx}`} sx={{ width: 24, height: 24, border: '1px solid #bdb76b', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: '#e6f9d5', m: 0.1 }}>
                  {icon}
                </Box>
              );
            })
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Layout title="地圖與規則管理">
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="我的地圖" />
        <Tab label="我的規則" />
      </Tabs>
      {/* 我的地圖 */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">地圖列表</Typography>
            <Button variant="contained" color="primary" onClick={handleCreateMap}>
              創建地圖
            </Button>
          </Box>
          <Paper sx={{ mb: 2 }}>
            <List>
              {maps.map(map => (
                <React.Fragment key={map.id}>
                  <ListItem secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton onClick={() => handleTogglePreview(map)}>
                        {previewMapId === map.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Button variant="outlined" size="small" onClick={() => handleEditMap(map)} sx={{ ml: 1 }}>
                        編輯
                      </Button>
                    </Box>
                  }>
                    <ListItemText primary={map.name} secondary={`尺寸：${map.size[0]}x${map.size[1]}`}/>
                  </ListItem>
                  {previewMapId === map.id && (
                    <Box sx={{ pl: 6 }}>
                      <MiniMapPreview map={previewMapData} />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </List>
          </Paper>
          {/* 地圖編輯器 Dialog */}
          <Dialog open={showMapDialog} onClose={() => setShowMapDialog(false)} maxWidth="lg" fullWidth>
            <DialogTitle>{isEditMap ? '編輯地圖' : '創建地圖'}</DialogTitle>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <TextField label="地圖名稱" value={mapName} onChange={e => setMapName(e.target.value)} sx={{ width: 320, mb: 2, mt: 1, zIndex: 2, background: '#fff', borderRadius: 2 }} />
              <DialogContent sx={{ overflow: 'auto', maxHeight: '70vh', minWidth: 'unset', maxWidth: 'fit-content', p: 0, pt: 2 }}>
                <DragMapEditor
                  mapData={mapData}
                  setMapData={setMapData}
                  mapName={mapName}
                  setMapName={setMapName}
                  size={mapSize}
                  setSize={setMapSize}
                />
              </DialogContent>
            </Box>
            <DialogActions>
              {isEditMap && (
                <Button color="error" onClick={handleDeleteMap}>刪除</Button>
              )}
              <Button onClick={() => setShowMapDialog(false)}>取消</Button>
              <Button variant="contained" onClick={handleSaveMap}>{isEditMap ? '儲存' : '建立'}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      {/* 我的規則 */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">規則列表</Typography>
            <Button variant="contained" color="secondary" onClick={() => { setShowRuleDialog(true); setIsEditRule(false); setRuleForm({
              id: '',
              name: '',
              bonusReward: 20,
              stepDecay: 0.99,
              stepPenalty: 0,
              goalReward: 100,
              wallPenalty: -5,
              maxSteps: 100,
              learningRate: 0.1,
              discountFactor: 0.95,
              epsilon: 1.0,
              seed: null,
              optimistic: false,
            }); }}>
              建立規則
            </Button>
          </Box>
          <Paper sx={{ mb: 2 }}>
            <List>
              {rules.map(rule => (
                <ListItem key={rule.id} secondaryAction={
                  <Box>
                    <Button variant="outlined" size="small" sx={{ mr: 1 }} onClick={() => handleEditRule(rule)}>
                      編輯
                    </Button>
                    <IconButton color="error" onClick={() => handleDeleteRule(rule.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }>
                  <ListItemText 
                    primary={rule.name} 
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          🎮 遊戲：獎勵 {rule.goalReward || 100}，步數衰減 {rule.stepDecay || 0.99}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          🤖 AI：學習率 {rule.learningRate || 0.1}，折扣因子 {rule.discountFactor || 0.95}，探索率 {rule.epsilon || 1.0}
                          {rule.seed && `，種子 ${rule.seed}`}
                          {rule.optimistic && '，樂觀初始化'}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          {/* 規則建立/編輯 Dialog */}
          <Dialog open={showRuleDialog} onClose={() => setShowRuleDialog(false)} maxWidth="md" fullWidth>
            <DialogTitle>規則設定</DialogTitle>
            <DialogContent sx={{ minWidth: 600 }}>
              <TextField
                label="規則名稱"
                value={ruleForm.name}
                onChange={(e) => handleRuleChange('name', e.target.value)}
                fullWidth
                sx={{ mb: 2, minWidth: '300px' }}
              />
              
              {/* 遊戲規則參數 */}
              <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>🎮 遊戲規則參數</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <TextField label="寶箱獎勵" type="number" value={ruleForm.bonusReward} onChange={(e) => handleRuleChange('bonusReward', Number(e.target.value))} />
                <TextField label="步數衰減" type="number" value={ruleForm.stepDecay} onChange={(e) => handleRuleChange('stepDecay', Number(e.target.value))} inputProps={{ step: 0.01 }} />
                <TextField label="每步懲罰" type="number" value={ruleForm.stepPenalty} onChange={(e) => handleRuleChange('stepPenalty', Number(e.target.value))} inputProps={{ step: 0.1 }} />
                <TextField label="終點獎勵" type="number" value={ruleForm.goalReward} onChange={(e) => handleRuleChange('goalReward', Number(e.target.value))} />
                <TextField label="撞牆懲罰" type="number" value={ruleForm.wallPenalty} onChange={(e) => handleRuleChange('wallPenalty', Number(e.target.value))} />
                <TextField label="最大步數" type="number" value={ruleForm.maxSteps} onChange={(e) => handleRuleChange('maxSteps', Number(e.target.value))} />
              </Box>

              {/* 強化學習參數 */}
              <Typography variant="h6" sx={{ mt: 3, mb: 1, color: 'secondary.main' }}>🤖 強化學習參數</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                <TextField 
                  label="學習率 (α)" 
                  type="number" 
                  value={ruleForm.learningRate} 
                  onChange={(e) => handleRuleChange('learningRate', Number(e.target.value))}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  helperText="新知識覆蓋舊知識的速度"
                />
                <TextField 
                  label="折扣因子 (γ)" 
                  type="number" 
                  value={ruleForm.discountFactor} 
                  onChange={(e) => handleRuleChange('discountFactor', Number(e.target.value))}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  helperText="未來獎勵的重要性"
                />
                <TextField 
                  label="初始探索率 (ε)" 
                  type="number" 
                  value={ruleForm.epsilon} 
                  onChange={(e) => handleRuleChange('epsilon', Number(e.target.value))}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  helperText="隨機探索的初始機率"
                />
                <TextField 
                  label="隨機種子 (可選)" 
                  type="number" 
                  value={ruleForm.seed || ''} 
                  onChange={(e) => handleRuleChange('seed', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="留空為隨機"
                  helperText="設定後可重現相同結果"
                />
              </Box>
              
              <FormControlLabel
                control={
                  <Switch 
                    checked={ruleForm.optimistic} 
                    onChange={(e) => handleRuleChange('optimistic', e.target.checked)}
                  />
                }
                label="樂觀初始化"
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                樂觀初始化：將 Q-Table 初始值設為較高值，可能加速收斂
              </Typography>

              {/* 參數說明 */}
              <Box sx={{ mt: 3, p: 2, background: '#f5fbe7', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>【遊戲規則參數說明】</Typography>
                <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
                  <b>寶箱獎勵</b>：每獲得一個寶箱可加多少分數。建議值：10~50。<br/>
                  <b>步數衰減</b>：每走一步，分數會乘上此衰減值（0~1）。建議值：0.95~0.99。<br/>
                  <b>每步懲罰</b>：每走一步會扣多少分數。建議值：0~-2。<br/>
                  <b>終點獎勵</b>：抵達終點時加多少分數。建議值：50~200。<br/>
                  <b>撞牆懲罰</b>：嘗試走到牆或障礙物時扣多少分數。建議值：-1~-10。<br/>
                  <b>最大步數</b>：若遊戲步數達到最大步數，分數將歸零。建議值：50~200。
                </Typography>
                
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【強化學習參數說明】</Typography>
                <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
                  <b>學習率 (α)</b>：新知識覆蓋舊知識的速度，0~1。較高值學習快但可能不穩定，較低值學習慢但穩定。建議值：0.1~0.5。<br/>
                  <b>折扣因子 (γ)</b>：未來獎勵的重要性，0~1。越接近 1 越重視長遠獎勵，越接近 0 越重視即時獎勵。建議值：0.9~0.99。<br/>
                  <b>初始探索率 (ε)</b>：AI 隨機探索的初始機率，會隨訓練逐漸衰減。較高值探索更多但學習慢，較低值利用已知知識但可能陷入局部最優。建議值：0.5~1.0。<br/>
                  <b>隨機種子</b>：設定後可重現相同結果，適合實驗比較和調試。留空為隨機，每次訓練結果不同。<br/>
                  <b>樂觀初始化</b>：將 Q-Table 初始值設為較高值，鼓勵探索未知狀態，可能加速收斂但需要更多訓練回合。
                </Typography>
                
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【參數調優建議】</Typography>
                <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
                  <b>初學者</b>：使用預設值開始，觀察 AI 表現。<br/>
                  <b>進階用戶</b>：根據地圖複雜度調整參數。簡單地圖可用較低學習率和探索率，複雜地圖需要較高值。<br/>
                  <b>實驗比較</b>：設定隨機種子，保持其他參數不變，比較不同演算法效果。<br/>
                  <b>性能優化</b>：樂觀初始化適合複雜環境，但需要更多訓練回合。
                </Typography>
                
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【Q-Learning vs SARSA 設定差異】</Typography>
                <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
                  <b>Q-Learning（離線型）</b>：<br/>
                  • 學習率 (α)：建議 0.1~0.3，較保守設定，避免過度學習<br/>
                  • 折扣因子 (γ)：建議 0.95~0.99，重視長遠獎勵<br/>
                  • 初始探索率 (ε)：建議 0.8~1.0，積極探索未知狀態<br/>
                  • 樂觀初始化：推薦開啟，加速探索<br/>
                  <br/>
                  <b>SARSA（在線型）</b>：<br/>
                  • 學習率 (α)：建議 0.05~0.2，更保守，避免策略震盪<br/>
                  • 折扣因子 (γ)：建議 0.9~0.95，平衡即時與長遠獎勵<br/>
                  • 初始探索率 (ε)：建議 0.5~0.8，適度探索，避免過度冒險<br/>
                  • 樂觀初始化：可選，但效果不如 Q-Learning 明顯<br/>
                  <br/>
                  <b>選擇建議</b>：Q-Learning 適合追求最優解，SARSA 適合穩健表現。
                </Typography>
                
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【分數計算公式】</Typography>
                <Typography variant="body2" sx={{ color: '#555' }}>
                  總分 = 終點獎勵 + (寶箱數 × 寶箱獎勵) + (步數 × 每步懲罰) + 撞牆懲罰<br/>
                  每步分數會乘上步數衰減（如 0.99<sup>步數</sup>）。<br/>
                  若遊戲步數達到最大步數，分數將歸零。
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowRuleDialog(false)}>取消</Button>
              {isEditRule ? (
                <Button variant="contained" onClick={handleUpdateRule}>儲存</Button>
              ) : (
                <Button variant="contained" onClick={handleCreateRule}>建立</Button>
              )}
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Layout>
  );
};

export default MapManagement; 