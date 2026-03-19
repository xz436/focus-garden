// Content script for neetcode.io
// Captures code, errors, and accepted submissions — syncs to Focus Garden

(function () {
  let lastSynced = "";
  let errorsLog = [];
  let submissionCount = 0;

  function getProblemInfo() {
    const path = window.location.pathname;
    const match = path.match(/\/problems\/([^/]+)/);
    if (!match) return null;

    const slug = match[1];

    // Get problem name from heading or title
    const titleEl = document.querySelector("h1, [class*='title']");
    let name = titleEl ? titleEl.textContent.trim() : "";
    name = name.replace(/\s*[-|]?\s*NeetCode.*$/i, "").trim();
    const numberMatch = name.match(/^(\d+)\.\s*/);
    const number = numberMatch ? parseInt(numberMatch[1]) : null;
    name = name.replace(/^\d+\.\s*/, "") ||
      slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Get problem description
    const descEl = document.querySelector("[class*='description'], [class*='problem-statement'], .tab-pane.active");
    const description = descEl ? descEl.textContent.trim().slice(0, 1000) : "";

    return { slug, name, number, description };
  }

  function getCode() {
    // NeetCode uses Monaco or CodeMirror
    const monacoLines = document.querySelectorAll(".view-lines .view-line");
    if (monacoLines.length > 0) {
      return Array.from(monacoLines).map(l => l.textContent).join("\n");
    }

    const cmEl = document.querySelector(".CodeMirror");
    if (cmEl && cmEl.CodeMirror) return cmEl.CodeMirror.getValue();

    // Try any code-like textarea
    const codeArea = document.querySelector("textarea[class*='code'], textarea[class*='editor']");
    if (codeArea) return codeArea.value;

    return "";
  }

  function getLanguage() {
    const langEl = document.querySelector("[class*='language'], [class*='lang-select'], select[class*='lang']");
    if (langEl) return langEl.textContent?.trim() || langEl.value || "unknown";
    return "unknown";
  }

  function captureError(resultText) {
    submissionCount++;
    errorsLog.push({
      attempt: submissionCount,
      result: resultText.slice(0, 500),
      timestamp: new Date().toISOString(),
      code_snapshot: getCode().slice(0, 2000),
    });
    if (errorsLog.length > 10) errorsLog = errorsLog.slice(-10);
  }

  function checkForResult() {
    const allEls = document.querySelectorAll("span, div, p");
    for (const el of allEls) {
      if (el.childElementCount > 0) continue;
      const text = el.textContent?.trim();
      if (!text) continue;

      if (text === "Accepted") {
        const style = getComputedStyle(el);
        if (style.color.includes("45, 181") || style.color.includes("34, 197") ||
          style.color.includes("22, 163") ||
          el.className?.includes("green") || el.className?.includes("success")) {
          return "accepted";
        }
      }

      if (["Wrong Answer", "Time Limit Exceeded", "Runtime Error",
        "Memory Limit Exceeded", "Compile Error"].includes(text)) {
        return text;
      }
    }
    return null;
  }

  async function syncProblem(problemInfo) {
    if (lastSynced === problemInfo.slug) return;
    lastSynced = problemInfo.slug;

    const data = await chrome.storage.local.get(["appUrl", "supabaseUrl", "supabaseKey"]);
    if (!data.supabaseUrl || !data.supabaseKey) return;

    const appUrl = data.appUrl || "https://focus-garden-iota.vercel.app";
    const code = getCode();
    const language = getLanguage();

    try {
      await fetch(`${appUrl}/api/neetcode-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_name: problemInfo.name,
          problem_number: problemInfo.number,
          problem_slug: problemInfo.slug,
        }),
      });

      await fetch(`${appUrl}/api/coding-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  if (window.location.pathname.includes("/problems/")) {
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
        setTimeout(() => { lastResult = null; }, 3000);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
})();
