import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e6f9d5 0%, #b7e4c7 100%)',
        fontFamily: 'Fredoka One, Baloo, Luckiest Guy, sans-serif',
        p: { xs: 1, md: 4 },
        position: 'relative',
      }}
    >
      {/* 回首頁按鈕 */}
      {!isHome && (
        <Button
          variant="outlined"
          sx={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}
          onClick={() => navigate('/')}
        >
          回首頁
        </Button>
      )}
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 3, letterSpacing: 2, textAlign: 'center' }}>
          🌿 {title || '叢林尋寶強化學習平台'} 🌿
        </Typography>
        <Paper elevation={4} sx={{ borderRadius: 4, p: { xs: 2, md: 4 }, background: '#f5fbe7', minHeight: 400 }}>
          {children}
        </Paper>
      </Box>
    </Box>
  );
};

export default Layout; 