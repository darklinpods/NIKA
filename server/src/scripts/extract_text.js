const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const content = fs.readFileSync('/Users/guangge/work/law-case-manager/server/src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx', 'binary');
const zip = new PizZip(content);

const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
console.log(doc.getFullText());
