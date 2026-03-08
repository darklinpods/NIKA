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
// 10b. 其余当事人字段（每类出现3次：原告/被告1/被告2），按顺序注入
//     策略：在 label 结束的 </w:t></w:r> 前追加占位符 run
// =========================================================

// 辅助函数：按顺序替换，第 N 次出现用第 N 个变量名替换
function replaceInOrder(xml, searchLabel, varNames) {
    let count = 0;
    // 找到 <w:t>label</w:t> 或 <w:t>\nlabel</w:t>（可能有换行）
    const re = new RegExp(`(<w:t[^>]*>[\\s]*${searchLabel.replace(/[()（）\/]/g, '\\$&')}[\\s]*<\\/w:t>)(<\\/w:r>)`, 'g');
    return xml.replace(re, (match, tTag, closeRun) => {
        const varName = varNames[count] || '';
        count++;
        if (!varName) return match;
        // 在 label 的 </w:t></w:r> 后追加一个新 run 含占位符
        return tTag + closeRun + `<w:r><w:rPr><w:rFonts w:ascii="微软雅黑" w:eastAsia="微软雅黑" w:hAnsi="微软雅黑"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t xml:space="preserve">{${varName}}</w:t></w:r>`;
    });
}

// 性别（模板里是 "性别：男□  女☑" 等复选框，直接整行替换）
// 这里我们在性别标题 run 后直接追加文字占位符（简化处理）
let genderCount = 0;
xml = xml.replace(/<w:t>性别：男[^<]*<\/w:t>/g, () => {
    genderCount++;
    if (genderCount === 1) return `<w:t xml:space="preserve">性别：{plaintiffGender}</w:t>`;
    if (genderCount === 2) return `<w:t xml:space="preserve">性别：{defendant1Gender}</w:t>`;
    if (genderCount === 3) return `<w:t xml:space="preserve">性别：{defendant2Gender}</w:t>`;
    return '<w:t>性别：男</w:t>';
});

// 民族
let ethnicCount = 0;
xml = xml.replace(/<w:t>民族：<\/w:t>/g, () => {
    ethnicCount++;
    if (ethnicCount === 1) return '<w:t>民族：{plaintiffEthnicity}</w:t>';
    if (ethnicCount === 2) return '<w:t>民族：{defendant1Ethnicity}</w:t>';
    if (ethnicCount === 3) return '<w:t>民族：{defendant2Ethnicity}</w:t>';
    return '<w:t>民族：</w:t>';
});
// 兜底："汉族" 固定文字（如果原文 label+内容在一个 run 里）
xml = xml.replace(/<w:t>民族：<\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*(?:<[^>]*>[^<]*<\/[^>]*>)*<\/w:rPr><w:t>汉族<\/w:t>/g,
    (m) => m); // 保持不变（因为已经在上方通过 label 替换加了变量）

// 联系电话（顺序：原告/被告1/被告2）
xml = replaceInOrder(xml, '联系电话：', ['plaintiffPhone', 'defendant1Phone', 'defendant2Phone']);

// 住所地（户籍所在地）
xml = replaceInOrder(xml, '住所地（户籍所在地）：', ['plaintiffAddress', 'defendant1Address', 'defendant2Address']);

// 经常居住地（含冒号可能在下一个 run）
// 原告的 "经常居住地" 后面有个 run 含 "："，被告的直接是 "经常居住地："
let residentCount = 0;
xml = xml.replace(/经常居住地：/g, () => {
    residentCount++;
    if (residentCount === 1) return `经常居住地：{plaintiffResident}`;
    if (residentCount === 2) return `经常居住地：{defendant1Resident}`;
    if (residentCount === 3) return `经常居住地：{defendant2Resident}`;
    return '经常居住地：';
});
// 处理 label 和冒号在不同 run 的情况（原告）
xml = xml.replace(/<w:t>\n经常居住地<\/w:t><\/w:r>[\s\S]*?<w:t>：<\/w:t><\/w:r>/,
    (m) => m.replace('<w:t>：</w:t></w:r>',
        '<w:t xml:space="preserve">：{plaintiffResident}</w:t></w:r>'));

// 保险公司相关字段
xml = replaceInOrder(xml, '住所地（主要办事机构所在地）：', ['insurer1Address']);
xml = replaceInOrder(xml, '法定代表人/主要负责人：', ['insurer1LegalRep']);
xml = replaceInOrder(xml, '统一社会信用代码：', ['insurer1CreditCode']);

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
// 13. 索赔清单列表 (循环表格支持)
// docxtemplater 要求 {#claims} 和 {/claims} 在不同的 run 中。
// 只需要在模板的表格行里放置对应的结构即可，这里用占位符标记整体替换
// 注意：我们的实现是简单的文本替换，若直接支持 docxtemplater 的数组需要用其实例渲染
// 由于之前是以裸文字替换实现，为兼容原架构并支持动态行表格，我们需要手写XML循环行逻辑
// =========================================================

// {claimsTablePlaceholder} 在模板的表格行 <w:tr> 内部或作为一行
xml = xml.replace(/<w:tr[^>]*>[\s\S]*?<w:t>\{claimsTablePlaceholder\}<\/w:t>[\s\S]*?<\/w:tr>/, 
    (m) => {
        // Find the tr, and expand it statically for all claims later in the render pipeline
        // For inject-template-vars.js, we will just leave a macro `{@_CLAIM_ROWS_}` 
        // to tell docxtemplater to inject Raw XML here.
        return '{@_CLAIM_ROWS_}';
    }
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
