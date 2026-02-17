import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export async function transcribeAudio(uri: string, apiKey: string) {
    try {
        const formData = new FormData();
        
        // WEB: Use standard fetch and Blob
        if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            // Create a file object for the browser
            const file = new File([blob], "audio.m4a", { type: "audio/m4a" });
            formData.append("file", file);
        } 
        // MOBILE: Use formatted JSON object
        else {
            formData.append("file", {
                uri: uri,
                name: 'audio.m4a',
                type: 'audio/m4a',
            } as any);
        }

        formData.append("model", "whisper-large-v3");

        // Send to Groq
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                // Do NOT set Content-Type to multipart/form-data manually; fetch does it for us
            },
            body: formData
        });

        const data = await res.json();
        
        if (data.error) {
            console.error("Groq Error:", data.error);
            return null;
        }
        
        return data.text;

    } catch (error) {
        console.error("Transcription Failed:", error);
        return null;
    }
}