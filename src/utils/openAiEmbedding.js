import newCourseModel from '../models/coursesNew.js';
import { openai } from './dbConnection.js';
export const stringToEmbedding = async (text) => {
    try {
        const { data } = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
            encoding_format: "float",
        });
        return data[0].embedding;
    } catch (error) {
        console.log(error);
        return null;
    }
}
export const getGoodstring = async (userStr) => {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: "system",
                    content: "You are an AI assistant that generates structured JSON output for database searches. Each JSON object should describe what to search for in specific categories out of courses and universities"
                },
                {
                    role: "user",
                    content: `The user provided the following query: "${userStr}". Generate a structured JSON array with objects should strictly be like like:    {  "searchItems": [  {    "category": "courses", "assistStr": "search query string"   },    {  "category": "universities",   "assistStr": "search query string"    }  ] }`
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 200,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.log(error);
        throw new Error('Error passing through 1st stage of AI');
    }
}

export const contentExtractor = async (userMessage) => {
    try {
        const courses = await newCourseModel.aggregate([
            {
                $vectorSearch: {
                    "queryVector": await stringToEmbedding(userMessage),
                    "path": "embeddingVector",
                    "numCandidates": 100,
                    "limit": 5,
                    "index": "vector_index"
                }
            },
            {
                $project: { plot: 1 }
            }
        ])
        return courses.map(ele => {
            let url = `https://campusroot.com/singlecourse/${ele._id}`
            return `<a href="${url}" target="_blank">${ele.plot}</a>`
        })
    } catch (error) {
        console.error("error extracting content from db", error)
        throw new Error("error extracting content from db")
    }
}

export const searchAssistant = async (userMessage, messages) => {
    try {
        let { searchItems } = await getGoodstring(userMessage)  // filter out prompt and other non-useful strings  
        let knowledgeArray = []
        for (const element of searchItems) {
            if (element.category == "courses") {
                let data = await contentExtractor(element.assistStr) // extract content from db  such as plot and courseLink 

                knowledgeArray.push(...data)
            }
        }
        let Messages = [
            {
                role: "system",
                content: `Your name is Ava (Artificial Virtual Assistant). You are an international student advisor, focused strictly on study-related guidance. Use the provided information to answer questions accurately and concisely.`
            }
        ];
        messages.forEach(ele => { Messages.push({ role: ele.sender == "6737304feb3f12f7ec92ec41" ? "assistant" : "user", content: ele.content }) })
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                ...messages,
                {
                    role: "system",
                    content: `Below is relevant information from the database to support the user's study inquiries with links for reference from the given info:
                              ${knowledgeArray.join('\n')} 
                              Please use this information to respond concisely and specifically to the user's study-related question: "${userMessage}".`
                }],
        });
        let botMessage = response.choices[0].message.content
        return botMessage
    } catch (error) {
        console.error("error generating content", error)
        throw new Error("error generating content")
    }
}
// export const create_assistant = async (openai) => {
//     try {
//         const assistantFilePath = 'assistant.json'
//         let assistantId;
//         if (existsSync(assistantFilePath)) {
//             try {
//                 const fileContent = readFileSync(assistantFilePath, 'utf8');
//                 const assistantData = JSON.parse(fileContent);
//                 assistantId = assistantData.assistant_id;
//                 console.log("Loaded existing assistant ID.");
//             } catch (error) {
//                 console.error("Error reading assistant file:", error);
//             }
//         }
//         else {
//             try {
//                 // Upload the knowledge document
//                 const file = await openai.files.create({
//                     file: fs.createReadStream('knowledge.docx'),
//                     purpose: 'assistants'
//                 });

//                 // Create a new assistant with the provided instructions
//                 const assistant = await openai.beta.assistants.create({
//                     instructions: ` The assistant, Smith's Solar Sales Assistant, has been programmed to help junior sales reps with learning company standard operating procedures and selling techniques as a salesperson.
//               A document has been provided with information on Smith's solar sales processes and training info. `,
//                     model: "gpt-3.5-turbo",
//                     tools: [{ type: "retrieval" }],
//                     file_ids: [file.id]
//                 });

//                 // Save the assistant ID to a file
//                 const assistantData = { assistant_id: assistant.id };
//                 writeFileSync(assistantFilePath, JSON.stringify(assistantData, null, 2));
//                 console.log("Created a new assistant and saved the ID.");

//                 assistantId = assistant.id;
//             } catch (error) {
//                 console.error("Error creating assistant:", error);
//             }
//         }
//         return assistantId;
//     } catch (error) {
//         console.log(error);
//         return null;
//     }
// }
// export const start_conversation = async (openai) => {
//     try {
//         thread = openai.beta.threads.create()
//         return { "thread_id": thread.id }
//     } catch (error) {
//         console.log(error);
//         return null;
//     }
// }
// export const chat = async ({ threadId, userInput, assistant_id, client }) => {
//     try {
//         if (!threadId) return null;

//         // Send user input to the conversation thread
//         await client.beta.threads.messages.create({ thread_id: threadId, role: "user", content: userInput });

//         // Start a new run for the assistant's response
//         const run = await client.beta.threads.runs.create({ thread_id: threadId, assistant_id });

//         // Polling for the completion status of the run
//         while (true) {
//             const runStatus = await client.beta.threads.runs.retrieve({ thread_id: threadId, run_id: run.id });
//             if (runStatus.status === 'completed') break;
//             await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1 second
//         }

//         // Retrieve the list of messages in the thread
//         const messages = await client.beta.threads.messages.list({ thread_id: threadId });

//         // Access the latest message content from the assistant
//         const response = messages.data[0].content[0].text.value;
//         return { response };
//     } catch (error) {
//         console.error(error);
//         return null;
//     }
// };