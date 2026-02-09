
export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
  createdAt: string;
  subTasks: SubTask[];
  clientName: string;
  courtName?: string;
  caseNo: string;
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[]; // Here taskIds actually refers to Case IDs
}

export interface BoardData {
  tasks: { [key: string]: Case };
  columns: { [key: string]: Column };
  columnOrder: string[];
}

export interface AIResponse {
  cases: {
    title: string;
    description: string;
    priority: Priority;
    tags: string[];
    subTasks: string[];
  }[];
}
