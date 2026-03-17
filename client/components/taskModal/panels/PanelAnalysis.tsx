import React, { useState } from 'react';
import { Scale, BookOpen, MessageSquare, Lightbulb, Edit2, Check, X, Plus, Trash2 } from 'lucide-react';
import { CaseChatPanel } from '../CaseChatPanel';
import { t } from '../../../translations';
import { ClaimItem, InvoiceItem, Case } from '../../../types';

interface PanelAnalysisProps {
    task: Case;
    theme: 'light' | 'dark';
    onTaskChange?: (task: Case) => void;
}

export const PanelAnalysis: React.FC<PanelAnalysisProps> = ({ task, theme, onTaskChange }) => {
    
    // Retrieve claims/invoices from caseFactSheet
    let claims: ClaimItem[] = [];
    let invoices: InvoiceItem[] = [];
    try {
        if (task.caseFactSheet) {
            const sheet = JSON.parse(task.caseFactSheet);
            claims = Array.isArray(sheet.claimsList) ? sheet.claimsList : [];
            invoices = Array.isArray(sheet.invoices) ? sheet.invoices : [];
        }
    } catch { 
        claims = [];
        invoices = []; 
    }

    const totalClaimAmount = claims.reduce((sum, c) => sum + (c.amount || 0), 0);
    const hasInvoices = invoices.length > 0;
    const isTrafficAccident = task.caseType === 'traffic_accident';

    const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ClaimItem>>({});

    const handleSaveClaims = (newClaims: ClaimItem[]) => {
        if (onTaskChange) {
            const existing = task.caseFactSheet ? JSON.parse(task.caseFactSheet) : {};
            onTaskChange({
                ...task,
                caseFactSheet: JSON.stringify({ ...existing, claimsList: newClaims })
            });
        }
    };

    const handleAggregateInvoices = () => {
        if (!hasInvoices) return;
        
        // Group invoices by category and sum amounts
        const categoryMap = new Map<string, { amount: number, invoices: string[] }>();
        invoices.forEach(inv => {
            const cat = inv.category || '其他费用';
            if (!categoryMap.has(cat)) categoryMap.set(cat, { amount: 0, invoices: [] });
            const entry = categoryMap.get(cat)!;
            entry.amount += (inv.amount || 0);
            if (inv.invoiceNo) entry.invoices.push(inv.invoiceNo);
        });

        // Convert Map to ClaimItem array
        const newClaims: ClaimItem[] = Array.from(categoryMap.entries()).map(([cat, data]) => ({
            id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category: cat,
            amount: parseFloat(data.amount.toFixed(2)),
            description: data.invoices.length > 0 
                ? `由 ${data.invoices.length} 张发票汇总 (包含发票号: ${data.invoices.slice(0, 3).join(', ')}${data.invoices.length > 3 ? '等' : ''})` 
                : '系统自动汇总'
        }));

        handleSaveClaims(newClaims);
    };

    const handleEditStart = (claim: ClaimItem) => {
        setEditingClaimId(claim.id);
        setEditForm({ ...claim });
    };

    const handleEditSave = () => {
        if (!editingClaimId || !editForm.category) return;
        const newClaims = claims.map(c => c.id === editingClaimId ? { ...c, ...editForm } as ClaimItem : c);
        handleSaveClaims(newClaims);
        setEditingClaimId(null);
    };

    const handleDeleteClaim = (id: string) => {
        handleSaveClaims(claims.filter(c => c.id !== id));
    };

    const handleAddBlankClaim = () => {
        const newClaim = {
            id: `claim-${Date.now()}`,
            category: '新增费用',
            amount: 0,
            description: ''
        };
        handleSaveClaims([...claims, newClaim]);
        handleEditStart(newClaim);
    };

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* 左侧参考资料库 (Mock for Stage 1) */}
            <div className={`w-[45%] flex flex-col border-r ${theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="p-6 border-b">
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                        <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 p-1.5 rounded-lg"><BookOpen size={18} /></span>
                        {t.smartReferences}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{t.autoRetrievedTips}</p>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                    <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Scale size={16} /> {t.legalProvisions}</h4>
                        <div className={`p-4 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-slate-300' : 'bg-white border-slate-200 shadow-sm text-slate-700'}`}>
                            <p className="font-bold mb-1">《中华人民共和国民法典》第一千一百七十九条</p>
                            <p className="text-slate-500 text-xs leading-relaxed">侵害他人造成人身损害的，应当赔偿医疗费、护理费、交通费、营养费、住院伙食补助费等为治疗和康复支出的合理费用，以及因误工减少的收入。</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Lightbulb size={16} /> {t.similarCaseNotes}</h4>
                        <div className={`p-4 rounded-xl text-sm border ${theme === 'dark' ? 'bg-slate-800/50 border-white/5 text-slate-300' : 'bg-white border-slate-200 shadow-sm text-slate-700'}`}>
                            <p className="font-bold mb-1">交通事故垫付费用抗辩策略</p>
                            <p className="text-slate-500 text-xs leading-relaxed">此案被告已部分垫付，需在诉状中明确抵扣数额，以免产生恶意诉讼之嫌。由于原告在本地务工，主张误工费需要搜集近三个月银行流水及劳动合同。</p>
                        </div>
                    </div>

                    {/* Claims Calculator Section (Specific for strategy) */}
                    {(isTrafficAccident || claims.length > 0) && (
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    <Scale size={16} className="text-amber-500" /> 
                                    诉讼请求明细 (索赔试算)
                                </h4>
                                {hasInvoices && (
                                    <button 
                                        onClick={handleAggregateInvoices}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border
                                            ${theme === 'dark' 
                                                ? 'bg-amber-900/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60' 
                                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                                    >
                                        基于发票重新生成明细
                                    </button>
                                )}
                            </div>
                            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/10 bg-slate-800/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className={`px-4 py-2 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/10 bg-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">费用合计</span>
                                    <div className="flex items-center gap-4">
                                        <button onClick={handleAddBlankClaim} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors">
                                            <Plus size={12}/> 添加一项
                                        </button>
                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">¥ {totalClaimAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className={theme === 'dark' ? 'bg-slate-900/50 text-slate-400' : 'bg-slate-50 text-slate-500'}>
                                                <th className="text-left px-3 py-2 font-semibold border-b dark:border-white/5 w-1/3">类别</th>
                                                <th className="text-right px-3 py-2 font-semibold border-b dark:border-white/5">主张金额</th>
                                                <th className="text-center px-3 py-2 font-semibold border-b dark:border-white/5 w-16">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {claims.map((claim, idx) => (
                                                <tr key={claim.id || idx} className={`border-b last:border-0 group ${theme === 'dark' ? 'border-white/5 text-slate-300 hover:bg-slate-800' : 'border-slate-100 text-slate-700 hover:bg-slate-50'}`}>
                                                    {editingClaimId === claim.id ? (
                                                        <td colSpan={3} className="px-3 py-2">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.category || ''} 
                                                                        onChange={e => setEditForm({...editForm, category: e.target.value})}
                                                                        placeholder="费用类别"
                                                                        className={`flex-1 px-2 py-1 text-xs rounded border ${theme === 'dark' ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                                                    />
                                                                    <div className="relative w-32">
                                                                        <span className="absolute left-2 top-1.5 text-slate-400">¥</span>
                                                                        <input 
                                                                            type="number" 
                                                                            value={editForm.amount || 0} 
                                                                            onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value) || 0})}
                                                                            className={`w-full pl-6 pr-2 py-1 text-xs rounded border text-right ${theme === 'dark' ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2 items-center">
                                                                    <input 
                                                                        type="text" 
                                                                        value={editForm.description || ''} 
                                                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                                                        placeholder="备注说明，如发票票号..."
                                                                        className={`flex-1 px-2 py-1 text-xs rounded border ${theme === 'dark' ? 'bg-slate-900 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                                                                    />
                                                                    <button onClick={handleEditSave} className="p-1.5 bg-green-500/10 text-green-600 rounded hover:bg-green-500/20"><Check size={14}/></button>
                                                                    <button onClick={() => setEditingClaimId(null)} className="p-1.5 bg-slate-500/10 text-slate-600 rounded hover:bg-slate-500/20"><X size={14}/></button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td className="px-3 py-2">
                                                                <div className="font-bold">{claim.category}</div>
                                                                <div className="text-[10px] text-slate-500 mt-0.5 max-w-[150px] truncate" title={claim.description}>
                                                                    {claim.description}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-[13px] text-indigo-600 dark:text-indigo-400">
                                                                {claim.amount.toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleEditStart(claim)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={13}/></button>
                                                                    <button onClick={() => handleDeleteClaim(claim.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={13}/></button>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                            {claims.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className="px-3 py-6 text-center text-slate-400 italic">
                                                        暂无索赔明细
                                                        {hasInvoices && <p className="text-[10px] mt-1">发票已提取，请使用汇总功能生成清单</p>}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* 右侧律师分析/AI对话区 */}
            <div className={`flex-1 flex flex-col relative`}>
                <div className={`p-6 border-b flex justify-between items-center absolute top-0 left-0 right-0 z-10 backdrop-blur-md ${theme === 'dark' ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`}>
                    <div>
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1.5 rounded-lg"><MessageSquare size={18} /></span>
                            {t.analysisStrategyTitle}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">{t.analysisStrategyDesc}</p>
                    </div>
                </div>
                <div className="flex-1 pt-24 overflow-hidden">
                    <CaseChatPanel
                        caseId={task.id}
                        theme={theme}
                    />
                </div>
            </div>
        </div>
    );
};
