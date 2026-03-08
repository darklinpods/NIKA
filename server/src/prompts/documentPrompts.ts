export const getComplaintElementsExtractionPrompt = (text: string, templateId: string) => {
  const jsonSchemaStr = `{
  "plaintiffName": "原告姓名或名称",
  "plaintiffGender": "原告性别，仅填男或女（若原告是公司则留空）",
  "plaintiffBirth": "原告出生日期，格式如1990年12月10日。如果没有则填无",
  "plaintiffNation": "原告民族，例如汉族",
  "plaintiffJob": "原告工作单位",
  "plaintiffPosition": "原告职务",
  "plaintiffPhone": "原告联系电话",
  "plaintiffAddress": "原告住所地（户籍所在地/主要办事机构）",
  "plaintiffResidence": "原告经常居住地",
  "plaintiffIdType": "原告证件类型，如身份证或统一社会信用代码",
  "plaintiffId": "原告证件号码",

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
  "claimsList": "【诉讼请求】栏目（必须在这里原封不动地全部放入原起诉状中以1、2、3等编号列出的索赔清单和所有诉讼请求。千万不能将其放在事实与理由部分）",
  "accidentFacts": "【交通事故发生情况】部分事实与理由",
  "liabilityDetermination": "【交通事故责任认定】部分（如交警认定书上的认定结论）",
  "insuranceStatus": "【机动车投保情况】部分（肇事车辆交强险、商业险分别在哪家保险公司投保等）",
  "otherFacts": "【其他情况及法律依据】（包括伤情、鉴定、具体索赔数额的计算明细或说明等剩余事实。但【绝对禁止】将诉讼请求放在这里，上面 claimsList 专属索赔清单）"` : `,
  "requestsAndFacts": "完整综合的【诉讼请求】和【事实与理由】段落合并。保持原有的清晰条理和分段。"`
  }}`;

  return `你是一个专业的中国法务人员和数据提取系统。
请仔细阅读下面用户提供的原始、非结构化文本（可能是一份传统格式的长篇《民事起诉状》或者案件事实），并将其信息精准提取并返回一个 JSON 对象。绝对不要输出任何 markdown 代码块标识符，直接输出纯 JSON 即可。

JSON 结构及字段定义如下：
${jsonSchemaStr}

要求：
1. 绝对忠实于原文，原文没有提到的字段全部填为空字符串 ""。
2. 当前的目标要素式案由模板为：${templateId}，提取时可以侧重寻找该案由的关键信息。
3. 请严格输出有效的 JSON。

源文本内容如下：
=====
${text}
=====
`;
};