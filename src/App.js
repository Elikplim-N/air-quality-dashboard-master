// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ====== Supabase ======
const supabaseUrl = "https://piiukbcyvbrlkjvptspv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpaXVrYmN5dmJybGtqdnB0c3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2Mjg2NzksImV4cCI6MjA3MTIwNDY3OX0.J376VTOIhP6JBEUtvepzF8g-QXnzZGmyeum0jffkpSs";
const supabase = createClient(supabaseUrl, supabaseKey);

// ====== Config ======
const TABLE = "LoRaData";
const POLL_MS = 30_000;          // refresh list every 30s
const STATUS_TICK_MS = 10_000;   // recompute online/offline every 10s
const OFFLINE_MINUTES = 5;       // <= 5 min = online, otherwise offline
const NODES = ["Node_1", "Node_2"]; // add more names here if you have them

export default function App() {
  const [rows, setRows] = useState([]);                 // raw DB rows
  const [latestData, setLatestData] = useState({});     // per-node latest payload
  const [deviceStatus, setDeviceStatus] = useState({}); // per-node boolean

  // ---------- fetch most recent data ----------
  const fetchData = async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id,data,inserted_at")
      .order("inserted_at", { ascending: false }) // newest first
      .limit(1000);

    if (error) {
      console.error("Fetch error:", error);
      return;
    }
    setRows(data || []);
    processLatestData(data || []);
  };

  // ---------- compute latest payload per node ----------
  function processLatestData(dbRows) {
    // parse once, keep inserted_at alongside payload fields
    const parsed = dbRows.map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.data || "{}");
      } catch (e) {
        console.warn("Bad JSON in row", r.id, e);
      }
      return { ...payload, inserted_at: r.inserted_at };
    });

    const latestFor = (nodeName) =>
      parsed.find((p) => p.node === nodeName) || {}; // rows are already newest-first

    const next = {};
    NODES.forEach((n) => (next[n] = latestFor(n)));
    setLatestData(next);
  }

  // ---------- online/offline based on inserted_at ----------
  const checkDeviceStatus = () => {
    const now = Date.now();
    const next = {};
    NODES.forEach((node) => {
      const ts = latestData[node]?.inserted_at;
      if (ts) {
        const diffMin = (now - new Date(ts).getTime()) / 60000;
        next[node] = diffMin <= OFFLINE_MINUTES;
      } else {
        next[node] = false; // no data yet -> treat as offline
      }
    });
    setDeviceStatus((prev) => ({ ...prev, ...next }));
  };

  // ---------- effects ----------
  useEffect(() => {
    fetchData(); // initial load
    const poll = setInterval(fetchData, POLL_MS);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    // recompute status whenever latestData changes and also on a timer
    checkDeviceStatus();
    const tick = setInterval(checkDeviceStatus, STATUS_TICK_MS);
    return () => clearInterval(tick);
  }, [latestData]);

  // ---------- helpers ----------
  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleString() : "—";

  const NodeCard = ({ node }) => {
    const d = latestData[node] || {};
    const online = !!deviceStatus[node];

    // You can adapt these field names to your payload keys
    const {
      batteryPercentage,
      battery,             // if you use raw voltage instead
      temperature,
      humidity,
      rssi,
    } = d;

    return (
      <div
        className="card"
        style={{
          padding: 16,
          borderRadius: 12,
          background: "#111",
          color: "#eee",
          border: `1px solid ${online ? "#1db954" : "#f44336"}`,
          boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          maxWidth: 420,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: online ? "#1db954" : "#f44336",
            }}
          />
          <h3 style={{ margin: 0 }}>{node}</h3>
          <span style={{ opacity: 0.7, marginLeft: 8 }}>
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
          <div><strong>Last packet:</strong> {fmtTime(d.inserted_at)}</div>
          {batteryPercentage != null && (
            <div><strong>Battery %:</strong> {batteryPercentage}%</div>
          )}
          {battery != null && (
            <div><strong>Battery (V):</strong> {battery}</div>
          )}
          {temperature != null && (
            <div><strong>Temp:</strong> {temperature}°C</div>
          )}
          {humidity != null && (
            <div><strong>Humidity:</strong> {humidity}%</div>
          )}
          {rssi != null && (
            <div><strong>RSSI:</strong> {rssi} dBm</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0b0b0c",
        padding: "32px 20px",
        color: "#fff",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Air Quality Dashboard</h1>
        <div style={{ opacity: 0.7, fontSize: 14 }}>
          Table: <code style={{ color: "#9cdcfe" }}>{TABLE}</code> · Offline threshold:{" "}
          {OFFLINE_MINUTES} min
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {NODES.map((n) => (
          <NodeCard node={n} key={n} />
        ))}
      </section>
    </div>
  );
}
