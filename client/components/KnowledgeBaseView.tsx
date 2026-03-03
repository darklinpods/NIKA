import React, { useState, useEffect, useRef } from 'react';
import { fetchKnowledgeDocs, uploadKnowledgeDoc, deleteKnowledgeDoc, updateKnowledgeDoc } from '../services/api';
import { FileText, Upload, Trash2, Library, Zap, Loader2, Calendar } from 'lucide-react';
import { translations } from '../translations';
import { formatDateOptional } from '../utils/dateUtils';

interface KnowledgeBaseViewProps {
    theme: 'light' | 'dark';
    lang: 'en' | 'zh';
}

interface KnowledgeDoc {
    id: string;
    title: string;
    category: string;
    createdAt: string;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ theme, lang }) => {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('auto');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const t = translations[lang];

    const categoryMap: Record<string, string> = {
        'auto': lang === 'zh' ? '✨ AI 智能判断' : '✨ AI Auto Category',
        'pleading': (t as any).cat_pleading || 'Pleadings',
        'precedent': (t as any).cat_precedent || 'Precedents',
        'provision': (t as any).cat_provision || 'Provisions',
        'notebook_lm': (t as any).cat_note || 'Notes'
    };

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        setIsLoading(true);
        try {
            const data = await fetchKnowledgeDocs();
            setDocs(data);
        } catch (error) {
            console.error('Failed to load knowledge docs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', selectedCategory);

        try {
            await uploadKnowledgeDoc(formData);
            await loadDocs(); // Refresh
        } catch (error) {
            console.error('Failed to upload doc:', error);
            alert(lang === 'zh' ? '上传失败' : 'Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteKnowledgeDoc(id);
            setDocs(prev => prev.filter(d => d.id !== id));
            setConfirmDeleteId(null);
        } catch (error) {
            console.error('Failed to delete doc:', error);
            alert(lang === 'zh' ? '删除失败' : 'Delete failed');
        }
    };

    const handleUpdateCategory = async (id: string, newCategory: string) => {
        try {
            await updateKnowledgeDoc(id, { category: newCategory });
            setDocs(prev => prev.map(d => d.id === id ? { ...d, category: newCategory } : d));
        } catch (error) {
            console.error('Failed to update category:', error);
            alert(lang === 'zh' ? '更新分类失败' : 'Update category failed');
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{lang === 'zh' ? '全局经验库' : 'Global Knowledge Base'}</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {lang === 'zh'
                            ? '上传 NotebookLM 导出的笔记或类案分析。AI 处理新案件时将自动参考此处的经验。'
                            : 'Upload NotebookLM notes or prior case analysis. AI will reference these guidelines automatically.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`px-4 py-2.5 rounded-xl font-bold border outline-none transition-all ${theme === 'dark'
                            ? 'bg-slate-800 border-white/10 text-slate-200 focus:border-blue-500'
                            : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500 shadow-sm'
                            }`}
                    >
                        {Object.entries(categoryMap).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${theme === 'dark'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            } ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                        {isUploading ? (lang === 'zh' ? '解析中...' : 'Uploading...') : (lang === 'zh' ? '点击上传' : 'Upload')}
                    </button>
                </div>
            </div>

            <div className={`p-8 rounded-3xl border min-h-[400px] ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Library size={20} />
                    </div>
                    <h3 className="text-lg font-bold">{lang === 'zh' ? '可用参考资料' : 'Available References'} ({docs.length})</h3>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center p-12 opacity-50">
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 opacity-50 text-center">
                        <Zap size={48} className={`mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                        <p className="font-medium text-lg mb-2">{lang === 'zh' ? '暂无经验储备' : 'Knowledge base is empty'}</p>
                        <p className="text-sm">
                            {lang === 'zh' ? '点击右上角上传历史案件总结或办案指南，打造您的个人 AI。' : 'Upload case summaries or guidelines to build your personal AI.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docs.map(doc => (
                            <div
                                key={doc.id}
                                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${theme === 'dark'
                                    ? 'bg-slate-900/50 border-white/5 hover:border-blue-500/30 hover:bg-slate-900'
                                    : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-md'
                                    }`}
                            >
                                <div className="flex flex-col min-w-0 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText size={16} className="text-blue-500 shrink-0" />
                                        <span className="font-semibold text-sm truncate" title={doc.title}>
                                            {doc.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                                        <select
                                            value={doc.category}
                                            onChange={(e) => handleUpdateCategory(doc.id, e.target.value)}
                                            className={`bg-blue-500/10 text-blue-500 px-1 py-0.5 rounded outline-none border-none cursor-pointer hover:bg-blue-500/20 transition-colors uppercase tracking-widest`}
                                        >
                                            {Object.entries(categoryMap).filter(([k]) => k !== 'auto').map(([value, label]) => (
                                                <option key={value} value={value} className={theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700'}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="flex items-center gap-1"><Calendar size={12} />{formatDateOptional(doc.createdAt)}</span>
                                    </div>
                                </div>

                                {confirmDeleteId === doc.id ? (
                                    <div className="flex items-center gap-2 relative z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(doc.id);
                                            }}
                                            className="px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                                        >
                                            {lang === 'zh' ? '确认删除' : 'Delete'}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDeleteId(null);
                                            }}
                                            className="p-1 px-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        >
                                            {lang === 'zh' ? '取消' : 'Cancel'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteId(doc.id);
                                        }}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        title={lang === 'zh' ? '删除' : 'Delete'}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
