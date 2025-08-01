import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../Layout';
import { Typography, Box, Paper, Select, MenuItem, Button, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import AIAnalysisPathSim from './AIAnalysisPathSim';
import LearningCurveChart from './LearningCurveChart';

// 簡單的 markdown 轉 HTML 函數
const markdownToHtml = (markdown: string): string => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_BASE = 'http://localhost:8000';

const AIAnalysis: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [curveData, setCurveData] = useState<{rewards:number[];steps:number[]}|null>(null);
  const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
  const [pathUrl, setPathUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'html' | 'md' | 'none'>('none');
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReanalyze, setShowReanalyze] = useState(false);
  const [mapData, setMapData] = useState<string[][] | null>(null);
  const [optimalPath, setOptimalPath] = useState<[number, number][] | null>(null);
  const [verifyResult, setVerifyResult] = useState<{verify_ok: boolean, verify_output: string} | null>(null);
  const [jobConfig, setJobConfig] = useState<any>(null);
  const [ruleData, setRuleData] = useState<any>(null);
  const [mapDataInfo, setMapDataInfo] = useState<any>(null);
  const [extractedChartData, setExtractedChartData] = useState<{ rewards: number[]; steps: number[] } | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!selectedJob) return;
    setReportLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/analysis/${selectedJob}/analyze-and-save`, {
        user_prompt: '請分析這個強化學習訓練結果'
      });
      
      if (response.data && (response.data.md || response.data.html)) {
        // 優先用 html，否則用 markdown 轉 html
        let htmlContent = '';
        if (response.data.html) {
          htmlContent = response.data.html;
        } else if (response.data.md) {
          htmlContent = markdownToHtml(response.data.md);
        }
        setReport(htmlContent);
        setShowReanalyze(true);
        
        // 分析成功後，重新載入所有數據
        setTimeout(() => {
          // 觸發重新載入數據
          const currentJob = selectedJob;
          setSelectedJob('');
          setTimeout(() => setSelectedJob(currentJob), 1000);
        }, 1000);
      } else {
        setError('分析完成但沒有返回內容');
      }
    } catch (err: any) {
      console.error('分析錯誤:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          '分析失敗';
      setError(`分析失敗: ${errorMessage}`);
    } finally {
      setReportLoading(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    axios.get(`${API_BASE}/train/train/jobs`).then(res => setJobs(res.data));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoading(true);
    // 強制清空所有狀態，避免快取
    setCurveData(null); 
    setHeatmapUrl(''); 
    setPathUrl(''); 
    setReport(null); 
    setError(null);
    setReportType('none');
    setShowReanalyze(false);
    setMapData(null); 
    setOptimalPath(null);
    setVerifyResult(null);
    setJobConfig(null);
    setRuleData(null);
    setMapDataInfo(null);
    setExtractedChartData(null);
    
    const info = jobs.find(j => j.job_id === selectedJob);
    setJobInfo(info);

    const loadData = async () => {
      if (!selectedJob) return;

      setLoading(true);
      // 清空狀態，避免殘影
      setReport(null);
      setReportType('none');
      setHeatmapUrl('');
      setCurveData(null);
      setPathUrl('');
      setJobConfig(null);
      setRuleData(null);
      setMapDataInfo(null);
      setExtractedChartData(null);

      try {
        // 並行載入分析數據
        const [learningRes, heatmapRes] = await Promise.all([
          axios.get(`${API_BASE}/analysis/${selectedJob}/curve`).catch(() => null),
          axios.get(`${API_BASE}/analysis/${selectedJob}/heatmap`).catch(() => null),
        ]);

        if (learningRes?.data) setCurveData(learningRes.data);
        if (heatmapRes?.data?.heatmap_png_base64) {
          setHeatmapUrl(`data:image/png;base64,${heatmapRes.data.heatmap_png_base64}`);
        }

        // 載入 optimal path
        try {
          const pathRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/optimal-path`);
          if (pathRes.data?.optimal_path_png_base64) {
            setPathUrl(`data:image/png;base64,${pathRes.data.optimal_path_png_base64}`);
          }
          // 新增：如果有 path，設置 optimalPath 狀態
          if (pathRes.data?.optimal_path) {
            setOptimalPath(pathRes.data.optimal_path);
          }
        } catch (error) {
          console.error('載入最佳路徑失敗:', error);
        }

        // 載入 job 配置 (必須先載入，其他資料會依賴它)
        let configData = null;
        try {
          const configRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/config.json`);
          if (configRes.data) {
            configData = configRes.data;
            setJobConfig(configData);
            console.log('✅ 成功載入 job 配置:', configData);
          }
        } catch (error) {
          console.error('❌ 載入 job 配置失敗:', error);
        }

        // 載入 rule 數據，優先從 job 目錄載入
        try {
          let ruleRes = null;
          try {
            ruleRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/rule.json`);
            console.log('✅ 從 job 目錄載入 rule.json');
          } catch {
            // fallback 到 rules 目錄
            if (configData?.rule_id) {
              try {
                ruleRes = await axios.get(`${API_BASE}/rules/${configData.rule_id}`);
                console.log('✅ 從 rules 目錄載入規則:', configData.rule_id);
              } catch (ruleError) {
                console.error('❌ 從 rules 目錄載入規則失敗:', ruleError);
              }
            } else {
              console.log('⚠️ 無 rule_id，跳過規則載入');
            }
          }
          if (ruleRes?.data) {
            setRuleData(ruleRes.data);
            console.log('✅ 成功設定 rule 數據');
          }
        } catch (error) {
          console.error('❌ 載入 rule 數據失敗:', error);
        }

        // 載入 map 數據，優先從 job 目錄載入
        try {
          let mapRes = null;
          try {
            // 優先從 job 目錄載入 map.json
            mapRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/map.json`);
            console.log('✅ 從 job 目錄載入 map.json');
          } catch {
            // fallback 到 maps API
            if (configData?.map_id) {
              try {
                mapRes = await axios.get(`${API_BASE}/maps/${configData.map_id}`);
                console.log('✅ 從 maps 目錄載入地圖:', configData.map_id);
              } catch (mapError) {
                console.error('❌ 從 maps 目錄載入地圖失敗:', mapError);
              }
          } else {
              console.log('⚠️ 無 map_id，跳過 maps API 載入');
            }
          }
          if (mapRes?.data) {
            setMapDataInfo(mapRes.data);
            console.log('✅ 成功設定 map 數據');
          }
        } catch (error) {
          console.error('❌ 載入 map 數據失敗:', error);
        }

        // 載入分析報告 - 優先載入 analysis.html，fallback 到 /report API
        let reportLoaded = false;
        
        // 1. 優先載入 analysis.html
        try {
          const htmlRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/analysis.html`);
          if (htmlRes.data && htmlRes.data.html_content) {
            setReport(htmlRes.data.html_content);
            setReportType('html');
            reportLoaded = true;
            setShowReanalyze(true); // 有報告時設置為true
            console.log('✅ 成功載入 analysis.html');
          }
        } catch (error) {
          console.log('❌ analysis.html 載入失敗，嘗試 fallback');
        }

        // 2. fallback: /report API（只有在 html 載入失敗時才執行）
        if (!reportLoaded) {
          try {
            const reportRes = await axios.get(`${API_BASE}/analysis/${selectedJob}/report`);
            if (reportRes.data && reportRes.data.content) {
              // 簡單將 markdown 轉為 HTML
              const htmlContent = reportRes.data.content
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
              setReport(`<html><body>${htmlContent}</body></html>`);
              setReportType('md');
              setShowReanalyze(true); // 有報告時設置為true
              console.log('⚠️ 使用 /report API fallback');
            }
          } catch (error) {
            console.log('❌ 所有分析報告載入方式都失敗');
            // 如果都沒有報告，顯示提示信息
            setReport('<div style="text-align: center; padding: 40px; color: #666;"><h3>📝 尚未生成分析報告</h3><p>此訓練任務尚未進行AI分析，請點擊下方按鈕生成分析報告。</p></div>');
            setReportType('none');
            setShowReanalyze(false); // 沒有報告時設置為false
          }
        }

      } catch (error) {
        console.error('載入分析數據失敗:', error);
        setError(`載入數據失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedJob, jobs, handleAnalyze]);

  useEffect(() => {
    // 解析 AI 回覆中的學習曲線資料
    const tempDiv = document.createElement('div');
    if (report) {
      tempDiv.innerHTML = report;
      const el = tempDiv.querySelector('#learningCurveData');
      if (el) {
        try {
          const rewards = JSON.parse(el.getAttribute('data-rewards') || '[]');
          const steps = JSON.parse(el.getAttribute('data-steps') || '[]');
          if (Array.isArray(rewards) && Array.isArray(steps) && rewards.length && steps.length) {
            setExtractedChartData({ rewards, steps });
          } else {
            setExtractedChartData(null);
          }
        } catch {
          setExtractedChartData(null);
        }
      } else {
        setExtractedChartData(null);
      }
      // 自動提取 <style> 並插入 <head>
      const styleMatch = report.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      if (styleMatch) {
        let styleTag = document.getElementById('ai-analysis-style') as HTMLStyleElement | null;
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'ai-analysis-style';
          document.head.appendChild(styleTag);
        }
        styleTag.innerHTML = styleMatch[1];
      }
    } else {
      setExtractedChartData(null);
      // 移除舊的 style
      const oldStyle = document.getElementById('ai-analysis-style');
      if (oldStyle) oldStyle.remove();
    }
  }, [report]);

  const handleReanalyze = async () => {
    if (!selectedJob) return;
    setReportLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/analysis/${selectedJob}/analyze-and-save`, {
        user_prompt: '請重新分析這個強化學習訓練結果'
      });
      
      if (response.data && (response.data.md || response.data.html)) {
        let htmlContent = '';
        if (response.data.html) {
          htmlContent = response.data.html;
        } else if (response.data.md) {
          htmlContent = markdownToHtml(response.data.md);
        }
        setReport(htmlContent);
        
        // 重新分析成功後，重新載入所有數據
        setTimeout(() => {
          // 觸發重新載入數據
          const currentJob = selectedJob;
          setSelectedJob('');
          setTimeout(() => setSelectedJob(currentJob), 1000);
        }, 1000);
      } else {
        setError('重新分析完成但沒有返回內容');
      }
    } catch (err: any) {
      console.error('重新分析錯誤:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          '重新分析失敗';
      setError(`重新分析失敗: ${errorMessage}`);
    } finally {
      setReportLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Learning Curve',
      },
    },
  };

  const chartData: ChartData<'line'> | null = curveData ? {
    labels: Array.from({ length: curveData.rewards.length }, (_, i) => i + 1),
    datasets: [
      {
        label: 'Total Reward',
        data: curveData.rewards,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Steps',
        data: curveData.steps,
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        yAxisID: 'y1',
      },
    ],
  } : null;

  // 嘗試從 report 解析出學習曲線資料
  let rewards: number[] | null = null;
  let steps: number[] | null = null;
  if (report) {
    try {
      // 嘗試直接解析 JSON 區塊
      const match = report.match(/"rewards"\s*:\s*\[[\s\S]*?\]/);
      const match2 = report.match(/"steps"\s*:\s*\[[\s\S]*?\]/);
      if (match && match2) {
        rewards = JSON.parse('{' + match[0] + '}').rewards;
        steps = JSON.parse('{' + match2[0] + '}').steps;
      }
    } catch (e) {
      // 忽略解析錯誤
    }
  }

  return (
    <Layout title="AI 分析">
      <Box sx={{ maxWidth: 1000, mx: 'auto', mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 600 }}>
          📊 AI 訓練分析與報告
        </Typography>
        
        <Box sx={{ p: 2, background: '#f0f8ff', borderRadius: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#555' }}>
            <b>📋 分析頁面說明：</b><br/>
            • <b>選擇訓練紀錄</b>：從下拉選單選擇要分析的AI訓練結果<br/>
            • <b>智能分析</b>：首次選擇自動分析，重新選擇載入已保存結果<br/>
            • <b>重新分析</b>：點擊按鈕可重新生成分析報告<br/>
            • <b>整合報告</b>：包含學習曲線、熱力圖、最優路徑和AI分析<br/>
            <br/>
            <b>💡 使用建議：</b> 先完成AI訓練，再來此頁面查看分析結果。
          </Typography>
        </Box>

        <Paper sx={{ p: 3, background: '#f5fbe7', borderRadius: 3 }}>
          {/* 選擇訓練紀錄和重新分析按鈕 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Typography>選擇訓練紀錄：</Typography>
            <Select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} sx={{ minWidth: 220 }}>
              {jobs.map(j => (
                <MenuItem key={j.job_id} value={j.job_id}>
                  {j.job_name || j.job_id}（{j.created_at?.slice(0,19).replace('T',' ')}）
                </MenuItem>
              ))}
            </Select>

            {/* 如果沒有報告但有選中的任務，顯示生成分析按鈕 */}
            {(!report || reportType === 'none') && selectedJob && !loading && !reportLoading && (
              <Button 
                variant="contained" 
                color="secondary" 
                size="small"
                onClick={handleAnalyze}
                sx={{ fontSize: '0.8rem' }}
              >
                🤖 生成分析報告
              </Button>
            )}
          </Box>

          {jobInfo && (
            <Box sx={{ mb: 2, color: '#888' }}>
              <Typography variant="body2">訓練名稱：{jobInfo.job_name}</Typography>
              <Typography variant="body2">建立時間：{jobInfo.created_at?.slice(0,19).replace('T',' ')}</Typography>
              <Typography variant="body2">Job ID：{jobInfo.job_id}</Typography>
            </Box>
          )}

          {loading && <CircularProgress />}
          
          {!loading && selectedJob && (
            <Box>
              {/* 分析報告（包含所有內容） */}
              <Box>
                {/* 在標題旁邊添加重新分析按鈕 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c5aa0' }}>
                    🤖 強化學習訓練分析報告
                  </Typography>
                  {selectedJob && !reportLoading && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {(!report || reportType === 'none') && (
                        <Button 
                          variant="contained" 
                          color="secondary" 
                          size="small"
                          onClick={handleAnalyze}
                          sx={{ fontSize: '0.8rem' }}
                        >
                          🤖 生成分析報告
                        </Button>
                      )}
                      {showReanalyze && report && reportType !== 'none' && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={handleReanalyze}
                          sx={{ fontSize: '0.8rem' }}
                        >
                          🔄 重新分析
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
                
                {reportLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <CircularProgress size={20} />
                    <Typography>
                      {showReanalyze ? 'AI 正在重新分析訓練結果，請稍候...' : 'AI 正在分析訓練結果，請稍候...'}
                    </Typography>
                  </Box>
                )}

                {verifyResult && !verifyResult.verify_ok && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <b>訓練驗證異常：</b><br/>
                      <pre style={{whiteSpace:'pre-wrap'}}>{verifyResult.verify_output}</pre>
                    </Typography>
                  </Alert>
                )}

                {report && (
                  <Paper sx={{ p: 3, background: '#fff', borderRadius: 2, mb: 3 }}>
                    <Box sx={{ mb: 3, p: 2, background: '#e3f2fd', borderRadius: 2, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <Box sx={{ minWidth: 220, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>🛠️ 訓練參數</Typography>
                        {jobConfig ? (
                          <Typography variant="body2" sx={{ color: '#333' }}>
                            <b>演算法：</b> {jobConfig.algorithm}<br/>
                            <b>回合數：</b> {jobConfig.episodes}<br/>
                            <b>學習率：</b> {jobConfig.learning_rate}<br/>
                            <b>折扣因子：</b> {jobConfig.discount_factor}<br/>
                            <b>初始探索率：</b> {jobConfig.epsilon}<br/>
                            <b>樂觀初始化：</b> {jobConfig.optimistic ? '是' : '否'}<br/>
                            {jobConfig.seed !== null && <><b>隨機種子：</b> {jobConfig.seed}<br/></>}
                            {jobConfig.lambda_param !== undefined && <><b>λ 參數：</b> {jobConfig.lambda_param}<br/></>}
                            {!jobConfig.rule_id && (
                              <Typography variant="caption" sx={{ color: '#ff9800', display: 'block', mt: 1 }}>
                                ⚠️ 舊版訓練任務，未保存規則ID
                              </Typography>
                            )}
                          </Typography>
                        ) : <Typography variant="body2" sx={{ color: '#888' }}>無訓練參數資訊</Typography>}
                      </Box>
                      {/* 規則細節區塊 */}
                      <Box sx={{ minWidth: 220, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>🎮 規則細節</Typography>
                        {ruleData ? (
                          <Typography variant="body2" sx={{ color: '#333' }}>
                            <b>寶藏得分：</b> {ruleData.bonusReward}<br/>
                            <b>步數懲罰：</b> {ruleData.stepPenalty}<br/>
                            <b>步數衰減：</b> {ruleData.stepDecay}<br/>
                            <b>終點獎勵：</b> {ruleData.goalReward}<br/>
                            <b>撞牆懲罰：</b> {ruleData.wallPenalty}<br/>
                            <b>最大步數：</b> {ruleData.maxSteps}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#888' }}>
                            {jobConfig && !jobConfig.rule_id ? 
                              '舊版任務無規則記錄' : 
                              '無規則資訊'
                            }
                          </Typography>
                        )}
                      </Box>
                      {/* 地圖資訊區塊 */}
                      <Box sx={{ minWidth: 220, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>🗺️ 地圖資訊</Typography>
                        {mapDataInfo ? (
                          <Typography variant="body2" sx={{ color: '#333' }}>
                            <b>地圖名稱：</b> {mapDataInfo.name}<br/>
                            <b>尺寸：</b> {mapDataInfo.size ? `${mapDataInfo.size[0]} x ${mapDataInfo.size[1]}` : ''}<br/>
                            <b>起點：</b> {mapDataInfo.start ? mapDataInfo.start.join(',') : ''}<br/>
                            <b>終點：</b> {mapDataInfo.goal ? mapDataInfo.goal.join(',') : ''}<br/>
                            <b>寶藏格：</b> {mapDataInfo.bonuses ? Object.keys(mapDataInfo.bonuses).join('、') : ''}<br/>
                            <b>陷阱格：</b> {mapDataInfo.traps ? Object.keys(mapDataInfo.traps).join('、') : ''}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#888' }}>
                            {jobConfig && !jobConfig.map_id ? 
                              '地圖ID缺失' : 
                              '無地圖資訊'
                            }
                          </Typography>
                        )}
                      </Box>
                      {/* 地圖預覽區塊 */}
                      <Box sx={{ minWidth: 220, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mt: -1, ml: -2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>🗺️ 地圖預覽</Typography>
                        {mapDataInfo && mapDataInfo.map ? (
                          <Paper sx={{ p: 1.5, display: 'inline-block', background: '#f5fbe7' }}>
                            <Box sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: `repeat(${mapDataInfo.map[0]?.length || 0}, 32px)`, 
                              gap: 0
                            }}>
                              {mapDataInfo.map.map((row: string[], rowIdx: number) =>
                                row.map((cell: string, colIdx: number) => {
                                  let icon = null;
                                  switch (cell) {
                                    case 'S': icon = <span style={{ fontSize: 20 }}>🧑‍🌾</span>; break;
                                    case 'G': icon = <span style={{ fontSize: 20 }}>🏁</span>; break;
                                    case 'R': icon = <span style={{ fontSize: 20 }}>🪙</span>; break;
                                    case 'T': icon = <span style={{ fontSize: 20 }}>🕳️</span>; break;
                                    case '1': icon = <span style={{ fontSize: 20 }}>🪨</span>; break;
                                    default: icon = null;
                                  }
                                  return (
                                    <Box 
                                      key={`${rowIdx}-${colIdx}`} 
                                      sx={{ 
                                        width: 32, 
                                        height: 32, 
                                        border: '1px solid #bdb76b', 
                                        borderRadius: 1, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        fontSize: 20, 
                                        background: '#e6f9d5', 
                                        m: 0.1 
                                      }}
                                    >
                                      {icon}
                                    </Box>
                                  );
                                })
                              )}
                            </Box>
                          </Paper>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#888' }}>
                            無地圖預覽
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {/* 學習曲線圖表（自動解析 data-rewards/data-steps） */}
                    {curveData && curveData.rewards && curveData.steps && curveData.rewards.length > 0 && curveData.steps.length > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c5aa0' }}>
                          📈 學習曲線分析
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#555', mb: 1 }}>
                          顯示每回合的總獎勵與步數，觀察學習收斂情形。
                        </Typography>
                        <LearningCurveChart rewards={curveData.rewards} steps={curveData.steps} />
                      </Box>
                    )}

                    {/* Q-Table 熱力圖 */}
                    {(heatmapUrl && heatmapUrl.length > 1000) ? (
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c5aa0' }}>
                          🔥 Q-Table 熱力圖分析
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <img src={heatmapUrl} alt="熱力圖" style={{ maxWidth: '100%', maxHeight: 400, background: '#fff', border: '1px solid #ddd', borderRadius: 4 }} />
                        </Box>
                        <Box sx={{ p: 2, background: '#fff5f5', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ color: '#555' }}>
                            <b>🔥 熱力圖說明：</b><br/>
                            • <b>顏色深淺</b>：代表Q值大小，越深表示該狀態-動作對的價值越高<br/>
                            • <b>行（State）</b>：不同的位置狀態<br/>
                            • <b>列（Action）</b>：四個方向動作（上、下、左、右）<br/>
                            • <b>學習效果</b>：顏色分布越明顯表示AI學習效果越好
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c5aa0' }}>
                          🔥 Q-Table 熱力圖分析
                        </Typography>
                        <Box sx={{ mb: 2, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
                          <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
                            Q-Table 熱力圖資料異常，無法顯示。請檢查訓練結果或重新分析。
                          </Typography>
                        </Box>
                        <Box sx={{ p: 2, background: '#fff5f5', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ color: '#555' }}>
                            <b>🔥 熱力圖說明：</b><br/>
                            • <b>顏色深淺</b>：代表Q值大小，越深表示該狀態-動作對的價值越高<br/>
                            • <b>行（State）</b>：不同的位置狀態<br/>
                            • <b>列（Action）</b>：四個方向動作（上、下、左、右）<br/>
                            • <b>學習效果</b>：顏色分布越明顯表示AI學習效果越好
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {/* 最優路徑動畫模擬 */}
                    {mapDataInfo && mapDataInfo.map && optimalPath && (
                      <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c5aa0' }}>
                          🎯 最優路徑動畫模擬
                        </Typography>
                        <AIAnalysisPathSim map={mapDataInfo.map} path={optimalPath} />
                      </Box>
                    )}

                    {/* AI 文字分析報告 */}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#2c5aa0' }}>
                        📝 AI 深度分析報告
                      </Typography>
                      <Box sx={{ p: 3, background: '#fffbe7', borderRadius: 2, border: '1px solid #ffeaa7' }}>
                        {report ? (
                        <div dangerouslySetInnerHTML={{ __html: report }} />
                        ) : (
                          <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 4 }}>
                            分析報告載入中，或尚未生成分析報告...<br/>
                            <Button 
                              variant="contained" 
                              color="primary" 
                              size="small" 
                              onClick={handleAnalyze}
                              sx={{ mt: 2 }}
                            >
                              🔄 生成分析報告
                            </Button>
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                    <Typography variant="body2">
                      <b>❌ 分析失敗</b><br/>
                      <b>錯誤信息：</b> {error}<br/><br/>
                      <b>可能原因：</b><br/>
                      • 訓練數據不完整或格式錯誤<br/>
                      • AI 分析服務暫時不可用<br/>
                      • 數據格式不支援<br/>
                      • 網絡連接問題<br/>
                      • 後端服務異常<br/><br/>
                      <b>解決方案：</b><br/>
                      • 檢查訓練是否完成<br/>
                      • 稍後重試<br/>
                      • 重新選擇訓練任務<br/>
                      • 聯繫系統管理員
                    </Typography>
                  </Alert>
                )}
                {/* 錯誤時也顯示重新分析按鈕 */}
                {error && selectedJob && !reportLoading && (
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="small"
                    onClick={handleReanalyze}
                    sx={{ fontSize: '0.8rem', mt: 1 }}
                  >
                    🔄 重新分析
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
};

export default AIAnalysis; 