const { app, BrowserWindow } = require("electron");
const Store = require("electron-store");
const { Tray, Menu } = require("electron");

const path = require("path");
const store = new Store();

let tray;
let win;

function createWindow() {
  
  const savedBounds =
    store.get("windowBounds");

  win = new BrowserWindow({

    width: 340,
    height: 300,

    x: savedBounds?.x,
    y: savedBounds?.y,

    frame: false,
    resizable: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: true,
    icon: "desktop_icon.ico",

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");

const contextMenu =
  Menu.buildFromTemplate([
    {
      label: "Quit",
      click: () => app.quit(),
    },
  ]);

tray.setToolTip("pixel love ♡");

tray.setContextMenu(contextMenu);

  win.on("moved", () => {

    const bounds = win.getBounds();

    store.set(
      "windowBounds",
      bounds
    );

  });
}

app.whenReady().then(() => {

  app.setLoginItemSettings({
    openAtLogin: true,
  });

  createWindow();
});