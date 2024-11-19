import { errorWrapper } from "../../middleware/errorWrapper.js";
// import { openai } from "../../utils/dbConnection.js";
import { searchAssistant } from "../../utils/openAiEmbedding.js";
import chatModel from "../../models/Chat.js"
import userModel from "../../models/User.js"
import messageModel from "../../models/Message.js";
export const assistantReply = errorWrapper(async (req, res, next, session) => {
    const { content, chatId } = req.body;
    // const response= await openai.chat.completions.create({
    //     model: "gpt-3.5-turbo",
    //     messages: [{
    //         role: "system",
    //         content: `You are an educational consultant.
    //                 answer the following questions concisely:  "${content}"`
    //     }],
    // });
    const chat = await chatModel.findById(chatId)
    // let messages = await messageModel.find({ chatId: chatId }).limit(5).sort({ createdAt: -1 });
    let reply = await searchAssistant(content)
    let message = await messageModel.create({ sender: "6737304feb3f12f7ec92ec41", content: reply, chat: chatId })
    chat.lastMessage = message._id
    chat.unSeenMessages.push({ message: message._id, seen: ["6737304feb3f12f7ec92ec41"] })
    await chat.save()
    await userModel.populate(message, { path: "sender", select: "firstName lastName displayPicSrc email userType role" })
    await messageModel.populate(chat, [
        { path: "lastMessage" },
        { path: "unSeenMessages.message", populate: { path: "sender", select: "firstName lastName displayPicSrc email userType role" } },
    ])
    await userModel.populate(chat, [
        { path: "participants", select: "firstName lastName displayPicSrc email userType role" },
    ])
    return ({ statusCode: 200, message: `reply from virtual assistant`, data: { message, chat } })
})
