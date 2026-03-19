import { Request, Response } from 'express';
import { executeExtractParties } from '../utils/toolExecutor';

/** POST /cases/:id/extract-parties — 从案件已上传的证据中提取当事人信息并更新案件记录 */
export const extractPartiesFromEvidence = async (req: Request, res: Response) => {
    try {
        const { id: caseId } = req.params;
        const result = await executeExtractParties(caseId);
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, parties: result.parties });
    } catch (error: any) {
        console.error('[ExtractParties] Error:', error);
        res.status(500).json({ error: '从证据中提取当事人失败', details: error.message });
    }
};
