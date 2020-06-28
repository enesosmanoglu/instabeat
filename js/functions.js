function checkHashtags() {
    const hashtags = [];
    let lines = caption.innerHTML.split("<br>")
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let words = line.split(" ")

        for (let j = 0; j < words.length; j++) {
            const word = words[j];
            if (word.startsWith('#'))
                hashtags.push(word)
        }
    }
    for (let k = 0; k < hashtags.length; k++) {
        const hashtag = hashtags[k];
        caption.innerHTML = caption.innerHTML.replace(hashtag, `<hashtag><span class="hidden">#</span><i class="blue fa fa-hashtag">${hashtag.slice(1)}</i></hashtag>`)
    }
}
function hideLoginForm() {
    document.querySelector("#loginSection").style.display = "none"
}
function showLoginForm() {
    document.querySelector("#loginSection").style.display = "flex"
}
function toggleLoginForm() {
    if (document.querySelector("#loginSection").style.display == "none") {
        showLoginForm()
    } else {
        hideLoginForm()
    }
}
function sendAlert(text, style = { color: "red" }) {
    let alrt = document.querySelector("#alert");
    alrt.innerHTML = text;

    Object.assign(alrt.style, style)
}
function login() {
    let data = {};
    let eksikler = [];

    document.querySelectorAll("input.auth").forEach(input => {
        if (input.type == "button") return;
        if (!input.value && !input.hasAttribute("optional")) eksikler.push(input.name)
        data[input.id] = input.value;
    });

    if (eksikler.length) {
        sendAlert("Lütfen eksik alanları doldurun !<br><ul><li>" + eksikler.join("</li><li>") + "</li></ul>")
    } else {
        sendAlert("Lütfen bekleyiniz...", { color: "yellow" })
        ipcRenderer.send('login', data);
    }
}
function logout() {
    ipcRenderer.send('logout');
}
function cancel() {
    sendAlert("İptal isteği gönderiliyor...", { color: "yellow" })
    ipcRenderer.send('cancel');
}
function sendData() {
    let data = {};
    let eksikler = [];
    ["input", "textarea", "#caption"].forEach(selector => {
        document.querySelectorAll(selector).forEach(input => {
            if (input.type == "button") return;
            //if (input.classList.contains("auth")) return;
            if (!input.value && !input.hasAttribute("optional")) eksikler.push(input.name)
            if (input.id == "caption") return data[input.id] = input.innerText;
            data[input.id] = input.value;
        });
    })

    if (eksikler.length) {
        sendAlert("Lütfen eksik alanları doldurun !<br><ul><li>" + eksikler.join("</li><li>") + "</li></ul>")
    } else {
        function getHashtags(text) {
            const hashtags = [];
            text.split('\n').forEach(line => {
                hashtags.push(...line.split(" ").filter(a => a.trim().startsWith('#')))
            })
            return hashtags;
        }
        if (data.caption) {
            console.log(getHashtags(data.caption))
            if (getHashtags(data.caption).length > 30) {
                return sendAlert(`Hashtag sınırı 30'dur.\nŞu anda ${getHashtags(data.caption).length} adet hashtag bulunuyor!`, { color: "red" })
            } else if (data.caption.length > 2200) {
                return sendAlert(`Karakter sınırı 2200'dür.\nŞu anda ${data.caption.length} karakter bulunuyor!`, { color: "red" })
            }
        }
        sendAlert("Lütfen bekleyiniz...", { color: "orange" })
        console.log(data)
        ipcRenderer.send('submitForm', data);
    }
}
function getPic() {
    let type = document.querySelector("#beat_type").value;
    let text = document.querySelector("#beat_no").value;
    let username = document.querySelector("#username").value;
    createImage({ type, text, username })
}
function createImage(data) {
    let { type, text, username } = data;
    let width = 600, height = 600;

    let canvas = document.createElement("canvas");
    let rightSide = document.querySelector('div.rightSide');
    //rightSide.insertBefore(canvas, rightSide.firstChild);
    if (document.querySelector("canvas"))
        canvas = document.querySelector("canvas")
    else
        rightSide.appendChild(canvas)

    canvas.height = height;
    canvas.width = width;

    let context = canvas.getContext('2d');
    /* Background */
    context.fillStyle = '#000'
    context.fillRect(0, 0, width, height)
    let background = new Image();
    background.src = "./bg.png"
    background.onload = function () {
        context.drawImage(background, 0, 0);
        /* Text Config */
        let fontSize = 135
        context.font = fontSize + "pt Optimus"

        context.textAlign = 'center'
        context.textBaseline = 'middle'
        /* Main Text Config */
        let textWidth = context.measureText(text).width
        if (text.length > 4)
            context.font = context.font.replace(fontSize, fontSize - (textWidth) / 15)
        /* Main Text */
        context.fillStyle = '#fff'
        if (type)
            context.fillText(text, width / 2, height * 0.56)
        else
            context.fillText(text, width / 2, height * 0.5)
        /* Type Text */
        if (type) {
            let text0 = type
            context.fillStyle = '#fff'
            context.font = "28pt 'Bebas Neue'"
            context.fillText(text0, width / 2, height * 0.39)
        }
        /* Top Text */
        let text2 = username
        context.fillStyle = '#fff'
        context.font = "34.5pt 'Seagram tfb'"
        context.fillText(text2, width / 2, height * 0.12)
        /* Bottom Text */
        let text3 = "produced by Sappy"
        context.fillStyle = '#fff'
        context.font = "34.5pt 'Seagram tfb'"
        context.fillText(text3, width / 2, height * 0.88)

        ipcRenderer.send('image', canvas.toDataURL('image/jpeg', 1));
        ipcRenderer.send('lastImage', canvas.toDataURL('image/jpeg', 1));
    }
}