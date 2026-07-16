<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { storage } from '$lib/services/storage.svelte.js';

  let { onOpenAdmin, onLogout } = $props();

  let chatInput = $state('');
  let messages = $state([]);
  let isTyping = $state(false);
  let lastLoggedSearchId = $state(null);
  let lastMatchedArticleId = $state(null);

  // Stopwords list for search
  const STOPWORDS = new Set(['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'na', 'no', 'os', 'as']);

  // Synonyms dictionary
  const DICIONARIO_SINONIMOS = {
    'impressora': ['spooler', 'cupom', 'impressao', 'termica', 'usb001', 'elgin', 'bematech', 'comunicacao'],
    'impressao': ['impressora', 'spooler', 'cupom', 'termica', 'usb001', 'elgin', 'bematech'],
    'spooler': ['impressora', 'impressao', 'cupom', 'fila', 'trava', 'bloqueado'],
    'balanca': ['peso', 'serial', 'filizola', 'toledo', 'baudrate', 'com', 'porta', 'platina'],
    'peso': ['balanca', 'serial', 'filizola', 'toledo', 'zero', 'leitura'],
    'filizola': ['balanca', 'peso', 'serial', 'toledo', 'platina'],
    'toledo': ['balanca', 'peso', 'serial', 'filizola', 'prix'],
    'sefaz': ['nfe', 'nfce', 'xml', 'rejeicao', 'timeout', 'transmitir', 'certificado', 'instabilidade'],
    'nfe': ['sefaz', 'nfce', 'xml', 'rejeicao', 'timeout', 'transmitir', 'certificado'],
    'nfce': ['sefaz', 'nfe', 'xml', 'rejeicao', 'timeout', 'transmitir', 'certificado'],
    'timeout': ['sefaz', 'nfe', 'nfce', 'lentidao', 'conexao', 'resposta'],
    'deadlock': ['banco', 'sql', 'lock', 'bloqueio', 'travamento', 'spid', 'processo'],
    'banco': ['deadlock', 'sql', 'lock', 'bloqueio', 'travamento', 'database', 'sqlite', 'server'],
    'sql': ['deadlock', 'banco', 'lock', 'bloqueio', 'travamento', 'database', 'query', 'server']
  };

  onMount(async () => {
    await storage.init();
    initGreeting();
  });

  function initGreeting() {
    messages = [];
    const username = storage.currentUser ? storage.currentUser.username : '';
    messages.push({
      sender: 'bot',
      text: `Olá, técnico **${username}**. Sou o assistente de suporte da **Inovar**.\n\nEstou conectado à nossa base de conhecimentos central offline.\n\nComo posso te ajudar a resolver o chamado do Sistema Inovar de hoje? *Digite o erro ou palavra-chave diretamente abaixo para eu buscar a solução.*`,
      time: getCurrentTime(),
      showOnboardingChips: true
    });
  }

  function getCurrentTime() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function pesquisarNaBase(query) {
    if (!query || query.trim() === "") return [];

    const cleanQuery = query.toLowerCase().trim();
    const queryNormalizada = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const termos = queryNormalizada
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/)
      .filter(termo => termo.length > 1 && !STOPWORDS.has(termo));

    let termosParaPesquisa = termos;
    if (termosParaPesquisa.length === 0) {
      termosParaPesquisa = queryNormalizada
        .replace(/[^a-z0-9\s-]/g, "")
        .split(/\s+/)
        .filter(termo => termo.length > 1);
    }

    if (termosParaPesquisa.length === 0) return [];

    const originalTermsSet = new Set(termosParaPesquisa);
    const sinonimosUsados = new Set();
    
    termosParaPesquisa.forEach(termo => {
      if (DICIONARIO_SINONIMOS[termo]) {
        DICIONARIO_SINONIMOS[termo].forEach(sinonimo => {
          if (!originalTermsSet.has(sinonimo) && !sinonimosUsados.has(sinonimo)) {
            sinonimosUsados.add(sinonimo);
          }
        });
      }
    });
    
    const todosTermosDeBusca = [...termosParaPesquisa, ...sinonimosUsados];
    const baseConhecimento = storage.knowledgeBase;
    const resultadosComScore = [];

    baseConhecimento.forEach(artigo => {
      let score = 0;
      
      if (cleanQuery.includes(artigo.id.toLowerCase())) {
        score += 100;
      }

      const tituloLimpo = artigo.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const descricaoLimpa = (artigo.description || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      todosTermosDeBusca.forEach(termo => {
        const isOriginal = originalTermsSet.has(termo);
        const multiplicador = isOriginal ? 1.0 : 0.5;

        if (artigo.tags && artigo.tags.some(t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === termo)) {
          score += 10 * multiplicador;
        }
        
        const regexPalavraInteira = new RegExp(`\\b${termo}\\b`, 'i');
        if (regexPalavraInteira.test(tituloLimpo)) {
          score += 5 * multiplicador;
        } else if (tituloLimpo.includes(termo) && termo.length > 3) {
          score += 2 * multiplicador;
        }

        if (regexPalavraInteira.test(descricaoLimpa)) {
          score += 2 * multiplicador;
        } else if (descricaoLimpa.includes(termo) && termo.length > 3) {
          score += 1 * multiplicador;
        }
      });

      if (score > 0) {
        resultadosComScore.push({ artigo, score });
      }
    });

    resultadosComScore.sort((a, b) => b.score - a.score);
    return resultadosComScore;
  }

  async function handleSend() {
    const query = chatInput.trim();
    if (!query || isTyping) return;

    chatInput = '';
    messages.push({ sender: 'user', text: query, time: getCurrentTime() });

    isTyping = true;

    // Log the initial search
    const log = await storage.logSearch(query, null, false);
    lastLoggedSearchId = log.id;

    // Simulate thinking lag
    setTimeout(() => {
      isTyping = false;
      searchSolutions(query);
    }, 200 + Math.random() * 200);
  }

  function searchSolutions(query) {
    const cleanQuery = query.toLowerCase().trim();
    const normalizedQuery = cleanQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Decision tree triggers
    if (normalizedQuery === 'balanca') {
      renderDecisionTree('Balanças', [
        { text: '⚖️ Balança Filizola - Configuração Serial COM (Peso Zerado)', target: 'kb-003' },
        { text: '🔌 Testar Porta Serial e Cabo com PuTTY/Testador', target: 'kb-003' }
      ]);
      return;
    }
    
    if (normalizedQuery === 'impressora' || normalizedQuery === 'impressoras' || normalizedQuery === 'impressao') {
      renderDecisionTree('Impressoras Térmicas', [
        { text: '🖨️ Fila de Spooler Travada (Cupom não Imprime)', target: 'kb-004' },
        { text: '🔌 Validar Porta USB/Virtual (USB001, ESDPRT)', target: 'kb-004' }
      ]);
      return;
    }

    if (normalizedQuery === 'banco' || normalizedQuery === 'sql' || normalizedQuery === 'deadlock' || normalizedQuery === 'banco de dados') {
      renderDecisionTree('Banco de Dados SQL Server', [
        { text: '🗄️ Liberar Deadlock / Travamento de PDV (Kill SPID causador)', target: 'kb-002' },
        { text: '🔍 Query SQL para identificar processos bloqueados', target: 'kb-002' }
      ]);
      return;
    }

    if (normalizedQuery === 'fiscal' || normalizedQuery === 'nfe' || normalizedQuery === 'sefaz' || normalizedQuery === 'timeout') {
      renderDecisionTree('Área Fiscal (Emissão de NF-e)', [
        { text: '📄 Instabilidade SEFAZ / Timeout na Emissão de NF-e', target: 'kb-001' },
        { text: '🔄 Reiniciar o Serviço Integrador Fiscal local via CMD', target: 'kb-001' },
        { text: '🔒 Limpeza de Cache SSL no Windows (Internet Options)', target: 'kb-001' }
      ]);
      return;
    }

    // Keyword Search
    const matched = pesquisarNaBase(query);

    if (matched.length > 0) {
      const bestMatch = matched[0].artigo;
      const bestScore = matched[0].score;
      lastMatchedArticleId = bestMatch.id;
      
      // Update log with matched ID
      storage.updateLastLogResolution(false, bestMatch.id);

      let relevancePercent = 100;
      if (bestScore < 15) {
        relevancePercent = Math.min(100, Math.round((bestScore / 15) * 100));
      }

      const botText = `Encontrei a resolução correspondente na nossa Base de Conhecimento!\n\n## **${bestMatch.title}**\n*Categoria: **${bestMatch.category}** (Relevância: ${relevancePercent}% - Score: ${bestScore})*\n\n> ${bestMatch.description}\n\n${bestMatch.solution}`;
      const related = matched.slice(1, 3).map(item => item.artigo);

      messages.push({
        sender: 'bot',
        text: botText,
        time: getCurrentTime(),
        articleId: bestMatch.id,
        showFeedback: true,
        relatedArticles: related,
        clientFriendly: bestMatch.clientFriendly || null
      });
    } else {
      lastMatchedArticleId = null;
      messages.push({
        sender: 'bot',
        text: `Não encontrei uma solução exata para a pesquisa: **"${query}"** nos manuais locais do Sistema Inovar.\n\n### Dicas para buscar melhor:\n* Tente buscar por termos simples e curtos (ex: \`timeout\`, \`deadlock\`, \`filizola\`, \`spooler\`).\n* Se for erro do Windows, clique nos chips iniciais ou busque pelo periférico (ex: \`impressora\`, \`balança\`).\n\nVocê também pode acessar o painel administrativo para cadastrar este novo erro ou importar rascunhos!`,
        time: getCurrentTime()
      });
    }
  }

  function renderDecisionTree(categoryName, options) {
    lastMatchedArticleId = null;
    messages.push({
      sender: 'bot',
      text: `Identifiquei tópicos comuns de suporte em **${categoryName}**. Qual é o sintoma que o cliente está apresentando no momento?`,
      time: getCurrentTime(),
      isDecisionTree: true,
      decisionTreeOptions: options
    });
  }

  function selectDecisionOption(opt) {
    messages.push({ sender: 'user', text: `Opção selecionada: ${opt.text}`, time: getCurrentTime() });
    isTyping = true;
    
    // Log choice
    storage.logSearch(`Opção: ${opt.text}`, opt.target, false);

    setTimeout(() => {
      isTyping = false;
      searchSolutions(opt.target);
    }, 150);
  }

  function triggerChipSearch(term) {
    chatInput = term;
    handleSend();
  }

  async function setSolved(msgIndex, articleId, solved) {
    if (solved) {
      await storage.updateLastLogResolution(true, articleId);
      messages[msgIndex].feedbackStatus = 'solved';
    } else {
      await storage.updateLastLogResolution(false, articleId);
      messages[msgIndex].feedbackStatus = 'unsolved';
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      handleSend();
    }
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
  }

  // Markdown parsing helper
  function parseMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Links [Text](URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="external-link" target="_blank">$1</a>');
      
    // Paragraph splits
    html = html.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

    // Headings
    html = html.replace(/### (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>');
    html = html.replace(/## (.*?)(?:<\/p>|$)/g, '<h3>$1</h3>');

    // Blockquotes
    html = html.replace(/&gt; (.*?)(?:<\/p>|$)/g, '<blockquote><p>$1</p></blockquote>');

    // Code blocks
    html = html.replace(/```(.*?)\r?\n([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold/Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^\s*[\*\-]\s+(.*?)(?:<\/p>|$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

    // Cleanups
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

  function handleLogoutClick() {
    if (confirm('Deseja realmente mudar de técnico operador no sistema?')) {
      storage.logout();
      onLogout();
    }
  }

  // Scroll to bottom helper
  let chatMessagesEl;
  $effect(() => {
    if (messages.length && chatMessagesEl && storage.settings.autoScroll !== false) {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  });
</script>

<div class="chat-container">
  <!-- Header principal com operador ativo -->
  <header class="chat-header glow-panel-red glass-effect">
    <div class="header-left">
      <div class="status-indicator"></div>
      <div class="title-section">
        <h1>Inovar Assistente</h1>
        <span class="subtitle">Suporte Inteligente On-line</span>
      </div>
    </div>
    
    <div class="header-right">
      {#if storage.currentUser}
        <div class="operator-badge">
          <span class="operator-dot"></span>
          <span>Técnico: <strong style="color: var(--text-primary);">{storage.currentUser.username.toUpperCase()}</strong></span>
          <button class="logout-btn" onclick={handleLogoutClick} title="Trocar Operador">(Mudar)</button>
        </div>
      {/if}
      <span class="version-badge">v2.0 (Tauri)</span>
    </div>
  </header>

  <!-- Janela de conversa -->
  <main class="chat-messages" bind:this={chatMessagesEl}>
    {#each messages as msg, index}
      <div class="message-wrapper {msg.sender === 'user' ? 'user-align' : 'bot-align'}" in:slide={{ duration: 150 }}>
        {#if msg.sender === 'bot'}
          <div class="avatar bot-avatar">IA</div>
        {/if}
        
        <div class="message-bubble {msg.sender === 'user' ? 'user-bubble' : 'bot-bubble glass-effect'}">
          <div class="message-text">
            {@html parseMarkdown(msg.text)}
          </div>

          <!-- Onboarding categories chips -->
          {#if msg.showOnboardingChips}
            <div class="category-chips-grid">
              <button class="category-chip" onclick={() => triggerChipSearch('Área Fiscal (NF-e)')}>📄 Área Fiscal (NF-e)</button>
              <button class="category-chip" onclick={() => triggerChipSearch('Banco de Dados (SQL)')}>🗄️ Banco de Dados</button>
              <button class="category-chip" onclick={() => triggerChipSearch('Periféricos')}>🖨️ Periféricos</button>
              <button class="category-chip" onclick={() => triggerChipSearch('Instalação')}>🔧 Instalação</button>
            </div>
          {/if}

          <!-- Decision Tree option buttons -->
          {#if msg.isDecisionTree && msg.decisionTreeOptions}
            <div class="interactive-choices-container">
              {#each msg.decisionTreeOptions as option}
                <button class="interactive-choice-btn" onclick={() => selectDecisionOption(option)}>
                  <span>{option.text}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              {/each}
            </div>
          {/if}

          <!-- Client canned friendly message -->
          {#if msg.clientFriendly}
            <div class="client-response-box">
              <div class="client-response-header">
                <span>💬 Mensagem Pronta para o Cliente</span>
                <button class="copy-canned-btn" onclick={() => copyText(msg.clientFriendly)}>
                  Copiar Mensagem
                </button>
              </div>
              <div class="client-response-text">
                "{msg.clientFriendly}"
              </div>
            </div>
          {/if}

          <!-- Related articles chips -->
          {#if msg.relatedArticles && msg.relatedArticles.length > 0}
            <div class="related-container">
              <span class="related-title">Artigos relacionados:</span>
              <div class="category-chips-grid">
                {#each msg.relatedArticles as relatedArt}
                  <button class="category-chip related-chip" onclick={() => triggerChipSearch(relatedArt.title)}>
                    🔍 {relatedArt.title}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Solution feedback ratings -->
          {#if msg.showFeedback && msg.articleId}
            <div class="bot-response-actions">
              {#if msg.feedbackStatus === 'solved'}
                <span class="feedback-badge success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Resolvido pelo Operador!
                </span>
              {:else}
                <button class="action-button success-action" onclick={() => setSolved(index, msg.articleId, true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Resolveu o Problema!
                </button>
                {#if msg.feedbackStatus !== 'unsolved'}
                  <button class="action-button cancel-action" onclick={() => setSolved(index, msg.articleId, false)}>
                    Não ajudou
                  </button>
                {/if}
              {/if}
            </div>
          {/if}

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

  <!-- Input no rodapé com botão de admin -->
  <footer class="chat-input-bar glass-effect">
    <div class="input-wrapper">
      {#if storage.currentUser && storage.currentUser.role === 'ADM'}
        <button class="icon-button admin-trigger" onclick={onOpenAdmin} title="Painel Administrativo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      {/if}

      <input 
        type="text" 
        class="input-field" 
        placeholder="Descreva o erro de suporte ou digite para pesquisar..." 
        bind:value={chatInput} 
        onkeypress={handleKeyPress}
        disabled={isTyping}
      />

      <button 
        class="send-button" 
        disabled={!chatInput.trim() || isTyping} 
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

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .operator-badge {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    padding: 0.25rem 0.6rem;
    border-radius: 20px;
  }

  .operator-dot {
    width: 6px;
    height: 6px;
    background: var(--inovar-red-hover);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--inovar-red-hover);
  }

  .logout-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.75rem;
    transition: var(--transition-fast);
  }

  .logout-btn:hover {
    color: #ff5252;
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
    max-width: 85%;
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
    padding: 0.85rem 1.15rem;
    border-radius: var(--radius-lg);
    font-size: 0.85rem;
    line-height: 1.5;
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

  .message-text :global(p) {
    margin-bottom: 0.75rem;
  }
  
  .message-text :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-text :global(h2), .message-text :global(h3) {
    font-family: 'Outfit', sans-serif;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 700;
  }

  .message-text :global(blockquote) {
    border-left: 3px solid var(--inovar-red);
    background: rgba(255,255,255,0.02);
    padding: 0.5rem 0.75rem;
    margin: 0.75rem 0;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .message-text :global(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    background: rgba(255,255,255,0.06);
    padding: 0.15rem 0.3rem;
    border-radius: 4px;
    color: #ff5252;
  }

  .message-text :global(pre) {
    position: relative;
    background: #08080a;
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 0.75rem 0;
  }

  .message-text :global(pre code) {
    background: none;
    padding: 0;
    color: #e0e0e0;
    font-size: 0.75rem;
  }

  .message-text :global(ul) {
    margin-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .message-text :global(li) {
    margin-bottom: 0.25rem;
  }

  .message-time {
    display: block;
    font-size: 0.6rem;
    color: var(--text-muted);
    text-align: right;
    margin-top: 0.5rem;
  }

  /* Onboarding chips */
  .category-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .category-chip {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .category-chip:hover {
    background: rgba(148, 0, 9, 0.15);
    border-color: var(--inovar-red-hover);
    color: #ffffff;
  }

  .related-container {
    border-top: 1px solid var(--border-color);
    margin-top: 1rem;
    padding-top: 0.75rem;
  }

  .related-title {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 700;
    text-transform: uppercase;
  }

  .related-chip {
    background: rgba(16, 77, 115, 0.05) !important;
    border-color: rgba(16, 77, 115, 0.2) !important;
  }

  .related-chip:hover {
    background: rgba(16, 77, 115, 0.15) !important;
    border-color: #39a3ff !important;
    color: #ffffff !important;
  }

  /* Decision tree choices */
  .interactive-choices-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
    width: 100%;
  }

  .interactive-choice-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.65rem 1rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.8rem;
    text-align: left;
    transition: var(--transition-fast);
  }

  .interactive-choice-btn:hover {
    border-color: var(--inovar-red-hover);
    background: rgba(148, 0, 9, 0.1);
    box-shadow: 0 0 10px rgba(148, 0, 9, 0.1);
  }

  /* Canned client responses */
  .client-response-box {
    background: rgba(0, 148, 91, 0.04);
    border: 1px solid rgba(0, 148, 91, 0.2);
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    margin-top: 1rem;
  }

  .client-response-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #00cc80;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .copy-canned-btn {
    background: rgba(0, 148, 91, 0.1);
    border: 1px solid rgba(0, 148, 91, 0.3);
    color: #00ff9d;
    font-size: 0.65rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .copy-canned-btn:hover {
    background: rgba(0, 148, 91, 0.2);
    color: #ffffff;
  }

  .client-response-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.45;
  }

  /* Feedback actions */
  .bot-response-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    border-top: 1px solid var(--border-color);
    padding-top: 0.75rem;
  }

  .action-button {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.4rem 0.8rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .success-action:hover {
    background: rgba(0, 148, 91, 0.15);
    border-color: #00cc80;
    color: #ffffff;
  }

  .cancel-action:hover {
    background: rgba(255, 82, 82, 0.15);
    border-color: #ff5252;
    color: #ffffff;
  }

  .feedback-badge {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
  }

  .feedback-badge.success {
    background: rgba(0, 148, 91, 0.1);
    color: #00ff9d;
    border: 1px solid rgba(0, 148, 91, 0.2);
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
    0%, 100%, 80% { transform: translateY(0); }
    40% { transform: translateY(-5px); }
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
