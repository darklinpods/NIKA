import { useState, useCallback, useEffect } from 'react';
import { BoardData, Case, Column } from '../types';
import { INITIAL_DATA } from '../constants';
import { fetchCases } from '../services/api';
import { logError } from '../utils/errorHandler';

/**
 * 将从后端获取的案件列表数组(Case[])转换为看板数据结构(BoardData)
 * 包含：任务字典(tasks)、列字典(columns)和列顺序(columnOrder)
 * @param cases 从API获取的案件列表
 * @returns 格式化后的看板数据
 */
export const transformCasesToBoard = (cases: Case[]): BoardData => {
    const tasks: { [key: string]: Case } = {};
    const columns: { [key: string]: Column } = {
        'col-1': { id: 'col-1', title: '待办', taskIds: [] },
        'col-2': { id: 'col-2', title: '进行中', taskIds: [] },
        'col-3': { id: 'col-3', title: '已完成', taskIds: [] },
    };
    const columnOrder = ['col-1', 'col-2', 'col-3'];

    // 案件状态到看板列ID的映射字典
    const statusMap: { [key: string]: string } = {
        'todo': 'col-1',
        'in-progress': 'col-2',
        'done': 'col-3'
    };

    cases.forEach(c => {
        const caseId = c.id;
        tasks[caseId] = c;
        // 根据案件状态分配到对应的列，如果没有状态或状态不规范则默认分配到'待办'列
        const colId = (c as any).status ? statusMap[(c as any).status] || 'col-1' : 'col-1';
        columns[colId]?.taskIds.push(caseId);
    });

    return { tasks, columns, columnOrder };
};

/**
 * 看板数据管理的自定义 Hook
 * 负责初始化数据流、从服务器拉取数据以及提供全局的数据操作方法和加载状态
 */
export const useBoardData = () => {
    const [data, setData] = useState<BoardData>(INITIAL_DATA); // 存储整个看板状态
    const [isLoading, setIsLoading] = useState(true); // 追踪数据加载状态

    // 异步加载看板数据
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const cases = await fetchCases();
            setData(transformCasesToBoard(cases));
        } catch (error) {
            logError(error, 'loadData'); // 集中捕获错误
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 组件挂载时自动加载数据
    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        data,       // 当前看板数据
        setData,    // 手动更新看板数据（用于乐观更新）
        isLoading,  // 是否正在加载
        loadData    // 重新拉取数据的方法
    };
};
