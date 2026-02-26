import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TrafficAccidentSkill } from '../skills/TrafficAccidentSkill';
import PizZip from 'pizzip';
import process from 'process';
import path from 'path';
import fs from 'fs';

// docxtemplater via require (CJS compat)
const Docxtemplater = require('docxtemplater');

const prisma = new PrismaClient();

/** 解析模板路径（尝试多种相对位置） */
function resolveTemplatePath(relativePath: string): string {
    const candidates = [
        path.resolve(process.cwd(), '..', relativePath),
        path.resolve(process.cwd(), relativePath),
        path.resolve(__dirname, '..', '..', '..', relativePath),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(`Template not found. Tried: ${candidates.join(', ')}`);
}

/**
 * [Extract] 读取案件的所有证据 → AI 生成 Markdown 格式完整诉状（用于左边预览/编辑窗）
 */
export const extractTrafficAccident = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const docs = await prisma.caseDocument.findMany({ where: { caseId: id } });
        const currentCase = await prisma.case.findUnique({ where: { id } });

        if (!docs || docs.length === 0) {
            return res.json({
                success: true,
                generatedText: "（该案件暂无证据文件，无法由 AI 自动生成初步索赔清单，请手动补充。）"
            });
        }

        const documentsContent = docs
            .map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`)
            .join('\n');

        const skill = new TrafficAccidentSkill();
        const text = await skill.generateClaimText({
            documentsContent,
            caseTitle: currentCase?.title || '',
            caseDescription: currentCase?.description || '',
            parties: currentCase?.parties || ''
        });

        res.json({ success: true, generatedText: text });
    } catch (error: any) {
        console.error('[extractTrafficAccident] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate text.' });
    }
};

/**
 * [Generate] AI 生成 22 个模板变量 → docxtemplater 填充 Word 模板 → 返回 .docx 文件流
 * 
 * 请求体可选：
 *   { model?: string }   指定要使用的 AI 模型，默认 gemini-2.5-flash
 */
export const generateTrafficAccidentDocx = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { model } = req.body || {};

        // 1. 读取案件数据
        const docs = await prisma.caseDocument.findMany({ where: { caseId: id } });
        const currentCase = await prisma.case.findUnique({ where: { id } });

        if (!docs || docs.length === 0) {
            return res.status(400).json({ error: '该案件暂无证据文件，无法生成诉状。' });
        }

        const documentsContent = docs
            .map(d => `--- 文档标题: ${d.title} ---\n${d.content}\n`)
            .join('\n');

        // 2. 调用 AI 生成 22 个变量
        console.log('[generateTrafficAccidentDocx] Calling AI to generate template variables...');
        const skill = new TrafficAccidentSkill();
        const variables = await skill.generateDocxVariables({
            documentsContent,
            caseTitle: currentCase?.title || '',
            caseDescription: currentCase?.description || '',
            parties: currentCase?.parties || '',
            model: model || 'gemini-2.5-flash'
        });

        console.log('[generateTrafficAccidentDocx] Variables generated:', Object.keys(variables).join(', '));

        // 3. 读取 Word 模板
        const templateRelPath = 'skills/templates/traffic_accident_with_vars.docx';
        const templatePath = resolveTemplatePath(templateRelPath);
        console.log('[generateTrafficAccidentDocx] Using template:', templatePath);

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);

        // 4. docxtemplater 渲染
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,   // 允许变量里的 \n 换行
            delimiters: { start: '{', end: '}' },   // 单花括号，避免 Word 跨 run 分拆 {{ 导致双重标签错误
        });

        doc.render(variables);

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        // 6. 返回文件流
        const timestamp = Date.now();
        const plaintiffName = variables.plaintiffName || '诉状';
        const safeFileName = `${plaintiffName}_起诉状_${timestamp}.docx`;

        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Length', buf.length);
        res.send(buf);

    } catch (error: any) {
        console.error('[generateTrafficAccidentDocx] Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate Word document.' });
    }
};
