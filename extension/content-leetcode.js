// Content script for leetcode.com/problems/*
// Captures code, errors, and "Accepted" submissions — syncs to Focus Garden

(function () {
  let lastSynced = "";
  let errorsLog = [];
  let submissionCount = 0;

  function getProblemInfo() {
    const path = window.location.pathname;
    const match = path.match(/\/problems\/([^/]+)/);
    if (!match) return null;

    const slug = match[1];

    // Get problem title
    const titleEl = document.querySelector('[data-cy="question-title"]') ||
      document.querySelector("div.text-title-large") ||
      document.querySelector("a[href*='/problems/'] span");
    let name = titleEl ? titleEl.textContent.trim() : "";
    const numberMatch = name.match(/^(\d+)\.\s*/);
    const number = numberMatch ? parseInt(numberMatch[1]) : null;
    name = name.replace(/^\d+\.\s*/, "") || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Get problem description
    const descEl = document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector("div.elfjS") ||
      document.querySelector("[class*='question-content']");
    const description = descEl ? descEl.textContent.trim().slice(0, 1000) : "";

    return { slug, name, number, description };
  }

  function getCode() {
    // Try to get code from Monaco editor or CodeMirror
    const monacoLines = document.querySelectorAll(".view-lines .view-line");
    if (monacoLines.length > 0) {
      return Array.from(monacoLines).map(l => l.textContent).join("\n");
    }

    // Try CodeMirror
    const cmEl = document.querySelector(".CodeMirror");
    if (cmEl && cmEl.CodeMirror) {
      return cmEl.CodeMirror.getValue();
    }

    // Try textarea fallback
    const textarea = document.querySelector("textarea[name='typed-code']");
    if (textarea) return textarea.value;

    return "";
  }

  function getLanguage() {
    const langBtn = document.querySelector("[class*='lang-btn']") ||
      document.querySelector("button[id*='lang']") ||
      document.querySelector("[data-cy='lang-select']");
    if (langBtn) return langBtn.textContent.trim();

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    return params.get("lang") || "unknown";
  }

  function captureError(resultText) {
    submissionCount++;
    errorsLog.push({
      attempt: submissionCount,
      result: resultText.slice(0, 500),
      timestamp: new Date().toISOString(),
      code_snapshot: getCode().slice(0, 2000),
    });
    // Keep last 10 errors
    if (errorsLog.length > 10) errorsLog = errorsLog.slice(-10);
  }

  function checkForResult() {
    // Check for submission result
    const resultEl = document.querySelector('[data-e2e-locator="submission-result"]');
    if (resultEl) {
      const text = resultEl.textContent.trim();
      if (text === "Accepted") return "accepted";
      if (text) return text; // Wrong Answer, TLE, etc.
    }

    // Alternative selectors
    const spans = document.querySelectorAll("span[class*='text-']");
    for (const span of spans) {
      const text = span.textContent.trim();
      if (text === "Accepted" && span.childElementCount === 0) {
        const color = getComputedStyle(span).color;
        if (color.includes("45, 181") || color.includes("34, 197")) {
          return "accepted";
        }
      }
      if ((text === "Wrong Answer" || text === "Time Limit Exceeded" ||
        text === "Runtime Error" || text === "Memory Limit Exceeded") &&
        span.childElementCount === 0) {
        return text;
      }
    }

    return null;
  }

  async function syncProblem(problemInfo) {
    if (lastSynced === problemInfo.slug) return;
    lastSynced = problemInfo.slug;

    const data = await chrome.storage.local.get(["appUrl", "accessToken"]);
    if (!data.accessToken) return;

    const appUrl = data.appUrl || "https://focus-garden-iota.vercel.app";
    const code = getCode();
    const language = getLanguage();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.accessToken}`,
    };

    try {
      await fetch(`${appUrl}/api/neetcode-sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          problem_name: problemInfo.name,
          problem_number: problemInfo.number,
          problem_slug: problemInfo.slug,
        }),
      });

      await fetch(`${appUrl}/api/coding-notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          problem_name: problemInfo.name,
          problem_number: problemInfo.number,
          problem_slug: problemInfo.slug,
          problem_description: problemInfo.description,
          submitted_code: code.slice(0, 3000),
          errors_log: errorsLog,
          language,
        }),
      });

      const logs = (await chrome.storage.local.get("recentLogs")).recentLogs || [];
      logs.push({
        text: `${new Date().toLocaleTimeString()} - Solved: ${problemInfo.name} (${errorsLog.length} attempts)`,
        success: true,
      });
      await chrome.storage.local.set({ recentLogs: logs.slice(-20) });

      showToast(problemInfo.name, errorsLog.length);

      // Reset for next problem
      errorsLog = [];
      submissionCount = 0;
    } catch (err) {
      console.error("Focus Garden sync failed:", err);
    }
  }

  function showToast(problemName, attempts) {
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99999;background:#22c55e;color:white;padding:12px 20px;border-radius:12px;font-family:system-ui;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all 0.3s;opacity:0;transform:translateY(10px);max-width:300px;";
    toast.innerHTML = `<div>Focus Garden synced!</div><div style="font-size:11px;font-weight:400;opacity:0.85;margin-top:2px;">"${problemName}" — ${attempts > 0 ? attempts + " attempts logged" : "First try!"}</div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; });
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 4000);
  }

  // Watch for submission results
  let lastResult = null;
  const observer = new MutationObserver(() => {
    const result = checkForResult();
    if (result && result !== lastResult) {
      lastResult = result;
      if (result === "accepted") {
        const info = getProblemInfo();
        if (info) syncProblem(info);
      } else {
        captureError(result);
      }
      // Reset lastResult after a delay so we can detect the next submission
      setTimeout(() => { lastResult = null; }, 3000);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
