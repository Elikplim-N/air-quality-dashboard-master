import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function TrendChart({ data }) {
  const [processedData, setProcessedData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    if (!data || data.length === 0) {
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
    // Label each reading as Reading 1, Reading 2, etc.
    const labels = data.map((item, index) => `Reading ${index + 1}`);
    const values = data.map(item => {
      const parsedData = JSON.parse(item.data);
      return parsedData.airQualityPercentage || 0;
    });
    return { labels, values };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Air Quality Progress Over Time" }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: "Air Quality (%)" }
      },
      x: {
        title: { display: true, text: "Sequential Readings" }
      }
    },
  };

  return (
    <div style={{ height: "250px", position: "relative" }}>
      {processedData.labels.length > 0 ? (
        <Bar data={processedData} options={options} />
      ) : (
        <p style={{ textAlign: "center", padding: "20px" }}>No data available.</p>
      )}
    </div>
  );
}

export default TrendChart;
