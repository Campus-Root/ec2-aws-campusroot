import { errorWrapper } from "../../middleware/errorWrapper.js";
// import { openai } from "../../utils/dbConnection.js";
import { searchAssistant } from "../../utils/openAiEmbedding.js";

export const assistantReply = errorWrapper(async (req, res, next, session) => {
    const { content } = req.body;

    // const response= await openai.chat.completions.create({
    //     model: "gpt-3.5-turbo",
    //     messages: [{
    //         role: "system",
    //         content: `You are an educational consultant.
    //                 answer the following questions concisely:  "${content}"`
    //     }],
    // });
    let reply = await searchAssistant(content)
    return { statusCode: 200, message: `reply from virtual assistant`, data: { reply: reply } }
})
