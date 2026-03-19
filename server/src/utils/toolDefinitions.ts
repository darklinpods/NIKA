/**
 * AI 聊天工具声明（Tool Definitions / Function Declarations）
 * 
 * 定义可供 AI Agent 调用的工具 schema。
 * 从 toolExecutor.ts 拆分出来，保持关注点分离。
 */

export const chatTools = [
    {
        functionDeclarations: [
            {
                name: "extract_parties",
                description: "当用户要求提取、扫描或者梳理案件中的当事人信息、案由、案件事实时调用。此工具会自动读取案件证据，提取相关信息并更新案件资料。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: {
                            type: "STRING",
                            description: "当前案件的 ID，必须提供"
                        }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "extract_invoices",
                description: "当用户要求提取案件证据中的发票清单时调用，会自动清点发票种类和金额并合计。仅适用于交通事故类案件。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "generate_evidence_list",
                description: "当用户要求生成证据目录、证据清单、证据列表时调用此工具，会根据案件上传的证据文件自动生成编号证据目录。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "generate_smart_document",
                description: "当用户要求生成起诉状、诉状、智能文书时调用此工具（不包括证据目录），会根据案件证据自动生成 Markdown 格式的起诉状。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "generate_execution_plan",
                description: "Applies when the user asks for a plan, todo list, analysis, or next steps for the case. It analyzes the case facts and creates a list of SubTasks (execution plan).",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" }
                    },
                    required: ["caseId"]
                }
            },
            {
                name: "update_strategy_map",
                description: "当用户要求生成、更新或保存诉讼策略、应对方案、法律分析时调用。将策略内容以Markdown格式保存到案件记录中。",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" },
                        strategyContent: { type: "STRING", description: "Markdown格式的诉讼策略内容" }
                    },
                    required: ["caseId", "strategyContent"]
                }
            },
            {
                name: "update_subtask_status",
                description: "Applies when the user says they have completed or undone a specific task in the execution plan.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        caseId: { type: "STRING" },
                        taskTitleSubstring: { type: "STRING", description: "A substring of the task title to identify which task to update." },
                        isCompleted: { type: "BOOLEAN", description: "True if the task is done, false if it is not done." }
                    },
                    required: ["caseId", "taskTitleSubstring", "isCompleted"]
                }
            }
        ]
    }
];
