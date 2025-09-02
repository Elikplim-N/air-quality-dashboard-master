import React, { useState } from 'react';
import { FaChartBar, FaUpload, FaPencilAlt } from 'react-icons/fa';
import './styles_Analytics.css';
import { motion } from 'framer-motion';

function Analytics({ data = [] }) {
  const [analysisType, setAnalysisType] = useState('daily');
  const [inputMethod, setInputMethod] = useState('manual');

  const safeParse = (row) => {
    try {
      return typeof row.data === 'string' ? JSON.parse(row.data) : row.data || {};
    } catch {
      return {};
    }
  };

  const calculateStats = (rows) => {
    const values = rows
      .map(r => {
        const p = safeParse(r);
        const v = Number(p.airQualityPercentage);
        return Number.isFinite(v) ? v : null;
      })
      .filter(v => v !== null);

    if (!values.length) return null;

    const avg = (values.reduce((a,b)=>a+b,0) / values.length);
    return {
      average: avg.toFixed(1),
      max: Math.max(...values),
      min: Math.min(...values),
      trend: values[values.length - 1] > values[0] ? 'improving' : 'declining'
    };
  };

  const stats = calculateStats(data);

  const renderAnalysisResults = (stats) => {
    if (!stats) return <p>No numeric data available to analyze.</p>;
    return (
      <div className="analysis-results">
        <h3>Analysis Results</h3>
        <div className="result-card">
          <p>Average Air Quality: {stats.average}%</p>
          <p>Highest Reading: {stats.max}%</p>
          <p>Lowest Reading: {stats.min}%</p>
          <p>Overall Trend: Air quality is {stats.trend}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-container">
      <div className="input-section">
        <h2>Data Input</h2>
        <div className="input-method-toggle">
          <button
            className={`method-button ${inputMethod === 'manual' ? 'active' : ''}`}
            onClick={() => setInputMethod('manual')}
          >
            <FaPencilAlt /> Manual Entry
          </button>
          <button
            className={`method-button ${inputMethod === 'upload' ? 'active' : ''}`}
            onClick={() => setInputMethod('upload')}
          >
            <FaUpload /> Upload File
          </button>
        </div>
        
        {inputMethod === 'manual' ? (
          <div className="manual-input-form">
            <p style={{color:'#666'}}>Manual input coming soon — prefer uploading CSVs for now.</p>
          </div>
        ) : (
          <div className="file-upload">
            <input type="file" accept=".csv,.xlsx" />
            <p>Drag & drop your data file here or click to browse</p>
          </div>
        )}
      </div>

      <div className="analysis-section">
        <h2>Analysis Options</h2>
        <div className="analysis-type-selector">
          <button
            className={`analysis-button ${analysisType === 'daily' ? 'active' : ''}`}
            onClick={() => setAnalysisType('daily')}
          >
            Daily Analysis
          </button>
          <button
            className={`analysis-button ${analysisType === 'weekly' ? 'active' : ''}`}
            onClick={() => setAnalysisType('weekly')}
          >
            Weekly Trends
          </button>
          <button
            className={`analysis-button ${analysisType === 'monthly' ? 'active' : ''}`}
            onClick={() => setAnalysisType('monthly')}
          >
            Monthly Overview
          </button>
        </div>
        
        {renderAnalysisResults(stats)}
      </div>
    </div>
  );
}

export default Analytics;
