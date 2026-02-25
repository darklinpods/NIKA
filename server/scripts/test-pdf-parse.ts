import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

const sampleFile = path.join(__dirname, '../../samples_docs/徐正江 营运损失.pdf');

async function testPdfParsing() {
    console.log("📄 Testing pdf2json on scanned PDF...\n");

    const fileBuffer = fs.readFileSync(sampleFile);
    console.log(`File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    const extractedText: string = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
        pdfParser.on("pdfParser_dataReady", () => {
            resolve((pdfParser as any).getRawTextContent());
        });
        pdfParser.parseBuffer(fileBuffer);
    });

    console.log(`\npdf2json extracted ${extractedText.length} characters`);
    console.log(`\n--- First 500 chars ---`);
    console.log(extractedText.substring(0, 500));

    // Check if content is meaningful (not just page breaks)
    const cleanText = extractedText.replace(/[-]+Page \(\d+\) Break[-]+/g, '').trim();
    console.log(`\n--- After removing page breaks: ${cleanText.length} chars ---`);
    console.log(cleanText.substring(0, 200) || "(empty)");

    // Determine if this is a scanned PDF
    const isScanBasedPdf = cleanText.length < 50;
    console.log(`\n🔍 Is scanned/image PDF: ${isScanBasedPdf}`);
}

testPdfParsing().catch(console.error);
