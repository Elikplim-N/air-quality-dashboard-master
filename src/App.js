import React, { useEffect, useState } from "react";
import {
  FaHome,
  FaChartLine,
  FaThermometerHalf,
  FaBatteryThreeQuarters,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock
} from "react-icons/fa";
import { motion } from "framer-motion";
import { DateRangePicker } from "react-date-range";
import { addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "./App.css";
import TrendChart from "./TrendChart";
import { supabase, fetchHistoricalData } from "./supabaseClient";

// ===== Config =====
const OFFLINE_MINUTES = 5; // device considered offline if no data within 5 minutes
const NODES = ["Node_1", "Node_2"];

function App() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState([]);
  const [latestData, setLatestData] = useState({ Node_1: {}, Node_2: {} });
  const [deviceStatus, setDeviceStatus] = useState({ Node_1: false, Node_2: false });
  const [retryCount, setRetryCount] = useState({ Node_1: 0, Node_2: 0 });
  const [dateRange, setDateRange] = useState([
    {
      startDate: addDays(new Date(), -7),
      endDate: new Date(),
      key: "selection",
      color: "#007bff"
    }
  ]);
  const [timeView, setTimeView] = useState("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- fetch + realtime subscription ----
  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel("LoRaData")
      .on("postgres_changes", { event: "*", schema: "public", table: "LoRaData" }, fetchData)
      .subscribe();

    const statusInterval = setInterval(() => {
      checkDeviceStatus();
    }, 10_000); // recompute every 10s

    return () => {
      subscription.unsubscribe();
      clearInterval(statusInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- compute device status from latestData ----
  const checkDeviceStatus = () => {
    const nowMs = Date.now();
    const next = {};
    NODES.forEach((node) => {
      const ts = latestData[node]?.inserted_at;
      if (ts) {
        const diffMin = (nowMs - new Date(ts).getTime()) / 60000;
        next[node] = diffMin <= OFFLINE_MINUTES;
      } else {
        next[node] = false; // no data yet
      }
    });
    setDeviceStatus((prev) => ({ ...prev, ...next }));
  };

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure fetchHistoricalData returns rows with fields: { data: string, inserted_at: ISO, id?: number }
      const rows = await fetchHistoricalData(dateRange[0].startDate, dateRange[0].endDate);
      setData(rows);
      processLatestData(rows);
      checkDeviceStatus();
    } catch (err) {
      setError(err?.message || String(err));
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ---- pick latest row per node by inserted_at ----
  function processLatestData(rows) {
    // Parse once and keep inserted_at in the object
    const parsed = rows.map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.data || "{}");
      } catch (e) {
        console.warn("Bad JSON row", r?.id, e);
      }
      return { ...payload, inserted_at: r.inserted_at };
    });

    // Sort newest first to make "find" return the latest
    parsed.sort((a, b) => new Date(b.inserted_at) - new Date(a.inserted_at));

    const latestFor = (nodeName) => parsed.find((p) => p.node === nodeName) || {};

    setLatestData({
      Node_1: latestFor("Node_1"),
      Node_2: latestFor("Node_2")
    });
  }

  const getQualityColor = (percentage) => {
    if (percentage == null) return "#F44336";
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 60) return "#FFC107";
    return "#F44336";
  };

  const statusStyle = (isOnline) => ({
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: isOnline ? "#4CAF50" : "#F44336",
    marginRight: "8px",
    transition: "background-color 0.3s ease"
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
              {NODES.map((node) => (
                <motion.div key={node} className="dashboard-card" whileHover={{ scale: 1.02 }}>
                  <div className="card-header">
                    <FaThermometerHalf size={24} />
                    <h3>{node.replace("_", " ")}</h3>
                    <div
                      style={statusStyle(deviceStatus[node])}
                      title={deviceStatus[node] ? "Online" : "Offline"}
                    />
                  </div>

                  {latestData[node]?.node ? (
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
                        <span>
                          Air Quality: {latestData[node].airQuality} (
                          {latestData[node].airQualityPercentage}%)
                        </span>
                      </div>

                      <div className="data-row">
                        <FaBatteryThreeQuarters />
                        <span>Battery: {latestData[node].batteryPercentage}%</span>
                      </div>

                      <div className="data-row">
                        <FaMapMarkerAlt />
                        <span>
                          Location: Lat {latestData[node].location?.latitude}, Lng{" "}
                          {latestData[node].location?.longitude}
                        </span>
                      </div>

                      <div className="data-row">
                        <FaClock />
                        <span>
                          Data Timestamp:{" "}
                          {latestData[node].inserted_at
                            ? new Date(latestData[node].inserted_at).toLocaleString()
                            : "—"}
                        </span>
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
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="historical-section">
            <div className="dashboard-card date-filter-card">
              <div className="card-header">
                <FaCalendarAlt size={24} />
                <h3>Select Date Range</h3>
              </div>
              <DateRangePicker
                onChange={(item) => setDateRange([item.selection])}
                moveRangeOnFirstSelection={false}
                ranges={dateRange}
                className="date-picker"
              />
              <div className="time-view-buttons">
                <button
                  className={`view-button ${timeView === "daily" ? "active" : ""}`}
                  onClick={() => setTimeView("daily")}
                >
                  <FaClock /> Daily
                </button>
                <button
                  className={`view-button ${timeView === "monthly" ? "active" : ""}`}
                  onClick={() => setTimeView("monthly")}
                >
                  <FaCalendarAlt /> Monthly
                </button>
                <button
                  className={`view-button ${timeView === "breakdown" ? "active" : ""}`}
                  onClick={() => setTimeView("breakdown")}
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
                <TrendChart data={data} timeView={timeView} />
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
