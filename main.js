const { app, BrowserWindow, Tray, Menu, ipcMain } = require("electron");

const http = require("http");
const path = require("path");
const Store = require("electron-store").default;
const store = new Store();

let win;
let tray = null;

// =====================
// SINGLE INSTANCE LOCK
// =====================
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// =====================
// PROTOCOL (Spotify callback)
// =====================
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("myapp", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("myapp");
}

function handleCallback(url) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get("code");
  if (code && win) {
    win.webContents.send("spotify-code", code);
  }
}

// Windows: second instance carries the URL in argv
app.on("second-instance", (event, commandLine) => {
  const url = commandLine.find((arg) => arg.startsWith("myapp://"));
  if (url) handleCallback(url);
  if (win) {
    win.show();
    win.focus();
  }
});

// Mac: open-url event
app.on("open-url", (event, url) => {
  event.preventDefault();
  handleCallback(url);
});

// =====================
// WINDOW
// =====================
function createWindow() {
  const savedBounds = store.get("windowBounds");

  win = new BrowserWindow({
    width: 340,
    height: 500,
    x: savedBounds?.x,
    y: savedBounds?.y,
    frame: false,
    resizable: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
  win.setAlwaysOnTop(true, "screen-saver");

  win.webContents.on("did-finish-load", () => {
    const token = store.get("spotify_token");
    const refresh = store.get("spotify_refresh_token");
    if (token) win.webContents.send("restore-tokens", { token, refresh });
  });

  win.on("moved", () => {
    store.set("windowBounds", win.getBounds());
  });

  win.on("close", (event) => {
    event.preventDefault();
    win.hide();
  });
}

// =====================
// TRAY
// =====================
function createTray() {
  try {
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, "./icon.ico")
      : path.join(__dirname, "./icon.ico");

    tray = new Tray(iconPath);

    tray.setToolTip("♡");
    tray.setContextMenu(
      Menu.buildFromTemplate([{ label: "Quit", click: () => app.quit() }]),
    );

    tray.on("click", () => {
      win.isVisible() ? win.hide() : win.show();
    });
  } catch (err) {
    console.error("Tray creation failed:", err);
  }
}
function startCallbackServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:3000");
    const code = url.searchParams.get("code");

    if (code && win) {
      win.webContents.send("spotify-code", code);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><h2>Connected! You can close this tab.</h2></body></html>",
      );
    } else {
      res.writeHead(400);
      res.end("No code found");
    }

    server.close();
  });

  server.listen(3000, "127.0.0.1");
}

ipcMain.on("save-tokens", (event, { token, refresh }) => {
  store.set("spotify_token", token);
  store.set("spotify_refresh_token", refresh);
});

ipcMain.on("clear-tokens", () => {
  store.delete("spotify_token");
  store.delete("spotify_refresh_token");
});


// INIT
// =====================
app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: true });
  createWindow();
  createTray();
  startCallbackServer();
});
