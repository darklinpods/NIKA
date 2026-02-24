import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

async function bugTest() {
    console.log("Debugging pdf2json extraction for 陶雪珍.pdf...");
    const filePath = path.join(__dirname, '../../samples_docs/陶雪珍.pdf');

    if (!fs.existsSync(filePath)) {
        console.error("File not found");
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const pdfParser = new PDFParser(null, true);

    pdfParser.on("pdfParser_dataError", (errData: any) => {
        console.error("Extraction Error:", errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        console.log("Extraction Ready!");
        const rawText = (pdfParser as any).getRawTextContent();
        console.log("Raw Text Length:", rawText.length);
        console.log("Raw Text Sample (first 500 chars):");
        console.log("-----------------------------------");
        console.log(rawText.substring(0, 500));
        console.log("-----------------------------------");

        if (rawText.trim().length === 0) {
            console.warn("WARNING: Extracted text is empty. Checking field contents...");
            // Look for fields or metadata if text is empty
            const pages = pdfData.Pages || [];
            console.log("Total Pages:", pages.length);
            if (pages.length > 0) {
                const firstPageTexts = pages[0].Texts || [];
                console.log("First page text items count:", firstPageTexts.length);
            }
        }
    });

    pdfParser.parseBuffer(fileBuffer);
}

bugTest();
