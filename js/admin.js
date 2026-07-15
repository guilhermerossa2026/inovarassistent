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
    
    // Configurações do Discord
    this.btnSaveDiscord = document.getElementById('btn-save-discord');
    
    // Importador Discord (3 Colunas)
    this.btnOpenDiscordImport = document.getElementById('btn-open-discord-import');
    this.discordImportOverlay = document.getElementById('discord-import-overlay');
    this.btnCancelDiscord = document.getElementById('btn-cancel-discord');
    this.settingsDiscordToken = document.getElementById('settings-discord-token');
    this.settingsDiscordGuild = document.getElementById('settings-discord-guild');
    this.discordChannelsTree = document.getElementById('discord-channels-tree');
    this.discordMsgContainer = document.getElementById('discord-msg-container');
    this.discordMsgPreviewPanel = document.getElementById('discord-msg-preview-panel');
    this.discordHideImported = document.getElementById('discord-hide-imported');
    this.btnImportBulkDiscord = document.getElementById('btn-import-bulk-discord');

    // Assistente de Curadoria (Wizard)
    this.discordCurationWizard = document.getElementById('discord-curation-wizard');
    this.curationQueueIndicator = document.getElementById('curation-queue-indicator');
    this.curationMsgOriginal = document.getElementById('curation-msg-original');
    this.curationTitle = document.getElementById('curation-title');
    this.curationCategory = document.getElementById('curation-category');
    this.curationTags = document.getElementById('curation-tags');
    this.curationDescription = document.getElementById('curation-description');
    this.curationSolution = document.getElementById('curation-solution');
    this.btnCurationDiscard = document.getElementById('btn-curation-discard');
    this.btnCurationDraft = document.getElementById('btn-curation-draft');
    this.btnCurationPublish = document.getElementById('btn-curation-publish');
    
    // Gerenciador de Categorias Dinâmicas
    this.btnManageCategories = document.getElementById('btn-manage-categories');
    this.btnManageCategoriesCuration = document.getElementById('btn-manage-categories-curation');
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
    
    // Cloud Sync
    this.settingsSyncUrl = document.getElementById('settings-sync-url');
    this.settingsSyncToken = document.getElementById('settings-sync-token');
    this.syncStatusText = document.getElementById('sync-status-text');
    this.btnCloudSync = document.getElementById('btn-cloud-sync');
    
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

    // Importador do Discord (3 Colunas)
    if (this.btnOpenDiscordImport) {
      this.btnOpenDiscordImport.addEventListener('click', () => this.openDiscordModal(true));
    }
    if (this.btnCancelDiscord) {
      this.btnCancelDiscord.addEventListener('click', () => this.openDiscordModal(false));
    }
    if (this.discordHideImported) {
      this.discordHideImported.addEventListener('change', () => this.renderDiscordMessages());
    }
    if (this.btnImportBulkDiscord) {
      this.btnImportBulkDiscord.addEventListener('click', () => this.startCurationWizard());
    }
    
    if (this.btnSaveDiscord) {
      this.btnSaveDiscord.addEventListener('click', () => this.saveDiscordSettings());
    }

    // Assistente de Curadoria (Wizard)
    this.btnCurationDiscard.addEventListener('click', () => this.handleCurationDiscard());
    this.btnCurationDraft.addEventListener('click', () => this.handleCurationDraft());
    this.btnCurationPublish.addEventListener('click', () => this.handleCurationPublish());
    
    // Gerenciador de Categorias
    this.btnManageCategories.addEventListener('click', () => this.openCategoriesModal(true));
    if (this.btnManageCategoriesCuration) {
      this.btnManageCategoriesCuration.addEventListener('click', () => this.openCategoriesModal(true));
    }
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
    
    // Cloud Sync
    if (this.btnCloudSync) {
      this.btnCloudSync.addEventListener('click', () => this.handleCloudSync());
    }
    if (this.settingsSyncUrl) {
      this.settingsSyncUrl.addEventListener('change', () => this.saveSyncSettings());
    }
    if (this.settingsSyncToken) {
      this.settingsSyncToken.addEventListener('change', () => this.saveSyncSettings());
    }
    
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

    this.discordCurationWizard.addEventListener('click', (e) => {
      if (e.target === this.discordCurationWizard) {
        this.forceDraftRemainingCurationItems();
        this.discordCurationWizard.classList.add('hidden');
      }
    });

    // Atalhos globais de teclado e gerenciamento de foco
    document.addEventListener('keydown', (e) => {
      // 1. Tecla ESCAPE: Fechar modais ou cancelar edições
      if (e.key === 'Escape') {
        if (!this.discordCurationWizard.classList.contains('hidden')) {
          this.forceDraftRemainingCurationItems();
          this.discordCurationWizard.classList.add('hidden');
          e.preventDefault();
          return;
        }
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

  // Distribuição e Backups em formato JSON removidos a pedido do usuário

  // --- IMPORTADOR DISCORD (3 COLUNAS) ---
  async openDiscordModal(open) {
    if (open) {
      const user = window.storageService.getCurrentUser();
      if (!user || user.role !== 'ADM') {
        window.showToast('Acesso negado. Apenas administradores (ADM) podem importar dados do Discord.', 'error');
        return;
      }

      const settings = window.storageService.getSettings();
      if (!settings.discordBotToken || !settings.discordGuildId) {
        window.showToast('Por favor, configure o Token do Bot e o ID do Servidor Discord nas Configurações primeiro.', 'warning');
        return;
      }

      this.discordImportOverlay.classList.remove('hidden');
      this.activeDiscordChannelId = null;
      this.activeDiscordChannelName = '';
      this.discordMessagesCache = [];
      this.selectedMessageIds = new Set();
      
      // Reseta visualização
      this.discordMsgContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding-top: 2rem;">Selecione um canal</div>';
      this.discordMsgPreviewPanel.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding-top: 4rem;">Selecione uma mensagem para visualizar</div>';
      this.btnImportBulkDiscord.disabled = true;

      await this.loadDiscordChannels();
    } else {
      this.discordImportOverlay.classList.add('hidden');
    }
  }

  async _getDecryptedDiscordToken() {
    const settings = window.storageService.getSettings();
    const token = settings.discordBotToken || '';
    if (token && window.api && typeof window.api.decryptString === 'function') {
      try {
        return await window.api.decryptString(token);
      } catch (err) {
        console.error("Erro ao decifrar token:", err);
      }
    }
    return token;
  }

  async loadDiscordChannels() {
    this.discordChannelsTree.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding-top: 2rem;">Carregando canais...</div>';
    
    try {
      const settings = window.storageService.getSettings();
      const token = await this._getDecryptedDiscordToken();
      const channels = await window.api.fetchDiscordChannels(settings.discordGuildId, token);
      
      if (channels.error) {
        throw new Error(channels.error);
      }

      // Separa categorias e canais de texto
      const categories = channels.filter(c => c.type === 4);
      const textChannels = channels.filter(c => c.type === 0);

      this.discordChannelsTree.innerHTML = '';

      // Agrupa por categoria
      categories.sort((a, b) => a.position - b.position);
      
      categories.forEach(cat => {
        const catChannels = textChannels
          .filter(c => c.parent_id === cat.id)
          .sort((a, b) => a.position - b.position);

        if (catChannels.length === 0) return; // Oculta categorias vazias

        const catGroup = document.createElement('div');
        catGroup.className = 'discord-category-group';
        
        catGroup.innerHTML = `
          <div class="discord-category-header">
            <input type="checkbox" class="discord-category-check" style="width: auto; cursor: pointer; margin: 0;" data-cat-id="${cat.id}">
            <span>${this._escapeHTML(cat.name)}</span>
          </div>
          <div class="discord-category-channels" id="cat-channels-${cat.id}"></div>
        `;

        const channelsContainer = catGroup.querySelector(`#cat-channels-${cat.id}`);
        
        catChannels.forEach(chan => {
          const item = document.createElement('div');
          item.className = 'discord-channel-item';
          item.dataset.chanId = chan.id;
          item.dataset.chanName = chan.name;
          
          item.innerHTML = `
            <input type="checkbox" class="discord-chan-check" style="width: auto; cursor: pointer; margin: 0;" data-chan-id="${chan.id}">
            <span># ${this._escapeHTML(chan.name)}</span>
          `;

          // Evento de clique para selecionar canal (sem propagar para o checkbox do canal)
          item.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            // Remove active dos outros canais
            const actives = this.discordChannelsTree.querySelectorAll('.discord-channel-item.active');
            actives.forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            this.selectDiscordChannel(chan.id, chan.name);
          });

          channelsContainer.appendChild(item);
        });

        // Evento do Checkbox de Categoria (Selecionar/Deselecionar todos da categoria)
        const catCheck = catGroup.querySelector('.discord-category-check');
        catCheck.addEventListener('change', () => {
          const childChecks = channelsContainer.querySelectorAll('.discord-chan-check');
          childChecks.forEach(cb => {
            cb.checked = catCheck.checked;
          });
        });

        this.discordChannelsTree.appendChild(catGroup);
      });

      // Se houver canais de texto sem categoria (órfãos)
      const orphanChannels = textChannels.filter(c => !c.parent_id).sort((a, b) => a.position - b.position);
      if (orphanChannels.length > 0) {
        const catGroup = document.createElement('div');
        catGroup.className = 'discord-category-group';
        catGroup.innerHTML = `
          <div class="discord-category-header">Canais Sem Categoria</div>
          <div class="discord-category-channels" id="cat-channels-orphans"></div>
        `;
        const channelsContainer = catGroup.querySelector('#cat-channels-orphans');
        orphanChannels.forEach(chan => {
          const item = document.createElement('div');
          item.className = 'discord-channel-item';
          item.dataset.chanId = chan.id;
          item.dataset.chanName = chan.name;
          item.innerHTML = `
            <input type="checkbox" class="discord-chan-check" style="width: auto; cursor: pointer; margin: 0;" data-chan-id="${chan.id}">
            <span># ${this._escapeHTML(chan.name)}</span>
          `;
          item.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;
            const actives = this.discordChannelsTree.querySelectorAll('.discord-channel-item.active');
            actives.forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            this.selectDiscordChannel(chan.id, chan.name);
          });
          channelsContainer.appendChild(item);
        });
        this.discordChannelsTree.appendChild(catGroup);
      }

    } catch (e) {
      window.showToast(`Falha ao carregar canais do Discord: ${e.message}`, 'error');
      this.discordChannelsTree.innerHTML = '<div style="font-size: 0.8rem; color: var(--color-danger); text-align: center; padding-top: 2rem;">Falha na conexão</div>';
    }
  }

  async selectDiscordChannel(channelId, channelName) {
    this.activeDiscordChannelId = channelId;
    this.activeDiscordChannelName = channelName;
    await this.renderDiscordMessages();
  }

  async renderDiscordMessages() {
    if (!this.activeDiscordChannelId) return;

    this.discordMsgContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 1rem;">
        <div class="skeleton-box skeleton-text" style="width: 70%;"></div>
        <div class="skeleton-box skeleton-text"></div>
        <div class="skeleton-box skeleton-text"></div>
      </div>
    `;

    try {
      const token = await this._getDecryptedDiscordToken();
      const messages = await window.api.fetchDiscordMessages(this.activeDiscordChannelId, token);

      if (messages.error) {
        throw new Error(messages.error);
      }

      this.discordMessagesCache = messages;
      this.discordMsgContainer.innerHTML = '';

      if (messages.length === 0) {
        this.discordMsgContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding-top: 2rem;">Nenhuma mensagem neste canal</div>';
        return;
      }

      const hideImported = this.discordHideImported.checked;
      const kb = window.storageService.getKnowledge();

      let visibleCount = 0;

      messages.forEach(msg => {
        // Verifica se a mensagem já foi importada
        const isImported = kb.some(art => art.discordMessageId === msg.id);

        if (hideImported && isImported) return;

        visibleCount++;

        const card = document.createElement('div');
        card.className = 'discord-msg-card';
        card.dataset.msgId = msg.id;

        const initials = msg.author.username.substring(0, 2).toUpperCase();
        const date = new Date(msg.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        card.innerHTML = `
          <input type="checkbox" class="discord-msg-check" style="width: auto; cursor: pointer; margin: 0; align-self: center;" data-msg-id="${msg.id}" ${isImported ? 'disabled' : ''}>
          <div class="discord-msg-avatar">${initials}</div>
          <div class="discord-msg-meta">
            <div class="discord-msg-author">
              <span>${this._escapeHTML(msg.author.username)}</span>
              <span class="discord-msg-time">${date}</span>
            </div>
            <div class="discord-msg-text">${this._escapeHTML(msg.content)}</div>
            ${isImported ? '<div style="margin-top: 0.2rem;"><span class="badge badge-success">Já Importado</span></div>' : ''}
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT') {
            this.updateImportButtonState();
            return;
          }
          
          const actives = this.discordMsgContainer.querySelectorAll('.discord-msg-card.active');
          actives.forEach(el => el.classList.remove('active'));
          card.classList.add('active');

          this.showDiscordMessagePreview(msg);
        });

        this.discordMsgContainer.appendChild(card);
      });

      if (visibleCount === 0) {
        this.discordMsgContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding-top: 2rem;">Postagens ocultadas (filtros ativos)</div>';
      }

    } catch (e) {
      window.showToast(`Erro ao carregar mensagens: ${e.message}`, 'error');
      this.discordMsgContainer.innerHTML = '<div style="font-size: 0.8rem; color: var(--color-danger); text-align: center; padding-top: 2rem;">Erro na busca</div>';
    }
  }

  showDiscordMessagePreview(msg) {
    this.discordMsgPreviewPanel.innerHTML = '';

    const preview = document.createElement('div');
    preview.style.display = 'flex';
    preview.style.flexDirection = 'column';
    preview.style.gap = '0.75rem';

    const date = new Date(msg.timestamp).toLocaleString('pt-BR');

    // Monta anexos se existirem
    let attachmentsHTML = '';
    if (msg.attachments && msg.attachments.length > 0) {
      attachmentsHTML = '<div class="discord-preview-attachments">';
      msg.attachments.forEach(att => {
        if (att.content_type && att.content_type.startsWith('image/')) {
          attachmentsHTML += `<img src="${att.url}" class="discord-preview-img" title="${this._escapeHTML(att.filename)}">`;
        } else {
          attachmentsHTML += `<div style="font-size: 0.75rem; color: var(--inovar-red); text-decoration: underline; cursor: pointer;" onclick="window.api.openExternalLink('${att.url}')">[Anexo: ${this._escapeHTML(att.filename)}]</div>`;
        }
      });
      attachmentsHTML += '</div>';
    }

    preview.innerHTML = `
      <div class="discord-preview-header">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${this._escapeHTML(msg.author.username)}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">${date}</div>
      </div>
      <div class="discord-preview-body">${this.renderMarkdownSimple(msg.content)}</div>
      ${attachmentsHTML}
    `;

    this.discordMsgPreviewPanel.appendChild(preview);
  }

  updateImportButtonState() {
    const checkedBoxes = this.discordMsgContainer.querySelectorAll('.discord-msg-check:checked');
    this.btnImportBulkDiscord.disabled = checkedBoxes.length === 0;
  }

  renderMarkdownSimple(text) {
    if (!text) return '';
    let escaped = this._escapeHTML(text);
    // Transforma blocos de código
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 4px; font-family: monospace; border: 1px solid var(--border-color); overflow-x: auto; margin: 0.5rem 0;">$1</pre>');
    // Transforma negrito
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Quebras de linha
    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
  }

  // --- MOTOR DE CURADORIA E WIZARD DE VALIDAÇÃO ---
  async startCurationWizard() {
    const checkedBoxes = this.discordMsgContainer.querySelectorAll('.discord-msg-check:checked');
    if (checkedBoxes.length === 0) return;

    this.curationQueue = [];
    this.currentCurationIndex = 0;

    // Bloqueia botão e exibe carregamento
    const originalText = this.btnImportBulkDiscord.innerHTML;
    this.btnImportBulkDiscord.disabled = true;
    this.btnImportBulkDiscord.innerHTML = 'Baixando anexos...';

    const token = await this._getDecryptedDiscordToken();

    for (const box of checkedBoxes) {
      const msgId = box.dataset.msgId;
      const msg = this.discordMessagesCache.find(m => m.id === msgId);
      if (!msg) continue;

      const localImages = [];

      // Download de imagens de anexo offline-first
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.content_type && att.content_type.startsWith('image/')) {
            try {
              const res = await window.api.downloadDiscordImage(att.url, token);
              if (res.success) {
                localImages.push(res.fileName);
              }
            } catch (err) {
              console.error("Erro ao baixar anexo:", err);
            }
          }
        }
      }

      this.curationQueue.push({
        messageId: msg.id,
        channelName: this.activeDiscordChannelName,
        contentBruto: msg.content,
        author: msg.author.username,
        timestamp: msg.timestamp,
        localImages: localImages
      });
    }

    // Libera botão
    this.btnImportBulkDiscord.disabled = false;
    this.btnImportBulkDiscord.innerHTML = originalText;

    // Abre o Wizard
    this.discordImportOverlay.classList.add('hidden'); // Oculta o explorador
    this.discordCurationWizard.classList.remove('hidden');

    this.populateCurationCategories();
    this.loadCurationItem(0);
  }

  populateCurationCategories() {
    this.curationCategory.innerHTML = '';
    const categories = window.storageService.getCategories();
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      this.curationCategory.appendChild(option);
    });
  }

  loadCurationItem(index) {
    if (index < 0 || index >= this.curationQueue.length) {
      this.finishCurationWizard();
      return;
    }

    this.currentCurationIndex = index;
    this.curationQueueIndicator.textContent = `Item ${index + 1} de ${this.curationQueue.length}`;

    const item = this.curationQueue[index];

    // Coluna Esquerda: Texto original e imagens
    this.curationMsgOriginal.innerHTML = '';
    const rawContentDiv = document.createElement('div');
    rawContentDiv.innerHTML = `
      <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3rem;">
        <strong>Enviado por:</strong> ${this._escapeHTML(item.author)} em ${new Date(item.timestamp).toLocaleString('pt-BR')}
        <br><strong>Canal:</strong> #${this._escapeHTML(item.channelName)}
      </div>
      <div style="font-size: 0.8rem; line-height: 1.5; white-space: pre-wrap; font-family: monospace; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 4px; border: 1px solid var(--border-color);">${this._escapeHTML(item.contentBruto)}</div>
    `;
    this.curationMsgOriginal.appendChild(rawContentDiv);

    if (item.localImages && item.localImages.length > 0) {
      const imgContainer = document.createElement('div');
      imgContainer.style.marginTop = '1rem';
      imgContainer.style.display = 'flex';
      imgContainer.style.flexDirection = 'column';
      imgContainer.style.gap = '0.5rem';
      
      item.localImages.forEach(imgName => {
        const img = document.createElement('img');
        img.src = `local-image://${imgName}`;
        img.className = 'discord-preview-img';
        img.style.maxHeight = '180px';
        imgContainer.appendChild(img);
      });
      this.curationMsgOriginal.appendChild(imgContainer);
    }

    // Coluna Direita: Aplicar Motor de Conversão (Heurísticas)
    const converted = this.runCurationHeuristics(item);

    // Preenche campos
    this.curationTitle.value = converted.title;
    this.curationCategory.value = converted.category;
    this.curationTags.value = converted.tags.join(', ');
    this.curationDescription.value = converted.description;
    this.curationSolution.value = converted.solution;
  }

  runCurationHeuristics(item) {
    const text = item.contentBruto || '';
    
    // Heurística 1: Título
    let title = '';
    const boldMatch = text.match(/\*\*(.*?)\*\*/);
    if (boldMatch && boldMatch[1]) {
      title = boldMatch[1].trim();
    } else {
      const lines = text.split('\n');
      title = lines[0].replace(/[#*_-]/g, "").trim();
    }
    if (title.length > 80) title = title.substring(0, 80) + '...';

    // Heurística 2: Categoria baseada no Canal do Discord
    const categories = window.storageService.getCategories();
    let category = 'Geral';
    const cleanChannel = item.channelName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const cat of categories) {
      const cleanCat = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
      if (cleanChannel.includes(cleanCat) || cleanCat.includes(cleanChannel)) {
        category = cat;
        break;
      }
    }

    // Heurística 3: Tags baseadas em dicionário técnico
    const dicionarioTags = ['sefaz', 'filizola', 'timeout', 'deadlock', 'banco', 'sql', 'porta', 'serial', 'com1', 'nfe', 'pdv', 'impressora'];
    const tagsDetectadas = [];
    const textLower = text.toLowerCase();
    dicionarioTags.forEach(tag => {
      if (textLower.includes(tag)) {
        tagsDetectadas.push(tag);
      }
    });

    // Heurística 4: Sintoma / Descrição (primeiro parágrafo de texto corrido)
    const paragraphs = text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    let description = '';
    if (paragraphs.length > 0) {
      let candidate = paragraphs[0];
      // Se o primeiro parágrafo era só o título em negrito, pega o segundo
      if (candidate.startsWith('**') && candidate.endsWith('**') && paragraphs.length > 1) {
        candidate = paragraphs[1];
      }
      description = candidate.replace(/[#*_-]/g, "").trim();
    }
    if (description.length > 180) description = description.substring(0, 180) + '...';

    // Heurística 5: Resolução (conteúdo que tem cara de passos ou código)
    let solution = '';
    const lines = text.split('\n');
    const solutionLines = [];
    let foundStart = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('```') || /^\d+\.\s/.test(trimmed) || trimmed.startsWith('-') || trimmed.startsWith('* ')) {
        foundStart = true;
      }
      if (foundStart) {
        solutionLines.push(line);
      }
    }

    if (solutionLines.length > 0) {
      solution = solutionLines.join('\n');
    } else {
      // Se não achou marcadores, junta do parágrafo 2 em diante
      if (paragraphs.length > 1) {
        solution = paragraphs.slice(1).join('\n\n');
      } else {
        solution = text;
      }
    }

    // Se houver imagens locais baixadas offline-first, anexa referências locais do protocolo local-image
    if (item.localImages && item.localImages.length > 0) {
      solution += '\n\n### Imagens de Referência:\n';
      item.localImages.forEach(imgName => {
        solution += `\n![Anexo](local-image://${imgName})\n`;
      });
    }

    return {
      title,
      category,
      tags: tagsDetectadas,
      description,
      solution
    };
  }

  handleCurationDiscard() {
    // Apenas avança na fila sem salvar o item atual
    this.loadCurationItem(this.currentCurationIndex + 1);
  }

  handleCurationDraft() {
    this.saveCurationItem('Rascunho');
  }

  handleCurationPublish() {
    this.saveCurationItem('Publicado');
  }

  saveCurationItem(status) {
    const item = this.curationQueue[this.currentCurationIndex];
    
    const article = {
      title: this.curationTitle.value.trim(),
      category: this.curationCategory.value,
      tags: this.curationTags.value,
      description: this.curationDescription.value.trim(),
      solution: this.curationSolution.value.trim(),
      discordMessageId: item.messageId,
      status: status
    };

    if (!article.title) {
      window.showToast('O título do artigo é obrigatório.', 'warning');
      return;
    }

    window.storageService.addKnowledge(article);
    window.showToast(status === 'Publicado' ? 'Artigo publicado com sucesso!' : 'Salvo como rascunho!', 'success');

    // Avança na fila
    this.loadCurationItem(this.currentCurationIndex + 1);
  }

  finishCurationWizard() {
    this.discordCurationWizard.classList.add('hidden');
    window.showToast('Curadoria concluída!', 'success');
    
    // Atualiza listas do painel admin
    this.renderArticlesList();
    this.resetFormForNew();
  }

  // Método de segurança para salvar itens restantes se fechar o modal no meio do wizard
  forceDraftRemainingCurationItems() {
    if (!this.curationQueue || this.currentCurationIndex >= this.curationQueue.length) return;

    const remainingCount = this.curationQueue.length - this.currentCurationIndex;
    
    for (let i = this.currentCurationIndex; i < this.curationQueue.length; i++) {
      const item = this.curationQueue[i];
      const converted = this.runCurationHeuristics(item);
      
      const article = {
        title: converted.title || `Importado do Discord (${item.messageId})`,
        category: converted.category,
        tags: converted.tags.join(', '),
        description: converted.description,
        solution: converted.solution,
        discordMessageId: item.messageId,
        status: 'Rascunho'
      };

      window.storageService.addKnowledge(article);
    }

    window.showToast(`${remainingCount} itens restantes salvos automaticamente como rascunhos!`, 'warning');
    this.curationQueue = [];
    this.renderArticlesList();
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
      this.populateCurationCategories();
      this.formCategory.value = name;
      if (this.curationCategory) {
        this.curationCategory.value = name;
      }
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
        this.populateCurationCategories();
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
    const currentUser = window.storageService.getCurrentUser();
    
    const discordSection = document.getElementById('settings-discord-section');
    if (discordSection) {
      if (currentUser && currentUser.role === 'ADM') {
        discordSection.style.display = 'block';
      } else {
        discordSection.style.display = 'none';
      }
    }
    
    if (this.settingsThemeSelect) {
      this.settingsThemeSelect.value = settings.theme || 'red';
    }
    if (this.settingsMenuBarCheckbox) {
      this.settingsMenuBarCheckbox.checked = !!settings.showMenuBar;
    }
    if (this.settingsAutoScrollCheckbox) {
      this.settingsAutoScrollCheckbox.checked = settings.autoScroll !== false;
    }
    
    // Carrega campos de sincronização
    if (this.settingsSyncUrl) {
      this.settingsSyncUrl.value = settings.syncUrl || '';
    }
    if (this.settingsSyncToken) {
      this.settingsSyncToken.value = settings.syncToken || '';
    }
    
    // Carrega campos do Discord
    if (this.settingsDiscordGuild) {
      this.settingsDiscordGuild.value = settings.discordGuildId || '';
    }
    if (this.settingsDiscordToken) {
      const encryptedToken = settings.discordBotToken || '';
      if (encryptedToken && window.api && typeof window.api.decryptString === 'function') {
        window.api.decryptString(encryptedToken).then(decrypted => {
          this.settingsDiscordToken.value = decrypted || '';
        }).catch(err => {
          console.error("Erro ao decifrar token do Discord:", err);
          this.settingsDiscordToken.value = encryptedToken;
        });
      } else {
        this.settingsDiscordToken.value = encryptedToken;
      }
    }
    
    this.updateSyncStatusDisplay(settings);
  }

  async saveDiscordSettings() {
    const settings = window.storageService.getSettings();
    const rawToken = this.settingsDiscordToken.value.trim();
    settings.discordGuildId = this.settingsDiscordGuild.value.trim();
    
    if (rawToken) {
      if (window.api && typeof window.api.encryptString === 'function') {
        const encrypted = await window.api.encryptString(rawToken);
        settings.discordBotToken = encrypted;
      } else {
        settings.discordBotToken = rawToken;
      }
    } else {
      settings.discordBotToken = '';
    }
    
    window.storageService.saveSettings(settings);
    window.showToast('Configurações do Discord salvas!', 'success');
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

  saveSyncSettings() {
    const settings = window.storageService.getSettings();
    settings.syncUrl = this.settingsSyncUrl.value.trim();
    settings.syncToken = this.settingsSyncToken.value.trim();
    window.storageService.saveSettings(settings);
    window.showToast('Configurações de sincronização salvas!', 'success');
  }

  updateSyncStatusDisplay(settings) {
    if (!this.syncStatusText) return;
    if (!settings.lastSync) {
      this.syncStatusText.textContent = 'Nunca Sincronizado';
      this.syncStatusText.style.color = 'var(--text-secondary)';
      return;
    }
    const dateFormatted = this._formatDate(settings.lastSync);
    if (settings.lastSyncStatus === 'SUCCESS') {
      this.syncStatusText.textContent = `Sucesso em ${dateFormatted}`;
      this.syncStatusText.style.color = '#00cc66'; // Verde
    } else {
      this.syncStatusText.textContent = `Falha em ${dateFormatted}`;
      this.syncStatusText.style.color = '#ff3333'; // Vermelho
    }
  }

  async handleCloudSync() {
    const url = this.settingsSyncUrl.value.trim();
    const token = this.settingsSyncToken.value.trim();
    
    if (!url) {
      window.showToast('Por favor, informe a URL do endpoint de sincronização.', 'warning');
      return;
    }
    
    this.btnCloudSync.disabled = true;
    const originalContent = this.btnCloudSync.innerHTML;
    this.btnCloudSync.innerHTML = 'Sincronizando...';
    
    try {
      const result = await window.storageService.syncDatabaseAsync(url, token);
      if (result.success) {
        if (result.mock) {
          window.showToast('Sincronização concluída (Modo Simulação)! Artigo baixado da nuvem.', 'success');
        } else {
          window.showToast('Sincronização com a nuvem realizada com sucesso!', 'success');
        }
        this.renderArticlesList();
      }
    } catch (e) {
      window.showToast(`Falha na sincronização: ${e.message}`, 'error');
    } finally {
      this.btnCloudSync.disabled = false;
      this.btnCloudSync.innerHTML = originalContent;
      const settings = window.storageService.getSettings();
      this.updateSyncStatusDisplay(settings);
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
