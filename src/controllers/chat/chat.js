import chatModel from "../../models/Chat.js"
import userModel from "../../models/User.js"
import { errorWrapper } from "../../middleware/errorWrapper.js";


export const postChat = errorWrapper(async (req, res, next, session) => {
    const { friendId } = req.params;
    const friend = await userModel.findById(friendId);
    if (!friend) return { statusCode: 400, data: null, message: `Invalid friendId` };
    let isChat = await chatModel
        .findOne({ chatName: null, participants: { $all: [req.decoded.id, friendId] } })
        .populate("participants", "firstName lastName displayPicSrc email userType role")
        .populate("unSeenMessages.message")
        .populate("lastMessage");
    if (isChat) return ({ statusCode: 200, message: `chat retrieved`, data: isChat });
    else {
        const createdChat = await chatModel.create({ participants: [req.decoded.id, friendId] });
        const FullChat = await createdChat.populate("participants", "firstName lastName displayPicSrc email userType role");
        const user = await userModel.findById(req.decoded.id)
        user.logs.push({
            action: "new chat initiated",
            details: `chatId:${createdChat._id}&friendId:${friendId}`
        })
        await user.save()
        return ({ statusCode: 200, message: `new chat initiated`, data: FullChat });
    }
});
export const fetchChats = errorWrapper(async (req, res, next, session) => {
    let result = await chatModel
        .find({ "participants": { $eq: req.decoded.id } })
        .populate("participants", "firstName lastName displayPicSrc email userType role")
        .populate("unSeenMessages.message")
        .populate("lastMessage")
        .sort({ updatedAt: -1 })
        .lean();
    result = await userModel.populate(result, [
        { path: "unSeenMessages.message.sender", select: "firstName lastName displayPicSrc email userType role" },
        { path: "admins", select: "firstName lastName displayPicSrc email userType role" },
    ])
    return ({ statusCode: 200, message: `all chats`, data: result })
})
export const newGroup = errorWrapper(async (req, res, next, session) => {
    const { participants, chatName, settings, displayPicSrc } = req.body
    if (!chatName) return { statusCode: 400, data: null, message: `Chat name is required` };
    if (participants.length < 3) return {
        statusCode: 400, data: null, message: `Minimum 3 members are required for a group chat`
    };
    const groupChat = await chatModel.create({ chatName, participants, admins: [req.decoded.id] })
    if (settings) groupChat.settings = settings
    if (displayPicSrc) groupChat.displayPicSrc = displayPicSrc
    const FullChat = await userModel.populate(groupChat,
        [{ path: "participants", select: "firstName lastName displayPicSrc email userType role" },
        { path: "admins", select: "firstName lastName displayPicSrc email userType role" }])
    await groupChat.save()
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: "new group chat created",
        details: `chatId:${groupChat._id}&participants:${participants}`
    })
    await user.save()
    return ({ statusCode: 200, message: `new Group created`, data: FullChat })

})
export const editMembers = errorWrapper(async (req, res, next, session) => {
    const { chatId, action, userId } = req.body
    const chat = await chatModel.findById(chatId)
    if (!chat) return { statusCode: 400, data: null, message: `Invalid chatId` };
    if (!chat.admins.includes(req.decoded.id)) return {
        statusCode: 400, data: null, message: `Invalid access, only admin can ${action}`
    };
    const main = await userModel.findById(req.decoded.id)
    const user = await userModel.findById(userId)
    if (!user) return {
        statusCode: 400, data: null, message: `Invalid userId`
    };
    switch (action) {
        case "addMember":
            chat.participants.push(userId)
            await chat.save()
            main.logs.push({
                action: "added new member to the group",
                details: `chatId:${chatId}&member:${userId}`
            })
            await main.save()
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        case "addAdmin":
            if (!chat.participants.includes(userId)) return { statusCode: 400, data: null, message: `user isn't a member` };
            chat.admins.push(userId)
            main.logs.push({
                action: "added new admin to the group",
                details: `chatId:${chatId}&admin:${userId}`
            })
            await main.save()
            await chat.save()
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        case "removeAdmin":
            if (!chat.admins.includes(userId)) return {
                statusCode: 400, data: null, message: `user isn't an admin`
            };
            await chat.updateOne({ $pull: { admins: userId } });
            main.logs.push({
                action: "removed an admin from the group",
                details: `chatId:${chatId}&member:${userId}`
            })
            await main.save()
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        case "removeMember":
            if (chat.admins.includes(userId)) await chat.updateOne({ $pull: { admins: userId } });
            if (chat.participants.includes(userId)) await chat.updateOne({ $pull: { admins: userId } });
            main.logs.push({
                action: "removed a member from the group",
                details: `chatId:${chatId}& member:${userId} `
            })
            await main.save()
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        default: return { statusCode: 400, data: null, message: `Invalid Action` };
    }

})
export const exitGroup = errorWrapper(async (req, res, next, session) => {
    const { chatId } = req.params
    const chat = await chatModel.findById(chatId)
    if (!chat) return { statusCode: 400, data: null, message: `Invalid chatId` };
    if (!chat.participants.includes(req.decoded.id)) return { statusCode: 400, data: null, message: `already not a participant` };
    if (chat.admins.includes(req.decoded.id)) await chat.updateOne({ $pull: { admins: req.decoded.id } });
    if (chat.participants.includes(req.decoded.id)) await chat.updateOne({ $pull: { admins: req.decoded.id } });
    const main = await userModel.findById(req.decoded.id)
    main.logs.push({
        action: "left the group",
        details: `chatId:${chatId} `
    })
    await main.save()
    return ({ statusCode: 200, message: `exited from group successful`, data: null })
})
export const search = errorWrapper(async (req, res, next, session) => {
    if (!req.query.search) return { statusCode: 400, data: null, message: `blank search` };
    const searchResults = await userModel.find({ $or: [{ firstName: { $regex: req.query.search, $options: "i" } }, { lastName: { $regex: req.query.search, $options: "i" } }] }, "firstName lastName displayPicSrc email userType").find({ _id: { $ne: req.decoded.id } })
    return ({ statusCode: 200, message: `uname`, data: searchResults })
})
