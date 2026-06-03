import { Request, Response } from 'express';
import { caseService } from '../services/caseService';
import { evidenceOrganizerService } from '../services/evidenceOrganizerService';

export const organizeEvidence = async (req: Request, res: Response) => {
    const { id: caseId } = req.params;

    try {
        const caseData = await caseService.getCaseById(caseId);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const parsed = await evidenceOrganizerService.organizeCaseEvidence(caseData);

        res.json({ success: true, data: parsed });
    } catch (error: any) {
        console.error('[organizeEvidence] Error:', error);
        if (error.message === '该案件暂无证据材料，请先上传证据文件') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: '证据整理失败', details: error.message });
    }
};
