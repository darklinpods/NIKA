const mammoth = require('mammoth');
const fs = require('fs');

async function extractDoc(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    console.log(`\n\n=== Reading: ${filePath} ===\n`);
    const result = await mammoth.extractRawText({ path: filePath });
    // Print first 1000 characters and last 500 characters
    const text = result.value;
    console.log(text.substring(0, 1000));
    console.log('\n...\n');
    console.log(text.substring(text.length - 500));
}

async function main() {
    await extractDoc('/Users/guangge/work/law-case-manager/templates/民事起诉状-要素式模版-机动车交通事故责任纠纷.docx');
    await extractDoc('/Users/guangge/work/law-case-manager/samples_docs/民事起诉状-吴维利.docx');
    await extractDoc('/Users/guangge/work/law-case-manager/samples_docs/民事起诉状-左志刚（左国辉）.docx');
}

main().catch(console.error);
