import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Requires node-fetch
import FormData from 'form-data';

async function testUpload() {
    console.log("Starting upload test for PDF...");
    const filePath = path.join(__dirname, '../test_complaint.pdf');

    if (!fs.existsSync(filePath)) {
        console.error("PDF file not found!");
        return;
    }

    const fileStream = fs.createReadStream(filePath);
    const formData = new FormData();
    // append file, specifying filename and mime type for proper parsing
    formData.append('file', fileStream, {
        filename: 'test_complaint.pdf',
        contentType: 'application/pdf'
    });

    try {
        const response = await fetch('http://localhost:3001/api/cases/smart-import', {
            method: 'POST',
            body: formData,
            // headers: formData.getHeaders() is automatically handled by some fetch implementations, 
            // but we might need it for node-fetch when posting FormData
            // @ts-ignore
            headers: formData.getHeaders()
        });

        if (!response.ok) {
            const errorResult = await response.text();
            console.error("Upload failed with status", response.status, errorResult);
        } else {
            const result = await response.json();
            console.log("Upload succeeded! Extracted JSON Data:");
            console.dir(result, { depth: null, colors: true });
        }
    } catch (error) {
        console.error("Request error:", error);
    }
}

testUpload();
