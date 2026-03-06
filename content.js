// FB Grow Pro — Content Script v3 (Page-Optimized Inject)

let fbgrowFloating = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "INJECT_POST") {
    injectPost(msg.payload).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "GET_PAGE_INFO") {
    sendResponse(getPageInfo());
    return true;
  }
});

function getPageInfo() {
  const metaOg = document.querySelector('meta[property="og:title"]');
  const pageName = metaOg?.content || document.title.replace(" | Facebook","").trim();
  return { pageName, url: window.location.href };
}

async function injectPost({ content, postType, hashtags }) {
  const fullContent = hashtags ? `${content}\n\n${hashtags}` : content;
  await openComposer();
  await sleep(900);
  const input = await findComposerInput();
  if (input) {
    await typeIntoInput(input, fullContent);
    showBadge("✅ Content ready! Review and click Post →", false);
    showFloatingHelper(postType, fullContent);
  } else {
    showBadge("⚠️ Click 'Create Post' on your Page first, then try again.", true);
  }
}

async function openComposer() {
  const selectors = [
    '[aria-label="Create a post"]',
    '[aria-label*="What\'s on your mind"]',
    '[data-testid="status-attachment-mentions-input"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) { el.click(); return; }
  }
  // Fallback: any button with "mind" or "create post" text
  for (const btn of document.querySelectorAll('[role="button"]')) {
    const txt = (btn.textContent + btn.getAttribute("aria-label")).toLowerCase();
    if (txt.includes("mind") || txt.includes("create post")) { btn.click(); return; }
  }
}

async function findComposerInput() {
  const selectors = [
    '[role="dialog"] [contenteditable="true"]',
    '[role="dialog"] [data-lexical-editor="true"]',
    '[data-pagelet*="Composer"] [contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
  ];
  for (let i = 0; i < 8; i++) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    await sleep(500);
  }
  return null;
}

async function typeIntoInput(input, content) {
  input.focus();
  await sleep(200);
  document.execCommand("selectAll", false, null);
  await sleep(100);
  const ok = document.execCommand("insertText", false, content);
  if (!ok) {
    const dt = new DataTransfer();
    dt.setData("text/plain", content);
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
  }
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function showFloatingHelper(postType, content) {
  if (fbgrowFloating) fbgrowFloating.remove();
  const icons = { post:"📝", reel:"🎬", story:"✨", photo:"📷", event:"📅", poll:"📊" };

  if (!document.getElementById("fbgrow-styles")) {
    const s = document.createElement("style");
    s.id = "fbgrow-styles";
    s.textContent = `@keyframes fbgrowSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
  }

  fbgrowFloating = document.createElement("div");
  fbgrowFloating.id = "fbgrow-helper";
  fbgrowFloating.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-size:18px">${icons[postType]||"📝"}</span>
      <strong style="font-size:13px">FB Grow Pro</strong>
      <button id="fbg-close" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#888;font-size:18px;line-height:1">✕</button>
    </div>
    <div style="font-size:11px;color:#2dd98f;font-weight:700;margin-bottom:8px">✅ Content injected into your Page composer</div>
    <div style="font-size:11px;color:#8888aa;line-height:1.6">
      • Add photos/video if needed<br>
      • Verify any @mentions<br>
      • Choose audience (Public / Followers)<br>
      • Click the blue <strong style="color:#e2e4f0">Post</strong> button
    </div>
    <div style="margin-top:12px;display:flex;gap:6px">
      <button id="fbg-copy" style="flex:1;padding:7px;background:#1877f2;color:white;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">📋 Copy Text</button>
      <button id="fbg-dismiss" style="flex:1;padding:7px;background:#1f2133;color:#aaa;border:1px solid #2a2a40;border-radius:7px;font-size:11px;cursor:pointer">Dismiss</button>
    </div>
  `;
  Object.assign(fbgrowFloating.style, {
    position:"fixed", bottom:"24px", right:"24px", zIndex:"999999",
    background:"#0f1018", border:"1px solid #2a2a40", borderRadius:"14px",
    padding:"16px", width:"230px", boxShadow:"0 8px 40px rgba(0,0,0,.6)",
    fontFamily:"system-ui,sans-serif", animation:"fbgrowSlide .3s ease",
  });
  document.body.appendChild(fbgrowFloating);

  document.getElementById("fbg-close").onclick =
  document.getElementById("fbg-dismiss").onclick = () => fbgrowFloating?.remove();
  document.getElementById("fbg-copy").onclick = () => {
    navigator.clipboard.writeText(content).then(() => {
      document.getElementById("fbg-copy").textContent = "✓ Copied!";
      setTimeout(() => { const b = document.getElementById("fbg-copy"); if(b) b.textContent = "📋 Copy Text"; }, 2000);
    });
  };
  setTimeout(() => fbgrowFloating?.remove(), 30000);
}

function showBadge(msg, isError) {
  const b = document.createElement("div");
  Object.assign(b.style, {
    position:"fixed", top:"20px", left:"50%", transform:"translateX(-50%)",
    zIndex:"9999999", background: isError?"#f76b4f":"#2dd98f",
    color: isError?"white":"#001a0e", padding:"10px 22px", borderRadius:"99px",
    fontFamily:"system-ui,sans-serif", fontWeight:"700", fontSize:"12px",
    boxShadow:"0 4px 20px rgba(0,0,0,.4)", maxWidth:"400px", textAlign:"center", transition:"opacity .4s",
  });
  b.textContent = msg;
  document.body.appendChild(b);
  setTimeout(() => { b.style.opacity="0"; setTimeout(() => b.remove(), 400); }, 5000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
