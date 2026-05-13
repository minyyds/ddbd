const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 380,
    height: 340,

    frame: false,
    resizable: false,
      transparent: false,
    resizable: true,
    alwaysOnTop: true,

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
});