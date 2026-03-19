import React, { useState, useCallback } from 'react';
import { api } from '../../services/api';
import { Case } from '../../types';
import { Loader2, Sparkles, Save, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonInfo {
    name: string; gender: string; ethnicity: string;
    idCard: string; phone: string; address: string; resident: string;
}
interface InsurerInfo {
    name: string; address: string; legalRep: string; creditCode: string;
}
interface AccidentInfo {
    time: string; location: string; plate: string; vehicleType: string;
    driverName: string; process: string;
    liabilityAuthority: string; liabilityDocNo: string; liabilityResult: string;
}
interface InsuranceInfo {
    tplcCompany: string; tplcPeriod: string;
    commercialCompany: string; commercialAmount: string; commercialPeriod: string;
}
interface MedicalInfo {
    hospitalizationDays: number; hospitals: string; diagnosis: string; surgeries: string;
    medicalFeeBreakdown: string; medicalFeeTotal: number;
    nursingType: string; nursingDays: number;
    appraisalDate: string; appraisalOrg: string; appraisalDocNo: string;
    disabilityGrade: string; disabilityCoef: number; futureTreatment: string;
    lostWorkDays: number; nursingPeriodDays: number; nutritionDays: number; appraisalFee: number;
}
interface ClaimsInfo {
    medicalFee: number; futureTreatment: number; hospitalFood: number; nutrition: number;
    lostWage: number; nursing: number; disability: number; dependent: number;
    mental: number; traffic: number; vehicleRepair: number; appraisal: number;
    totalLoss: number; paidByInsurer: number; netPayable: number;
}
export interface FactSheet {
    plaintiff: PersonInfo; defendant1: PersonInfo; defendant2: PersonInfo;
    insurer: InsurerInfo; accident: AccidentInfo; insurance: InsuranceInfo;
    medical: MedicalInfo; claims: ClaimsInfo; notes: string;
}

function emptyPerson(): PersonInfo {
    return { name: '', gender: '', ethnicity: '汉族', idCard: '', phone: '', address: '', resident: '' };
}
function emptyFactSheet(): FactSheet {
    return {
        plaintiff: emptyPerson(), defendant1: emptyPerson(), defendant2: emptyPerson(),
        insurer: { name: '', address: '', legalRep: '', creditCode: '' },
        accident: { time: '', location: '', plate: '', vehicleType: '', driverName: '', process: '', liabilityAuthority: '', liabilityDocNo: '', liabilityResult: '' },
        insurance: { tplcCompany: '', tplcPeriod: '', commercialCompany: '', commercialAmount: '', commercialPeriod: '' },
        medical: { hospitalizationDays: 0, hospitals: '', diagnosis: '', surgeries: '', medicalFeeBreakdown: '', medicalFeeTotal: 0, nursingType: '', nursingDays: 0, appraisalDate: '', appraisalOrg: '', appraisalDocNo: '', disabilityGrade: '', disabilityCoef: 0, futureTreatment: '', lostWorkDays: 0, nursingPeriodDays: 0, nutritionDays: 0, appraisalFee: 0 },
        claims: { medicalFee: 0, futureTreatment: 0, hospitalFood: 0, nutrition: 0, lostWage: 0, nursing: 0, disability: 0, dependent: 0, mental: 0, traffic: 0, vehicleRepair: 0, appraisal: 0, totalLoss: 0, paidByInsurer: 0, netPayable: 0 },
        notes: ''
    };
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface SectionProps { title: string; icon?: string; children: React.ReactNode; isDark: boolean; defaultOpen?: boolean; }
const Section: React.FC<SectionProps> = ({ title, icon, children, isDark, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={`rounded-xl border mb-3 overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button onClick={() => setOpen(!open)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-left transition ${isDark ? 'bg-slate-800 hover:bg-slate-700/70 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}>
                {open ? <ChevronDown className="w-4 h-4 opacity-50 shrink-0" /> : <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />}
                {icon && <span>{icon}</span>}
                {title}
            </button>
            {open && <div className="px-4 py-3 grid grid-cols-1 gap-2.5">{children}</div>}
        </div>
    );
};

interface FieldProps { label: string; value: string | number; onChange: (v: string) => void; multiline?: boolean; isDark: boolean; hint?: string; }
const Field: React.FC<FieldProps> = ({ label, value, onChange, multiline, isDark, hint }) => {
    const base = `w-full rounded-lg border px-3 py-1.5 text-sm outline-none transition focus:ring-2 ${isDark ? 'bg-slate-900 border-white/10 text-slate-200 placeholder-slate-600 focus:ring-indigo-500/40 focus:border-indigo-500/60' : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-indigo-400/30 focus:border-indigo-400'}`;
    return (
        <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}{hint && <span className="ml-1 opacity-50 font-normal">{hint}</span>}</label>
            {multiline
                ? <textarea rows={3} className={base + ' resize-none'} value={value} onChange={e => onChange(e.target.value)} />
                : <input className={base} value={value} onChange={e => onChange(e.target.value)} />
            }
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props { task: Case; theme: 'light' | 'dark'; onSaved?: (factSheet: string) => void; }

export const FactSheetEditor: React.FC<Props> = ({ task, theme, onSaved }) => {
    const isDark = theme === 'dark';

    const parseInitial = (): FactSheet => {
        if (task.caseFactSheet) {
            try { return { ...emptyFactSheet(), ...JSON.parse(task.caseFactSheet) }; }
            catch { /* ignore */ }
        }
        return emptyFactSheet();
    };

    const [data, setData] = useState<FactSheet>(parseInitial);
    const [extracting, setExtracting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    const set = useCallback(<K extends keyof FactSheet>(section: K, field: keyof FactSheet[K], value: any) => {
        setData(prev => ({
            ...prev,
            [section]: { ...(prev[section] as any), [field]: value }
        }));
    }, []);

    const handleExtract = async () => {
        if (extracting) return;
        const hasExisting = task.caseFactSheet || JSON.stringify(data) !== JSON.stringify(emptyFactSheet());
        if (hasExisting && !confirm('已有事实摘要数据，确认要用 AI 重新提取并覆盖吗？')) return;
        setExtracting(true);
        try {
            const res = await api.post<any>(`/cases/${task.id}/fact-sheet/extract`, {});
            if (res.factSheet) {
                setData({ ...emptyFactSheet(), ...res.factSheet });
                setStatus('idle');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        } finally {
            setExtracting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/cases/${task.id}/fact-sheet`, { factSheet: data });
            setStatus('saved');
            onSaved?.(JSON.stringify(data));
            setTimeout(() => setStatus('idle'), 3000);
        } catch {
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const p = (field: keyof PersonInfo, section: 'plaintiff' | 'defendant1' | 'defendant2') =>
        <Field key={field} label={
            field === 'name' ? '姓名' : field === 'gender' ? '性别' : field === 'ethnicity' ? '民族' :
                field === 'idCard' ? '身份证号' : field === 'phone' ? '联系电话' :
                    field === 'address' ? '户籍所在地' : '经常居住地'
        } value={data[section][field]} onChange={v => set(section, field, v)} isDark={isDark} />;

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>

            {/* Toolbar */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-slate-50/80'}`}>
                <div className="flex-1">
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        AI 从证据中提取案件关键信息 → 律师审核修改 → 保存作为诉状生成的权威数据源
                    </p>
                    {task.factSheetUpdatedAt && (
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/70' : 'text-amber-600/80'}`}>
                            🕐 案件详情最后更新：{new Date(task.factSheetUpdatedAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleExtract}
                    disabled={extracting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60 transition shadow"
                >
                    {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {extracting ? '提取中…' : 'AI 从证据提取'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow ${status === 'saved' ? 'bg-emerald-600 text-white' : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}
                >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : status === 'saved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? '保存中…' : status === 'saved' ? '已保存' : '保存'}
                </button>
                {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4">

                <Section title="原告信息" icon="👤" isDark={isDark}>
                    {(['name', 'gender', 'ethnicity', 'idCard', 'phone', 'address', 'resident'] as (keyof PersonInfo)[]).map(f => p(f, 'plaintiff'))}
                </Section>

                <Section title="被告1（驾驶员）" icon="🚗" isDark={isDark}>
                    {(['name', 'gender', 'ethnicity', 'idCard', 'phone', 'address', 'resident'] as (keyof PersonInfo)[]).map(f => p(f, 'defendant1'))}
                </Section>

                <Section title="被告2（车主，如与驾驶员同一人可留空）" icon="🔑" isDark={isDark} defaultOpen={false}>
                    {(['name', 'gender', 'ethnicity', 'idCard', 'phone', 'address', 'resident'] as (keyof PersonInfo)[]).map(f => p(f, 'defendant2'))}
                </Section>

                <Section title="保险公司" icon="🏢" isDark={isDark}>
                    <Field label="全称" value={data.insurer.name} onChange={v => set('insurer', 'name', v)} isDark={isDark} />
                    <Field label="住所地" value={data.insurer.address} onChange={v => set('insurer', 'address', v)} isDark={isDark} />
                    <Field label="法定代表人/负责人" value={data.insurer.legalRep} onChange={v => set('insurer', 'legalRep', v)} isDark={isDark} />
                    <Field label="统一社会信用代码" value={data.insurer.creditCode} onChange={v => set('insurer', 'creditCode', v)} isDark={isDark} />
                </Section>

                <Section title="交通事故信息" icon="⚠️" isDark={isDark}>
                    <Field label="事故时间" value={data.accident.time} onChange={v => set('accident', 'time', v)} isDark={isDark} />
                    <Field label="事故地点" value={data.accident.location} onChange={v => set('accident', 'location', v)} isDark={isDark} />
                    <Field label="车牌号" value={data.accident.plate} onChange={v => set('accident', 'plate', v)} isDark={isDark} />
                    <Field label="车辆类型" value={data.accident.vehicleType} onChange={v => set('accident', 'vehicleType', v)} isDark={isDark} />
                    <Field label="事故经过" value={data.accident.process} onChange={v => set('accident', 'process', v)} multiline isDark={isDark} />
                    <Field label="责任认定机关" value={data.accident.liabilityAuthority} onChange={v => set('accident', 'liabilityAuthority', v)} isDark={isDark} />
                    <Field label="认定书编号" value={data.accident.liabilityDocNo} onChange={v => set('accident', 'liabilityDocNo', v)} isDark={isDark} />
                    <Field label="责任认定结论" value={data.accident.liabilityResult} onChange={v => set('accident', 'liabilityResult', v)} multiline isDark={isDark} />
                </Section>

                <Section title="保险情况" icon="📋" isDark={isDark}>
                    <Field label="交强险公司" value={data.insurance.tplcCompany} onChange={v => set('insurance', 'tplcCompany', v)} isDark={isDark} />
                    <Field label="交强险期间" value={data.insurance.tplcPeriod} onChange={v => set('insurance', 'tplcPeriod', v)} isDark={isDark} />
                    <Field label="商业险/统筹公司" value={data.insurance.commercialCompany} onChange={v => set('insurance', 'commercialCompany', v)} isDark={isDark} />
                    <Field label="商业险保额" value={data.insurance.commercialAmount} onChange={v => set('insurance', 'commercialAmount', v)} isDark={isDark} hint="如 300万" />
                    <Field label="商业险期间" value={data.insurance.commercialPeriod} onChange={v => set('insurance', 'commercialPeriod', v)} isDark={isDark} />
                </Section>

                <Section title="医疗 & 鉴定数据" icon="🏥" isDark={isDark}>
                    <Field label="住院天数" value={data.medical.hospitalizationDays} onChange={v => set('medical', 'hospitalizationDays', Number(v) || 0)} isDark={isDark} />
                    <Field label="就诊医院/情况" value={data.medical.hospitals} onChange={v => set('medical', 'hospitals', v)} multiline isDark={isDark} />
                    <Field label="伤情诊断" value={data.medical.diagnosis} onChange={v => set('medical', 'diagnosis', v)} multiline isDark={isDark} />
                    <Field label="手术名称" value={data.medical.surgeries} onChange={v => set('medical', 'surgeries', v)} multiline isDark={isDark} />
                    <Field label="医疗费总额（元）" value={data.medical.medicalFeeTotal} onChange={v => set('medical', 'medicalFeeTotal', Number(v) || 0)} isDark={isDark} />
                    <Field label="各院费用明细" value={data.medical.medicalFeeBreakdown} onChange={v => set('medical', 'medicalFeeBreakdown', v)} multiline isDark={isDark} />
                    <Field label="鉴定委托日期" value={data.medical.appraisalDate} onChange={v => set('medical', 'appraisalDate', v)} isDark={isDark} />
                    <Field label="鉴定机构全称" value={data.medical.appraisalOrg} onChange={v => set('medical', 'appraisalOrg', v)} isDark={isDark} />
                    <Field label="鉴定报告编号" value={data.medical.appraisalDocNo} onChange={v => set('medical', 'appraisalDocNo', v)} isDark={isDark} />
                    <Field label="伤残等级" value={data.medical.disabilityGrade} onChange={v => set('medical', 'disabilityGrade', v)} isDark={isDark} hint="如九级伤残" />
                    <Field label="伤残赔偿系数" value={data.medical.disabilityCoef} onChange={v => set('medical', 'disabilityCoef', Number(v) || 0)} isDark={isDark} hint="如 0.2" />
                    <Field label="后续诊疗项目" value={data.medical.futureTreatment} onChange={v => set('medical', 'futureTreatment', v)} multiline isDark={isDark} />
                    <Field label="误工期（天）" value={data.medical.lostWorkDays} onChange={v => set('medical', 'lostWorkDays', Number(v) || 0)} isDark={isDark} />
                    <Field label="护理期（天）" value={data.medical.nursingPeriodDays} onChange={v => set('medical', 'nursingPeriodDays', Number(v) || 0)} isDark={isDark} />
                    <Field label="营养期（天）" value={data.medical.nutritionDays} onChange={v => set('medical', 'nutritionDays', Number(v) || 0)} isDark={isDark} />
                    <Field label="鉴定费（元）" value={data.medical.appraisalFee} onChange={v => set('medical', 'appraisalFee', Number(v) || 0)} isDark={isDark} />
                </Section>

                <Section title="索赔金额计算" icon="💰" isDark={isDark}>
                    {([
                        ['medicalFee', '治疗费'], ['futureTreatment', '后期治疗费'], ['hospitalFood', '住院伙食补助费'],
                        ['nutrition', '营养费'], ['lostWage', '误工费'], ['nursing', '护理费'],
                        ['disability', '残疾赔偿金'], ['dependent', '被扶养人生活费'], ['mental', '精神抚慰金'],
                        ['traffic', '交通费'], ['vehicleRepair', '车辆维修费'], ['appraisal', '鉴定费'],
                    ] as [keyof ClaimsInfo, string][]).map(([k, label]) => (
                        <Field key={k} label={`${label}（元）`} value={data.claims[k]} onChange={v => set('claims', k, Number(v) || 0)} isDark={isDark} />
                    ))}
                    <div className={`mt-1 rounded-lg p-3 ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                        <Field label="合计损失总额（元）" value={data.claims.totalLoss} onChange={v => set('claims', 'totalLoss', Number(v) || 0)} isDark={isDark} />
                        <Field label="已垫付金额（元）" value={data.claims.paidByInsurer} onChange={v => set('claims', 'paidByInsurer', Number(v) || 0)} isDark={isDark} />
                        <Field label="最终应赔偿（元）" value={data.claims.netPayable} onChange={v => set('claims', 'netPayable', Number(v) || 0)} isDark={isDark} />
                    </div>
                </Section>

                <Section title="律师备注" icon="📝" isDark={isDark} defaultOpen={false}>
                    <Field label="内部备注" value={data.notes} onChange={v => setData(prev => ({ ...prev, notes: v }))} multiline isDark={isDark} />
                </Section>

            </div>
        </div>
    );
};
