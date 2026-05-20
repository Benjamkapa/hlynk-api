import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The uploads folder will be in api/server/uploads
const uploadDir = path.join(__dirname, '../uploads');

// Ensure base upload directory exists
export const initStorage = async () => {
    try {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log(`✅ Storage: Local 'uploads' directory created.`);
        } else {
            console.log(`💥 Storage: Local storage is ready.`);
        }
    } catch (err) {
        console.error("🔴 Storage: Initialization failed!", err.message);
    }
};

/**
 * Upload a file to Local Filesystem
 * @param {Object} file - The file object from express-fileupload
 * @param {String} folder - Subfolder in uploads (e.g., 'avatars', 'products')
 * @returns {String} - The public URL of the uploaded file
 */
export const uploadFile = async (file, folder = 'general') => {
    const subDir = path.join(uploadDir, folder);
    
    // Ensure subfolder exists
    if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = path.join(subDir, fileName);
    
    try {
        await file.mv(filePath);
        
        // Construct the public URL
        const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const publicUrl = `${baseUrl}/uploads/${folder}/${fileName}`;
        return publicUrl;
    } catch (err) {
        console.error("🔴 Storage: Upload failed!", err.message);
        throw new Error("Failed to upload file to local storage.");
    }
};

/**
 * Delete a file from Local Filesystem
 * @param {String} fileUrl - The full public URL of the file
 */
export const deleteFile = async (fileUrl) => {
    try {
        const urlPath = new URL(fileUrl).pathname; // e.g. /uploads/profiles/123.jpg
        const relativePath = urlPath.replace('/uploads/', '');
        const filePath = path.join(uploadDir, relativePath);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn("⚠️ Storage: Deletion failed or file not found.", err.message);
    }
};

export default { uploadFile, deleteFile, initStorage };
