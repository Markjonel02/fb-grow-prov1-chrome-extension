// FB Grow Pro — Background Service Worker v2

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("schedulerTick", { periodInMinutes: 1 });
  console.log("FB Grow Pro installed.");
});

// ── Scheduler tick ───────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "schedulerTick") checkScheduledPosts();
});

function checkScheduledPosts() {
  chrome.storage.local.get(["scheduled"], (result) => {
    const posts = result.scheduled || [];
    const now = Date.now();
    let changed = false;

    posts.forEach((post) => {
      if (!post.notified && post.scheduledAt && post.scheduledAt <= now + 60000) {
        post.notified = true;
        changed = true;
        chrome.notifications.create(`post_${post.id}`, {
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: `⏰ Time to post: ${post.title || "Scheduled Post"}`,
          message: (post.content || "").slice(0, 100) + "...",
          priority: 2,
          buttons: [{ title: "Open Facebook" }]
        });
      }
    });

    if (changed) chrome.storage.local.set({ scheduled: posts });
  });
}

chrome.notifications.onButtonClicked.addListener((notifId) => {
  chrome.tabs.create({ url: "https://www.facebook.com" });
});
chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://www.facebook.com" });
});

// ── Message relay from popup → content script ────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "INJECT_POST") {
    chrome.tabs.query({ url: ["*://www.facebook.com/*", "*://facebook.com/*"] }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, msg, sendResponse);
      } else {
        // Open Facebook first, inject after load
        chrome.tabs.create({ url: "https://www.facebook.com" }, (tab) => {
          const onUpdate = (tabId, info) => {
            if (tabId === tab.id && info.status === "complete") {
              chrome.tabs.onUpdated.removeListener(onUpdate);
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, msg, sendResponse);
              }, 2500);
            }
          };
          chrome.tabs.onUpdated.addListener(onUpdate);
        });
      }
    });
    return true; // async
  }

  if (msg.type === "FETCH_TRENDS") {
    fetchTrends().then(sendResponse).catch(() => sendResponse({ error: true }));
    return true;
  }

  if (msg.type === "AI_GENERATE") {
    generateWithClaude(msg.payload).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});

// ── Real-time trends via Google Trends RSS ───────────────────
async function fetchTrends() {
  try {
    const res = await fetch("https://trends.google.com/trends/trendingsearches/daily/rss?geo=US");
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 12);
    return items.map((item) => ({
      title: item.querySelector("title")?.textContent || "",
      traffic: item.querySelector("approx_traffic")?.textContent || "",
    }));
  } catch {
    return [];
  }
}

// ── AI generation via Claude API ─────────────────────────────
async function generateWithClaude(payload) {
  const { apiKey, postType, topic, tone, trends, mentions, groups } = payload;
  if (!apiKey) throw new Error("No API key set");

  const trendStr = trends?.length ? `\nCurrent trending topics: ${trends.slice(0,5).map(t=>t.title).join(", ")}` : "";
  const mentionStr = mentions?.length ? `\nMention these people/pages: ${mentions}` : "";
  const groupStr = groups?.length ? `\nTarget audience: ${groups}` : "";

  const prompt = `You are a social media expert writing for Facebook. Create a ${postType || "post"} about: "${topic}".
Tone: ${tone || "engaging and friendly"}.${trendStr}${mentionStr}${groupStr}

Output a JSON object ONLY (no markdown, no explanation):
{
  "caption": "the full post caption with emojis",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
  "callToAction": "one sentence CTA",
  "bestTime": "suggested best posting time",
  "tip": "one quick engagement tip for this post"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await res.json();
  const text = data.content?.map(c => c.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
