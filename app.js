// ===================================================
// AtrhasGPT Mini App
// ===================================================

const OPENROUTER_API_KEY = "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";
const MODEL = "google/gemini-2.0-flash-001";
const MAX_HISTORY = 20;

// --- Telegram WebApp ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor(tg.themeParams.bg_color || "#0f0f0f");
}

// --- Состояние ---
let history = [];
let selectedImage = null; // { base64, type, name }
let isLoading = false;

// --- DOM ---
const messagesEl  = document.getElementById("messages");
const userInput   = document.getElementById("userInput");
const sendBtn     = document.getElementById("sendBtn");
const clearBtn    = document.getElementById("clearBtn");
const attachBtn   = document.getElementById("attachBtn");
const fileInput   = document.getElementById("fileInput");
const imagePreview = document.getElementById("imagePreview");
const previewImg  = document.getElementById("previewImg");
const removeImg   = document.getElementById("removeImg");
const previewName = document.getElementById("previewName");
const statusText  = document.getElementById("statusText");

// ===================================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================================
function init() {
  // Восстанавливаем историю из localStorage
  const saved = localStorage.getItem("atrhаsgpt_history");
  if (saved) {
    try {
      history = JSON.parse(saved);
      renderSavedHistory();
    } catch {}
  }

  // Слушатели
  userInput.addEventListener("input", onInput);
  userInput.addEventListener("keydown", onKeyDown);
  sendBtn.addEventListener("click", sendMessage);
  clearBtn.addEventListener("click", clearChat);
  attachBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", onFileSelect);
  removeImg.addEventListener("click", clearImage);
}

// ===================================================
// ВВОД
// ===================================================
function onInput() {
  // Авторастягивание
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
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
// ФАЙЛ / ИЗОБРАЖЕНИЕ
// ===================================================
function onFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Можно прикреплять только изображения!");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    alert("Файл слишком большой (максимум 20 МБ)");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const base64Full = ev.target.result; // data:image/...;base64,...
    const base64     = base64Full.split(",")[1];
    selectedImage    = { base64, type: file.type, name: file.name, dataUrl: base64Full };

    previewImg.src       = base64Full;
    previewName.textContent = file.name;
    imagePreview.style.display = "flex";
    attachBtn.classList.add("active");
    updateSendBtn();
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
}

function clearImage() {
  selectedImage = null;
  imagePreview.style.display = "none";
  attachBtn.classList.remove("active");
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

  // --- Сборка сообщения для отображения ---
  appendUserMessage(text, image?.dataUrl);

  // --- Сборка для API ---
  let apiMessage;
  if (image) {
    apiMessage = {
      role: "user",
      content: [
        image
          ? {
              type: "image_url",
              image_url: { url: `data:${image.type};base64,${image.base64}` }
            }
          : null,
        text ? { type: "text", text } : { type: "text", text: "Что на этом изображении?" }
      ].filter(Boolean)
    };
  } else {
    apiMessage = { role: "user", content: text };
  }

  history.push(apiMessage);
  trimHistory();

  // Сбрасываем ввод
  userInput.value = "";
  userInput.style.height = "auto";
  clearImage();

  // Статус
  setLoading(true);
  const typingEl = appendTyping();

  // Запрос
  const answer = await askAI(history);

  // Убираем typing
  typingEl.remove();
  setLoading(false);

  // Показываем ответ
  appendBotMessage(answer);
  history.push({ role: "assistant", content: answer });
  trimHistory();
  saveHistory();
}

// ===================================================
// AI ЗАПРОС
// ===================================================
async function askAI(messages) {
  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type":   "application/json",
        "HTTP-Referer":   "https://t.me/AtrhasGPT_bot",
        "X-Title":        "AtrhasGPT"
      },
      body: JSON.stringify({
        model:      MODEL,
        messages,
        max_tokens: 1500
      })
    });

    const data = await resp.json();

    if (resp.ok) {
      return data.choices?.[0]?.message?.content || "Пустой ответ.";
    } else {
      const errMsg = data?.error?.message || "Неизвестная ошибка";
      console.error("API Error:", errMsg);
      return `⚠️ Ошибка: ${errMsg}`;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    return "❌ Не удалось связаться с сервером. Проверь интернет.";
  }
}

// ===================================================
// РЕНДЕР СООБЩЕНИЙ
// ===================================================
function appendUserMessage(text, imageDataUrl) {
  const wrap = makeWrap("user");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (imageDataUrl) {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.className = "msg-image";
    bubble.appendChild(img);
  }

  if (text) {
    const p = document.createElement("span");
    p.textContent = text;
    bubble.appendChild(p);
  }

  wrap.appendChild(bubble);
  wrap.appendChild(makeTime());
  messagesEl.appendChild(wrap);
  scrollDown();
}

function appendBotMessage(text) {
  const wrap = makeWrap("bot");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = formatText(text);

  wrap.appendChild(bubble);
  wrap.appendChild(makeTime());
  messagesEl.appendChild(wrap);
  scrollDown();
}

function appendTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message-wrap bot";

  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;

  wrap.appendChild(indicator);
  messagesEl.appendChild(wrap);
  scrollDown();
  return wrap;
}

function makeWrap(role) {
  const wrap = document.createElement("div");
  wrap.className = `message-wrap ${role}`;
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
// ФОРМАТИРОВАНИЕ ТЕКСТА
// ===================================================
function formatText(text) {
  // Экранируем HTML
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Блоки кода ```
  safe = safe.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Инлайн `код`
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");

  // **жирный**
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // *курсив*
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Переносы строк
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

// ===================================================
// УПРАВЛЕНИЕ СОСТОЯНИЕМ
// ===================================================
function setLoading(val) {
  isLoading = val;
  userInput.disabled = val;

  if (val) {
    statusText.textContent = "печатает...";
    statusText.className = "header-status thinking";
  } else {
    statusText.textContent = "онлайн";
    statusText.className = "header-status";
  }

  updateSendBtn();
}

function clearChat() {
  if (history.length === 0) return;

  if (tg?.showConfirm) {
    tg.showConfirm("Очистить историю чата?", (ok) => {
      if (ok) doClear();
    });
  } else {
    if (confirm("Очистить историю чата?")) doClear();
  }
}

function doClear() {
  history = [];
  localStorage.removeItem("atrhаsgpt_history");

  // Убираем все сообщения и показываем приветствие
  messagesEl.innerHTML = `
    <div class="welcome-block">
      <div class="welcome-icon">🤖</div>
      <h2>AtrhasGPT</h2>
      <p>Привет! Я твой умный ассистент.<br>Спроси меня что угодно!</p>
    </div>
  `;

  if (tg?.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred("success");
  }
}

// ===================================================
// ИСТОРИЯ
// ===================================================
function trimHistory() {
  // Оставляем только текстовые сообщения в истории (без картинок — слишком тяжело)
  const textOnly = history.filter(m => typeof m.content === "string");
  if (textOnly.length > MAX_HISTORY) {
    // Удаляем старые
    const excess = history.length - MAX_HISTORY;
    history.splice(0, excess);
  }
}

function saveHistory() {
  // Сохраняем только текстовые сообщения (картинки не сохраняем — много весят)
  const toSave = history.filter(m => typeof m.content === "string");
  try {
    localStorage.setItem("atrhаsgpt_history", JSON.stringify(toSave.slice(-MAX_HISTORY)));
  } catch (e) {
    console.warn("localStorage error:", e);
  }
}

function renderSavedHistory() {
  // Убираем приветствие
  messagesEl.innerHTML = "";

  history.forEach(msg => {
    if (msg.role === "user") {
      appendUserMessage(typeof msg.content === "string" ? msg.content : "", null);
    } else if (msg.role === "assistant") {
      appendBotMessage(msg.content);
    }
  });
}

// ===================================================
// УТИЛИТЫ
// ===================================================
function scrollDown() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// ===================================================
// СТАРТ
// ===================================================
init();