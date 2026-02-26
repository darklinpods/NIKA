import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TrafficAccidentSkill } from '../skills/TrafficAccidentSkill';
import PizZip from 'pizzip';
import process from 'process';
import path from 'path';
import fs from 'fs';

// 使用 require 而不是 import，因为 docxtemplater 的 CJS 导出方式和 ts 配合可能有一些麻烦
const Docxtemplater = require('docxtemplater');

const prisma = new PrismaClient();

/**
 * [Extract] 读取案件的所有证据，返回交通事故基础参数及默认基准配置
 */
export const extractTrafficAccident = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // 加载证据
        const docs = await prisma.caseDocument.findMany({
            where: { caseId: id }
        });

        if (!docs || docs.length === 0) {
            // 如果连证据都没有，也照样初始化一个空白表单，只是没有参数可以带进去了。
            const skill = new TrafficAccidentSkill();
            return res.json({
                success: true,
                extractedData: {
                    hospitalDays: 0, nutritionDays: 0, nursingDays: 0, misusedWorkDays: 0,
                    disabilityRate: 0, disabilityYears: 20, medicalFeeActual: 0,
                    trafficFeeRecommended: 1000, appraisalFee: 0, paidByOthers: 0,
                    accidentFacts: "", liability: ""
                },
                defaults: TrafficAccidentSkill.defaults
            });
        }

        const documentsContent = docs.map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`).join('\n');

        const skill = new TrafficAccidentSkill();
        const result = await skill.extractParams({ documentsContent });

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error("Traffic Accident Extract Error:", error);
        res.status(500).json({ error: error.message || "Failed to extract parameters." });
    }
};

/**
 * [Generate] 接收前端完整的 JSON 数据（已经过律师修改并在前端计算好总计金额和每一项的公式说明），
 * 利用 docxtemplater 生成 docx 文档，并作为文件流直接下发。
 */
export const generateTrafficAccidentDocx = async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        // 我们需要把前端传过来的变量塞进 docxtemplater 里

        // 加载模板文件
        const templatePath = path.resolve(process.cwd(), '../templates', '民事起诉状-要素式模版-机动车交通事故责任纠纷.docx');
        const content = fs.readFileSync(templatePath, 'binary');

        const zip = new PizZip(content);

        // 创建模板实例
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true, // 这样前端传递的带有 /n 的多行文本才能保持换行
        });

        // 执行模板替换渲染
        doc.render(payload);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 构建文件名，为了安全和编码兼容，生成一个随机文件名
        const timestamp = new Date().getTime();
        const exportFileName = `traffic_accident_claim_${timestamp}.docx`;

        // 设置下载 Header (二进制流)
        res.setHeader('Content-Disposition', `attachment; filename="${exportFileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buf.length);

        // 结束并发送
        res.send(buf);

    } catch (error: any) {
        console.error("Docx Generate Error:", error);
        // 如果这里出错，最好返回普通 json，但考虑到调用端是一个下载流机制，可能需要在前端特殊处理。
        res.status(500).json({ error: error.message || "Failed to generate Docx." });
    }
};
