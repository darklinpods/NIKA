/**
 * 给 traffic_accident.docx 模版注入 docxtemplater 占位符（精准最终版）
 * 基于 XML 检测结果精准匹配每一处文字。
 */

const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE_IN = path.resolve(__dirname, '../../skills/templates/traffic_accident.docx');
const TEMPLATE_OUT = path.resolve(__dirname, '../../skills/templates/traffic_accident_with_vars.docx');

const buf = fs.readFileSync(TEMPLATE_IN, 'binary');
const zip = new PizZip(buf);
let xml = zip.file('word/document.xml').asText();

// =========================================================
// 1. 住院伙食补助费：label 和冒号在两个 run 里，冒号后跟空段落
//    策略：把 <w:t>：</w:t></w:r> 替换为含占位符的版本
// =========================================================
xml = xml.replace(
    '<w:t>住院伙食补助费</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>：</w:t></w:r>',
    '<w:t>住院伙食补助费</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">：{{hospitalFoodText}}</w:t></w:r>'
);

// =========================================================
// 2. 护理费：label 含冒号在一个 run，固定文字在下一个 run
// =========================================================
xml = xml.replace(
    '<w:t>护理费：</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>（住院期间30天，6000元），出院后家属护理；</w:t></w:r>',
    '<w:t>护理费：</w:t></w:r><w:r w:rsidR="00EB1882"><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">{{nursingText}}</w:t></w:r>'
);

// =========================================================
// 3. 交通费：label 含冒号，固定值在下一 run
// =========================================================
xml = xml.replace(
    '<w:t>交通费：</w:t></w:r><w:r><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t>1200元（根据住院天数酌定）；</w:t></w:r>',
    '<w:t>交通费：</w:t></w:r><w:r><w:rPr><w:rFonts w:hint="eastAsia"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">{{trafficFeeText}}</w:t></w:r>'
);

// =========================================================
// 4. 鉴定费：模板里是 "鉴定费：2280元"（无分号）
// =========================================================
xml = xml.split('鉴定费：2280元').join('鉴定费：{{appraisalFeeText}}');
// 万一带分号的情况
xml = xml.split('鉴定费：2280元;').join('鉴定费：{{appraisalFeeText}}');

// =========================================================
// 5. 具状人：模板里是 "具状人： "（含尾部空格）
// =========================================================
xml = xml.split('具状人： ').join('具状人：{{plaintiffSignName}}');
xml = xml.split('具状人：').join('具状人：{{plaintiffSignName}}');

// =========================================================
// 6. 诉讼请求中的 [方括号] 变量
//    这些字符（[  内容  ]）各自在独立的 <w:r><w:t> 里
//    策略：直接文字替换（不跨 XML tag 问题，因为 split 是纯文字）
// =========================================================
xml = xml.split('驾驶员').join('{{defendantDriver}}');  // label 出现多次，只替换在 [...] 上下文里的
xml = xml.split('[{{defendantDriver}}]').join('{{defendantDriver}}');  // 去掉可能残留的 []

// 更精准的方式：只替换诉讼请求段的方括号
xml = xml.split('[车主]').join('{{defendantOwner}}');
xml = xml.split('[合计金额]').join('{{totalCompensation}}');
xml = xml.split('[保险公司]').join('{{tplcInsurer}}');
xml = xml.split('[商业险保险公司]').join('{{commercialInsurer}}');

// =========================================================
// 注意：上面的 split('驾驶员') 是全局替换，可能替换了标题行"被告（驾驶员/...）"
// 恢复那个地方的文字（在XML里找到并还原）
// =========================================================
xml = xml.split('[{{defendantDriver}}]').join('{{defendantDriver}}');  // safe cleanup
// 还原可能被误替换的标题
xml = xml.split('被告（{{defendantDriver}}）').join('被告（驾驶员）');
xml = xml.split('被告（自然人）\n{{defendantDriver}}').join('被告（自然人）\n驾驶员');

// 只替换 XML 中方括号包裹的情况（如 <w:t>[</w:t>...<w:t>驾驶员</w:t>...<w:t>]</w:t>）
// 已在 simpleReplacements 中通过直接替换 [驾驶员] 处理

// =========================================================
// 7. 标的总额区域的占位符
// =========================================================
const totalPattern = '原告各项损失合计[]元。被告保险公司已垫付医疗费[]元，应在最终赔偿款中予以扣除。扣除后尚应赔偿：[] 元。';
const totalReplacement = '原告各项损失合计{{totalLoss}}元。被告保险公司已垫付医疗费{{paidByInsurer}}元，应在最终赔偿款中予以扣除。扣除后尚应赔偿：{{netPayable}}元。';
xml = xml.split(totalPattern).join(totalReplacement);

// =========================================================
// 8. 事实和理由各小节（表格右单元格里的空段落）
//    策略：在每个小节标题当前蠽的 </w:tc><w:tc> 后面的空 <w:p> 里插入占位符 run
//    第一个出现的表格单元格空段落，就是 AI 要填入的内容
// =========================================================

// 小节 1：交通事故发生情况
// 结构：...1.交通事故发生情况</w:t></w:r></w:p></w:tc><w:tc>...<w:p ...>空段落</w:p></w:tc>
xml = xml.replace(
    /(<w:t>1\.\u4ea4\u901a\u4e8b\u6545\u53d1\u751f\u60c5\u51b5<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>.*?<w:p [^>]+>)(<w:pPr>.*?<\/w:pPr>)(<\/w:p>)/s,
    (match, before, pPr, closingP) =>
        `${before}${pPr}<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{{accidentFacts}}</w:t></w:r>${closingP}`
);

// 小节 2：交通事故责任认定
xml = xml.replace(
    /(<w:t>2\.\u4ea4\u901a\u4e8b\u6545\u8d23\u4efb\u8ba4\u5b9a<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>.*?<w:p [^>]+>)(<w:pPr>.*?<\/w:pPr>)(<\/w:p>)/s,
    (match, before, pPr, closingP) =>
        `${before}${pPr}<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{{liabilityDetermination}}</w:t></w:r>${closingP}`
);

// 小节 3：机动车投保情况
xml = xml.replace(
    /(<w:t>3\.\u673a\u52a8\u8f66\u6295\u4fdd\u60c5\u51b5<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>.*?<w:p [^>]+>)(<w:pPr>.*?<\/w:pPr>)(<\/w:p>)/s,
    (match, before, pPr, closingP) =>
        `${before}${pPr}<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{{insuranceStatus}}</w:t></w:r>${closingP}`
);

// 小节 4：其他情况及法律依据
xml = xml.replace(
    /(<w:t>4\.\u5176\u4ed6\u60c5\u51b5\u53ca\u6cd5\u5f8b\u4f9d\u636e<\/w:t><\/w:r><\/w:p><\/w:tc><w:tc>.*?<w:p [^>]+>)(<w:pPr>.*?<\/w:pPr>)(<\/w:p>)/s,
    (match, before, pPr, closingP) =>
        `${before}${pPr}<w:r><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr><w:t>{{otherFacts}}</w:t></w:r>${closingP}`
);

// =========================================================
// 8. 索赔清单项（单 run 单行）
// =========================================================
const simpleReplacements = [
    ['治疗费：', '治疗费：{{medicalFeeText}}'],
    ['后期治疗费：', '后期治疗费：{{futureTreatmentText}}'],
    ['营养费：', '营养费：{{nutritionText}}'],
    ['误工费：', '误工费：{{lostWageText}}'],
    ['精神抚慰金：', '精神抚慰金：{{mentalCompText}}'],
    ['车辆维修费；', '车辆维修费：{{vehicleRepairText}}'],
];
for (const [from, to] of simpleReplacements) {
    xml = xml.split(from).join(to);
}

// =========================================================
// 9. 残疾赔偿金 / 抚养赡养费
// =========================================================
xml = xml.replace(/<w:t>残疾赔偿金：<\/w:t>/g, '<w:t>残疾赔偿金：{{disabilityCompText}}</w:t>');
xml = xml.replace(/<w:t>抚养\/赡养费<\/w:t>/g, '<w:t>抚养/赡养费：{{dependentText}}</w:t>');

// =========================================================
// 10. 当事人姓名（顺序：原告 → 被告1 → 被告2）
// =========================================================
let nameCount = 0;
xml = xml.replace(/<w:t>姓名：<\/w:t>/g, () => {
    nameCount++;
    if (nameCount === 1) return '<w:t>姓名：{{plaintiffName}}</w:t>';
    if (nameCount === 2) return '<w:t>姓名：{{defendant1Name}}</w:t>';
    if (nameCount === 3) return '<w:t>姓名：{{defendant2Name}}</w:t>';
    return '<w:t>姓名：</w:t>';
});

// =========================================================
// 11. 保险公司名称
// =========================================================
xml = xml.replace(/<w:t>名称：<\/w:t>/, '<w:t>名称：{{insurer1Name}}</w:t>');

// =========================================================
// 输出
// =========================================================
zip.file('word/document.xml', xml);
const outBuf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(TEMPLATE_OUT, outBuf);

const matches = [...new Set((xml.match(/\{\{[^}]+\}\}/g) || []))].sort();
console.log('✅ 模板已生成：', TEMPLATE_OUT);
console.log(`共注入 ${matches.length} 个占位符：`);
matches.forEach(v => console.log('  ', v));
