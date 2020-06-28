let path1 = `C:\\Users\\enesosmanoglu\\Desktop\\instabeat-win32-ia32\\resources\\app\\node_modules`
let path2 = `D:\\GitHub\\instabeat\\release-builds\\instabeat-win32-ia32\\resources\\app\\node_modules`

let fs = require('fs')

let files = fs.readdirSync(path1)

fs.readdirSync(path2).forEach(element => {
    if (!files.includes(element)) {
        console.log(element)
        fs.renameSync(path2 + "\\" + element, path2 + "new" + "\\" + element)
    }
});