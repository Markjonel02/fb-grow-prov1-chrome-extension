// FB Grow Pro — Popup Script v3 (Page-Optimized)

// ── State ─────────────────────────────────────────────────────
let selectedPostType = "post";
let mentions = [];
let groups = [];
let currentAIResult = null;
let trends = [];
let activeFBTab = null;
let pageInfo = null;

const POST_ICONS = { post:"📝", reel:"🎬", story:"✨", photo:"📷", event:"📅", poll:"📊" };

const TIPS = [
  { icon:"📅", title:"Post 3–5x Per Week", body:"Consistency trains the algorithm. Irregular posting tanks your reach; steady cadence builds it." },
  { icon:"🎬", title:"Lead with Native Video", body:"Facebook gives native video (especially Reels) up to 3× more organic reach than link posts." },
  { icon:"⏰", title:"Post Wed–Fri, 9–11 AM", body:"Midweek mornings consistently outperform other slots. Avoid Sunday evenings." },
  { icon:"💬", title:"Reply Within 60 Minutes", body:"Early comment replies signal engagement to the algorithm — dramatically boosting distribution." },
  { icon:"❓", title:"End Posts with a Question", body:"Posts ending in questions get 100%+ more comments. More comments = more reach." },
  { icon:"🔁", title:"Cross-Post to Stories", body:"Share every feed post to your Story. Zero extra effort, double the eyeballs." },
  { icon:"🏷️", title:"Tag Relevant Pages", body:"Tagging related pages (with permission) exposes your post to their followers too." },
  { icon:"📊", title:"Review Insights Weekly", body:"Double down on your top 2 formats. Cut what's underperforming. Adapt fast." },
  { icon:"🎯", title:"Share to Relevant Groups", body:"Posting in niche groups where your content is welcome can 10× organic reach overnight." },
  { icon:"🌄", title:"Use High-Quality Visuals", body:"Posts with crisp, eye-catching images or thumbnails get 87% more interactions." },
];

// ── Tab Navigation ────────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("on"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("on"));
    btn.classList.add("on");
    const panel = document.getElementById(`panel-${btn.dataset.tab}`);
    if (panel) panel.classList.add("on");
    if (btn.dataset.tab === "trends") loadTrends();
    if (btn.dataset.tab === "schedule") renderSchedule();
    if (btn.dataset.tab === "tips") renderTips();
    if (btn.dataset.tab === "settings") loadSettings();
  });
});

// ── Post Type Selector ────────────────────────────────────────
document.querySelectorAll("#postTypeRow .tag").forEach(tag => {
  tag.addEventListener("click", () => {
    document.querySelectorAll("#postTypeRow .tag").forEach(t => t.classList.remove("on"));
    tag.classList.add("on");
    selectedPostType = tag.dataset.type;
  });
});

// ── Mentions ─────────────────────────────────────────────────
document.getElementById("addMentionBtn").addEventListener("click", () => addChip("mention"));
document.getElementById("mentionInput").addEventListener("keydown", e => { if(e.key==="Enter") addChip("mention"); });

document.getElementById("addGroupBtn").addEventListener("click", () => addChip("group"));
document.getElementById("groupInput").addEventListener("keydown", e => { if(e.key==="Enter") addChip("group"); });

function addChip(type) {
  const input = document.getElementById(type === "mention" ? "mentionInput" : "groupInput");
  const val = input.value.trim();
  if (!val) return;
  const arr = type === "mention" ? mentions : groups;
  if (!arr.includes(val)) { arr.push(val); renderChips(type); }
  input.value = "";
}

function renderChips(type) {
  const arr = type === "mention" ? mentions : groups;
  const container = document.getElementById(type === "mention" ? "mentionChips" : "groupChips");
  container.innerHTML = arr.map((v, i) => `
    <div class="chip">${v} <span onclick="removeChip('${type}',${i})">✕</span></div>
  `).join("");
}

window.removeChip = (type, i) => {
  if (type === "mention") mentions.splice(i, 1); else groups.splice(i, 1);
  renderChips(type);
};

// ── AI Generate ───────────────────────────────────────────────
document.getElementById("generateBtn").addEventListener("click", async () => {
  const topic = document.getElementById("aiTopic").value.trim();
  if (!topic) { toast("Enter a topic first", true); return; }

  const btn = document.getElementById("generateBtn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Generating…`;

  chrome.storage.local.get(["apiKey"], async (s) => {
    const apiKey = s.apiKey || "";
    const trendPick = document.getElementById("aiTrendPick").value;
    const usedTrends = trendPick ? [{ title: trendPick }] : trends.slice(0, 5);

    chrome.runtime.sendMessage({
      type: "AI_GENERATE",
      payload: {
        apiKey,
        postType: selectedPostType,
        topic,
        tone: document.getElementById("aiTone").value,
        trends: usedTrends,
        mentions: mentions.join(", "),
        groups: groups.join(", "),
      }
    }, (res) => {
      btn.disabled = false;
      btn.innerHTML = "✨ Generate with AI";

      if (!res || res.error) {
        // Fallback demo if no API key
        res = buildFallback(topic);
      }

      currentAIResult = res;
      showAIOutput(res);
    });
  });
});

function buildFallback(topic) {
  return {
    caption: `🔥 Big things are happening around "${topic}"!\n\nWe're thrilled to share this with our amazing community. Whether you're new here or a long-time supporter — this one's for you. 💪\n\nDrop a ❤️ if you're as excited as we are!`,
    hashtags: ["trending", "community", "facebook", "organic", "growth"],
    callToAction: "Share this post with someone who needs to see it!",
    bestTime: "Wednesday 9–11 AM",
    tip: "Add a question at the end to boost comments by 100%+"
  };
}

function showAIOutput(res) {
  const out = document.getElementById("aiOutput");
  document.getElementById("aiCaption").textContent = res.caption || "";
  document.getElementById("aiHashtags").innerHTML = (res.hashtags || []).map(h =>
    `<div class="tag hashtag">#${h}</div>`).join("");
  document.getElementById("aiCta").textContent = res.callToAction || "—";
  document.getElementById("aiBestTime").textContent = res.bestTime || "—";
  document.getElementById("aiTip").textContent = "💡 " + (res.tip || "");
  out.classList.add("show");
}

// ── Inject to Facebook (Smart Page Routing) ──────────────────
document.getElementById("injectBtn").addEventListener("click", () => {
  if (!currentAIResult) return;
  const caption = document.getElementById("aiCaption").textContent;
  const hashtags = Array.from(document.querySelectorAll("#aiHashtags .tag"))
    .map(t => t.textContent).join(" ");
  const full = caption + "\n\n" + hashtags;

  const btn = document.getElementById("injectBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending…';

  if (activeFBTab) {
    // Facebook tab already open — inject directly
    chrome.tabs.sendMessage(activeFBTab.id, {
      type: "INJECT_POST",
      payload: { content: full, postType: selectedPostType }
    }, () => {
      btn.disabled = false;
      btn.textContent = "📤 Send to Your Page";
      toast("✅ Content injected into your Page!");
      // Focus the Facebook tab
      chrome.tabs.update(activeFBTab.id, { active: true });
    });
  } else {
    // Open Facebook, then inject
    chrome.runtime.sendMessage({ type: "INJECT_POST", payload: { content: full, postType: selectedPostType } }, () => {
      btn.disabled = false;
      btn.textContent = "📤 Send to Your Page";
      toast("✅ Facebook opened — content ready!");
    });
  }
});

// ── Schedule from AI ──────────────────────────────────────────
document.getElementById("scheduleFromAIBtn").addEventListener("click", () => {
  if (!currentAIResult) return;
  const caption = document.getElementById("aiCaption").textContent;
  // Switch to schedule tab and prefill
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("on"));
  document.querySelector('[data-tab="schedule"]').classList.add("on");
  document.getElementById("panel-schedule").classList.add("on");
  document.getElementById("schedContent").value = caption;
  document.getElementById("schedType").value = selectedPostType;
  renderSchedule();
  toast("Content copied to scheduler!");
});

// ── Trends ────────────────────────────────────────────────────
async function loadTrends() {
  const list = document.getElementById("trendsList");
  list.innerHTML = `<div class="empty"><div class="ico">📡</div><p>Fetching live trends…</p></div>`;

  chrome.runtime.sendMessage({ type: "FETCH_TRENDS" }, (res) => {
    if (!res || !res.length) {
      // Fallback curated trends
      trends = [
        { title: "AI tools for business", traffic: "200K+" },
        { title: "Social media marketing 2025", traffic: "150K+" },
        { title: "Video content strategy", traffic: "120K+" },
        { title: "Facebook organic reach", traffic: "90K+" },
        { title: "Small business tips", traffic: "80K+" },
        { title: "Content creation ideas", traffic: "75K+" },
        { title: "Digital marketing trends", traffic: "70K+" },
        { title: "Engagement hacks", traffic: "65K+" },
      ];
    } else {
      trends = res;
    }
    renderTrendsList();
    populateTrendSelect();
  });
}

document.getElementById("refreshTrendsBtn").addEventListener("click", loadTrends);

function renderTrendsList() {
  const list = document.getElementById("trendsList");
  list.innerHTML = trends.map((t, i) => `
    <div class="trend-item" onclick="useTrend('${escHtml(t.title)}')">
      <div>
        <div class="trend-title">${i+1}. ${escHtml(t.title)}</div>
      </div>
      <div class="trend-traffic">${t.traffic || "Trending"}</div>
    </div>
  `).join("") || `<div class="empty"><div class="ico">😶</div><p>No trends loaded</p></div>`;
}

window.useTrend = (title) => {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("on"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("on"));
  document.querySelector('[data-tab="compose"]').classList.add("on");
  document.getElementById("panel-compose").classList.add("on");
  document.getElementById("aiTopic").value = title;
  toast("Trend loaded into composer!");
};

function populateTrendSelect() {
  const sel = document.getElementById("aiTrendPick");
  sel.innerHTML = `<option value="">— None —</option>` +
    trends.map(t => `<option value="${escHtml(t.title)}">${escHtml(t.title)}</option>`).join("");
}

// ── Schedule ──────────────────────────────────────────────────
function getScheduled(cb) { chrome.storage.local.get(["scheduled"], r => cb(r.scheduled || [])); }
function saveScheduled(arr, cb) { chrome.storage.local.set({ scheduled: arr }, cb); }

document.getElementById("addSchedBtn").addEventListener("click", () => {
  const title = document.getElementById("schedTitle").value.trim();
  const timeVal = document.getElementById("schedTime").value;
  const content = document.getElementById("schedContent").value.trim();
  const postType = document.getElementById("schedType").value;

  if (!title || !timeVal) { toast("Fill in title and date/time", true); return; }
  const ts = new Date(timeVal).getTime();
  if (ts <= Date.now()) { toast("Pick a future time", true); return; }

  const id = `s_${Date.now()}`;
  getScheduled(arr => {
    arr.push({ id, title, scheduledAt: ts, content, postType, notified: false });
    saveScheduled(arr, () => {
      chrome.alarms?.create?.(`sched_${id}`, { when: ts });
      document.getElementById("schedTitle").value = "";
      document.getElementById("schedContent").value = "";
      renderSchedule();
      toast("✓ Post scheduled!");
    });
  });
});

function renderSchedule() {
  getScheduled(arr => {
    arr.sort((a, b) => a.scheduledAt - b.scheduledAt);
    const pending = arr.filter(p => !p.notified).length;
    const done = arr.filter(p => p.notified).length;

    document.getElementById("schedStats").innerHTML = `
      <div class="stat-box"><div class="stat-val">${arr.length}</div><div class="stat-lbl">Total</div></div>
      <div class="stat-box"><div class="stat-val">${pending}</div><div class="stat-lbl">Pending</div></div>
      <div class="stat-box"><div class="stat-val">${done}</div><div class="stat-lbl">Done</div></div>
    `;

    const list = document.getElementById("schedList");
    if (!arr.length) {
      list.innerHTML = `<div class="empty"><div class="ico">📭</div><p>No scheduled posts yet.<br>Use the form above to add one.</p></div>`;
      return;
    }

    list.innerHTML = arr.map(p => {
      const dt = new Date(p.scheduledAt);
      const dateStr = dt.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
      const timeStr = dt.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
      return `
        <div class="sched-item ${p.notified ? "fired" : "pending"}">
          <div class="sched-top">
            <div class="sched-label">${POST_ICONS[p.postType]||"📌"} ${escHtml(p.title)}</div>
            <button class="btn btn-danger" onclick="deleteScheduled('${p.id}')">✕</button>
          </div>
          <div class="sched-time">📅 ${dateStr} · ${timeStr}</div>
          ${p.content ? `<div class="sched-body">${escHtml(p.content.slice(0,80))}${p.content.length>80?"…":""}</div>` : ""}
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
            <span class="badge ${p.notified?"badge-done":"badge-pending"}">${p.notified?"✓ Done":"Pending"}</span>
            <span class="badge badge-type">${p.postType}</span>
            ${!p.notified ? `<button class="btn btn-ghost" style="padding:2px 8px;font-size:9px" onclick="sendNow('${p.id}')">Send Now</button>` : ""}
          </div>
        </div>
      `;
    }).join("");
  });
}

window.deleteScheduled = id => {
  getScheduled(arr => {
    saveScheduled(arr.filter(p => p.id !== id), () => { renderSchedule(); toast("Removed"); });
  });
};

window.sendNow = id => {
  getScheduled(arr => {
    const post = arr.find(p => p.id === id);
    if (!post) return;
    chrome.runtime.sendMessage({ type: "INJECT_POST", payload: { content: post.content, postType: post.postType } }, () => {
      toast("✓ Sent to Facebook!");
      const updated = arr.map(p => p.id === id ? { ...p, notified: true } : p);
      saveScheduled(updated, renderSchedule);
    });
  });
};

// ── Tips ─────────────────────────────────────────────────────
function renderTips() {
  document.getElementById("tipsList").innerHTML = TIPS.map(t => `
    <div class="card" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">
      <div style="font-size:20px;flex-shrink:0">${t.icon}</div>
      <div>
        <div style="font-size:12px;font-weight:700;margin-bottom:3px">${t.title}</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.5">${t.body}</div>
      </div>
    </div>
  `).join("");
}

// ── Settings ─────────────────────────────────────────────────
function loadSettings() {
  chrome.storage.local.get(["apiKey", "fbToken"], s => {
    if (s.apiKey) document.getElementById("apiKeyInput").value = s.apiKey;
    if (s.fbToken) document.getElementById("fbTokenInput").value = s.fbToken;
  });
}

document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const key = document.getElementById("apiKeyInput").value.trim();
  if (!key) { toast("Enter your API key", true); return; }
  chrome.storage.local.set({ apiKey: key }, () => toast("✓ API key saved!"));
});

document.getElementById("saveFbTokenBtn").addEventListener("click", () => {
  const token = document.getElementById("fbTokenInput").value.trim();
  chrome.storage.local.set({ fbToken: token }, () => toast("✓ Token saved!"));
});

document.querySelectorAll(".toggle").forEach(t => {
  t.addEventListener("click", () => t.classList.toggle("on"));
});

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, isErr = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => el.className = "toast", 2400);
}

function escHtml(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Init ─────────────────────────────────────────────────────
(function init() {
  // Set default schedule time to +1hr
  const d = new Date(Date.now() + 3600000);
  const pad = n => String(n).padStart(2,"0");
  document.getElementById("schedTime").value =
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;

  // Auto-load trends in background
  chrome.runtime.sendMessage({ type: "FETCH_TRENDS" }, res => {
    if (res && res.length) { trends = res; populateTrendSelect(); }
  });
})();

// ── Page Status Detection ────────────────────────────────────
function detectFBPageTab() {
  const statusEl = document.getElementById("liveStatus");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && (tab.url?.includes("facebook.com"))) {
      activeFBTab = tab;
      chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_INFO" }, (info) => {
        if (chrome.runtime.lastError || !info) {
          updatePageStatus("fb-open", "Facebook Open");
          return;
        }
        pageInfo = info;
        updatePageStatus("page-ready", `📄 ${info.pageName?.slice(0,22) || "Page"}`);
      });
    } else {
      activeFBTab = null;
      updatePageStatus("no-fb", "Open Facebook →");
      document.getElementById("injectBtn").textContent = "📤 Open Facebook & Send";
    }
  });
}

function updatePageStatus(state, label) {
  const statusEl = document.getElementById("liveStatus");
  const injectBtn = document.getElementById("injectBtn");
  if (state === "page-ready") {
    statusEl.textContent = label;
    statusEl.style.color = "#2dd98f";
    injectBtn.textContent = "📤 Send to Your Page";
  } else if (state === "fb-open") {
    statusEl.textContent = "Facebook Open";
    statusEl.style.color = "#4b8ef5";
    injectBtn.textContent = "📤 Send to Facebook";
  } else {
    statusEl.textContent = label;
    statusEl.style.color = "#f5874b";
    injectBtn.textContent = "📤 Open Facebook & Send";
  }
}

// Run page detection on popup open
detectFBPageTab();
