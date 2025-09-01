// =====================
// Loki Home • app.js
// Modular control script
// =====================

// ----- MQTT Setup -----
const brokerUrl = "wss://0d10497a97ea4359bf376f755d59da27.s1.eu.hivemq.cloud:8884/mqtt";

const options = {
  username: "lokeshm19",
  password: "Lokesh@19",
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
};

const client = mqtt.connect(brokerUrl, options);

client.on("connect", () => {
  logEvent("System", "✅ Connected to HiveMQ Cloud");
  document.getElementById("connStatus").textContent = "Online";
  client.subscribe("#"); // subscribe to all topics for demo
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
  const payload = message.toString();
  logEvent("MQTT", topic, payload);

  // --- Sync Switch States ---
  document.querySelectorAll(".switch input").forEach(input => {
    if (topic === input.dataset.toggle + "/state") {
      const isOn = (payload.toUpperCase() === "ON");
      if (input.checked !== isOn) {
        input.checked = isOn;
      }
    }
  });

  // --- Sync Door State ---
  if (topic === "door/state") {
    if (payload === "LOCKED") {
      document.getElementById("doorPill").textContent = "Locked";
      document.getElementById("doorPill").className = "pill locked";
    } else if (payload === "UNLOCKED") {
      document.getElementById("doorPill").textContent = "Unlocked";
      document.getElementById("doorPill").className = "pill unlocked";
    }
  }
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
  client.publish("door/state", "LOCKED"); // broadcast state
  document.getElementById("doorPill").textContent = "Locked";
  document.getElementById("doorPill").className = "pill locked";
  logEvent("Door", "Locked");
}

function unlockDoor() {
  client.publish("door/command", "UNLOCK");
  client.publish("door/state", "UNLOCKED"); // broadcast state
  document.getElementById("doorPill").textContent = "Unlocked";
  document.getElementById("doorPill").className = "pill unlocked";
  logEvent("Door", "Unlocked");
}

document.querySelector("[data-value='LOCK']").onclick = lockDoor;
document.querySelector("[data-value='UNLOCK']").onclick = unlockDoor;

// =====================
// 2. OTP Mock
// =====================
document.getElementById("sendOtp").onclick = () => {
  const mobile = "6360435917";
  const otp = Math.floor(100000 + Math.random() * 900000);
  document.getElementById("otpResult").textContent = `OTP sent to ${mobile}: ${otp}`;
  logEvent("OTP", "Sent to", mobile);
};

// =====================
// 3. Rooms Control (Switch Sync)
// =====================
document.querySelectorAll(".switch input").forEach(input => {
  input.addEventListener("change", e => {
    const topic = e.target.dataset.toggle;
    const state = e.target.checked ? "ON" : "OFF";

    // publish command + broadcast state
    client.publish(topic, state);
    client.publish(topic + "/state", state);

    logEvent("Room", `${topic}`, state);
  });
});

// =====================
// 4. Modes + Schedules
// =====================
function setMode(mode) {
  document.getElementById("modeHint").textContent = `Current: ${mode}`;
  logEvent("Mode", "Set to", mode);

  if (mode === "panic") {
    document.querySelectorAll(".switch input").forEach(i => {
      i.checked = false;
      client.publish(i.dataset.toggle, "OFF");
      client.publish(i.dataset.toggle + "/state", "OFF");
    });
    logEvent("Mode", "Panic executed", "All devices OFF");
  }
}

document.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

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

setInterval(() => {
  const voltage = (220 + Math.random() * 10).toFixed(1);
  const current = (Math.random() * 10).toFixed(2);
  const power = (voltage * current).toFixed(0);

  document.getElementById("voltage").textContent = voltage;
  document.getElementById("current").textContent = current;
  document.getElementById("power").textContent = power;

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
