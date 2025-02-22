// TrendChart.js
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';

function TrendChart({ data }) {
  const [processedData, setProcessedData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    if (!data.length) {
      setProcessedData({ labels: [], datasets: [] });
      return;
    }

    const chartData = processData(data);
    
    setProcessedData({
      labels: chartData.labels,
      datasets: [
        {
          label: "Air Quality (%)",
          data: chartData.values,
          backgroundColor: "#007bff",
          borderColor: "#007bff",
          borderWidth: 1,
        }
      ],
    });
  }, [data]);

  const processData = (data) => {
    const aggregatedData = {};
    
    data.forEach(item => {
      const date = format(new Date(item.timestamp), 'yyyy-MM-dd');
      const parsedData = JSON.parse(item.data);
      
      if (!parsedData || parsedData.airQualityPercentage === undefined) {
        return;
      }
      
      if (!aggregatedData[date]) {
        aggregatedData[date] = [];
      }
      
      aggregatedData[date].push(parsedData.airQualityPercentage);
    });

    const labels = Object.keys(aggregatedData).sort();
    const values = labels.map(date => {
      const readings = aggregatedData[date];
      return readings.reduce((sum, val) => sum + val, 0) / readings.length;
    });

    return { labels, values };
  };



  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Air Quality Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            if (context.parsed.y !== null) {
              return `${label}: ${context.parsed.y.toFixed(2)}%`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Air Quality (%)'
        }
      },
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
  };

  return (
    <div style={{ height: '400px', position: 'relative' }}>
      <Bar data={processedData} options={options} />
    </div>
  );
}

export default TrendChart;
