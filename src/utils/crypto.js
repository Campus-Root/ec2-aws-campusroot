import crypto from "crypto"
import 'dotenv/config';
const originalKey = process.env.ENCRYPT_KEY;
const secretKey = Buffer.from(originalKey.repeat(4).substring(0, 32), 'utf-8');
const algorithm = "aes-256-cbc"

export const encrypt = (content) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
    let encryptedData = cipher.update(content, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    const key = Buffer.from(iv, "binary").toString("base64");
    return { encryptedData: encryptedData, key: key }
}

export const decrypt = (IV, content) => {
    const iv = Buffer.from(IV, 'base64');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decryptedData = decipher.update(content, "hex", "utf-8");
    decryptedData += decipher.final("utf8");
    return decryptedData
}