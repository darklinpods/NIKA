import { Router } from 'express';
import { getTemplateRequirements, guidedDataExtraction, generateFromTemplate } from '../controllers/templateController';

const router = Router();

router.get('/:templateName/requirements', getTemplateRequirements);
router.post('/extract-data', guidedDataExtraction);
router.post('/generate', generateFromTemplate);

export default router;
