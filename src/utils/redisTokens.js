import jwt from "jsonwebtoken";
import 'dotenv/config';
import { getRedisClient } from "./dbConnection.js";
const redisClient = await getRedisClient();
const { ACCESS_SECRET, REFRESH_SECRET } = process.env
export const generateTokens = async (userId, source, DeviceToken) => {
    const newAccessToken = jwt.sign({ id: userId }, ACCESS_SECRET, { expiresIn: '30d' });
    const newRefreshToken = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: '30d' });
    await redisClient.set(`accessToken:${userId}:${source}`, newAccessToken, { 'EX': 2592000 }); // 1 hour
    if (DeviceToken) {
        console.log(DeviceToken);
        await redisClient.set(`DeviceToken:${userId}:${source}`, DeviceToken, { 'EX': 2592000 });
    } // 30 days
    await redisClient.set(`refreshToken:${userId}:${source}`, newRefreshToken, { 'EX': 2592000 }); // 30 days
    return { newAccessToken, newRefreshToken };
};
export const verifyTokens = async (source, accessToken, refreshToken) => {
    try {
        // Verify access token first if it exists
        if (accessToken) {
            const accessResult = await verifyAccessToken(accessToken, source);
            if (accessResult.success) return { success: true, message: accessResult.message, decoded: accessResult.decoded, accessToken: null, refreshToken: null };
            // Only attempt refresh if access token is expired and refresh token exists
            if (accessResult.message === "jwt expired" && refreshToken) return await handleRefreshToken(refreshToken, source);
            // Access token invalid for reasons other than expiration
            return { success: false, message: accessResult.message || 'Invalid Access Token', decoded: null, accessToken: null, refreshToken: null };
        }
        // Handle case where only refresh token is provided
        if (refreshToken) return await handleRefreshToken(refreshToken, source);
        // No tokens provided
        return { success: false, message: 'No authentication tokens provided', decoded: null, accessToken: null, refreshToken: null };
    } catch (error) {
        console.error('Token verification error:', error);
        return { success: false, message: 'Error verifying tokens', decoded: null, accessToken: null, refreshToken: null };
    }
};
const handleRefreshToken = async (refreshToken, source) => {
    const refreshResult = await verifyRefreshToken(refreshToken, source);
    if (refreshResult.success) return { success: true, message: refreshResult.message, decoded: refreshResult.decoded, accessToken: refreshResult.newAccessToken, refreshToken: refreshResult.newRefreshToken };
    return { success: false, message: refreshResult.message || 'Invalid Refresh Token', decoded: null, accessToken: null, refreshToken: null };
};
export const verifyRefreshToken = async (refreshToken, source) => {
    if (!refreshToken) return { success: false, message: 'No refresh token provided', decoded: null };
    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        if (!decoded || !decoded.id) return { success: false, message: 'Invalid refresh token payload', decoded: null };
        const tokenKey = `refreshToken:${decoded.id}:${source}`;
        const storedRefreshToken = await redisClient.get(tokenKey);
        if (!storedRefreshToken || storedRefreshToken !== refreshToken) return { success: false, message: 'Invalid or revoked refresh token', decoded: null };
        // Generate new tokens
        const { newAccessToken, newRefreshToken } = await generateTokens(decoded.id, source);
        return { success: true, message: "Valid Refresh Token", decoded, newAccessToken, newRefreshToken };
    } catch (error) {
        const message = error.name === 'JsonWebTokenError' ? 'Invalid refresh token' : error.name === 'TokenExpiredError' ? 'Refresh token expired' : error.message;
        return { success: false, message, decoded: null };
    }
};
export const verifyAccessToken = async (accessToken, source) => {
    if (!accessToken) return { success: false, message: 'No access token provided', decoded: null };
    try {
        const decoded = jwt.verify(accessToken, ACCESS_SECRET);
        if (!decoded || !decoded.id) return { success: false, message: 'Invalid access token payload', decoded: null };
        const tokenKey = `accessToken:${decoded.id}:${source}`;
        const storedAccessToken = await redisClient.get(tokenKey);
        if (!storedAccessToken || storedAccessToken !== accessToken) return { success: false, message: 'Invalid or revoked access token', decoded: null };
        return { success: true, message: "Valid Access Token", decoded };
    } catch (error) {
        const message = error.name === 'JsonWebTokenError' ? 'Invalid access token' : error.name === 'TokenExpiredError' ? 'jwt expired' : error.message;
        return { success: false, message, decoded: null };
    }
};
export const deleteTokens = async (userId, source) => {
    try {
        if (!source) {
            const keys = await redisClient.keys(`*:${userId}:*`);
            for (const key of keys) await redisClient.del(key);
        } else {
            await Promise.all([
                redisClient.del(`accessToken:${userId}:${source}`),
                redisClient.del(`refreshToken:${userId}:${source}`),
                redisClient.del(`DeviceToken:${userId}:${source}`)
            ])
        }
    } catch (error) {
        console.error('Error deleting tokens:', error);
        throw error;
    }
};
export const storeNewToken = async (name, newAccessToken) => {
    try {
        console.log({name, newAccessToken});
        await redisClient.set(`${name}`, newAccessToken, { 'EX': 3660 }); // 1 hour
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
}
export const fetchToken = async (name) => {
    try {
        return await redisClient.get(name) || null
    } catch (error) {
        console.error('Error getting token:', error);
        throw error;
    }
}