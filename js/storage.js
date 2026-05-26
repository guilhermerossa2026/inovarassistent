// Serviço de armazenamento e persistência local (localStorage) para Inovar Assist

const STORAGE_KEYS = {
  KNOWLEDGE_BASE: 'inovar_assist_kb',
  SEARCH_LOGS: 'inovar_assist_logs',
  CURRENT_USER: 'inovar_assist_user'
};

class StorageService {
  constructor() {
    this._initDatabase();
  }

  // Inicializa o banco local com dados semente caso esteja vazio
  _initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_BASE)) {
      const seedData = window.initialKnowledgeBase || [];
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(seedData));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SEARCH_LOGS)) {
      const seedLogs = window.initialLogs || [];
      localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(seedLogs));
    }
  }

  // --- GERENCIAMENTO DE USUÁRIO (TÉCNICO) ---
  getCurrentUser() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || null;
  }

  setCurrentUser(username) {
    if (username && username.trim()) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username.trim());
      return true;
    }
    return false;
  }

  clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // --- OPERAÇÕES DA BASE DE CONHECIMENTO (CRUD) ---
  getKnowledge() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_BASE)) || [];
    } catch (e) {
      console.error("Erro ao ler base de conhecimento do localStorage", e);
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
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
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
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
      return true;
    }
    return false;
  }

  deleteKnowledge(id) {
    let kb = this.getKnowledge();
    const initialLength = kb.length;
    kb = kb.filter(item => item.id !== id);
    if (kb.length !== initialLength) {
      localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(kb));
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
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SEARCH_LOGS)) || [];
    } catch (e) {
      console.error("Erro ao ler logs do localStorage", e);
      return [];
    }
  }

  logSearch(query, articleId = null, resolved = false) {
    const logs = this.getLogs();
    const username = this.getCurrentUser() || 'Suporte';
    const newLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      user: username,
      query: query.trim(),
      timestamp: new Date().toISOString(),
      resolved: resolved,
      articleId: articleId
    };
    logs.push(newLog);
    localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
    return newLog;
  }

  // Atualiza o status de resolução do último log inserido ou de um log específico
  updateLastLogResolution(resolved, articleId = null) {
    const logs = this.getLogs();
    if (logs.length > 0) {
      // Procura a última busca sem artigo associado ou a última em geral
      const idx = logs.length - 1;
      logs[idx].resolved = resolved;
      if (articleId) logs[idx].articleId = articleId;
      localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(logs));
      return true;
    }
    return false;
  }

  clearLogs() {
    localStorage.setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify([]));
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
        localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(parsed.knowledgeBase));
        return true;
      }
      // Suporte a importação direta de array de conhecimentos
      if (Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(parsed));
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
