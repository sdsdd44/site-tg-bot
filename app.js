// ===================================================
// AtrhasGPT — Liquid Glass UI
// ===================================================

// ЗАМЕНИ на свой Cloudflare Worker URL
const PROXY_URL = "https://atrhasgpt-proxy.olavashow.workers.dev/";

const MAX_HISTORY = 20;

// --- Telegram ---
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

// ===================================================
// СОСТОЯНИЕ
// ===================================================
let chats      = {};   // { id: { title, messages: [] } }
let activeChatId = null;
let selectedImage = null;
let isLoading  = false;

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
const welcomeScreen   = document.getElementById("welcomeScreen");

// ===================================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================================
function init() {
  loadChats();
  renderChatsList();

  if (Object.keys(chats).length === 0) {
    showWelcome();
  } else {
    // Открываем последний чат
    const ids = Object.keys(chats);
    openChat(ids[ids.length - 1]);
  }

  // Слушатели
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
// ЧАТЫ
// ===================================================
function createNewChat(firstMsg) {
  const id    = Date.now().toString();
  const title = firstMsg
    ? firstMsg.slice(0, 30) + (firstMsg.length > 30 ? "..." : "")
    : "Новый чат";

  chats[id] = { title, messages: [] };
  openChat(id);
  renderChatsList();
  saveChats();
  return id;
}

function openChat(id) {
  activeChatId = id;
  headerTitle.textContent = chats[id]?.title || "AtrhasGPT";

  // Убираем welcome
  if (welcomeScreen) welcomeScreen.style.display = "none";

  // Рендерим сообщения
  messagesEl.innerHTML = "";

  const msgs = chats[id]?.messages || [];
  if (msgs.length === 0) {
    showWelcomeInChat();
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
      headerTitle.textContent = "AtrhasGPT";
    }
  }

  renderChatsList();
}

function renderChatsList() {
  chatsList.innerHTML = "";

  const ids = Object.keys(chats).reverse();

  if (ids.length === 0) {
    chatsList.innerHTML = `
      <div style="padding:16px;text-align:center;color:var(--text-dim);font-size:13px;">
        Нет чатов
      </div>`;
    return;
  }

  ids.forEach(id => {
    const item = document.createElement("div");
    item.className = "chat-item" + (id === activeChatId ? " active" : "");

    item.innerHTML = `
      <span class="chat-item-text">${escHtml(chats[id].title)}</span>
      <button class="chat-item-del" title="Удалить">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

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
      <div class="welcome-title">AtrhasGPT</div>
      <div class="welcome-sub">Чем могу помочь?</div>
      <div class="welcome-cards">
        <div class="welcome-card" onclick="setPrompt('Объясни что такое квантовые компьютеры')">
          Объясни что такое квантовые компьютеры
        </div>
        <div class="welcome-card" onclick="setPrompt('Напиши код простого сайта на HTML')">
          Напиши код простого сайта на HTML
        </div>
        <div class="welcome-card" onclick="setPrompt('Придумай идею для проекта на Python')">
          Придумай идею для проекта на Python
        </div>
        <div class="welcome-card" onclick="setPrompt('Что такое Liquid Glass дизайн?')">
          Что такое Liquid Glass дизайн?
        </div>
      </div>
    </div>
  `;
}

function showWelcomeInChat() {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;justify-content:center;flex:1;color:var(--text-dim);font-size:14px;padding:40px;text-align:center;";
  el.textContent = "Начни диалог — напиши что-нибудь";
  messagesEl.appendChild(el);
}

function setPrompt(text) {
  userInput.value = text;
  onInput();
  userInput.focus();
}

// ===================================================
// ВВОД
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
  sendBtn.disabled = isLoading || (
    userInput.value.trim() === "" && !selectedImage
  );
}

// ===================================================
// ФАЙЛ
// ===================================================
function onFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Только изображения!"); return;
  }
  if (file.size > 20 * 1024 * 1024) {
    alert("Максимум 20 МБ"); return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    selectedImage = {
      base64:  dataUrl.split(",")[1],
      type:    file.type,
      name:    file.name,
      dataUrl
    };
    previewImg.src           = dataUrl;
    previewName.textContent  = file.name;
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
// ОТПРАВКА
// ===================================================
async function sendMessage() {
  if (isLoading) return;

  const text  = userInput.value.trim();
  const image = selectedImage;
  if (!text && !image) return;

  // Создаём чат если нет активного
  if (!activeChatId || !chats[activeChatId]) {
    createNewChat(text || "Фото");
  }

  // Если чат пустой — обновляем заголовок
  if (chats[activeChatId].messages.length === 0) {
    const title = (text || "Фото").slice(0, 35) +
      ((text || "Фото").length > 35 ? "..." : "");
    chats[activeChatId].title = title;
    headerTitle.textContent   = title;
  }

  // Убираем welcome-заглушку
  const stub = messagesEl.querySelector("[style*='Начни диалог']");
  if (stub) stub.remove();
  const ws = messagesEl.querySelector(".welcome-screen");
  if (ws) ws.remove();

  // Рендер сообщения юзера
  renderUserMsg(text, image?.dataUrl || null);

  // Запись в историю чата
  const userEntry = { role: "user", content: text, imageUrl: image?.dataUrl || null };
  chats[activeChatId].messages.push(userEntry);

  // Строим массив для API
  const apiMessages = buildApiMessages();

  // Сброс
  userInput.value = "";
  userInput.style.height = "auto";
  clearImage();

  // Загрузка
  setLoading(true);
  const typingEl = appendTyping();

  // Запрос
  const answer = await askAI(apiMessages);

  typingEl.remove();
  setLoading(false);

  // Ответ
  renderBotMsg(answer);
  chats[activeChatId].messages.push({ role: "assistant", content: answer });

  // Чистим историю
  trimMessages();
  saveChats();
  renderChatsList();
}

// ===================================================
// API
// ===================================================
function buildApiMessages() {
  const msgs = chats[activeChatId]?.messages || [];

  return msgs.map(m => {
    if (m.imageUrl) {
      return {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: m.imageUrl }
          },
          {
            type: "text",
            text: m.content || "Что на этом изображении?"
          }
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

    if (!resp.ok) {
      return `Ошибка: ${data?.error || "Неизвестная ошибка"}`;
    }

    return data.answer || "Пустой ответ.";

  } catch (err) {
    console.error(err);
    return "Нет соединения с сервером.";
  }
}

// ===================================================
// РЕНДЕР
// ===================================================
function renderUserMsg(text, imageDataUrl) {
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

  const time = makeTime();
  group.appendChild(bubble);
  group.appendChild(time);
  messagesEl.appendChild(group);
  scrollDown();
}

function renderBotMsg(text) {
  const group = document.createElement("div");
  group.className = "msg-group bot";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);

  const time = makeTime();
  group.appendChild(bubble);
  group.appendChild(time);
  messagesEl.appendChild(group);
  scrollDown();
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "typing-wrap";
  wrap.innerHTML = `
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messagesEl.appendChild(wrap);
  scrollDown();
  return wrap;
}

function makeTime() {
  const el = document.createElement("div");
  el.className = "msg-time";
  const now = new Date();
  el.textContent = now.toLocaleTimeString("ru", {
    hour: "2-digit", minute: "2-digit"
  });
  return el;
}

// ===================================================
// ФОРМАТИРОВАНИЕ
// ===================================================
function formatText(raw) {
  let s = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Блок кода
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = "code_" + Math.random().toString(36).slice(2);
    return `
      <pre>
        <button class="copy-btn" onclick="copyCode('${id}')">копировать</button>
        <code id="${id}">${code.trim()}</code>
      </pre>`;
  });

  // Инлайн код
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Жирный
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Курсив
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Переносы
  s = s.replace(/\n/g, "<br>");

  return s;
}

function copyCode(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const btn = el.previousElementSibling;
    if (btn) { btn.textContent = "скопировано!"; setTimeout(() => { btn.textContent = "копировать"; }, 2000); }
  });
}

// ===================================================
// СОСТОЯНИЕ
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
    // Не сохраняем base64 картинки — слишком тяжёлые
    const toSave = {};
    Object.keys(chats).forEach(id => {
      toSave[id] = {
        title: chats[id].title,
        messages: chats[id].messages.map(m => ({
          role:    m.role,
          content: m.content
          // imageUrl намеренно не сохраняем
        }))
      };
    });
    localStorage.setItem("atrhasgpt_chats", JSON.stringify(toSave));
  } catch (e) {
    console.warn("localStorage:", e);
  }
}

function loadChats() {
  try {
    const raw = localStorage.getItem("atrhasgpt_chats");
    if (raw) chats = JSON.parse(raw);
  } catch (e) {
    chats = {};
  }
}

// ===================================================
// УТИЛИТЫ
// ===================================================
function scrollDown() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ===================================================
// СТАРТ
// ===================================================
init();
