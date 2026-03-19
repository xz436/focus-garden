const $ = (id) => document.getElementById(id);

async function loadState() {
  const data = await chrome.storage.local.get(["appUrl", "supabaseUrl", "supabaseKey", "recentLogs"]);

  if (data.supabaseUrl && data.supabaseKey) {
    $("status").className = "status connected";
    $("status").textContent = "Connected to Focus Garden";
    $("setup").style.display = "none";
    $("connected").style.display = "block";
  } else {
    $("appUrl").value = data.appUrl || "https://focus-garden-iota.vercel.app";
    $("supabaseUrl").value = data.supabaseUrl || "";
    $("supabaseKey").value = data.supabaseKey || "";
  }

  // Show recent logs
  if (data.recentLogs) {
    const logEl = $("log");
    for (const entry of data.recentLogs.slice(-5)) {
      const div = document.createElement("div");
      div.className = `log-entry ${entry.success ? "success" : ""}`;
      div.textContent = entry.text;
      logEl.appendChild(div);
    }
  }
}

$("saveBtn").addEventListener("click", async () => {
  const appUrl = $("appUrl").value.trim();
  const supabaseUrl = $("supabaseUrl").value.trim();
  const supabaseKey = $("supabaseKey").value.trim();

  if (!supabaseUrl || !supabaseKey) {
    $("status").className = "status disconnected";
    $("status").textContent = "Please fill in all fields";
    return;
  }

  await chrome.storage.local.set({ appUrl, supabaseUrl, supabaseKey });
  loadState();
});

$("disconnectBtn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["supabaseUrl", "supabaseKey"]);
  $("status").className = "status disconnected";
  $("status").textContent = "Disconnected";
  $("setup").style.display = "block";
  $("connected").style.display = "none";
});

loadState();
