import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import path from 'path';

async function createPdf() {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 16;

    page.drawText('Sample English Complaint Document', {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
    });

    page.drawText('Plaintiff: John Doe', { x: 50, y: height - 6 * fontSize, size: 12, font: timesRomanFont });
    page.drawText('Defendant: Acme Corp', { x: 50, y: height - 7 * fontSize, size: 12, font: timesRomanFont });
    page.drawText('Disputed Amount: 50,000 USD', { x: 50, y: height - 8 * fontSize, size: 12, font: timesRomanFont });
    page.drawText('Cause of action: Breach of Contract due to delayed delivery of goods.', { x: 50, y: height - 9 * fontSize, size: 12, font: timesRomanFont });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(__dirname, 'test_complaint.pdf'), pdfBytes);
    console.log("PDF generated successfully.");
}

createPdf();
