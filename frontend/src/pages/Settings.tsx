import React, { useEffect, useState } from 'react';
import Layout from '../Layout';
import { Typography, Box, TextField, Button, Alert } from '@mui/material';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    system_prompt: '',
    api_key: '',
    model_name: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/settings/settings`).then(res => {
      setSettings(res.data);
      setLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    axios.post(`${API_BASE}/settings/settings`, settings)
      .then(() => setMsg('儲存成功！'))
      .catch(() => setMsg('儲存失敗！'));
  };

  if (loading) return <Layout title="系統設定"><Box>載入中...</Box></Layout>;

  return (
    <Layout title="系統設定">
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 600 }}>
          ⚙️ 系統參數調整
        </Typography>

        <TextField
          label="API Key"
          name="api_key"
          value={settings.api_key}
          onChange={handleChange}
          fullWidth
        />
        <TextField
          label="Model Name"
          name="model_name"
          value={settings.model_name}
          onChange={handleChange}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={handleSave}>
          儲存
        </Button>
        {msg && <Alert severity={msg === '儲存成功！' ? 'success' : 'error'}>{msg}</Alert>}
      </Box>
    </Layout>
  );
};

export default Settings; 