import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
    try {
        console.log("Listing models...");
        // @ts-ignore
        const response = await ai.models.list();
        for await (const model of response) {
            console.log(model.name);
        }
    } catch (e: any) {
        console.error("Failed to list models:", e.message);
    }
}
listModels();
