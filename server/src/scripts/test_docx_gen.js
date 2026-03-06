const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const content = fs.readFileSync('/Users/guangge/work/law-case-manager/server/src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx', 'binary');
const zip = new PizZip(content);

const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{', end: '}' } });

doc.render({
  claimsList: "1. 赔偿医疗费10000元\n2. 赔偿误工费5000元",
  accidentFacts: "2024年1月1日，被告驾驶小客车与原告发生碰撞。",
  liabilityDetermination: "交警认定被告全责。",
  insuranceStatus: "被告车辆在某保险公司投保了交强险和三者险。",
  otherFacts: "原告经鉴定为十级伤残。"
});

const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync('/Users/guangge/work/law-case-manager/server/src/scripts/test_output.docx', buf);
console.log('Test file generated: test_output.docx');
