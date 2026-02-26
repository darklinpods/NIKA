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

        const currentCase = await prisma.case.findUnique({
            where: { id }
        });

        if (!docs || docs.length === 0) {
            return res.json({
                success: true,
                generatedText: "（该案件暂无证据文件，无法由 AI 自动生成初步索赔清单，请手动补充。）"
            });
        }

        const documentsContent = docs.map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`).join('\n');

        const skill = new TrafficAccidentSkill();
        const text = await skill.generateClaimText({
            documentsContent,
            caseTitle: currentCase?.title || '',
            caseDescription: currentCase?.description || '',
            parties: currentCase?.parties || ''
        });

        res.json({
            success: true,
            generatedText: text
        });
    } catch (error: any) {
        console.error("Traffic Accident Generation Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate text." });
    }
};

/**
 * [Generate] 已经不需要 docxtemplater 生成，现在的生成可以是直接把用户编辑好的 Markdown 转换为 Word 
 * （也可以交给前端直接导出，或者后端接收 markdown 然后走 html-to-docx 之类的流程，甚至直接下载 txt/md 伪装 doc）。
 * 为了兼容已有前端并在右侧实现“确认无误，生成起诉状”，我们要把后端的 docxtemplater 去掉，
 * 改为一个使用 markdown 处理或者简单文件流返回的方法。不过先保留这个端点，待会重构它。
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
