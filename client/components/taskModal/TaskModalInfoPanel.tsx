import React, { useState } from 'react';
import { Case, Priority } from '../../types';
import { translations } from '../../translations';
import { getPriorityLabel } from '../../constants/priorities';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Edit2, Check, UploadCloud, Users, Loader, Scan } from 'lucide-react';
import { uploadCaseEvidence, api } from '../../services/api';

/**
 * 任务模态框信息面板组件属性
 */
interface TaskModalInfoPanelProps {
  /** 任务数据 */
  task: Case;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
  /** 任务变更回调 */
  onTaskChange: (task: Case) => void;
  /** 将更新的任务冒泡并刷新 (或者我们可以只用 onTaskChange 改变整个 task 对象) */
  onGenerateOverview: () => void;
  /** 是否正在生成概况 */
  isOverviewGenerating: boolean;
}

export const TaskModalInfoPanel: React.FC<TaskModalInfoPanelProps> = ({
  task,
  theme,
  lang,
  onTaskChange,
  onGenerateOverview,
  isOverviewGenerating
}) => {
  const t = translations[lang];
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingParties, setIsExtractingParties] = useState(false);

  const handleExtractPartiesFromEvidence = async () => {
    try {
      setIsExtractingParties(true);
      const res = await api.post<{ success: boolean; parties: any[]; caseData: any }>(`/cases/${task.id}/extract-parties`, {});
      if (res.success && res.caseData) {
        onTaskChange({ ...task, parties: res.caseData.parties });
      }
    } catch (error) {
      console.error('Failed to extract parties:', error);
      alert(lang === 'zh' ? '提取当事人失败，请重试' : 'Failed to extract parties, please retry.');
    } finally {
      setIsExtractingParties(false);
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      // 上传文件并处理 AI 提取
      const response = await uploadCaseEvidence(task.id, formData);

      if (response.success && response.data) {
        // 更新完整的 task，包括新的 parties 数组
        onTaskChange(response.data);
      }
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      alert(lang === 'zh' ? '上传或解析证据失败，请重试' : 'Failed to upload and parse evidence, please try again.');
    } finally {
      setIsUploading(false);
      // 清空 input 使得同一个文件可以被再次选中
      e.target.value = '';
    }
  };

  /**
   * 任务模态框信息面板组件
   * 显示和编辑任务的基本信息
   * 包含标题、优先级、客户名称、描述和AI概况
   */
  return (
    <div className={`w-full p-8 flex flex-col h-full overflow-y-auto custom-scrollbar gap-6 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-50'
      }`}>
      {/* Task Title */}
      <div className="mb-6">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
          {t.taskTitle}
        </label>
        <input
          className={`w-full bg-transparent border-b font-bold text-base py-1 outline-none transition-colors ${theme === 'dark'
            ? 'border-white/10 text-slate-100 focus:border-blue-500'
            : 'border-slate-200 focus:border-blue-500'
            }`}
          value={task.title}
          onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
        />
      </div>

      {/* Priority, Status, and Client Name */}
      <div className="grid grid-cols-4 gap-6 mb-2">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {t.priority}
          </label>
          <select
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.priority}
            onChange={(e) => onTaskChange({ ...task, priority: e.target.value as Priority })}
          >
            <option value="low">{getPriorityLabel('low', lang)}</option>
            <option value="medium">{getPriorityLabel('medium', lang)}</option>
            <option value="high">{getPriorityLabel('high', lang)}</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {(t as any).currentStage || "Current Stage"}
          </label>
          <select
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.status || 'todo'}
            onChange={(e) => onTaskChange({ ...task, status: e.target.value as any })}
          >
            <option value="todo">{t.backlog}</option>
            <option value="in-progress">{t.inProgress}</option>
            <option value="done">{t.done}</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {t.clientName}
          </label>
          <input
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.clientName}
            onChange={(e) => onTaskChange({ ...task, clientName: e.target.value })}
          />
        </div>
      </div>

      {/* Parties List Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-200 dark:border-white/10">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Users size={12} />
            {lang === 'zh' ? '当事人详情' : 'Parties Details'}
          </label>
          <div className="flex items-center gap-2">
            {/* Button 1: Extract from existing evidence in DB */}
            <button
              onClick={handleExtractPartiesFromEvidence}
              disabled={isExtractingParties || isUploading}
              title={lang === 'zh' ? '从已上传的案卷中重新提取当事人' : 'Re-scan uploaded evidence'}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isExtractingParties ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400'
                }`}
            >
              {isExtractingParties ? <Loader size={14} className="animate-spin" /> : <Scan size={14} />}
              {lang === 'zh' ? '从现有案卷提取' : 'Re-scan Evidence'}
            </button>

            {/* Button 2: Upload a new file */}
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleUploadEvidence}
                disabled={isUploading || isExtractingParties}
              />
              <button
                disabled={isUploading || isExtractingParties}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isUploading ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-blue-600 hover:bg-blue-500/10 dark:text-blue-400'
                  }`}
              >
                {isUploading ? <Loader size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                {lang === 'zh' ? '导入证据文件' : 'Import Evidence'}
              </button>
            </div>
          </div>
        </div>

        {/* Case Type */}
        <div className="mb-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {lang === 'zh' ? '案件类型 / 案由' : 'Case Type'}
          </label>
          <select
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
            value={task.caseType || 'general'}
            onChange={(e) => onTaskChange({ ...task, caseType: e.target.value })}
          >
            <option value="general">{lang === 'zh' ? '普通案件' : 'General'}</option>
            <option value="traffic_accident">{lang === 'zh' ? '机动车交通事故责任纠纷' : 'Motor Vehicle Traffic Accident'}</option>
            <option value="contract_dispute">{lang === 'zh' ? '合同纠纷' : 'Contract Dispute'}</option>
            <option value="labor_dispute">{lang === 'zh' ? '劳动争议' : 'Labor Dispute'}</option>
            <option value="loan_dispute">{lang === 'zh' ? '民间借贷纠纷' : 'Loan Dispute'}</option>
          </select>
        </div>

        {(() => {
          let partiesArray: any[] = [];
          try {
            partiesArray = typeof task.parties === 'string' ? JSON.parse(task.parties) : (Array.isArray(task.parties) ? task.parties : []);
          } catch { partiesArray = []; }
          return partiesArray.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {partiesArray.map((party, idx) => (
                <div key={idx} className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${theme === 'dark' ? 'bg-slate-900 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                  <div className="font-bold flex items-center justify-between">
                    <span>{party.name}</span>
                    {party.role && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full text-[9px]">{party.role}</span>}
                  </div>
                  {party.idNumber && <div className="text-slate-500 dark:text-slate-400">{lang === 'zh' ? '证件号' : 'ID'}: {party.idNumber}</div>}
                  {party.contact && <div className="text-slate-500 dark:text-slate-400">{lang === 'zh' ? '联系方式' : 'Contact'}: {party.contact}</div>}
                  {party.address && <div className="text-slate-500 dark:text-slate-400 truncate" title={party.address}>{lang === 'zh' ? '地址' : 'Address'}: {party.address}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              {lang === 'zh' ? '暂无结构化的当事人信息，可上传证据以自动提取。' : 'No structured parties data. Upload evidence to extract automatically.'}
            </div>
          )
        })()}
      </div>

      {/* Description */}
      <div className="flex-1 flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            {t.description}
          </label>
          <button
            onClick={() => setIsEditingDesc(!isEditingDesc)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isEditingDesc
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md'
              : (theme === 'dark' ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200')
              }`}
          >
            {isEditingDesc ? (
              <><Check size={14} /> {lang === 'zh' ? '完成编辑' : 'Done'}</>
            ) : (
              <><Edit2 size={14} /> {lang === 'zh' ? '编辑描述' : 'Edit'}</>
            )}
          </button>
        </div>

        {isEditingDesc ? (
          <textarea
            className={`flex-1 w-full p-5 rounded-2xl text-sm leading-relaxed border outline-none resize-none transition-all shadow-inner ${theme === 'dark'
              ? 'bg-slate-900 border-blue-500/50 text-slate-200'
              : 'bg-white border-blue-300 text-slate-800'
              }`}
            value={task.description}
            onChange={(e) => onTaskChange({ ...task, description: e.target.value })}
            placeholder={lang === 'zh' ? '支持 Markdown 格式编排案件详细情况...' : 'Supports Markdown...'}
          />
        ) : (
          <div className={`flex-1 w-full p-6 rounded-2xl border overflow-y-auto custom-scrollbar ${theme === 'dark'
            ? 'bg-slate-900/40 border-white/10 text-slate-300'
            : 'bg-white border-slate-200 text-slate-700'
            }`}>
            {task.description ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-slate-900 dark:text-white" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3 mt-5 text-slate-800 dark:text-slate-100" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-4 text-slate-800 dark:text-slate-200" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-4 text-sm leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 text-sm space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 text-sm space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-blue-600 dark:text-blue-400" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-2 rounded-r" {...props} />,
                  a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" {...props} />
                }}
              >
                {task.description}
              </ReactMarkdown>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                {lang === 'zh' ? '暂无案件详细描述' : 'No description provided'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Overview Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {t.aiOverview}
          </label>
          <button
            onClick={onGenerateOverview}
            disabled={isOverviewGenerating}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isOverviewGenerating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-500/20'
              } ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
          >
            {isOverviewGenerating ? (
              <>
                <span className="animate-spin">⟳</span>
                {t.summarizing}
              </>
            ) : (
              <>
                {t.generateOverview}
              </>
            )}
          </button>
        </div>
        <div className={`h-40 p-4 rounded-xl border overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'
          }`}>
          {task.aiSummary ? (
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {task.aiSummary}
            </p>
          ) : (
            <p className={`text-xs italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {lang === 'zh' ? '点击上方按钮生成 AI 案件概况' : 'Click the button above to generate AI overview'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
