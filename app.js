/**
 * IMMORTAL AI — iOS 26 Style Mini App
 * Telegram Web App with Liquid Glass Design
 */

const PROXY_URL = "https://atrhasgpt-proxy.olavashow.workers.dev/";
const MAX_HISTORY = 20;
const STORAGE_KEY = "immortal_ai_data";

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const state = {
  chats: {},
  activeChatId: null,
  selectedImage: null,
  isLoading: false,
  settings: {
    theme: "dark",
    model: "google/gemini-2.0-flash-001",
    temperature: 0.7,
    maxTokens: 1500
  }
};

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function init() {
  loadState();
  applyTheme(state.settings.theme);
  initTelegramUser();
  renderChatsList();

  if (Object.keys(state.chats).length === 0) {
    showWelcome();
  } else {
    const ids = Object.keys(state.chats);
    openChat(ids[ids.length - 1]);
  }

  bindEvents();
}

function initTelegramUser() {
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    const avatarEl = $(".user-avatar");
    const nameEl = $(".user-name");
    if (avatarEl) avatarEl.textContent = (user.first_name || "I")[0].toUpperCase();
    if (nameEl) nameEl.textContent = user.first_name || "Immortal";
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state.chats = parsed.chats || {};
      state.settings = { ...state.settings, ...parsed.settings };
    }
    const savedTheme = localStorage.getItem("immortal_theme");
    if (savedTheme) state.settings.theme = savedTheme;
  } catch (e) {
    console.warn("Load error:", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      chats: state.chats,
      settings: state.settings
    }));
  } catch (e) {
    console.warn("Save error:", e);
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("immortal_theme", theme);
  $$(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

function bindEvents() {
  // Sidebar
  $("#menuBtn")?.addEventListener("click", openSidebar);
  $("#closeSidebar")?.addEventListener("click", closeSidebar);
  $("#overlay")?.addEventListener("click", () => {
    closeSidebar();
    closeDeleteModal();
  });
  $("#sidebarNewChat")?.addEventListener("click", () => {
    createNewChat();
    closeSidebar();
  });
  
  // New chat button (+)
  $("#newChatBtn")?.addEventListener("click", () => {
    createNewChat();
  });

  // Settings
  $("#settingsBtn")?.addEventListener("click", () => {
    $("#settingsModal")?.classList.add("open");
  });
  $("#closeSettings")?.addEventListener("click", () => {
    $("#settingsModal")?.classList.remove("open");
  });

  // Theme buttons
  $$(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.theme = btn.dataset.theme;
      applyTheme(state.settings.theme);
      saveState();
    });
  });

  // Model select
  $("#modelSelect")?.addEventListener("change", (e) => {
    state.settings.model = e.target.value;
    saveState();
  });

  // Temperature slider
  $("#tempSlider")?.addEventListener("input", (e) => {
    state.settings.temperature = parseFloat(e.target.value);
    $("#tempValue").textContent = state.settings.temperature.toFixed(1);
    saveState();
  });

  // Tokens slider
  $("#tokensSlider")?.addEventListener("input", (e) => {
    state.settings.maxTokens = parseInt(e.target.value);
    $("#tokensValue").textContent = state.settings.maxTokens;
    saveState();
  });

  // Prompt cards
  $$(".prompt-card").forEach(card => {
    card.addEventListener("click", () => {
      setPrompt(card.dataset.prompt);
    });
  });

  // File upload
  $("#attachBtn")?.addEventListener("click", () => {
    $("#fileInput")?.click();
  });
  $("#fileInput")?.addEventListener("change", onFileSelect);
  $("#removeImage")?.addEventListener("click", clearImage);

  // Message input
  $("#messageInput")?.addEventListener("input", onInput);
  $("#messageInput")?.addEventListener("keydown", onKeyDown);
  $("#sendBtn")?.addEventListener("click", sendMessage);

  // Delete confirmation modal
  $("#deleteConfirmBtn")?.addEventListener("click", confirmDeleteChat);
  $("#deleteCancelBtn")?.addEventListener("click", closeDeleteModal);
}

function openSidebar() {
  $("#sidebar")?.classList.add("open");
  $("#overlay")?.classList.add("active");
}

function closeSidebar() {
  $("#sidebar")?.classList.remove("open");
  $("#overlay")?.classList.remove("active");
}

function createNewChat() {
  const id = Date.now().toString();

  state.chats[id] = {
    title: "Новый чат",
    messages: [],
    model: state.settings.model,
    temperature: state.settings.temperature,
    maxTokens: state.settings.maxTokens
  };
  
  state.activeChatId = id;
  renderChatsList();
  showWelcome();
  saveState();
}

function openChat(id) {
  state.activeChatId = id;
  
  const msgs = state.chats[id]?.messages || [];
  const container = $("#messagesContainer");
  
  if (!container) return;
  container.innerHTML = "";

  if (msgs.length === 0) {
    showWelcome();
  } else {
    msgs.forEach(m => {
      if (m.role === "user") {
        renderUserMsg(m.content, m.imageUrl || null);
      } else {
        renderBotMsg(m.content);
      }
    });
  }

  scrollDown();
  renderChatsList();
  closeSidebar();
}

let chatToDelete = null;

function showDeleteModal(id) {
  chatToDelete = id;
  $("#deleteModal")?.classList.add("open");
  $("#overlay")?.classList.add("active");
}

function closeDeleteModal() {
  chatToDelete = null;
  $("#deleteModal")?.classList.remove("open");
  $("#overlay")?.classList.remove("active");
}

function confirmDeleteChat() {
  if (chatToDelete) {
    deleteChat(chatToDelete);
  }
  closeDeleteModal();
}

function deleteChat(id) {
  delete state.chats[id];
  saveState();

  if (state.activeChatId === id) {
    const ids = Object.keys(state.chats);
    if (ids.length > 0) {
      openChat(ids[ids.length - 1]);
    } else {
      state.activeChatId = null;
      showWelcome();
    }
  }
  renderChatsList();
}

function renderChatsList() {
  const container = $("#chatsList");
  if (!container) return;
  container.innerHTML = "";

  const ids = Object.keys(state.chats).reverse();

  if (ids.length === 0) {
    container.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Нет чатов</div>`;
    return;
  }

  ids.forEach(id => {
    const chat = state.chats[id];
    const item = document.createElement("div");
    item.className = "chat-item" + (id === state.activeChatId ? " active" : "");
    item.innerHTML = `
      <span class="chat-item-text">${escHtml(chat.title)}</span>
      <button class="chat-item-del" title="Удалить">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    item.addEventListener("click", () => openChat(id));
    item.querySelector(".chat-item-del").addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteModal(id);
    });
    container.appendChild(item);
  });
}

function showWelcome() {
  const container = $("#messagesContainer");
  if (!container) return;
  
  container.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-icon">✦</div>
      <h1 class="welcome-title">IMMORTAL AI</h1>
      <p class="welcome-sub">Чем могу помочь?</p>
      <div class="prompt-cards">
        <div class="prompt-card" data-prompt="Объясни квантовые компьютеры простыми словами">
          <span class="card-icon">⟡</span>
          <span>Квантовые компьютеры</span>
        </div>
        <div class="prompt-card" data-prompt="Напиши код простого веб-сайта">
          <span class="card-icon">◈</span>
          <span>Написать код</span>
        </div>
        <div class="prompt-card" data-prompt="Помоги придумать идею для проекта">
          <span class="card-icon">◇</span>
          <span>Идея для проекта</span>
        </div>
        <div class="prompt-card" data-prompt="Что такое дизайн интерфейсов?">
          <span class="card-icon">◉</span>
          <span>Дизайн интерфейсов</span>
        </div>
      </div>
    </div>
  `;
  
  $$(".prompt-card").forEach(card => {
    card.addEventListener("click", () => setPrompt(card.dataset.prompt));
  });
}

function setPrompt(text) {
  const input = $("#messageInput");
  if (input) {
    input.value = text;
    onInput();
    input.focus();
  }
}

function onInput() {
  const input = $("#messageInput");
  if (input) {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
    updateSendBtn();
  }
}

function onKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!$("#sendBtn")?.disabled) sendMessage();
  }
}

function updateSendBtn() {
  const btn = $("#sendBtn");
  const input = $("#messageInput");
  if (btn) {
    btn.disabled = state.isLoading || (input?.value.trim() === "" && !state.selectedImage);
  }
}

function onFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Только изображения!");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert("Максимум 20 МБ");
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    state.selectedImage = {
      base64: dataUrl.split(",")[1],
      type: file.type,
      name: file.name,
      dataUrl
    };
    
    $("#previewImg").src = dataUrl;
    $("#previewName").textContent = file.name;
    $("#imagePreview").style.display = "flex";
    $("#attachBtn")?.classList.add("active");
    updateSendBtn();
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

function clearImage() {
  state.selectedImage = null;
  $("#imagePreview").style.display = "none";
  $("#attachBtn")?.classList.remove("active");
  $("#previewImg").src = "";
  updateSendBtn();
}

async function sendMessage() {
  if (state.isLoading) return;

  const text = $("#messageInput")?.value.trim() || "";
  const image = state.selectedImage;

  if (!text && !image) return;

  // Если нет активного чата — создаём новый
  if (!state.activeChatId || !state.chats[state.activeChatId]) {
    const id = Date.now().toString();
    const title = text.slice(0, 28) + (text.length > 28 ? "…" : "") || "Новый чат";
    
    state.chats[id] = {
      title,
      messages: [],
      model: state.settings.model,
      temperature: state.settings.temperature,
      maxTokens: state.settings.maxTokens
    };
    state.activeChatId = id;
  }

  const chat = state.chats[state.activeChatId];
  
  // Обновляем заголовок чата
  if (chat.messages.length === 0) {
    chat.title = text.slice(0, 35) + (text.length > 35 ? "…" : "");
  }

  renderUserMsg(text, image?.dataUrl || null);
  chat.messages.push({ role: "user", content: text, imageUrl: image?.dataUrl || null });

  const apiMessages = buildApiMessages();
  
  if ($("#messageInput")) {
    $("#messageInput").value = "";
    $("#messageInput").style.height = "auto";
  }
  clearImage();

  setLoading(true);
  const typingEl = appendTyping();
  
  const answer = await askAI(apiMessages);
  
  typingEl.remove();
  setLoading(false);

  renderBotMsg(answer);
  chat.messages.push({ role: "assistant", content: answer });
  
  trimMessages();
  saveState();
  renderChatsList();
}

function buildApiMessages() {
  return (state.chats[state.activeChatId]?.messages || []).map(m => {
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
      body: JSON.stringify({
        messages,
        model: state.settings.model,
        temperature: state.settings.temperature,
        max_tokens: state.settings.maxTokens
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return `Ошибка: ${data?.error || "Неизвестная ошибка"}`;
    }

    return data.answer || "Пустой ответ.";
  } catch (err) {
    console.error(err);
    return "Нет соединения с сервером.";
  }
}

function renderUserMsg(text, imageDataUrl) {
  const container = $("#messagesContainer");
  if (!container) return;

  // Удаляем welcome screen если есть
  const welcome = container.querySelector(".welcome-screen");
  if (welcome) welcome.remove();

  const group = document.createElement("div");
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
  container.appendChild(group);
  scrollDown();
}

function renderBotMsg(text) {
  const container = $("#messagesContainer");
  if (!container) return;

  const group = document.createElement("div");
  group.className = "msg-group bot";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);

  group.appendChild(bubble);
  group.appendChild(makeTime());
  container.appendChild(group);
  scrollDown();
}

function appendTyping() {
  const container = $("#messagesContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "typing-wrap";
  wrap.innerHTML = `
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  container.appendChild(wrap);
  scrollDown();
  return wrap;
}

function makeTime() {
  const el = document.createElement("div");
  el.className = "msg-time";
  el.textContent = new Date().toLocaleTimeString("ru", {
    hour: "2-digit",
    minute: "2-digit"
  });
  return el;
}

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
  s = s.replace(/^- (.+)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");
  s = s.replace(/\n/g, "<br>");
  
  return s;
}

function copyCode(id) {
  const el = document.getElementById(id);
  if (!el) return;

  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.previousElementSibling;
    if (btn && btn.classList.contains("copy-btn")) {
      btn.textContent = "✓";
      setTimeout(() => {
        btn.textContent = "копировать";
      }, 2000);
    }
  });
}

function setLoading(val) {
  state.isLoading = val;
  const input = $("#messageInput");
  if (input) input.disabled = val;
  updateSendBtn();
}

function trimMessages() {
  if (!state.activeChatId) return;
  const msgs = state.chats[state.activeChatId].messages;
  if (msgs.length > MAX_HISTORY) {
    state.chats[state.activeChatId].messages = msgs.slice(-MAX_HISTORY);
  }
}

function scrollDown() {
  requestAnimationFrame(() => {
    const el = $("#messagesContainer");
    if (el) el.scrollTop = el.scrollHeight;
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", init);
