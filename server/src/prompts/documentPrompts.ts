export const getComplaintElementsExtractionPrompt = (text: string, templateId: string) => {
  let jsonSchemaStr: string;

  if (templateId === 'traffic') {
    jsonSchemaStr = `{
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
  "defendants": [
    {
      "name": "被告姓名或名称",
      "gender": "被告性别（自然人填男或女，法人留空）",
      "birth": "被告出生日期（仅自然人）",
      "nation": "被告民族（仅自然人）",
      "job": "被告工作单位",
      "position": "被告职务",
      "phone": "被告联系电话",
      "address": "被告住所地",
      "residence": "被告经常居住地",
      "idType": "证件类型（身份证或统一社会信用代码）",
      "id": "证件号码",
      "type": "被告类型：自然人 或 法人/非法人组织",
      "regAddress": "法人的注册地/登记地（仅法人）",
      "legalRep": "法人的法定代表人/主要负责人（仅法人）"
    }
  ],
  "claimsList": "【索赔清单】（具体的费用明细项目，如：医疗费XXX元、误工费XXX元、护理费XXX元等。每项费用单独成行，包含计算公式和金额。绝对不能包含诉讼请求的表述如'请求判令'等）",
  "accidentFacts": "【交通事故发生情况】部分事实与理由",
  "liabilityDetermination": "【交通事故责任认定】部分（如交警认定书上的认定结论）",
  "insuranceStatus": "【机动车投保情况】部分（肇事车辆交强险、商业险分别在哪家保险公司投保等）",
  "otherFacts": "【其他情况及法律依据】（包括伤情、鉴定、具体索赔数额的计算明细或说明等剩余事实。但【绝对禁止】将索赔清单放在这里，上面 claimsList 专属费用明细）"
}`;
  } else {
    jsonSchemaStr = `{
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
  "defendants": [
    {
      "name": "被告姓名或名称",
      "gender": "被告性别（自然人填男或女，法人留空）",
      "birth": "被告出生日期（仅自然人）",
      "nation": "被告民族（仅自然人）",
      "job": "被告工作单位",
      "position": "被告职务",
      "phone": "被告联系电话",
      "address": "被告住所地",
      "residence": "被告经常居住地",
      "idType": "证件类型（身份证或统一社会信用代码）",
      "id": "证件号码",
      "type": "被告类型：自然人 或 法人/非法人组织",
      "regAddress": "法人的注册地/登记地（仅法人）",
      "legalRep": "法人的法定代表人/主要负责人（仅法人）"
    }
  ],
  "requestsAndFacts": "完整综合的【诉讼请求】和【事实与理由】段落合并。保持原有的清晰条理和分段。"
}`;
  }

  return `你是一个专业的中国法务人员和数据提取系统。
请仔细阅读下面用户提供的原始、非结构化文本（可能是一份传统格式的长篇《民事起诉状》或者案件事实），并将其信息精准提取并返回一个 JSON 对象。绝对不要输出任何 markdown 代码块标识符，直接输出纯 JSON 即可。

JSON 结构及字段定义如下：
${jsonSchemaStr}

【重要说明 - 当事人统一使用数组结构】
1. 所有原告都应该放在 "plaintiffs" 数组中，无论有几个原告
   - 每个原告是一个对象，包含：name, gender, birth, nation, job, position, phone, address, residence, idType, id

2. 所有被告都应该放在 "defendants" 数组中，无论有几个被告
   - 每个被告是一个对象，包含所有字段
   - "type" 字段用来标明 "自然人" 或 "法人/非法人组织"
   - 自然人时：regAddress, legalRep 留空
   - 法人时：birth, nation, gender 留空；regAddress, legalRep 照实填写

3. 绝对忠实于原文，原文没有提到的字段全部填为空字符串 ""

4. 当前的目标案由模板为：${templateId}，提取时可以侧重寻找该案由的关键信息

5. 请严格输出有效的 JSON

源文本内容如下：
=====
${text}
=====
`;
};