const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');

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
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Encerra o app quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
