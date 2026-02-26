/**
 * 给 traffic_accident.docx 模版注入占位符（单花括号版 {var}）
 * Word 会随机把文字分拆进多个 <w:r> run，双花括号 {{var}} 会因此被一分为二
 * 导致 docxtemplater 报 "duplicate open tag"。
 * 改用单花括号 {var} 并配置 delimiters: { start: '{', end: '}' } 即可规避。
 */

const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE_IN = path.resolve(__dirname, '../../skills/templates/traffic_accident.docx');
const TEMPLATE_OUT = path.resolve(__dirname, '../../skills/templates/traffic_accident_with_vars.docx');

const buf = fs.readFileSync(TEMPLATE_IN, 'binary');
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

// 验证原始文件干净
const existing = xml.match(/\{[a-zA-Z]/g);
console.log('Original file single-{ count:', existing ? existing.length : 0, '(should be 0)');

// =========================================================
// 1. 住院伙食补助费（label 和冒号分两个 run）
// =========================================================
xml = xml.replace(
    '<w:t>住院伙食补助费</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>：</w:t></w:r>',
    '<w:t>住院伙食补助费</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">：{hospitalFoodText}</w:t></w:r>'
);

// =========================================================
// 2. 护理费
// =========================================================
xml = xml.replace(
    '<w:t>护理费：</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>（住院期间30天，6000元），出院后家属护理；</w:t></w:r>',
    '<w:t>护理费：</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">{nursingText}</w:t></w:r>'
);

// =========================================================
// 3. 交通费
// =========================================================
xml = xml.replace(
    '<w:t>交通费：</w:t></w:r><w:r><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>1200元（根据住院天数酌定）；</w:t></w:r>',
    '<w:t>交通费：</w:t></w:r><w:r><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">{trafficFeeText}</w:t></w:r>'
);

// =========================================================
// 4. 鉴定费
// =========================================================
xml = xml.split('鉴定费：2280元').join('鉴定费：{appraisalFeeText}');

// =========================================================
// 5. 具状人（含尾部空格）
// =========================================================
xml = xml.split('具状人： ').join('具状人：{plaintiffSignName}');

// =========================================================
// 6. 诉讼请求中的 [ ] 变量
// =========================================================
xml = xml.split('[车主]').join('{defendantOwner}');
xml = xml.split('[合计金额]').join('{totalCompensation}');
xml = xml.split('[保险公司]').join('{tplcInsurer}');
xml = xml.split('[商业险保险公司]').join('{commercialInsurer}');
// 驾驶员跨三个 run：[ ]  + 驾驶员 + [ ]，用正则合并
xml = xml.replace(
    /(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr>)<w:t>\[<\/w:t><\/w:r>([\s\S]*?)<w:t>驾驶员<\/w:t><\/w:r>([\s\S]*?)<w:t>\]<\/w:t><\/w:r>/,
    (m, firstPart) => firstPart + '<w:t>{defendantDriver}</w:t></w:r>'
);

// =========================================================
// 7. 标的总额
// =========================================================
xml = xml.split('原告各项损失合计[]元。被告保险公司已垫付医疗费[]元，应在最终赔偿款中予以扣除。扣除后尚应赔偿：[] 元。')
    .join('原告各项损失合计{totalLoss}元。被告保险公司已垫付医疗费{paidByInsurer}元，应在最终赔偿款中予以扣除。扣除后尚应赔偿：{netPayable}元。');

// =========================================================
// 8. 索赔清单各行
// =========================================================
const simpleReplacements = [
    ['治疗费：', '治疗费：{medicalFeeText}'],
    ['后期治疗费：', '后期治疗费：{futureTreatmentText}'],
    ['营养费：', '营养费：{nutritionText}'],
    ['误工费：', '误工费：{lostWageText}'],
    ['精神抚慰金：', '精神抚慰金：{mentalCompText}'],
    ['车辆维修费；', '车辆维修费：{vehicleRepairText}'],
];
for (const [from, to] of simpleReplacements) {
    xml = xml.split(from).join(to);
}

// =========================================================
// 9. 残疾赔偿金 / 抚养赡养费
// =========================================================
xml = xml.replace(/<w:t>残疾赔偿金：<\/w:t>/g, '<w:t>残疾赔偿金：{disabilityCompText}</w:t>');
xml = xml.replace(/<w:t>抚养\/赡养费<\/w:t>/g, '<w:t>抚养/赡养费：{dependentText}</w:t>');

// =========================================================
// 10. 当事人姓名（顺序：原告 → 被告1 → 被告2）
// =========================================================
let nameCount = 0;
xml = xml.replace(/<w:t>姓名：<\/w:t>/g, () => {
    nameCount++;
    if (nameCount === 1) return '<w:t>姓名：{plaintiffName}</w:t>';
    if (nameCount === 2) return '<w:t>姓名：{defendant1Name}</w:t>';
    if (nameCount === 3) return '<w:t>姓名：{defendant2Name}</w:t>';
    return '<w:t>姓名：</w:t>';
});

// =========================================================
// 11. 保险公司名称
// =========================================================
xml = xml.replace(/<w:t>名称：<\/w:t>/, '<w:t>名称：{insurer1Name}</w:t>');

// =========================================================
// 12. 事实和理由各小节
// =========================================================
xml = xml.replace(
    /(<w:t>1\.交通事故发生情况<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{accidentFacts}</w:t></w:r>$3'
);
xml = xml.replace(
    /(<w:t>2\.交通事故责任认定<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{liabilityDetermination}</w:t></w:r>$3'
);
xml = xml.replace(
    /(<w:t>3\.机动车投保情况<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{insuranceStatus}</w:t></w:r>$3'
);
xml = xml.replace(
    /(<w:t>4\.其他情况及法律依据<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>[\s\S]*?<w:p [^>]+>)(<w:pPr>[\s\S]*?<\/w:pPr>)(<\/w:p>)/,
    '$1$2<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{otherFacts}</w:t></w:r>$3'
);

// =========================================================
// 校验输出
// =========================================================
const allVars = [...new Set((xml.match(/\{[a-zA-Z][^}]+\}/g) || []))].sort();
console.log('Total variables injected:', allVars.length);
allVars.forEach(v => console.log(' ', v));

// 写出
zip.file('word/document.xml', xml);
const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(TEMPLATE_OUT, out);
console.log('Saved:', TEMPLATE_OUT);
