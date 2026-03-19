const $ = (id) => document.getElementById(id);

const SUPABASE_URL = "https://xdlvqlcjjsvtssaxwcza.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbHZxbGNqanN2dHNzYXh3Y3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTg4NjAsImV4cCI6MjA4ODU5NDg2MH0.NJeiSn6ZJpyz5-c0CIt0eJBwuJ6Vbawa5VBuTg-iBpA";
const APP_URL = "https://focus-garden-iota.vercel.app";

async function loadState() {
  const data = await chrome.storage.local.get(["accessToken", "userId", "userEmail", "recentLogs"]);

  if (data.accessToken && data.userId) {
    $("status").className = "status connected";
    $("status").textContent = "Connected to Focus Garden";
    $("setup").style.display = "none";
    $("connected").style.display = "block";
    $("userInfo").textContent = `Logged in as ${data.userEmail}`;
  }

  if (data.recentLogs) {
    const logEl = $("log");
    logEl.innerHTML = "";
    for (const entry of data.recentLogs.slice(-5)) {
      const div = document.createElement("div");
      div.className = `log-entry ${entry.success ? "success" : ""}`;
      div.textContent = entry.text;
      logEl.appendChild(div);
    }
  }
}

$("saveBtn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value.trim();

  if (!email || !password) {
    $("error").textContent = "Please enter email and password";
    $("error").style.display = "block";
    return;
  }

  $("status").className = "status loading";
  $("status").textContent = "Connecting...";
  $("error").style.display = "none";

  try {
    // Authenticate with Supabase
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.error || !data.access_token) {
      $("status").className = "status disconnected";
      $("status").textContent = "Connection failed";
      $("error").textContent = data.error_description || data.error || "Login failed";
      $("error").style.display = "block";
      return;
    }

    await chrome.storage.local.set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user.id,
      userEmail: email,
      appUrl: APP_URL,
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
    });

    loadState();
  } catch (err) {
    $("status").className = "status disconnected";
    $("status").textContent = "Connection failed";
    $("error").textContent = "Network error. Check your connection.";
    $("error").style.display = "block";
  }
});

$("disconnectBtn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["accessToken", "refreshToken", "userId", "userEmail"]);
  $("status").className = "status disconnected";
  $("status").textContent = "Disconnected";
  $("setup").style.display = "block";
  $("connected").style.display = "none";
  $("userInfo").textContent = "";
});

loadState();
