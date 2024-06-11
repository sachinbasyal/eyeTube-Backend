import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return console.log("File path not retrieved!")
        // Upload a file
        const uploadResult = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        console.log("File uploaded successfully!", uploadResult.url)
        return uploadResult
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally stored temp file as the upload operations got failed
        return null
    }
}

export {uploadOnCloudinary}