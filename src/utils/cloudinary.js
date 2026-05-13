import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"
dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloundinary = async function (localFilePath) {
    try {
        if (!localFilePath) return null;
        console.log("Uploading file from:", localFilePath);
        
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        
        // file has been successfully uploaded, now remove local copy
        // if (response.public_id) {
        //     fs.unlinkSync(localFilePath);
        //     console.log("file has been uploaded on cloudinary", response.url);
        // }
        await fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        // Remove the locally saved temporary file if upload fails
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
            }
        } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError);
        }
        return null;
    }
};

export { uploadOnCloundinary };
