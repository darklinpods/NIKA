import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

async function testSmartImport() {
    console.log("Starting Smart Import test with REAL document: 陶雪珍.pdf...");
    const filePath = path.join(__dirname, '../../samples_docs/陶雪珍.pdf');

    if (!fs.existsSync(filePath)) {
        console.error("PDF file not found at:", filePath);
        return;
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    try {
        const response = await fetch('http://localhost:3001/api/cases/smart-import', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errBody}`);
        }

        const result: any = await response.json();
        console.log("\n=== SMART IMPORT EXTRACTION RESULT ===");
        console.dir(result, { depth: null });
        console.log("======================================\n");

        if (result.success && result.data) {
            console.log("Title:", result.data.title);
            console.log("Client Name:", result.data.clientName);
            console.log("Description Snippet:", result.data.description?.substring(0, 200) + "...");
            console.log("Priority:", result.data.priority);
            console.log("Tags:", result.data.tags);
        }

    } catch (e: any) {
        console.error("Test Error:", e.message);
    }
}

testSmartImport();
