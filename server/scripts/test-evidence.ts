import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // Requires node-fetch
import FormData from 'form-data';

async function testEvidenceUpload() {
    console.log("Starting Evidence upload test for TXT...");
    const filePath = path.join(__dirname, '../test_evidence.txt');

    if (!fs.existsSync(filePath)) {
        console.error("PDF file not found at:", filePath);
        return;
    }

    // Step 1: Create a mock case
    console.log("Creating dummy Case first...");
    const createRes = await fetch('http://localhost:3001/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Contract Breach RAG Test',
            description: 'Testing RAG pipeline...',
            priority: 'medium',
            tags: ['test'],
            clientName: 'Test Client'
        })
    });
    const createdCase: any = await createRes.json();
    const caseId = createdCase.data?.id || createdCase.id;

    if (!caseId) {
        console.error("Failed to create mock case.", createdCase);
        return;
    }
    console.log("Created Case ID:", caseId);

    // Step 2: Upload evidence to it
    console.log("Uploading Evidence PDF to Case...");
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    try {
        const uploadRes = await fetch(`http://localhost:3001/api/cases/${caseId}/evidence`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            const errBody = await uploadRes.text();
            throw new Error(`Upload failed with status ${uploadRes.status} ${errBody}`);
        }

        const data = await uploadRes.json();
        console.log("Evidence Upload succeeded! Extracted Parties & Updated Case:");
        console.dir(data, { depth: null });

        // Step 3: Test RAG Official Document Generation
        console.log("Testing RAG Official Document Generation...");
        const docRes = await fetch(`http://localhost:3001/api/gemini/generate-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                docType: 'offical_doc',
                caseTitle: createdCase.title,
                caseDesc: createdCase.description,
                lang: 'zh',
                caseId: caseId
            })
        });

        if (!docRes.ok) throw new Error("Document generation failed " + await docRes.text());
        const docData: any = await docRes.json();
        console.log("\n=== GENERATED RAG DOCUMENT ===");
        console.log(docData.data?.text || docData.data);
        console.log("==============================\n");

    } catch (e: any) {
        console.error("Test Error:", e.message);
    }
}

testEvidenceUpload();
