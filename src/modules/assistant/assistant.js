// J.A.R.V.I.S. — AI Assistant Chat Module
import { streamChat } from '../../services/llm.js';
import { dataStore } from '../../services/data.js';
import { escapeHtml } from '../../services/utils.js';
import './assistant.css';

let chatHistory = [];
let isStreaming = false;

export function renderAssistant(container) {
  container.innerHTML = `
    <div class="assistant-view">
      <div class="assistant-header animate-fade-in">
        <h1>🧠 AI Command Center</h1>
        <p>Your autonomous office assistant — ask anything or let me take the wheel.</p>
      </div>

      <div class="chat-messages" id="chat-messages">
        ${chatHistory.length === 0 ? renderWelcomeMessage() : chatHistory.map(renderMessage).join('')}
      </div>

      <div class="chat-chips" id="chat-chips">
        <button class="chip" data-prompt="What should I focus on today?">📋 Today's priorities</button>
        <button class="chip" data-prompt="Give me a summary of my inbox">📧 Inbox summary</button>
        <button class="chip" data-prompt="What meetings do I have this week?">📅 This week's schedule</button>
        <button class="chip" data-prompt="Show me the business performance dashboard">📊 Performance report</button>
        <button class="chip" data-prompt="Draft a professional email response to the Q1 revenue report email from Sarah Chen">✍️ Draft email</button>
        <button class="chip" data-prompt="Break down my top 3 tasks into actionable subtasks">🎯 Break down tasks</button>
      </div>

      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <textarea id="chat-input" placeholder="Ask me anything — emails, scheduling, tasks, analysis..." rows="1"></textarea>
          <button class="chat-send-btn" id="chat-send" aria-label="Send message">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const messagesContainer = document.getElementById('chat-messages');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', sendMessage);

  // Chip handlers
  document.querySelectorAll('.chip[data-prompt]').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.prompt;
      sendMessage();
    });
  });

  // Scroll to bottom
  if (chatHistory.length > 0) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function renderWelcomeMessage() {
  return `
    <div class="chat-message assistant animate-fade-in-up">
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <div class="message-bubble">
          <h2>Welcome to AssistantNet 👋</h2>
          <p>I'm your autonomous office assistant. I can manage your emails, calendar, tasks, and documents — or just answer questions about your business.</p>
          <p><strong>Try one of the quick actions below</strong>, or ask me anything directly. I understand business context and can take real action.</p>
        </div>
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  return `
    <div class="chat-message ${msg.role}">
      <div class="message-avatar">${msg.role === 'assistant' ? 'AI' : 'MD'}</div>
      <div class="message-content">
        <div class="message-bubble">${msg.html || escapeHtml(msg.text)}</div>
        <div class="message-time">${msg.time}</div>
      </div>
    </div>
  `;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || isStreaming) return;

  // Hide chips after first message
  const chips = document.getElementById('chat-chips');
  if (chips) chips.style.display = 'none';

  // Add user message
  const userMsg = {
    role: 'user',
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  chatHistory.push(userMsg);
  appendMessage(userMsg);

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Show typing indicator
  isStreaming = true;
  const typingEl = showTypingIndicator();

  // Prepare context
  const context = buildContext();

  // Create assistant message
  const assistantMsg = {
    role: 'assistant',
    text: '',
    html: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  try {
    // Import marked once before streaming
    let markedParse = null;
    try {
      const { marked } = await import('marked');
      markedParse = marked.parse.bind(marked);
    } catch { /* fallback below */ }

    // Stream response  
    let fullText = '';
    for await (const chunk of streamChat(text, context)) {
      fullText += chunk;
      assistantMsg.text = fullText;

      // Parse markdown
      if (markedParse) {
        assistantMsg.html = markedParse(fullText);
      } else {
        assistantMsg.html = escapeHtml(fullText).replace(/\n/g, '<br>');
      }

      // Update or create the message bubble
      if (typingEl.parentNode) {
        typingEl.remove();
        chatHistory.push(assistantMsg);
        appendMessage(assistantMsg);
      } else {
        updateLastAssistantMessage(assistantMsg.html);
      }
    }
  } catch (err) {
    assistantMsg.text = 'Sorry, I encountered an error. Please try again.';
    assistantMsg.html = assistantMsg.text;
    if (typingEl.parentNode) {
      typingEl.remove();
      chatHistory.push(assistantMsg);
      appendMessage(assistantMsg);
    }
  }

  isStreaming = false;
  scrollToBottom();
}

function appendMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `chat-message ${msg.role}`;
  div.innerHTML = `
    <div class="message-avatar">${msg.role === 'assistant' ? 'AI' : 'MD'}</div>
    <div class="message-content">
      <div class="message-bubble">${msg.html || escapeHtml(msg.text)}</div>
      <div class="message-time">${msg.time}</div>
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
}

function updateLastAssistantMessage(html) {
  const messages = document.querySelectorAll('.chat-message.assistant');
  const last = messages[messages.length - 1];
  if (last) {
    last.querySelector('.message-bubble').innerHTML = html;
    scrollToBottom();
  }
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function buildContext() {
  const emails = dataStore.getEmails();
  const tasks = dataStore.getTasks();
  const meetings = dataStore.getMeetings();
  const kpis = dataStore.getKPIs();

  return `
CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

INBOX SUMMARY (${emails.length} emails):
${emails.slice(0, 5).map(e => `- [${e.priority.toUpperCase()}] ${e.subject} — from ${e.from} (${e.read ? 'read' : 'UNREAD'})`).join('\n')}

TASKS (${tasks.length} total):
${tasks.filter(t => t.status !== 'done').slice(0, 5).map(t => `- [${t.priority.toUpperCase()}] ${t.title} — ${t.status} (due: ${t.dueDate})`).join('\n')}

MEETINGS THIS WEEK (${meetings.length} total):
${meetings.slice(0, 5).map(m => `- ${m.date} ${m.startTime}-${m.endTime}: ${m.title} (${m.location})`).join('\n')}

KEY METRICS:
- Revenue: $${(kpis.revenue.value / 1000000).toFixed(2)}M (${kpis.revenue.change > 0 ? '+' : ''}${kpis.revenue.change}%)
- Client Satisfaction: ${kpis.clientSatisfaction.value}%
- Team Utilization: ${kpis.teamUtilization.value}%
`.trim();
}

// escapeHtml imported from services/utils.js

export function destroyAssistant() {
  // Chat history persists in memory for session
}
