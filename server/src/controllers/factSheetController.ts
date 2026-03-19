import { Request, Response } from 'express';
import prisma from '../prisma';
import { aiService } from '../services/aiService';
import fs from 'fs';
import path from 'path';
import { getFactSheetExtractionPrompt, getEvidenceAnalysisPrompt } from '../prompts/extractionPrompts';
import { cleanAndParseJsonObject } from '../utils/aiJsonParser';
import { DEFAULT_MODEL } from '../constants';
import { buildDocsContent } from '../utils/toolExecutor';

/**
 * 读取案件所有证据 → AI 生成 Markdown 事实摘要 → 保存到 caseFactSheet
 * 供 uploadEvidence 自动触发 和 POST /analyze-evidence 手动触发共用
 */
export async function runEvidenceAnalysis(caseId: string): Promise<string> {
  const [docs, caseRecord] = await Promise.all([
    prisma.caseDocument.findMany({ where: { caseId, category: 'Evidence' } }),
    prisma.case.findUnique({ where: { id: caseId }, select: { title: true } }),
  ]);
  if (!docs.length) return '';

  const evidenceText = buildDocsContent(docs);
  const prompt = getEvidenceAnalysisPrompt(evidenceText, caseRecord?.title || '');

  const response = await aiService.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const markdown = response.text?.trim() || '';
  if (markdown) {
    await prisma.case.update({ where: { id: caseId }, data: { caseFactSheet: markdown, factSheetUpdatedAt: new Date() } });
  }
  return markdown;
}

/**
 * POST /cases/:id/analyze-evidence
 * 手动重新分析所有证据，更新案件事实摘要
 */
export const analyzeEvidence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const markdown = await runEvidenceAnalysis(id);
    if (!markdown) return res.status(400).json({ error: '该案件暂无证据文件，无法分析。' });
    res.json({ success: true, caseFactSheet: markdown });
  } catch (error: any) {
    console.error('[analyzeEvidence] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze evidence.' });
  }
};

/**
 * POST /cases/:id/fact-sheet/extract
 * 读取案件证据 → AI 提取结构化事实 → 返回 JSON（不自动保存）
 */
export const extractFactSheet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const docs = await prisma.caseDocument.findMany({ where: { caseId: id } });
    const currentCase = await prisma.case.findUnique({ where: { id } });

    if (!docs || docs.length === 0) {
      return res.status(400).json({ error: '该案件暂无证据文件，无法提取。' });
    }

    const documentsContent = buildDocsContent(docs);

    // 读取 Skill 文件中的计算基准
    let skillContent = '';
    try {
      const skillPath = path.resolve(process.cwd(), '..', 'skills', 'traffic_accident.md');
      if (fs.existsSync(skillPath)) {
        skillContent = fs.readFileSync(skillPath, 'utf-8').substring(0, 3000); // 只取前3000字（基准参数）
      }
    } catch { /* ignore */ }

    const prompt = getFactSheetExtractionPrompt(documentsContent, currentCase?.title || '', currentCase?.parties || '', skillContent);

    const model = (req.body && req.body.model) || DEFAULT_MODEL;
    const response = await aiService.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const parsed = cleanAndParseJsonObject<Record<string, any>>(response.text || '{}');
    if (Object.keys(parsed).length === 0) {
      return res.status(500).json({ error: 'AI 返回的 JSON 格式有误，请重试。' });
    }

    res.json({ success: true, factSheet: parsed });

  } catch (error: any) {
    console.error('[extractFactSheet] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract fact sheet.' });
  }
};

/**
 * PUT /cases/:id/fact-sheet
 * 保存律师审核后的案件事实摘要
 */
export const saveFactSheet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { factSheet } = req.body;

    if (!factSheet) {
      return res.status(400).json({ error: 'factSheet 不能为空。' });
    }

    const jsonStr = typeof factSheet === 'string' ? factSheet : JSON.stringify(factSheet);

    await prisma.case.update({
      where: { id },
      data: { caseFactSheet: jsonStr, factSheetUpdatedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[saveFactSheet] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save fact sheet.' });
  }
};
