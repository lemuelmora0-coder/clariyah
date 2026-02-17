import * as Speech from 'expo-speech';
import * as React from 'react';
import { AsyncLock } from "../utils/lock";
import { keys } from "../keys"; // Make sure we have access to API keys
import { processImageWithGroq } from "../utils/groq"; // Import the function you created in Step 2

type AgentState = {
    lastDescription?: string;
    answer?: string;
    loading: boolean;
}

// HELPER: Convert raw camera data to Base64 for Groq
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
}

// HELPER: Text-Only Groq call (replaces llamaFind)
async function askGroqText(question: string, context: string) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${keys.groq}`,
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant", // Fast text model
            messages: [
                { role: "system", content: "You are a helpful AI assistant. Use the provided image descriptions to answer the user's question." },
                { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }
            ],
        }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I couldn't generate an answer.";
}

export class Agent {
    #lock = new AsyncLock();
    #photos: { photo: Uint8Array, description: string }[] = [];
    #state: AgentState = { loading: false };
    #stateCopy: AgentState = { loading: false };
    #stateListeners: (() => void)[] = [];

    async addPhoto(photos: Uint8Array[]) {
        await this.#lock.inLock(async () => {
            let lastDescription: string | null = null;
            for (let p of photos) {
                console.log('Processing photo', p.length);
                
                // 1. Convert Raw Data to Base64
                const base64Image = uint8ArrayToBase64(p);

                // 2. Send to Groq Vision (Cloud) instead of Moondream (Localhost)
                console.log("Sending to Groq Vision...");
                let description = await processImageWithGroq(
                    base64Image, 
                    "Describe this image in detail.", 
                    keys.groq
                );
                
                console.log('Description', description);
                
                // Store the result
                this.#photos.push({ photo: p, description: description || "Error describing image" });
                lastDescription = description;
            }

            if (lastDescription) {
                this.#state.lastDescription = lastDescription;
                this.#notify();
            }
        });
    }

    async answer(question: string) {
        if (this.#state.loading) return;
        
        this.#state.loading = true;
        this.#notify();

        await this.#lock.inLock(async () => {
            // 1. Combine all descriptions
            let combined = '';
            let i = 0;
            for (let p of this.#photos) {
                combined += `\n\n[Image #${i}]: ${p.description}`; 
                i++;
            }

            // 2. Ask Groq
            console.log("Asking Groq Text...");
            let answer = await askGroqText(question, combined);
            
            this.#state.answer = answer;
            this.#state.loading = false;
            this.#notify();

            // 3. SPEAK THE ANSWER (Accessibility)
            if (answer) {
                // Stop any previous speech
                Speech.stop();
                // Speak slowly and clearly
                Speech.speak(answer, { 
                    language: 'en',
                    pitch: 1.0,
                    rate: 0.9 // Slightly slower for clarity
                });
            }
        });
    }

    #notify = () => {
        this.#stateCopy = { ...this.#state };
        for (let l of this.#stateListeners) {
            l();
        }
    }

    use() {
        const [state, setState] = React.useState(this.#stateCopy);
        React.useEffect(() => {
            const listener = () => setState(this.#stateCopy);
            this.#stateListeners.push(listener);
            return () => {
                this.#stateListeners = this.#stateListeners.filter(l => l !== listener);
            }
        }, []);
        return state;
    }
}