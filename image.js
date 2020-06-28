const fs = require('fs')
const { createCanvas, loadImage, registerFont } = require('canvas')

async function createImage(text, path) {
    /* Loading Fonts */
    registerFont("./fonts/Optimus.otf", { family: "Optimus" })
    registerFont("./fonts/Optimus Hollow.otf", { family: "OptimusHollow" })
    /* Sizing */
    const width = 600, height = 600;
    /* Canvas */
    const canvas = createCanvas(width, height), context = canvas.getContext('2d');
    /* Background */
    context.fillStyle = '#000'
    context.fillRect(0, 0, width, height)
    const bg = await loadImage('./bg.png');
    context.drawImage(bg, 0, 0, width, height)
    /* Text Config */
    let fontSize = 152
    context.font = fontSize + 'pt Optimus'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    /* Main Text Config */
    const textWidth = context.measureText(text).width
    if (text.length > 4)
        context.font = context.font.replace(fontSize, fontSize - (textWidth) / 15)
    // /* Main Text Background */
    // context.fillStyle = '#3574d4'
    // context.fillRect(width / 2 - textWidth / 2 - 10, height * 0.2 - 5, textWidth + 20, 110 + 10)
    /* Main Text */
    context.fillStyle = '#fff'
    context.fillText(text, width / 2, height / 2)
    /* Top Text */
    const text2 = "@sappybeats"
    context.fillStyle = '#fff'
    context.font = "32pt 'Optimus Hollow'"
    context.fillText(text2, width / 2, height * 0.2)
    /* Bottom Text */
    const text3 = "produced by Sappy"
    context.fillStyle = '#fff'
    context.font = "34pt 'Optimus Hollow'"
    context.fillText(text3, width / 2, height * 0.8)
    // /* Import Image */
    // const image = await loadImage('./logo.png');
    // context.drawImage(image, 340, 515, 70, 70)
    /* Saving */
    const buffer = canvas.toBuffer('image/jpeg', { quality: 1 })
    if (path)
        if (!fs.existsSync('./' + path + '/'))
            fs.mkdirSync('./' + path + '/')
    fs.writeFileSync('./' + (path ? (path + "/") : "") + text + '.jpg', buffer)
}

const text = "9876543210";
let last = "";
for (let i = 0; i < text.length; i++) {
    last += text[i];
    createImage(last, 5)
}