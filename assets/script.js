// =====================
// Loki Home • app.js
// Function-wise Modular Script with Payloads
// =====================

// ---------------------
// 1. MQTT SETUP
// ---------------------
function setupMQTT() {
  const brokerUrl = "wss://0d10497a97ea4359bf376f755d59da27.s1.eu.hivemq.cloud:8884/mqtt";
  const options = {
    username: "lokeshm19",
    password: "Lokesh@19",
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  };

  const client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => handleMQTTConnect(client));
  client.on("error", (err) => handleMQTTError(err));
  client.on("close", () => handleMQTTClose());
  client.on("message", (topic, message) => handleMQTTMessage(topic, message, client));

  return client;
}

// --- MQTT Handlers ---
function handleMQTTConnect(client) {
  logEvent("System", "✅ Connected to HiveMQ Cloud");
  document.getElementById("connStatus").textContent = "Online";
  client.subscribe("#");
}

function handleMQTTError(err) {
  console.error("MQTT Error:", err);
  logEvent("System", "❌ Connection error");
}

function handleMQTTClose() {
  logEvent("System", "🔌 Disconnected from broker");
  document.getElementById("connStatus").textContent = "Offline";
}

function handleMQTTMessage(topic, message, client) {
  const payload = message.toString();
  logEvent("MQTT", topic, payload);

  syncSwitchStates(topic, payload);
  syncDoorState(topic, payload);
}

// ---------------------
// 2. LOGGING
// ---------------------
function logEvent(event, detail, extra = "") {
  const tbody = document.getElementById("logBody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${new Date().toLocaleTimeString()}</td>
    <td>${event}</td>
    <td>${detail} ${extra}</td>
  `;
  tbody.prepend(row);
}

// ---------------------
// 3. DOOR & SECURITY
// ---------------------
function lockDoor(client) {
  const payload = "LOCKED";
  publishDoorState(client, payload);
  logEvent("Door", "Locked");
}

function unlockDoor(client) {
  const payload = "UNLOCKED";
  publishDoorState(client, payload);
  logEvent("Door", "Unlocked");
}

function publishDoorState(client, state) {
  client.publish("door/command", state === "LOCKED" ? "LOCK" : "UNLOCK");
  client.publish("door/state", state, { retain: true });
  updateDoorPill(state === "LOCKED" ? "Locked" : "Unlocked", state === "LOCKED" ? "pill locked" : "pill unlocked");
}

function updateDoorPill(text, className) {
  const pill = document.getElementById("doorPill");
  pill.textContent = text;
  pill.className = className;
}

function syncDoorState(topic, payload) {
  if (topic !== "door/state") return;

  updateDoorPill(payload === "LOCKED" ? "Locked" : "Unlocked", payload === "LOCKED" ? "pill locked" : "pill unlocked");
}

// ---------------------
// 4. OTP MOCK
// ---------------------
function sendOTP(client) {
  const mobile = "6360435917";
  const otp = Math.floor(100000 + Math.random() * 900000);
  const payload = { mobile, otp };
  
  document.getElementById("otpResult").textContent = `OTP sent to ${mobile}: ${otp}`;
  logEvent("OTP", "Sent to", mobile);
  
  client.publish("otp/send", JSON.stringify(payload), { retain: false });
}

// ---------------------
// 5. ROOMS CONTROL
// ---------------------
function setupRoomSwitches(client) {
  document.querySelectorAll(".switch input").forEach(input => {
    input.addEventListener("change", e => handleRoomSwitchChange(e, client));
  });
}

function handleRoomSwitchChange(e, client) {
  const topic = e.target.dataset.toggle;
  const state = e.target.checked ? "ON" : "OFF";

  client.publish(topic, state);
  client.publish(topic + "/state", state, { retain: true });
  logEvent("Room", topic, state);
}

function syncSwitchStates(topic, payload) {
  document.querySelectorAll(".switch input").forEach(input => {
    if (topic === input.dataset.toggle + "/state") {
      input.checked = (payload.toUpperCase() === "ON");
    }
  });
}

// ---------------------
// 6. MODES & SCHEDULES
// ---------------------
function setMode(client, mode) {
  document.getElementById("modeHint").textContent = `Current: ${mode}`;
  logEvent("Mode", "Set to", mode);

  client.publish("mode/set", mode, { retain: true });

  if (mode === "panic") {
    document.querySelectorAll(".switch input").forEach(i => {
      i.checked = false;
      client.publish(i.dataset.toggle, "OFF");
      client.publish(i.dataset.toggle + "/state", "OFF");
    });
    logEvent("Mode", "Panic executed", "All devices OFF");
  }
}

function setupModeButtons(client) {
  document.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => setMode(client, btn.dataset.mode));
  });
}

function saveSchedule(client) {
  const time = document.getElementById("modeStart").value;
  const temp = document.getElementById("autoOffTemp").value;
  logEvent("Schedule", `Saved start=${time}, autoOffTemp=${temp}`);
  client.publish("schedule/set", JSON.stringify({ start: time, autoOffTemp: temp }), { retain: true });
}

// ---------------------
// 7. POWER MONITOR & GRAPH
// ---------------------
function setupPowerMonitor(client) {
  const chartCtx = document.getElementById("usageChart").getContext("2d");
  const usageChart = new Chart(chartCtx, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Power (W)", data: [] }] }
  });

  setInterval(() => {
    updatePowerValues(client, usageChart);
  }, 5000);
}

function updatePowerValues(client, chart) {
  const voltage = (220 + Math.random() * 10).toFixed(1);
  const current = (Math.random() * 10).toFixed(2);
  const power = (voltage * current).toFixed(0);

  document.getElementById("voltage").textContent = voltage;
  document.getElementById("current").textContent = current;
  document.getElementById("power").textContent = power;

  client.publish("power/voltage", voltage, { retain: true });
  client.publish("power/current", current, { retain: true });
  client.publish("power/total", power, { retain: true });

  const time = new Date().toLocaleTimeString();
  chart.data.labels.push(time);
  chart.data.datasets[0].data.push(power);

  if (chart.data.labels.length > 10) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

// ---------------------
// 8. LOG EXTRA FUNCTIONS
// ---------------------
function setupLogExtras() {
  document.getElementById("clearLog").onclick = () => {
    document.getElementById("logBody").innerHTML = "";
  };

  document.getElementById("exportLog").onclick = () => {
    const rows = [["Time", "Event", "Detail"]];
    document.querySelectorAll("#logBody tr").forEach(tr => {
      rows.push([...tr.children].map(td => td.textContent));
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "usage_log.csv";
    a.click();
  };
}

// ---------------------
// 9. INIT APP
// ---------------------
function initApp() {
  const client = setupMQTT();
  setupRoomSwitches(client);
  setupModeButtons(client);
  setupPowerMonitor(client);

  document.querySelector("[data-value='LOCK']").onclick = () => lockDoor(client);
  document.querySelector("[data-value='UNLOCK']").onclick = () => unlockDoor(client);
  document.getElementById("sendOtp").onclick = () => sendOTP(client);
  document.getElementById("saveSchedule").onclick = () => saveSchedule(client);
  setupLogExtras();
}

// Start the app
initApp();
