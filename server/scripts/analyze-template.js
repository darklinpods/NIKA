const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE = path.resolve(__dirname, '../src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx');
const buf = fs.readFileSync(TEMPLATE, 'binary');
const zip = new PizZip(buf);
const xml = zip.file('word/document.xml').asText();

const tags = ['_PLAINTIFF_ROWS_', '_DEFENDANT_ROWS_', '_CLAIM_ROWS_'];

tags.forEach(tag => {
    const index = xml.indexOf(tag);
    if (index === -1) {
        console.log(`Tag ${tag} not found!`);
    } else {
        const start = Math.max(0, index - 200);
        const end = Math.min(xml.length, index + 200);
        console.log(`\n--- Context for ${tag} ---`);
        console.log(xml.substring(start, end));
    }
});
