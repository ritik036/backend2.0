import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "../../public/temp"); // ITS FILE LOCATION MAY CAUSE ERROR IF IT DOES THEN TWEAK IT
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.originalname);
    },
});

export const upload = multer({ storage: storage });
