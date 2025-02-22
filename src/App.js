import React, { useEffect, useState } from "react";
import { FaHome, FaChartLine, FaThermometerHalf, FaBatteryThreeQuarters, FaMapMarkerAlt, FaCalendarAlt, FaClock } from "react-icons/fa";
import { motion } from "framer-motion";
import { DateRangePicker } from 'react-date-range';
import { addDays } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import "./App.css";
import TrendChart from "./TrendChart";
import { supabase, fetchHistoricalData, fetchAggregatedData, fetchNodeHistoricalData } from "./supabaseClient";

function App() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState([]);
  const [latestData, setLatestData] = useState({ Node_1: {}, Node_2: {} });
  const [deviceStatus, setDeviceStatus] = useState({ Node_1: true, Node_2: true });
  const [retryCount, setRetryCount] = useState({ Node_1: 0, Node_2: 0 });
  const [dateRange, setDateRange] = useState([
    {
      startDate: addDays(new Date(), -7),
      endDate: new Date(),
      key: 'selection',
      color: '#007bff'
    }
  ]);
  const [timeView, setTimeView] = useState('daily');

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel('LoRaData')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'LoRaData' }, fetchData)
      .subscribe();

    const statusInterval = setInterval(() => {
      checkDeviceStatus();
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  const checkDeviceStatus = () => {
    const currentTime = new Date();
    ["Node_1", "Node_2"].forEach(node => {
      if (latestData[node].timestamp) {
        const lastUpdateTime = new Date(latestData[node].timestamp);
        const timeDiff = (currentTime - lastUpdateTime) / 1000 / 60;

        if (timeDiff > 5) {
          setRetryCount(prev => ({
            ...prev,
            [node]: prev[node] + 1
          }));

          if (retryCount[node] >= 5) {
            setDeviceStatus(prev => ({
              ...prev,
              [node]: false
            }));
          }
        } else {
          setRetryCount(prev => ({
            ...prev,
            [node]: 0
          }));
          setDeviceStatus(prev => ({
            ...prev,
            [node]: true
          }));
        }
      }
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHistoricalData(dateRange[0].startDate, dateRange[0].endDate);
      setData(data);
      processLatestData(data);
      checkDeviceStatus();
    } catch (error) {
      setError(error.message);
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function processLatestData(data) {
    const node1 = data.find((item) => JSON.parse(item.data).node === "Node_1");
    const node2 = data.find((item) => JSON.parse(item.data).node === "Node_2");

    setLatestData({
      Node_1: node1 ? { ...JSON.parse(node1.data), timestamp: node1.timestamp } : {},
      Node_2: node2 ? { ...JSON.parse(node2.data), timestamp: node2.timestamp } : {},
    });
  }

  const getQualityColor = (percentage) => {
    if (!percentage) return "#F44336";
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 60) return "#FFC107";
    return "#F44336";
  };

  const getFilteredData = async () => {
    try {
      const data = await fetchHistoricalData(dateRange[0].startDate, dateRange[0].endDate);
      return data;
    } catch (error) {
      setError(error.message);
      console.error("Error filtering data:", error);
      return [];
    }
  };

  const statusStyle = (isOnline) => ({
    display: 'inline-block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: isOnline ? '#4CAF50' : '#F44336',
    marginRight: '8px',
    transition: 'background-color 0.3s ease'
  });

  return (
    <div className="app">
      <header className="navbar">
        <h1>Air Quality Dashboard</h1>
        <nav className="nav-buttons">
          <button 
            className={`nav-button ${tab === "home" ? "active" : ""}`}
            onClick={() => setTab("home")}
          >
            <FaHome /> Home
          </button>
          <button 
            className={`nav-button ${tab === "historical" ? "active" : ""}`}
            onClick={() => setTab("historical")}
          >
            <FaChartLine /> Historical Data
          </button>
        </nav>
      </header>

      <main>
        {tab === "home" && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="home-section"
          >
            <div className="card-container">
              {["Node_1", "Node_2"].map((node) => (
                <motion.div
                  key={node}
                  className="dashboard-card"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="card-header">
                    <FaThermometerHalf size={24} />
                    <h3>{node.replace("_", " ")}</h3>
                    <div 
                      className="status-indicator" 
                      style={statusStyle(deviceStatus[node])}
                      title={deviceStatus[node] ? 'Online' : 'Offline'}
                    />
                    {latestData[node].timestamp && (
                      <div className="timestamp">
                        Last update: {new Date(latestData[node].timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  
                  {latestData[node].node ? (
                    <>
                      <div 
                        className="quality-indicator"
                        style={{
                          background: getQualityColor(latestData[node].airQualityPercentage),
                          width: `${latestData[node].airQualityPercentage}%`
                        }}
                      />
                      <div className="data-row">
                        <FaThermometerHalf />
                        <span>Air Quality: {latestData[node].airQuality} ({latestData[node].airQualityPercentage}%)</span>
                      </div>
                      <div className="data-row">
                        <FaBatteryThreeQuarters />
                        <span>Battery: {latestData[node].batteryPercentage}%</span>
                      </div>
                      <div className="data-row">
                        <FaMapMarkerAlt />
                        <span>Location: Lat {latestData[node].location.latitude}, Lng {latestData[node].location.longitude}</span>
                      </div>
                    </>
                  ) : (
                    <p>No data available for {node.replace("_", " ")}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {tab === "historical" && (
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="historical-section"
          >
            <div className="dashboard-card date-filter-card">
              <div className="card-header">
                <FaCalendarAlt size={24} />
                <h3>Select Date Range</h3>
              </div>
              <DateRangePicker
                onChange={item => setDateRange([item.selection])}
                moveRangeOnFirstSelection={false}
                ranges={dateRange}
                className="date-picker"
              />
              <div className="time-view-buttons">
                <button 
                  className={`view-button ${timeView === 'daily' ? 'active' : ''}`}
                  onClick={() => setTimeView('daily')}
                >
                  <FaClock /> Daily
                </button>
                <button 
                  className={`view-button ${timeView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setTimeView('monthly')}
                >
                  <FaCalendarAlt /> Monthly
                </button>
                <button 
                  className={`view-button ${timeView === 'breakdown' ? 'active' : ''}`}
                  onClick={() => setTimeView('breakdown')}
                >
                  <FaChartLine /> Day Breakdown
                </button>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-header">
                <FaChartLine size={24} />
                <h2>Historical Data</h2>
              </div>
            {isLoading ? (
              <div className="loading-indicator">Loading data...</div>
            ) : error ? (
              <div className="error-message">Error: {error}</div>
            ) : (
              <TrendChart 
                data={getFilteredData()} 
                timeView={timeView}
              />
            )}

            </div>
          </motion.section>
        )}
      </main>

      <footer>
        <p>&copy; 2024 Air Quality Monitoring System</p>
      </footer>
    </div>
  );
}

export default App;
