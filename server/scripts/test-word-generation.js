const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const TEMPLATE_OUT = path.resolve(__dirname, '../src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx');
const OUTPUT_FILE = path.resolve(__dirname, 'test_output.docx');

if (!fs.existsSync(TEMPLATE_OUT)) {
    console.error("File not found: " + TEMPLATE_OUT);
    process.exit(1);
}

const content = fs.readFileSync(TEMPLATE_OUT, 'binary');
const zip = new PizZip(content);

const docOptions = {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "", 
    delimiters: { start: '{', end: '}' }
};

const doc = new Docxtemplater(zip, docOptions);

const claims = [
   { category: '医疗费', amount: 5000, description: '门诊发票3张' },
   { category: '交通费', amount: 200, description: '打车票' }
];

let rowsXml = '';
claims.forEach((claim, index) => {
    rowsXml += `
        <w:tr>
            <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${index + 1}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${claim.category || ''}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${Number(claim.amount).toFixed(2)}</w:t></w:r></w:p></w:tc>
            <w:tc><w:tcPr><w:tcW w:w="3700" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/></w:rPr><w:t>${claim.description || ''}</w:t></w:r></w:p></w:tc>
        </w:tr>
    `;
});

const formData = {
    plaintiffName: '张三测试',
    defendantDriver: '李四测试',
    totalLoss: '5200',
    _CLAIM_ROWS_: rowsXml
};

doc.render(formData);

const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
});

fs.writeFileSync(OUTPUT_FILE, buf);
console.log('Wrote output to ' + OUTPUT_FILE);
