import { useCallback } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { BoardData } from '../types';
import { reorderCases } from '../services/api';
import { logError } from '../utils/errorHandler';

// 列ID到状态枚举的映射
const colToStatus: { [key: string]: string } = {
    'col-1': 'todo',
    'col-2': 'in-progress',
    'col-3': 'done'
};

/**
 * 拖拽交互处理的专属 Hook
 * 负责处理前端展示级别的乐观更新逻辑，通过批量重排 API 同步看板顺序到后端
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

        let newFinishTaskIds: string[];
        let newStartTaskIds: string[] | null = null;

        // 【情景 1：在同一个列内部改变顺序】
        if (start === finish) {
            newFinishTaskIds = Array.from(start.taskIds);
            newFinishTaskIds.splice(source.index, 1);
            newFinishTaskIds.splice(destination.index, 0, draggableId);

            const newData = {
                ...data,
                columns: {
                    ...data.columns,
                    [start.id]: { ...start, taskIds: newFinishTaskIds },
                },
            };
            setData(newData); // 乐观更新视图状态
        }
        // 【情景 2：跨列拖动 (改变了案件处于的阶段)】
        else {
            newStartTaskIds = Array.from(start.taskIds);
            newStartTaskIds.splice(source.index, 1);

            newFinishTaskIds = Array.from(finish.taskIds);
            newFinishTaskIds.splice(destination.index, 0, draggableId);

            const newData = {
                ...data,
                columns: {
                    ...data.columns,
                    [start.id]: { ...start, taskIds: newStartTaskIds },
                    [finish.id]: { ...finish, taskIds: newFinishTaskIds },
                },
            };
            setData(newData); // 乐观更新视图状态
        }

        // 构造同步到后端的更新负载
        try {
            const updates: { id: string, order: number, status: string }[] = [];

            // 为目标列的所有任务重新分配 order
            newFinishTaskIds.forEach((id, index) => {
                updates.push({
                    id,
                    order: index,
                    status: colToStatus[finish.id]
                });
            });

            // 如果涉及两列，源列的顺序也需要由于空缺进行收紧（可选，但更健康）
            if (newStartTaskIds) {
                newStartTaskIds.forEach((id, index) => {
                    updates.push({
                        id,
                        order: index,
                        status: colToStatus[start.id]
                    });
                });
            }

            // 批量提交更新到服务器
            await reorderCases(updates);
        } catch (e) {
            logError(e, 'onDragEnd reorder sync');
        }
    }, [data, setData]);

    return { onDragEnd };
};
