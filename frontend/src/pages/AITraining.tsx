import React, { useEffect, useState } from 'react';
import Layout from '../Layout';
import { Typography, Box, Button, MenuItem, Select, TextField, Paper, Alert, CircularProgress, FormControl, InputLabel, FormControlLabel, Switch } from '@mui/material';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const AITraining: React.FC = () => {
  // 狀態
  const [maps, setMaps] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [algorithm, setAlgorithm] = useState('q_learning');
  const [episodes, setEpisodes] = useState(100);
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.95);
  const [epsilon, setEpsilon] = useState(1.0);  // 更新為初始探索率
  const [seed, setSeed] = useState<number | null>(null);
  const [optimistic, setOptimistic] = useState(false);
  const [lambdaParam, setLambdaParam] = useState<number | null>(null);  // 新增 SARSA(λ) 的 λ 參數
  const [jobId, setJobId] = useState<string | null>(null);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobName, setJobName] = useState('');

  // 載入地圖與規則
  useEffect(() => {
    axios.get(`${API_BASE}/maps/maps`).then(res => setMaps(res.data));
    axios.get(`${API_BASE}/rules/rules`).then(res => setRules(res.data));
  }, []);

  // 當選擇規則時，自動填入規則中的強化學習參數
  useEffect(() => {
    if (selectedRule) {
      const rule = rules.find(r => r.id === selectedRule);
      if (rule) {
        setLearningRate(rule.learningRate || 0.1);
        setDiscountFactor(rule.discountFactor || 0.95);
        setEpsilon(rule.epsilon || 1.0);
        setSeed(rule.seed || null);
        setOptimistic(rule.optimistic || false);
      }
    }
  }, [selectedRule, rules]);

  // 啟動訓練
  const handleTrain = async () => {
    setLoading(true);
    setTrainStatus(null);
    setTrainError(null);
    setShowResult(false);
    setResult(null);
    setJobId(null);
    try {
      const requestData: any = {
        map_id: selectedMap,
        algorithm,
        episodes: Number(episodes),
        learning_rate: Number(learningRate),
        discount_factor: Number(discountFactor),
        epsilon: Number(epsilon),
        job_name: jobName,
      };
      
      // 新增可選參數
      if (seed !== null) {
        requestData.seed = seed;
      }
      if (optimistic) {
        requestData.optimistic = optimistic;
      }
      if (lambdaParam !== null) {
        requestData.lambda_param = lambdaParam;
      }
      // 新增: 傳遞 rule_id
      if (selectedRule) {
        requestData.rule_id = selectedRule;
      }
      
      const res = await axios.post(`${API_BASE}/train/train`, requestData);
      setJobId(res.data.job_id);
      setTrainStatus(res.data.status);
      pollStatus(res.data.job_id);
    } catch (e: any) {
      setTrainError(e?.response?.data?.detail || '訓練啟動失敗');
      setLoading(false);
    }
  };

  // 輪詢訓練狀態
  const pollStatus = (jobId: string) => {
    let interval: NodeJS.Timeout;
    const check = async () => {
      try {
        const res = await axios.get(`${API_BASE}/train/train/${jobId}/status`);
        setTrainStatus(res.data.status);
        if (res.data.status === 'completed') {
          setLoading(false);
          setShowResult(true);
          fetchResult(jobId);
          clearInterval(interval);
        } else if (res.data.status === 'failed') {
          setLoading(false);
          setTrainError('訓練失敗');
          clearInterval(interval);
        }
      } catch (e) {
        setLoading(false);
        setTrainError('查詢狀態失敗');
        clearInterval(interval);
      }
    };
    interval = setInterval(check, 1500);
    check();
  };

  // 取得訓練結果
  const fetchResult = async (jobId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/train/train/${jobId}/result`);
      setResult(res.data);
    } catch (e) {
      setResult(null);
    }
  };

  return (
    <Layout title="AI訓練">
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 600 }}>
          🧑‍💻 訓練你的AI探險家，挑戰最優路徑！
        </Typography>
        <Typography sx={{ fontSize: 17, color: '#555', mb: 2 }}>
          1. 請選擇地圖、規則與訓練參數（演算法、回合數、學習率等）。<br/>
          <span style={{ color: '#1976d2', fontWeight: 500 }}>💡 選擇規則後，系統會自動填入該規則的強化學習參數，您也可以手動調整。</span><br/>
          2. 點擊「開始訓練」後，系統會自動進行 AI 強化學習。<br/>
          3. 訓練完成後可查看 Q-Table 及訓練紀錄，並可於 AI 分析頁進行進一步分析。
        </Typography>
        <Paper sx={{ p: 3, background: '#f5fbe7', borderRadius: 3 }}>
          <TextField label="訓練名稱" value={jobName} onChange={e => setJobName(e.target.value)} sx={{ mb: 2, width: 300 }} required />
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>地圖</InputLabel>
              <Select value={selectedMap} label="地圖" onChange={e => setSelectedMap(e.target.value)}>
                {maps.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>規則</InputLabel>
              <Select value={selectedRule} label="規則" onChange={e => setSelectedRule(e.target.value)}>
                {rules.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>演算法</InputLabel>
              <Select value={algorithm} label="演算法" onChange={e => setAlgorithm(e.target.value)}>
                <MenuItem value="q_learning">Q-Learning</MenuItem>
                <MenuItem value="sarsa">SARSA</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField label="訓練回合數" type="number" value={episodes} onChange={e => setEpisodes(Number(e.target.value))} sx={{ width: 120 }} />
            <TextField label="學習率 (α)" type="number" value={learningRate} onChange={e => setLearningRate(Number(e.target.value))} sx={{ width: 120 }} inputProps={{ step: 0.01 }} />
            <TextField label="折扣因子 (γ)" type="number" value={discountFactor} onChange={e => setDiscountFactor(Number(e.target.value))} sx={{ width: 120 }} inputProps={{ step: 0.01 }} />
            <TextField label="初始探索率 (ε)" type="number" value={epsilon} onChange={e => setEpsilon(Number(e.target.value))} sx={{ width: 120 }} inputProps={{ step: 0.01 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField 
              label="隨機種子 (可選)" 
              type="number" 
              value={seed || ''} 
              onChange={e => setSeed(e.target.value ? Number(e.target.value) : null)} 
              sx={{ width: 150 }} 
              placeholder="留空為隨機"
            />
            <TextField 
              label="λ 參數 (SARSA)" 
              type="number" 
              value={lambdaParam || ''} 
              onChange={e => setLambdaParam(e.target.value ? Number(e.target.value) : null)} 
              sx={{ width: 150 }} 
              placeholder="留空為預設值"
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              disabled={algorithm !== 'sarsa'}
            />
            <Typography variant="caption" sx={{ color: '#888', ml: 1, maxWidth: 320, display: 'block' }}>
              λ 參數控制資格跡（eligibility traces）衰減速度，範圍 0~1。<br/>
              λ=0 為傳統 SARSA，λ=1 為回合更新。<br/>
              較高值（如 0.8~0.95）可加速學習收斂，適合稀疏獎勵環境。
            </Typography>
            <FormControlLabel
              control={<Switch checked={optimistic} onChange={e => setOptimistic(e.target.checked)} />}
              label="樂觀初始化"
            />
          </Box>
          <Button variant="contained" color="primary" onClick={handleTrain} disabled={!selectedMap || !selectedRule || !jobName || loading}>
            {loading ? '訓練中...' : '開始訓練'}
          </Button>
          {trainError && <Alert severity="error" sx={{ mt: 2 }}>{trainError}</Alert>}
          {loading && <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={24} /> 訓練進行中，請稍候...</Box>}
          {trainStatus && !loading && <Alert severity={trainStatus === 'completed' ? 'success' : 'info'} sx={{ mt: 2 }}>訓練狀態：{trainStatus}</Alert>}
          {/* 參數說明區塊 */}
          <Box sx={{ mt: 3, p: 2, background: '#fffbe7', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>【參數說明】</Typography>
            <Typography variant="body2" sx={{ color: '#555' }}>
              <b>演算法</b>：選擇 Q-Learning 或 SARSA，皆為常見強化學習方法。<br/>
              <b>訓練回合數</b>：AI 學習的次數，越多回合學習越充分，但訓練時間也會增加。建議值：100~1000。<br/>
              <b>學習率 (α)</b>：新知識覆蓋舊知識的速度，0~1。較高值學習快但可能不穩定，較低值學習慢但穩定。建議值：0.1~0.5。<br/>
              <b>折扣因子 (γ)</b>：未來獎勵的重要性，0~1。越接近 1 越重視長遠獎勵，越接近 0 越重視即時獎勵。建議值：0.9~0.99。<br/>
              <b>初始探索率 (ε)</b>：AI 隨機探索的初始機率，會隨訓練逐漸衰減。較高值探索更多但學習慢，較低值利用已知知識但可能陷入局部最優。建議值：0.5~1.0。<br/>
              <b>隨機種子</b>：設定後可重現相同結果，適合實驗比較和調試。留空為隨機，每次訓練結果不同。<br/>
              <b>樂觀初始化</b>：將 Q-Table 初始值設為較高值，鼓勵探索未知狀態，可能加速收斂但需要更多訓練回合。<br/>
              <b>λ 參數 (SARSA)</b>：SARSA(λ) 算法的核心參數，控制資格跡衰減速度。λ=0 為傳統 SARSA，λ=1 為回合更新，0.8~0.95 為推薦值。較高值能更有效地利用獎勵信號，加速學習收斂。
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【Q-Learning 與 SARSA 差異】</Typography>
            <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
              <b>Q-Learning</b>：離線型（off-policy），學習理論上最優策略，較積極探索，適合追求最短路徑。<br/>
              <b>SARSA</b>：在線型（on-policy），學習實際執行過的策略，較保守，適合風險較高或需穩健表現的情境。<br/>
              <b>SARSA(λ)</b>：SARSA 的改進版本，使用資格跡（eligibility traces）實現多步更新。λ 參數控制資格跡衰減速度：λ=0 為單步更新，λ=1 為回合更新，0~1 之間為多步更新。較高的 λ 值能更有效地利用獎勵信號，加速學習。<br/>
              <b>λ 參數建議值</b>：0.8~0.95，較高值適合稀疏獎勵環境，較低值適合密集獎勵環境。<br/>
              <b>選擇建議：</b> 一般可先用 Q-Learning，若希望 AI 行為更穩健可選 SARSA，若希望加速學習可選 SARSA(λ)。
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【演算法特定參數建議】</Typography>
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
              <b>理論差異</b>：Q-Learning 學習最優 Q 值，SARSA 學習實際執行的 Q 值。
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 2, mb: 1 }}>【參數調優建議】</Typography>
            <Typography variant="body2" sx={{ color: '#555' }}>
              <b>初學者</b>：使用預設值開始，觀察 AI 表現。<br/>
              <b>進階用戶</b>：根據地圖複雜度調整參數。簡單地圖可用較低學習率和探索率，複雜地圖需要較高值。<br/>
              <b>實驗比較</b>：設定隨機種子，保持其他參數不變，比較不同演算法效果。<br/>
              <b>性能優化</b>：樂觀初始化適合複雜環境，但需要更多訓練回合。
            </Typography>
          </Box>
        </Paper>
        {showResult && result && (
          <Paper sx={{ p: 3, background: '#fffbe7', borderRadius: 3, mt: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>訓練結果</Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>Q-Table (csv):</Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', background: '#f5fbe7', p: 1, borderRadius: 1, fontSize: 13, fontFamily: 'monospace' }}>
              <pre style={{ margin: 0 }}>{result['q_table.csv']}</pre>
            </Box>
            <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>訓練紀錄 (log.csv):</Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', background: '#f5fbe7', p: 1, borderRadius: 1, fontSize: 13, fontFamily: 'monospace' }}>
              <pre style={{ margin: 0 }}>{result['log.csv']}</pre>
            </Box>
          </Paper>
        )}
      </Box>
    </Layout>
  );
};

export default AITraining; 