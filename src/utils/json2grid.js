import axios from 'axios';
import CryptoJS from 'crypto-js';

class T {
    constructor() {
        this.secretKey = "json-grid-master-key-123";
    }

    encrypt(data) {
        return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    }

    decrypt(data) {
        return CryptoJS.AES.decrypt(data, this.secretKey).toString(CryptoJS.enc.Utf8);
    }

    getToken() {
        const now = new Date().getTime();
        const payload = JSON.stringify({ now });
        const encrypted = this.encrypt(payload);
        return encodeURIComponent(encrypted);
    }
}
export const fetchJSON2GridLink = async (data) => {
    try {
        const tInstance = new T();
        const token = tInstance.getToken();
        const gridResponse = await axios.post(`https://api.jsongrid.com/save-data?token=${token}`, data);
        return `https://jsongrid.com/?data=${gridResponse.data.file}`
    } catch (error) {
        console.log(error); 
    }
}