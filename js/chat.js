// Lógica de Operação do Assistente (Chat) - Inovar Assist

class ChatController {
  constructor() {
    this.activeUser = null;
    this.lastLoggedSearchId = null;
    this.lastMatchedArticleId = null;
    
    this._initElements();
    this._bindEvents();
    this.checkUserSession();
  }

  _initElements() {
    // Portais de Telas
    this.loginView = document.getElementById('login-view');
    this.chatView = document.getElementById('chat-view');
    
    // Inputs de Login
    this.loginInput = document.getElementById('login-username');
    this.btnLoginSubmit = document.getElementById('btn-login-submit');
    
    // Elementos de Chat
    this.chatHistory = document.getElementById('chat-history');
    this.chatInput = document.getElementById('chat-input');
    this.btnSend = document.getElementById('send-button');
    this.btnAdmin = document.getElementById('btn-admin');
    
    // Cabeçalho de Identidade
    this.headerUserIndicator = document.getElementById('header-user-indicator');
    this.headerUserName = document.getElementById('header-user-name');
    this.btnChangeUser = document.getElementById('btn-change-user');
  }

  _bindEvents() {
    // Submeter Identificação/Login
    this.btnLoginSubmit.addEventListener('click', () => this.handleLogin());
    this.loginInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });

    // Logout / Mudar Técnico
    this.btnChangeUser.addEventListener('click', () => this.handleLogout());

    // Enviar mensagem
    this.btnSend.addEventListener('click', () => this.handleSendMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.btnSend.click();
    });
    
    // Habilitar/Desabilitar botão de enviar com base no input
    this.chatInput.addEventListener('input', () => {
      this.btnSend.disabled = this.chatInput.value.trim() === '';
    });
    this.btnSend.disabled = true; // Estado inicial

    // Acessar painel administrativo
    this.btnAdmin.addEventListener('click', () => {
      if (window.adminController) {
        window.adminController.enterAdmin();
      }
    });
  }

  // --- FLUXO DE LOGIN / IDENTIFICAÇÃO ---
  checkUserSession() {
    const savedUser = window.storageService.getCurrentUser();
    if (savedUser) {
      this.activeUser = savedUser;
      this.loginView.classList.add('hidden');
      this.chatView.classList.remove('hidden');
      this.updateHeader();
      this.initGreeting();
    } else {
      this.activeUser = null;
      this.loginView.classList.remove('hidden');
      this.chatView.classList.add('hidden');
      this.loginInput.value = '';
      this.loginInput.focus();
    }
  }

  handleLogin() {
    const name = this.loginInput.value.trim();
    if (!name) {
      alert('Por favor, informe seu nome para iniciar o atendimento.');
      return;
    }
    
    const success = window.storageService.setCurrentUser(name);
    if (success) {
      this.checkUserSession();
    }
  }

  handleLogout() {
    if (confirm('Deseja realmente mudar de técnico operador no sistema?')) {
      window.storageService.clearCurrentUser();
      this.chatHistory.innerHTML = ''; // Limpa histórico visível
      this.checkUserSession();
    }
  }

  updateHeader() {
    if (this.activeUser) {
      this.headerUserIndicator.classList.remove('hidden');
      this.headerUserName.textContent = this.activeUser.toUpperCase();
    } else {
      this.headerUserIndicator.classList.add('hidden');
    }
  }

  initGreeting() {
    // Limpa histórico e exibe saudação formatada
    this.chatHistory.innerHTML = '';
    
    const greetingHTML = `
      Olá, técnico **${this.activeUser}**. Sou o assistente de suporte da **Inovar**.
      
      Estou conectado à nossa base de conhecimentos central offline.
      
      Como posso te ajudar a resolver o chamado do Sistema Inovar de hoje? *Descreva o erro ou cole códigos de depuração abaixo.*
    `;

    this.addBotResponseBubble(greetingHTML, null, false);
  }

  // --- OPERAÇÕES E BUSCAS NO CHAT ---
  handleSendMessage() {
    const query = this.chatInput.value.trim();
    if (!query) return;

    // 1. Renderiza mensagem do usuário no chat
    this.addUserMessageBubble(query);
    this.chatInput.value = '';
    this.btnSend.disabled = true;

    // 2. Registra o log no banco local (inicialmente pendente)
    const log = window.storageService.logSearch(query, null, false);
    this.lastLoggedSearchId = log.id;

    // 3. Renderiza o indicador de "pensando..."
    const loadingBubble = this.addLoadingIndicatorBubble();

    // 4. Executa a busca inteligente
    setTimeout(() => {
      this.removeLoadingIndicatorBubble(loadingBubble);
      this.searchSolutions(query);
    }, 800 + Math.random() * 800); // Latência de feeling humana
  }

  searchSolutions(query) {
    const kb = window.storageService.getKnowledge();
    const cleanQuery = query.toLowerCase().trim();
    
    // Algoritmo de Pontuação Inteligente (Scoring)
    let bestMatch = null;
    let highestScore = 0;

    kb.forEach(article => {
      let score = 0;

      // Correspondência exata de ID (útil se buscar por link/código)
      if (cleanQuery.includes(article.id.toLowerCase())) score += 100;

      // Correspondência por Tags (Muito prioritário)
      article.tags.forEach(tag => {
        if (cleanQuery.includes(tag)) {
          score += 25; // 25 pontos por tag correspondente
        }
      });

      // Correspondência no Título
      const titleWords = article.title.toLowerCase().split(/\s+/);
      titleWords.forEach(word => {
        if (word.length > 3 && cleanQuery.includes(word)) {
          score += 15; // 15 pontos por palavra do título encontrada
        }
      });

      // Correspondência na Descrição
      if (article.description.toLowerCase().includes(cleanQuery)) {
        score += 10;
      }

      // Correspondência no texto de Solução
      if (article.solution.toLowerCase().includes(cleanQuery)) {
        score += 5;
      }

      // Atualiza o melhor match
      if (score > highestScore && score >= 15) { // Score mínimo de 15 pontos para ser considerado relevante
        highestScore = score;
        bestMatch = article;
      }
    });

    if (bestMatch) {
      this.lastMatchedArticleId = bestMatch.id;
      
      // Atualiza o log com o ID do artigo encontrado
      window.storageService.updateLastLogResolution(false, bestMatch.id);

      // Renderiza a solução encontrada
      const botResponseText = `
        Encontrei uma solução correspondente na nossa Base de Conhecimento!
        
        ## **${bestMatch.title}**
        *Categoria: **${bestMatch.category}** (Relevância: ${highestScore}%)*
        
        > ${bestMatch.description}
        
        ${bestMatch.solution}
      `;

      this.addBotResponseBubble(botResponseText, bestMatch.id, true);
    } else {
      this.lastMatchedArticleId = null;
      
      // Resposta padrão caso não encontre
      const fallbackResponse = `
        Não encontrei uma solução exata para a pesquisa: **"${query}"** nos manuais locais do Sistema Inovar.
        
        ### Dicas para buscar melhor:
        * Tente buscar por termos simples e curtos (ex: \`timeout\`, \`deadlock\`, \`filizola\`, \`spooler\`).
        * Se for erro do Windows, busque pelo periférico afetado (ex: \`impressora\`, \`balança\`).
        
        Você também pode acessar o botão **Admin (ícone de engrenagem abaixo)** para cadastrar este novo erro ou colar os dados documentados do seu Discord!
      `;

      this.addBotResponseBubble(fallbackResponse, null, false);
    }
  }

  // --- FLUXO DE FEEDBACK / MARCAR RESOLVIDO ---
  markAsSolved(articleId, btnSolved, btnUnsolved) {
    if (this.lastLoggedSearchId) {
      // Grava no localStorage que a busca funcionou
      window.storageService.updateLastLogResolution(true, articleId);
      
      // Ajusta interface visualmente
      btnSolved.disabled = true;
      btnSolved.classList.add('success-action');
      btnSolved.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Marcado como Resolvido!
      `;
      
      if (btnUnsolved) {
        btnUnsolved.remove(); // Remove o botão de recusar
      }

      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
  }

  markAsUnsolved(btnSolved, btnUnsolved) {
    if (this.lastLoggedSearchId) {
      // Registra que a busca foi falha
      window.storageService.updateLastLogResolution(false, this.lastMatchedArticleId);
      
      btnSolved.remove();
      btnUnsolved.disabled = true;
      btnUnsolved.innerHTML = 'Solução não ajudou';
      
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
  }

  // --- CONSTRUÇÃO DE ELEMENTOS VISUAIS (CHAT BUBBLES) ---
  addUserMessageBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'message message-user';
    bubble.textContent = text;
    this.chatHistory.appendChild(bubble);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  addLoadingIndicatorBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'message loading-indicator';
    bubble.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';
    this.chatHistory.appendChild(bubble);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    return bubble;
  }

  removeLoadingIndicatorBubble(bubble) {
    if (bubble && bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  }

  addBotResponseBubble(markdownText, articleId = null, showActionButtons = false) {
    const bubble = document.createElement('div');
    bubble.className = 'message message-bot';
    
    // Converte o Markdown simulado em elementos HTML estruturados
    const parsedHTML = this._parseMarkdown(markdownText);

    let actionsHTML = '';
    if (showActionButtons && articleId) {
      // Vamos gerar IDs únicos para ligar os eventos via JS dinamicamente
      const uid = 'act-' + Date.now();
      
      bubble.innerHTML = `
        <div class="bot-avatar">
          <div class="bot-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span>INOVAR.AI</span>
        </div>
        <div class="bot-response-container">
          <div class="bot-response-text">
            ${parsedHTML}
          </div>
          <div class="bot-response-actions">
            <button class="action-button success-action" id="${uid}-yes">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Resolveu o Problema!
            </button>
            <button class="action-button" id="${uid}-no" style="color: var(--text-secondary); border-color: var(--border-color); background-color: transparent;">
              Não ajudou
            </button>
          </div>
        </div>
      `;

      this.chatHistory.appendChild(bubble);
      
      // Vincula os escutadores via Javascript direto
      const btnYes = document.getElementById(`${uid}-yes`);
      const btnNo = document.getElementById(`${uid}-no`);
      
      btnYes.addEventListener('click', () => this.markAsSolved(articleId, btnYes, btnNo));
      btnNo.addEventListener('click', () => this.markAsUnsolved(btnYes, btnNo));

    } else {
      bubble.innerHTML = `
        <div class="bot-avatar">
          <div class="bot-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span>INOVAR.AI</span>
        </div>
        <div class="bot-response-container">
          <div class="bot-response-text">
            ${parsedHTML}
          </div>
        </div>
      `;
      this.chatHistory.appendChild(bubble);
    }

    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  // --- PARSER DE MARKDOWN SIMPLE ---
  _parseMarkdown(text) {
    if (!text) return '';
    
    let html = text;
    
    // Escapa tags HTML originais para evitar injeções ou quebras
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Volta a renderizar quebras de parágrafo estruturadas
    html = html.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

    // Headers h3 (Ex: ### Título)
    html = html.replace(/### (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>');

    // Headers h2 (Ex: ## Título)
    html = html.replace(/## (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>'); // Convertemos para H3 para manter hierarquia estilosa

    // Blockquotes (Ex: > Texto)
    html = html.replace(/&gt; (.*?)(?:<\/p>|$)/g, '<blockquote><p>$1</p></blockquote>');

    // Código em Bloco com quebras de linha (Ex: ```sql ... ```)
    html = html.replace(/```(.*?)\r?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // Códigos em bloco simples sem linguagem especificada
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Código em linha (Ex: `código`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negrito (Ex: **texto**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Itálico (Ex: *texto*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Listas não ordenadas (Ex: * item)
    // Converte marcadores em tags de lista
    html = html.replace(/^\s*[\*\-]\s+(.*?)(?:<\/p>|$)/gm, '<li>$1</li>');
    
    // Envolve blocos de <li> em <ul>
    // Um regex simples que substitui sequências de <li> em <ul><li>...</li></ul>
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    // Limpezas de parágrafos vazios introduzidos por quebras excessivas
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><h3>/g, '<h3>');
    html = html.replace(/<\/h3><\/p>/g, '</h3>');
    html = html.replace(/<p><blockquote>/g, '<blockquote>');
    html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
    html = html.replace(/<p><pre>/g, '<pre>');
    html = html.replace(/<\/pre><\/p>/g, '</pre>');

    return html;
  }
}

// Expõe e executa após os elementos da página carregarem
document.addEventListener('DOMContentLoaded', () => {
  window.chatController = new ChatController();
});
