export const getComplaintElementsExtractionPrompt = (text: string, templateId: string) => {
  const jsonSchemaStr = `{
  "plaintiffs": [
    {
      "name": "原告姓名",
      "gender": "原告性别，仅填男或女",
      "birth": "原告出生日期，格式如1990年12月10日",
      "nation": "原告民族，例如汉族",
      "job": "原告工作单位",
      "position": "原告职务",
      "phone": "原告联系电话",
      "address": "原告住所地（户籍所在地）",
      "residence": "原告经常居住地",
      "idType": "原告证件类型，如身份证",
      "id": "原告证件号码"
    }
  ],
  "plaintiffName": "第一个原告的姓名（仅第一原告，用于模板主表单）",
  "plaintiffGender": "第一个原告的性别（仅第一原告，用于模板主表单）",
  "plaintiffBirth": "第一个原告的出生日期（仅第一原告，用于模板主表单）",
  "plaintiffNation": "第一个原告的民族（仅第一原告，用于模板主表单）",
  "plaintiffJob": "第一个原告的工作单位（仅第一原告，用于模板主表单）",
  "plaintiffPosition": "第一个原告的职务（仅第一原告，用于模板主表单）",
  "plaintiffPhone": "第一个原告的联系电话（仅第一原告，用于模板主表单）",
  "plaintiffAddress": "第一个原告的住所地（仅第一原告，用于模板主表单）",
  "plaintiffResidence": "第一个原告的经常居住地（仅第一原告，用于模板主表单）",
  "plaintiffIdType": "第一个原告的证件类型（仅第一原告，用于模板主表单）",
  "plaintiffId": "第一个原告的证件号码（仅第一原告，用于模板主表单）",

  "defendantName": "第一被告（自然人）姓名。若只有法人被告，此处留空",
  "defendantGender": "被告性别",
  "defendantBirth": "被告出生日期",
  "defendantNation": "被告民族",
  "defendantJob": "被告工作单位",
  "defendantPosition": "被告职务",
  "defendantPhone": "被告联系电话",
  "defendantAddress": "被告住所地",
  "defendantResidence": "被告经常居住地",
  "defendantIdType": "被告证件类型",
  "defendantId": "被告证件号码",

  "defendant2Name": "第二被告（法人/非法人组织，例如保险公司、有限公司等）。若无留空",
  "defendant2Address": "第二被告住所地",
  "defendant2RegAddress": "第二被告注册地/登记地",
  "defendant2Rep": "第二被告法定代表人/主要负责人",
  "defendant2Position": "第二被告职务",
  "defendant2Phone": "第二被告联系电话",
  "defendant2Id": "第二被告统一社会信用代码",
  "defendant2Type": "类型，如：有限责任公司、股份有限公司等"${
    templateId === 'traffic' ? `,
  "claimsList": "【索赔清单】（具体的费用明细项目，如：医疗费XXX元、误工费XXX元、护理费XXX元等。每项费用单独列出，包含计算公式和金额。绝对不能包含诉讼请求的表述如'请求判令'等）",
  "accidentFacts": "【交通事故发生情况】部分事实与理由",
  "liabilityDetermination": "【交通事故责任认定】部分（如交警认定书上的认定结论）",
  "insuranceStatus": "【机动车投保情况】部分（肇事车辆交强险、商业险分别在哪家保险公司投保等）",
  "otherFacts": "【其他情况及法律依据】（包括伤情、鉴定、具体索赔数额的计算明细或说明等剩余事实。但【绝对禁止】将索赔清单放在这里，上面 claimsList 专属费用明细）"` : `,
  "requestsAndFacts": "完整综合的【诉讼请求】和【事实与理由】段落合并。保持原有的清晰条理和分段。"`
  }}`;

  return `你是一个专业的中国法务人员和数据提取系统。
请仔细阅读下面用户提供的原始、非结构化文本（可能是一份传统格式的长篇《民事起诉状》或者案件事实），并将其信息精准提取并返回一个 JSON 对象。绝对不要输出任何 markdown 代码块标识符，直接输出纯 JSON 即可。

JSON 结构及字段定义如下：
${jsonSchemaStr}

重要说明：
1. 如果有多个原告，请在 "plaintiffs" 数组中为每个原告创建单独的对象，包含完整的个人信息
2. 对于扁平化字段（plaintiffName、plaintiffGender等），只取第一个原告的信息，不要合并多个原告
3. 多个原告的完整信息存储在 "plaintiffs" 数组中，用于生成表格行展开；单个原告信息用于模板主表单
4. 绝对忠实于原文，原文没有提到的字段全部填为空字符串 ""。
5. 当前的目标要素式案由模板为：${templateId}，提取时可以侧重寻找该案由的关键信息。
6. 请严格输出有效的 JSON。

源文本内容如下：
=====
${text}
=====
`;
};