const { app, BrowserWindow, ipcMain, dialog, shell, ipcRenderer } = require('electron')
const fs = require('fs')
const https = require('https');
const videoshow = require('videoshow');
const unzipper = require('unzipper');
const { IgApiClient } = require('instagram-private-api');

const { readFile } = fs;
const { promisify } = require('util');
const readFileAsync = promisify(readFile);
const ig = new IgApiClient();

var auth = fs.existsSync("./auth.js") ? require("./auth") : { "IG_USERNAME": "", "IG_PASSWORD": "" };
var videoOptions = {
    // default options
    fps: 30,
    loop: 60, // seconds
    transition: true,
    transitionDuration: 1, // seconds
    videoBitrate: 1024,
    videoCodec: 'libx264',
    size: '640x640',
    audioBitrate: '256k',
    audioChannels: 2,
    format: 'mp4',
    pixelFormat: 'yuv420p'
};

if (fs.existsSync("./videoOptions.js")) {
    videoOptions = require("./videoOptions");
} else {
    fs.writeFileSync("./videoOptions.js", `module.exports = ${JSON.stringify(videoOptions, null, 2)}`)
}

let win;

let updateUrl = "https://codeload.github.com/enesosmanoglu/instabeat/zip/master"//"https://www.dropbox.com/s/i4q3wu7almbfpgb/update.zip?dl=1"
let packageUrl = "https://raw.githubusercontent.com/enesosmanoglu/instabeat/master/package.json"

function createWindow() {
    win = new BrowserWindow({
        width: 1015,
        height: 615,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false,
        //transparent: true
    })
    // Open the DevTools.
    //win.webContents.openDevTools()

    win.loadFile('index.html')

    win.webContents.once("dom-ready", (event) => {
        updateApp();
    })

    win.webContents.on("dom-ready", (event) => {
        let lastNo = "0";
        if (fs.existsSync("lastNo.txt"))
            lastNo = fs.readFileSync("lastNo.txt", { encoding: 'utf8' })
        let lastCaption = "";
        if (fs.existsSync("lastCaption.txt"))
            lastCaption = fs.readFileSync("lastCaption.txt", { encoding: 'utf8' })
        let lastType = "";
        if (fs.existsSync("lastType.txt"))
            lastType = fs.readFileSync("lastType.txt", { encoding: 'utf8' })
        win.webContents.send('loadLast', { auth, videoOptions, lastNo, lastCaption, lastType })
    })

    win.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    // win.on("resize", (event, onTop) => {
    //     console.log(win.getSize().join(" , "))
    // })

    win.setMinimumSize(677, 551)
    win.center()

    win.webContents.on('new-window', function (event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });
    ipcMain.on("relaunch", (event, data) => {
        app.relaunch()
        app.exit()
    })

    ipcMain.on("update", (event, data) => {
        updateApp();
    })

}

function downloadFile(url, dest, cb, showAlert = false) {
    let file = fs.createWriteStream(dest);
    let request = (url) => {
        https.get(url, function (response) {
            console.log(response.statusCode, response.headers.location)
            if (response.statusCode == 301 || response.statusCode == 302) { // it's a redirect!
                if (!response.headers.location.startsWith("http"))
                    response.headers.location = "https://www.dropbox.com" + response.headers.location
                request(response.headers.location);
            } else {
                var len = parseInt(response.headers['content-length'], 10);
                var body = "";
                var cur = 0;
                var total = len / 1048576; //1048576 - bytes in  1Megabyte
                response.on("data", function (chunk) {
                    body += chunk;
                    cur += chunk.length;
                    win.setProgressBar(cur / len)

                    let info = "İndiriliyor " + (100.0 * cur / len).toFixed(2) + "% " + (cur / 1048576).toFixed(2) + " mb\r" + ".<br/> Toplam boyut: " + total.toFixed(2) + " mb";

                    win.webContents.send('loadingInfo', info)
                    if (showAlert)
                        sendAlert(info, "yellow")
                });
                response.on("end", function () {
                    win.setProgressBar(-1)

                    let info = "İndirme tamamlandı.";

                    win.webContents.send('loadingInfo', info)
                    if (showAlert)
                        sendAlert(info, "green")
                });
                response.on("error", function (e) {
                    win.setProgressBar(cur / len, { mode: "error" })
                    console.log("Error: " + e.message);

                    let info = "Hata: " + e.message;

                    win.webContents.send('loadingInfo', info)
                    if (showAlert)
                        sendAlert(info, "red")
                });

                response.pipe(file);
                file.on('finish', function () {
                    file.close(cb);  // close() is async, call cb after close completes.
                });
            }
        }).on('error', function (err) { // Handle errors
            fs.unlinkSync(dest); // Delete the file async. (But we don't check the result)
            if (cb) cb(err.message);
        });
    }
    request(url);
};
async function updateApp() {
    win.webContents.send('loadingShow')
    downloadFile(packageUrl, "./package_last.json", async (err) => {
        try {
            if (err) {
                win.webContents.send('loadingInfo', "Güncelleme kontrol edilemedi!")
                win.webContents.send('loadingHide')
                return console.log(err)
            }
            console.log('checking update...')
            let package = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8' }));
            let updatePackage = JSON.parse(fs.readFileSync('./package_last.json', { encoding: 'utf8' }));

            let version = package.version.split('.');
            let updateVersion = updatePackage.version.split('.');

            try {
                fs.unlinkSync("./package_last.json");
            } catch (error) {

            }

            if (updateVersion[0] > version[0]) {
                return startUpdate();
            } else {
                if (updateVersion[1] > version[1]) {
                    return startUpdate();
                } else {
                    if (updateVersion[2] > version[2]) {
                        return startUpdate();
                    } else {
                        win.webContents.send('loadingInfo', "Güncelleme bulunamadı!")
                        console.log("Güncelleme bulunamadı!", version, updateVersion)
                    }
                }
            }
        } catch (error) {
            win.webContents.send('loadingInfo', "Güncelleme kontrol sırasında hata oldu!")
        }

        win.webContents.send('loadingHide')
    });
    async function startUpdate() {
        downloadFile(updateUrl, "./update.zip", async (err) => {
            if (err) return console.log(err)
            await fs.createReadStream("./update.zip")
                .pipe(unzipper.Extract({ path: './' }))
                .on('error', console.log)
                .on('finish', () => {
                    console.log('finished')
                    fs.unlinkSync("./update.zip");
                    app.relaunch()
                    app.exit()
                })
                .promise()
        })
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

function sendAlert(text, color) {
    win.webContents.send('alert', { text, style: (color ? { color: color } : null) })
}

async function login() {
    return new Promise(async (resolve, reject) => {
        ig.state.generateDevice(auth.IG_USERNAME);
        //ig.state.proxyUrl = auth.IG_PROXY;
        console.log("Giriş yapılıyor...")
        sendAlert("Instagram hesabına giriş yapılıyor...", "yellow")

        win.webContents.executeJavaScript(`document.querySelector("main").style.borderColor="yellow"`)
        win.webContents.executeJavaScript(`document.querySelector("#loginButton").style.backgroundColor="yellow"`)
        win.webContents.executeJavaScript(`document.querySelector("#loginButton").style.color="black"`)
        win.webContents.executeJavaScript(`document.querySelector("input#username").setAttribute("disabled",null)`)
        win.webContents.executeJavaScript(`document.querySelector("input#password").setAttribute("disabled",null)`)
        win.webContents.executeJavaScript(`document.querySelector("button#login").setAttribute("disabled",null)`)
        let acc = await ig.account.login(auth.IG_USERNAME, auth.IG_PASSWORD)
            .then(ac => {
                sendAlert("Başarıyla giriş yapıldı!", "green")
                win.webContents.executeJavaScript(`document.querySelector("main").style.borderColor="green"`)
                win.webContents.executeJavaScript(`document.querySelector("#loginButton").style.backgroundColor="green"`)
                win.webContents.executeJavaScript(`document.querySelector("button#login").outerHTML = '<button id="logout" class="auth" onclick="logout();">Çıkış Yap</button>'`)
                win.webContents.executeJavaScript(`document.querySelector(".login").style.display = "none"`)
                win.webContents.executeJavaScript(`document.querySelector(".info img").src = "${ac.profile_pic_url}"`)
                win.webContents.executeJavaScript(`document.querySelector(".info #i_username").innerText = "${ac.username}"`)
                win.webContents.executeJavaScript(`document.querySelector(".info #i_name").innerText = "${ac.full_name}"`)
                win.webContents.executeJavaScript(`document.querySelector(".info").style.display = "flex"`)
                console.log(ac)
                resolve(ac);
            })
            .catch(error => {
                win.webContents.executeJavaScript(`document.querySelector("main").style.borderColor="red"`)
                win.webContents.executeJavaScript(`document.querySelector("#loginButton").style.backgroundColor="red"`)
                win.webContents.executeJavaScript(`document.querySelector("input#username").removeAttribute("disabled")`)
                win.webContents.executeJavaScript(`document.querySelector("input#password").removeAttribute("disabled")`)
                win.webContents.executeJavaScript(`document.querySelector("button#login").removeAttribute("disabled")`)
                if (error.message.includes("ENOTFOUND")) {
                    sendAlert("İnternet bağlantısı sağlanamadı!", "red")
                } else if (error.message.includes("password you entered is incorrect")) {
                    sendAlert("Yanlış şifre!", "red")
                } else if (error.message.includes("check your username")) {
                    sendAlert("Yanlış kullanıcı adı!", "red")
                } else {
                    sendAlert(error.message.split(';')[error.message.split(';').length - 1], "red")
                }
                reject(error)
            });
    })
}
async function logout() {
    let acc = await ig.account.logout()
        .then(ac => {
            sendAlert("Hesaptan çıkış yapıldı!", "green")
            win.webContents.executeJavaScript(`document.querySelector("main").style.borderColor="red"`)
            win.webContents.executeJavaScript(`document.querySelector("#loginButton").style.backgroundColor="red"`)
            win.webContents.executeJavaScript(`document.querySelector("input#username").removeAttribute("disabled")`)
            win.webContents.executeJavaScript(`document.querySelector("input#password").removeAttribute("disabled")`)
            win.webContents.executeJavaScript(`document.querySelector("button#logout").outerHTML = '<button id="login" class="auth" onclick="login();">Giriş Yap</button>'`)
            win.webContents.executeJavaScript(`document.querySelector(".login").style.display = "flex"`)
            win.webContents.executeJavaScript(`document.querySelector(".info").style.display = "none"`)
        })
        .catch(error => {
            if (error.message.includes("ENOTFOUND")) {
                sendAlert("İnternet bağlantısı sağlanamadı!", "red")
            } else {
                sendAlert(error.message.split(';')[error.message.split(';').length - 1], "red")
            }
        });
    console.log(acc)
    return acc;
}
ipcMain.on('login', async (event, data) => {
    console.log(data)
    //save auth
    if (auth.IG_USERNAME != data.username || auth.IG_PASSWORD != data.password) {
        auth.IG_USERNAME = data.username;
        auth.IG_PASSWORD = data.password;
        fs.writeFileSync("./auth.js", `module.exports = ${JSON.stringify(auth, null, 2)}`)
    }
    await login();
})
ipcMain.on('logout', async (event, data) => {
    await logout();
})
let cancelled = false;
ipcMain.on('cancel', async (event, data) => {
    cancelled = true;
})

ipcMain.on('submitForm', async function (event, data) {
    cancelled = false;

    console.log(data)
    console.log(data.caption)

    fs.writeFileSync("lastNo.txt", data.beat_no)
    fs.writeFileSync("lastCaption.txt", data.caption)

    if (!fs.existsSync(data.mp3_path)) {
        return sendAlert("Hatalı ses yolu!", "red")
    }

    try {
        await ig.account.currentUser()
    } catch (error) {
        if (error.message.includes("login_required")) {
            //save auth
            if (auth.IG_USERNAME != data.username || auth.IG_PASSWORD != data.password) {
                auth.IG_USERNAME = data.username;
                auth.IG_PASSWORD = data.password;
                fs.writeFileSync("./auth.js", `module.exports = ${JSON.stringify(auth)}`)
            }
            await login();
        } else if (error.message.includes("ENOTFOUND")) {
            return sendAlert("İnternet bağlantısı sağlanamadı!", "red")
        } else {
            return sendAlert(error.message.split('-')[error.message.split('-').length - 1], "red")
        }
    }

    sendAlert("Video oluşturma başlıyor...", "yellow")

    win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`);
    win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`);

    if (!fs.existsSync("./out/")) {
        fs.mkdirSync("./out/")
    }
    if (!fs.existsSync("./out/" + data.beat_no + "/")) {
        fs.mkdirSync("./out/" + data.beat_no + "/")
    } else {
        let ask = dialog.showMessageBoxSync(win, { type: "warning", buttons: ["Evet", "Hayır", "Eskisini paylaş"], title: "Dikkat", message: "Daha önceden bu numaraya ait oluşturma yapılmış.", detail: "Üzerine yazılmasını kabul ediyor musun?\n\n(Ya da en son oluşturulan videoyu tekrar paylaşabilirsin)" });
        if (ask == 1) {
            win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`);
            win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`);
            return sendAlert("İptal edildi.", "red")
        } else if (ask == 2) {
            sendAlert("Eski video Instagram'a yükleniyor... => " + auth.IG_USERNAME, "green");
            console.log("Video is uploading to Instagram => " + auth.IG_USERNAME);

            const videoPath = "./out/" + data.beat_no + "/video." + videoOptions.format;
            const coverPath = "./out/" + data.beat_no + "/img.jpg";
            const publishResult = await ig.publish.video({
                // read the file into a Buffer
                video: await readFileAsync(videoPath),
                coverImage: await readFileAsync(coverPath),
                caption: data.caption
                /*
                  this does also support:
                  caption (string),  ----+
                  usertags,          ----+----> See upload-photo.example.ts
                  location,          ----+
                 */
            }).catch(err => {
                console.error(err)
                sendAlert("HATA: " + err.message, "red")
            });

            //console.log(publishResult);

            if (publishResult && publishResult.status == "ok") {
                sendAlert(`<a target="_blank" href="https://www.instagram.com/p/${publishResult.media.code}/">Video paylaşıldı.</a>`, "green")
                console.log("Video başarıyla paylaşıldı. URL: " + `https://www.instagram.com/p/${publishResult.media.code}/`)
            }

            win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`);
            win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`);
            return
        }
    }

    async function saveData(data) {
        const d = Object.assign({}, data)
        let filename = "./out/" + d.beat_no + "/data.json"
        delete d["password"]
        fs.writeFileSync(filename, JSON.stringify(d, null, 2));
        return d;
    }

    async function createImage(type, text, username) {
        return new Promise(async (resolve, reject) => {
            let filename = "./out/" + text + "/img.jpg"

            win.webContents.send('image', { type: type, text: text, username: username })

            ipcMain.on('image', (event, url) => {
                const base64Data = url.replace(/^data:image\/jpeg;base64,/, "");
                fs.writeFileSync(filename, base64Data, 'base64');
                resolve(filename)
            })
        })
    }
    (async () => {
        if (cancelled) {
            fs.rmdirSync("./out/" + data.beat_no + "/", { recursive: true })
            sendAlert("İptal edildi!", "green")
            win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`)
            win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`)
            return;
        }
        console.log(await saveData(data))
        videoshow([await createImage(data.beat_type, data.beat_no, data.username)], videoOptions)
            .audio(data.mp3_path)
            .save("./out/" + data.beat_no + "/video." + videoOptions.format)
            .on('start', function (command) {
                if (cancelled) {
                    return console.log("iptal");
                }
                sendAlert("Video oluşturuluyor...", "yellow")
                console.log('ffmpeg process started:', command)
            })
            .on('progress', (sa) => {
                console.log(sa)
                win.setProgressBar(sa.percent / 100)
            })
            .on('error', function (err, stdout, stderr) {
                sendAlert("HATA:" + err.message, "red")
                console.error('Error:', err)
                console.error('ffmpeg stderr:', stderr)
            })
            .on('end', async function (output) {
                win.setProgressBar(-1)
                if (cancelled) {
                    fs.rmdirSync("./out/" + data.beat_no + "/", { recursive: true })
                    sendAlert("İptal edildi!", "green")
                    win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`)
                    win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`)
                    return;
                }
                sendAlert("Video oluşturuldu!\nInstagram'a yükleniyor... => " + auth.IG_USERNAME, "green");
                console.error('Video created in:', output);
                console.log("Video is uploading to Instagram => " + auth.IG_USERNAME);

                const videoPath = "./out/" + data.beat_no + "/video." + videoOptions.format;
                const coverPath = "./out/" + data.beat_no + "/img.jpg";
                const publishResult = await ig.publish.video({
                    // read the file into a Buffer
                    video: await readFileAsync(videoPath),
                    coverImage: await readFileAsync(coverPath),
                    caption: data.caption
                    /*
                      this does also support:
                      caption (string),  ----+
                      usertags,          ----+----> See upload-photo.example.ts
                      location,          ----+
                     */
                }).catch(err => {
                    console.error(err)
                    sendAlert("HATA: " + err.message, "red")
                });

                //console.log(publishResult);

                if (publishResult && publishResult.status == "ok") {
                    sendAlert(`<a target="_blank" href="https://www.instagram.com/p/${publishResult.media.code}/">Video paylaşıldı.</a>`, "green")
                    console.log("Video başarıyla paylaşıldı. URL: " + `https://www.instagram.com/p/${publishResult.media.code}/`)
                }

                win.webContents.executeJavaScript(`document.querySelector("#send").toggleAttribute("hidden")`);
                win.webContents.executeJavaScript(`document.querySelector("#cancel").toggleAttribute("hidden")`);
            })

    })()


});
ipcMain.on('selectFile', function (event, data) {
    dialog.showOpenDialog({ title: "Ses Dosyası Seç", properties: ['openFile'], filters: [{ name: "Ses Dosyaları", extensions: ["mp3", "wav", "wma", "m3u", "m4a", "aac", "ac3", "flac", "ogg", "opus", "aiff", "waptt", "3ga", "mp4a"] }] }).then(value => {
        console.log(value)
        win.webContents.send('selectFile', value)
    })
});

ipcMain.on('window_minimize', async (event, data) => {
    win.minimize()
})
ipcMain.on('window_maximize', async (event, data) => {
    if (!win.isMaximized())
        win.maximize()
    else
        win.unmaximize()
})
ipcMain.on('window_close', async (event, data) => {
    win.close()
})
ipcMain.on('lastImage', (event, url) => {
    const base64Data = url.replace(/^data:image\/jpeg;base64,/, "");
    fs.writeFileSync('last.png', base64Data, 'base64');
})