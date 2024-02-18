import chatModel from "../../models/Chat.js"
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js"
import { decrypt } from "../../utils/crypto.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";


export const postChat = errorWrapper(async (req, res, next) => {
    const { friendId } = req.params;
    const friend = await userModel.findById(friendId);
    if (!friend) return next(generateAPIError(`Invalid friendId`, 400));
    let isChat = await chatModel
        .findOne({ chatName: null, participants: { $all: [req.decoded.id, friendId] } })
        .populate("participants", "name displayPicSrc email userType role")
        .populate("unSeenMessages.message")
        .populate("lastMessage");
    if (isChat) {
        isChat.unSeenMessages?.forEach(ele => ele.message.content = decrypt(ele.message.iv, ele.message.content));
        if (isChat.lastMessage) {
            isChat.lastMessage.content = decrypt(isChat.lastMessage.iv, isChat.lastMessage.content);
        }
        return res.status(200).json({ success: true, message: `chat retrieved`, data: isChat, AccessToken: req.AccessToken ? req.AccessToken : null });
    }
    else {
        const createdChat = await chatModel.create({ participants: [req.decoded.id, friendId] });
        const FullChat = await createdChat.populate("participants", "name displayPicSrc email userType role");
        const user = await userModel.findById(req.decoded.id)
        user.logs.push({
            action: "new chat initiated",
            details: `chatId:${createdChat._id}&friendId:${friendId}`
        })
        await user.save()
        return res.status(200).json({ success: true, message: `new chat initiated`, data: FullChat, AccessToken: req.AccessToken ? req.AccessToken : null });
    }
});
export const fetchChats = errorWrapper(async (req, res, next) => {
    let result = await chatModel
        .find({ "participants": { $eq: req.decoded.id } })
        .populate("participants", "name displayPicSrc email userType role")
        .populate("unSeenMessages.message")
        .populate("lastMessage")
        .sort({ updatedAt: -1 })
        .lean();
    result = await userModel.populate(result, [
        { path: "unSeenMessages.message.sender", select: "name displayPicSrc email userType role" },
        { path: "admins", select: "name displayPicSrc email userType role" },
    ])
    for (const { unSeenMessages, lastMessage } of result) {
        unSeenMessages.forEach(ele => { ele.message.content = decrypt(ele.message.iv, ele.message.content); });
        if (lastMessage) lastMessage.content = decrypt(lastMessage.iv, lastMessage.content)
    }
    return res.status(200).json({ success: true, message: `all chats`, data: result, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const newGroup = errorWrapper(async (req, res, next) => {
    const { participants, chatName, settings, displayPicSrc } = req.body
    if (!chatName) return next(generateAPIError(`Chat name is required`, 400));
    if (participants.length < 3) return next(generateAPIError(`Minimum 3 members are required for a group chat`, 400));
    const groupChat = await chatModel.create({ chatName, participants, admins: [req.decoded.id] })
    if (settings) groupChat.settings = settings
    if (displayPicSrc) groupChat.displayPicSrc = displayPicSrc
    const FullChat = await userModel.populate(groupChat,
        [{ path: "participants", select: "name displayPicSrc email userType role" },
        { path: "admins", select: "name displayPicSrc email userType role" }])
    await groupChat.save()
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: "new group chat created",
        details: `chatId:${groupChat._id}&participants:${participants}`
    })
    await user.save()
    return res.status(200).json({ success: true, message: `new Group created`, data: FullChat, AccessToken: req.AccessToken ? req.AccessToken : null })

})
export const editMembers = errorWrapper(async (req, res, next) => {
    const { chatId, action, userId } = req.body
    const chat = await chatModel.findById(chatId)
    if (!chat) return next(generateAPIError(`Invalid chatId`, 401));
    if (!chat.admins.includes(req.decoded.id)) return next(generateAPIError(`Invalid access, only admin can ${action}`, 401));
    const main = await userModel.findById(req.decoded.id)
    const user = await userModel.findById(userId)
    if (!user) return next(generateAPIError(`Invalid userId`, 401));
    switch (action) {
        case "addMember":
            chat.participants.push(userId)
            await chat.save()
            main.logs.push({
                action: "added new member to the group",
                details: `chatId:${chatId}&member:${userId}`
            })
            await main.save()
            return res.status(200).json({ success: true, message: `${action} successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "addAdmin":
            if (!chat.participants.includes(userId)) return next(generateAPIError(`user isn't a member`, 400));
            chat.admins.push(userId)
            main.logs.push({
                action: "added new admin to the group",
                details: `chatId:${chatId}&admin:${userId}`
            })
            await main.save()
            await chat.save()
            return res.status(200).json({ success: true, message: `${action} successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "removeAdmin":
            if (!chat.admins.includes(userId)) return next(generateAPIError(`user isn't an admin`, 400));
            await chat.updateOne({ $pull: { admins: userId } });
            main.logs.push({
                action: "removed an admin from the group",
                details: `chatId:${chatId}&member:${userId}`
            })
            await main.save()
            return res.status(200).json({ success: true, message: `${action} successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "removeMember":
            if (chat.admins.includes(userId)) await chat.updateOne({ $pull: { admins: userId } });
            if (chat.participants.includes(userId)) await chat.updateOne({ $pull: { admins: userId } });
            main.logs.push({
                action: "removed a member from the group",
                details: `chatId:${chatId}&member:${userId}`
            })
            await main.save()
            return res.status(200).json({ success: true, message: `${action} successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
        default: return next(generateAPIError(`Invalid Action`, 400));
    }

})
export const exitGroup = errorWrapper(async (req, res, next) => {
    const { chatId } = req.params
    const chat = await chatModel.findById(chatId)
    if (!chat) return next(generateAPIError(`Invalid chatId`, 401));
    if (!chat.participants.includes(req.decoded.id)) return next(generateAPIError(`already not a participant`, 400));
    if (chat.admins.includes(req.decoded.id)) await chat.updateOne({ $pull: { admins: req.decoded.id } });
    if (chat.participants.includes(req.decoded.id)) await chat.updateOne({ $pull: { admins: req.decoded.id } });
    const main = await userModel.findById(req.decoded.id)
    main.logs.push({
        action: "left the group",
        details: `chatId:${chatId}`
    })
    await main.save()
    return res.status(200).json({ success: true, message: `exited from group successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const search = errorWrapper(async (req, res, next) => {
    if (!req.query.search) return next(generateAPIError(`blank search`, 400));
    const searchResults = await userModel.find({ name: { $regex: req.query.search, $options: "i" } }, "name displayPicSrc email userType").find({ _id: { $ne: req.decoded.id } })
    return res.status(200).json({ success: true, message: `uname`, data: searchResults, AccessToken: req.AccessToken ? req.AccessToken : null })
})
