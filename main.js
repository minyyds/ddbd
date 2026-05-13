const {
  app,
  BrowserWindow,
  Tray,
  Menu
} = require("electron");

const path = require("path");

const Store = require("electron-store");

const store = new Store();

let win;
let tray;



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

    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");


  win.on("moved", () => {

    const bounds =
      win.getBounds();

    store.set(
      "windowBounds",
      bounds
    );

  });


  win.on("close", (event) => {

    event.preventDefault();

    win.hide();

  });

}



function createTray() {

  const iconPath =
    path.join(__dirname, "icon.png");

  tray = new Tray(iconPath);

  const contextMenu =
    Menu.buildFromTemplate([
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);

  tray.setToolTip("pixel love ♡");

  tray.setContextMenu(contextMenu);


  tray.on("click", () => {

    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }

  });

}



app.whenReady().then(() => {

  app.setLoginItemSettings({
    openAtLogin: true,
  });

  createWindow();

  createTray();

});