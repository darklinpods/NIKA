
export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: string;
}

export interface Party {
  name: string;
  role?: string;
  idNumber?: string;
  address?: string;
  contact?: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  aiSummary?: string;
  claimData?: string;
  caseType: string;
  priority: Priority;
  status: 'todo' | 'in-progress' | 'done';
  tags: string[];
  createdAt: string;
  order: number;
  subTasks: SubTask[];
  clientName: string;
  parties?: Party[];
  courtName?: string;
  documents?: CaseDocument[];
}

export type DocumentCategory = 'input' | 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list' | 'Evidence';

export interface CaseDocument {
  id: string;
  title: string;
  content: string; // Markdown content
  category: DocumentCategory;
  createdAt: string;
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
