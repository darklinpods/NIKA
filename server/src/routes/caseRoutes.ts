
import { Router } from 'express';
import { getCases, createCase, updateCase, deleteCase, reorderCases } from '../controllers/caseController';

const router = Router();

router.get('/', getCases);
router.post('/', createCase);
router.put('/reorder', reorderCases);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

export default router;
