const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let userDataPath = '';
try {
  userDataPath = ipcRenderer.sendSync('get-user-data-path');
} catch (e) {
  console.error('Erro ao recuperar o caminho de dados do usuário via IPC', e);
}

contextBridge.exposeInMainWorld('api', {
  readDatabaseFile: (filename) => {
    if (!userDataPath) return null;
    const filePath = path.join(userDataPath, filename);
    if (!fs.existsSync(filePath)) return null;
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.error(`Erro ao ler o arquivo ${filename}:`, e);
      return null;
    }
  },
  writeDatabaseFile: (filename, content) => {
    if (!userDataPath) return false;
    const filePath = path.join(userDataPath, filename);
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (e) {
      console.error(`Erro ao gravar o arquivo ${filename}:`, e);
      return false;
    }
  },
  readDatabaseFileAsync: (filename) => {
    return ipcRenderer.invoke('read-db-file-async', filename);
  },
  writeDatabaseFileAsync: (filename, content) => {
    return ipcRenderer.invoke('write-db-file-async', filename, content);
  },
  encryptString: (plainText) => {
    return ipcRenderer.invoke('encrypt-string', plainText);
  },
  decryptString: (cipherTextBase64) => {
    return ipcRenderer.invoke('decrypt-string', cipherTextBase64);
  },
  fetchDiscordChannels: (guildId, botToken) => {
    return ipcRenderer.invoke('fetch-discord-channels', guildId, botToken);
  },
  fetchDiscordMessages: (channelId, botToken) => {
    return ipcRenderer.invoke('fetch-discord-messages', channelId, botToken);
  },
  downloadDiscordImage: (url, botToken) => {
    return ipcRenderer.invoke('download-discord-image', url, botToken);
  },
  hashPassword: (password) => {
    if (typeof password !== 'string') return '';
    return crypto.createHash('sha256').update(password).digest('hex');
  },
  openExternalLink: (url) => {
    if (url) ipcRenderer.send('open-external-link', url);
  },
  setMenuBarVisibility: (visible) => {
    ipcRenderer.send('set-menu-bar-visibility', visible);
  }
});
