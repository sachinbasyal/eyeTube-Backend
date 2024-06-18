import {v2 as cloudinary} from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url'
import dotenv from "dotenv";
import fs from 'fs';

dotenv.config({path:"./.env"})

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) {
            return console.log("File path not retrieved!") }
        // Upload a file
        const uploadResult = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // console.log("File is uploaded successfully @", uploadResult.secure_url)
        fs.unlinkSync(localFilePath) // remove the temp. stored file from the local folder
        return uploadResult
        
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally stored temp file as the upload operations got failed
        return console.log("Error in file uploading: ", error);
    }
}

const deleteAssetCloudinary = async(assetURL,resource_type="image") =>{
    try {
        const public_id = extractPublicId(assetURL); 
        await cloudinary.uploader.destroy(public_id, {type:"upload", resource_type:`${resource_type}`})
        .then(result => console.log(result ,"Asset is deleted from Cloudinary"));

    } catch (error) {
        return console.log("Error while deleting the asset in Cloudinary", error)
    }
}

export {uploadOnCloudinary, deleteAssetCloudinary}