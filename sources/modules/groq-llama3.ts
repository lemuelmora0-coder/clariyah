import axios from "axios";
import { keys } from "../keys";

// Explicitly add Content-Type for the API
const headers = {
    'Authorization': `Bearer ${keys.groq}`,
    'Content-Type': 'application/json' 
};

export async function groqRequest(systemPrompt: string, userPrompt: string) {
    try {
        console.info("Calling Groq llama-3.1-8b-instant");
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            // Using the newer, more stable model ID
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }, { headers });
        return response.data.choices[0].message.content;
    } catch (error: any) {
        // Detailed logging helps find if the API key is invalid
        console.error("Error in groqRequest:", error.response?.data || error.message);
        return "Sorry, I couldn't process your question.";
    }
}

