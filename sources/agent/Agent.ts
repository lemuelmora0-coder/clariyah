import * as React from 'react';
import { AsyncLock } from "../utils/lock";
import { imageDescription, llamaFind } from "./imageDescription";

type AgentState = {
    lastDescription?: string;
    answer?: string;
    loading: boolean;
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
                // This uses Ollama/Moondream as defined in imageDescription.ts
                let description = await imageDescription(p);
                console.log('Description', description);
                this.#photos.push({ photo: p, description });
                lastDescription = description;
            }

            if (lastDescription) {
                this.#state.lastDescription = lastDescription;
                this.#notify();
            }
        });
    }

    async answer(question: string) {
        // FIX: Removed the startAudio() call which caused the crash
        
        if (this.#state.loading) {
            return;
        }
        this.#state.loading = true;
        this.#notify();
        await this.#lock.inLock(async () => {
            let combined = '';
            let i = 0;
            for (let p of this.#photos) {
                // FIX: Added '+=' so the text actually saves
                combined += '\n\nImage #' + i + '\n\n'; 
                combined += p.description;
                i++;
            }
            // This uses Groq for fast answering based on what Moondream saw
            let answer = await llamaFind(question, combined);
            this.#state.answer = answer;
            this.#state.loading = false;
            this.#notify();

            // Optional: Use browser built-in speech since OpenAI is gone
            if (answer) {
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
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