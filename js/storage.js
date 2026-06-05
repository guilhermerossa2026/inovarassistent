// Serviço de armazenamento e persistência local (localStorage) para Inovar Assist

window.showToast = function(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00cc66" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === 'error') {
    iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3333" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === 'warning') {
    iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00bfff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }
  
  toast.innerHTML = `
    ${iconSVG}
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

const STORAGE_KEYS = {
  KNOWLEDGE_BASE: 'inovar_assist_kb',
  SEARCH_LOGS: 'inovar_assist_logs',
  CURRENT_USER: 'inovar_assist_user',
  CATEGORIES: 'inovar_assist_categories',
  USERS: 'inovar_assist_users',
  SETTINGS: 'inovar_assist_settings'
};

class StorageService {
  constructor() {
    this._initDatabase();
  }

  // --- MÉTODOS AUXILIARES DE SUPORTE AO ELECTRON / LOCALSTORAGE ---
  _getItem(key) {
    if (window.api && typeof window.api.readDatabaseFile === 'function') {
      return window.api.readDatabaseFile(`${key}.json`);
    }
    return localStorage.getItem(key);
  }

  _setItem(key, value) {
    if (window.api && typeof window.api.writeDatabaseFile === 'function') {
      window.api.writeDatabaseFile(`${key}.json`, value);
    } else {
      localStorage.setItem(key, value);
    }
  }

  _removeItem(key) {
    if (window.api && typeof window.api.writeDatabaseFile === 'function') {
      window.api.writeDatabaseFile(`${key}.json`, "null");
    } else {
      localStorage.removeItem(key);
    }
  }

  _hashPassword(password) {
    if (window.api && typeof window.api.hashPassword === 'function') {
      return window.api.hashPassword(password);
    }
    return password; // Fallback se não estiver rodando no Electron
  }

  // Inicializa o banco local com dados semente caso esteja vazio e migra dados antigos
  _initDatabase() {
    const hasNodeApi = window.api && typeof window.api.readDatabaseFile === 'function';

    // Migração automática de localStorage para arquivos JSON
    Object.values(STORAGE_KEYS).forEach(key => {
      let fileData = null;
      if (hasNodeApi) {
        fileData = window.api.readDatabaseFile(`${key}.json`);
      }
      
      const localData = localStorage.getItem(key);
      if (hasNodeApi && !fileData && localData) {
        console.log(`Migrando chave ${key} do localStorage para arquivo JSON local...`);
        window.api.writeDatabaseFile(`${key}.json`, localData);
      }
    });

    if (!this._getItem(STORAGE_KEYS.KNOWLEDGE_BASE)) {
      const seedData = window.initialKnowledgeBase || [];
      this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(seedData));
    }

    if (!this._getItem(STORAGE_KEYS.SEARCH_LOGS)) {
      const seedLogs = window.initialLogs || [];
      this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(seedLogs));
    }

    if (!this._getItem(STORAGE_KEYS.CATEGORIES)) {
      const defaultCategories = ['Fiscal', 'Banco de Dados', 'Periféricos', 'Instalação', 'Geral'];
      this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(defaultCategories));
    }

    if (!this._getItem(STORAGE_KEYS.USERS)) {
      const defaultUsers = [
        { username: 'guilherme', password: this._hashPassword('2420'), role: 'ADM' },
        { username: 'suporte', password: this._hashPassword('123'), role: 'NORMAL' }
      ];
      this._setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
    }

    // Inicialização das configurações padrões caso não existam
    if (!this._getItem(STORAGE_KEYS.SETTINGS)) {
      const defaultSettings = {
        saveLogin: false,
        theme: 'red',
        showMenuBar: false,
        autoScroll: true,
        rememberedUser: '',
        rememberedPassword: ''
      };
      this._setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }

    // Garante que senhas antigas em texto puro sejam convertidas para Hash SHA-256
    const usersStr = this._getItem(STORAGE_KEYS.USERS);
    if (usersStr) {
      try {
        const users = JSON.parse(usersStr);
        let updated = false;
        users.forEach(u => {
          if (u.password && !/^[0-9a-f]{64}$/i.test(u.password)) {
            u.password = this._hashPassword(u.password);
            updated = true;
          }
        });
        if (updated) {
          this._setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      } catch (e) {
        console.error("Erro ao rodar migração de hash de senhas de usuários:", e);
      }
    }
  }

  // --- GERENCIAMENTO DE CONFIGURAÇÕES ---
  getSettings() {
    try {
      const settingsStr = this._getItem(STORAGE_KEYS.SETTINGS);
      if (settingsStr) {
        return JSON.parse(settingsStr);
      }
    } catch (e) {
      console.error("Erro ao ler configurações do storage:", e);
    }
    return {
      saveLogin: false,
      theme: 'red',
      showMenuBar: false,
      autoScroll: true,
      rememberedUser: '',
      rememberedPassword: ''
    };
  }

  saveSettings(settings) {
    if (settings) {
      this._setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    }
    return false;
  }

  resetDatabase() {
    // Restaura o banco de artigos e logs para os dados semente originais
    const seedData = window.initialKnowledgeBase || [];
    this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(seedData));

    const seedLogs = window.initialLogs || [];
    this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(seedLogs));

    const defaultCategories = ['Fiscal', 'Banco de Dados', 'Periféricos', 'Instalação', 'Geral'];
    this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(defaultCategories));
    
    // Mantém os usuários cadastrados inalterados para evitar lockout.
    return true;
  }

  // --- GERENCIAMENTO DE USUÁRIO (TÉCNICO) ---
  getCurrentUser() {
    try {
      return JSON.parse(this._getItem(STORAGE_KEYS.CURRENT_USER)) || null;
    } catch (e) {
      return null;
    }
  }

  setCurrentUser(userObj) {
    if (userObj) {
      this._setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userObj));
      return true;
    }
    return false;
  }

  clearCurrentUser() {
    this._removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // --- CONTAS DE USUÁRIOS E AUTENTICAÇÃO (CRUD) ---
  getUsers() {
    try {
      return JSON.parse(this._getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
      return [];
    }
  }

  saveUsers(users) {
    this._setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  addUser(username, password, role) {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) return false;
    if (users.some(u => u.username.toLowerCase() === cleanUser)) return false;
    
    const hashedPassword = this._hashPassword(password);
    users.push({ username: username.trim(), password: hashedPassword, role: role });
    this.saveUsers(users);
    return true;
  }

  deleteUser(username) {
    let users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    
    // Impede a exclusão da conta mestre "guilherme" para evitar lockout
    if (cleanUser === 'guilherme') return false;
    
    const initialLength = users.length;
    users = users.filter(u => u.username.toLowerCase() !== cleanUser);
    if (users.length !== initialLength) {
      this.saveUsers(users);
      return true;
    }
    return false;
  }

  validateLogin(username, password) {
    const users = this.getUsers();
    const cleanUser = username.trim().toLowerCase();
    const hashedPassword = this._hashPassword(password);
    const user = users.find(u => u.username.toLowerCase() === cleanUser && u.password === hashedPassword);
    if (user) {
      this.setCurrentUser(user);
      return user;
    }
    return null;
  }

  // --- GERENCIAMENTO DE CATEGORIAS DINÂMICAS ---
  getCategories() {
    try {
      return JSON.parse(this._getItem(STORAGE_KEYS.CATEGORIES)) || ['Fiscal', 'Banco de Dados', 'Periféricos', 'Instalação', 'Geral'];
    } catch (e) {
      return ['Fiscal', 'Banco de Dados', 'Periféricos', 'Instalação', 'Geral'];
    }
  }

  addCategory(name) {
    const cats = this.getCategories();
    const clean = name.trim();
    if (!clean) return false;
    // Evita duplicatas ignorando maiúsculas/minúsculas
    const exists = cats.some(c => c.toLowerCase() === clean.toLowerCase());
    if (exists) return false;
    cats.push(clean);
    this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    return true;
  }

  deleteCategory(name) {
    const cats = this.getCategories();
    const index = cats.indexOf(name);
    if (index === -1) return false;
    cats.splice(index, 1);
    this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    return true;
  }

  // --- OPERAÇÕES DA BASE DE CONHECIMENTO (CRUD) ---
  getKnowledge() {
    try {
      return JSON.parse(this._getItem(STORAGE_KEYS.KNOWLEDGE_BASE)) || [];
    } catch (e) {
      console.error("Erro ao ler base de conhecimento", e);
      return [];
    }
  }

  addKnowledge(item) {
    const kb = this.getKnowledge();
    const newItem = {
      id: 'kb-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: item.title,
      category: item.category || 'Geral',
      tags: Array.isArray(item.tags) ? item.tags : this._parseTags(item.tags),
      description: item.description || '',
      solution: item.solution || ''
    };
    kb.push(newItem);
    this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
    return newItem;
  }

  updateKnowledge(id, updatedItem) {
    const kb = this.getKnowledge();
    const idx = kb.findIndex(item => item.id === id);
    if (idx !== -1) {
      kb[idx] = {
        ...kb[idx],
        title: updatedItem.title,
        category: updatedItem.category || 'Geral',
        tags: Array.isArray(updatedItem.tags) ? updatedItem.tags : this._parseTags(updatedItem.tags),
        description: updatedItem.description || '',
        solution: updatedItem.solution || ''
      };
      this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
      return true;
    }
    return false;
  }

  deleteKnowledge(id) {
    let kb = this.getKnowledge();
    const initialLength = kb.length;
    kb = kb.filter(item => item.id !== id);
    if (kb.length !== initialLength) {
      this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
      return true;
    }
    return false;
  }

  // Auxiliar para converter string de tags separadas por vírgula em array limpo
  _parseTags(tagString) {
    if (!tagString) return [];
    return tagString
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
  }

  // --- OPERAÇÕES DOS LOGS DE HISTÓRICO ---
  getLogs() {
    try {
      return JSON.parse(this._getItem(STORAGE_KEYS.SEARCH_LOGS)) || [];
    } catch (e) {
      console.error("Erro ao ler logs", e);
      return [];
    }
  }

  logSearch(query, articleId = null, resolved = false) {
    const logs = this.getLogs();
    const currentUser = this.getCurrentUser();
    const username = currentUser ? currentUser.username : 'Suporte';
    const newLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      user: username,
      query: query.trim(),
      timestamp: new Date().toISOString(),
      resolved: resolved,
      articleId: articleId
    };
    logs.push(newLog);
    this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
    return newLog;
  }

  // Atualiza o status de resolução do último log inserido ou de um log específico
  updateLastLogResolution(resolved, articleId = null) {
    const logs = this.getLogs();
    if (logs.length > 0) {
      const idx = logs.length - 1;
      logs[idx].resolved = resolved;
      if (articleId) logs[idx].articleId = articleId;
      this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
      return true;
    }
    return false;
  }

  clearLogs() {
    this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify([]));
  }
 
  resolveQueryLogsRetroactively(query, articleId) {
    const logs = this.getLogs();
    const cleanTarget = query.trim().toLowerCase();
    let updated = false;
    
    logs.forEach(log => {
      if ((!log.articleId || log.resolved === false) && log.query.trim().toLowerCase() === cleanTarget) {
        log.resolved = true;
        log.articleId = articleId;
        updated = true;
      }
    });
    
    if (updated) {
      this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
      return true;
    }
    return false;
  }

  // --- IMPORTAÇÃO / EXPORTAÇÃO (DISTRIBUIÇÃO OFFLINE) ---
  exportDatabase() {
    const data = {
      knowledgeBase: this.getKnowledge(),
      version: '1.2',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  importDatabase(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.knowledgeBase)) {
        this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(parsed.knowledgeBase));
        return true;
      }
      if (Array.isArray(parsed)) {
        this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(parsed));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Erro ao importar banco de dados JSON", e);
      return false;
    }
  }
}

// Inicializa e expõe o serviço na janela global
window.storageService = new StorageService();
