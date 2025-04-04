import jwt from "jsonwebtoken";
import 'dotenv/config';
import { getRedisClient } from "./dbConnection.js";
const redisClient = await getRedisClient();
const { ACCESS_SECRET, REFRESH_SECRET } = process.env
export const generateTokens = async (userId, source, DeviceToken) => {
    const newAccessToken = jwt.sign({ id: userId }, ACCESS_SECRET, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: '30d' });
    await redisClient.set(`accessToken:${userId}:${source}`, newAccessToken, { 'EX': 3600 }); // 1 hour
    if (DeviceToken) {
        console.log(DeviceToken);
        await redisClient.set(`DeviceToken:${userId}:${source}`, DeviceToken, { 'EX': 2592000 });
    } // 30 days
    await redisClient.set(`refreshToken:${userId}:${source}`, newRefreshToken, { 'EX': 2592000 }); // 30 days
    return { newAccessToken, newRefreshToken };
};
export const verifyTokens = async (source, accessToken, refreshToken) => {
    try {
        // verify access token
        let accessResult = await verifyAccessToken(accessToken, source)
        if (accessResult.success && accessResult.message === "Valid Access Token") {
            console.log("access token verified");
            return { success: true, message: accessResult.message, decoded: accessResult.decoded, accessToken: null, refreshToken: null };
        }
        if (!accessResult.success && accessResult.message !== "jwt expired") {
            console.log("access token failed, but not expired");
            return { success: false, message: accessResult.message, decoded: null, accessToken: null, refreshToken: null };
        }
        // verify refresh token when access token expired
        const refreshResult = await verifyRefreshToken(refreshToken, source)
        if (refreshResult.success && refreshResult.message === "Valid Refresh Token") {
            console.log("refresh token verified");
            return { success: true, message: refreshResult.message, decoded: refreshResult.decoded, accessToken: refreshResult.newAccessToken, refreshToken: refreshResult.newRefreshToken };
        }
        return { success: false, message: refreshResult.message, decoded: null, accessToken: null, refreshToken: null }
    } catch (error) {
        console.log(error);
        return { success: false, message: 'Error verifying tokens' };
    }
}
export const verifyRefreshToken = async (refreshToken, source) => {
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const storedRefreshToken = await redisClient.get(`refreshToken:${decoded.id}:${source}`);
        if (storedRefreshToken !== refreshToken) return { success: false, message: 'Invalid Refresh Token', decoded: null };
        const { newAccessToken, newRefreshToken } = await generateTokens(decoded.id, source);
        return { success: true, message: "Valid Refresh Token", decoded, newAccessToken, newRefreshToken };
    } catch (error) {
        return { success: false, message: error.message, decoded: null };
    }
};
export const verifyAccessToken = async (accessToken, source) => {
    try {
        let decoded
        try {
            decoded = jwt.verify(accessToken, ACCESS_SECRET);
        }
        catch (error) {
            console.log(error);
        }
        let storedAccessToken
        try {
            storedAccessToken = await redisClient.get(`accessToken:${decoded.id}:${source}`);
        } catch (error) {
            console.log(error);
        }
        if (storedAccessToken !== accessToken) return { success: false, message: 'Invalid Access Token', decoded: null };
        return { success: true, message: "Valid Access Token", decoded };
    } catch (error) {
        return { success: false, message: error.message, decoded: null }
    }
}
export const deleteTokens = async (userId, source) => {
    try {
        if (!source) {
            // Delete all tokens for the user if source is not provided
            const keys = await redisClient.keys(`*:${userId}:*`);
            // Delete all matching access tokens
            for (const key of keys) {
                await redisClient.del(key);
            }
        } else {
            // Delete specific access and refresh tokens for the given source
            console.log("source exists");
            console.log("tokens before deletion: ", {
                [`accessToken:${userId}:${source}`]: `${await redisClient.get(`accessToken:${userId}:${source}`)}`,
                [`refreshToken:${userId}:${source}`]: `${await redisClient.get(`accessToken:${userId}:${source}`)}`,
                [`DeviceToken:${userId}:${source}`]: `${await redisClient.get(`DeviceToken:${userId}:${source}`)}`,
            });
            await Promise.all([
                redisClient.del(`accessToken:${userId}:${source}`),
                redisClient.del(`refreshToken:${userId}:${source}`),
                redisClient.del(`DeviceToken:${userId}:${source}`)
            ])
            console.log("tokens after deletion: ", {
                [`accessToken:${userId}:${source}`]: `${await redisClient.get(`accessToken:${userId}:${source}`)}`,
                [`refreshToken:${userId}:${source}`]: `${await redisClient.get(`accessToken:${userId}:${source}`)}`,
                [`DeviceToken:${userId}:${source}`]: `${await redisClient.get(`DeviceToken:${userId}:${source}`)}`,
            });
        }
    } catch (error) {
        console.error('Error deleting tokens:', error);
        throw error;
    }
};
export const storeNewToken = async (name, newAccessToken) => {
    try {
        await redisClient.set(`${name}`, newAccessToken, { 'EX': 3600 }); // 1 hour
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
}
export const fetchToken = async (name) => {
    try {
        return await redisClient.get(name) || null
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
}