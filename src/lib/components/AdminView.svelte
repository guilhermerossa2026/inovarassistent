<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { storage } from '$lib/services/storage.svelte.js';
  import { invoke } from '@tauri-apps/api/core';

  let { onCloseAdmin } = $props();

  // Active Tab
  let currentTab = $state('articles'); // 'articles', 'reports', 'settings'

  // CRUD Articles States
  let articleSearchQuery = $state('');
  let selectedArticleId = $state(null);
  let formTitle = $state('');
  let formCategory = $state('');
  let formTags = $state('');
  let formDescription = $state('');
  let formSolution = $state('');
  let pendingUnresolvedQuery = $state(null);

  // Modais Overlays
  let showPasswordModal = $state(true);
  let adminPasswordInput = $state('');
  let adminPasswordError = $state('');
  let showCategoryModal = $state(false);
  let newCategoryName = $state('');

  // Discord Integration States
  let showDiscordImport = $state(false);
  let discordBotToken = $state('');
  let discordGuildId = $state('');
  let discordChannels = $state([]);
  let selectedChannelId = $state(null);
  let channelMessages = $state([]);
  let selectedMessage = $state(null);
  let discordHideImported = $state(true);
  let isLoadingChannels = $state(false);
  let isLoadingMessages = $state(false);

  // Curation Wizard States
  let showCurationWizard = $state(false);
  let curationQueue = $state([]);
  let currentCurationIndex = $state(0);
  let curationTitle = $state('');
  let curationCategory = $state('');
  let curationTags = $state('');
  let curationDescription = $state('');
  let curationSolution = $state('');

  // Operator CRUD States
  let userFormTitle = $state('Cadastrar Novo Operador');
  let operatorUsername = $state('');
  let operatorPassword = $state('');
  let operatorRole = $state('NORMAL');
  let selectedOperatorUsername = $state(null);

  // Reports Computations
  let totalSearches = $derived(storage.logs.length);
  let resolveRate = $derived(
    totalSearches > 0
      ? Math.round((storage.logs.filter(l => l.resolved).length / totalSearches) * 100)
      : 0
  );
  
  let topUser = $derived.by(() => {
    if (storage.logs.length === 0) return '-';
    const counts = {};
    let max = 0;
    let name = '-';
    storage.logs.forEach(l => {
      if (l.user) {
        counts[l.user] = (counts[l.user] || 0) + 1;
        if (counts[l.user] > max) {
          max = counts[l.user];
          name = l.user;
        }
      }
    });
    return max > 0 ? `${name} (${max}x)` : '-';
  });

  let topTag = $derived.by(() => {
    if (storage.logs.length === 0) return '-';
    const counts = {};
    let max = 0;
    let word = '-';
    storage.logs.forEach(l => {
      const words = l.query.toLowerCase().split(/\s+/);
      words.forEach(w => {
        const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
        if (clean.length > 3 && !['como', 'erro', 'para', 'banco', 'esta', 'está', 'fazer'].includes(clean)) {
          counts[clean] = (counts[clean] || 0) + 1;
          if (counts[clean] > max) {
            max = counts[clean];
            word = clean;
          }
        }
      });
    });
    return max > 0 ? `${word} (${max}x)` : '-';
  });

  // Unresolved Logs Groups
  let unresolvedGroups = $derived.by(() => {
    const unresolved = storage.logs.filter(l => !l.articleId || l.resolved === false);
    const groups = {};
    unresolved.forEach(l => {
      const clean = l.query.trim().toLowerCase();
      if (!clean) return;
      if (!groups[clean]) {
        groups[clean] = { query: l.query.trim(), count: 0, lastSeen: l.timestamp };
      }
      groups[clean].count++;
      if (new Date(l.timestamp) > new Date(groups[clean].lastSeen)) {
        groups[clean].lastSeen = l.timestamp;
      }
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  });

  // Synchronous initializations
  onMount(async () => {
    await storage.init();
    discordBotToken = storage.settings.discordBotToken || '';
    discordGuildId = storage.settings.discordGuildId || '';
  });

  // Theme settings mapping
  function applyTheme(theme) {
    if (theme && theme !== 'red') {
      document.body.className = `theme-${theme}`;
    } else {
      document.body.className = '';
    }
  }

  // --- PASSWORD CONTROL ---
  async function verifyPassword() {
    adminPasswordError = '';
    const hash = await invoke('hash_password', { password: adminPasswordInput });
    if (hash === '7318c76704c9d4e6a2f3d414cc1349fc2fa4465993aa824571c32d6fc1e2106f') {
      showPasswordModal = false;
      // Trigger theme loading
      applyTheme(storage.settings.theme);
    } else {
      adminPasswordError = 'Chave administrativa inválida.';
    }
  }

  // --- ARTICLES CRUD ---
  let filteredArticles = $derived.by(() => {
    if (!articleSearchQuery.trim()) return storage.knowledgeBase;
    const clean = articleSearchQuery.toLowerCase().trim();
    return storage.knowledgeBase.filter(art => 
      art.title.toLowerCase().includes(clean) || 
      (art.tags && art.tags.some(t => t.toLowerCase().includes(clean)))
    );
  });

  function selectArticle(article) {
    selectedArticleId = article.id;
    formTitle = article.title;
    formCategory = article.category || 'Geral';
    formTags = article.tags ? article.tags.join(', ') : '';
    formDescription = article.description || '';
    formSolution = article.solution || '';
  }

  function resetArticleForm() {
    selectedArticleId = null;
    formTitle = '';
    formCategory = storage.categories[0] || 'Geral';
    formTags = '';
    formDescription = '';
    formSolution = '';
    pendingUnresolvedQuery = null;
  }

  async function saveArticle() {
    if (!formTitle.trim() || !formSolution.trim()) return;

    const data = {
      title: formTitle.trim(),
      category: formCategory || 'Geral',
      tags: formTags,
      description: formDescription.trim(),
      solution: formSolution.trim()
    };

    if (selectedArticleId) {
      await storage.updateKnowledge(selectedArticleId, data);
      alert('Artigo atualizado com sucesso!');
    } else {
      const newArt = await storage.addKnowledge(data);
      alert('Artigo cadastrado com sucesso!');
      if (pendingUnresolvedQuery) {
        await storage.resolveQueryLogsRetroactively(pendingUnresolvedQuery, newArt.id);
        pendingUnresolvedQuery = null;
      }
    }
    resetArticleForm();
  }

  async function deleteArticle() {
    if (!selectedArticleId) return;
    if (confirm('Deseja realmente excluir este artigo?')) {
      await storage.deleteKnowledge(selectedArticleId);
      alert('Artigo excluído!');
      resetArticleForm();
    }
  }

  // --- CATEGORIES MANAGER ---
  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const ok = await storage.addCategory(newCategoryName.trim());
    if (ok) {
      newCategoryName = '';
    } else {
      alert('Categoria já existente ou inválida.');
    }
  }

  async function deleteCategory(name) {
    if (confirm(`Deseja excluir a categoria "${name}"?`)) {
      await storage.deleteCategory(name);
    }
  }

  // --- OPERATORS CRUD ---
  function selectOperator(user) {
    selectedOperatorUsername = user.username;
    operatorUsername = user.username;
    operatorPassword = '';
    operatorRole = user.role;
    userFormTitle = `Editar Operador: ${user.username.toUpperCase()}`;
  }

  function resetOperatorForm() {
    selectedOperatorUsername = null;
    operatorUsername = '';
    operatorPassword = '';
    operatorRole = 'NORMAL';
    userFormTitle = 'Cadastrar Novo Operador';
  }

  async function saveOperator() {
    if (!operatorUsername.trim()) return;

    if (selectedOperatorUsername) {
      // Edit mode
      let usersList = [...storage.users];
      const idx = usersList.findIndex(u => u.username.toLowerCase() === selectedOperatorUsername.toLowerCase());
      if (idx !== -1) {
        usersList[idx].role = operatorRole;
        if (operatorPassword) {
          usersList[idx].password = await invoke('hash_password', { password: operatorPassword });
        }
        await storage._setItem('inovar_assist_users', JSON.stringify(usersList));
        storage.users = usersList;
        alert('Operador atualizado!');
      }
    } else {
      // Create mode
      if (!operatorPassword) {
        alert('Insira uma senha para o novo operador.');
        return;
      }
      const ok = await storage.addUser(operatorUsername, operatorPassword, operatorRole);
      if (ok) {
        alert('Operador cadastrado!');
      } else {
        alert('Nome de usuário já cadastrado.');
      }
    }
    resetOperatorForm();
  }

  async function deleteOperator(username) {
    if (confirm(`Excluir operador "${username}"?`)) {
      const ok = await storage.deleteUser(username);
      if (ok) {
        alert('Operador removido.');
        resetOperatorForm();
      } else {
        alert('Não é possível remover a conta administrador principal.');
      }
    }
  }

  // --- PARAMETERS & RESTORE ---
  async function handleResetDatabase() {
    if (confirm('Atenção: Isso restaurará todos os artigos e logs originais, apagando modificações recentes. Continuar?')) {
      await storage.resetDatabase();
      alert('Banco de dados restaurado!');
      resetArticleForm();
    }
  }

  async function saveSystemSettings() {
    await storage.saveSettings({
      theme: storage.settings.theme,
      autoScroll: storage.settings.autoScroll
    });
    applyTheme(storage.settings.theme);
    alert('Configurações salvas!');
  }

  // --- DISCORD crawler & CURATION ---
  async function saveDiscordSettings() {
    await storage.saveSettings({
      discordBotToken: discordBotToken.trim(),
      discordGuildId: discordGuildId.trim()
    });
    alert('Configurações de integração salvas!');
  }

  async function openDiscordImporter() {
    if (!discordBotToken || !discordGuildId) {
      alert('Por favor, configure o Token e Guild ID do Discord nas configurações antes de importar.');
      return;
    }
    showDiscordImport = true;
    isLoadingChannels = true;
    discordChannels = [];
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${discordGuildId}/channels`, {
        headers: { Authorization: `Bot ${discordBotToken}` }
      });
      if (!response.ok) throw new Error('Falha ao obter canais.');
      const data = await response.json();
      // Filter text channels only
      discordChannels = data.filter(c => c.type === 0 || c.type === 15 || c.type === 11); // text, forum, thread
    } catch(e) {
      alert('Erro ao conectar à API do Discord. Verifique suas credenciais.');
      showDiscordImport = false;
    } finally {
      isLoadingChannels = false;
    }
  }

  async function selectDiscordChannel(chanId) {
    selectedChannelId = chanId;
    isLoadingMessages = true;
    channelMessages = [];
    selectedMessage = null;
    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${chanId}/messages?limit=50`, {
        headers: { Authorization: `Bot ${discordBotToken}` }
      });
      if (!response.ok) throw new Error('Falha ao obter mensagens.');
      channelMessages = await response.json();
    } catch(e) {
      alert('Erro ao buscar mensagens do canal.');
    } finally {
      isLoadingMessages = false;
    }
  }

  let finalMessages = $derived.by(() => {
    if (!discordHideImported) return channelMessages;
    // Hide messages already curated (which match any article's discordMessageId)
    const curatedIds = new Set(storage.knowledgeBase.map(art => art.discordMessageId).filter(id => id));
    return channelMessages.filter(m => !curatedIds.has(m.id));
  });

  function selectDiscordMessage(msg) {
    selectedMessage = msg;
  }

  // Curation wizard integration
  function startCuration() {
    if (!selectedMessage) return;
    showCurationWizard = true;
    
    // Parse message contents
    curationTitle = 'Resolução: ' + (selectedMessage.content.slice(0, 40) || 'Nova Instrução');
    curationCategory = storage.categories[0] || 'Geral';
    curationTags = '';
    
    // Attempt basic parsing: check for title or bold lines
    const lines = selectedMessage.content.split('\n');
    let description = '';
    let solution = '';
    let findingSolution = false;

    lines.forEach(line => {
      if (line.toLowerCase().includes('solução') || line.toLowerCase().includes('resolução') || line.toLowerCase().includes('como resolver')) {
        findingSolution = true;
      } else {
        if (findingSolution) {
          solution += line + '\n';
        } else {
          description += line + '\n';
        }
      }
    });

    curationDescription = description.trim() || selectedMessage.content;
    curationSolution = solution.trim() || 'Descreva a solução técnica aqui.';
  }

  async function saveCuration(draft = false) {
    const data = {
      title: curationTitle.trim(),
      category: curationCategory || 'Geral',
      tags: curationTags,
      description: curationDescription.trim(),
      solution: curationSolution.trim(),
      discordMessageId: selectedMessage.id,
      status: draft ? 'Rascunho' : 'Publicado'
    };

    // Check for attachments/images
    if (selectedMessage.attachments && selectedMessage.attachments.length > 0) {
      // Download first image attachment
      const img = selectedMessage.attachments.find(a => a.content_type && a.content_type.startsWith('image/'));
      if (img) {
        try {
          const dlResponse = await fetch(img.url);
          const arrayBuffer = await dlResponse.arrayBuffer();
          const base64Content = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          const filename = `${Date.now()}_${img.filename}`;
          const ok = await invoke('write_binary_file', { filename, base64Content });
          if (ok) {
            // Append local image path reference in Markdown solution
            data.solution += `\n\n![Anexo Importado](${filename})`;
          }
        } catch(e) {
          console.error('Failed to download Discord image attachment:', e);
        }
      }
    }

    await storage.addKnowledge(data);
    alert(draft ? 'Salvo como rascunho!' : 'Artigo publicado com sucesso!');
    showCurationWizard = false;
    showDiscordImport = false;
    selectedMessage = null;
    if (selectedChannelId) {
      selectDiscordChannel(selectedChannelId);
    }
  }

  // --- CLOUD SYNC ---
  let syncUrl = $state('');
  let syncToken = $state('');
  let syncStatus = $state('Nunca Sincronizado');
  let isSyncing = $state(false);

  async function handleCloudSync() {
    if (!syncUrl.trim()) {
      alert('Configure o endpoint (URL) de sincronização primeiro.');
      return;
    }
    isSyncing = true;
    syncStatus = 'Sincronizando...';
    try {
      const res = await storage.syncDatabaseAsync(syncUrl.trim(), syncToken.trim());
      if (res.success) {
        syncStatus = `Sincronizado! ${res.count} artigos unificados.`;
        alert(`Sincronização concluída! Total de ${res.count} artigos unificados.`);
      }
    } catch(e) {
      syncStatus = 'Falha na sincronização';
      alert('Erro na sincronização: ' + e.message);
    } finally {
      isSyncing = false;
    }
  }

  function handleDocumentQuery(query) {
    currentTab = 'articles';
    resetArticleForm();
    pendingUnresolvedQuery = query;
    formTitle = query.charAt(0).toUpperCase() + query.slice(1);
    formCategory = storage.categories[0] || 'Geral';
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR');
    } catch(e) {
      return isoStr;
    }
  }
</script>

{#if showPasswordModal}
  <div class="password-overlay">
    <div class="password-card glass-effect glow-panel-red">
      <div class="password-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h3 class="password-title">Área Administrativa</h3>
      <p class="password-desc">Confirme a chave administrativa para gerenciar a base de dados</p>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <input 
          type="password" 
          bind:value={adminPasswordInput} 
          class="form-input" 
          style="text-align: center; letter-spacing: 0.15em;" 
          placeholder="••••" 
          onkeydown={(e) => e.key === 'Enter' && verifyPassword()}
        />
        {#if adminPasswordError}
          <div class="error-msg">{adminPasswordError}</div>
        {/if}
      </div>

      <div class="modal-actions-flex">
        <button class="btn-secondary" onclick={onCloseAdmin}>Cancelar</button>
        <button class="btn-primary" onclick={verifyPassword}>Confirmar Chave</button>
      </div>
    </div>
  </div>
{:else}
  <!-- Main Admin Panel View -->
  <div class="admin-container">
    <nav class="admin-navbar glass-effect">
      <div class="admin-nav-tabs">
        <button class="admin-tab-btn {currentTab === 'articles' ? 'active' : ''}" onclick={() => currentTab = 'articles'}>
          📄 Gerenciar Base
        </button>
        <button class="admin-tab-btn {currentTab === 'reports' ? 'active' : ''}" onclick={() => currentTab = 'reports'}>
          📊 Relatórios
        </button>
        <button class="admin-tab-btn {currentTab === 'settings' ? 'active' : ''}" onclick={() => currentTab = 'settings'}>
          ⚙️ Configurações
        </button>
      </div>
      
      <button class="btn-back-chat" onclick={onCloseAdmin}>
        Voltar ao Chat
      </button>
    </nav>

    <div class="admin-content-viewport">
      <!-- ARTICLES CRUD TAB -->
      {#if currentTab === 'articles'}
        <div class="admin-split-layout" in:fade={{ duration: 120 }}>
          <aside class="sidebar-column glass-effect">
            <div class="sidebar-header">
              <div class="sidebar-title-row">
                <span>Instruções Salvas</span>
                <div class="btn-row">
                  <button class="btn-discord" onclick={openDiscordImporter}>Discord</button>
                  <button class="btn-new" onclick={resetArticleForm}>+ Novo</button>
                </div>
              </div>
              <input 
                type="text" 
                class="search-input-small" 
                placeholder="Pesquisar título ou tags..." 
                bind:value={articleSearchQuery}
              />
            </div>
            
            <div class="article-list-scroll">
              {#each filteredArticles as art}
                <button class="article-list-item {selectedArticleId === art.id ? 'active' : ''}" onclick={() => selectArticle(art)}>
                  <span class="art-title">{art.title}</span>
                  <span class="art-category">{art.category}</span>
                </button>
              {/each}
            </div>
          </aside>

          <main class="form-column glass-effect">
            <div class="form-group">
              <label class="form-label" for="form-title">Título do Artigo</label>
              <input type="text" id="form-title" class="form-input" placeholder="Ex: Configurar Balança Filizola..." bind:value={formTitle} />
            </div>

            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" for="form-category">Categoria</label>
                <div class="flex-row">
                  <select id="form-category" class="form-input" bind:value={formCategory}>
                    {#each storage.categories as cat}
                      <option value={cat}>{cat}</option>
                    {/each}
                  </select>
                  <button class="btn-add-cat" onclick={() => showCategoryModal = true}>+</button>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="form-tags">Tags (separadas por vírgula)</label>
                <input type="text" id="form-tags" class="form-input" placeholder="balança, serial, erro" bind:value={formTags} />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="form-desc">Sintoma / Descrição Resumida</label>
              <input type="text" id="form-desc" class="form-input" placeholder="Como o problema é reportado..." bind:value={formDescription} />
            </div>

            <div class="form-group flex-1">
              <label class="form-label" for="form-sol">Solução Técnica (Passo a Passo Markdown)</label>
              <textarea id="form-sol" class="form-input textarea-solution" placeholder="Descreva os passos para correção do erro..." bind:value={formSolution}></textarea>
            </div>

            <div class="form-footer">
              <button class="btn-primary" onclick={saveArticle}>Salvar Artigo</button>
              {#if selectedArticleId}
                <button class="btn-danger" onclick={deleteArticle}>Excluir Artigo</button>
              {/if}
            </div>
          </main>
        </div>

      <!-- REPORTS & METRICS TAB -->
      {:else if currentTab === 'reports'}
        <div class="reports-container" in:fade={{ duration: 120 }}>
          <div class="metrics-grid">
            <div class="metric-card color-red">
              <span class="metric-title">Consultas Totais</span>
              <span class="metric-number">{totalSearches}</span>
              <span class="metric-subtitle">Total de buscas no chat</span>
            </div>
            
            <div class="metric-card color-green">
              <span class="metric-title">Taxa de Resolução</span>
              <span class="metric-number">{resolveRate}%</span>
              <span class="metric-subtitle">Resolvido pelos técnicos</span>
            </div>

            <div class="metric-card color-yellow">
              <span class="metric-title">Termo mais Buscado</span>
              <span class="metric-number text-truncate">{topTag}</span>
              <span class="metric-subtitle">Palavra-chave frequente</span>
            </div>

            <div class="metric-card">
              <span class="metric-title">Operador Ativo</span>
              <span class="metric-number text-truncate">{topUser}</span>
              <span class="metric-subtitle">Mais buscas efetuadas</span>
            </div>
          </div>

          <!-- General Logs History Table -->
          <div class="table-card glass-effect">
            <div class="table-header-row">
              <h3 class="table-title">Histórico de Consultas</h3>
              <button class="btn-danger" style="font-size: 0.72rem; padding: 0.35rem 0.75rem;" onclick={() => storage.clearLogs()}>Limpar Histórico</button>
            </div>
            <div class="table-scroll-wrapper">
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Termo Pesquisado</th>
                    <th>Data / Hora</th>
                    <th>Status</th>
                    <th>Artigo Vinculado</th>
                  </tr>
                </thead>
                <tbody>
                  {#each [...storage.logs].reverse() as log}
                    <tr>
                      <td style="font-weight: 600; color: var(--text-primary);">{log.user}</td>
                      <td style="color: var(--text-secondary);">"{log.query}"</td>
                      <td style="color: var(--text-muted);">{formatDate(log.timestamp)}</td>
                      <td>
                        <span class="badge {log.resolved ? 'badge-success' : 'badge-danger'}">
                          {log.resolved ? 'Resolvido' : 'Pendente'}
                        </span>
                      </td>
                      <td style="font-family: monospace; font-size: 0.72rem; color: var(--text-muted);">{log.articleId || '-'}</td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma busca registrada no histórico.</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Unresolved Queries Table -->
          <div class="table-card glass-effect" style="margin-top: 1.5rem; border-color: rgba(244,63,94,0.12);">
            <h3 class="table-title" style="color: var(--inovar-red);">Instruções Sem Resolução (Fila de Documentação)</h3>
            <div class="table-scroll-wrapper">
              <table class="logs-table">
                <thead>
                  <tr>
                    <th>Termo Frustrado</th>
                    <th>Vezes Consultado</th>
                    <th>Último Registro</th>
                    <th style="width: 120px; text-align: center;">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {#each unresolvedGroups as grp}
                    <tr>
                      <td style="font-weight: 600; color: var(--inovar-red);">{grp.query}</td>
                      <td style="color: var(--text-primary);">{grp.count}x</td>
                      <td style="color: var(--text-muted);">{formatDate(grp.lastSeen)}</td>
                      <td style="text-align: center;">
                        <button class="btn-primary" style="font-size: 0.7rem; padding: 0.3rem 0.55rem; width: auto;" onclick={() => handleDocumentQuery(grp.query)}>
                          Documentar
                        </button>
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma dúvida pendente de documentação.</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      <!-- CONFIGURATIONS TAB -->
      {:else if currentTab === 'settings'}
        <div class="settings-grid" in:fade={{ duration: 120 }}>
          <!-- User Manager -->
          <aside class="settings-sidebar glass-effect">
            <h3 class="settings-section-title">Contas de Operadores</h3>
            <div class="operator-list-scroll">
              {#each storage.users as usr}
                <button class="operator-item" onclick={() => selectOperator(usr)}>
                  <span style="font-weight: 600;">{usr.username}</span>
                  <span class="role-badge {usr.role === 'ADM' ? 'adm' : ''}">{usr.role}</span>
                </button>
              {/each}
            </div>
          </aside>

          <!-- System Settings forms -->
          <main class="settings-form-column glass-effect">
            <!-- Operator CRUD -->
            <div class="settings-section">
              <h4>{userFormTitle}</h4>
              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label" for="op-username">Nome de Usuário</label>
                  <input type="text" id="op-username" class="form-input" bind:value={operatorUsername} disabled={selectedOperatorUsername !== null} />
                </div>
                <div class="form-group">
                  <label class="form-label" for="op-pw">Senha</label>
                  <input type="password" id="op-pw" class="form-input" placeholder="••••" bind:value={operatorPassword} />
                </div>
                <div class="form-group">
                  <label class="form-label" for="op-role">Cargo / Role</label>
                  <select id="op-role" class="form-input" bind:value={operatorRole}>
                    <option value="NORMAL">SUPORTE (Apenas Chat)</option>
                    <option value="ADM">ADM (Acesso Completo)</option>
                  </select>
                </div>
              </div>
              <div class="btn-row" style="margin-top: 1rem; justify-content: flex-start; gap: 0.5rem;">
                <button class="btn-primary" style="width: auto; padding: 0.55rem 1.25rem;" onclick={saveOperator}>
                  {selectedOperatorUsername ? 'Salvar Alterações' : 'Cadastrar Operador'}
                </button>
                {#if selectedOperatorUsername}
                  <button class="btn-danger" style="width: auto; padding: 0.55rem 1.25rem;" onclick={() => deleteOperator(selectedOperatorUsername)}>Excluir Conta</button>
                  <button class="btn-secondary" style="width: auto; padding: 0.55rem 1.25rem;" onclick={resetOperatorForm}>Cancelar</button>
                {/if}
              </div>
            </div>

            <!-- Parameters of Mainframe -->
            <div class="settings-section" style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem;">
              <h4>Visual do Mainframe</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="sel-theme">Tema de Acentuação Glow</label>
                  <select id="sel-theme" class="form-input" bind:value={storage.settings.theme}>
                    <option value="red">Vermelho Inovar (Padrão)</option>
                    <option value="blue">Azul Cyber (Futurista)</option>
                    <option value="green">Verde Matrix (Técnico)</option>
                  </select>
                </div>
                
                <div class="form-group checkbox-align">
                  <div class="checkbox-row">
                    <input type="checkbox" id="chk-scroll" bind:checked={storage.settings.autoScroll} />
                    <label for="chk-scroll" class="checkbox-label">Habilitar rolagem automática no chat</label>
                  </div>
                </div>
              </div>
              <div class="btn-row" style="margin-top: 1.25rem; justify-content: space-between;">
                <button class="btn-primary" style="width: auto; padding: 0.55rem 1.5rem;" onclick={saveSystemSettings}>Salvar Parâmetros</button>
                <button class="btn-danger" style="width: auto; padding: 0.55rem 1.5rem; font-size: 0.72rem;" onclick={handleResetDatabase}>Restaurar Banco Seed Original</button>
              </div>
            </div>

            <!-- Cloud Sync Section -->
            <div class="settings-section" style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem;">
              <h4>Sincronização Nuvem (Cloud Sync)</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="sync-url">URL da API</label>
                  <input type="text" id="sync-url" class="form-input" placeholder="https://api.inovar.com/sync" bind:value={syncUrl} />
                </div>
                <div class="form-group">
                  <label class="form-label" for="sync-token">Chave Token do Técnico</label>
                  <input type="password" id="sync-token" class="form-input" placeholder="Chave de sincronização..." bind:value={syncToken} />
                </div>
              </div>
              <div class="sync-actions-row">
                <span class="sync-status" style="font-size: 0.75rem; color: var(--text-secondary);">Status: <strong>{syncStatus}</strong></span>
                <button class="btn-primary" style="width: auto; padding: 0.55rem 1.25rem;" onclick={handleCloudSync} disabled={isSyncing}>
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
            </div>

            <!-- Discord bot Settings -->
            <div class="settings-section" style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem;">
              <h4>Integração com Discord</h4>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="dc-token">Token do Bot Discord</label>
                  <input type="password" id="dc-token" class="form-input" placeholder="Token do bot..." bind:value={discordBotToken} />
                </div>
                <div class="form-group">
                  <label class="form-label" for="dc-guild">ID do Servidor (Guild ID)</label>
                  <input type="text" id="dc-guild" class="form-input" placeholder="Server ID..." bind:value={discordGuildId} />
                </div>
              </div>
              <button class="btn-primary" style="width: auto; margin-top: 1rem; padding: 0.55rem 1.5rem;" onclick={saveDiscordSettings}>Salvar Credenciais Discord</button>
            </div>
          </main>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- MODAL: ADD / DELETE CATEGORIES -->
{#if showCategoryModal}
  <div class="modal-overlay" transition:fade={{ duration: 150 }}>
    <div class="modal-card categories-card glass-effect">
      <h3 class="modal-title">Editar Categorias</h3>
      <p class="modal-desc">Adicione ou remova classes de indexação da base de dados</p>

      <div class="categories-list">
        {#each storage.categories as cat}
          <div class="category-list-item">
            <span>{cat}</span>
            <button onclick={() => deleteCategory(cat)}>&times;</button>
          </div>
        {/each}
      </div>

      <div class="add-cat-form">
        <input type="text" class="form-input" placeholder="Nome da categoria..." bind:value={newCategoryName} />
        <button class="btn-primary" style="width: auto;" onclick={addCategory}>Inserir</button>
      </div>

      <button class="btn-secondary" style="width: 100%; margin-top: 1rem;" onclick={() => showCategoryModal = false}>Fechar Janela</button>
    </div>
  </div>
{/if}

<!-- MODAL: DISCORD EXPLORER -->
{#if showDiscordImport}
  <div class="modal-overlay" transition:fade={{ duration: 150 }}>
    <div class="modal-card discord-explorer-card glass-effect">
      <h3 class="modal-title" style="color: #5865F2; display: flex; align-items: center; gap: 0.5rem; font-family: 'Outfit', sans-serif;">
        <span>Explorador do Discord</span>
        {#if isLoadingChannels}
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">(Buscando canais...)</span>
        {/if}
      </h3>
      <p class="modal-desc">Importe postagens com instruções e resoluções compartilhadas no Discord</p>

      <div class="discord-three-columns">
        <!-- Col 1: Channels list -->
        <div class="discord-col-channels">
          <span class="col-header">Canais</span>
          <div class="col-scroll">
            {#each discordChannels as chan}
              <button class="discord-channel-btn {selectedChannelId === chan.id ? 'active' : ''}" onclick={() => selectDiscordChannel(chan.id)}>
                # {chan.name}
              </button>
            {:else}
              <span class="empty-col">Nenhum canal localizado.</span>
            {/each}
          </div>
        </div>

        <!-- Col 2: Messages list -->
        <div class="discord-col-messages">
          <div class="col-header flex-between">
            <span>Mensagens</span>
            <div class="checkbox-inline">
              <input type="checkbox" id="hide-curated" bind:checked={discordHideImported} />
              <label for="hide-curated">Ocultar curados</label>
            </div>
          </div>
          <div class="col-scroll">
            {#if isLoadingMessages}
              <span class="empty-col">Buscando mensagens...</span>
            {:else}
              {#each finalMessages as msg}
                <button class="discord-message-item {selectedMessage && selectedMessage.id === msg.id ? 'active' : ''}" onclick={() => selectDiscordMessage(msg)}>
                  <span class="msg-author">@{msg.author.username}</span>
                  <span class="msg-snippet">{msg.content || '(Anexo de Imagem)'}</span>
                </button>
              {:else}
                <span class="empty-col">Nenhuma postagem pendente.</span>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Col 3: Preview -->
        <div class="discord-col-preview">
          <span class="col-header">Conteúdo</span>
          <div class="col-scroll preview-content">
            {#if selectedMessage}
              <div class="message-preview-bubble">
                <span class="preview-author">@{selectedMessage.author.username}</span>
                <span class="preview-time">{formatDate(selectedMessage.timestamp)}</span>
                <p class="preview-text">{selectedMessage.content}</p>
                {#if selectedMessage.attachments && selectedMessage.attachments.length > 0}
                  {#each selectedMessage.attachments as att}
                    {#if att.content_type && att.content_type.startsWith('image/')}
                      <img src={att.url} alt="anexo" class="preview-attachment" />
                    {/if}
                  {/each}
                {/if}
              </div>
            {:else}
              <span class="empty-col">Selecione uma mensagem para visualização</span>
            {/if}
          </div>
        </div>
      </div>

      <div class="modal-actions-flex" style="margin-top: 1.5rem;">
        <button class="btn-secondary" onclick={() => showDiscordImport = false}>Fechar Explorador</button>
        <button class="btn-primary" style="background: #5865F2; border-color: #5865F2;" onclick={startCuration} disabled={!selectedMessage}>
          Importar e Curar Postagem
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- MODAL: CURATION WIZARD -->
{#if showCurationWizard}
  <div class="modal-overlay" transition:fade={{ duration: 150 }}>
    <div class="modal-card curation-wizard-card glass-effect">
      <h3 class="modal-title" style="color: #10b981; font-family: 'Outfit', sans-serif;">Assistente de Curadoria</h3>
      <p class="modal-desc">Organize e adapte a informação vinda do Discord antes de publicar na Base local</p>

      <div class="curation-split-layout">
        <!-- Message Original Preview -->
        <div class="curation-orig-panel">
          <span class="panel-tag">Mensagem Original</span>
          <div class="orig-scroll">
            {#if selectedMessage}
              <div style="font-weight: 700; font-size: 0.78rem; color: #5865F2; margin-bottom: 0.35rem;">@{selectedMessage.author.username}:</div>
              <p style="white-space: pre-wrap; font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary);">{selectedMessage.content}</p>
              {#if selectedMessage.attachments && selectedMessage.attachments.length > 0}
                {#each selectedMessage.attachments as att}
                  {#if att.content_type && att.content_type.startsWith('image/')}
                    <div style="margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-muted); font-style: italic;">[O anexo de imagem associado será baixado localmente]</div>
                  {/if}
                {/each}
              {/if}
            {/if}
          </div>
        </div>

        <!-- Curated Form -->
        <div class="curation-edit-form">
          <div class="form-group">
            <label class="form-label" for="cur-title">Título do Artigo</label>
            <input type="text" id="cur-title" class="form-input" bind:value={curationTitle} />
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label" for="cur-cat">Categoria</label>
              <select id="cur-cat" class="form-input" bind:value={curationCategory}>
                {#each storage.categories as cat}
                  <option value={cat}>{cat}</option>
                {/each}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="cur-tags">Tags</label>
              <input type="text" id="cur-tags" class="form-input" placeholder="balança, serial, erro" bind:value={curationTags} />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="cur-desc">Descrição do Sintoma</label>
            <input type="text" id="cur-desc" class="form-input" bind:value={curationDescription} />
          </div>

          <div class="form-group flex-1">
            <label class="form-label" for="cur-sol">Solução (Passo a Passo Markdown)</label>
            <textarea id="cur-sol" class="form-input curation-sol-textarea" bind:value={curationSolution}></textarea>
          </div>
        </div>
      </div>

      <div class="modal-actions-flex" style="margin-top: 1.5rem;">
        <button class="btn-danger" style="flex: 0 0 130px;" onclick={() => showCurationWizard = false}>Cancelar</button>
        <div class="flex-row" style="flex: 1; justify-content: flex-end; gap: 0.5rem;">
          <button class="btn-secondary" onclick={() => saveCuration(true)}>Salvar como Rascunho</button>
          <button class="btn-primary" style="background: #10b981; border-color: #10b981;" onclick={() => saveCuration(false)}>Publicar Artigo</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .password-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-card {
    background: var(--bg-glass);
    padding: 2.5rem;
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 380px;
    text-align: center;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
  }

  .password-icon {
    margin-bottom: 0.75rem;
    color: var(--inovar-red);
  }

  .password-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.15rem;
    margin-bottom: 0.35rem;
  }

  .password-desc {
    font-size: 0.78rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    line-height: 1.4;
  }

  .error-msg {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.45rem;
    text-align: left;
  }

  .modal-actions-flex {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .admin-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
  }

  .admin-navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .admin-nav-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .admin-tab-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--text-secondary);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
    transition: var(--transition-fast);
  }

  .admin-tab-btn:hover {
    color: var(--text-primary);
    background: rgba(255,255,255,0.02);
  }

  .admin-tab-btn.active {
    color: #ffffff;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-color);
  }

  .btn-back-chat {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
    transition: var(--transition-fast);
  }

  .btn-back-chat:hover {
    border-color: var(--inovar-red);
    color: var(--text-primary);
  }

  .admin-content-viewport {
    flex: 1;
    overflow: hidden;
  }

  .admin-split-layout {
    display: flex;
    height: 100%;
  }

  .sidebar-column {
    width: 280px;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sidebar-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .btn-row {
    display: flex;
    gap: 0.3rem;
  }

  .btn-discord {
    background: #5865F2;
    border: none;
    color: #ffffff;
    font-size: 0.65rem;
    padding: 0.25rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .btn-new {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 0.65rem;
    padding: 0.25rem 0.45rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .search-input-small {
    width: 100%;
    padding: 0.45rem 0.65rem;
    background: rgba(0,0,0,0.15);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.75rem;
    outline: none;
  }

  .article-list-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .article-list-item {
    width: 100%;
    padding: 0.75rem 1rem;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.02);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    transition: var(--transition-fast);
  }

  .article-list-item:hover {
    background: rgba(255,255,255,0.01);
  }

  .article-list-item.active {
    background: rgba(255,255,255,0.02);
    border-left: 2px solid var(--inovar-red);
  }

  .art-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .art-category {
    font-size: 0.62rem;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .form-column {
    flex: 1;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    overflow-y: auto;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-muted);
    letter-spacing: 0.05em;
  }

  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .flex-row {
    display: flex;
    gap: 0.5rem;
  }

  .btn-add-cat {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 700;
  }

  .textarea-solution {
    flex: 1;
    min-height: 120px;
    resize: vertical;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }

  .form-footer {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }

  .btn-primary {
    background: var(--inovar-red);
    border: none;
    color: #ffffff;
    font-weight: 600;
    padding: 0.55rem 1.15rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.78rem;
    transition: var(--transition-fast);
  }

  .btn-primary:hover {
    background: var(--inovar-red-hover);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    font-weight: 600;
    padding: 0.55rem 1.15rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.78rem;
    transition: var(--transition-fast);
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ffffff;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-weight: 600;
    padding: 0.55rem 1.15rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.78rem;
    transition: var(--transition-fast);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  /* Reports styling */
  .reports-container {
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .metric-card.color-red {
    border-color: rgba(244, 63, 94, 0.15);
  }

  .metric-card.color-green {
    border-color: rgba(16, 185, 129, 0.15);
  }

  .metric-card.color-yellow {
    border-color: rgba(251, 191, 36, 0.12);
  }

  .metric-title {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .metric-number {
    font-family: 'Outfit', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .color-green .metric-number {
    color: #10b981;
  }

  .color-yellow .metric-number {
    color: #fbbf24;
  }

  .metric-subtitle {
    font-size: 0.62rem;
    color: var(--text-muted);
  }

  .text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .table-card {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }

  .table-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.85rem;
  }

  .table-title {
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .table-scroll-wrapper {
    max-height: 250px;
    overflow-y: auto;
  }

  .logs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  .logs-table th {
    text-align: left;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.62rem;
  }

  .logs-table td {
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid rgba(255,255,255,0.01);
  }

  /* Settings Page */
  .settings-grid {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 100%;
  }

  .settings-sidebar {
    border-right: 1px solid var(--border-color);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .settings-section-title {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .operator-list-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .operator-item {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.55rem 0.75rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: var(--transition-fast);
    font-size: 0.78rem;
  }

  .operator-item:hover {
    background: rgba(255,255,255,0.01);
    border-color: var(--inovar-red);
    color: var(--text-primary);
  }

  .role-badge {
    font-size: 0.58rem;
    padding: 0.1rem 0.3rem;
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
    font-weight: 700;
  }

  .role-badge.adm {
    background: rgba(244,63,94,0.1);
    color: var(--inovar-red);
  }

  .settings-form-column {
    padding: 1.5rem;
    overflow-y: auto;
  }

  .settings-section h4 {
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    color: var(--inovar-red);
    margin-bottom: 0.85rem;
    text-transform: uppercase;
  }

  .form-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }

  .checkbox-align {
    display: flex;
    align-items: center;
    height: 100%;
    padding-top: 1rem;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .checkbox-label {
    font-size: 0.78rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .sync-actions-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
  }

  /* Modals generic overlays */
  .modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-card {
    background: var(--bg-glass);
    border: 1px solid var(--border-color);
    padding: 2rem;
    border-radius: var(--radius-lg);
    width: 100%;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
  }

  .categories-card {
    max-width: 380px;
  }

  .modal-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.05rem;
    margin-bottom: 0.35rem;
  }

  .modal-desc {
    font-size: 0.72rem;
    color: var(--text-secondary);
    margin-bottom: 1.15rem;
    line-height: 1.4;
  }

  .categories-list {
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    background: rgba(0,0,0,0.15);
    border-radius: var(--radius-md);
    padding: 0.4rem;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .category-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.78rem;
    padding: 0.35rem 0.55rem;
    background: rgba(255,255,255,0.01);
    border-radius: 4px;
  }

  .category-list-item button {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.1rem;
  }

  .category-list-item button:hover {
    color: #ff5252;
  }

  .add-cat-form {
    display: flex;
    gap: 0.4rem;
  }

  /* Discord importer 3-cols styling */
  .discord-explorer-card {
    max-width: 900px;
    width: 90%;
  }

  .discord-three-columns {
    display: grid;
    grid-template-columns: 200px 260px 1fr;
    gap: 1rem;
    height: 350px;
    border: 1px solid var(--border-color);
    background: rgba(0,0,0,0.2);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .discord-col-channels, .discord-col-messages, .discord-col-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-right: 1px solid var(--border-color);
  }

  .discord-col-preview {
    border-right: none;
  }

  .col-header {
    background: rgba(255,255,255,0.01);
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .col-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .empty-col {
    font-size: 0.72rem;
    color: var(--text-muted);
    text-align: center;
    padding-top: 3rem;
  }

  .discord-channel-btn {
    text-align: left;
    background: none;
    border: none;
    color: var(--text-secondary);
    padding: 0.4rem 0.55rem;
    border-radius: 4px;
    font-size: 0.78rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .discord-channel-btn:hover {
    background: rgba(255,255,255,0.02);
    color: var(--text-primary);
  }

  .discord-channel-btn.active {
    background: rgba(88, 101, 242, 0.08);
    color: #7289da;
    font-weight: 700;
  }

  .discord-message-item {
    text-align: left;
    background: none;
    border: 1px solid transparent;
    padding: 0.5rem;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    transition: var(--transition-fast);
  }

  .discord-message-item:hover {
    background: rgba(255,255,255,0.02);
  }

  .discord-message-item.active {
    background: rgba(88,101,242,0.06);
    border-color: rgba(88,101,242,0.25);
  }

  .msg-author {
    font-size: 0.65rem;
    font-weight: 700;
    color: #7289da;
  }

  .msg-snippet {
    font-size: 0.72rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .message-preview-bubble {
    background: rgba(255,255,255,0.01);
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .preview-author {
    font-size: 0.72rem;
    font-weight: 700;
    color: #7289da;
  }

  .preview-time {
    font-size: 0.58rem;
    color: var(--text-muted);
  }

  .preview-text {
    font-size: 0.78rem;
    line-height: 1.5;
    white-space: pre-wrap;
    color: var(--text-secondary);
  }

  .preview-attachment {
    max-width: 100%;
    border-radius: var(--radius-md);
    margin-top: 0.5rem;
    border: 1px solid var(--border-color);
  }

  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .checkbox-inline {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .checkbox-inline label {
    font-size: 0.62rem;
    color: var(--text-muted);
    cursor: pointer;
  }

  /* Curation Wizard style */
  .curation-wizard-card {
    max-width: 850px;
    width: 90%;
  }

  .curation-split-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1rem;
    height: 380px;
  }

  .curation-orig-panel {
    border: 1px solid var(--border-color);
    background: rgba(0,0,0,0.2);
    border-radius: var(--radius-lg);
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
  }

  .panel-tag {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 0.65rem;
  }

  .orig-scroll {
    flex: 1;
    overflow-y: auto;
  }

  .curation-edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    overflow-y: auto;
  }

  .curation-sol-textarea {
    min-height: 100px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }
</style>
