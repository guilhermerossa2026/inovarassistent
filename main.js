const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
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
      contextIsolation: true
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
