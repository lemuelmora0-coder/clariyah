// vision.ts
import { ollamaInference } from "./ollama";

/**
 * Uses Moondream via Ollama to describe or answer questions about an image.
 * @param imageBuffer Raw image data (Uint8Array)
 * @param question The user's question about the image
 */
export async function askAboutImage(imageBuffer: Uint8Array, question: string = "Describe this image in detail.") {
    try {
        const response = await ollamaInference({
            model: "moondream", // Tiny and fast vision model
            messages: [
                {
                    role: "user",
                    content: question,
                    images: [imageBuffer] // Pass the image directly
                }
            ]
        });
        return response;
    } catch (error) {
        console.error("Vision Error:", error);
        return "Sorry, I couldn't process that image.";
    }
}