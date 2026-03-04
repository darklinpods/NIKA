import React, { useState } from 'react';
import { FileText, Plus, Database, Wand2, Loader, Scan, Users, UploadCloud, Download, Trash2 } from 'lucide-react';
import { Case, CaseDocument } from '../../../types';
import { translations } from '../../../translations';
import { uploadCaseEvidence, api } from '../../../services/api';

interface PanelEvidenceProps {
    task: Case;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
    onTaskChange: (task: Case) => void;
    onAddDocument: (doc: CaseDocument) => void;
    onDeleteDocument: (docId: string) => void;
}

export const PanelEvidence: React.FC<PanelEvidenceProps> = ({
    task,
    theme,
    lang,
    onTaskChange,
    onAddDocument,
    onDeleteDocument
}) => {
    const t = translations[lang] as any;
    const [isUploading, setIsUploading] = useState(false);
    const [isExtractingParties, setIsExtractingParties] = useState(false);

    // Filter to only show raw evidence documents
    const evidenceDocs = task.documents?.filter(d => d.category === 'Evidence') || [];

    const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            // Upload and parse, returns updated case complete with new document and parties
            const response = await uploadCaseEvidence(task.id, formData);
            if (response.success && response.data) {
                onTaskChange(response.data);
            }
        } catch (error) {
            console.error('Failed to upload evidence:', error);
            alert(t.evidenceUploadFailed);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleExtractPartiesFromEvidence = async () => {
        try {
            setIsExtractingParties(true);
            const res = await api.post<{ success: boolean; parties: any[]; caseData: any }>(`/cases/${task.id}/extract-parties`, {});
            if (res.success && res.caseData) {
                onTaskChange({ ...task, parties: res.caseData.parties });
            }
        } catch (error) {
            console.error('Failed to extract parties:', error);
            alert(t.partiesExtractionFailed);
        } finally {
            setIsExtractingParties(false);
        }
    };

    const handleDownload = (doc: CaseDocument) => {
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}-${doc.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={`flex h-full w-full overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* 左侧原始证据区 */}
            <div className={`w-[45%] flex flex-col border-r shadow-sm ${theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1.5 rounded-lg"><Database size={18} /></span>
                            {t.rawEvidence}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{t.uploadClientMaterials}</p>
                    </div>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleUploadEvidence}
                            disabled={isUploading || isExtractingParties}
                        />
                        <button
                            disabled={isUploading}
                            className={`px-4 py-2 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-colors ${isUploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {isUploading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                            {t.importFile}
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                    {evidenceDocs.map(doc => (
                        <div key={doc.id} className={`p-4 rounded-xl border flex items-center gap-3 transition-all group ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-sm'
                            }`}>
                            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg"><FileText size={20} /></div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{doc.title}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDownload(doc)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => onDeleteDocument(doc.id)}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {evidenceDocs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                            <Database size={48} />
                            <p className="text-sm font-medium">{t.noRawEvidence}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 右侧结构化事实区 */}
            <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className={`p-6 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    <div>
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 p-1.5 rounded-lg"><Users size={18} /></span>
                            {t.extractedDetails}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{t.autoExtracted}</p>
                    </div>
                    <button
                        onClick={handleExtractPartiesFromEvidence}
                        disabled={isExtractingParties || isUploading}
                        className={`px-4 py-2 font-bold text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm ${isExtractingParties
                            ? 'bg-slate-200 text-slate-400'
                            : (theme === 'dark' ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200')
                            }`}
                    >
                        {isExtractingParties ? <Loader size={16} className="animate-spin" /> : <Scan size={16} />}
                        {t.rescanEvidenceBtn}
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    {(() => {
                        let partiesArray: any[] = [];
                        try {
                            partiesArray = typeof task.parties === 'string' ? JSON.parse(task.parties) : (Array.isArray(task.parties) ? task.parties : []);
                        } catch { partiesArray = []; }

                        return partiesArray.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4">
                                {partiesArray.map((party, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-2 ${theme === 'dark' ? 'bg-slate-800/80 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                                        <div className="font-bold text-lg flex items-center justify-between mb-1">
                                            <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>{party.name}</span>
                                            {party.role && <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-3 py-1 rounded-full text-xs">{party.role}</span>}
                                        </div>
                                        {party.idNumber && <div className="text-sm font-medium"><span className="text-slate-400 mr-2">{t.idNum}:</span> {party.idNumber}</div>}
                                        {party.contact && <div className="text-sm font-medium"><span className="text-slate-400 mr-2">{t.contact}:</span> {party.contact}</div>}
                                        {party.address && <div className="text-sm font-medium"><span className="text-slate-400 mr-2">{t.address}:</span> <span className="break-words">{party.address}</span></div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                                <Wand2 size={48} />
                                <div className="text-center">
                                    <p className="font-medium text-lg mb-1">{t.noStructuredData}</p>
                                    <p className="text-sm">{t.uploadEvidenceToExtract}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
