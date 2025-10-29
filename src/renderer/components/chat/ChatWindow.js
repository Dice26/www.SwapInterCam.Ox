/**
 * Chat Window Component
 * Provides interactive chat interface for SwapInterCam
 */

class ChatWindow {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.messages = [];
    this.currentSessionId = null;
    this.isLoading = false;
    
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.loadSession();
  }

  render() {
    this.container.innerHTML = `
      <div class="chat-window">
        <div class="chat-header">
          <h3>SwapInterCam Assistant</h3>
          <button id="new-session-btn" class="btn-icon" title="New Session">
            <i class="icon-plus"></i>
          </button>
        </div>
        <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
          <div class="welcome-message">
            <p>Welcome to SwapInterCam! How can I help you today?</p>
          </div>
        </div>
        <div class="chat-input-container">
          <textarea 
            id="chat-input" 
            class="chat-input" 
            placeholder="Type your message..."
            rows="1"
            aria-label="Chat message input"
          ></textarea>
          <button id="send-btn" class="btn-send" disabled aria-label="Send message">
            <i class="icon-send"></i>
          </button>
        </div>
        <div class="chat-status" id="chat-status" aria-live="polite"></div>
      </div>
    `;
  }

  attachEventListeners() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const newSessionBtn = document.getElementById('new-session-btn');

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
      this.autoResize(input);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => this.sendMessage());
    newSessionBtn.addEventListener('click', () => this.createNewSession());
  }

  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  async loadSession() {
    try {
      const session = await window.electronAPI.invoke('chat:loadSession');
      if (session) {
        this.currentSessionId = session.id;
        this.messages = session.messages || [];
        this.renderMessages();
      } else {
        await this.createNewSession();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.showStatus('Failed to load chat session', 'error');
    }
  }

  async createNewSession() {
    try {
      const session = await window.electronAPI.invoke('chat:createSession');
      this.currentSessionId = session.id;
      this.messages = [];
      this.renderMessages();
      this.showStatus('New session created', 'success');
    } catch (error) {
      console.error('Failed to create session:', error);
      this.showStatus('Failed to create new session', 'error');
    }
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    this.isLoading = true;
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('send-btn').disabled = true;

    // Add user message
    this.addMessage('user', message);

    try {
      // Send to main process
      const response = await window.electronAPI.invoke('chat:sendMessage', {
        sessionId: this.currentSessionId,
        message: message
      });

      // Add system response
      this.addMessage('system', response.message);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      this.addMessage('system', 'Sorry, I encountered an error. Please try again.');
      this.showStatus('Failed to send message', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  addMessage(type, content) {
    const message = {
      id: Date.now(),
      type: type,
      content: content,
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
    
    // Save to session
    this.saveMessage(message);
  }

  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';
    
    if (this.messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="welcome-message">
          <p>Welcome to SwapInterCam! How can I help you today?</p>
        </div>
      `;
    } else {
      this.messages.forEach(msg => this.renderMessage(msg));
    }
  }

  renderMessage(message) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message chat-message-${message.type}`;
    messageEl.setAttribute('role', 'article');
    messageEl.setAttribute('aria-label', `${message.type} message`);
    
    const time = new Date(message.timestamp).toLocaleTimeString();
    
    messageEl.innerHTML = `
      <div class="message-content">${this.escapeHtml(message.content)}</div>
      <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageEl);
  }

  async saveMessage(message) {
    try {
      await window.electronAPI.invoke('chat:saveMessage', {
        sessionId: this.currentSessionId,
        message: message
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showStatus(message, type = 'info') {
    const statusEl = document.getElementById('chat-status');
    statusEl.textContent = message;
    statusEl.className = `chat-status chat-status-${type}`;
    
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'chat-status';
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatWindow;
}
