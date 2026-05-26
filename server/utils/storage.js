import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paramsPath = path.join(__dirname, '../configs/params.json');
const params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));

// -------------------------------------------------
// MinIO client configuration
// -------------------------------------------------
export const minioClient = new Minio.Client({
    endPoint: params.minio_endpoint || '127.0.0.1',
    port: parseInt(params.minio_port) || 9000,
    useSSL: params.minio_use_ssl || false,
    accessKey: params.minio_access_key || 'benjamkapa',
    secretKey: params.minio_secret_key || 'fortjesus@G2026!'
});

export const bucketName = params.minio_bucket_name || 'hlynk-uploads';

/**
 * Initialize storage by ensuring bucket exists and is public
 */
export const initStorage = async () => {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`✅ Storage: MinIO bucket '${bucketName}' created.`);
        } else {
            console.log(`✅ Storage: MinIO connection verified (using bucket '${bucketName}').`);
        }

        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: ["s3:GetObject"],
                    Effect: "Allow",
                    Principal: "*",
                    Resource: [`arn:aws:s3:::${bucketName}/*`]
                }
            ]
        };
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`✅ Storage: MinIO permissions strictly set to Public Read.`);
    } catch (err) {
        console.error("🔴 Storage: MinIO Initialization failed!", err.message);
    }
};

/**
 * Upload a file to MinIO
 * @param {Object} file - The file object from express-fileupload
 * @param {String} folder - Subfolder (e.g., 'avatars', 'products')
 * @returns {String} - The public URL of the uploaded file
 */
export const uploadFile = async (file, folder = 'general') => {
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    await minioClient.putObject(bucketName, fileName, file.data, file.size, {
        'Content-Type': file.mimetype
    });

    const endpoint = params.minio_endpoint || '127.0.0.1';
    const port = params.minio_port || 9000;
    const protocol = params.minio_use_ssl ? 'https' : 'http';
    
    return `${protocol}://${endpoint}:${port}/${bucketName}/${fileName}`;
};

/**
 * Delete a file from MinIO
 * @param {String} fileUrl - The full public URL of the file
 */
export const deleteFile = async (fileUrl) => {
    try {
        const urlObj = new URL(fileUrl);
        const prefix = `/${bucketName}/`;
        if (urlObj.pathname.startsWith(prefix)) {
            const objectName = urlObj.pathname.slice(prefix.length);
            await minioClient.removeObject(bucketName, objectName);
        }
    } catch (err) {
        console.warn("⚠️ Storage: MinIO Deletion failed or file not found.", err.message);
    }
};

export default { uploadFile, deleteFile, initStorage };
