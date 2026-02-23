import { useCallback } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { BoardData } from '../types';
import { updateCase } from '../services/api';
import { logError } from '../utils/errorHandler';

/**
 * 拖拽交互处理的专属 Hook
 * 负责处理前端展示级别的乐观更新逻辑，并同步看板卡片在不同阶段间的变更到后端API
 */
export const useDragAndDrop = (
    data: BoardData,
    setData: React.Dispatch<React.SetStateAction<BoardData>>
) => {
    // 处理拖拽结束事件的核心逻辑
    const onDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        // 如果没有拖拽到有效区域则取消
        if (!destination) return;

        const start = data.columns[source.droppableId];
        const finish = data.columns[destination.droppableId];

        // 拖回原位，不做任何操作
        if (start === finish && source.index === destination.index) return;

        // 【情景 1：在同一个列内部改变顺序】
        if (start === finish) {
            const newTaskIds = Array.from(start.taskIds);
            newTaskIds.splice(source.index, 1);
            newTaskIds.splice(destination.index, 0, draggableId);

            const newData = {
                ...data,
                columns: {
                    ...data.columns,
                    [start.id]: { ...start, taskIds: newTaskIds },
                },
            };
            setData(newData); // 乐观更新视图状态
        }
        // 【情景 2：跨列拖动 (改变了案件处于的阶段)】
        else {
            const startTaskIds = Array.from(start.taskIds);
            startTaskIds.splice(source.index, 1);

            const finishTaskIds = Array.from(finish.taskIds);
            finishTaskIds.splice(destination.index, 0, draggableId);

            const newData = {
                ...data,
                columns: {
                    ...data.columns,
                    [start.id]: { ...start, taskIds: startTaskIds },
                    [finish.id]: { ...finish, taskIds: finishTaskIds },
                },
            };
            setData(newData); // 乐观更新视图状态
        }

        // 如果案件移动到了不同的列，需要同步状态到后端数据库
        if (start !== finish) {
            // 列ID到状态枚举的映射
            const colToStatus: { [key: string]: string } = {
                'col-1': 'todo',
                'col-2': 'in-progress',
                'col-3': 'done'
            };
            const newStatus = colToStatus[finish.id];

            if (newStatus) {
                try {
                    // 异步调用 API 更新案件状态
                    await updateCase(draggableId, { status: newStatus } as any);
                } catch (e) {
                    logError(e, 'onDragEnd update status');
                }
            }
        }
    }, [data, setData]);

    return { onDragEnd };
};
