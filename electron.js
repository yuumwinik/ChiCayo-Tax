
const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    title: "ChiCayo Tax",
    icon: path.join(__dirname, 'public/favicon.ico'), // Will look for icon here
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, wait for Vite server. In production, load built file.
  const startUrl = process.env.npm_lifecycle_event === 'electron:dev'
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
