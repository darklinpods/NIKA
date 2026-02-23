/**
 * constants.tsx
 * 常量配置文件，包含初始数据生成和样式配置
 * - 法律案件看板的初始数据
 * - 优先级相关的样式常量
 */

import { BoardData, Case, SubTask } from './types';
import { formatDate } from './utils/dateUtils';
/**
 * asdfasd asdf
 */

const getEmptyBoardData = (): BoardData => {
  return {
    tasks: {},
    columns: {
      'col-1': { id: 'col-1', title: '待办', taskIds: [] },
      'col-2': { id: 'col-2', title: '进行中', taskIds: [] },
      'col-3': { id: 'col-3', title: '已完成', taskIds: [] },
    },
    columnOrder: ['col-1', 'col-2', 'col-3'],
  };
};

export const INITIAL_DATA: BoardData = getEmptyBoardData();
