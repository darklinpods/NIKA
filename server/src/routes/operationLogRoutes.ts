import { Router } from 'express';
import { getOperationLogs, createOperationLog, deleteOperationLog } from '../controllers/operationLogController';

const router = Router();

router.get('/', getOperationLogs);
router.post('/', createOperationLog);
router.delete('/:id', deleteOperationLog);

export default router;
