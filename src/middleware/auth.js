import jwt from "jsonwebtoken";
import 'dotenv/config';
import userModel from "../models/User.js";
import { TeamRoleEnum } from "../utils/enum.js";
import { cookieOptions } from "../index.js";
const REFRESH_SECRET = process.env.REFRESH_SECRET
const ACCESS_SECRET = process.env.ACCESS_SECRET
export const authMiddleware = async (req, res, next) => {
    try {
        if (!req.headers.authorization) return res.status(401).json({ success: false, message: 'No token provided', data: null });
        const token = req.headers.authorization.split(" ")[1];
        if (!token) return res.status(401).json({ success: false, message: 'Token missing', data: null });
        try {
            const decoded = jwt.verify(token, ACCESS_SECRET);
            req.decoded = decoded;
            let user = await userModel.findOne({ _id: decoded.id, "tokens.AccessToken": token }).select("-password -failedLoginAttempts -nextLoginTime -socialAuth -tokens")
            if (!user) return res.status(401).json({ success: false, message: `login again`, data: null });
            req.user = user
            return next();
        } catch (error) {
            if (error.message !== "jwt expired") return res.status(401).json({ success: false, message: error.message, data: null });
        }
        const refreshToken = req.cookies.CampusRoot_Refresh;
        if (!refreshToken) return res.status(401).json({ success: false, message: 'login again', data: null });
        try {
            let decodedNew = jwt.verify(refreshToken, REFRESH_SECRET);
            req.decoded = decodedNew
            let user = await userModel.findOne({ _id: decodedNew.id, "tokens.RefreshToken": refreshToken }).select("tokens")
            if (!user) return res.status(401).json({ success: false, message: `login again`, data: null });
            let token = user.tokens.find(token => token.RefreshToken === refreshToken);
            if (!token || token.source !== req.headers['user-agent']) return res.status(401).json({ success: false, message: `login again`, data: null });
            let AccessToken = jwt.sign({ id: decodedNew.id }, ACCESS_SECRET, { expiresIn: "1h" })
            let RefreshToken = jwt.sign({ id: decodedNew.id }, REFRESH_SECRET, { expiresIn: "30d" })
            res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions)
            req.AccessToken = AccessToken
            token.AccessToken = AccessToken;
            token.RefreshToken = RefreshToken;
            await user.save()
            req.user = await userModel.findOne({ _id: decodedNew.id}).select("-password -failedLoginAttempts -nextLoginTime -socialAuth -tokens")
            return next();
        } catch (error) {
            return res.status(401).json({ success: false, message: `login again`, data: null });
        }
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