import chatModel from "../../models/Chat.js";
import messageModel from "../../models/Message.js";
import Document from "../../models/Uploads.js";
import userModel from "../../models/User.js";
import fs from "fs"
import { decrypt, encrypt } from "../../utils/crypto.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";

export const postMessages = errorWrapper(async (req, res, next) => {
    const { content, chatId, repliedTo } = req.body
    if (!chatId) return { statusCode: 400, data: null, message: `incomplete chatID` };
    if (!content && !req.file) return {
        statusCode: 400, data: null, message: `incomplete content or attachment`
    };
    const user = await userModel.findById(req.decoded.id)
    const chat = await chatModel.findById(chatId)
    if (!chat) return {
        statusCode: 400, data: null, message: `invalid chatID`
    };
    if (!chat.participants.includes(req.decoded.id)) return {
        statusCode: 400, data: null, message: `invalid sender`
    };
    const { encryptedData, key } = encrypt(content)
    let message = await messageModel.create({ sender: user._id, content: encryptedData, iv: key, chat: chatId })
    if (req.file) {
        const { originalname, path, mimetype } = req.file;
        const data = fs.readFileSync(path);
        const newDoc = await Document.create({ name: originalname, data: data, contentType: mimetype, viewers: chat.participants, user: req.decoded.id });
        message.document = newDoc._id
        fs.unlinkSync(path);
    }
    if (repliedTo) message.repliedTo = repliedTo
    await message.save()
    message.content = content
    if (message.repliedTo) {
        await messageModel.populate(message, { path: "repliedTo", select: "-chat" })
        message.repliedTo.decoded = decrypt(message.repliedTo.iv, message.repliedTo.content);
    }
    await userModel.populate(message, { path: "sender", select: "firstName lastName displayPicSrc email userType role" })
    await Document.populate(message, { path: "document", select: "name contentType createdAt" })
    chat.lastMessage = message._id
    chat.unSeenMessages.push({ message: message._id, seen: [req.decoded.id] })
    await chat.save()
    await chat.populate("participants", "firstName lastName displayPicSrc email userType role")
    await chat.populate({ path: "unSeenMessages.message", populate: { path: "sender", select: "firstName lastName displayPicSrc email userType role" } })
    await chat.populate("lastMessage")
    chat.unSeenMessages.forEach(ele => { ele.message.content = decrypt(ele.message.iv, ele.message.content); });
    if (chat.lastMessage) chat.lastMessage.content = decrypt(chat.lastMessage.iv, chat.lastMessage.content)
    return ({ statusCode: 200, message: `messages`, data: { message: message, chat } })
})
export const fetchMessages = errorWrapper(async (req, res, next) => {
    const { chatId } = req.params
    const { page = 1, pageSize = 20 } = req.query;
    const chat = await chatModel.findById(chatId)
    if (!chat) return { statusCode: 400, data: null, message: `invalid chat id` };
    const messagesCount = await messageModel.countDocuments({ chat: chatId });
    const totalPages = Math.ceil(messagesCount / pageSize);
    const messages = await messageModel
        .find({ chat: chatId })
        .populate("sender", "firstName lastName displayPicSrc email userType role")
        .populate("document", "firstName lastName contentType createdAt")
        .populate("repliedTo", "-chat")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(+pageSize);
    const decryptedMessages = messages.map(message => {
        const decryptedMessage = { ...message.toObject(), content: decrypt(message.iv, message.content) };
        if (decryptedMessage.repliedTo) decryptedMessage.repliedTo.decoded = decrypt(message.repliedTo.iv, message.repliedTo.content);
        return decryptedMessage;
    });
    return ({ statusCode: 200, message: `messages`, data: decryptedMessages, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize } })
})
export const downloadSharedDocument = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    const document = await Document.findById(id)
    if (!document) return { statusCode: 400, data: null, message: `invalid Document Id` };
    // if (!document.viewers.includes(req.decoded.id) && document.user.toString != req.decode.id) return { statusCode: 400, data: student , message:    `access denied`};
    return res.contentType(document.contentType).send(document.data);
})
export const seeMessages = errorWrapper(async (req, res, next) => {
    const { chatId } = req.params
    const chat = await chatModel.findById(chatId).populate("unSeenMessages")
    if (!chat) return { statusCode: 400, data: null, message: `invalid chat id` };
    if (!chat.participants.includes(req.decoded.id)) return {
        statusCode: 400, data: null, message: `invalid access to private chats`
    };
    let newUnSeenMessages = []
    chat.unSeenMessages.forEach(ele => {
        if (!ele.seen.includes(req.decoded.id.toString())) ele.seen.push(req.decoded.id.toString())
        if (ele.seen.length < chat.participants.length) newUnSeenMessages.push(ele)
    })
    chat.unSeenMessages = newUnSeenMessages
    await chat.save()
    await userModel.populate(chat, [{ path: "participants", select: "firstName lastName displayPicSrc" }, { path: "admins", select: "firstName lastName displayPicSrc" },])
    await messageModel.populate(chat, [{ path: "unSeenMessages.message", }, { path: "lastMessage" }])
    if (chat.unSeenMessages) chat.unSeenMessages.forEach(ele => ele.message.content = decrypt(ele.message.iv, ele.message.content));
    if (chat.lastMessage) chat.lastMessage.content = decrypt(chat.lastMessage.iv, chat.lastMessage.content);
    return ({ statusCode: 200, message: `seen successfully`, data: chat })
})
