import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Case } from '../../types';
import { Loader2, Download, Table, X } from 'lucide-react';

interface ClaimListGeneratorProps {
    task: Case;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
    onClose: () => void;
}

export const ClaimListGenerator: React.FC<ClaimListGeneratorProps> = ({ task, theme, lang, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // UI Editable state for all fields
    const [formData, setFormData] = useState({
        // 从案件或用户输入
        plaintiffName: task.title.split('诉')[0] || '', // 简单分离原告名称
        defendantName: task.title.split('诉')[1]?.split('纠纷')[0] || '',

        // 基准参数
        urbanDisposableIncome: 49164,
        nutritionFeePerDay: 50,
        hospitalFoodPerDay: 50,
        nursingFeePerDay: 143.92,
        misusedWorkFeePerDay: 181,
        deathCompensationBase: 49164,

        // 提取的天数/发票金额
        hospitalDays: 0,
        nutritionDays: 0,
        nursingDays: 0,
        misusedWorkDays: 0,
        disabilityRate: 0,
        disabilityYears: 20,
        medicalFeeActual: 0,
        trafficFeeRecommended: 1000,
        appraisalFee: 0,
        paidByOthers: 0,

        // 计算总额用的公式文本和最终数值
        // 这些将在 render 中实时算，但我们也要传递给后端模板
        accidentFacts: '',
        liability: ''
    });

    const isDark = theme === 'dark';

    useEffect(() => {
        // Load default params from AI extract
        const fetchParams = async () => {
            setLoading(true);
            try {
                const res = await api.post<any>(`/cases/${task.id}/skills/traffic_accident/extract`);
                if (res.success) {
                    setFormData(prev => ({
                        ...prev,
                        ...res.defaults,
                        ...res.extractedData
                    }));
                }
            } catch (error) {
                console.error("Failed to extract params", error);
            } finally {
                setLoading(false);
            }
        };
        fetchParams();
    }, [task.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    // --- 在渲染时实时计算所有项目 ---
    const calc = {
        medical: formData.medicalFeeActual,
        hospitalFood: formData.hospitalDays * formData.hospitalFoodPerDay,
        nutrition: formData.nutritionDays * formData.nutritionFeePerDay,
        nursing: formData.nursingDays * formData.nursingFeePerDay,
        misusedWork: formData.misusedWorkDays * formData.misusedWorkFeePerDay,
        disability: formData.urbanDisposableIncome * formData.disabilityYears * formData.disabilityRate,
        traffic: formData.trafficFeeRecommended,
        appraisal: formData.appraisalFee,
    };

    const totalClaim = Object.values(calc).reduce((a, b) => a + b, 0);
    const finalAmount = totalClaim - formData.paidByOthers;

    const handleDownload = async () => {
        setGenerating(true);
        try {
            // 组装最终给到 docxtemplater 的渲染对象
            const payload = {
                原告姓名: formData.plaintiffName,
                被告诉求: formData.defendantName,
                // 这里要组装符合 docxtemplater 占位符结构的数据
                // 我们看一下模板里需要哪些变量。由于我们目前没有完整看完 docx 模板的占位符 {变量}, 
                // 我们在这传输一份结构化数据，供模板消费。
                // 暂时假设模板里有以下变量：
                事实发生情况: formData.accidentFacts,
                责任认定: formData.liability,
                医疗费: calc.medical.toFixed(2),
                住院伙食补助费: `${formData.hospitalFoodPerDay}元/天 × ${formData.hospitalDays}天 = ${calc.hospitalFood.toFixed(2)}元`,
                营养费: `${formData.nutritionFeePerDay}元/天 × ${formData.nutritionDays}天 = ${calc.nutrition.toFixed(2)}元`,
                误工费: `${formData.misusedWorkFeePerDay}元/天 × ${formData.misusedWorkDays}天 = ${calc.misusedWork.toFixed(2)}元`,
                护理费: `${formData.nursingFeePerDay}元/天 × ${formData.nursingDays}天 = ${calc.nursing.toFixed(2)}元`,
                残疾赔偿金: `${formData.urbanDisposableIncome}元/年 × ${formData.disabilityYears}年 × ${(formData.disabilityRate * 100).toFixed(0)}% = ${calc.disability.toFixed(2)}元`,
                交通费: `${calc.traffic.toFixed(2)}元`,
                鉴定费: `${calc.appraisal.toFixed(2)}元`,
                总计金额: totalClaim.toFixed(2),
                垫付金额: formData.paidByOthers.toFixed(2),
                最终金额: finalAmount.toFixed(2)
            };

            const response = await fetch(`${api.baseURL}/cases/${task.id}/skills/traffic_accident/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Generate failed");

            // 将二进制流转为 Blob 并下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `交通事故索赔清单_${task.title}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("下载失败！");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/60 backdrop-blur-sm p-6 overflow-hidden">
            <div className={`w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl shadow-2xl relative ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}`}>

                {/* Header */}
                <div className={`flex justify-between items-center p-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold">交互式赔偿计算器 (交通事故)</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-500/20"><X className="w-5 h-5" /></button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 relative">
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <p>AI 正在为您精读所有病历和证据，极速提取天数和参数...</p>
                        </div>
                    )}

                    {/* 基本信息 & 参数配置 */}
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-md font-semibold mb-3 border-b pb-2 border-slate-500/20">基础赔偿标准设置</h3>
                            <div className="space-y-3">
                                <LabelInput label="城镇年人均可支配收入(元)" name="urbanDisposableIncome" value={formData.urbanDisposableIncome} isDark={isDark} onChange={handleChange} />
                                <LabelInput label="日均伙食补助费(元)" name="hospitalFoodPerDay" value={formData.hospitalFoodPerDay} isDark={isDark} onChange={handleChange} />
                                <LabelInput label="日均营养费(元)" name="nutritionFeePerDay" value={formData.nutritionFeePerDay} isDark={isDark} onChange={handleChange} />
                                <LabelInput label="日均误工费基数(元)" name="misusedWorkFeePerDay" value={formData.misusedWorkFeePerDay} isDark={isDark} onChange={handleChange} />
                                <LabelInput label="日均护理费基数(元)" name="nursingFeePerDay" value={formData.nursingFeePerDay} isDark={isDark} onChange={handleChange} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-md font-semibold mb-3 border-b pb-2 border-slate-500/20">AI提取当事人及案情 (可修正)</h3>
                            <div className="space-y-3">
                                <LabelInput label="原告姓名" name="plaintiffName" type="text" value={formData.plaintiffName} isDark={isDark} onChange={handleChange} />
                                <LabelInput label="被告诉求人" name="defendantName" type="text" value={formData.defendantName} isDark={isDark} onChange={handleChange} />
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold opacity-70">事故经过简述</label>
                                    <textarea name="accidentFacts" value={formData.accidentFacts} onChange={handleChange} className={`p-2 rounded-md text-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`} rows={3} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold opacity-70">交警责任划分</label>
                                    <textarea name="liability" value={formData.liability} onChange={handleChange} className={`p-2 rounded-md text-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`} rows={2} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 赔偿明细计算表 */}
                    <div>
                        <h3 className="text-md font-semibold mb-3 border-b pb-2 border-slate-500/20">索赔项目计算表 (实时计算)</h3>
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <th className="py-2 w-1/4">索赔项目</th>
                                    <th className="py-2 w-1/4">AI 提取系数 / 天数</th>
                                    <th className="py-2 w-1/2">自动公式与金额 (元)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <TableRow label="医疗费凭证总额" name="medicalFeeActual" val={formData.medicalFeeActual} isDark={isDark} onChange={handleChange} sumText={`${calc.medical.toFixed(2)}`} />
                                <TableRow label="住院天数" name="hospitalDays" val={formData.hospitalDays} isDark={isDark} onChange={handleChange} sumText={`[伙食费] ${formData.hospitalFoodPerDay} × ${formData.hospitalDays} = ${calc.hospitalFood.toFixed(2)}`} />
                                <TableRow label="营养天数" name="nutritionDays" val={formData.nutritionDays} isDark={isDark} onChange={handleChange} sumText={`[营养费] ${formData.nutritionFeePerDay} × ${formData.nutritionDays} = ${calc.nutrition.toFixed(2)}`} />
                                <TableRow label="误工天数" name="misusedWorkDays" val={formData.misusedWorkDays} isDark={isDark} onChange={handleChange} sumText={`[误工费] ${formData.misusedWorkFeePerDay} × ${formData.misusedWorkDays} = ${calc.misusedWork.toFixed(2)}`} />
                                <TableRow label="护理天数" name="nursingDays" val={formData.nursingDays} isDark={isDark} onChange={handleChange} sumText={`[护理费] ${formData.nursingFeePerDay} × ${formData.nursingDays} = ${calc.nursing.toFixed(2)}`} />
                                <TableRow label="伤残赔偿指数 (如0.1=十级)" name="disabilityRate" val={formData.disabilityRate} step="0.01" isDark={isDark} onChange={handleChange} sumText={`[残疾赔偿] ${formData.urbanDisposableIncome} × ${formData.disabilityYears}年 × ${(formData.disabilityRate * 100).toFixed(0)}% = ${calc.disability.toFixed(2)}`} />
                                <TableRow label="交通费评估" name="trafficFeeRecommended" val={formData.trafficFeeRecommended} isDark={isDark} onChange={handleChange} sumText={`${calc.traffic.toFixed(2)}`} />
                                <TableRow label="鉴定费发票总额" name="appraisalFee" val={formData.appraisalFee} isDark={isDark} onChange={handleChange} sumText={`${calc.appraisal.toFixed(2)}`} />
                            </tbody>
                        </table>

                        <div className={`mt-4 p-4 rounded-xl flex items-center justify-between border ${isDark ? 'bg-slate-800 border-emerald-900' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className="flex flex-col gap-2">
                                <p className="font-semibold">索赔总金额：<span className="text-xl text-emerald-500 font-bold">{totalClaim.toFixed(2)}</span> 元</p>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm">扣除已垫付金额：</label>
                                    <input type="number" name="paidByOthers" value={formData.paidByOthers} onChange={handleChange} className={`w-24 p-1 rounded border text-sm ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-slate-300'}`} />
                                    <span className="text-sm">元</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-80 mb-1">最终应赔偿金额</p>
                                <p className="text-3xl text-emerald-500 font-black">{finalAmount.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-slate-50'} rounded-b-2xl`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-medium transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>取消</button>
                    <button
                        onClick={handleDownload}
                        disabled={generating || loading}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        确认无误，生成起诉状 (Word)
                    </button>
                </div>
            </div>
        </div>
    );
};

const LabelInput = ({ label, name, value, isDark, type = "number", onChange, step = "any" }: any) => (
    <div className="flex items-center justify-between">
        <label className="text-xs font-semibold opacity-70">{label}</label>
        <input
            type={type}
            step={step}
            name={name}
            value={value}
            onChange={onChange}
            className={`w-1/2 p-1.5 px-2 rounded-md text-sm border font-mono text-right ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
        />
    </div>
);

const TableRow = ({ label, name, val, isDark, onChange, sumText, step = "any" }: any) => (
    <tr className={`border-b border-dashed ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <td className="py-3 items-center opacity-80">{label}</td>
        <td className="py-3 items-center">
            <input
                type="number"
                step={step}
                name={name}
                value={val}
                onChange={onChange}
                className={`w-24 p-1 px-2 rounded border text-sm text-center font-mono ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
            />
        </td>
        <td className="py-3 items-center font-mono text-slate-500">{sumText}</td>
    </tr>
)
