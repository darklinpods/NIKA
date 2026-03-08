// Extraction-related prompts for structured data extraction

export const getPartiesAndFactsExtractionPrompt = (textToAnalyze: string, caseTypesDesc: string) => `
你是一位资深律师助理，拥有丰富的民商事诉讼经验，尤其擅长机动车交通事故责任纠纷案件。
请仔细研读以下【案件全部证据材料】，然后完成三项任务并以纯 JSON 格式输出。

---

## 任务一：精准提取适格诉讼主体

**必须提取的角色（适格诉讼主体）：**
- 原告 / 起诉方 / 委托方 / 受害方
- 被告 / 肇事驾驶员 / 被起诉方
- 第三人（如实际驾驶人、车辆登记所有人等，与驾驶员不同时单独列出）
- 保险公司（交强险/商业险的承保人，须填写全称及统一社会信用代码）
- 法定代理人（当事人未成年/无民事行为能力时）

**绝对不能提取的非当事人（明确排除）：**
- 鉴定机构鉴定人、签名法医、公安鉴定人员
- 医院医生、护士、医疗机构工作人员
- 村委会/居委会/派出所盖章工作人员
- 家庭其他成员（父母、兄弟姐妹、子女等），除非其本身是本案当事人
- 见证人、证明人、担保人
- 保险调查员、评估师
- 交警队办案民警（仅签认定书）

---

## 任务二：撰写详细"事实与理由"叙述

请参照正式民事起诉状"事实与理由"板块的写法，从证据材料中尽可能提取所有可用信息，按以下结构**逐段**撰写，每个编号段落独立成段、内容详尽。没有相关信息的段落可省略，但交通事故案件应尽量覆盖全部段落：

1. **交通事故发生经过**：事故时间（精确到分钟）、地点、涉事车辆（车牌号/车型）、双方行驶方向、碰撞原因、事故经过。
2. **事故责任认定**：出具认定书的机构全称、认定书编号、责任划分结论（全责/主责/次责/同等责任等）。
3. **伤情与治疗经过**：受伤部位与诊断、就诊医院（含住院/门诊天数）、主要手术与治疗措施、各阶段医疗费用明细及合计。
4. **司法鉴定情况**：委托鉴定机构全称、鉴定书编号、鉴定结论（伤残等级/误工期/护理期/营养期/后续治疗费用等）。
5. **机动车投保情况**：驾驶员姓名、车主姓名（与驾驶员不同时）、车牌号、保险公司全称、险种（交强险/商业三者险/统筹险）、保险期间（是否在保内）、保额。
6. **家庭抚养/赡养情况**（如有）：原告/受害人有无需抚养的未成年子女或需赡养的老人，具体人数及关系。
7. **费用垫付情况**：已垫付的费用来源（个人/社保/工伤保险等），尚待主张的部分。
8. **法律依据与诉讼请求概述**：援引的主要法律条文（如《民法典》第?条），诉讼主张的核心请求（可以省略具体金额，重点说明赔偿项目）。

**写作要求：**
- 语言规范，使用第三人称，文风与正式起诉状一致。
- 所有数字、日期、姓名、机构名、证件号码须从证据中精确引用，不得猜测或编造。
- 找不到的信息直接略去该句，不要填写"暂无"或空白占位。
- ★ 非常重要：每个编号段落之间必须用两个换行符（即 \\n\\n）分隔，禁止将所有内容写成连续的一整段。在 JSON 字符串中，换行符请使用转义序列 \\n 表示。

---

## 任务三：判断案由（caseType）

根据证据材料的内容，从以下列表中选择最匹配的案由 value 值；确实无法判断时，选 "general"：

${caseTypesDesc}

---

## 输出格式（严格 JSON，不含任何代码块标记）

重要提示：caseFactsNarrative 的值是一个 JSON 字符串，各段落之间请用 \\n\\n 分隔（即在 JSON 字符串中写两个 \\n）。

{
  "extractedParties": [
    {
      "name": "当事人真实姓名或公司全称",
      "role": "原告|被告|第三人|肇事驾驶员|车主|保险公司|法定代理人",
      "idNumber": "身份证号/统一社会信用代码（没有则留空字符串）",
      "address": "住所地（没有则留空字符串）",
      "contact": "联系电话（没有则留空字符串）"
    }
  ],
  "caseFactsNarrative": "1. **交通事故发生经过**：……\\n\\n2. **事故责任认定**：……\\n\\n3. **伤情与治疗经过**：……（其余段落依此格式，段落间用 \\n\\n 分隔）",
  "caseType": "从支持列表中选择的 value 值，例如 traffic_accident"
}

---

【案件全部证据材料】:
${textToAnalyze}
`;

export const getFactSheetExtractionPrompt = (documentsContent: string, currentCaseTitle: string, currentCaseParties: string, skillContent: string) => `
你是一位资深的交通事故赔偿律师助理。请从以下【案件证据材料】中提取案件关键信息，严格按照指定 JSON 格式输出。

## 要求
1. 所有字段从证据材料中精确提取，不要猜测或编造。
2. 如果某字段在证据中找不到，留空字符串或0。
3. claims 中的金额使用湖北省2025年赔偿标准计算：
   - 城镇居民人均可支配收入：46,987元/年（残疾赔偿金）
   - 农村年平均工资：54,553元/年（误工费）
   - 居民服务业标准：52,532元/年（护理费）
   - 住院伙食补助费：50元/天
   - 营养费：50元/天
4. 所有金额计算必须精确，保留两位小数。
5. 只输出 JSON，不输出任何其他内容。

## 输出格式
\`\`\`json
{
  "plaintiff": {
    "name": "原告姓名",
    "gender": "男或女",
    "ethnicity": "民族，如汉族",
    "idCard": "身份证号",
    "phone": "联系电话",
    "address": "户籍所在地详细地址",
    "resident": "经常居住地（如与户籍相同填：同户籍地）"
  },
  "defendant1": {
    "name": "被告1姓名（驾驶员）",
    "gender": "男或女",
    "ethnicity": "民族",
    "idCard": "身份证号",
    "phone": "联系电话",
    "address": "户籍所在地详细地址",
    "resident": "经常居住地"
  },
  "defendant2": {
    "name": "被告2姓名（车主，如与驾驶员同一人则留空字符串）",
    "gender": "",
    "ethnicity": "",
    "idCard": "",
    "phone": "",
    "address": "",
    "resident": ""
  },
  "insurer": {
    "name": "保险公司全称",
    "address": "保险公司住所地",
    "legalRep": "法定代表人/主要负责人",
    "creditCode": "统一社会信用代码"
  },
  "accident": {
    "time": "事故发生时间，如2025年2月1日17时40分",
    "location": "事故地点",
    "plate": "车牌号",
    "vehicleType": "车辆类型",
    "driverName": "驾驶员姓名",
    "process": "事故经过（完整叙述，100-200字）",
    "liabilityAuthority": "责任认定机关全称",
    "liabilityDocNo": "认定书编号",
    "liabilityResult": "责任认定结论（完整叙述）"
  },
  "insurance": {
    "tplcCompany": "交强险保险公司名称",
    "tplcPeriod": "交强险保险期间",
    "commercialCompany": "商业险/统筹公司名称",
    "commercialAmount": "商业险保额（如300万）",
    "commercialPeriod": "商业险保险期间"
  },
  "medical": {
    "hospitalizationDays": 0,
    "hospitals": "就诊医院列表（如：武汉第八医院住院14天）",
    "diagnosis": "伤情诊断",
    "surgeries": "手术名称（如有）",
    "medicalFeeBreakdown": "各院费用明细（如：665+4.5+...=56052.26元）",
    "medicalFeeTotal": 56052.26,
    "nursingType": "护工类型（雇用护工/家属护理/混合）",
    "nursingDays": 0,
    "appraisalDate": "鉴定委托日期",
    "appraisalOrg": "鉴定机构全称",
    "appraisalDocNo": "鉴定报告编号",
    "disabilityGrade": "伤残等级（如九级伤残）",
    "disabilityCoef": 0.2,
    "futureTreatment": "后续诊疗项目说明",
    "lostWorkDays": 180,
    "nursingPeriodDays": 90,
    "nutritionDays": 90,
    "appraisalFee": 2280
  },
  "claims": {
    "medicalFee": 56052.26,
    "futureTreatment": 15000,
    "hospitalFood": 700,
    "nutrition": 4500,
    "lostWage": 26902,
    "nursing": 12953,
    "disability": 187948,
    "dependent": 0,
    "mental": 10000,
    "traffic": 1200,
    "vehicleRepair": 1800,
    "appraisal": 2280,
    "totalLoss": 336654.26,
    "paidByInsurer": 20000,
    "netPayable": 316654.26
  },
  "notes": "律师备注（可选）"
}
\`\`\`

---

【案件基本信息】
案件标题：${currentCaseTitle}
当事人信息：${currentCaseParties}

---

【案件证据材料】
${documentsContent}

---

请输出完整的 JSON：`;

export const getInvoiceExtractionPrompt = (textToAnalyze: string) => `
你是一名专业律师助理，正在处理一起机动车交通事故责任纠纷案件。
请仔细阅读以下【全部证据材料】，从中找出所有发票、收据、医疗费票据、鉴定费票据等费用凭证，
并将每一张凭证的关键信息整理成一个 JSON 数组。

## 提取规则

- 每张发票/票据提取一个对象。
- 如果一份材料内有多张发票，分别列出每一张。
- 费用类别（category）请从以下类型中选择最匹配的：
  医疗费 / 住院伙食补助费 / 护理费 / 交通费 / 营养费 / 残疾赔偿金 /
  误工费 / 鉴定费 / 辅助器具费 / 精神损害抚慰金 / 其他费用
- 金额（amount）为人民币元的数字，不含"元"字，保留两位小数。
- 如果某项信息确实无法从材料中找到，对应字段填写空字符串（""）或 0（金额字段）。
- 不要编造或推测任何数据。

## 输出格式（严格 JSON 数组，不含任何代码块标记或额外说明）

[
  {
    "date": "2024-12-10",
    "category": "医疗费",
    "description": "武汉市新洲区人民医院-住院医疗费",
    "amount": 12345.67,
    "invoiceNo": "0012345678"
  }
]

---

【全部证据材料】:
${textToAnalyze}
`;