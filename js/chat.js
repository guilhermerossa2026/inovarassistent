// Lógica de Operação do Assistente (Chat) - Inovar Assist

// Lista de palavras comuns para descartar na busca técnico-textual
const STOPWORDS = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'na', 'no', 'os', 'as']);

function pesquisarNaBase(query) {
  if (!query || query.trim() === "") return [];

  // normalização da query
  const cleanQuery = query.toLowerCase().trim();
  const queryNormalizada = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Tokenização: Limpa o texto e divide em palavras chaves
  const termos = queryNormalizada
    .replace(/[^a-z0-9\s-]/g, "") // Remove pontuações
    .split(/\s+/)
    .filter(termo => termo.length > 1 && !STOPWORDS.has(termo));

  // Caso os termos fiquem vazios (ex: o usuário digitou apenas conectivos), tenta usar todos os termos > 1 caractere
  let termosParaPesquisa = termos;
  if (termosParaPesquisa.length === 0) {
    termosParaPesquisa = queryNormalizada
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/)
      .filter(termo => termo.length > 1);
  }

  if (termosParaPesquisa.length === 0) return [];

  const baseConhecimento = window.storageService.getKnowledge();
  const resultadosComScore = [];

  // 2. Cálculo do Score para cada artigo
  baseConhecimento.forEach(artigo => {
    let score = 0;
    
    // Regra especial: Correspondência exata do ID do artigo (fluxos interativos da árvore de decisão)
    if (cleanQuery.includes(artigo.id.toLowerCase())) {
      score += 100;
    }

    const tituloLimpo = artigo.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const descricaoLimpa = (artigo.description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    termosParaPesquisa.forEach(termo => {
      // Regra 1: Se bater exato com uma TAG cadastrada (Peso Máximo)
      if (artigo.tags && artigo.tags.some(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === termo)) {
        score += 10;
      }
      
      // Regra 2: Se o termo bater com uma palavra inteira no TÍTULO
      const regexPalavraInteira = new RegExp(`\\b${termo}\\b`, 'i');
      if (regexPalavraInteira.test(tituloLimpo)) {
        score += 5; // Palavra exata no título
      } else if (tituloLimpo.includes(termo) && termo.length > 3) {
        score += 2; // Parcial se for uma palavra longa
      }

      // Regra 3: Se o termo bater com uma palavra inteira na DESCRIÇÃO
      if (regexPalavraInteira.test(descricaoLimpa)) {
        score += 2; // Palavra exata na descrição
      } else if (descricaoLimpa.includes(termo) && termo.length > 3) {
        score += 1; // Parcial se for uma palavra longa
      }
    });

    if (score > 0) {
      resultadosComScore.push({ artigo, score });
    }
  });

  // 3. Ordena do maior score para o menor
  resultadosComScore.sort((a, b) => b.score - a.score);

  return resultadosComScore;
}

class ChatController {
  constructor() {
    // Força limpeza de sessão no início para que sempre peça login ao entrar
    window.storageService.clearCurrentUser();
    this.activeUser = null;
    this.lastLoggedSearchId = null;
    this.lastMatchedArticleId = null;
    this.isTypingResponse = false;
    
    this._initElements();
    this._bindEvents();
    this.applySettingsAndTheme();
    this.checkUserSession();
  }

  _initElements() {
    // Portais de Telas
    this.loginView = document.getElementById('login-view');
    this.chatView = document.getElementById('chat-view');
    
    // Inputs de Login
    this.loginInput = document.getElementById('login-username');
    this.loginPasswordInput = document.getElementById('login-password');
    this.loginSaveSession = document.getElementById('login-save-session');
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
      if (e.key === 'Enter') {
        if (this.loginPasswordInput) this.loginPasswordInput.focus();
      }
    });
    this.loginPasswordInput.addEventListener('keypress', (e) => {
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
      if (!this.isTypingResponse) {
        this.btnSend.disabled = this.chatInput.value.trim() === '';
      }
    });
    this.btnSend.disabled = true; // Estado inicial

    // Acessar painel administrativo diretamente por ADM
    this.btnAdmin.addEventListener('click', () => {
      if (window.adminController) {
        window.adminController.enterAdminDirectly();
      }
    });

    // Intercepta cliques nas bolhas de chat para links externos
    this.chatHistory.addEventListener('click', (e) => {
      const link = e.target.closest('a.external-link');
      if (link) {
        e.preventDefault();
        const url = link.getAttribute('href');
        if (window.api && typeof window.api.openExternalLink === 'function') {
          window.api.openExternalLink(url);
        } else {
          window.open(url, '_blank');
        }
      }
    });
  }

  applySettingsAndTheme() {
    const settings = window.storageService.getSettings();
    
    // 1. Aplica o tema visual no body
    if (settings.theme && settings.theme !== 'red') {
      document.body.className = `theme-${settings.theme}`;
    } else {
      document.body.className = '';
    }
    
    // 2. Aplica barra de menus do Electron no startup
    if (window.api && typeof window.api.setMenuBarVisibility === 'function') {
      window.api.setMenuBarVisibility(!!settings.showMenuBar);
    }
    
    // 3. Preenche login se "Lembrar de mim" estiver ativo
    if (settings.saveLogin) {
      if (this.loginInput) this.loginInput.value = settings.rememberedUser || '';
      if (this.loginPasswordInput) this.loginPasswordInput.value = settings.rememberedPassword || '';
      if (this.loginSaveSession) this.loginSaveSession.checked = true;
    }
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
      
      // Oculta/Exibe a engrenagem com base no cargo ADM vs SUPORTE (Normal)
      if (this.activeUser.role === 'ADM') {
        this.btnAdmin.classList.remove('hidden');
      } else {
        this.btnAdmin.classList.add('hidden');
      }

      // Garante foco automático no input de chat após carregar sessão
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 80);
    } else {
      this.activeUser = null;
      this.loginView.classList.remove('hidden');
      this.chatView.classList.add('hidden');
      this.loginInput.value = '';
      if (this.loginPasswordInput) this.loginPasswordInput.value = '';
      
      // Ao reabrir, se "Lembrar" estiver ativo, os valores serão preenchidos
      const settings = window.storageService.getSettings();
      if (settings.saveLogin) {
        this.loginInput.value = settings.rememberedUser || '';
        if (this.loginPasswordInput) this.loginPasswordInput.value = settings.rememberedPassword || '';
        if (this.loginSaveSession) this.loginSaveSession.checked = true;
      } else {
        if (this.loginSaveSession) this.loginSaveSession.checked = false;
      }

      // Garante foco automático no input de login
      setTimeout(() => {
        if (this.loginInput) this.loginInput.focus();
      }, 80);
    }
  }

  handleLogin() {
    const username = this.loginInput.value.trim();
    const password = this.loginPasswordInput ? this.loginPasswordInput.value.trim() : '';
    if (!username || !password) {
      window.showToast('Por favor, informe o usuário e a senha.', 'warning');
      return;
    }
    
    const user = window.storageService.validateLogin(username, password);
    if (user) {
      // Grava preferências de Lembrar Login
      const settings = window.storageService.getSettings();
      if (this.loginSaveSession && this.loginSaveSession.checked) {
        settings.saveLogin = true;
        settings.rememberedUser = username;
        settings.rememberedPassword = password;
      } else {
        settings.saveLogin = false;
        settings.rememberedUser = '';
        settings.rememberedPassword = '';
      }
      window.storageService.saveSettings(settings);

      this.checkUserSession();
      // Garante foco no chat após logar com sucesso
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 100);
    } else {
      window.showToast('Usuário ou senha incorretos!', 'error');
      if (this.loginPasswordInput) {
        this.loginPasswordInput.value = '';
        this.loginPasswordInput.focus();
      }
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
    if (this.activeUser && this.activeUser.username) {
      this.headerUserIndicator.classList.remove('hidden');
      this.headerUserName.textContent = this.activeUser.username.toUpperCase();
    } else {
      this.headerUserIndicator.classList.add('hidden');
    }
  }

  initGreeting() {
    // Limpa histórico e exibe saudação formatada
    this.chatHistory.innerHTML = '';
    
    const greetingHTML = `
      Olá, técnico **${this.activeUser ? this.activeUser.username : ''}**. Sou o assistente de suporte da **Inovar**.
      
      Estou conectado à nossa base de conhecimentos central offline.
      
      Como posso te ajudar a resolver o chamado do Sistema Inovar de hoje? *Digite o erro ou palavra-chave diretamente abaixo para eu buscar a solução.*
    `;

    this.addBotResponseBubble(greetingHTML, null, false, true); // Passa true para renderizar chips rápidos de onboarding
  }

  // --- OPERAÇÕES E BUSCAS NO CHAT ---
  handleSendMessage() {
    const query = this.chatInput.value.trim();
    if (!query || this.isTypingResponse) return;

    this.isTypingResponse = true;
    this.chatInput.disabled = true;
    this.btnSend.disabled = true;

    // 1. Renderiza mensagem do usuário no chat
    this.addUserMessageBubble(query);
    this.chatInput.value = '';

    // 2. Registra o log no banco local (inicialmente pendente)
    const log = window.storageService.logSearch(query, null, false);
    this.lastLoggedSearchId = log.id;

    // 3. Renderiza o indicador de "pensando..."
    const loadingBubble = this.addLoadingIndicatorBubble();

    // 4. Executa a busca inteligente de forma ultrarrápida (resposta quase instantânea)
    setTimeout(() => {
      this.removeLoadingIndicatorBubble(loadingBubble);
      this.searchSolutions(query);
    }, 120 + Math.random() * 120); // Latência reduzida de ~1.2s para ~0.2s para alta performance!
  }

  searchSolutions(query) {
    const cleanQuery = query.toLowerCase().trim();
    const normalizedQuery = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // --- FLUXO DE ÁRVORE DE DECISÃO INTERATIVA (LOCAL E GRATUITO) ---
    if (normalizedQuery === 'balanca') {
      this.renderDecisionTree('Balanças', [
        { text: '⚖️ Balança Filizola - Configuração Serial COM (Peso Zerado)', target: 'kb-003' },
        { text: '🔌 Testar Porta Serial e Cabo com PuTTY/Testador', target: 'kb-003' }
      ]);
      return;
    }
    
    if (normalizedQuery === 'impressora' || normalizedQuery === 'impressoras' || normalizedQuery === 'impressao') {
      this.renderDecisionTree('Impressoras Térmicas', [
        { text: '🖨️ Fila de Spooler Travada (Cupom não Imprime)', target: 'kb-004' },
        { text: '🔌 Validar Porta USB/Virtual (USB001, ESDPRT)', target: 'kb-004' }
      ]);
      return;
    }

    if (normalizedQuery === 'banco' || normalizedQuery === 'sql' || normalizedQuery === 'deadlock' || normalizedQuery === 'banco de dados' || normalizedQuery === 'banco de dados sql') {
      this.renderDecisionTree('Banco de Dados SQL Server', [
        { text: '🗄️ Liberar Deadlock / Travamento de PDV (Kill SPID causador)', target: 'kb-002' },
        { text: '🔍 Query SQL para identificar processos bloqueados', target: 'kb-002' }
      ]);
      return;
    }

    if (normalizedQuery === 'fiscal' || normalizedQuery === 'nfe' || normalizedQuery === 'sefaz' || normalizedQuery === 'timeout' || normalizedQuery === 'area fiscal' || normalizedQuery === 'area fiscal nf-e') {
      this.renderDecisionTree('Área Fiscal (Emissão de NF-e)', [
        { text: '📄 Instabilidade SEFAZ / Timeout na Emissão de NF-e', target: 'kb-001' },
        { text: '🔄 Reiniciar o Serviço Integrador Fiscal local via CMD', target: 'kb-001' },
        { text: '🔒 Limpeza de Cache SSL no Windows (Internet Options)', target: 'kb-001' }
      ]);
      return;
    }

    // Algoritmo de Busca por Score
    const matched = pesquisarNaBase(query);

    if (matched.length > 0) {
      const bestMatch = matched[0].artigo;
      const bestScore = matched[0].score;
      this.lastMatchedArticleId = bestMatch.id;
      
      // Atualiza o log com o ID do artigo encontrado
      window.storageService.updateLastLogResolution(false, bestMatch.id);

      // Calcula a porcentagem de relevância com base no score
      let relevancaPercent = 100;
      if (bestScore < 100) {
        // Usamos 15 como base (100% de relevância) para score máximo prático de buscas simples
        relevancaPercent = Math.min(100, Math.round((bestScore / 15) * 100));
      }

      // Renderiza a solução detalhada encontrada
      const botResponseText = `
        Encontrei a resolução correspondente na nossa Base de Conhecimento!
        
        ## **${bestMatch.title}**
        *Categoria: **${bestMatch.category}** (Relevância: ${relevancaPercent}% - Score: ${bestScore})*
        
        > ${bestMatch.description}
        
        ${bestMatch.solution}
      `;

      // Extrai até 2 artigos adicionais relevantes como relacionados
      const related = matched.slice(1, 3).map(item => item.artigo);

      this.addBotResponseBubble(botResponseText, bestMatch.id, true, false, related);
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
    this.scrollToBottom();

    // Reativa o input já que a árvore de decisão é exibida instantaneamente
    this.isTypingResponse = false;
    this.chatInput.disabled = false;
    this.btnSend.disabled = this.chatInput.value.trim() === '';
    if (this.chatInput) this.chatInput.focus();

    // Vincula eventos de clique aos botões de escolha rápida
    options.forEach((opt, idx) => {
      const btn = document.getElementById(`${uid}-${idx}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.isTypingResponse) return;

          this.isTypingResponse = true;
          this.chatInput.disabled = true;
          this.btnSend.disabled = true;

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

      this.scrollToBottom();
    }
  }

  markAsUnsolved(btnSolved, btnUnsolved) {
    if (this.lastLoggedSearchId) {
      // Registra que a busca foi falha
      window.storageService.updateLastLogResolution(false, this.lastMatchedArticleId);
      
      btnSolved.remove();
      btnUnsolved.disabled = true;
      btnUnsolved.innerHTML = 'Solução não ajudou';
      
      this.scrollToBottom();
    }
  }

  // --- CONSTRUÇÃO DE ELEMENTOS VISUAIS (CHAT BUBBLES) ---
  addUserMessageBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'message message-user';
    bubble.textContent = text;
    this.chatHistory.appendChild(bubble);
    this.scrollToBottom();
  }

  addLoadingIndicatorBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'message loading-indicator';
    bubble.innerHTML = '<div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div>';
    this.chatHistory.appendChild(bubble);
    this.scrollToBottom();
    return bubble;
  }

  removeLoadingIndicatorBubble(bubble) {
    if (bubble && bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  }

  addBotResponseBubble(markdownText, articleId = null, showActionButtons = false, showOnboardingChips = false, relatedArticles = []) {
    this.isTypingResponse = true;
    if (this.chatInput) this.chatInput.disabled = true;
    if (this.btnSend) this.btnSend.disabled = true;

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
        <div class="category-chips-grid" style="animation: fadeIn 0.4s ease-out;">
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
          <div class="client-response-box" style="animation: fadeIn 0.4s ease-out;">
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

    // Renderiza a estrutura da bolha vazia
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
        <div class="bot-response-text"></div>
      </div>
    `;

    this.chatHistory.appendChild(bubble);
    const textContainer = bubble.querySelector('.bot-response-text');
    const responseContainer = bubble.querySelector('.bot-response-container');

    // Executa digitação dinâmica no container de texto
    this._typeHTML(textContainer, parsedHTML, 3, () => {
      // Ao terminar de digitar, carrega os elementos interativos
      
      // 1. Mensagem pronta do cliente
      if (hasClientResponse && clientResponseHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = clientResponseHTML;
        textContainer.appendChild(tempDiv.firstElementChild);
        
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

      // 2. Botões de Feedback da solução
      if (showActionButtons && articleId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'bot-response-actions';
        actionsDiv.style.animation = 'fadeIn 0.4s ease-out';
        actionsDiv.innerHTML = `
          <button class="action-button success-action" id="${uid}-yes">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Resolveu o Problema!
          </button>
          <button class="action-button" id="${uid}-no" style="color: var(--text-secondary); border-color: var(--border-color); background-color: transparent;">
            Não ajudou
          </button>
        `;
        responseContainer.appendChild(actionsDiv);

        const btnYes = document.getElementById(`${uid}-yes`);
        const btnNo = document.getElementById(`${uid}-no`);
        
        btnYes.addEventListener('click', () => this.markAsSolved(articleId, btnYes, btnNo));
        btnNo.addEventListener('click', () => this.markAsUnsolved(btnYes, btnNo));
      }

      // 3. Chips de Onboarding
      if (showOnboardingChips && onboardingChipsHTML) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = onboardingChipsHTML;
        textContainer.appendChild(tempDiv.firstElementChild);

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

      // 4. Sugestões de Artigos Relacionados
      if (relatedArticles && relatedArticles.length > 0) {
        const relatedUid = 'related-' + Date.now();
        const relatedDiv = document.createElement('div');
        relatedDiv.className = 'category-chips-grid';
        relatedDiv.style.animation = 'fadeIn 0.4s ease-out';
        relatedDiv.style.marginTop = '0.75rem';
        
        let relatedHTML = '<div style="font-size: 0.75rem; color: var(--text-secondary); width: 100%; margin-bottom: 0.25rem; font-weight: 600;">Artigos relacionados encontrados:</div>';
        relatedArticles.forEach((art, idx) => {
          relatedHTML += `<button class="category-chip" id="${relatedUid}-${idx}" style="border-color: rgba(230, 0, 0, 0.2); background-color: rgba(230, 0, 0, 0.02); max-width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">🔍 ${art.title}</button>`;
        });
        relatedDiv.innerHTML = relatedHTML;
        textContainer.appendChild(relatedDiv);

        relatedArticles.forEach((art, idx) => {
          const chip = document.getElementById(`${relatedUid}-${idx}`);
          if (chip) {
            chip.addEventListener('click', () => {
              if (this.isTypingResponse) return;
              
              if (this.chatInput) {
                this.chatInput.value = art.title;
                this.handleSendMessage();
              }
            });
          }
        });
      }

      // 5. Botão de Cópia Rápida para blocos de código/comandos (<pre>)
      const preBlocks = textContainer.querySelectorAll('pre');
      preBlocks.forEach((pre) => {
        const codeElement = pre.querySelector('code');
        if (!codeElement) return;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.title = 'Copiar comando/código';
        copyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copiar</span>
        `;

        pre.appendChild(copyBtn);

        copyBtn.addEventListener('click', () => {
          // Obtém o texto limpo, sem o botão de copiar
          const textToCopy = codeElement.innerText || codeElement.textContent;
          navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Copiado!</span>
            `;

            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copiar</span>
              `;
            }, 1500);
          }).catch(err => {
            console.error('Erro ao acessar Clipboard API', err);
          });
        });
      });

      this.isTypingResponse = false;
      if (this.chatInput) {
        this.chatInput.disabled = false;
        this.btnSend.disabled = this.chatInput.value.trim() === '';
        this.chatInput.focus();
      }

      this.scrollToBottom();
    });

    this.scrollToBottom();
  }

  // --- MÉTODOS DE DIGITAÇÃO DE TEXTO ---
  _typeHTML(element, htmlContent, speed = 2, onComplete = null) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Cria o caret piscante cyberpunk
    const caret = document.createElement('span');
    caret.className = 'typing-caret';
    caret.textContent = '▋';
    element.appendChild(caret);
    
    const nodes = [];
    const collectNodes = (node, parent) => {
      if (node.nodeType === Node.TEXT_NODE) {
        nodes.push({ type: 'text', originalNode: node, parent: parent, text: node.nodeValue });
      } else {
        const clone = node.cloneNode(false);
        nodes.push({ type: 'element', originalNode: node, clonedNode: clone, parent: parent });
        for (let child of node.childNodes) {
          collectNodes(child, node);
        }
      }
    };
    
    for (let child of tempDiv.childNodes) {
      collectNodes(child, tempDiv);
    }
    
    const nodeMap = new Map();
    nodeMap.set(tempDiv, element);
    
    let nodeIndex = 0;
    let charIndex = 0;
    
    const typeNext = () => {
      this.scrollToBottom();
      
      if (nodeIndex >= nodes.length) {
        caret.remove();
        if (onComplete) onComplete();
        return;
      }
      
      const item = nodes[nodeIndex];
      const parentDest = nodeMap.get(item.parent);
      
      if (!parentDest) {
        // Prevenção contra erros caso o mapeamento falhe
        nodeIndex++;
        setTimeout(typeNext, speed);
        return;
      }
      
      if (item.type === 'element') {
        if (caret.parentNode === parentDest) {
          parentDest.insertBefore(item.clonedNode, caret);
        } else {
          parentDest.appendChild(item.clonedNode);
        }
        nodeMap.set(item.originalNode, item.clonedNode);
        nodeIndex++;
        setTimeout(typeNext, speed);
      } else if (item.type === 'text') {
        let destTextNode = nodeMap.get(item.originalNode);
        if (!destTextNode) {
          destTextNode = document.createTextNode('');
          if (caret.parentNode === parentDest) {
            parentDest.insertBefore(destTextNode, caret);
          } else {
            parentDest.appendChild(destTextNode);
          }
          nodeMap.set(item.originalNode, destTextNode);
        }
        
        if (charIndex < item.text.length) {
          destTextNode.nodeValue += item.text[charIndex];
          charIndex++;
          setTimeout(typeNext, speed);
        } else {
          charIndex = 0;
          nodeIndex++;
          setTimeout(typeNext, speed);
        }
      }
    };
    
    typeNext();
  }

  scrollToBottom() {
    const settings = window.storageService.getSettings();
    if (settings.autoScroll !== false) {
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
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

    // Suporte a Links Markdown [Texto](URL) expostos na ponte do Electron
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="external-link" target="_blank">$1</a>');
      
    // Volta a renderizar quebras de parágrafo estruturadas
    html = html.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

    // Headers h3 (Ex: ### Título)
    html = html.replace(/### (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>');

    // Headers h2 (Ex: ## Título)
    html = html.replace(/## (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>'); // Convertemos para H3 para manter hierarquia estilosa

    // Blockquotes (Ex: > Texto)
    html = html.replace(/&gt; (.*?)(?:<\/p>|$)/g, '<blockquote><p>$1</p></blockquote>');

    // Código em Bloco com quebras de linha (Ex: ```sql ... ```)
    html = html.replace(/```(.*?)\r?\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
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
  try {
    window.chatController = new ChatController();
  } catch (e) {
    console.error('Erro ao inicializar ChatController:', e);
  }
});
