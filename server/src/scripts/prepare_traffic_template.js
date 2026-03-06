const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const TEMPLATE_IN = path.resolve(__dirname, '../../src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx');
const TEMPLATE_OUT = path.resolve(__dirname, '../../src/templates/docx/民事起诉状（机动车交通事故责任纠纷）.docx');

const buf = fs.readFileSync(TEMPLATE_IN, 'binary');
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

// Custom placeholder injection for the 5 sections
function injectAfter(xmlString, label, varName) {
    // Look for <w:t>label</w:t>  (possibly split but let's try direct first)
    // The exact text might be split across runs. Let's do a more robust approach:
    // Actually, in previous extraction, it was "1.交通事故发生情况" "2.交通事故责任认定" etc.
    const re = new RegExp(`(<w:t>${label}<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>.*?<w:p [^>]+>)(<w:pPr>.*?<\/w:pPr>)(<\/w:p>)`, '')
    
    // Instead of regex, let's use simple string replace for "诉讼请求\n1.判令..."
    return xmlString; // placeholder
}

// Okay, a safer approach to modify the XML without breaking it:
// Let's replace the whole blocks if we can, or just append after specific strings.
// Looking at the extracted text: "诉讼请求1.判令被告{被告一}、{被告二}共同赔偿原告经济损失元；"
// It's safer to just inject a run with {varName} somewhere after.

// 1. Claims List (诉讼请求)
// It's easier to just match the start of the claims block and replace the whole block up to "标的总额".
// Actually, let's just append {claimsList} after '诉讼请求' using a regex on <w:t>诉讼请求</w:t>
xml = xml.replace(
    /(<w:t>诉讼请求<\/w:t><\/w:r>)([\s\S]*?)(<w:t>诉前保全及鉴定申请<\/w:t>)/,
    '$1<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>\n{claimsList}\n\n</w:t></w:r>$3'
);

// 2. Accident Facts
xml = xml.replace(
    /(<w:t>1\.交通事故发生情况<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{accidentFacts}</w:t></w:r>$3'
);

// 3. Liability 
xml = xml.replace(
    /(<w:t>2\.交通事故责任认定<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{liabilityDetermination}</w:t></w:r>$3'
);

// 4. Insurance Status
xml = xml.replace(
    /(<w:t>3\.机动车投保情况<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{insuranceStatus}</w:t></w:r>$3'
);

// 5. Legal Basis
xml = xml.replace(
    /(<w:t>4\.其他情况及法律依据<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{otherFacts}</w:t></w:r>$3'
);

// 6. Remove specific court and date from bottom, leaving them blank for manual entry
// The template currently has:
// 此致<w:br/>[法院名称]人民法院
// 具状人（签字、盖章）：[具状人]<w:br/>日期：[年][月][日]
// Actually looking at the extracted text earlier:
// "此致" followed somewhere by "人民法院"
// We will replace "此致XX人民法院" style text, or just strip the variables.
// Based on the raw text extracted earlier:
// "...了解□  不了解□是否考虑先行调解是□否□暂不确定，想要了解更多内容□具状人（签字、盖章）： 日期："
// Let's replace "日期：" and anything after it until the end with just "日期：      年    月    日"
xml = xml.replace(
    /日期：(.*?)<\/w:t>/,
    '日期：        年      月      日</w:t>'
);

// Keep "此致" generic if it has variables:
// If there's a court variable, we wipe it.
xml = xml.replace(
    /此致(?:<\/w:t><\/w:r>.*?<w:t>|:?)(.*?)人民法院/,
    '此致</w:t></w:r><w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t xml:space="preserve">                     人民法院</w:t></w:r>'
); // We do a somewhat safe approach, but simply modifying the docx manually might be better if regex fails.
// Let's see how docxtemplater outputs it. If there were variables, they aren't hit if we just don't pass them in.
// If the template has hardcoded "[法院名称]" we can replace it.
xml = xml.replace(/\[法院名称\]/g, '                     ');
xml = xml.replace(/\[年\]|\[月\]|\[日\]/g, '    ');
xml = xml.replace(/\[具状人\]/g, '               ');

zip.file('word/document.xml', xml);
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(TEMPLATE_OUT, out);
console.log('Successfully injected tags into', TEMPLATE_OUT);
// Print injected tags
console.log('Tags:', xml.match(/\{[a-zA-Z]+\}/g) || []);
