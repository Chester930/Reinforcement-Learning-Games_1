import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';

// props: map: string[][], path: [number, number][], scoreList: number[]
interface AIAnalysisPathSimProps {
  map: string[][];
  path: [number, number][];
  scoreList?: number[];
}

const CELL_SIZE = 48;
const ICONS: Record<string, string> = {
  'S': '🧑‍🌾',
  'G': '🏁',
  'R': '🪙',
  'T': '🕳️',
  '1': '🪨',
  '0': '',
};

const AIAnalysisPathSim: React.FC<AIAnalysisPathSimProps> = ({ map, path, scoreList }) => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 驗證輸入數據
  const isValidData = map && map.length > 0 && path && path.length > 0;

  useEffect(() => {
    if (playing && step < path.length - 1) {
      timerRef.current = setTimeout(() => setStep(s => s + 1), 600);
    } else if (!playing && timerRef.current) {
      clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, step, path.length]);

  const handleStart = () => setPlaying(true);
  const handlePause = () => setPlaying(false);
  const handleReplay = () => { setStep(0); setPlaying(true); };

  // 取得目前位置
  const [curI, curJ] = path[step] || [0, 0];
  const curScore = scoreList ? scoreList[step] : undefined;

  // 如果數據無效，顯示錯誤信息
  if (!isValidData) {
    return (
      <Box sx={{ my: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>最佳路徑動畫模擬</Typography>
        <Box sx={{ 
          minHeight: 200, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#fff', 
          border: '1px solid #eee', 
          borderRadius: 4 
        }}>
          <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
            ⚠️ 路徑數據不完整，無法顯示動畫模擬
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>最佳路徑動畫模擬</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${map[0]?.length || 0}, ${CELL_SIZE}px)`, gap: 0, border: '2px solid #bdb76b', width: CELL_SIZE * (map[0]?.length || 0) }}>
        {map.map((row, i) =>
          row.map((cell, j) => {
            const isCurrent = i === curI && j === curJ;
            const isPath = path.some(([pi, pj], idx) => idx <= step && pi === i && pj === j);
            return (
              <Box key={`${i}-${j}`} sx={{
                width: CELL_SIZE, height: CELL_SIZE, border: '1px solid #bdb76b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                background: isCurrent ? '#ffe082' : isPath ? '#c8e6c9' : '#fff',
                transition: 'background 0.2s',
                position: 'relative',
              }}>
                <span>{ICONS[cell] || ''}</span>
                {isCurrent && <span style={{ position: 'absolute', right: 2, bottom: 2, fontSize: 12, color: '#333' }}>AI</span>}
              </Box>
            );
          })
        )}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="contained" color="primary" onClick={handleStart} disabled={playing || step === path.length - 1}>開始</Button>
        <Button variant="outlined" color="primary" onClick={handlePause} disabled={!playing}>暫停</Button>
        <Button variant="contained" color="secondary" onClick={handleReplay}>重播</Button>
        <Typography sx={{ ml: 2 }}>步數：{step + 1} / {path.length}</Typography>
        {curScore !== undefined && <Typography sx={{ ml: 2 }}>分數：{curScore}</Typography>}
      </Box>
    </Box>
  );
};

export default AIAnalysisPathSim; 