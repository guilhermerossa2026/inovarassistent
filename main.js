const { app, BrowserWindow, Menu, ipcMain, shell, safeStorage, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Registrar protocolo local-image antes de carregar a janela
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-image', privileges: { bypassCSP: true, secure: true, supportFetchAPI: true } }
]);


// Canal IPC síncrono para obter o diretório de dados do usuário
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});

// Abrir links externos no navegador padrão do sistema
ipcMain.on('open-external-link', (event, url) => {
  if (url) {
    shell.openExternal(url).catch(err => console.error("Erro ao abrir link externo:", err));
  }
});

// Alterar visibilidade da barra de menus da janela
ipcMain.on('set-menu-bar-visibility', (event, visible) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setMenuBarVisibility(visible);
  }
});

// Prevenção de Path Traversal
function getSafePath(filename) {
  const safeName = path.basename(filename);
  return path.join(app.getPath('userData'), safeName);
}

// Canais IPC assíncronos de arquivos
ipcMain.handle('read-db-file-async', async (event, filename) => {
  try {
    const filePath = getSafePath(filename);
    if (!fs.existsSync(filePath)) return null;
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (e) {
    console.error(`Erro ao ler arquivo assincronamente: ${filename}`, e);
    return null;
  }
});

ipcMain.handle('write-db-file-async', async (event, filename, content) => {
  try {
    const filePath = getSafePath(filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf8');
    return true;
  } catch (e) {
    console.error(`Erro ao gravar arquivo assincronamente: ${filename}`, e);
    return false;
  }
});

// Canais IPC de criptografia (safeStorage)
ipcMain.handle('encrypt-string', async (event, plainText) => {
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      console.warn("Criptografia safeStorage não disponível. Retornando texto plano.");
      return plainText;
    }
    const encrypted = safeStorage.encryptString(plainText);
    return encrypted.toString('base64');
  } catch (e) {
    console.error("Erro ao criptografar string:", e);
    return plainText;
  }
});

ipcMain.handle('decrypt-string', async (event, cipherTextBase64) => {
  try {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return cipherTextBase64;
    }
    if (!/^[A-Za-z0-9+/=]+$/.test(cipherTextBase64)) {
      return cipherTextBase64;
    }
    const buffer = Buffer.from(cipherTextBase64, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (e) {
    // Retorna o próprio texto em caso de falha de decriptação (ex: dados legados em texto puro)
    return cipherTextBase64;
  }
});

// Canais IPC adicionais para integração direta com o Discord
ipcMain.handle('fetch-discord-channels', async (event, guildId, botToken) => {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });
    if (!response.ok) {
      throw new Error(`Erro na API do Discord: Status ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao buscar canais do Discord:", e);
    return { error: e.message };
  }
});

ipcMain.handle('fetch-discord-messages', async (event, channelId, botToken) => {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=20`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    });
    if (!response.ok) {
      throw new Error(`Erro na API do Discord: Status ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    console.error("Erro ao buscar mensagens do Discord:", e);
    return { error: e.message };
  }
});

ipcMain.handle('download-discord-image', async (event, imageUrl, botToken) => {
  try {
    const response = await fetch(imageUrl, {
      headers: botToken ? { 'Authorization': `Bot ${botToken}` } : {}
    });
    if (!response.ok) {
      throw new Error(`Erro ao baixar imagem: Status ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error("O link fornecido não é uma imagem válida.");
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > 10 * 1024 * 1024) { // Limite de 10MB
      throw new Error("A imagem excede o limite máximo de 10MB.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Extrai e sanitiza o nome do arquivo
    let fileName = path.basename(new URL(imageUrl).pathname);
    if (!fileName || fileName === '/') {
      fileName = `image_${Date.now()}.png`;
    } else {
      fileName = `${Date.now()}_${fileName}`;
    }
    const safeName = path.basename(fileName);
    
    const importedImagesDir = path.join(app.getPath('userData'), 'imported_images');
    if (!fs.existsSync(importedImagesDir)) {
      fs.mkdirSync(importedImagesDir, { recursive: true });
    }

    const targetPath = path.join(importedImagesDir, safeName);
    await fs.promises.writeFile(targetPath, buffer);
    return { success: true, fileName: safeName };
  } catch (e) {
    console.error("Erro ao baixar imagem do Discord:", e);
    return { success: false, error: e.message };
  }
});

function createWindow() {
  const template = [
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forcereload', label: 'Forçar Recarregamento' },
        { role: 'toggledevtools', label: 'Ferramentas do Desenvolvedor' },
        { type: 'separator' },
        { role: 'resetzoom', label: 'Resetar Zoom' },
        { role: 'zoomin', label: 'Aumentar Zoom' },
        { role: 'zoomout', label: 'Diminuir Zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    autoHideMenuBar: true, // Remove a barra de menus do navegador para visual nativo de aplicativo
    icon: path.join(__dirname, 'img/app_icon.png'), // Define o ícone da barra de títulos da janela
    show: false, // Inicia invisível para foco perfeito e sem cintilação
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Carrega o arquivo HTML principal
  mainWindow.loadFile('index.html');

  // Garante exibição perfeita e foco de teclado completo no Windows
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// Inicializa a aplicação
app.whenReady().then(() => {
  // Inicializa o protocolo customizado local-image
  protocol.handle('local-image', (request) => {
    try {
      const urlPath = decodeURIComponent(request.url.replace('local-image://', ''));
      const safeName = path.basename(urlPath);
      const filePath = path.join(app.getPath('userData'), 'imported_images', safeName);
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.error('Erro no protocolo local-image:', err);
    }
  });

  // Cria a pasta de imagens importadas se não existir
  const importedImagesDir = path.join(app.getPath('userData'), 'imported_images');
  if (!fs.existsSync(importedImagesDir)) {
    fs.mkdirSync(importedImagesDir, { recursive: true });
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Encerra o app quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
