# NIKA 架构讨论记录
日期：2026-03-17

## 目标：Totally AI-Based 应用

### 核心理念
UI 只负责展示状态，所有操作都通过 AI 对话触发。

---

## 案件详情页 UI 重构方案

### 新布局（参考设计图）
```
┌──────────────────────────────────────────────────────────────────┐
│  Header: 案件标题 / 案件工作站          [导出文书] [分享案件]  [X] │
├──────────────┬───────────────────────────┬───────────────────────┤
│  左栏        │  中栏（主区域）            │  右栏                 │
│  证据舱      │  AI 研判对话               │  成果中心             │
│              │                            │                       │
│  文件列表    │  对话消息流                │  案件概览卡片         │
│  (已解析标记)│                            │  (证据数量/生成文书数)│
│              │                            │                       │
│  [上传文件]  │                            │  快捷操作按钮:        │
│              │                            │  生成起诉状/证据清单  │
│              │                            │  法律意见书/案情时间轴│
│              │                            │                       │
│              │                            │  已生成文档列表       │
│              │  [底部输入框]              │  (卡片形式，查看详情) │
└──────────────┴───────────────────────────┴───────────────────────┘
```

### 两类资产的区分
1. **案件属性**（左栏）：证据材料、当事人信息、案件基本情况
2. **产出内容**（右栏成果中心）：法律分析、开庭策略、生成文书等

---

## Agent 体系扩展计划（UI 重构完成后执行）

### 现有 Agent
- `RouterAgent` → 路由分发
- `FactAgent` → extract_parties, extract_invoices
- `DraftingAgent` → generate_smart_document
- `StrategyAgent` → generate_execution_plan, update_subtask_status

### 待新增 Agent
| Agent | 职责 | Tools |
|-------|------|-------|
| `EvidenceAgent` | 证据上传后自动分析 | analyze_evidence_doc, classify_document |
| `ClaimsAgent` | 索赔金额计算 | calculate_claims, aggregate_invoices |
| `ReviewAgent` | 审查已生成文书 | review_document, suggest_edits |

### 扩展现有 Agent
- `FactAgent` → 增加 update_case_reason, update_strategy_map
- `DraftingAgent` → 支持多种案件类型模板
- `StrategyAgent` → 增加 update_strategy_map

### 自动化工作流（证据上传后触发）
```
上传证据 → EvidenceAgent.analyze() → FactAgent.extract()
        → ClaimsAgent.calculate()（交通事故）→ StrategyAgent.plan()
        → UI 刷新，左栏数据自动填充
```

---

## Skill 体系标准化计划

每个 Skill 文件定义：赔偿计算规则、必要证据清单、诉状结构模板、常见抗辩策略

```
skills/
  traffic_accident.md   ← 已有
  divorce.md            ← 待建
  labor_dispute.md      ← 待建
  loan_dispute.md       ← 待建
```

---

## 实施顺序
1. ✅ UI 重构（当前步骤）
2. 扩展 Tools（update_strategy_map, calculate_claims）
3. 实现自动链（证据上传后自动触发 Agent）
4. 标准化 Skills（补充其他案件类型）
5. 增加 ReviewAgent
