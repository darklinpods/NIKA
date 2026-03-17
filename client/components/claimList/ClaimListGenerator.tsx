import React, { useState, useEffect } from 'react';
import { api, updateCase } from '../../services/api';
import { Case } from '../../types';
import { Loader2, Download, X, Save, RefreshCw, Edit3, LayoutTemplate } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ClaimListGeneratorProps {
    task: Case;
    theme: 'light' | 'dark';
    onClose: () => void;
}

export const ClaimListGenerator: React.FC<ClaimListGeneratorProps> = ({ task, theme, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Markdown Text Content
    const [markdownText, setMarkdownText] = useState(task.claimData || '');
    const [isEditing, setIsEditing] = useState(task.claimData ? false : true);

    const isDark = theme === 'dark';

    useEffect(() => {
        // If there's no saved claim data, automatically trigger AI extraction
        if (!task.claimData) {
            handleExtractFromAI();
        }
    }, [task.id, task.claimData]);

    const handleExtractFromAI = async () => {
        setLoading(true);
        setIsEditing(true);
        try {
            const res = await api.post<any>(`/cases/${task.id}/skills/traffic_accident/extract`, {});
            if (res.success && res.generatedText) {
                setMarkdownText(res.generatedText);
            }
        } catch (error) {
            console.error("Failed to extract claim text from AI", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!markdownText.trim()) return;
        setSaving(true);
        try {
            const updatedTask = await updateCase(task.id, { claimData: markdownText });
            // Ideally we'd sync this back up to the parent component, but it will be refetched
            // when the task modal is reopened.
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to save claimData", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadWord = async () => {
        setGenerating(true);
        try {
            // Call backend: AI generates 22 variables → docxtemplater fills template → .docx returned
            const response = await fetch(`/api/cases/${task.id}/skills/traffic_accident/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: '下载失败' }));
                alert(`生成 Word 失败：${errData.error || response.statusText}`);
                return;
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('Content-Disposition') || '';
            let fileName = `民事起诉状_${task.title}.docx`;
            const fileNameMatch = disposition.match(/filename\*=UTF-8''(.+)/);
            if (fileNameMatch) {
                fileName = decodeURIComponent(fileNameMatch[1]);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('handleDownloadWord error:', error);
            alert('生成 Word 文档时发生错误，请检查服务器日志。');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-6 overflow-hidden">
            <div className={`w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl shadow-2xl relative ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`}>

                {/* Header */}
                <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-indigo-500" />
                        <h2 className="text-lg font-bold">交互式诉状生成器 (Skill 驱动)</h2>
                        {saving && <span className="ml-4 text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 保存中...</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExtractFromAI}
                            disabled={loading}
                            className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}
                            title="重新要求 AI 阅读证据并生成最新版本的文本"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
                            {loading ? "AI 阅读案卷中..." : "重新由 AI 生成"}
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-500/20"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Body Content - Split Pane or Full View */}
                <div className="flex-1 overflow-hidden flex relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                            <p className="font-medium text-lg">AI 正在根据 Skill 规则精读证据...</p>
                            <p className="text-sm opacity-70 mt-2">自动分析人伤/车损属性，并演算各项赔偿公式</p>
                        </div>
                    )}

                    {/* Left Pane: Markdown Editor */}
                    <div className={`w-1/2 h-full flex flex-col border-r ${isDark ? 'border-white/10' : 'border-slate-200'} transition-all ${isEditing ? 'flex' : 'hidden'}`}>
                        <div className={`p-2 flex justify-between items-center bg-opacity-50 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2 flex items-center gap-1"><Edit3 className="w-3 h-3" /> 文本编辑区 (支持自由修改)</span>
                        </div>
                        <textarea
                            value={markdownText}
                            onChange={(e) => setMarkdownText(e.target.value)}
                            className={`flex-1 w-full p-6 resize-none outline-none font-mono text-sm leading-relaxed ${isDark ? 'bg-slate-900 text-slate-300 placeholder-slate-700' : 'bg-white text-slate-700 placeholder-slate-300'}`}
                            placeholder="AI 生成的诉状大纲会显示在这里，您可以随意增删改..."
                        />
                    </div>

                    {/* Right Pane: Markdown Preview */}
                    <div className={`h-full flex flex-col ${isEditing ? 'w-1/2' : 'w-full'} transition-all`}>
                        <div className={`p-2 flex justify-between items-center bg-opacity-50 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider ml-2">右侧实时预览 (所见即所得)</span>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className={`text-xs px-2 py-1 rounded bg-indigo-500 text-white flex items-center gap-1`}>
                                    <Edit3 className="w-3 h-3" /> 编辑文本
                                </button>
                            )}
                            {isEditing && (
                                <button onClick={handleSave} className={`text-xs px-2 py-1 rounded bg-emerald-500 text-white flex items-center gap-1`}>
                                    <Save className="w-3 h-3" /> 确认并进入全屏预览
                                </button>
                            )}
                        </div>
                        <div className={`flex-1 overflow-y-auto p-8 prose prose-sm max-w-none ${isDark ? 'prose-invert prose-headings:text-slate-100 prose-p:text-slate-300' : 'prose-slate'}`}>
                            {markdownText ? (
                                <ReactMarkdown>{markdownText}</ReactMarkdown>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 opacity-50 flex-col gap-4">
                                    <LayoutTemplate className="w-12 h-12" />
                                    <p>暂无内容，请点击左上角【由 AI 生成】</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'} rounded-b-2xl`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-medium transition text-sm ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}>取消</button>
                    <button
                        onClick={handleDownloadWord}
                        disabled={generating || loading || !markdownText}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition text-sm shadow-lg shadow-indigo-500/20"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                AI 生成中，请稍候…
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                一键导出 Word 起诉状
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
