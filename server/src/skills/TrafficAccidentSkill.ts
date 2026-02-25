import { aiService } from '../services/aiService';

export interface TrafficAccidentExtractParams {
    documentsContent: string;
}

export interface TrafficAccidentDefaults {
    urbanDisposableIncome: number; // 城镇居民人均可支配收入
    ruralDisposableIncome: number; // 农村居民人均可支配收入
    nutritionFeePerDay: number; // 营养费/天
    hospitalFoodPerDay: number; // 伙食补助/天
    nursingFeePerDay: number; // 护理费/天 (当地标准)
    misusedWorkFeePerDay: number; // 误工费参考标准/天
    deathCompensationBase: number; // 同城镇可支配收入
}

export class TrafficAccidentSkill {
    public static readonly defaults: TrafficAccidentDefaults = {
        // 参考湖北省2024-2025年度标准（示例）
        urbanDisposableIncome: 49164,
        ruralDisposableIncome: 21293,
        nutritionFeePerDay: 50,
        hospitalFoodPerDay: 50,
        nursingFeePerDay: 143.92, // (如居民服务业 52532/365)
        misusedWorkFeePerDay: 181, // (如私营单位 66067/365)
        deathCompensationBase: 49164
    };

    /**
     * 调用大模型，从文档中提取关键计算参数（天数、伤残等级、发票明细等），
     * 而不是让 AI 直接计算金额。
     */
    public async extractParams(params: TrafficAccidentExtractParams) {
        const prompt = `你是一个专业的交通事故律师助手。请根据下方提供的案件所有证据与材料原文，提取出计算赔偿清单必须的“基础变量”。
请严格以 JSON 格式输出，不要包含任何 markdown 代码块标记，不要多余的解释，只要 JSON。

如果找不到某项数据，对应字段可设为 0 或空字符串 ""。千万不要自己去计算乘积，只提取原始"天数"或"等级"或发票原始"总额"。

需要提取的 JSON 字段如下及说明：
{
  "hospitalDays": 0, // 住院天数
  "nutritionDays": 0, // 医嘱建议的营养天数
  "nursingDays": 0, // 医嘱建议的护理天数
  "misusedWorkDays": 0, // 医嘱建议的误工天数
  "disabilityRate": 0, // 伤残赔偿指数（如评定为九级伤残，则填写 0.2；十级填写 0.1；无伤残填 0）
  "disabilityYears": 20, // 伤残赔偿年限，一般为 20。如果受害人60岁以上每满1岁减少1年，75周岁以上为5年。请根据材料中的受害人年龄自行判断填写。
  "medicalFeeActual": 0, // 医疗费发票或收据上体现的实际花费总额（数字）
  "trafficFeeRecommended": 1000, // 交通费据实或按天数估算，可默认给个1000
  "appraisalFee": 0, // 鉴定费发票金额
  "paidByOthers": 0, // 对方或保险公司已经垫付的金额（如果有）
  "accidentFacts": "", // 用一段话简明扼要写出交通事故发生的时间、地点和碰撞经过。
  "liability": "" // 用一句话写明交警支队下发的责任认定情况（如：交警认定被告张三负事故全部责任，原告无责）。
}

[案件证据材料材料原文]
${params.documentsContent}

请直接输出符合上述结构的 JSON 对象。`;

        const response = await aiService.generateContent({
            model: "gemini-2.5-pro", // 这里可以使用更聪明的模型，因为做参数提取需要精确推理
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "{}";
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            console.error("TrafficAccidentSkill JSON Parse Error:", e, "Raw:", text);
            parsed = {};
        }

        return {
            extractedData: parsed,
            defaults: TrafficAccidentSkill.defaults
        };
    }
}
