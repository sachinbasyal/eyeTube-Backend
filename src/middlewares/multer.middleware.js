import multer from "multer";

// DiskStorage: storing files to disk
const storage = multer.diskStorage({
  destination: "./public/temp",
  filename: (req, file, cb) => { cb(null, Date.now() + "-" + file.originalname); }, });

export const upload = multer({ storage: storage })