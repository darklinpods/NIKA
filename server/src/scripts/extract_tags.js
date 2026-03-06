const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const InspectModule = require("docxtemplater/js/inspect-module");

const content = fs.readFileSync('/Users/guangge/work/law-case-manager/server/src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx', 'binary');
const zip = new PizZip(content);

const iModule = InspectModule();
const doc = new Docxtemplater(zip, {
    modules: [iModule],
    paragraphLoop: true,
    linebreaks: true
});

const tags = iModule.getAllTags();
console.log(JSON.stringify(Object.keys(tags), null, 2));
