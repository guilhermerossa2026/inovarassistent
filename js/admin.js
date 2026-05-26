// Lógica de Controle do Painel Administrativo - Inovar Assist

class AdminController {
  constructor() {
    this.selectedArticleId = null;
    this.currentTab = 'articles'; // 'articles' ou 'reports'
    this.correctPassword = 'inovaradmin'; // Senha padrão solicitada pelo usuário
    this.isAuthenticated = false;
    
    this._initElements();
    this._bindEvents();
  }

  _initElements() {
    // Portais e Modais
    this.adminView = document.getElementById('admin-view');
    this.chatView = document.getElementById('chat-view');
    this.adminModalOverlay = document.getElementById('admin-modal-overlay');
    this.adminPasswordInput = document.getElementById('admin-password-input');
    this.adminPasswordError = document.getElementById('admin-password-error');
    
    // Abas
    this.tabArticlesBtn = document.getElementById('tab-articles-btn');
    this.tabReportsBtn = document.getElementById('tab-reports-btn');
    this.tabArticlesContent = document.getElementById('tab-articles-content');
    this.tabReportsContent = document.getElementById('tab-reports-content');
    
    // CRUD Artigos
    this.adminSearchInput = document.getElementById('admin-search-input');
    this.kbListContainer = document.getElementById('kb-list');
    this.articleForm = document.getElementById('article-form');
    this.formArticleId = document.getElementById('form-article-id');
    this.formTitle = document.getElementById('form-title');
    this.formCategory = document.getElementById('form-category');
    this.formTags = document.getElementById('form-tags');
    this.formDescription = document.getElementById('form-description');
    this.formSolution = document.getElementById('form-solution');
    
    this.btnSaveArticle = document.getElementById('btn-save-article');
    this.btnDeleteArticle = document.getElementById('btn-delete-article');
    this.btnNewArticle = document.getElementById('btn-new-article');
    
    // Backup e Importação
    this.btnExportDb = document.getElementById('btn-export-db');
    this.fileImportDb = document.getElementById('file-import-db');
    
    // Importador Discord
    this.btnOpenDiscordImport = document.getElementById('btn-open-discord-import');
    this.discordImportOverlay = document.getElementById('discord-import-overlay');
    this.discordPasteArea = document.getElementById('discord-paste-area');
    this.btnProcessDiscord = document.getElementById('btn-process-discord');
    this.btnCancelDiscord = document.getElementById('btn-cancel-discord');
    
    // Métricas/Relatórios
    this.metricTotalSearches = document.getElementById('metric-total-searches');
    this.metricResolveRate = document.getElementById('metric-resolve-rate');
    this.metricTopTag = document.getElementById('metric-top-tag');
    this.metricActiveUser = document.getElementById('metric-active-user');
    this.logsTableBody = document.getElementById('logs-table-body');
    this.btnClearLogs = document.getElementById('btn-clear-logs');
  }

  _bindEvents() {
    // Fechar e Abrir Admin
    document.getElementById('btn-close-admin').addEventListener('click', () => this.exitAdmin());
    
    // Validação de Senha
    document.getElementById('btn-submit-admin-pw').addEventListener('click', () => this.checkPassword());
    this.adminPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.checkPassword();
    });
    document.getElementById('btn-cancel-admin-pw').addEventListener('click', () => this.exitAdmin());

    // Controle de Abas
    this.tabArticlesBtn.addEventListener('click', () => this.switchTab('articles'));
    this.tabReportsBtn.addEventListener('click', () => this.switchTab('reports'));

    // CRUD Artigos
    this.adminSearchInput.addEventListener('input', () => this.renderArticlesList());
    this.btnNewArticle.addEventListener('click', () => this.resetFormForNew());
    this.articleForm.addEventListener('submit', (e) => this.saveArticle(e));
    this.btnDeleteArticle.addEventListener('click', () => this.deleteArticle());

    // Importações e Backups
    this.btnExportDb.addEventListener('click', () => this.exportDatabase());
    this.fileImportDb.addEventListener('change', (e) => this.importDatabase(e));

    // Importador do Discord
    this.btnOpenDiscordImport.addEventListener('click', () => this.openDiscordModal(true));
    this.btnCancelDiscord.addEventListener('click', () => this.openDiscordModal(false));
    this.btnProcessDiscord.addEventListener('click', () => this.processDiscordText());
    
    // Limpeza de logs
    this.btnClearLogs.addEventListener('click', () => this.clearLogs());
  }

  // --- CONTROLE DE SENHA & PORTAL ---
  enterAdmin() {
    this.adminView.classList.remove('hidden');
    this.chatView.classList.add('hidden');
    
    if (!this.isAuthenticated) {
      this.adminModalOverlay.classList.remove('hidden');
      this.adminPasswordInput.value = '';
      this.adminPasswordInput.focus();
      this.adminPasswordError.textContent = '';
    } else {
      this.loadAdminView();
    }
  }

  checkPassword() {
    const entered = this.adminPasswordInput.value;
    if (entered === this.correctPassword) {
      this.isAuthenticated = true;
      this.adminModalOverlay.classList.add('hidden');
      this.loadAdminView();
    } else {
      this.adminPasswordError.textContent = 'Senha administrativa incorreta. Tente novamente.';
      this.adminPasswordInput.select();
    }
  }

  exitAdmin() {
    this.adminView.classList.add('hidden');
    this.chatView.classList.remove('hidden');
    this.adminModalOverlay.classList.add('hidden');
    
    // Notifica o chat controller para atualizar o cabeçalho se necessário
    if (window.chatController) {
      window.chatController.updateHeader();
    }
  }

  // --- CARREGAMENTO INICIAL DO PAINEL ---
  loadAdminView() {
    this.switchTab('articles');
    this.renderArticlesList();
    this.resetFormForNew();
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    if (tab === 'articles') {
      this.tabArticlesBtn.classList.add('active');
      this.tabReportsBtn.classList.remove('active');
      this.tabArticlesContent.classList.remove('hidden');
      this.tabReportsContent.classList.add('hidden');
      this.renderArticlesList();
    } else {
      this.tabArticlesBtn.classList.remove('active');
      this.tabReportsBtn.classList.add('active');
      this.tabArticlesContent.classList.add('hidden');
      this.tabReportsContent.classList.remove('hidden');
      this.loadReports();
    }
  }

  // --- CRUD DE ARTIGOS ---
  renderArticlesList() {
    const kb = window.storageService.getKnowledge();
    const query = this.adminSearchInput.value.toLowerCase().trim();
    
    // Filtragem sutil
    const filtered = kb.filter(item => {
      return item.title.toLowerCase().includes(query) || 
             item.category.toLowerCase().includes(query) ||
             item.tags.some(tag => tag.includes(query));
    });

    this.kbListContainer.innerHTML = '';
    
    if (filtered.length === 0) {
      this.kbListContainer.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhum artigo encontrado.</div>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = `kb-item-card ${this.selectedArticleId === item.id ? 'selected' : ''}`;
      card.dataset.id = item.id;
      
      card.innerHTML = `
        <div class="kb-item-title">${this._escapeHTML(item.title)}</div>
        <div class="kb-item-meta">
          <span class="kb-item-category">${this._escapeHTML(item.category)}</span>
          <span>${item.tags.length} tags</span>
        </div>
      `;
      
      card.addEventListener('click', () => this.selectArticle(item.id));
      this.kbListContainer.appendChild(card);
    });
  }

  selectArticle(id) {
    this.selectedArticleId = id;
    
    // Atualiza seleção na lista lateral
    const cards = this.kbListContainer.querySelectorAll('.kb-item-card');
    cards.forEach(c => {
      if (c.dataset.id === id) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    // Preenche o formulário
    const kb = window.storageService.getKnowledge();
    const item = kb.find(x => x.id === id);
    
    if (item) {
      this.formArticleId.value = item.id;
      this.formTitle.value = item.title;
      this.formCategory.value = item.category;
      this.formTags.value = item.tags.join(', ');
      this.formDescription.value = item.description;
      this.formSolution.value = item.solution;
      
      this.btnDeleteArticle.classList.remove('hidden');
      this.btnSaveArticle.innerHTML = 'Salvar Alterações';
    }
  }

  resetFormForNew() {
    this.selectedArticleId = null;
    
    // Remove seleções visuais
    const cards = this.kbListContainer.querySelectorAll('.kb-item-card');
    cards.forEach(c => c.classList.remove('selected'));

    // Reseta inputs
    this.formArticleId.value = '';
    this.formTitle.value = '';
    this.formCategory.value = 'Fiscal'; // Padrão
    this.formTags.value = '';
    this.formDescription.value = '';
    this.formSolution.value = '';
    
    this.btnDeleteArticle.classList.add('hidden');
    this.btnSaveArticle.innerHTML = 'Cadastrar Novo Artigo';
    this.formTitle.focus();
  }

  saveArticle(e) {
    e.preventDefault();
    
    const id = this.formArticleId.value;
    const itemData = {
      title: this.formTitle.value.trim(),
      category: this.formCategory.value,
      tags: this.formTags.value,
      description: this.formDescription.value.trim(),
      solution: this.formSolution.value.trim()
    };

    if (!itemData.title || !itemData.solution) {
      alert('Por favor, preencha o Título e o Passo a Passo da Solução.');
      return;
    }

    if (id) {
      // Editar existente
      const success = window.storageService.updateKnowledge(id, itemData);
      if (success) {
        alert('Artigo de conhecimento atualizado com sucesso!');
      }
    } else {
      // Adicionar novo
      const newItem = window.storageService.addKnowledge(itemData);
      this.selectedArticleId = newItem.id;
      alert('Novo artigo cadastrado com sucesso!');
    }

    this.renderArticlesList();
    if (this.selectedArticleId) {
      this.selectArticle(this.selectedArticleId);
    } else {
      this.resetFormForNew();
    }
  }

  deleteArticle() {
    const id = this.formArticleId.value;
    if (!id) return;

    if (confirm('Tem certeza absoluta de que deseja excluir este artigo da base de conhecimento?')) {
      const success = window.storageService.deleteKnowledge(id);
      if (success) {
        alert('Artigo excluído com sucesso!');
        this.resetFormForNew();
        this.renderArticlesList();
      }
    }
  }

  // --- ABA DE RELATÓRIOS E ANÁLISES ---
  loadReports() {
    const logs = window.storageService.getLogs();
    
    // 1. Total buscas
    const total = logs.length;
    this.metricTotalSearches.textContent = total;
    
    // 2. Taxa de resolução
    const resolved = logs.filter(l => l.resolved).length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    this.metricResolveRate.textContent = `${rate}%`;
    
    // 3. Usuário mais ativo
    const userCounts = {};
    let topUser = '-';
    let maxUserQueries = 0;
    
    // 4. Termo / Tag mais buscado
    const tagCounts = {};
    let topTag = '-';
    let maxTagCount = 0;

    logs.forEach(l => {
      // Agrega usuário
      if (l.user) {
        userCounts[l.user] = (userCounts[l.user] || 0) + 1;
        if (userCounts[l.user] > maxUserQueries) {
          maxUserQueries = userCounts[l.user];
          topUser = l.user;
        }
      }

      // Agrega palavras-chave (ignora palavras curtas)
      const words = l.query.toLowerCase().split(/\s+/);
      words.forEach(w => {
        const cleanWord = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
        if (cleanWord.length > 3 && !['como', 'erro', 'para', 'banco', 'esta', 'está', 'fazer'].includes(cleanWord)) {
          tagCounts[cleanWord] = (tagCounts[cleanWord] || 0) + 1;
          if (tagCounts[cleanWord] > maxTagCount) {
            maxTagCount = tagCounts[cleanWord];
            topTag = cleanWord;
          }
        }
      });
    });

    this.metricActiveUser.textContent = total > 0 ? `${topUser} (${maxUserQueries}x)` : '-';
    this.metricTopTag.textContent = total > 0 ? `${topTag} (${maxTagCount}x)` : '-';

    // 5. Renderizar Tabela de logs
    this.logsTableBody.innerHTML = '';
    
    if (logs.length === 0) {
      this.logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhuma interação registrada ainda.</td></tr>';
      return;
    }

    // Ordena do mais recente para o mais antigo
    const sortedLogs = [...logs].reverse();
    
    sortedLogs.forEach(log => {
      const tr = document.createElement('tr');
      const timeStr = this._formatDate(log.timestamp);
      
      const badgeClass = log.resolved ? 'badge-success' : 'badge-danger';
      const badgeText = log.resolved ? 'Resolvido' : 'Pendente';
      
      tr.innerHTML = `
        <td style="font-weight: 600;">${this._escapeHTML(log.user)}</td>
        <td class="log-query">"${this._escapeHTML(log.query)}"</td>
        <td class="log-time">${timeStr}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace;">${log.articleId || 'N/A'}</td>
      `;
      this.logsTableBody.appendChild(tr);
    });
  }

  clearLogs() {
    if (confirm('Deseja realmente limpar todo o histórico de relatórios e métricas dos colaboradores? Isso não afetará a base de conhecimento.')) {
      window.storageService.clearLogs();
      this.loadReports();
    }
  }

  // --- DISTRIBUIÇÃO E BACKUPS ---
  exportDatabase() {
    const jsonStr = window.storageService.exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `inovar_kb_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importDatabase(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const success = window.storageService.importDatabase(content);
      if (success) {
        alert('Banco de Dados da Base de Conhecimento importado com sucesso!');
        this.renderArticlesList();
        this.resetFormForNew();
      } else {
        alert('Erro ao importar arquivo. Certifique-se de que o arquivo JSON do backup está íntegro e no formato correto.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reseta input de arquivo
  }

  // --- IMPORTADOR DISCORD ---
  openDiscordModal(open) {
    if (open) {
      this.discordImportOverlay.classList.remove('hidden');
      this.discordPasteArea.value = '';
      this.discordPasteArea.focus();
    } else {
      this.discordImportOverlay.classList.add('hidden');
    }
  }

  processDiscordText() {
    const text = this.discordPasteArea.value.trim();
    if (!text) {
      alert('Por favor, cole um texto do Discord.');
      return;
    }

    // Algoritmo de parser sutil para Discord
    let title = '';
    let category = 'Geral';
    let solution = text;
    let description = '';

    // Tenta extrair título pelas primeiras linhas ou formatações do Discord
    const lines = text.split('\n');
    
    // Procura primeira linha com formatação bold do Discord (ex: **Erro de X**)
    let foundTitle = false;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      const boldMatch = line.match(/\*\*(.*?)\*\*/);
      if (boldMatch && boldMatch[1] && boldMatch[1].trim().length > 3) {
        title = boldMatch[1].trim();
        foundTitle = true;
        break;
      }
    }

    // Se não encontrou, pega a primeira linha limpa como título
    if (!foundTitle && lines.length > 0) {
      title = lines[0].replace(/[#*`]/g, '').trim();
    }

    // Limita tamanho do título
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }

    // Extrai categorias baseando-se em palavras chaves do texto
    const lowerText = text.toLowerCase();
    if (lowerText.includes('nfe') || lowerText.includes('sefaz') || lowerText.includes('imposto') || lowerText.includes('nota')) {
      category = 'Fiscal';
    } else if (lowerText.includes('banco') || lowerText.includes('sql') || lowerText.includes('query') || lowerText.includes('lock')) {
      category = 'Banco de Dados';
    } else if (lowerText.includes('impressora') || lowerText.includes('bematech') || lowerText.includes('balanca') || lowerText.includes('serial') || lowerText.includes('periferico')) {
      category = 'Periféricos';
    } else if (lowerText.includes('instala') || lowerText.includes('config') || lowerText.includes('setup')) {
      category = 'Instalação';
    }

    // Procura por códigos de erros ou palavras para virar Tags
    const potentialTags = [];
    const keywords = ['timeout', 'deadlock', 'bematech', 'filizola', 'elgin', 'sefaz', 'contingencia', 'cmd', 'portas', 'spooler'];
    keywords.forEach(kw => {
      if (lowerText.includes(kw)) potentialTags.push(kw);
    });
    
    // Se o título tiver palavras úteis, adiciona
    const titleWords = title.toLowerCase().split(/\s+/);
    titleWords.forEach(w => {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (clean.length > 3 && !['erro', 'para', 'como', 'sistema', 'inovar'].includes(clean) && potentialTags.length < 5) {
        if (!potentialTags.includes(clean)) potentialTags.push(clean);
      }
    });

    // Cria uma descrição compacta
    description = `Instrução importada do Discord sobre ${title}.`;

    // Preenche o formulário CRUD com o processamento
    this.selectedArticleId = null;
    this.formArticleId.value = '';
    this.formTitle.value = title;
    this.formCategory.value = category;
    this.formTags.value = potentialTags.join(', ');
    this.formDescription.value = description;
    this.formSolution.value = solution;

    // Fecha modal do Discord e atualiza botões
    this.discordImportOverlay.classList.add('hidden');
    this.btnDeleteArticle.classList.add('hidden');
    this.btnSaveArticle.innerHTML = 'Cadastrar Novo Artigo (do Discord)';
    
    alert('Texto do Discord processado! Verifique e ajuste os campos preenchidos antes de salvar.');
  }

  // --- AUXILIARES ---
  _escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  _formatDate(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Formato pt-BR simples: DD/MM/AAAA HH:MM
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch(e) {
      return isoString;
    }
  }
}

// Expõe globalmente
window.adminController = new AdminController();
