import jwt from "jsonwebtoken";
import 'dotenv/config';
import userModel from "../models/User.js";
import { TeamRoleEnum } from "../utils/enum.js";
import { cookieOptions } from "../index.js";
const REFRESH_SECRET = process.env.REFRESH_SECRET
const ACCESS_SECRET = process.env.ACCESS_SECRET

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        let decoded = jwt.verify(token, ACCESS_SECRET);
        req.decoded = decoded;
        next();
    } catch (error) {
        if (error.message != "jwt expired") return res.status(401).json({ success: false, message: `${error.message}`, data: null });
        if (!req.cookies.CampusRoot_Refresh) return res.status(401).json({ success: false, message: `login again`, data: null });
        try {
            let decodedNew = jwt.verify(req.cookies.CampusRoot_Refresh, REFRESH_SECRET);
            let AccessToken = jwt.sign({ id: decodedNew.id }, ACCESS_SECRET, { expiresIn: "1h" })
            let RefreshToken = jwt.sign({ id: decodedNew.id }, REFRESH_SECRET, { expiresIn: "1y" })
            res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions)
            req.AccessToken = AccessToken
            req.decoded = decodedNew
            return next();
        } catch (err) {
            return res.status(401).json({ success: false, message: `login again`, data: null });
        }
    }
}
export const isTeam = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -failedLoginAttempts -nextLoginTime");
        if (user.userType === "member") { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeAdmin insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -failedLoginAttempts -nextLoginTime");
        if (user.role === TeamRoleEnum.ADMIN) { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeAdmin insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}
export const isStudent = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -google -failedLoginAttempts -nextLoginTime"); // redundant exists
        if (user.userType === "student") { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeStudent insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}
export const isProcessCoordinator = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -google -failedLoginAttempts -nextLoginTime");
        if (user.role === TeamRoleEnum.TEAM) { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeAdmin insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}
export const isDeveloper = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -failedLoginAttempts -nextLoginTime");
        if (user.role === TeamRoleEnum.DEVELOPER) { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeAdmin insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}
export const isCounsellor = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.decoded.id).select("-password -google -failedLoginAttempts -nextLoginTime");
        if (user.role === TeamRoleEnum.COUNSELLOR) { req.user = user; next(); }
        else throw (500)
    } catch (error) {
        console.log("error at authorizeAdmin insufficient rights ");
        return res.status(401).json({ success: false, message: 'Unauthorised entry', data: null });
    }
}