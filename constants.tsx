/**
 * constants.tsx
 * 常量配置文件，包含初始数据生成和样式配置
 * - 法律案件看板的初始数据
 * - 优先级相关的样式常量
 */

import { BoardData, Case, SubTask } from './types';
/**
 * asdfasd asdf
 */

/**
 * 生成模拟法律案件数据
 * 创建包含50个案件的看板数据，分布在4个处理阶段
 * @returns {BoardData} 返回包含任务和列信息的看板数据
 */
const generateMockLawData = (): BoardData => {
  // 存储所有案件对象
  const cases: { [key: string]: Case } = {};
  
  // 初始化4个工作流列的任务ID数组
  const columns: { [key: string]: string[] } = {
    'column-1': [], // 咨询/取证
    'column-2': [], // 立案/审理
    'column-3': [], // 判决/调解
    'column-4': [], // 结案/执行
  };

  /**
   * 案件类型配置及权重
   * 权重决定了随机生成时该案件类型出现的概率
   */
  const caseTypes = [
    { name: '交通事故', weight: 60 },    // 60% 概率
    { name: '工伤认定', weight: 15 },    // 15% 概率
    { name: '人身损害', weight: 10 },    // 10% 概率
    { name: '离婚纠纷', weight: 5 },     // 5% 概率
    { name: '合同纠纷', weight: 5 },     // 5% 概率
    { name: '民间借贷', weight: 5 },     // 5% 概率
  ];

  // 优先级选项：低、中、高
  const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  
  // 模拟客户名单（用于案件相关人信息）
  const clientNames = ['张强', '李芳', '王伟', '赵敏', '孙杰', '周红', '吴鹏', '郑洁', '冯涛', '陈晨'];
  
  /**
   * 法律程序操作步骤池
   * 为子任务随机分配各类具体的法律工作项
   */
  const actionPool = ['初步咨询', '搜集证据', '调取监控', '伤残鉴定', '联系保险公司', '发送律师函', '起草起诉状', '法院立案', '预交费', '准备开庭', '质证环节', '庭审陈述'];

  // 生成50个模拟法律案件
  for (let i = 1; i <= 50; i++) {
    const id = `case-${i}`;
    
    // 根据权重分布确定案件类型
    const typeObj = caseTypes.find((_, idx) => {
      let sum = 0;
      for (let j = 0; j <= idx; j++) sum += caseTypes[j].weight;
      return i <= sum;
    }) || caseTypes[0];

    // 根据案件序号分配到不同的工作流阶段
    // 1-15: 咨询/取证, 16-35: 立案/审理, 36-45: 判决/调解, 46-50: 结案/执行
    const columnId = i <= 15 ? 'column-1' : i <= 35 ? 'column-2' : i <= 45 ? 'column-3' : 'column-4';
    
    // 随机选择客户名称
    const client = clientNames[Math.floor(Math.random() * clientNames.length)];
    
    // 随机分配优先级
    const priority = priorities[Math.floor(Math.random() * priorities.length)];

    /**
     * 为每个案件生成3-6个子任务
     * 每个子任务代表一个具体的法律工作步骤
     */
    const subTasks: SubTask[] = Array.from({ length: 3 + Math.floor(Math.random() * 4) }).map((_, idx) => ({
      id: `sub-${id}-${idx}`,
      title: actionPool[Math.floor(Math.random() * actionPool.length)], // 从操作池随机选择步骤
      isCompleted: Math.random() > 0.6,  // 60%概率标记为已完成
      dueDate: new Date(Date.now() + Math.random() * 1000000000).toISOString() // 随机生成截止日期
    }));

    // 创建案件对象
    cases[id] = {
      id,
      clientName: client,
      title: `${typeObj.name} - ${client}案`,
      description: `针对${typeObj.name}案件的全面代理。当前核心：确保证据链闭环。`,
      priority: i % 10 === 0 ? 'high' : priority,  // 每10个案件强制为高优先级
      tags: [typeObj.name, '2024年案'],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(), // 随机过去时间
      subTasks,
      courtName: '上海市第一中级人民法院'
    };
    
    // 将案件ID添加到对应列
    columns[columnId].push(id);
  }

  // 返回结构化的看板数据
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

/** 初始看板数据 - 生成50个模拟法律案件 */
export const INITIAL_DATA: BoardData = generateMockLawData();

/**
 * 优先级对应的样式配置
 * 包含底色、文字颜色、边框颜色以及深色模式适配
 */
export const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',       // 低优先级 - 蓝色
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', // 中优先级 - 黄色
  high: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',         // 高优先级 - 红色
};

/**
 * 优先级对应的左边框颜色
 * 用于卡片边框区分优先级
 */
export const PRIORITY_BORDER_COLORS = {
  low: 'border-l-blue-400',    // 低优先级左边框
  medium: 'border-l-amber-400', // 中优先级左边框
  high: 'border-l-rose-500',    // 高优先级左边框
};
