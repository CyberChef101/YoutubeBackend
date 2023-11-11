

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
    
        cb(null, file.orignalname)//edhe thoda scope hain improivement ka while storing data
    }
    })


export const upload = multer({
    storage ,
})