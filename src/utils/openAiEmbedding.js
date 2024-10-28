import { openai } from './dbConnection.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
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
export const create_assistant = async (openai) => {
    try {
        const assistantFilePath = 'assistant.json'
        let assistantId;
        if (existsSync(assistantFilePath)) {
            try {
                const fileContent = readFileSync(assistantFilePath, 'utf8');
                const assistantData = JSON.parse(fileContent);
                assistantId = assistantData.assistant_id;
                console.log("Loaded existing assistant ID.");
            } catch (error) {
                console.error("Error reading assistant file:", error);
            }
        }
        else {
            try {
                // Upload the knowledge document
                const file = await openai.files.create({
                    file: fs.createReadStream('knowledge.docx'),
                    purpose: 'assistants'
                });

                // Create a new assistant with the provided instructions
                const assistant = await openai.beta.assistants.create({
                    instructions: ` The assistant, Smith's Solar Sales Assistant, has been programmed to help junior sales reps with learning company standard operating procedures and selling techniques as a salesperson.
              A document has been provided with information on Smith's solar sales processes and training info. `,
                    model: "gpt-3.5-turbo",
                    tools: [{ type: "retrieval" }],
                    file_ids: [file.id]
                });

                // Save the assistant ID to a file
                const assistantData = { assistant_id: assistant.id };
                writeFileSync(assistantFilePath, JSON.stringify(assistantData, null, 2));
                console.log("Created a new assistant and saved the ID.");

                assistantId = assistant.id;
            } catch (error) {
                console.error("Error creating assistant:", error);
            }
        }
        return assistantId;
    } catch (error) {
        console.log(error);
        return null;
    }
}
export const start_conversation = async (openai) => {
    try {
        thread = openai.beta.threads.create()
        return { "thread_id": thread.id }
    } catch (error) {
        console.log(error);
        return null;
    }
}
export const chat = async ({ threadId, userInput, assistant_id, client }) => {
    try {
        if (!threadId) return null;

        // Send user input to the conversation thread
        await client.beta.threads.messages.create({ thread_id: threadId, role: "user", content: userInput });

        // Start a new run for the assistant's response
        const run = await client.beta.threads.runs.create({ thread_id: threadId, assistant_id });

        // Polling for the completion status of the run
        while (true) {
            const runStatus = await client.beta.threads.runs.retrieve({ thread_id: threadId, run_id: run.id });
            if (runStatus.status === 'completed') break;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1 second
        }

        // Retrieve the list of messages in the thread
        const messages = await client.beta.threads.messages.list({ thread_id: threadId });

        // Access the latest message content from the assistant
        const response = messages.data[0].content[0].text.value;
        return { response };
    } catch (error) {
        console.error(error);
        return null;
    }
};