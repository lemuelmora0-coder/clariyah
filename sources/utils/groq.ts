// Replace your old 'chatOllama' or 'processImage' function with this:

export async function processImageWithGroq(base64Image: string, prompt: string, apiKey: string) {
  const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"; // <--- NOTICE: No more localhost!

  const body = {
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // The vision model
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
  };

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`, // Make sure this key is loaded from keys.ts
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Groq Error:", data.error);
      return "Error: " + data.error.message;
    }
    
    return data.choices[0].message.content;

  } catch (error) {
    console.error("Network Error:", error);
    return "Error: Could not connect to Groq Cloud.";
  }
}