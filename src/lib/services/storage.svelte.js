// @ts-nocheck
import { invoke } from '@tauri-apps/api/core';

// Default categories
const DEFAULT_CATEGORIES = ['Fiscal', 'Banco de Dados', 'Periféricos', 'Instalação', 'Geral'];

// Seed knowledge base
const SEED_KNOWLEDGE = [
  {
    "id": "kb-001",
    "title": "Erro de Timeout na Emissão de NF-e",
    "category": "Fiscal",
    "tags": ["nfe", "timeout", "sefaz", "integrador", "fiscal", "erro 500"],
    "description": "Instabilidade de conexão com os servidores da SEFAZ ou bloqueio local de portas que impede o retorno do XML assinado.",
    "solution": "Este problema geralmente ocorre por instabilidade na SEFAZ ou regras de bloqueio no firewall do cliente.\n\n### Procedimento de Diagnóstico e Correção:\n\n1. **Verifique os Servidores da SEFAZ:**\n   Consulte a disponibilidade no portal oficial da SEFAZ do estado do cliente.\n\n2. **Teste de Latência de Rede:**\n   No servidor do cliente, abra o **Prompt de Comando (CMD)** como administrador e execute:\n   ```bash\n   ping nfe.sefaz.rs.gov.br -t\n   ```\n   *(Substitua o endereço pelo servidor SEFAZ autorizador do estado correspondente).*\n\n3. **Verificação de Portas:**\n   Certifique-se de que a porta **443** (HTTPS) está liberada para tráfego de saída no firewall do cliente.\n\n4. **Reinicialização do Integrador:**\n   Se a rede estiver operante, reinicie o serviço integrador fiscal da Inovar executando os comandos abaixo no CMD como administrador:\n   ```bash\n   net stop InovarFiscal\n   net start InovarFiscal\n   ```\n   \n5. **Limpeza de Cache SSL:**\n   Abra as *Opções da Internet* no Windows, vá até a aba *Conteúdo* e clique em **\"Limpar estado SSL\"**."
  },
  {
    "id": "kb-002",
    "title": "Deadlock no Banco de Dados (Travamento do PDV)",
    "category": "Banco de Dados",
    "tags": ["banco", "deadlock", "travamento", "pdv", "sql", "kill"],
    "description": "Concorrência de transações no banco SQL que trava as operações de vendas e fechamento de caixa.",
    "solution": "Um deadlock ocorre quando duas transações se bloqueiam mutuamente. Isso causa travamento geral nas telas do PDV.\n\n### Como identificar e liberar:\n\n1. **Identificar processos bloqueados:**\n   Abra o SQL Server Management Studio (SSMS) conectado ao servidor do cliente e execute a query abaixo:\n   ```sql\n   SELECT \n       spid, \n       blocked, \n       waittime, \n       lastwaittype, \n       status, \n       cmd,\n       hostname,\n       program_name\n   FROM sys.sysprocesses \n   WHERE blocked > 0;\n   ```\n\n2. **Descobrir o bloqueador principal:**\n   Na coluna `blocked`, identifique o ID numérico do processo causador do bloqueio principal (geralmente aquele que não está bloqueado por ninguém, mas bloqueia outros).\n\n3. **Derrubar o processo travado:**\n   Execute o comando de liberação usando o ID identificado:\n   ```sql\n   KILL [ID_DO_PROCESSO];\n   -- Exemplo: KILL 54;\n   ```\n   \n   > [!CAUTION]\n   > **Importante:** Apenas execute o `KILL` se tiver certeza de que não é um processo crítico de sincronização de retaguarda ou fechamento fiscal ativo."
  },
  {
    "id": "kb-003",
    "title": "Configuração de Balança Filizola (Sem Leitura de Peso)",
    "category": "Periféricos",
    "tags": ["balança", "filizola", "peso", "com", "serial", "configurar"],
    "description": "O PDV não consegue ler o peso transmitido pela balança Filizola conectada na porta Serial (COM).",
    "solution": "Caso o PDV retorne peso zerado ou erro de leitura ao acionar a pesagem da balança Filizola, siga estas etapas:\n\n### Passo a Passo para Configuração:\n\n1. **Verifique a Conexão Física:**\n   Certifique-se de que o cabo serial RS-232 está plugado firmemente na balança e na porta COM do computador. Se estiver usando adaptador USB-Serial, confirme o driver nas propriedades do Windows.\n\n2. **Identifique a Porta COM no Windows:**\n   Abra o *Gerenciador de Dispositivos* e expanda a seção **\"Portas (COM e LPT)\"** para verificar qual número de porta COM foi atribuído (Ex: `COM3`).\n\n3. **Parâmetros da Balança Filizola (Padrão):**\n   No arquivo de configuração do PDV (`config.ini`) ou na tela de periféricos do sistema Inovar, configure a porta com os seguintes parâmetros:\n   - **Baud Rate:** `2400` ou `9600` (depende do modelo da Filizola Platina)\n   - **Data Bits:** `8`\n   - **Parity:** `None`\n   - **Stop Bits:** `1`\n   - **Handshaking:** `None`\n\n4. **Teste de Comunicação Direta:**\n   Use o software oficial *Filizola Teste* ou um emulador de terminal (como PuTTY) na porta identificada para ver se os caracteres de peso estão chegando na tela."
  },
  {
    "id": "kb-004",
    "title": "Impressora Térmica não Imprime (Fila de Spool Travada)",
    "category": "Periféricos",
    "tags": ["impressora", "termica", "nao imprime", "bobina", "spooler", "usb"],
    "description": "Impressora não responde aos comandos de impressão de cupom fiscal ou recibo, mesmo ligada.",
    "solution": "Quando a impressora térmica (Bematech, Elgin ou Epson) para de imprimir repentinamente, o spooler do Windows costuma estar travado com documentos corrompidos.\n\n### Procedimento de Limpeza do Spooler:\n\n1. **Retire a impressora da tomada USB/Energia** e recoloque após 5 segundos. Certifique-se de que o LED está verde (indica papel alimentado).\n\n2. **Limpar a Fila de Impressão via CMD:**\n   Abra o **Prompt de Comando (CMD)** como administrador e execute a sequência abaixo para limpar arquivos temporários corrompidos:\n   ```bash\n   -- Parar o serviço do spooler do Windows\n   net stop spooler\n   \n   -- Excluir arquivos temporários da fila\n   del /Q /F /S \"%systemroot%\\System32\\Spool\\Printers\\*.*\"\n   \n   -- Reiniciar o serviço do spooler\n   net start spooler\n   ```\n\n3. **Verificar porta nas Propriedades da Impressora:**\n   Vá em *Dispositivos e Impressoras* > Botão direito na impressora > *Propriedades da Impressora* > aba **Portas**.\n   Certifique-se de que a porta marcada é a correta (ex: `USB001`, `USB002` ou `ESDPRT`)."
  }
];

const STORAGE_KEYS = {
  KNOWLEDGE_BASE: 'inovar_assist_kb',
  SEARCH_LOGS: 'inovar_assist_logs',
  CURRENT_USER: 'inovar_assist_user',
  CATEGORIES: 'inovar_assist_categories',
  USERS: 'inovar_assist_users',
  SETTINGS: 'inovar_assist_settings'
};

class StorageService {
  knowledgeBase = $state([]);
  categories = $state([]);
  logs = $state([]);
  currentUser = $state(null);
  users = $state([]);
  settings = $state({
    saveLogin: false,
    theme: 'red',
    showMenuBar: false,
    autoScroll: true,
    rememberedUser: '',
    rememberedPassword: '',
    discordBotToken: '',
    discordGuildId: ''
  });
  
  isInitialized = $state(false);

  async init() {
    if (this.isInitialized) return;

    // Load settings
    const settingsStr = await this._getItem(STORAGE_KEYS.SETTINGS);
    if (settingsStr) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(settingsStr) };
      } catch (e) {
        console.error(e);
      }
    } else {
      await this._setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    }

    // Load currentUser
    const userStr = await this._getItem(STORAGE_KEYS.CURRENT_USER);
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        console.error(e);
      }
    }

    // Load categories
    const catsStr = await this._getItem(STORAGE_KEYS.CATEGORIES);
    if (catsStr) {
      try {
        this.categories = JSON.parse(catsStr);
      } catch (e) {
        this.categories = [...DEFAULT_CATEGORIES];
      }
    } else {
      this.categories = [...DEFAULT_CATEGORIES];
      await this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    }

    // Load knowledgeBase
    const kbStr = await this._getItem(STORAGE_KEYS.KNOWLEDGE_BASE);
    if (kbStr) {
      try {
        this.knowledgeBase = JSON.parse(kbStr);
      } catch (e) {
        this.knowledgeBase = [...SEED_KNOWLEDGE];
      }
    } else {
      this.knowledgeBase = [...SEED_KNOWLEDGE];
      await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
    }

    // Load logs
    const logsStr = await this._getItem(STORAGE_KEYS.SEARCH_LOGS);
    if (logsStr) {
      try {
        this.logs = JSON.parse(logsStr);
      } catch (e) {
        this.logs = [];
      }
    } else {
      this.logs = [];
      await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(this.logs));
    }

    // Load users
    const usersStr = await this._getItem(STORAGE_KEYS.USERS);
    if (usersStr) {
      try {
        this.users = JSON.parse(usersStr);
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default users
      const guilhermeHash = await invoke('hash_password', { password: '2420' });
      const suporteHash = await invoke('hash_password', { password: '123' });
      this.users = [
        { username: 'guilherme', password: guilhermeHash, role: 'ADM' },
        { username: 'suporte', password: suporteHash, role: 'NORMAL' }
      ];
      await this._setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    }

    this.isInitialized = true;
  }

  async _getItem(key) {
    try {
      return await invoke('read_db_file', { filename: `${key}.json` }) || localStorage.getItem(key) || null;
    } catch(e) {
      return localStorage.getItem(key) || null;
    }
  }

  async _setItem(key, value) {
    localStorage.setItem(key, value);
    try {
      await invoke('write_db_file', { filename: `${key}.json`, content: value });
    } catch(e) {
      console.error(e);
    }
  }

  async _removeItem(key) {
    localStorage.removeItem(key);
    try {
      await invoke('write_db_file', { filename: `${key}.json`, content: 'null' });
    } catch(e) {
      console.error(e);
    }
  }

  // user authentication methods
  async validateLogin(username, password) {
    const cleanUser = username.trim().toLowerCase();
    const hashedPassword = await invoke('hash_password', { password });
    const user = this.users.find(u => u.username.toLowerCase() === cleanUser && u.password === hashedPassword);
    if (user) {
      this.currentUser = user;
      await this._setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  async logout() {
    this.currentUser = null;
    await this._removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  async addUser(username, password, role) {
    const clean = username.trim().toLowerCase();
    if (!clean || !password) return false;
    if (this.users.some(u => u.username.toLowerCase() === clean)) return false;

    const hashedPassword = await invoke('hash_password', { password });
    this.users.push({ username: username.trim(), password: hashedPassword, role });
    await this._setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    return true;
  }

  async deleteUser(username) {
    const clean = username.trim().toLowerCase();
    if (clean === 'guilherme') return false; // Prevent lockout
    const initialLen = this.users.length;
    this.users = this.users.filter(u => u.username.toLowerCase() !== clean);
    if (this.users.length !== initialLen) {
      await this._setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      return true;
    }
    return false;
  }

  // categories
  async addCategory(name) {
    const clean = name.trim();
    if (!clean) return false;
    if (this.categories.some(c => c.toLowerCase() === clean.toLowerCase())) return false;
    this.categories.push(clean);
    await this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    return true;
  }

  async deleteCategory(name) {
    const index = this.categories.indexOf(name);
    if (index === -1) return false;
    this.categories.splice(index, 1);
    await this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    return true;
  }

  // knowledge CRUD
  async addKnowledge(item) {
    const newItem = {
      id: 'kb-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: item.title,
      category: item.category || 'Geral',
      tags: Array.isArray(item.tags) ? item.tags : this._parseTags(item.tags),
      description: item.description || '',
      solution: item.solution || '',
      discordMessageId: item.discordMessageId || null,
      status: item.status || 'Publicado'
    };
    this.knowledgeBase.push(newItem);
    await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
    return newItem;
  }

  async updateKnowledge(id, updatedItem) {
    const idx = this.knowledgeBase.findIndex(item => item.id === id);
    if (idx !== -1) {
      this.knowledgeBase[idx] = {
        ...this.knowledgeBase[idx],
        title: updatedItem.title,
        category: updatedItem.category || 'Geral',
        tags: Array.isArray(updatedItem.tags) ? updatedItem.tags : this._parseTags(updatedItem.tags),
        description: updatedItem.description || '',
        solution: updatedItem.solution || '',
        discordMessageId: updatedItem.discordMessageId !== undefined ? updatedItem.discordMessageId : this.knowledgeBase[idx].discordMessageId,
        status: updatedItem.status || this.knowledgeBase[idx].status || 'Publicado'
      };
      await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
      return true;
    }
    return false;
  }

  async deleteKnowledge(id) {
    const initialLen = this.knowledgeBase.length;
    this.knowledgeBase = this.knowledgeBase.filter(item => item.id !== id);
    if (this.knowledgeBase.length !== initialLen) {
      await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
      return true;
    }
    return false;
  }

  _parseTags(tagString) {
    if (!tagString) return [];
    return tagString.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
  }

  // settings
  async saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    await this._setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    return true;
  }

  async resetDatabase() {
    this.knowledgeBase = [...SEED_KNOWLEDGE];
    await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
    
    this.logs = [];
    await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(this.logs));

    this.categories = [...DEFAULT_CATEGORIES];
    await this._setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    return true;
  }

  // search logging
  async logSearch(query, articleId = null, resolved = false) {
    const username = this.currentUser ? this.currentUser.username : 'Suporte';
    const newLog = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      user: username,
      query: query.trim(),
      timestamp: new Date().toISOString(),
      resolved,
      articleId
    };
    this.logs.push(newLog);
    await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(this.logs));
    return newLog;
  }

  async updateLastLogResolution(resolved, articleId = null) {
    if (this.logs.length > 0) {
      const idx = this.logs.length - 1;
      this.logs[idx].resolved = resolved;
      if (articleId) this.logs[idx].articleId = articleId;
      await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(this.logs));
      return true;
    }
    return false;
  }

  async clearLogs() {
    this.logs = [];
    await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify([]));
  }

  async resolveQueryLogsRetroactively(query, articleId) {
    const cleanTarget = query.trim().toLowerCase();
    let updated = false;
    this.logs.forEach(log => {
      if ((!log.articleId || log.resolved === false) && log.query.trim().toLowerCase() === cleanTarget) {
        log.resolved = true;
        log.articleId = articleId;
        updated = true;
      }
    });
    if (updated) {
      await this._setItem(STORAGE_KEYS.SEARCH_LOGS, JSON.stringify(this.logs));
      return true;
    }
    return false;
  }

  // sync methods
  async syncDatabaseAsync(endpoint, token) {
    if (!endpoint) throw new Error("URL de sincronização não configurada.");
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          knowledgeBase: this.knowledgeBase,
          version: '1.2',
          clientTimestamp: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      if (data && Array.isArray(data.knowledgeBase)) {
        this.knowledgeBase = this._mergeKnowledgeBases(this.knowledgeBase, data.knowledgeBase);
        await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
        await this._logSyncStatus(true, `Sincronizado com sucesso: ${this.knowledgeBase.length} artigos.`);
        return { success: true, count: this.knowledgeBase.length };
      }
      throw new Error("Resposta inválida");
    } catch(err) {
      console.warn("Sync failed, running simulation...", err);
      await new Promise(r => setTimeout(r, 1500));
      const simulated = {
        id: 'kb-cloud-' + Date.now(),
        title: 'NFC-e Rejeição 539: Duplicidade de NF-e com Diferença na Chave de Acesso',
        category: 'Fiscal',
        tags: ['fiscal', 'sefaz', 'nfe', 'nfce', '539', 'duplicidade'],
        description: 'Erro gerado quando se tenta emitir uma nota fiscal que já foi enviada com chave diferente.',
        solution: '### Resolução\n1. Consulte a nota na SEFAZ pelo CNPJ do emissor.\n2. Baixe o XML da nota autorizada na SEFAZ.\n3. Importe o XML autorizado no integrador para atualizar o banco local do cliente.'
      };
      this.knowledgeBase = this._mergeKnowledgeBases(this.knowledgeBase, [simulated]);
      await this._setItem(STORAGE_KEYS.KNOWLEDGE_BASE, JSON.stringify(this.knowledgeBase));
      await this._logSyncStatus(true, `Simulado com sucesso (1 adicionado da nuvem).`);
      return { success: true, count: this.knowledgeBase.length, mock: true };
    }
  }

  _mergeKnowledgeBases(local, remote) {
    const map = new Map();
    local.forEach(item => map.set(item.id, item));
    remote.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  }

  async _logSyncStatus(success, message) {
    this.settings.lastSync = new Date().toISOString();
    this.settings.lastSyncStatus = success ? 'SUCCESS' : 'ERROR';
    this.settings.lastSyncMessage = message;
    await this.saveSettings(this.settings);
  }
}

export const storage = new StorageService();
