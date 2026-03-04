import React from 'react';
import { Scale, BookOpen, MessageSquare, Lightbulb } from 'lucide-react';
import { CaseChatPanel } from '../CaseChatPanel';

interface PanelAnalysisProps {
    task: any;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
}

export const PanelAnalysis: React.FC<PanelAnalysisProps> = ({ task, theme, lang }) => {
    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* 左侧参考资料库 (Mock for Stage 1) */}
            <div className={`w-[45%] flex flex-col border-r ${theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="p-6 border-b">
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                        <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 p-1.5 rounded-lg"><BookOpen size={18} /></span>
                        {lang === 'zh' ? '智能参考推荐' : 'Smart References'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{lang === 'zh' ? '基于案情从经验库自动检索的相关内容' : 'Auto-retrieved from Knowledge Base'}</p>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                    <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Scale size={16} /> {lang === 'zh' ? '适用法律法条' : 'Legal Provisions'}</h4>
                        <div className={`p-4 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-slate-300' : 'bg-white border-slate-200 shadow-sm text-slate-700'}`}>
                            <p className="font-bold mb-1">《中华人民共和国民法典》第一千一百七十九条</p>
                            <p className="text-slate-500 text-xs leading-relaxed">侵害他人造成人身损害的，应当赔偿医疗费、护理费、交通费、营养费、住院伙食补助费等为治疗和康复支出的合理费用，以及因误工减少的收入。</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Lightbulb size={16} /> {lang === 'zh' ? '类案办案心得' : 'Similar Case Notes'}</h4>
                        <div className={`p-4 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-slate-300' : 'bg-white border-slate-200 shadow-sm text-slate-700'}`}>
                            <p className="font-bold mb-1">交通事故垫付费用抗辩策略</p>
                            <p className="text-slate-500 text-xs leading-relaxed">此案被告已部分垫付，需在诉状中明确抵扣数额，以免产生恶意诉讼之嫌。由于原告在本地务工，主张误工费需要搜集近三个月银行流水及劳动合同。</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 右侧律师分析/AI对话区 */}
            <div className={`flex-1 flex flex-col relative`}>
                <div className={`p-6 border-b flex justify-between items-center absolute top-0 left-0 right-0 z-10 backdrop-blur-md ${theme === 'dark' ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`}>
                    <div>
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1.5 rounded-lg"><MessageSquare size={18} /></span>
                            {lang === 'zh' ? '案件推演与策略' : 'Analysis & Strategy'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{lang === 'zh' ? '您可以在这里对案件进行深度的法律对话推演' : 'Deep legal analysis workspace'}</p>
                    </div>
                </div>
                <div className="flex-1 pt-24 overflow-hidden">
                    <CaseChatPanel
                        caseId={task.id}
                        theme={theme}
                        lang={lang}
                    />
                </div>
            </div>
        </div>
    );
};
