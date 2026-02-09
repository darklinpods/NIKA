
import { BoardData, Case, SubTask } from './types';

const generateMockLawData = (): BoardData => {
  const cases: { [key: string]: Case } = {};
  const columns: { [key: string]: string[] } = {
    'column-1': [], 
    'column-2': [], 
    'column-3': [], 
    'column-4': [], 
  };

  const caseTypes = [
    { name: '交通事故', weight: 60 },
    { name: '工伤认定', weight: 15 },
    { name: '人身损害', weight: 10 },
    { name: '离婚纠纷', weight: 5 },
    { name: '合同纠纷', weight: 5 },
    { name: '民间借贷', weight: 5 },
  ];

  const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const clientNames = ['张强', '李芳', '王伟', '赵敏', '孙杰', '周红', '吴鹏', '郑洁', '冯涛', '陈晨'];
  const actionPool = ['初步咨询', '搜集证据', '调取监控', '伤残鉴定', '联系保险公司', '发送律师函', '起草起诉状', '法院立案', '预交费', '准备开庭', '质证环节', '庭审陈述'];

  for (let i = 1; i <= 50; i++) {
    const id = `case-${i}`;
    const typeObj = caseTypes.find((_, idx) => {
      let sum = 0;
      for (let j = 0; j <= idx; j++) sum += caseTypes[j].weight;
      return i <= sum;
    }) || caseTypes[0];

    const columnId = i <= 15 ? 'column-1' : i <= 35 ? 'column-2' : i <= 45 ? 'column-3' : 'column-4';
    const client = clientNames[Math.floor(Math.random() * clientNames.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];

    const subTasks: SubTask[] = Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map((_, idx) => ({
      id: `sub-${id}-${idx}`,
      title: actionPool[Math.floor(Math.random() * actionPool.length)],
      isCompleted: Math.random() > 0.6,
      dueDate: new Date(Date.now() + Math.random() * 1000000000).toISOString()
    }));

    cases[id] = {
      id,
      caseNo: `(2024)沪01民初${1000 + i}号`,
      clientName: client,
      title: `${typeObj.name} - ${client}案`,
      description: `针对${typeObj.name}案件的全面代理。当前核心：确保证据链闭环。`,
      priority: i % 10 === 0 ? 'high' : priority,
      tags: [typeObj.name],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      subTasks,
      courtName: '上海市第一中级人民法院'
    };
    columns[columnId].push(id);
  }

  return {
    tasks: cases,
    columns: {
      'column-1': { id: 'column-1', title: '咨询/取证', taskIds: columns['column-1'] },
      'column-2': { id: 'column-2', title: '立案/审理', taskIds: columns['column-2'] },
      'column-3': { id: 'column-3', title: '判决/调解', taskIds: columns['column-3'] },
      'column-4': { id: 'column-4', title: '结案/执行', taskIds: columns['column-4'] },
    },
    columnOrder: ['column-1', 'column-2', 'column-3', 'column-4'],
  };
};

export const INITIAL_DATA: BoardData = generateMockLawData();

export const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
};

export const PRIORITY_BORDER_COLORS = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  high: 'border-l-rose-500',
};
