// Content script for neetcode.io
// Captures code, errors, and accepted submissions — syncs to Focus Garden

(function () {
  console.log("[Focus Garden] Content script loaded on:", window.location.href);
  let lastSynced = "";
  let errorsLog = [];
  let submissionCount = 0;

  function getProblemInfo() {
    // URLs: /problems/subsets or /problems/subsets/history?...
    const path = window.location.pathname;
    const match = path.match(/\/problems\/([^/]+)/);
    if (!match) return null;

    const slug = match[1];

    // Get problem name from the page
    // NeetCode shows it in breadcrumb, tabs, or heading
    let name = "";

    // Try the "Question" tab area or page heading
    const headings = document.querySelectorAll("h1, h2, h3");
    for (const h of headings) {
      const text = h.textContent?.trim();
      if (text && text !== "Accepted" && text.length > 2 && text.length < 100) {
        name = text;
        break;
      }
    }

    // Fallback: convert slug to title
    if (!name) {
      name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    // Clean up
    name = name.replace(/\s*[-|]?\s*NeetCode.*$/i, "").trim();
    const numberMatch = name.match(/^(\d+)\.\s*/);
    const number = numberMatch ? parseInt(numberMatch[1]) : null;
    name = name.replace(/^\d+\.\s*/, "");

    // Get problem description from Question tab if visible
    const descEl = document.querySelector("[class*='description'], [class*='problem-statement'], [class*='question-content']");
    const description = descEl ? descEl.textContent.trim().slice(0, 1000) : "";

    return { slug, name, number, description };
  }

  function getCode() {
    // NeetCode uses Monaco editor — get code from view lines
    const monacoLines = document.querySelectorAll(".view-lines .view-line");
    if (monacoLines.length > 0) {
      return Array.from(monacoLines).map(l => l.textContent).join("\n");
    }

    // Try the code block shown in submission history (the <pre> or code section)
    const codeBlocks = document.querySelectorAll("pre, code");
    for (const block of codeBlocks) {
      const text = block.textContent || "";
      if (text.includes("class Solution") || text.includes("def ") || text.includes("function")) {
        return text;
      }
    }

    return "";
  }

  function getLanguage() {
    // NeetCode shows "Python", "Code | Python", etc.
    const langEls = document.querySelectorAll("button, span, div");
    for (const el of langEls) {
      const text = el.textContent?.trim();
      if (text && ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "C#", "Ruby", "Swift", "Kotlin"].includes(text)) {
        return text;
      }
    }
    // Check for "Code | Python" pattern
    const codeLabel = document.body.innerText.match(/Code\s*[|]\s*(\w+)/);
    if (codeLabel) return codeLabel[1];
    return "Python";
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
    const bodyText = document.body.innerText;

    // NeetCode shows "Accepted" prominently + "You have successfully completed this problem!"
    if (bodyText.includes("You have successfully completed this problem") ||
        bodyText.includes("Passed test cases")) {
      // Verify "Accepted" text is also present
      const acceptedEls = document.querySelectorAll("*");
      for (const el of acceptedEls) {
        if (el.childElementCount > 3) continue;
        const text = el.textContent?.trim();
        if (text && (text === "Accepted" || text.startsWith("Accepted"))) {
          console.log("[Focus Garden] Detected Accepted!", text);
          return "accepted";
        }
      }
    }

    // Also detect from the output/console area at bottom
    const outputArea = document.querySelector("[class*='output'], [class*='console'], [class*='result']");
    if (outputArea) {
      const outputText = outputArea.textContent || "";
      if (outputText.includes("Accepted") && outputText.includes("successfully completed")) {
        console.log("[Focus Garden] Detected Accepted in output area!");
        return "accepted";
      }
    }

    // Detect errors
    for (const errorType of ["Wrong Answer", "Time Limit Exceeded", "Runtime Error",
      "Memory Limit Exceeded", "Compile Error"]) {
      if (bodyText.includes(errorType)) {
        // Make sure it's a result, not just text in the problem description
        const resultEls = document.querySelectorAll("*");
        for (const el of resultEls) {
          if (el.childElementCount === 0 && el.textContent?.trim() === errorType) {
            console.log("[Focus Garden] Detected error:", errorType);
            return errorType;
          }
        }
      }
    }

    return null;
  }

  async function syncProblem(problemInfo) {
    if (lastSynced === problemInfo.slug) return;
    lastSynced = problemInfo.slug;

    const data = await chrome.storage.local.get(["appUrl", "supabaseUrl", "supabaseKey"]);
    if (!data.supabaseUrl || !data.supabaseKey) {
      console.log("[Focus Garden] Not connected — skipping sync");
      return;
    }

    const appUrl = data.appUrl || "https://focus-garden-iota.vercel.app";
    const code = getCode();
    const language = getLanguage();

    console.log("[Focus Garden] Syncing:", problemInfo.name, "Language:", language);

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

      console.log("[Focus Garden] Sync complete!");
      showToast(problemInfo.name, errorsLog.length);
      errorsLog = [];
      submissionCount = 0;
    } catch (err) {
      console.error("[Focus Garden] Sync failed:", err);
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

  // Watch on any problem page (including /history subpath)
  if (window.location.pathname.includes("/problems/")) {
    console.log("[Focus Garden] Watching for submission results on:", window.location.pathname);

    // Check immediately (in case page already shows Accepted, e.g. history page)
    setTimeout(() => {
      const result = checkForResult();
      if (result === "accepted") {
        const info = getProblemInfo();
        if (info) syncProblem(info);
      }
    }, 2000);

    // Also observe DOM changes for live submissions
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
