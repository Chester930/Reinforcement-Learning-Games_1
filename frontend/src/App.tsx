import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// 頁面元件（稍後會建立這些檔案）
import Home from './pages/Home';
import MapManagement from './pages/MapManagement';
import ManualPlay from './pages/ManualPlay';
import AITraining from './pages/AITraining';
import AIAnalysis from './pages/AIAnalysis';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/maps" element={<MapManagement />} />
        <Route path="/manual" element={<ManualPlay />} />
        <Route path="/ai" element={<AITraining />} />
        <Route path="/analysis" element={<AIAnalysis />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
