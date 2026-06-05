// Lógica de Controle do Painel Administrativo - Inovar Assist

class AdminController {
  constructor() {
    this.selectedArticleId = null;
    this.currentTab = 'articles'; // 'articles' ou 'reports'
    this.correctPasswordHash = '7cbff456e792c5a2c4e61db1d77c1a0172dc70a92d47c72477c7a52e008d51ee'; // Hash SHA-256 da senha 'inovaradmin'
    this.isAuthenticated = false;
    this.selectedUsername = null; // Username do operador em edição
    this.pendingUnresolvedQuery = null; // Termo original de busca frustrada para resolução retroativa
    
    this._initElements();
    this._bindEvents();
    this.populateCategoriesSelect();
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
    
    // Gerenciador de Categorias Dinâmicas
    this.btnManageCategories = document.getElementById('btn-manage-categories');
    this.categoriesModalOverlay = document.getElementById('categories-modal-overlay');
    this.categoriesListContainer = document.getElementById('categories-list-container');
    this.newCategoryInput = document.getElementById('new-category-input');
    this.btnAddCategory = document.getElementById('btn-add-category');
    this.btnCloseCategoriesModal = document.getElementById('btn-close-categories-modal');
    
    // Configurações do Software e Operadores
    this.tabSettingsBtn = document.getElementById('tab-settings-btn');
    this.tabSettingsContent = document.getElementById('tab-settings-content');
    this.usersListContainer = document.getElementById('users-list-container');
    this.userUsernameInput = document.getElementById('user-username-input');
    this.userPasswordInput = document.getElementById('user-password-input');
    this.userRoleInput = document.getElementById('user-role-input');
    this.btnSaveUser = document.getElementById('btn-save-user');
    this.btnCancelUserEdit = document.getElementById('btn-cancel-user-edit');
    this.userFormTitle = document.getElementById('user-form-title');
    
    // Configurações de Parâmetros do Mainframe
    this.settingsThemeSelect = document.getElementById('settings-theme-select');
    this.settingsMenuBarCheckbox = document.getElementById('settings-menu-bar-checkbox');
    this.settingsAutoScrollCheckbox = document.getElementById('settings-auto-scroll-checkbox');
    this.btnResetDb = document.getElementById('btn-reset-db');
    
    // Métricas/Relatórios
    this.metricTotalSearches = document.getElementById('metric-total-searches');
    this.metricResolveRate = document.getElementById('metric-resolve-rate');
    this.metricTopTag = document.getElementById('metric-top-tag');
    this.metricActiveUser = document.getElementById('metric-active-user');
    this.logsTableBody = document.getElementById('logs-table-body');
    this.unresolvedLogsTableBody = document.getElementById('unresolved-logs-table-body');
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
    this.tabSettingsBtn.addEventListener('click', () => this.switchTab('settings'));

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
    
    // Gerenciador de Categorias
    this.btnManageCategories.addEventListener('click', () => this.openCategoriesModal(true));
    this.btnCloseCategoriesModal.addEventListener('click', () => this.openCategoriesModal(false));
    this.btnAddCategory.addEventListener('click', () => this.addNewCategory());
    this.newCategoryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addNewCategory();
    });
    
    // Gerenciador de Operadores
    this.btnSaveUser.addEventListener('click', () => this.handleRegisterUser());
    this.userPasswordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleRegisterUser();
    });
    this.btnCancelUserEdit.addEventListener('click', () => this.resetUserForm());
    
    // Parâmetros do Mainframe
    this.settingsThemeSelect.addEventListener('change', () => this.saveSettingsTheme());
    this.settingsMenuBarCheckbox.addEventListener('change', () => this.saveSettingsMenuBar());
    this.settingsAutoScrollCheckbox.addEventListener('change', () => this.saveSettingsAutoScroll());
    this.btnResetDb.addEventListener('click', () => this.handleResetDatabase());
    
    // Limpeza de logs
    this.btnClearLogs.addEventListener('click', () => this.clearLogs());

    // Fechar modais ao clicar na área escura (fora do card)
    this.adminModalOverlay.addEventListener('click', (e) => {
      if (e.target === this.adminModalOverlay) {
        this.exitAdmin();
      }
    });

    this.categoriesModalOverlay.addEventListener('click', (e) => {
      if (e.target === this.categoriesModalOverlay) {
        this.openCategoriesModal(false);
      }
    });

    this.discordImportOverlay.addEventListener('click', (e) => {
      if (e.target === this.discordImportOverlay) {
        this.openDiscordModal(false);
      }
    });

    // Atalhos globais de teclado e gerenciamento de foco
    document.addEventListener('keydown', (e) => {
      // 1. Tecla ESCAPE: Fechar modais ou cancelar edições
      if (e.key === 'Escape') {
        if (!this.discordImportOverlay.classList.contains('hidden')) {
          this.openDiscordModal(false);
          e.preventDefault();
          return;
        }
        if (!this.categoriesModalOverlay.classList.contains('hidden')) {
          this.openCategoriesModal(false);
          e.preventDefault();
          return;
        }
        if (!this.adminModalOverlay.classList.contains('hidden')) {
          this.exitAdmin();
          e.preventDefault();
          return;
        }
        if (!this.adminView.classList.contains('hidden')) {
          if (this.currentTab === 'settings' && this.selectedUsername) {
            this.resetUserForm();
            e.preventDefault();
            return;
          }
          if (this.currentTab === 'articles' && this.selectedArticleId) {
            this.resetFormForNew();
            e.preventDefault();
            return;
          }
          this.exitAdmin();
          e.preventDefault();
          return;
        }
      }

      // 2. Foco / Armadilha de Foco (Focus Trap) para Modais Abertos
      if (e.key === 'Tab') {
        let activeOverlay = null;
        if (!this.discordImportOverlay.classList.contains('hidden')) {
          activeOverlay = this.discordImportOverlay;
        } else if (!this.categoriesModalOverlay.classList.contains('hidden')) {
          activeOverlay = this.categoriesModalOverlay;
        } else if (!this.adminModalOverlay.classList.contains('hidden')) {
          activeOverlay = this.adminModalOverlay;
        }

        if (activeOverlay) {
          const focusables = Array.from(activeOverlay.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )).filter(el => {
            return !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null;
          });

          if (focusables.length > 0) {
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (e.shiftKey) {
              if (document.activeElement === firstEl) {
                lastEl.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastEl) {
                firstEl.focus();
                e.preventDefault();
              }
            }

            // Garante que o foco permaneça dentro do modal se o usuário clicar fora e tentar usar tab
            if (!activeOverlay.contains(document.activeElement)) {
              firstEl.focus();
              e.preventDefault();
            }
          } else {
            e.preventDefault();
          }
        }
      }

      // 3. Tecla ENTER com modificadores (como envio ou salvamento rápido em inputs de texto)
      if (e.key === 'Enter' && e.ctrlKey) {
        if (!this.adminView.classList.contains('hidden')) {
          if (this.currentTab === 'articles' && document.activeElement.form === this.articleForm) {
            this.articleForm.requestSubmit ? this.articleForm.requestSubmit() : this.btnSaveArticle.click();
            e.preventDefault();
            return;
          }
          if (this.currentTab === 'settings' && (document.activeElement === this.userUsernameInput || document.activeElement === this.userPasswordInput)) {
            this.handleRegisterUser();
            e.preventDefault();
            return;
          }
        }
      }

      // 4. ATALHOS DE TECLADO (Apenas se não estiver digitando em inputs)
      const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

      // Ctrl + Alt + A -> Toggle Admin Portal (Se operador logado for ADM)
      if (e.ctrlKey && e.altKey && e.code === 'KeyA') {
        const user = window.storageService.getCurrentUser();
        if (user && user.role === 'ADM') {
          if (this.adminView.classList.contains('hidden')) {
            this.enterAdminDirectly();
          } else {
            this.exitAdmin();
          }
          e.preventDefault();
          return;
        }
      }

      // Ctrl + F -> Focar campo de pesquisa/busca correspondente
      if (e.ctrlKey && e.code === 'KeyF') {
        if (!this.adminView.classList.contains('hidden') && this.currentTab === 'articles') {
          if (this.adminSearchInput) {
            this.adminSearchInput.focus();
            this.adminSearchInput.select();
            e.preventDefault();
            return;
          }
        }
        if (this.adminView.classList.contains('hidden')) {
          const chatInput = document.getElementById('chat-input');
          if (chatInput && !chatInput.disabled) {
            chatInput.focus();
            chatInput.select();
            e.preventDefault();
            return;
          }
        }
      }

      // Ctrl + N -> Novo Artigo ou Novo Operador no Admin
      if (e.ctrlKey && e.code === 'KeyN') {
        if (!this.adminView.classList.contains('hidden')) {
          if (this.currentTab === 'articles') {
            this.resetFormForNew();
            e.preventDefault();
            return;
          }
          if (this.currentTab === 'settings') {
            this.resetUserForm();
            e.preventDefault();
            return;
          }
        }
      }
    });
  }

  // --- CONTROLE DE SENHA & PORTAL ---
  enterAdmin() {
    const user = window.storageService.getCurrentUser();
    if (!user || user.role !== 'ADM') {
      window.showToast('Acesso negado. Apenas administradores (ADM) podem acessar o Painel Admin.', 'error');
      return;
    }
    
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

  enterAdminDirectly() {
    const user = window.storageService.getCurrentUser();
    if (!user || user.role !== 'ADM') {
      window.showToast('Acesso negado. Apenas administradores (ADM) podem acessar o Painel Admin.', 'error');
      return;
    }
    
    this.adminView.classList.remove('hidden');
    this.chatView.classList.add('hidden');
    this.isAuthenticated = true; // Login do ADM já validou o usuário
    this.adminModalOverlay.classList.add('hidden');
    this.loadAdminView();
  }

  checkPassword() {
    const entered = this.adminPasswordInput.value;
    const enteredHash = window.api && typeof window.api.hashPassword === 'function'
      ? window.api.hashPassword(entered)
      : entered;

    if (enteredHash === this.correctPasswordHash) {
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
      // Restaura o foco no campo de texto do chat
      if (window.chatController.chatInput) {
        setTimeout(() => window.chatController.chatInput.focus(), 80);
      }
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
    
    this.tabArticlesBtn.classList.remove('active');
    this.tabReportsBtn.classList.remove('active');
    this.tabSettingsBtn.classList.remove('active');
    
    this.tabArticlesContent.classList.add('hidden');
    this.tabReportsContent.classList.add('hidden');
    this.tabSettingsContent.classList.add('hidden');
    
    if (tab === 'articles') {
      this.tabArticlesBtn.classList.add('active');
      this.tabArticlesContent.classList.remove('hidden');
      this.renderArticlesList();
      setTimeout(() => {
        if (this.adminSearchInput) {
          this.adminSearchInput.focus();
          this.adminSearchInput.select();
        }
      }, 80);
    } else if (tab === 'reports') {
      this.tabReportsBtn.classList.add('active');
      this.tabReportsContent.classList.remove('hidden');
      this.loadReports();
    } else if (tab === 'settings') {
      this.tabSettingsBtn.classList.add('active');
      this.tabSettingsContent.classList.remove('hidden');
      this.renderUsersList();
      this.loadSettingsInPanel();
      // Foca automaticamente no campo de nome do operador
      setTimeout(() => {
        if (this.userUsernameInput) this.userUsernameInput.focus();
      }, 80);
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
        <div class="kb-item-content">
          <div class="kb-item-title">${this._escapeHTML(item.title)}</div>
          <div class="kb-item-meta">
            <span class="kb-item-category">${this._escapeHTML(item.category)}</span>
            <span>${item.tags.length} tags</span>
          </div>
        </div>
        <button class="kb-item-delete-btn" title="Excluir Artigo">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
      
      card.addEventListener('click', () => this.selectArticle(item.id));
      
      const deleteBtn = card.querySelector('.kb-item-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteArticleDirectly(item.id);
      });
      
      this.kbListContainer.appendChild(card);
    });
  }

  selectArticle(id) {
    this.selectedArticleId = id;
    this.pendingUnresolvedQuery = null;
    
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
    this.pendingUnresolvedQuery = null;
    
    // Remove seleções visuais
    const cards = this.kbListContainer.querySelectorAll('.kb-item-card');
    cards.forEach(c => c.classList.remove('selected'));

    // Reseta inputs
    this.formArticleId.value = '';
    this.formTitle.value = '';
    
    const categories = window.storageService.getCategories();
    if (categories.includes('Fiscal')) {
      this.formCategory.value = 'Fiscal';
    } else if (categories.includes('Geral')) {
      this.formCategory.value = 'Geral';
    } else if (categories.length > 0) {
      this.formCategory.value = categories[0];
    }
    
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
      window.showToast('Por favor, preencha o Título e o Passo a Passo da Solução.', 'warning');
      return;
    }

    if (id) {
      // Editar existente
      const success = window.storageService.updateKnowledge(id, itemData);
      if (success) {
        if (this.pendingUnresolvedQuery) {
          window.storageService.resolveQueryLogsRetroactively(this.pendingUnresolvedQuery, id);
          this.pendingUnresolvedQuery = null;
        }
        window.showToast('Artigo de conhecimento atualizado com sucesso!', 'success');
      }
    } else {
      // Adicionar novo
      const newItem = window.storageService.addKnowledge(itemData);
      this.selectedArticleId = newItem.id;
      if (this.pendingUnresolvedQuery) {
        window.storageService.resolveQueryLogsRetroactively(this.pendingUnresolvedQuery, newItem.id);
        this.pendingUnresolvedQuery = null;
      }
      window.showToast('Novo artigo cadastrado com sucesso!', 'success');
    }

    this.renderArticlesList();
    if (this.selectedArticleId) {
      this.selectArticle(this.selectedArticleId);
    } else {
      this.resetFormForNew();
    }
    
    // Atualiza relatórios para limpar o gargalo de suporte resolvido retroativamente
    this.loadReports();
  }

  deleteArticle() {
    const id = this.formArticleId.value;
    if (!id) return;

    if (confirm('Tem certeza absoluta de que deseja excluir este artigo da base de conhecimento?')) {
      const success = window.storageService.deleteKnowledge(id);
      if (success) {
        window.showToast('Artigo excluído com sucesso!', 'success');
        this.resetFormForNew();
        this.renderArticlesList();
      }
    }
  }

  deleteArticleDirectly(id) {
    if (!id) return;
    const kb = window.storageService.getKnowledge();
    const item = kb.find(x => x.id === id);
    if (!item) return;

    if (confirm(`Tem certeza absoluta de que deseja excluir o artigo "${item.title}"?`)) {
      const success = window.storageService.deleteKnowledge(id);
      if (success) {
        window.showToast('Artigo excluído com sucesso!', 'success');
        if (this.formArticleId.value === id) {
          this.resetFormForNew();
        }
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
    
    if (logs.length > 0) {
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
    } else {
      this.logsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhuma interação registrada ainda.</td></tr>';
    }

    // 6. Filtrar e Renderizar "Consultas Sem Resolução" (Gargalos de Suporte - 0 resultados ou resolvido === false)
    const unresolvedLogs = logs.filter(l => !l.articleId || l.resolved === false);
    const unresolvedGroups = {};

    unresolvedLogs.forEach(l => {
      const cleanQuery = l.query.trim().toLowerCase();
      if (!cleanQuery) return;
      if (!unresolvedGroups[cleanQuery]) {
        unresolvedGroups[cleanQuery] = {
          query: l.query.trim(),
          count: 0,
          lastSeen: l.timestamp
        };
      }
      unresolvedGroups[cleanQuery].count++;
      if (new Date(l.timestamp) > new Date(unresolvedGroups[cleanQuery].lastSeen)) {
        unresolvedGroups[cleanQuery].lastSeen = l.timestamp;
      }
    });

    const sortedUnresolved = Object.values(unresolvedGroups).sort((a, b) => b.count - a.count);
    
    if (this.unresolvedLogsTableBody) {
      this.unresolvedLogsTableBody.innerHTML = '';
      
      if (sortedUnresolved.length > 0) {
        sortedUnresolved.forEach((item, idx) => {
          const tr = document.createElement('tr');
          const timeStr = this._formatDate(item.lastSeen);
          
          tr.innerHTML = `
            <td style="font-weight: 600; color: var(--color-danger);">${this._escapeHTML(item.query)}</td>
            <td style="text-align: center; font-weight: 700;">${item.count}x</td>
            <td style="text-align: center;" class="log-time">${timeStr}</td>
            <td style="text-align: center;">
              <button type="button" class="btn-primary doc-action-btn" id="btn-doc-${idx}" style="font-size: 0.7rem; padding: 0.3rem 0.65rem; width: auto; display: inline-flex; height: auto; align-items: center; gap: 0.2rem; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                Documentar
              </button>
            </td>
          `;
          this.unresolvedLogsTableBody.appendChild(tr);

          const btnDoc = tr.querySelector(`#btn-doc-${idx}`);
          if (btnDoc) {
            btnDoc.addEventListener('click', () => {
              this.switchTab('articles');
              this.resetFormForNew();
              
              // Guarda o termo frustrado original para resolver retroativamente no salvamento
              this.pendingUnresolvedQuery = item.query;
              
              // Preenche título com o termo buscado de forma limpa
              const capitalised = item.query.charAt(0).toUpperCase() + item.query.slice(1);
              this.formTitle.value = `Erro: ${capitalised}`;
              
              // Tenta extrair tags simples
              const potentialTags = item.query.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2 && !['erro', 'como', 'para', 'nao', 'falha'].includes(w));
              
              this.formTags.value = potentialTags.join(', ');
              this.formTitle.focus();
              window.showToast(`Formulário preenchido para documentar erro "${item.query}"!`, 'info');
            });
          }
        });
      } else {
        this.unresolvedLogsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.25rem;">Nenhuma busca com 0 resultados registrada.</td></tr>';
      }
    }
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
        window.showToast('Banco de Dados da Base de Conhecimento importado com sucesso!', 'success');
        this.renderArticlesList();
        this.resetFormForNew();
      } else {
        window.showToast('Erro ao importar backup. Verifique se o arquivo JSON está correto.', 'error');
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
    const txtBruto = this.discordPasteArea.value;
    if (!txtBruto.trim()) {
      window.showToast("Cole algum texto antes de processar.", "warning");
      return;
    }

    let titulo = "";
    let solucao = txtBruto;
    let tagsDetectadas = [];

    // 1. Tenta pegar a primeira linha em negrito como o Título (ex: **Erro de Timeout**)
    const boldMatch = txtBruto.match(/\*\*(.*?)\*\*/);
    if (boldMatch && boldMatch[1]) {
      titulo = boldMatch[1].trim();
    } else {
      // Fallback: pega a primeira linha do texto como título
      const linhas = txtBruto.split('\n');
      titulo = linhas[0].replace(/[#*_-]/g, "").trim();
    }

    // 2. Tenta extrair palavras técnicas comuns no seu dia a dia para sugerir como Tags
    const dicionarioTags = ['sefaz', 'filizola', 'timeout', 'deadlock', 'banco', 'sql', 'porta', 'serial', 'com1', 'nfe', 'pdv', 'impressora'];
    const textoMinusculo = txtBruto.toLowerCase();
    
    dicionarioTags.forEach(tag => {
      if (textoMinusculo.includes(tag) && !tagsDetectadas.includes(tag)) {
        tagsDetectadas.push(tag);
      }
    });

    // 3. Preenche automaticamente o formulário do painel administrativo
    this.selectedArticleId = null;
    this.formArticleId.value = '';
    this.formTitle.value = titulo.substring(0, 100); // Limita tamanho
    this.formTags.value = tagsDetectadas.join(', ');
    this.formDescription.value = `Importado do chat em ${new Date().toLocaleDateString('pt-BR')}`;
    this.formSolution.value = solucao;

    // Extrai categorias baseando-se em palavras chaves do texto cruzar dinamicamente com o banco
    const categoriasExistentes = window.storageService.getCategories();
    let category = 'Geral';

    // 1. Tenta encontrar se o nome de alguma das categorias dinâmicas aparece no texto
    for (const cat of categoriasExistentes) {
      const catLimpa = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const textoLimpo = textoMinusculo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (textoLimpo.includes(catLimpa)) {
        category = cat;
        break;
      }
    }

    // 2. Fallback inteligente usando palavras chaves clássicas mapeadas nas categorias dinâmicas
    if (category === 'Geral') {
      if (textoMinusculo.includes('nfe') || textoMinusculo.includes('sefaz') || textoMinusculo.includes('imposto') || textoMinusculo.includes('nota')) {
        const found = categoriasExistentes.find(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'fiscal');
        if (found) category = found;
      } else if (textoMinusculo.includes('banco') || textoMinusculo.includes('sql') || textoMinusculo.includes('query') || textoMinusculo.includes('lock')) {
        const found = categoriasExistentes.find(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'banco de dados');
        if (found) category = found;
      } else if (textoMinusculo.includes('impressora') || textoMinusculo.includes('bematech') || textoMinusculo.includes('balanca') || textoMinusculo.includes('serial') || textoMinusculo.includes('periferico')) {
        const found = categoriasExistentes.find(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'perifericos');
        if (found) category = found;
      } else if (textoMinusculo.includes('instala') || textoMinusculo.includes('config') || textoMinusculo.includes('setup')) {
        const found = categoriasExistentes.find(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'instalacao');
        if (found) category = found;
      }
    }
    this.formCategory.value = category;

    // Fecha o modal e avisa o usuário
    this.discordImportOverlay.classList.add('hidden');
    this.btnDeleteArticle.classList.add('hidden');
    this.btnSaveArticle.innerHTML = 'Cadastrar Novo Artigo';

    window.showToast("Instrução convertida! Revise e clique em Salvar.", "success");
  }

  // --- GERENCIAMENTO DE CATEGORIAS DINÂMICAS ---
  populateCategoriesSelect() {
    const select = this.formCategory;
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    
    const categories = window.storageService.getCategories();
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
    
    if (categories.includes(currentValue)) {
      select.value = currentValue;
    } else if (categories.includes('Geral')) {
      select.value = 'Geral';
    } else if (categories.length > 0) {
      select.value = categories[0];
    }
  }

  openCategoriesModal(open) {
    if (open) {
      this.categoriesModalOverlay.classList.remove('hidden');
      this.newCategoryInput.value = '';
      this.renderCategoriesModalList();
      setTimeout(() => this.newCategoryInput.focus(), 100);
    } else {
      this.categoriesModalOverlay.classList.add('hidden');
    }
  }

  renderCategoriesModalList() {
    const categories = window.storageService.getCategories();
    this.categoriesListContainer.innerHTML = '';
    
    if (categories.length === 0) {
      this.categoriesListContainer.innerHTML = '<div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">Nenhuma categoria cadastrada.</div>';
      return;
    }
    
    categories.forEach(cat => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '0.4rem 0.6rem';
      row.style.background = 'rgba(255, 255, 255, 0.02)';
      row.style.border = '1px solid var(--border-color)';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.fontSize = '0.825rem';
      row.style.gap = '0.5rem';
      
      row.innerHTML = `
        <span style="color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this._escapeHTML(cat)}</span>
        <button type="button" class="kb-item-delete-btn" style="opacity: 0.7; padding: 0.2rem; border-radius: var(--radius-sm); background: none; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted);" title="Excluir Categoria">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
      
      const delBtn = row.querySelector('.kb-item-delete-btn');
      delBtn.addEventListener('click', () => this.deleteCategoryDirectly(cat));
      // Estilização direta de hover no lixo das categorias
      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.color = 'var(--color-danger)';
        delBtn.style.backgroundColor = 'rgba(255, 51, 51, 0.1)';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.color = 'var(--text-muted)';
        delBtn.style.backgroundColor = 'transparent';
      });
      
      this.categoriesListContainer.appendChild(row);
    });
  }

  addNewCategory() {
    const name = this.newCategoryInput.value.trim();
    if (!name) {
      window.showToast('Por favor, informe um nome para a categoria.', 'warning');
      return;
    }
    
    if (name.length > 30) {
      window.showToast('O nome da categoria não pode exceder 30 caracteres.', 'warning');
      return;
    }
    
    const success = window.storageService.addCategory(name);
    if (success) {
      window.showToast('Categoria adicionada com sucesso!', 'success');
      this.newCategoryInput.value = '';
      this.renderCategoriesModalList();
      this.populateCategoriesSelect();
      this.formCategory.value = name;
    } else {
      window.showToast('Esta categoria já existe na lista.', 'warning');
    }
  }

  deleteCategoryDirectly(name) {
    if (name === 'Geral') {
      window.showToast('A categoria "Geral" é padrão do sistema e não pode ser excluída.', 'warning');
      return;
    }
    
    if (confirm(`Tem certeza absoluta de que deseja excluir a categoria "${name}"? Artigos vinculados a ela serão movidos automaticamente para "Geral".`)) {
      const kb = window.storageService.getKnowledge();
      let updatedCount = 0;
      kb.forEach(art => {
        if (art.category === name) {
          art.category = 'Geral';
          window.storageService.updateKnowledge(art.id, art);
          updatedCount++;
        }
      });
      
      const success = window.storageService.deleteCategory(name);
      if (success) {
        window.showToast(`Categoria excluída com sucesso! ${updatedCount > 0 ? updatedCount + ' artigo(s) movido(s) para Geral.' : ''}`, 'success');
        this.renderCategoriesModalList();
        this.populateCategoriesSelect();
        this.renderArticlesList();
      } else {
        window.showToast('Erro ao excluir a categoria.', 'error');
      }
    }
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

  // --- GERENCIAMENTO DE OPERADORES (USUÁRIOS) ---
  renderUsersList() {
    const users = window.storageService.getUsers();
    this.usersListContainer.innerHTML = '';
    
    if (users.length === 0) {
      this.usersListContainer.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Nenhum operador cadastrado.</div>';
      return;
    }
    
    users.forEach(u => {
      const card = document.createElement('div');
      card.className = `kb-item-card ${this.selectedUsername === u.username ? 'selected' : ''}`;
      card.dataset.username = u.username;
      
      const isMaster = u.username.toLowerCase() === 'guilherme';
      const deleteButtonHTML = isMaster ? '' : `
        <button class="kb-item-delete-btn" style="opacity: 0.6;" title="Excluir Operador">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
      
      // Exibe "SUPORTE" em vez de "NORMAL" para o usuário
      const displayRole = u.role === 'ADM' ? 'ADM' : 'SUPORTE';
      const roleColor = u.role === 'ADM' ? 'var(--inovar-red)' : 'var(--text-secondary)';
      const roleBg = u.role === 'ADM' ? 'rgba(230, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)';
      
      card.innerHTML = `
        <div class="kb-item-content">
          <div class="kb-item-title" style="font-weight: 600;">${this._escapeHTML(u.username)}</div>
          <div class="kb-item-meta">
            <span class="kb-item-category" style="background-color: ${roleBg}; color: ${roleColor}; font-size: 0.65rem; padding: 0.1rem 0.3rem;">${displayRole}</span>
            <span style="font-size: 0.625rem; opacity: 0.8; font-family: monospace;">Hash: ${this._escapeHTML(u.password.substring(0, 8))}...</span>
          </div>
        </div>
        ${deleteButtonHTML}
      `;
      
      // Permitir clicar no card para editar
      card.addEventListener('click', () => this.selectUser(u.username));
      
      if (!isMaster) {
        const delBtn = card.querySelector('.kb-item-delete-btn');
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleDeleteUser(u.username);
        });
      }
      
      this.usersListContainer.appendChild(card);
    });
  }

  selectUser(username) {
    console.log("Selecionou operador para edição:", username);
    this.selectedUsername = username;
    
    // Destaca visualmente o card selecionado
    const cards = this.usersListContainer.querySelectorAll('.kb-item-card');
    cards.forEach(c => {
      if (c.dataset.username === username) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    const users = window.storageService.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      this.userUsernameInput.value = user.username;
      
      // O administrador padrão 'guilherme' não pode ser renomeado para manter a segurança do sistema
      const isMaster = user.username.toLowerCase() === 'guilherme';
      this.userUsernameInput.disabled = isMaster;
      
      // Limpa e instrui sobre alteração opcional de senha
      this.userPasswordInput.value = '';
      this.userPasswordInput.placeholder = 'Deixar em branco para manter a mesma';
      this.userPasswordInput.required = false; 
      
      this.userRoleInput.value = (user.role === 'ADM') ? 'ADM' : 'NORMAL';
      
      if (this.userFormTitle) {
        this.userFormTitle.textContent = `Editar Operador: ${user.username}`;
      }
      
      this.btnSaveUser.innerHTML = 'Atualizar Operador';
      this.btnCancelUserEdit.classList.remove('hidden');
      
      // Foca automaticamente no campo de senha para rapidez ao editar
      setTimeout(() => {
        if (this.userPasswordInput) this.userPasswordInput.focus();
      }, 80);
    }
  }

  resetUserForm() {
    this.selectedUsername = null;
    
    // Remove destaques
    const cards = this.usersListContainer.querySelectorAll('.kb-item-card');
    cards.forEach(c => c.classList.remove('selected'));

    this.userUsernameInput.value = '';
    this.userUsernameInput.disabled = false;
    
    this.userPasswordInput.value = '';
    this.userPasswordInput.placeholder = 'Senha do operador...';
    this.userPasswordInput.required = true;
    
    this.userRoleInput.value = 'NORMAL';
    
    if (this.userFormTitle) {
      this.userFormTitle.textContent = 'Cadastrar Novo Operador';
    }
    
    this.btnSaveUser.innerHTML = 'Cadastrar Operador';
    this.btnCancelUserEdit.classList.add('hidden');
    
    // Retorna o foco para o campo de nome de usuário
    setTimeout(() => {
      if (this.userUsernameInput) this.userUsernameInput.focus();
    }, 80);
  }

  handleRegisterUser() {
    const username = this.userUsernameInput.value.trim();
    const password = this.userPasswordInput.value.trim();
    const role = this.userRoleInput.value;
    
    if (!username) {
      window.showToast('Por favor, informe o nome de usuário.', 'warning');
      return;
    }
    
    if (username.length > 25) {
      window.showToast('O nome de usuário não pode exceder 25 caracteres.', 'warning');
      return;
    }
    
    if (this.selectedUsername) {
      // MODO DE EDIÇÃO
      const users = window.storageService.getUsers();
      const idx = users.findIndex(u => u.username.toLowerCase() === this.selectedUsername.toLowerCase());
      if (idx !== -1) {
        const newUsernameLower = username.toLowerCase();
        const oldUsernameLower = this.selectedUsername.toLowerCase();
        
        // Se mudou o nome de usuário, verifica se já existe outro operador com esse nome
        if (newUsernameLower !== oldUsernameLower) {
          if (users.some(u => u.username.toLowerCase() === newUsernameLower)) {
            window.showToast('Este nome de usuário já está sendo utilizado por outro operador.', 'warning');
            return;
          }
          users[idx].username = username;
          
          // Se for o próprio operador atualmente logado, atualiza seus dados de sessão
          const currentUser = window.storageService.getCurrentUser();
          if (currentUser && currentUser.username.toLowerCase() === oldUsernameLower) {
            currentUser.username = username;
            currentUser.role = role;
            window.storageService.setCurrentUser(currentUser);
          }
        }
        
        users[idx].role = role;
        
        // Se uma nova senha foi digitada, aplica o hash antes de salvar
        if (password !== '') {
          users[idx].password = window.storageService._hashPassword(password);
        }
        
        window.storageService.saveUsers(users);
        window.showToast(`Operador "${username}" atualizado com sucesso!`, 'success');
        this.resetUserForm();
        this.renderUsersList();
      } else {
        window.showToast('Erro ao atualizar operador. Usuário não encontrado.', 'error');
      }
    } else {
      // MODO DE CADASTRO
      if (!password) {
        window.showToast('Por favor, preencha a senha do operador.', 'warning');
        return;
      }
      
      const success = window.storageService.addUser(username, password, role);
      if (success) {
        window.showToast(`Operador "${username}" cadastrado com sucesso!`, 'success');
        this.resetUserForm();
        this.renderUsersList();
      } else {
        window.showToast('Este nome de usuário já está sendo utilizado.', 'warning');
      }
    }
  }

  handleDeleteUser(username) {
    if (confirm(`Tem certeza absoluta de que deseja excluir o operador "${username}" do sistema? Ele perderá acesso ao chat.`)) {
      const success = window.storageService.deleteUser(username);
      if (success) {
        window.showToast('Operador excluído com sucesso!', 'success');
        if (this.selectedUsername === username) {
          this.resetUserForm();
        }
        this.renderUsersList();
      } else {
        window.showToast('Erro ao excluir o operador.', 'error');
      }
    }
  }

  // --- GERENCIAMENTO DE CONFIGURAÇÕES DO PORTAL ---
  loadSettingsInPanel() {
    const settings = window.storageService.getSettings();
    
    if (this.settingsThemeSelect) {
      this.settingsThemeSelect.value = settings.theme || 'red';
    }
    if (this.settingsMenuBarCheckbox) {
      this.settingsMenuBarCheckbox.checked = !!settings.showMenuBar;
    }
    if (this.settingsAutoScrollCheckbox) {
      this.settingsAutoScrollCheckbox.checked = settings.autoScroll !== false;
    }
  }

  saveSettingsTheme() {
    const settings = window.storageService.getSettings();
    settings.theme = this.settingsThemeSelect.value;
    window.storageService.saveSettings(settings);
    
    // Aplica o tema visual no body instantaneamente
    if (settings.theme && settings.theme !== 'red') {
      document.body.className = `theme-${settings.theme}`;
    } else {
      document.body.className = '';
    }
    window.showToast('Tema visual do mainframe atualizado!', 'success');
  }

  saveSettingsMenuBar() {
    const settings = window.storageService.getSettings();
    settings.showMenuBar = this.settingsMenuBarCheckbox.checked;
    window.storageService.saveSettings(settings);
    
    // Aplica a visibilidade do menu Electron instantaneamente
    if (window.api && typeof window.api.setMenuBarVisibility === 'function') {
      window.api.setMenuBarVisibility(settings.showMenuBar);
    }
    window.showToast('Configuração de menus da janela salva!', 'success');
  }

  saveSettingsAutoScroll() {
    const settings = window.storageService.getSettings();
    settings.autoScroll = this.settingsAutoScrollCheckbox.checked;
    window.storageService.saveSettings(settings);
    window.showToast('Preferência de auto-scroll salva!', 'success');
  }

  handleResetDatabase() {
    if (confirm('ATENÇÃO: Deseja realmente restaurar o Banco de Dados? Isso apagará todas as resoluções de erros e manuais cadastrados por você, voltando ao estado original.')) {
      if (confirm('CONFIRMAÇÃO EXTREMA: Clique em OK para prosseguir com a redefinição total dos artigos e logs da base de conhecimento.')) {
        window.storageService.resetDatabase();
        window.showToast('Banco de Dados restaurado com sucesso!', 'success');
        
        // Atualiza a visualização do painel admin
        this.renderArticlesList();
        this.resetFormForNew();
        this.loadReports();
      }
    }
  }
}

// Expõe globalmente após o carregamento do DOM para evitar falhas de elemento
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.adminController = new AdminController();
  } catch (e) {
    console.error('Erro ao inicializar AdminController:', e);
  }
});
