import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Collapse, IconButton, Alert } from '@mui/material';
import Layout from '../Layout';
import { useNavigate } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const WELCOME_KEY = 'rlgames_welcome_shown';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [openWelcome, setOpenWelcome] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) {
      setOpenWelcome(true);
      localStorage.setItem(WELCOME_KEY, '1');
    }
  }, []);

  return (
    <Layout title="強化學習站-叢林世界">
      {/* 歡迎彈窗 */}
      <Dialog open={openWelcome} onClose={() => setOpenWelcome(false)}>
        <DialogTitle>歡迎來到強化學習叢林世界！</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            這是一個互動式強化學習教學平台。你可以：
          </Typography>
          <ul style={{ marginLeft: 20 }}>
            <li>自訂地圖與規則，設計專屬迷宮</li>
            <li>手動遊玩，體驗強化學習規則</li>
            <li>讓 AI 學習並自動挑戰地圖</li>
            <li>查看 AI 訓練分析（學習曲線、最優路徑等）</li>
            <li>調整參數，觀察不同 AI 行為</li>
          </ul>
          <Typography sx={{ mt: 2, color: 'primary.main', fontWeight: 500 }}>
            建議新手先從「手動遊玩」開始，熟悉規則後再進行 AI 訓練！
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWelcome(false)} variant="contained" color="primary">開始探索</Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 600 }}>
          歡迎來到 叢林世界！
        </Typography>
        {/* 新手快速上手說明區塊 */}
        <Box sx={{ width: '100%', maxWidth: 700, mb: 1 }}>
          <Alert
            icon={false}
            severity="info"
            sx={{ mb: 0, borderRadius: 2, boxShadow: 1, fontSize: 17, alignItems: 'center', background: '#e3f2fd' }}
            action={
              <IconButton color="primary" size="small" onClick={() => setShowGuide(v => !v)}>
                {showGuide ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            }
          >
            <b>新手快速上手</b>
          </Alert>
          <Collapse in={showGuide}>
            <Box sx={{ p: 2, border: '1px solid #90caf9', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#f7fbff' }}>
              <ol style={{ marginLeft: 20, fontSize: 16 }}>
                <li>點擊「<b>手動遊玩</b>」親自體驗規則</li>
                <li>進入「<b>地圖與規則</b>」設計自己的地圖</li>
                <li>到「<b>AI學習</b>」設定參數並訓練 AI</li>
                <li>在「<b>結果分析</b>」檢視學習曲線與路徑</li>
                <li>如需調整，請到「<b>設定</b>」頁面</li>
              </ol>
              <Typography sx={{ color: '#1976d2', fontWeight: 500, mt: 1 }}>
                建議順序：手動遊玩 → 地圖設計 → AI訓練 → 結果分析
              </Typography>
            </Box>
          </Collapse>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/maps')}>
            地圖與規則
          </Button>
          <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/manual')} sx={{ color: 'white' }}>
            開始遊戲
          </Button>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/ai')}>
            AI學習
          </Button>
          <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/analysis')} sx={{ color: 'white' }}>
            結果分析
          </Button>
          <Button variant="contained" color="primary" size="large" onClick={() => navigate('/settings')}>
            設定
          </Button>
        </Box>
        {/* 系統說明 */}
        <Box sx={{ mt: 4, maxWidth: 700 }}>
          <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
            系統說明
          </Typography>
          <Typography sx={{ fontSize: 18, color: '#555' }}>
            此網站是一個以叢林世界為主題的互動式強化學習教學網站。你可以：<br />
            1. 自訂地圖，設計屬於自己的叢林迷宮。<br />
            2. 手動操作探險家，體驗強化學習規則。<br />
            3. 讓 AI 學習並自動挑戰地圖，觀察學習過程。<br />
            4. 查看 AI 訓練分析，包含學習曲線、最優路徑等。<br />
            5. 調整系統參數，體驗不同 AI 行為。
          </Typography>
        </Box>
      </Box>
    </Layout>
  );
};

export default Home; 