const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import modules
const FileManager = require('./core/fileManager');
const TerminalManager = require('./terminal/terminalManager');
const AIManager = require('./ai/aiManager');
const NCCompiler = require('./compiler/nccompiler');
const ExtensionManager = require('./extensions/extensionManager');

let mainWindow;
let tray = null;
let fileManager;
let terminalManager;
let aiManager;
let extensionManager;

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      spellcheck: false,
      devTools: true
    },
    icon: iconPath,
    show: false,
    paintWhenInitiallyHidden: true
  });

  // Load the main HTML
  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Handle window controls
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  // File operations
  ipcMain.handle('file-read', async (event, filePath) => {
    return await fileManager.readFile(filePath);
  });

  ipcMain.handle('file-write', async (event, filePath, content) => {
    return await fileManager.writeFile(filePath, content);
  });

  ipcMain.handle('file-delete', async (event, filePath) => {
    return await fileManager.deleteFile(filePath);
  });

  ipcMain.handle('file-exists', async (event, filePath) => {
    return await fileManager.fileExists(filePath);
  });

  ipcMain.handle('directory-create', async (event, dirPath) => {
    return await fileManager.createDirectory(dirPath);
  });

  ipcMain.handle('directory-list', async (event, dirPath) => {
    return await fileManager.listDirectory(dirPath);
  });

  ipcMain.handle('dialog-open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections']
    });
    return result;
  });

  ipcMain.handle('dialog-save', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  // Terminal operations
  ipcMain.handle('terminal-create', async (event, options) => {
    return await terminalManager.createTerminal(options);
  });

  ipcMain.handle('terminal-write', async (event, id, data) => {
    return await terminalManager.writeToTerminal(id, data);
  });

  ipcMain.handle('terminal-resize', async (event, id, cols, rows) => {
    return await terminalManager.resizeTerminal(id, cols, rows);
  });

  ipcMain.handle('terminal-kill', async (event, id) => {
    return await terminalManager.killTerminal(id);
  });

  // AI operations
  ipcMain.handle('ai-chat', async (event, messages, model, apiKey) => {
    return await aiManager.chat(messages, model, apiKey);
  });

  ipcMain.handle('ai-stream', async (event, messages, model, apiKey) => {
    return await aiManager.streamChat(messages, model, apiKey);
  });

  ipcMain.handle('ai-code-complete', async (event, code, language, position) => {
    return await aiManager.codeComplete(code, language, position);
  });

  ipcMain.handle('ai-explain', async (event, code, language) => {
    return await aiManager.explainCode(code, language);
  });

  ipcMain.handle('ai-refactor', async (event, code, language, instructions) => {
    return await aiManager.refactorCode(code, language, instructions);
  });

  ipcMain.handle('ai-fix-bugs', async (event, code, language, errors) => {
    return await aiManager.fixBugs(code, language, errors);
  });

  // NC Compiler operations
  ipcMain.handle('nc-compile', async (event, sourceCode) => {
    return await NCCompiler.compile(sourceCode);
  });

  ipcMain.handle('nc-run', async (event, sourceCode) => {
    return await NCCompiler.run(sourceCode);
  });

  ipcMain.handle('nc-lint', async (event, sourceCode) => {
    return await NCCompiler.lint(sourceCode);
  });

  // Extension operations
  ipcMain.handle('extension-install', async (event, extensionId) => {
    return await extensionManager.install(extensionId);
  });

  ipcMain.handle('extension-uninstall', async (event, extensionId) => {
    return await extensionManager.uninstall(extensionId);
  });

  ipcMain.handle('extension-list', async () => {
    return await extensionManager.list();
  });

  // Shell operations
  ipcMain.handle('shell-open-path', async (event, pathToOpen) => {
    shell.openPath(pathToOpen);
  });

  ipcMain.handle('shell-open-external', async (event, url) => {
    shell.openExternal(url);
  });

  // App info
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
  });

  // Create context menu
  setupContextMenu();
}

function setupContextMenu() {
  const template = [
    {
      label: 'Datei',
      submenu: [
        { label: 'Neue Datei', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
        { label: 'Öffnen...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open') },
        { label: 'Speichern', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Speichern unter...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu-save-as') },
        { type: 'separator' },
        { label: 'Beenden', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { label: 'Rückgängig', role: 'undo' },
        { label: 'Wiederherstellen', role: 'redo' },
        { type: 'separator' },
        { label: 'Ausschneiden', role: 'cut' },
        { label: 'Kopieren', role: 'copy' },
        { label: 'Einfügen', role: 'paste' },
        { label: 'Alles auswählen', role: 'selectAll' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { label: 'Explorer umschalten', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu-toggle-sidebar') },
        { label: 'Terminal umschalten', accelerator: 'CmdOrCtrl+`', click: () => mainWindow.webContents.send('menu-toggle-terminal') },
        { label: 'AI Chat umschalten', accelerator: 'CmdOrCtrl+Shift+A', click: () => mainWindow.webContents.send('menu-toggle-ai') },
        { type: 'separator' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Zoom zurücksetzen', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Vollbild', role: 'togglefullscreen' },
        { label: 'Entwicklertools', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Ausführen',
      submenu: [
        { label: 'Starten', accelerator: 'F5', click: () => mainWindow.webContents.send('menu-run') },
        { label: 'Ohne Debuggen starten', accelerator: 'CmdOrCtrl+F5', click: () => mainWindow.webContents.send('menu-run-no-debug') },
        { label: 'Stopp', accelerator: 'Shift+F5', click: () => mainWindow.webContents.send('menu-stop') }
      ]
    },
    {
      label: 'NC Sprache',
      submenu: [
        { label: 'NC Kompilieren', accelerator: 'CmdOrCtrl+Shift+C', click: () => mainWindow.webContents.send('menu-nc-compile') },
        { label: 'NC Ausführen', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.send('menu-nc-run') },
        { label: 'NC Linten', click: () => mainWindow.webContents.send('menu-nc-lint') }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        { label: 'Über Nezzo Code Studio', click: () => mainWindow.webContents.send('menu-about') },
        { label: 'Dokumentation', click: () => shell.openExternal('https://nezzo.dev/docs') },
        { type: 'separator' },
        { label: 'Nach Updates suchen', click: () => mainWindow.webContents.send('menu-check-updates') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize managers
function initializeManagers() {
  fileManager = new FileManager();
  terminalManager = new TerminalManager();
  aiManager = new AIManager();
  extensionManager = new ExtensionManager();
}

// App lifecycle
app.whenReady().then(() => {
  initializeManagers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    terminalManager.cleanup();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  terminalManager.cleanup();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
