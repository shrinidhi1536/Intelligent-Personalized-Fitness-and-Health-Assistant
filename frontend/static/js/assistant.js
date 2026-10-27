import { api, showToast, sound } from "./api.js";

const chatHistory = [
  {
    role: "assistant",
    content: "Hello! I am your AI Fitness & Health Assistant. I have real-time access to your personal targets, today's logged nutrition, and workout status. What can I help you optimize today?"
  }
];

export function renderAssistant(container) {
  container.innerHTML = `
    <div style="max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 160px);">
      <!-- Chat Header -->
      <div class="app-card" style="padding: 16px 20px; border-radius: var(--radius-lg); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px;">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <h3 style="font-size: 15px; font-weight: 800;">Intelligent Fitness AI Coach</h3>
            <span style="font-size: 11px; color: var(--accent); font-weight: 700;">● Active & Synced with Today's Logs</span>
          </div>
        </div>
        <button class="btn-secondary" style="padding: 6px 12px; font-size: 11px;" onclick="window.app.clearAIChat()">
          Clear Chat
        </button>
      </div>

      <!-- Quick Suggestion Chips -->
      <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px;" id="aiChipContainer">
        ${[
          "What workout should I do today?",
          "What should I eat after today's workout?",
          "How much protein do I need?",
          "I only have 15 minutes today. What should I do?",
          "Why am I not gaining weight?"
        ].map(q => `
          <button class="btn-secondary" style="font-size: 11px; padding: 6px 12px; white-space: nowrap; border-radius: 999px;" onclick="window.app.sendAIChat('${q.replace(/'/g, "\\'")}')">
            ${q}
          </button>
        `).join("")}
      </div>

      <!-- Messages Stream -->
      <div class="app-card" style="flex: 1; overflow-y: auto; padding: 20px; border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 14px;" id="aiMessagesBox">
        ${renderChatMessages()}
      </div>

      <!-- Input Bar -->
      <form id="aiChatForm" style="display: flex; gap: 10px; margin-top: 12px;" onsubmit="event.preventDefault(); window.app.handleChatSubmit();">
        <input type="text" id="aiMessageInput" placeholder="Ask about workouts, meal replacements, calorie deficit, recovery..." style="flex: 1; padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 14px; background: var(--bg-surface);" autocomplete="off" />
        <button type="submit" class="btn-primary" style="padding: 0 24px;">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  `;

  scrollToBottom();
}

function renderChatMessages() {
  return chatHistory.map(msg => `
    <div style="display: flex; gap: 10px; align-items: flex-start; ${msg.role === 'user' ? 'flex-direction: row-reverse;' : ''}">
      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${msg.role === 'user' ? 'var(--text-main)' : 'var(--primary)'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">
        <i class="fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
      </div>
      <div style="max-width: 75%; background: ${msg.role === 'user' ? 'var(--primary-light)' : 'var(--bg-surface)'}; border: 1px solid var(--border); padding: 12px 16px; border-radius: var(--radius-md); font-size: 13px; line-height: 1.5; white-space: pre-wrap;">
        ${formatMarkdown(msg.content)}
      </div>
    </div>
  `).join("");
}

export async function sendMessage(text) {
  const input = document.getElementById("aiMessageInput");
  const msgText = text || (input ? input.value : "");
  if (!msgText.trim()) return;

  if (input) input.value = "";

  chatHistory.push({ role: "user", content: msgText });
  sound.playBeep(660, 0.08);

  const box = document.getElementById("aiMessagesBox");
  if (box) {
    box.innerHTML = renderChatMessages() + `
      <div id="aiTypingIndicator" style="display: flex; gap: 10px; align-items: center; color: var(--text-muted); font-size: 12px;">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing your fitness context...
      </div>
    `;
    scrollToBottom();
  }

  try {
    const res = await api.post("/api/assistant/chat", { message: msgText });
    chatHistory.push({ role: "assistant", content: res.reply });
    sound.playBeep(880, 0.1);
  } catch (err) {
    chatHistory.push({ role: "assistant", content: `I encountered an issue connecting to the AI engine: ${err.message}` });
  }

  if (box) {
    box.innerHTML = renderChatMessages();
    scrollToBottom();
  }
}

export function clearChat() {
  chatHistory.length = 1;
  const box = document.getElementById("aiMessagesBox");
  if (box) box.innerHTML = renderChatMessages();
}

function scrollToBottom() {
  const box = document.getElementById("aiMessagesBox");
  if (box) {
    setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
  }
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}
