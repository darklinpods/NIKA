import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

async function main() {
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCG7r-O44tzsZ9fkXBJ9trxAzV4yOZgge0";
    const ai = new GoogleGenAI({});
    
    fs.writeFileSync("/tmp/hello.txt", "Hello GenAI");
    
    console.log("Uploading file...");
    const uploadedFile = await ai.files.upload({
        file: "/tmp/hello.txt",
        config: { mimeType: "text/plain" }
    });
    console.log("File uploaded:", uploadedFile.name); // upload returned object has .name
    
    console.log("Testing camelCase fileData...");
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    { text: "What is in this file?" },
                    { fileData: { fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType } }
                ]
            }]
        });
        console.log("SUCCESS! Output length:", result.text?.length);
    } catch(e: any) {
        console.error("FAILED camelCase:", e.message);
    }
}
main();
