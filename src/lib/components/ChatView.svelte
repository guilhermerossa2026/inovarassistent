<script>
  import { fade, slide } from 'svelte/transition';
  
  // Svelte 5 props
  let { onOpenAdmin } = $props();
  
  let chatInput = $state("");
  let messages = $state([
    { sender: 'bot', text: 'Olá! Sou o Assistente Inteligente de Suporte do Sistema Inovar. Como posso ajudar você hoje?', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  let isTyping = $state(false);

  function handleSend() {
    if (!chatInput.trim()) return;
    
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    messages.push({ sender: 'user', text: chatInput, time });
    
    const userMsg = chatInput;
    chatInput = "";
    isTyping = true;
    
    // Simulação temporária de resposta inteligente
    setTimeout(() => {
      isTyping = false;
      messages.push({
        sender: 'bot',
        text: `Entendi sua dúvida sobre "${userMsg}". Estou pronto para ser integrado às APIs do Tauri para buscar respostas locais ou na nuvem!`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });
    }, 1200);
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      handleSend();
    }
  }
</script>

<div class="chat-container">
  <!-- Cabeçalho Principal (Glow Vermelho) -->
  <header class="chat-header glow-panel-red glass-effect">
    <div class="header-left">
      <div class="status-indicator"></div>
      <div class="title-section">
        <h1>Inovar Assistente</h1>
        <span class="subtitle">Suporte Inteligente On-line</span>
      </div>
    </div>
    <div class="header-right">
      <span class="version-badge">v2.0 (Tauri)</span>
    </div>
  </header>

  <!-- Janela de Conversa (Feed de Mensagens) -->
  <main class="chat-messages">
    {#each messages as msg}
      <div class="message-wrapper {msg.sender === 'user' ? 'user-align' : 'bot-align'}" in:slide={{ duration: 200 }}>
        {#if msg.sender === 'bot'}
          <div class="avatar bot-avatar">IA</div>
        {/if}
        
        <div class="message-bubble {msg.sender === 'user' ? 'user-bubble' : 'bot-bubble glass-effect'}">
          <p class="message-text">{msg.text}</p>
          <span class="message-time">{msg.time}</span>
        </div>

        {#if msg.sender === 'user'}
          <div class="avatar user-avatar">OP</div>
        {/if}
      </div>
    {/each}

    {#if isTyping}
      <div class="message-wrapper bot-align" in:fade>
        <div class="avatar bot-avatar">IA</div>
        <div class="typing-indicator glass-effect">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    {/if}
  </main>

  <!-- Barra de Digitação Inferior (Glow azul suave no foco) -->
  <footer class="chat-input-bar glass-effect">
    <div class="input-wrapper">
      <button class="icon-button admin-trigger" onclick={onOpenAdmin} title="Painel Administrativo">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <input 
        type="text" 
        class="input-field" 
        placeholder="Descreva o erro de suporte ou digite para pesquisar..." 
        bind:value={chatInput} 
        onkeypress={handleKeyPress}
      />

      <button 
        class="send-button" 
        disabled={!chatInput.trim()} 
        onclick={handleSend}
        style="background: {chatInput.trim() ? 'var(--inovar-red)' : 'rgba(255,255,255,0.05)'}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </footer>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    z-index: 10;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status-indicator {
    width: 9px;
    height: 9px;
    background-color: #00ff66;
    border-radius: 50%;
    box-shadow: 0 0 8px #00ff66;
  }

  .title-section h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--text-primary);
    text-transform: uppercase;
  }

  .subtitle {
    font-size: 0.65rem;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  .version-badge {
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    color: var(--text-secondary);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background-image: radial-gradient(circle at 50% 10%, rgba(148, 0, 9, 0.03) 0%, transparent 60%);
  }

  .message-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    max-width: 80%;
  }

  .user-align {
    align-self: flex-end;
  }

  .bot-align {
    align-self: flex-start;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    user-select: none;
    border: 1px solid var(--border-color);
  }

  .bot-avatar {
    background: rgba(148, 0, 9, 0.2);
    color: #ff3e4e;
    border-color: rgba(148, 0, 9, 0.4);
    box-shadow: 0 0 10px rgba(148, 0, 9, 0.15);
  }

  .user-avatar {
    background: rgba(16, 77, 115, 0.2);
    color: #39a3ff;
    border-color: rgba(16, 77, 115, 0.4);
    box-shadow: 0 0 10px rgba(16, 77, 115, 0.15);
  }

  .message-bubble {
    padding: 0.75rem 1rem;
    border-radius: var(--radius-lg);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .bot-bubble {
    border-bottom-left-radius: 2px;
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-primary);
  }

  .user-bubble {
    border-bottom-right-radius: 2px;
    background: var(--cyber-blue);
    color: #ffffff;
    box-shadow: var(--shadow-glow-blue);
  }

  .message-time {
    display: block;
    font-size: 0.6rem;
    color: var(--text-muted);
    text-align: right;
    margin-top: 0.25rem;
  }

  .typing-indicator {
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-lg);
    border-bottom-left-radius: 2px;
    display: flex;
    gap: 4px;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    background-color: var(--text-secondary);
    border-radius: 50%;
    animation: bounce 1.2s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes bounce {
    0%, 100%, 80% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
  }

  .chat-input-bar {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 0.35rem 0.5rem 0.35rem 0.75rem;
    transition: var(--transition-normal);
  }

  .input-wrapper:focus-within {
    border-color: var(--cyber-blue-hover);
    box-shadow: var(--shadow-glow-blue);
  }

  .input-field {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 0.85rem;
    padding: 0.5rem 0;
  }

  .input-field::placeholder {
    color: var(--text-muted);
  }

  .icon-button {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition-fast);
    padding: 0.4rem;
    border-radius: 50%;
  }

  .icon-button:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .send-button {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    border: none;
    outline: none;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition-fast);
  }

  .send-button:disabled {
    cursor: default;
    color: var(--text-muted) !important;
  }
</style>
