import multer from "multer";

// DiskStorage: storing files to disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix)
    // cb(null, file.originalname) // to save a file with original name in public/temp folder

  }
})

export const upload = multer({ storage: storage })