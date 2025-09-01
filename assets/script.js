// =====================
// Loki Home • app.js
// Modular control script
// =====================

// ----- MQTT Setup -----
// Replace with your HiveMQ Cloud cluster details
const brokerUrl = "wss://0d10497a97ea4359bf376f755d59da27.s1.eu.hivemq.cloud:8884/mqtt";

// Use the username & password you created in HiveMQ Cloud console
const options = {
  username: "lokeshm19",
  password: "Lokesh@19",
  clean: true,   // start with a fresh session
  reconnectPeriod: 1000, // auto reconnect (ms)
  connectTimeout: 30 * 1000, // 30 seconds
};

// Connect
const client = mqtt.connect(brokerUrl, options);

client.on("connect", () => {
  logEvent("System", "✅ Connected to HiveMQ Cloud");
  document.getElementById("connStatus").textContent = "Online";
  client.subscribe("#"); // subscribe all for demo
});

client.on("error", (err) => {
  console.error("MQTT Error:", err);
  logEvent("System", "❌ Connection error");
});

client.on("close", () => {
  logEvent("System", "🔌 Disconnected from broker");
  document.getElementById("connStatus").textContent = "Offline";
});

client.on("message", (topic, message) => {
  logEvent("MQTT", `${topic}`, message.toString());
});

// Utility: log actions
function logEvent(event, detail, extra = "") {
  const tbody = document.getElementById("logBody");
  const row = document.createElement("tr");
  row.innerHTML = `<td>${new Date().toLocaleTimeString()}</td>
                   <td>${event}</td>
                   <td>${detail} ${extra}</td>`;
  tbody.prepend(row);
}

// =====================
// 1. Door & Security
// =====================
function lockDoor() {
  client.publish("door/command", "LOCK");
  document.getElementById("doorPill").textContent = "Locked";
  document.getElementById("doorPill").className = "pill locked";
  logEvent("Door", "Locked");
}

function unlockDoor() {
  client.publish("door/command", "UNLOCK");
  document.getElementById("doorPill").textContent = "Unlocked";
  document.getElementById("doorPill").className = "pill unlocked";
  logEvent("Door", "Unlocked");
}

// Attach listeners
document.querySelector("[data-value='LOCK']").onclick = lockDoor;
document.querySelector("[data-value='UNLOCK']").onclick = unlockDoor;

// =====================
// 2. OTP Mock
// =====================
document.getElementById("sendOtp").onclick = () => {
  const mobile = "6360435917";
  // NOTE: needs backend for real SMS
  const otp = Math.floor(100000 + Math.random() * 900000);
  document.getElementById("otpResult").textContent = `OTP sent to ${mobile}: ${otp}`;
  logEvent("OTP", "Sent to", mobile);
};

// =====================
// 3. Rooms Control
// =====================
document.querySelectorAll(".switch input").forEach(input => {
  input.addEventListener("change", e => {
    const topic = e.target.dataset.toggle;
    const room = topic.split("/")[0];
    const device = topic.split("/")[1];
    const state = e.target.checked ? "on" : "off";
    const payload = `${room}_${device}_${state}`;
    client.publish(topic, state.toUpperCase());
    logEvent("Room", `${room} ${device}`, state);
  });
});

// =====================
// 4. Modes + Schedules
// =====================
function setMode(mode) {
  document.getElementById("modeHint").textContent = `Current: ${mode}`;
  logEvent("Mode", "Set to", mode);

  if (mode === "panic") {
    // turn off all lights & fans
    document.querySelectorAll(".switch input").forEach(i => {
      i.checked = false;
      client.publish(i.dataset.toggle, "OFF");
    });
    logEvent("Mode", "Panic executed", "All devices OFF");
  }
}

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

// Schedule Save
document.getElementById("saveSchedule").onclick = () => {
  const time = document.getElementById("modeStart").value;
  const temp = document.getElementById("autoOffTemp").value;
  logEvent("Schedule", `Saved start=${time}, autoOffTemp=${temp}`);
};

// =====================
// 5. Power Monitor + Graph
// =====================
let chartCtx = document.getElementById("usageChart").getContext("2d");
let usageChart = new Chart(chartCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{ label: "Power (W)", data: [] }]
  }
});

// Demo: simulate incoming data
setInterval(() => {
  const voltage = (220 + Math.random() * 10).toFixed(1);
  const current = (Math.random() * 10).toFixed(2);
  const power = (voltage * current).toFixed(0);

  document.getElementById("voltage").textContent = voltage;
  document.getElementById("current").textContent = current;
  document.getElementById("power").textContent = power;

  // Update chart
  let time = new Date().toLocaleTimeString();
  usageChart.data.labels.push(time);
  usageChart.data.datasets[0].data.push(power);
  if (usageChart.data.labels.length > 10) {
    usageChart.data.labels.shift();
    usageChart.data.datasets[0].data.shift();
  }
  usageChart.update();
}, 5000);

// =====================
// 6. Extra: Clear & Export Log
// =====================
document.getElementById("clearLog").onclick = () => {
  document.getElementById("logBody").innerHTML = "";
};

document.getElementById("exportLog").onclick = () => {
  let rows = [["Time", "Event", "Detail"]];
  document.querySelectorAll("#logBody tr").forEach(tr => {
    let cols = [...tr.children].map(td => td.textContent);
    rows.push(cols);
  });
  let csv = rows.map(r => r.join(",")).join("\n");
  let blob = new Blob([csv], { type: "text/csv" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "usage_log.csv";
  a.click();
};
