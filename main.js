const { app, BrowserWindow } = require("electron");

function createWindow() {
    const win = new BrowserWindow({
        width: 320,
        height: 340,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        movable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadFile("index.html");
}

app.whenReady().then(() => {
    createWindow();
})