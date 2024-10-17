import chatModel from "../../models/Chat.js";
import messageModel from "../../models/Message.js";
import Document from "../../models/Uploads.js";
import userModel from "../../models/User.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { uploadFileToWorkDrive } from "../../utils/CRMintegrations.js";
import Joi from "joi";

export const postMessages = errorWrapper(async (req, res, next, session) => {

    const { error, value } = Joi.object({ chatId: Joi.string().required(), content: Joi.string().allow(""), repliedTo: Joi.string().allow(""), fileIdentifier: Joi.string().allow("") }).validate(req.body)
    if (error) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, message: error.details[0].message, data: [value] };
    }
    const { content, chatId, repliedTo, fileIdentifier } = value
    if (!content && !req.file) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, data: null, message: `incomplete content or attachment` };
    }
    const user = await userModel.findById(req.decoded.id)
    const chat = await chatModel.findById(chatId)
    if (!chat) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, data: null, message: `invalid chatID` };
    }
    if (!chat.participants.includes(req.decoded.id)) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, data: null, message: `invalid sender` };
    }
    let message = await messageModel.create({ sender: user._id, content: content, chat: chatId })
    if (req.file) {
        const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier, folder_ID: req.user.docData.folder })
        if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
        if (uploadedFileResponse.data.new) {
            const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
            const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Chat", viewers: [] };
            const newDoc = await Document.create(docDetails);
            message.document = newDoc._id
        }
    }
    if (repliedTo) message.repliedTo = repliedTo
    await message.save()
    message.content = content
    if (message.repliedTo) await messageModel.populate(message, { path: "repliedTo", select: "-chat" })
    await userModel.populate(message, { path: "sender", select: "firstName lastName displayPicSrc email userType role" })
    await Document.populate(message, { path: "document", select: "data" })
    chat.lastMessage = message._id
    chat.unSeenMessages.push({ message: message._id, seen: [req.decoded.id] })
    await chat.save()
    await chat.populate("participants", "firstName lastName displayPicSrc email userType role")
    await chat.populate({ path: "unSeenMessages.message", populate: { path: "sender", select: "firstName lastName displayPicSrc email userType role" } })
    await chat.populate("lastMessage")
    return ({ statusCode: 200, message: `messages`, data: {message, chat } })
})
export const fetchMessages = errorWrapper(async (req, res, next, session) => {
    const { chatId } = req.params
    const { page = 1, pageSize = 20 } = req.query;
    const chat = await chatModel.findById(chatId)
    if (!chat) return { statusCode: 400, data: null, message: `invalid chat id` };
    const messagesCount = await messageModel.countDocuments({ chat: chatId });
    const totalPages = Math.ceil(messagesCount / pageSize);
    const messages = await messageModel
        .find({ chat: chatId })
        .populate("sender", "firstName lastName displayPicSrc email userType role")
        .populate("document", "data")
        .populate("repliedTo", "-chat")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(+pageSize);
    return ({ statusCode: 200, message: `messages`, data: messages, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize } })
})
export const downloadSharedDocument = errorWrapper(async (req, res, next, session) => {
    const { id } = req.params
    const document = await Document.findById(id)
    if (!document) return { statusCode: 400, data: null, message: `invalid Document Id` };
    // if (!document.viewers.includes(req.decoded.id) && document.user.toString != req.decode.id) return { statusCode: 400, data: student , message:    `access denied`};
    return res.contentType(document.contentType).send(document.data);
})
export const seeMessages = errorWrapper(async (req, res, next, session) => {
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
    return ({ statusCode: 200, message: `seen successfully`, data: chat })
})
