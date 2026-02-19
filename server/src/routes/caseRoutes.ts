
import { Router } from 'express';
import { getCases, createCase, updateCase, deleteCase } from '../controllers/caseController';

const router = Router();

router.get('/', getCases);
router.post('/', createCase);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

export default router;
