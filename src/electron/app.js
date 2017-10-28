// Electron setup
const electron = require('electron');
const { app, Menu, Tray, shell } = require('electron');
const ipc = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const configstore = require('configstore');
const pkg = require('../../package.json');
const conf = new configstore(pkg.name);

// Variables
let tray;
let mainWindow;
const iconFile = `${__dirname}/images/256x256.png`;
const title = 'P3X OneNote';

// Make sure it is a single instance application
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
    setVisible(true);
    mainWindow.webContents.reload();
})

if (isSecondInstance) {
    app.quit();
}

// Application actions
const action = {
    restart: () => {
        mainWindow.webContents.session.clearStorageData(() => {
            conf.clear();
            mainWindow.loadURL('file://' + __dirname + '/blank.html');
        });
    },    
    home: () => {
        mainWindow.show();
        mainWindow.webContents.session.clearStorageData(() => {
            conf.clear();
            mainWindow.loadURL('https://www.onenote.com/notebooks');
        });
    },
    corporate: () => {
        mainWindow.show();

        mainWindow.webContents.session.clearStorageData(() => {
            conf.clear();
            mainWindow.loadURL('https://www.onenote.com/notebooks?auth=2&auth_upn=my_corporate_email_address');
        });
    },
    'last-page': () => {
        if (typeof conf.get('lastUrl') === 'string' && !conf.get('lastUrl').startsWith('file')) {
            mainWindow.loadURL(conf.get('lastUrl'));
        } else {
            mainWindow.loadURL('file://' + __dirname + '/blank.html');
        }
    },
    toggleVisible: () => {
        if (mainWindow === undefined) {
            return;
        }
        setVisible(!mainWindow.isVisible());
    },
    quit: function () {
        app.isQuitting = true;
        app.quit();
    },
    github: () => {
        shell.openExternal('https://github.com/patrikx3/onenote');
    },
    patrik: () => {
        shell.openExternal('https://patrikx3.com');
    },
    p3x: () => {
        shell.openExternal('https://github.com/patrikx3');
    },
    corifeus: () => {
        shell.openExternal('https://corifeus.com');
    },
    npm: () => {
        shell.openExternal('https://www.npmjs.com/~patrikx3');
    },
    download: () => {
        shell.openExternal('https://github.com/patrikx3/onenote/releases');
    },
};

// Menus linked with actions
const menus = {
    default: () => {

        let visible = false;
        if (mainWindow !== undefined) {
            visible = mainWindow.isVisible() ? true : false;
        }
        return [
            {
                label: 'Personal login',
                click: action.home
            },
            {
                label: 'Corporate login',
                click: action.corporate
            },
            {
                label: 'Your last page',
                click: action['last-page']
            },
            {
                label: 'Clear session and logout',
                tooltip: 'You logout and can login again',
                click: action.restart
            },
            {
                label: visible ? 'Hide' : 'Show',
                click: action.toggleVisible
            },
            {
                label: 'Download',
                click: action.download
            },
            {
                label: 'Quit',
                click: action.quit
            }
        ];
    }
};

function createMenu() {
    const template = [
        {
            label: title,
            submenu: menus.default(),
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Download',
                    click: action.download
                },
                {
                    label: 'GitHub',
                    click: action.github
                },
                {
                    label: 'Patrik Laszlo',
                    click: action.patrik
                },
                {
                    label: 'P3X',
                    click: action.p3x
                },
                {
                    label: 'Corifeus',
                    click: action.corifeus
                },
                {
                    label: 'Npm',
                    click: action.npm
                },
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createTray() {
    if (tray === undefined) {
        tray = new Tray(iconFile);
        tray.setToolTip(title);
        tray.on('click', action.toggleVisible);
    }
    const contextMenu = Menu.buildFromTemplate(menus.default());
    tray.setContextMenu(contextMenu);
}

function setVisible(visible = true) {
    if (visible === null) {
        visible = true;
    }
    if (mainWindow !== undefined) {
        if (visible) {
            mainWindow.show();
        } else {
            mainWindow.hide();
        }
    }
    conf.set('visible', visible);
    createMenu();
    createTray();

    if (typeof conf.get('lastUrl') === 'string' && !conf.get('lastUrl').startsWith('file')) {
        mainWindow.loadURL(conf.get('lastUrl'));
    }
}


function createWindow() {
    mainWindow = new BrowserWindow({
        icon: iconFile,
        toolbar: false,
        title: title,
    });

    setVisible(conf.get('visible'));

    action.home();

    mainWindow.on('minimize', function (event) {
        event.preventDefault();
        setVisible(false);
    });

    mainWindow.on('close', function (event) {
        if (!app.isQuitting) {
            event.preventDefault();
            setVisible(false);
        }
        return false;
    });

    mainWindow.on('page-title-updated', function (event, title) {
        if (Array.isArray(event.sender.history) && event.sender.history.length > 0) {
            const lastUrl = event.sender.history[event.sender.history.length - 1];
            conf.set('lastUrl', lastUrl);
        }
    });

    const windowBounds = conf.get('windowBounds');
    if (windowBounds !== null && windowBounds !== undefined) {
        mainWindow.setBounds(windowBounds);
    }
}

ipc.on('did-finish-load', function () {
    const hostData = conf.get('toHost');
    if (hostData !== undefined && hostData !== null) {
        mainWindow.webContents.send('onload-user', hostData);
    }
});

ipc.on('save', function (event, data) {
    conf.set('toHost', data);
    conf.set('windowBounds', mainWindow.getBounds());
})

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
