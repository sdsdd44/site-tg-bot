// ===================================================
// ArthasGPT — Liquid Glass UI
// ===================================================
 
const PROXY_URL = "https://atrhasgpt-proxy.olavashow.workers.dev/";
const MAX_HISTORY = 20;
 
// --- Telegram ---
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
 
// ===================================================
// STATE
// ===================================================
let chats        = {};
let activeChatId = null;
let selectedImage = null;
let isLoading    = false;
 
// ===================================================
// DOM
// ===================================================
const messagesEl      = document.getElementById("messages");
const userInput       = document.getElementById("userInput");
const sendBtn         = document.getElementById("sendBtn");
const menuBtn         = document.getElementById("menuBtn");
const newChatIcon     = document.getElementById("newChatIcon");
const newChatBtn      = document.getElementById("newChatBtn");
const sidebar         = document.getElementById("sidebar");
const sidebarClose    = document.getElementById("sidebarClose");
const overlay         = document.getElementById("overlay");
const chatsList       = document.getElementById("chatsList");
const headerTitle     = document.getElementById("headerTitle");
const attachBtn       = document.getElementById("attachBtn");
const fileInput       = document.getElementById("fileInput");
const imagePreviewBar = document.getElementById("imagePreviewBar");
const previewImg      = document.getElementById("previewImg");
const previewName     = document.getElementById("previewName");
const removeImg       = document.getElementById("removeImg");
 
// ===================================================
// INIT
// ===================================================
function init() {
  loadChats();
  renderChatsList();
 
  if (Object.keys(chats).length === 0) {
    showWelcome();
  } else {
    const ids = Object.keys(chats);
    openChat(ids[ids.length - 1]);
  }
 
  userInput.addEventListener("input", onInput);
  userInput.addEventListener("keydown", onKeyDown);
  sendBtn.addEventListener("click", sendMessage);
  menuBtn.addEventListener("click", openSidebar);
  sidebarClose.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
  newChatBtn.addEventListener("click", () => { createNewChat(); closeSidebar(); });
  newChatIcon.addEventListener("click", createNewChat);
  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", onFileSelect);
  removeImg.addEventListener("click", clearImage);
}
 
// ===================================================
// SIDEBAR
// ===================================================
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
}
 
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}
 
// ===================================================
// CHATS
// ===================================================
function createNewChat(firstMsg) {
  const id    = Date.now().toString();
  const title = firstMsg
    ? firstMsg.slice(0, 30) + (firstMsg.length > 30 ? "…" : "")
    : "Новый чат";
 
  chats[id] = { title, messages: [] };
  openChat(id);
  renderChatsList();
  saveChats();
  return id;
}
 
function openChat(id) {
  activeChatId = id;
  headerTitle.textContent = chats[id]?.title || "ArthasGPT";
 
  messagesEl.innerHTML = "";
 
  const msgs = chats[id]?.messages || [];
  if (msgs.length === 0) {
    showWelcomeInChat();
  } else {
    msgs.forEach(m => {
      if (m.role === "user") renderUserMsg(m.content, m.imageUrl || null);
      else renderBotMsg(m.content);
    });
  }
 
  scrollDown();
  renderChatsList();
  closeSidebar();
}
 
function deleteChat(id, e) {
  e.stopPropagation();
  delete chats[id];
  saveChats();
 
  if (activeChatId === id) {
    const ids = Object.keys(chats);
    if (ids.length > 0) {
      openChat(ids[ids.length - 1]);
    } else {
      activeChatId = null;
      messagesEl.innerHTML = "";
      showWelcome();
      headerTitle.textContent = "ArthasGPT";
    }
  }
  renderChatsList();
}
 
function renderChatsList() {
  chatsList.innerHTML = "";
  const ids = Object.keys(chats).reverse();
 
  if (ids.length === 0) {
    chatsList.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text-dim);font-size:13px;">Нет чатов</div>`;
    return;
  }
 
  ids.forEach(id => {
    const item = document.createElement("div");
    item.className = "chat-item" + (id === activeChatId ? " active" : "");
    item.innerHTML = `
      <span class="chat-item-text">${escHtml(chats[id].title)}</span>
      <button class="chat-item-del" title="Удалить">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    item.addEventListener("click", () => openChat(id));
    item.querySelector(".chat-item-del").addEventListener("click", (e) => deleteChat(id, e));
    chatsList.appendChild(item);
  });
}
 
// ===================================================
// WELCOME
// ===================================================
function showWelcome() {
  messagesEl.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-glyph">✦</div>
      <div class="welcome-title">ArthasGPT</div>
      <div class="welcome-sub">Чем могу помочь сегодня?</div>
      <div class="welcome-cards">
        <div class="welcome-card" onclick="setPrompt('Объясни что такое квантовые компьютеры')">
          <span class="card-icon">⟡</span>Квантовые компьютеры
        </div>
        <div class="welcome-card" onclick="setPrompt('Напиши код простого сайта на HTML')">
          <span class="card-icon">◈</span>Сайт на HTML
        </div>
        <div class="welcome-card" onclick="setPrompt('Придумай идею для проекта на Python')">
          <span class="card-icon">◇</span>Идея Python-проекта
        </div>
        <div class="welcome-card" onclick="setPrompt('Что такое Liquid Glass дизайн?')">
          <span class="card-icon">◉</span>Liquid Glass дизайн
        </div>
      </div>
    </div>`;
}
 
function showWelcomeInChat() {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;justify-content:center;flex:1;color:var(--text-dim);font-size:13.5px;padding:40px;text-align:center;letter-spacing:0.01em;";
  el.textContent = "Начни диалог — напиши что-нибудь";
  messagesEl.appendChild(el);
}
 
function setPrompt(text) {
  userInput.value = text;
  onInput();
  userInput.focus();
}
 
// ===================================================
// INPUT
// ===================================================
function onInput() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
  updateSendBtn();
}
 
function onKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
}
 
function updateSendBtn() {
  sendBtn.disabled = isLoading || (userInput.value.trim() === "" && !selectedImage);
}
 
// ===================================================
// FILE
// ===================================================
function onFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("Только изображения!"); return; }
  if (file.size > 20 * 1024 * 1024) { alert("Максимум 20 МБ"); return; }
 
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    selectedImage = { base64: dataUrl.split(",")[1], type: file.type, name: file.name, dataUrl };
    previewImg.src = dataUrl;
    previewName.textContent = file.name;
    imagePreviewBar.style.display = "flex";
    attachBtn.classList.add("active");
    updateSendBtn();
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
}
 
function clearImage() {
  selectedImage = null;
  imagePreviewBar.style.display = "none";
  attachBtn.classList.remove("active");
  previewImg.src = "";
  updateSendBtn();
}
 
// ===================================================
// SEND
// ===================================================
async function sendMessage() {
  if (isLoading) return;
  const text  = userInput.value.trim();
  const image = selectedImage;
  if (!text && !image) return;
 
  if (!activeChatId || !chats[activeChatId]) createNewChat(text || "Фото");
 
  if (chats[activeChatId].messages.length === 0) {
    const title = (text || "Фото").slice(0, 35) + ((text || "Фото").length > 35 ? "…" : "");
    chats[activeChatId].title = title;
    headerTitle.textContent   = title;
  }
 
  const stub = messagesEl.querySelector("[style*='Начни диалог']");
  if (stub) stub.remove();
  const ws = messagesEl.querySelector(".welcome-screen");
  if (ws) ws.remove();
 
  renderUserMsg(text, image?.dataUrl || null);
  chats[activeChatId].messages.push({ role: "user", content: text, imageUrl: image?.dataUrl || null });
 
  const apiMessages = buildApiMessages();
  userInput.value = "";
  userInput.style.height = "auto";
  clearImage();
 
  setLoading(true);
  const typingEl = appendTyping();
  const answer   = await askAI(apiMessages);
  typingEl.remove();
  setLoading(false);
 
  renderBotMsg(answer);
  chats[activeChatId].messages.push({ role: "assistant", content: answer });
  trimMessages();
  saveChats();
  renderChatsList();
}
 
// ===================================================
// API
// ===================================================
function buildApiMessages() {
  return (chats[activeChatId]?.messages || []).map(m => {
    if (m.imageUrl) {
      return {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: m.imageUrl } },
          { type: "text", text: m.content || "Что на этом изображении?" }
        ]
      };
    }
    return { role: m.role, content: m.content };
  });
}
 
async function askAI(messages) {
  try {
    const resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await resp.json();
    if (!resp.ok) return `Ошибка: ${data?.error || "Неизвестная ошибка"}`;
    return data.answer || "Пустой ответ.";
  } catch (err) {
    console.error(err);
    return "Нет соединения с сервером.";
  }
}
 
// ===================================================
// RENDER
// ===================================================
function renderUserMsg(text, imageDataUrl) {
  const group  = document.createElement("div");
  group.className = "msg-group user";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
 
  if (imageDataUrl) {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.className = "msg-img";
    img.loading = "lazy";
    bubble.appendChild(img);
  }
  if (text) {
    const span = document.createElement("span");
    span.textContent = text;
    bubble.appendChild(span);
  }
 
  group.appendChild(bubble);
  group.appendChild(makeTime());
  messagesEl.appendChild(group);
  scrollDown();
}
 
function renderBotMsg(text) {
  const group  = document.createElement("div");
  group.className = "msg-group bot";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);
 
  group.appendChild(bubble);
  group.appendChild(makeTime());
  messagesEl.appendChild(group);
  scrollDown();
}
 
function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "typing-wrap";
  wrap.innerHTML = `<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  messagesEl.appendChild(wrap);
  scrollDown();
  return wrap;
}
 
function makeTime() {
  const el = document.createElement("div");
  el.className = "msg-time";
  const now = new Date();
  el.textContent = now.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  return el;
}
 
// ===================================================
// FORMAT
// ===================================================
function formatText(raw) {
  let s = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
 
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = "code_" + Math.random().toString(36).slice(2);
    return `<pre><button class="copy-btn" onclick="copyCode('${id}')">копировать</button><code id="${id}">${code.trim()}</code></pre>`;
  });
 
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  s = s.replace(/\n/g, "<br>");
  return s;
}
 
function copyCode(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.previousElementSibling;
    if (btn) {
      btn.textContent = "скопировано ✓";
      setTimeout(() => { btn.textContent = "копировать"; }, 2000);
    }
  });
}
 
// ===================================================
// STATE HELPERS
// ===================================================
function setLoading(val) {
  isLoading = val;
  userInput.disabled = val;
  updateSendBtn();
}
 
function trimMessages() {
  if (!activeChatId) return;
  const msgs = chats[activeChatId].messages;
  if (msgs.length > MAX_HISTORY) {
    chats[activeChatId].messages = msgs.slice(-MAX_HISTORY);
  }
}
 
// ===================================================
// LOCALSTORAGE
// ===================================================
function saveChats() {
  try {
    const toSave = {};
    Object.keys(chats).forEach(id => {
      toSave[id] = {
        title: chats[id].title,
        messages: chats[id].messages.map(m => ({ role: m.role, content: m.content }))
      };
    });
    localStorage.setItem("arthasgpt_chats", JSON.stringify(toSave));
  } catch (e) { console.warn("localStorage:", e); }
}
 
function loadChats() {
  try {
    const raw = localStorage.getItem("arthasgpt_chats");
    if (raw) chats = JSON.parse(raw);
  } catch (e) { chats = {}; }
}
 
// ===================================================
// UTILS
// ===================================================
function scrollDown() {
  requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
}
 
function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
 
// ===================================================
// START
// ===================================================
init();
