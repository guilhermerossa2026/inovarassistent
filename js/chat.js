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
      // Garante foco automático no input de chat após carregar sessão
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 80);
    } else {
      this.activeUser = null;
      this.loginView.classList.remove('hidden');
      this.chatView.classList.add('hidden');
      this.loginInput.value = '';
      // Garante foco automático no input de login com pequeno timeout
      setTimeout(() => {
        if (this.loginInput) this.loginInput.focus();
      }, 80);
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
      // Garante foco no chat após logar com sucesso
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 100);
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
      
      Como posso te ajudar a resolver o chamado do Sistema Inovar de hoje? *Escolha um atalho rápido de categorias abaixo ou digite o erro diretamente.*
    `;

    this.addBotResponseBubble(greetingHTML, null, false, true); // Passa true para renderizar chips rápidos
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

    // 4. Executa a busca inteligente de forma ultrarrápida (resposta quase instantânea)
    setTimeout(() => {
      this.removeLoadingIndicatorBubble(loadingBubble);
      this.searchSolutions(query);
      // Mantém o foco no input após a busca e envio de mensagem
      if (this.chatInput) this.chatInput.focus();
    }, 120 + Math.random() * 120); // Latência reduzida de ~1.2s para ~0.2s para alta performance!
  }

  searchSolutions(query) {
    const kb = window.storageService.getKnowledge();
    const cleanQuery = query.toLowerCase().trim();

    // --- FLUXO DE ÁRVORE DE DECISÃO INTERATIVA (LOCAL E GRATUITO) ---
    if (cleanQuery === 'balança' || cleanQuery === 'balanca') {
      this.renderDecisionTree('Balanças', [
        { text: '⚖️ Balança Filizola - Configuração Serial COM (Peso Zerado)', target: 'kb-003' },
        { text: '🔌 Testar Porta Serial e Cabo com PuTTY/Testador', target: 'kb-003' }
      ]);
      return;
    }
    
    if (cleanQuery === 'impressora' || cleanQuery === 'impressoras' || cleanQuery === 'impressao') {
      this.renderDecisionTree('Impressoras Térmicas', [
        { text: '🖨️ Fila de Spooler Travada (Cupom não Imprime)', target: 'kb-004' },
        { text: '🔌 Validar Porta USB/Virtual (USB001, ESDPRT)', target: 'kb-004' }
      ]);
      return;
    }

    if (cleanQuery === 'banco' || cleanQuery === 'sql' || cleanQuery === 'deadlock' || cleanQuery === 'banco de dados' || cleanQuery === 'banco de dados (sql)') {
      this.renderDecisionTree('Banco de Dados SQL Server', [
        { text: '🗄️ Liberar Deadlock / Travamento de PDV (Kill SPID causador)', target: 'kb-002' },
        { text: '🔍 Query SQL para identificar processos bloqueados', target: 'kb-002' }
      ]);
      return;
    }

    if (cleanQuery === 'fiscal' || cleanQuery === 'nfe' || cleanQuery === 'sefaz' || cleanQuery === 'timeout' || cleanQuery === 'área fiscal (nf-e)') {
      this.renderDecisionTree('Área Fiscal (Emissão de NF-e)', [
        { text: '📄 Instabilidade SEFAZ / Timeout na Emissão de NF-e', target: 'kb-001' },
        { text: '🔄 Reiniciar o Serviço Integrador Fiscal local via CMD', target: 'kb-001' },
        { text: '🔒 Limpeza de Cache SSL no Windows (Internet Options)', target: 'kb-001' }
      ]);
      return;
    }
    
    // Algoritmo de Pontuação Inteligente (Scoring) para busca textual clássica
    let bestMatch = null;
    let highestScore = 0;

    kb.forEach(article => {
      let score = 0;

      // Correspondência exata de ID (útil se buscar por link/código de árvore de decisão)
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
        Encontrei a resolução correspondente na nossa Base de Conhecimento!
        
        ## **${bestMatch.title}**
        *Categoria: **${bestMatch.category}** (Relevância: ${highestScore > 100 ? 100 : highestScore}%)*
        
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
        * Se for erro do Windows, clique nos chips iniciais ou busque pelo periférico (ex: \`impressora\`, \`balança\`).
        
        Você também pode acessar o botão **Admin (ícone de engrenagem abaixo)** para cadastrar este novo erro ou colar os dados documentados do seu Discord!
      `;

      this.addBotResponseBubble(fallbackResponse, null, false);
    }
  }

  // --- RENDERIZAÇÃO DA ÁRVORE DE DECISÃO INTERATIVA (FLUXOS) ---
  renderDecisionTree(categoryName, options) {
    this.lastMatchedArticleId = null;
    const uid = 'tree-' + Date.now();
    
    const titleText = `Identifiquei tópicos comuns de suporte em **${categoryName}**. Qual é o sintoma que o cliente está apresentando no momento?`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message message-bot';
    
    // Constrói os botões de escolha de diagnóstico
    let choicesHTML = '<div class="interactive-choices-container">';
    options.forEach((opt, idx) => {
      choicesHTML += `
        <button class="interactive-choice-btn" data-target="${opt.target}" id="${uid}-${idx}">
          <span>${opt.text}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      `;
    });
    choicesHTML += '</div>';

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
          <p>${titleText}</p>
          ${choicesHTML}
        </div>
      </div>
    `;

    this.chatHistory.appendChild(bubble);
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

    // Vincula eventos de clique aos botões de escolha rápida
    options.forEach((opt, idx) => {
      const btn = document.getElementById(`${uid}-${idx}`);
      if (btn) {
        btn.addEventListener('click', () => {
          // 1. Simula mensagem enviada pelo usuário
          this.addUserMessageBubble(`Opção selecionada: ${opt.text}`);
          
          // 2. Registra o log associado
          const log = window.storageService.logSearch(`Opção: ${opt.text}`, opt.target, false);
          this.lastLoggedSearchId = log.id;
          
          // 3. Mostra o loading
          const loading = this.addLoadingIndicatorBubble();
          
          // 4. Carrega a solução em tempo de feeling ultra responsivo
          setTimeout(() => {
            this.removeLoadingIndicatorBubble(loading);
            this.searchSolutions(opt.target); // Busca direta usando o ID do artigo mapeado
            if (this.chatInput) this.chatInput.focus();
          }, 150);
        });
      }
    });
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

  addBotResponseBubble(markdownText, articleId = null, showActionButtons = false, showOnboardingChips = false) {
    const bubble = document.createElement('div');
    bubble.className = 'message message-bot';
    
    // Converte o Markdown simulado em elementos HTML estruturados
    const parsedHTML = this._parseMarkdown(markdownText);

    // --- RECURSO: CHIPS DE ONBOARDING INICIAIS ---
    let onboardingChipsHTML = '';
    let chipsUid = '';
    if (showOnboardingChips) {
      chipsUid = 'chips-' + Date.now();
      onboardingChipsHTML = `
        <div class="category-chips-grid">
          <button class="category-chip" id="${chipsUid}-fiscal">📄 Área Fiscal (NF-e)</button>
          <button class="category-chip" id="${chipsUid}-banco">🗄️ Banco de Dados</button>
          <button class="category-chip" id="${chipsUid}-perif">🖨️ Periféricos</button>
          <button class="category-chip" id="${chipsUid}-inst">🔧 Instalação</button>
        </div>
      `;
    }

    // --- RECURSO: RESPOSTA PRONTA E SIMPLICADA PARA O CLIENTE ---
    let clientResponseHTML = '';
    let hasClientResponse = false;
    let cannedUid = '';
    let clientFriendlyText = '';

    if (articleId) {
      const kb = window.storageService.getKnowledge();
      const article = kb.find(x => x.id === articleId);
      if (article && article.clientFriendly) {
        hasClientResponse = true;
        cannedUid = 'canned-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        clientFriendlyText = article.clientFriendly;
        clientResponseHTML = `
          <div class="client-response-box">
            <div class="client-response-header">
              <span>💬 Mensagem Pronta para o Cliente (WhatsApp/Ticket)</span>
              <button class="copy-canned-btn" id="${cannedUid}-btn" title="Copiar resposta amigável para o clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copiar Mensagem
              </button>
            </div>
            <div class="client-response-text" id="${cannedUid}-text">
              "${clientFriendlyText}"
            </div>
          </div>
        `;
      }
    }

    const uid = 'act-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    if (showActionButtons && articleId) {
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
            ${clientResponseHTML}
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
            ${onboardingChipsHTML}
            ${clientResponseHTML}
          </div>
        </div>
      `;
      this.chatHistory.appendChild(bubble);
    }

    // --- BIND EVENT LISTENER PARA BOTÃO DE COPIAR RESPOSTA DO CLIENTE ---
    if (hasClientResponse && cannedUid) {
      const copyBtn = document.getElementById(`${cannedUid}-btn`);
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(clientFriendlyText).then(() => {
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Copiado!
            `;
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copiar Mensagem
              `;
            }, 2000);
          }).catch(err => {
            console.error('Erro ao acessar Clipboard API', err);
          });
        });
      }
    }

    // --- BIND EVENT LISTENERS PARA CHIPS DE CATEGORIAS INICIAIS ---
    if (showOnboardingChips && chipsUid) {
      ['fiscal', 'banco', 'perif', 'inst'].forEach(type => {
        const chip = document.getElementById(`${chipsUid}-${type}`);
        if (chip) {
          chip.addEventListener('click', () => {
            let label = '';
            if (type === 'fiscal') label = 'Área Fiscal (NF-e)';
            if (type === 'banco') label = 'Banco de Dados (SQL)';
            if (type === 'perif') label = 'Periféricos';
            if (type === 'inst') label = 'Instalação';
            
            if (this.chatInput) {
              this.chatInput.value = label;
              this.handleSendMessage();
            }
          });
        }
      });
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
