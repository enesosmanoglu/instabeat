ipcRenderer.on("image", (event, data) => {
    createImage(data)
})
ipcRenderer.on("loadLast", (event, data) => {
    console.log(data)
    if (data.auth) {
        document.querySelector("#username").setAttribute("value", data.auth.IG_USERNAME)
        document.querySelector("#password").setAttribute("value", data.auth.IG_PASSWORD)
        sendAlert("Eski bilgiler girildi.", { color: "green" })
        //login();
    }
    if (data.lastNo) {
        document.querySelector("#beat_no").value = data.lastNo;
    }
    if (data.lastCaption) {
        caption.innerText = data.lastCaption;
        checkHashtags()
    }
    if (data.lastType) {
        document.querySelector("#beat_type").value = data.lastType;
    }
})
ipcRenderer.on("alert", (event, data) => {
    sendAlert(data.text, data.style ? data.style : {})
})
ipcRenderer.on("selectFile", (event, data) => {
    console.log(data)
    if (!data.canceled) {
        document.querySelector("#mp3_path").value = data.filePaths[0]
    }
})
ipcRenderer.on("loadingInfo", (event, data) => {
    console.log(data)
    document.querySelector("#loadingInfo").innerHTML = data;
})
ipcRenderer.on("loadingHide", (event, data) => {
    setTimeout(() => {
        document.querySelector("#loading").style.display = "none"
    }, 1500);
})
ipcRenderer.on("loadingShow", (event, data) => {
    document.querySelector("#loading").style.display = "flex"
})