import { Router } from 'express';
import { extractComplaintElements, generateComplaintDocx } from '../controllers/complaintController';

const router = Router();

router.post('/extract', extractComplaintElements);
router.post('/generate', generateComplaintDocx);

export default router;
