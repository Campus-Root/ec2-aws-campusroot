import userModel from "../models/User.js";
import { TeamRoleEnum } from "../utils/enum.js";
import { cookieOptions } from "../index.js";
import { verifyTokens } from "../utils/redisTokens.js";
export const authMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization) return res.status(401).json({ success: false, message: 'Access Token Missing', data: null });
        const token = req.headers.authorization.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: 'Access Token Missing', data: null });
        const source = req.headers['user-agent']; // Use device token or user-agent string as the identifier
        const { success, message, decoded, accessToken, refreshToken } = await verifyTokens(source, token, req.cookies.CampusRoot_Refresh)
        if (!success) return res.status(401).json({ success: false, message: 'Token Verification Failed', data: message });
        let user = await userModel.findOne({ _id: decoded.id }).select("-password -failedLoginAttempts -nextLoginTime -socialAuth");
        if (!user) return res.status(401).json({ success: false, message: `Invalid Tokens`, data: null });
        req.decoded = decoded;
        req.user = user;
        if (accessToken && refreshToken) {
            res.cookie("CampusRoot_Refresh", refreshToken, cookieOptions);
            req.AccessToken = accessToken;
        }
        return next();
    } catch (error) {
     return res.status(500).json({ success: false, message: 'Internal server error', data: null });
    }
}
export const isTeam = (req, res, next) => {
    if (req.user.userType === "member") return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}
export const isAdmin = (req, res, next) => {
    if (req.user.role === TeamRoleEnum.ADMIN) return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}
export const isStudent = (req, res, next) => {
    if (req.user.userType === "student") return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}
export const isProcessCoordinator = (req, res, next) => {
    if (req.user.role === TeamRoleEnum.TEAM) return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}
export const isDeveloper = (req, res, next) => {
    if (req.user.role === TeamRoleEnum.DEVELOPER) return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}
export const isCounsellor = (req, res, next) => {
    if (req.user.role === TeamRoleEnum.COUNSELLOR) return next();
    return res.status(401).json({ success: false, message: 'Unauthorized entry', data: null });
}