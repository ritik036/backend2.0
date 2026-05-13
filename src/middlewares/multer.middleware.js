import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.resolve(__dirname, "../../public/temp");
      console.log("Upload path:", uploadPath);
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
  });
  
export const upload = multer({ 
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
        // Allow image and video files only
        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/quicktime"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    }
});