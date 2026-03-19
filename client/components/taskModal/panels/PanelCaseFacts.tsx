import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Loader2, FileSearch } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Case } from '../../../types';
import { analyzeEvidence, saveCaseFactSheet } from '../../../services/api';

interface Props {
    task: Case;
    theme: 'light' | 'dark';
    onTaskChange: (task: Case) => void;
}

export const PanelCaseFacts: React.FC<Props> = ({ task, theme, onTaskChange }) => {
    const isDark = theme === 'dark';
    const [content, setContent] = useState(task.caseFactSheet || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // 当外部 task 更新时同步（例如上传证据后后台分析完成并刷新）
    useEffect(() => {
        setContent(task.caseFactSheet || '');
    }, [task.caseFactSheet]);

    const handleAnalyze = async () => {
        try {
            setIsAnalyzing(true);
            const res = await analyzeEvidence(task.id);
            if (res.success) {
                setContent(res.caseFactSheet);
                onTaskChange({ ...task, caseFactSheet: res.caseFactSheet });
            }
        } catch {
            alert('分析失败，请重试');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await saveCaseFactSheet(task.id, content);
            onTaskChange({ ...task, caseFactSheet: content });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            alert('保存失败，请重试');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0
                ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <FileSearch size={15} className="text-blue-500" />
                        <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>案件详情</span>
                    </div>
                    {task.factSheetUpdatedAt && (
                        <span className={`text-xs ${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>
                            🕐 最后更新：{new Date(task.factSheetUpdatedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleAnalyze} disabled={isAnalyzing}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:opacity-50' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50'}`}>
                        {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        {isAnalyzing ? '分析中…' : '重新分析'}
                    </button>
                    <button onClick={handleSave} disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {saved ? '已保存' : '保存'}
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden" data-color-mode={isDark ? 'dark' : 'light'}>
                {content || isAnalyzing ? (
                    <MDEditor
                        value={content}
                        onChange={v => setContent(v || '')}
                        height="100%"
                        preview="live"
                        style={{ height: '100%', borderRadius: 0, border: 'none' }}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                        <FileSearch size={32} className="text-slate-300" />
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            暂无案件详情
                        </p>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            上传证据后系统将自动分析，或点击"重新分析"手动触发
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
