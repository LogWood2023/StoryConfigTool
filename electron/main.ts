import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    title: '剧情配置工具',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools(); // 按需手动F12打开
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  // 每次启动强制清除全部缓存，确保加载最新代码
  const ses = session.defaultSession;
  await ses.clearCache();
  await ses.clearStorageData({ storages: ['caches', 'serviceworkers'] });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: 打开文件夹选择对话框
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: '选择包含剧情Excel的文件夹',
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC: 打开文件选择对话框
ipcMain.handle('dialog:openFile', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    title: '选择剧情配置文件',
    filters: [{ name: 'Excel文件', extensions: ['xlsx', 'xls'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});
