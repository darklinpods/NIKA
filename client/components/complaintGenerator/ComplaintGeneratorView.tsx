import React, { useState } from 'react';
import { translations } from '../../translations';
import { 
  Scale, FileText, ChevronRight, Loader2, Sparkles, 
  User, FileSignature, ShieldCheck, Download, 
  FileSearch, CopyPlus, ArrowRight, Wand2, Printer
} from 'lucide-react';
import { extractComplaint, generateComplaintFile, fetchCases, downloadTemplate } from '../../services/api';

interface ComplaintGeneratorViewProps {
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
}

interface TemplateOption {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const TEMPLATES: TemplateOption[] = [
  { id: 'traffic', name: '机动车交通事故责任纠纷', icon: <Scale size={18} /> },
  { id: 'loan', name: '民间借贷纠纷', icon: <FileSignature size={18} /> },
  { id: 'labor', name: '劳动争议纠纷', icon: <User size={18} /> },
  { id: 'contract_buy', name: '买卖合同纠纷', icon: <FileText size={18} /> },
  { id: 'divorce', name: '离婚纠纷', icon: <ShieldCheck size={18} /> },
  { id: 'card', name: '信用卡纠纷', icon: <FileText size={18} /> },
];

export const ComplaintGeneratorView: React.FC<ComplaintGeneratorViewProps> = ({ theme, lang }) => {
  const isDark = theme === 'dark';

  const [selectedTemplate, setSelectedTemplate] = useState<string>('traffic');
  
  // Data Source State
  const [sourceType, setSourceType] = useState<'text' | 'case'>('text');
  const [sourceText, setSourceText] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  
  // Generation State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [hasExtracted, setHasExtracted] = useState<boolean>(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);

  // Cases state
  const [casesList, setCasesList] = useState<any[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState<boolean>(false);

  // Editable Form Data (WYSIWYG Model)
  const [formData, setFormData] = useState<Record<string, any>>({
    plaintiffs: [{
      name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: ''
    }],
    defendants: [{
      name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: '',
      type: '自然人', regAddress: '', legalRep: ''
    }],
    
    // Generic fallback
    requestsAndFacts: '',
    
    // Traffic Accident specific
    claimsList: '',
    accidentFacts: '',
    liabilityDetermination: '',
    insuranceStatus: '',
    otherFacts: ''
  });

  React.useEffect(() => {
     if (sourceType === 'case' && casesList.length === 0) {
         setIsLoadingCases(true);
         // @ts-ignore - The structure is known
         fetchCases().then(data => {
            setCasesList(data || []);
         }).catch(console.error).finally(() => setIsLoadingCases(false));
     }
  }, [sourceType]);

  const handleExtract = async () => {
    if (sourceType === 'text' && !sourceText.trim()) return;
    if (sourceType === 'case' && !selectedCaseId) return;

    setIsExtracting(true);
    
    try {
        let extractInput = sourceText;
        if (sourceType === 'case') {
            const targetCase = casesList.find(c => c.id === selectedCaseId);
            if (targetCase) {
                // Structure the data to pass to Gemini
                const caseContextParts = [];
                if (targetCase.title) caseContextParts.push(`案件标题: ${targetCase.title}`);
                if (targetCase.description) caseContextParts.push(`案件描述: ${targetCase.description}`);
                if (targetCase.parties) caseContextParts.push(`当事人信息:\n${targetCase.parties}`);
                if (targetCase.caseFactSheet) caseContextParts.push(`案件卷宗信息(解析后):\n${targetCase.caseFactSheet}`);
                if (targetCase.documents && targetCase.documents.length) {
                     targetCase.documents.forEach((d: any) => caseContextParts.push(`证据/材料 [${d.title}]:\n${d.content}`));
                }
                extractInput = caseContextParts.join('\n\n');
            } else {
                extractInput = `Case ID: ${selectedCaseId}`;
            }
        }

        const res = await extractComplaint(extractInput, selectedTemplate);
        if (res.success && res.data) {
            const newFormData = { ...res.data };
            // Ensure plaintiffs is a non-empty array
            if (!newFormData.plaintiffs || !Array.isArray(newFormData.plaintiffs) || newFormData.plaintiffs.length === 0) {
                newFormData.plaintiffs = [{ name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: '' }];
            }
            // Ensure defendants is a non-empty array
            if (!newFormData.defendants || !Array.isArray(newFormData.defendants) || newFormData.defendants.length === 0) {
                newFormData.defendants = [{ name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: '', type: '自然人', regAddress: '', legalRep: '' }];
            }
            
            setFormData(prev => ({
                ...prev,
                ...newFormData
            }));
            setHasExtracted(true);
        }
    } catch (e: any) {
        console.error(e);
        alert(e.message || 'Error occurred while extracting data.');
    } finally {
        setIsExtracting(false);
    }
  };

  const handleGenerateWord = async () => {
    setIsGeneratingWord(true);
    try {
        await generateComplaintFile(formData, selectedTemplate);
        alert('生成成功！如果浏览器没有自动下载，请检查拦截设置。');
    } catch (e: any) {
        console.error(e);
        alert(e.message || '生成失败，请重试');
    } finally {
        setIsGeneratingWord(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
        await downloadTemplate(selectedTemplate);
    } catch (e: any) {
        console.error(e);
        alert(e.message || '下载模板失败，请重试');
    } finally {
        setIsDownloadingTemplate(false);
    }
  };

  const handleClear = () => {
    setHasExtracted(false);
    setSourceText('');
    setSelectedCaseId('');
  };

  return (
    <div className={`flex h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border shadow-sm ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        
        {/* Left Sidebar - Template Selection */}
        <div className={`w-72 flex flex-col border-r shrink-0 z-10 relative ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
            <div className={`p-5 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="text-indigo-500" size={20} />
                    要素式诉状引擎
                </h2>
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    AI 自动提取关键要素，所见即所得，一键生成各地法院标准立案材料。
                </p>
            </div>
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                {TEMPLATES.map((tpl) => {
                    const isActive = selectedTemplate === tpl.id;
                    return (
                        <button
                            key={tpl.id}
                            onClick={() => setSelectedTemplate(tpl.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                isActive 
                                    ? (isDark ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold' : 'bg-white text-indigo-700 border border-indigo-200 shadow-sm font-bold') 
                                    : (isDark ? 'hover:bg-slate-800 text-slate-300 border border-transparent' : 'hover:bg-white text-slate-600 border border-transparent hover:shadow-sm')
                            }`}
                        >
                            <div className={`${isActive ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                {tpl.icon}
                            </div>
                            <span className="flex-1 text-sm">{tpl.name}</span>
                            {isActive && <ChevronRight size={16} />}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Right Content - Extraction Input OR Paper Preview */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-950/80">
            
            {/* Context Header */}
            {!hasExtracted && (
                <div className={`p-8 border-b ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        源数据输入 
                        <span className="text-sm font-normal text-slate-500 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
                            目标格式: {TEMPLATES.find(t => t.id === selectedTemplate)?.name || '未选择'}
                        </span>
                    </h3>

                    <div className="flex flex-col gap-6 max-w-4xl">
                        {/* Source Toggle */}
                        <div className={`inline-flex p-1.5 rounded-xl self-start ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                            <button
                                onClick={() => setSourceType('text')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    sourceType === 'text' 
                                        ? (isDark ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-700 shadow-md') 
                                        : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                }`}
                            >
                                <CopyPlus size={16} />
                                粘贴传统起诉状
                            </button>
                            <button
                                onClick={() => setSourceType('case')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    sourceType === 'case' 
                                        ? (isDark ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-700 shadow-md') 
                                        : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                }`}
                            >
                                <FileSearch size={16} />
                                从看板调阅已立案卷
                            </button>
                        </div>

                        {/* Source Input Area */}
                        {sourceType === 'text' ? (
                            <textarea
                                value={sourceText}
                                onChange={(e) => setSourceText(e.target.value)}
                                placeholder="请在此处直接粘贴原始的传统长文本格式《民事起诉状》内容，AI 将会自动抓取所需的填表要素..."
                                className={`w-full h-56 px-5 py-4 rounded-xl border-2 outline-none font-sans text-sm resize-none custom-scrollbar transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-indigo-500/50' : 'bg-white border-slate-200 focus:border-indigo-400'
                                }`}
                            />
                        ) : (
                            <div className={`w-full h-56 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors ${
                                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-300'
                            }`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                    <FileSearch size={32} />
                                </div>
                                <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    直接应用“卷宗中心”里已解析好的诉方与被方详情、证据事实，一键映射到该要素模板。
                                </p>
                                <select 
                                    className={`px-4 py-3 min-w-[300px] rounded-xl border outline-none font-bold shadow-sm ${isDark ? 'bg-slate-800 border-white/10 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-200 focus:border-indigo-500'}`}
                                    value={selectedCaseId}
                                    onChange={(e) => setSelectedCaseId(e.target.value)}
                                >
                                    <option value="" disabled>-- {isLoadingCases ? '正在加载看板案件...' : '点击此处选择在办案件'} --</option>
                                    {casesList.map(c => (
                                        <option key={c.id} value={c.id}>✅ [{c.stage || '看板案件'}] {c.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleExtract}
                                disabled={isExtracting || (sourceType === 'text' && !sourceText) || (sourceType === 'case' && !selectedCaseId)}
                                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isExtracting ? (
                                    <><Loader2 size={18} className="animate-spin" /> 正在进行深度语法与事实解析...</>
                                ) : (
                                    <><Wand2 size={18} /> 智能提取并进入预览</>
                                )}
                            </button>
                            <button
                                onClick={handleDownloadTemplate}
                                disabled={isDownloadingTemplate}
                                className="px-8 py-3.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-xl shadow-lg shadow-slate-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="下载当前模板文件"
                            >
                                {isDownloadingTemplate ? (
                                    <><Loader2 size={18} className="animate-spin" /> 下载中...</>
                                ) : (
                                    <><Download size={18} /> 下载模板</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WYSIWYG Editor View (Only visible after extraction) */}
            <div className={`flex-1 overflow-y-auto ${hasExtracted ? 'opacity-100 block' : 'opacity-0 hidden'} custom-scrollbar p-8 transition-opacity duration-500`}>
                
                {/* Editor Toolbar (Sticky) */}
                <div className="max-w-[900px] mx-auto mb-6 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>所见即所得 (WYSIWYG) - 智能编辑区</h4>
                            <p className="text-xs text-slate-500">所有带下划线/边框的空白处均可直接点击修改。排版将如实打印。</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClear}
                            className={`px-4 py-2 font-medium rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            放弃重试
                        </button>
                        <button
                            onClick={handleGenerateWord}
                            disabled={isGeneratingWord}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isGeneratingWord ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                            确认并打印输出 (.docx)
                        </button>
                    </div>
                </div>

                {/* The Paper Document Itself */}
                <div 
                    className="max-w-[850px] mx-auto bg-white text-black p-12 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/10 mb-20 relative selection:bg-blue-200 selection:text-black"
                    style={{ 
                        minHeight: '1122px', // Standard A4 height ratio visually
                        fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' 
                    }}
                >
                    <h1 className="text-3xl font-bold text-center mb-2 tracking-[0.3em] mt-4">民事起诉状</h1>
                    <h2 className="text-2xl font-bold text-center mb-6 tracking-widest">（机动车交通事故责任纠纷）</h2>

                    <div className="border border-black p-4 mb-6 text-[13px] leading-relaxed">
                        <p><strong>说明：</strong></p>
                        <p>为了方便您参加诉讼，保护您的合法权利，请填写本表。</p>
                        <p>1. 起诉时需向人民法院提交证明您身份的材料，如身份证复印件、营业执照复印件等。</p>
                        <p>2. 本表所列内容是您提起诉讼以及人民法院查明案件事实所需，请务必如实填写。</p>
                        <p>3. 本表有些内容可能与您的案件无关，您认为与案件无关的项目可以填“无”或不填。</p>
                        <p>4. 本表 word 电子版填写时，相关栏目可复制粘贴或扩容，但不得改变要素内容、格式设置。</p>
                        <p className="font-bold mt-2 text-center text-sm tracking-widest">★特别提示★</p>
                        <p className="text-justify px-4">
                            诉讼参加人应遵守诚信原则如实认真填写表格。<br/>
                            如果诉讼参加人违反有关规定，虚假诉讼、恶意诉讼、滥用诉权，人民法院将视违法情形依法追究责任。
                        </p>
                    </div>

                    <h3 className="text-xl font-bold text-center mb-4 tracking-[0.5em]">当事人信息</h3>

                    <table className="w-full border-collapse border border-black mb-8 text-[14px] leading-tight pattern-paper-table">
                        <tbody>
                            {/* Plaintiffs */}
                            {formData.plaintiffs.map((plaintiff: any, index: number) => (
                            <tr key={`plaintiff-${index}`}>
                                <td className="border border-black p-3 w-1/4 align-top">
                                    原告（自然人）
                                    {index === 0 && (
                                        <div className="mt-2 flex opacity-30 hover:opacity-100 transition-opacity justify-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newPlaintiffs = [...formData.plaintiffs, { name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: '' }];
                                                    setFormData({...formData, plaintiffs: newPlaintiffs});
                                                }}
                                                className="text-[10px] bg-slate-100 border border-slate-300 font-sans px-2 py-0.5 rounded shadow-sm hover:bg-slate-200"
                                            >
                                                + 添加原告
                                            </button>
                                        </div>
                                    )}
                                    {index > 0 && (
                                        <div className="mt-2 flex opacity-30 hover:opacity-100 transition-opacity justify-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newPlaintiffs = [...formData.plaintiffs];
                                                    newPlaintiffs.splice(index, 1);
                                                    setFormData({...formData, plaintiffs: newPlaintiffs});
                                                }}
                                                className="text-[10px] bg-red-50 text-red-600 border border-red-200 font-sans px-2 py-0.5 rounded shadow-sm hover:bg-red-100"
                                            >
                                                - 删除此人
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="border border-black p-3 w-3/4 space-y-2.5 hover:bg-yellow-50/50 transition-colors">
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">姓名：</span>
                                        <input 
                                            value={plaintiff.name} 
                                            onChange={e => {
                                                const newPlaintiffs = [...formData.plaintiffs];
                                                newPlaintiffs[index].name = e.target.value;
                                                setFormData({...formData, plaintiffs: newPlaintiffs});
                                            }} 
                                            className="font-bold flex-1 border-b border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" 
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">性别：</span>
                                        <div className="flex-1 flex gap-6 items-center">
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name={`plaintiffGender-${index}`} checked={plaintiff.gender === '男'} onChange={() => {
                                                    const newPlaintiffs = [...formData.plaintiffs];
                                                    newPlaintiffs[index].gender = '男';
                                                    setFormData({...formData, plaintiffs: newPlaintiffs});
                                                }} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>男
                                            </label>
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name={`plaintiffGender-${index}`} checked={plaintiff.gender === '女'} onChange={() => {
                                                    const newPlaintiffs = [...formData.plaintiffs];
                                                    newPlaintiffs[index].gender = '女';
                                                    setFormData({...formData, plaintiffs: newPlaintiffs});
                                                }} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>女
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">出生日期：</span>
                                            <input value={plaintiff.birth} onChange={e => {
                                                const newPlaintiffs = [...formData.plaintiffs];
                                                newPlaintiffs[index].birth = e.target.value;
                                                setFormData({...formData, plaintiffs: newPlaintiffs});
                                            }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">民族：</span>
                                            <input value={plaintiff.nation} onChange={e => {
                                                const newPlaintiffs = [...formData.plaintiffs];
                                                newPlaintiffs[index].nation = e.target.value;
                                                setFormData({...formData, plaintiffs: newPlaintiffs});
                                            }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">工作单位：</span>
                                            <input value={plaintiff.job} onChange={e => {
                                                const newPlaintiffs = [...formData.plaintiffs];
                                                newPlaintiffs[index].job = e.target.value;
                                                setFormData({...formData, plaintiffs: newPlaintiffs});
                                            }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">职务：</span>
                                            <input value={plaintiff.position} onChange={e => {
                                                const newPlaintiffs = [...formData.plaintiffs];
                                                newPlaintiffs[index].position = e.target.value;
                                                setFormData({...formData, plaintiffs: newPlaintiffs});
                                            }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">联系电话：</span>
                                        <input value={plaintiff.phone} onChange={e => {
                                            const newPlaintiffs = [...formData.plaintiffs];
                                            newPlaintiffs[index].phone = e.target.value;
                                            setFormData({...formData, plaintiffs: newPlaintiffs});
                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[140px] shrink-0">住所地(户籍所在地)：</span>
                                        <input value={plaintiff.address} onChange={e => {
                                            const newPlaintiffs = [...formData.plaintiffs];
                                            newPlaintiffs[index].address = e.target.value;
                                            setFormData({...formData, plaintiffs: newPlaintiffs});
                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">经常居住地：</span>
                                        <input value={plaintiff.residence} onChange={e => {
                                            const newPlaintiffs = [...formData.plaintiffs];
                                            newPlaintiffs[index].residence = e.target.value;
                                            setFormData({...formData, plaintiffs: newPlaintiffs});
                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                </td>
                            </tr>
                            ))}
                             {/* Defendants */}
                            {formData.defendants.map((defendant: any, index: number) => {
                                const isOrganization = defendant.type === '法人/非法人组织' || defendant.type === '法人' || defendant.type === '非法人组织';
                                
                                return (
                                <tr key={`defendant-${index}`}>
                                    <td className="border border-black p-3 w-1/4 align-top leading-relaxed relative">
                                        <div className="flex flex-col gap-2">
                                            <div className="font-bold flex items-center justify-between">
                                                <span>被告 {index + 1}</span>
                                                <select 
                                                    value={isOrganization ? 'organization' : 'person'}
                                                    onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        if (e.target.value === 'organization') {
                                                            newDefs[index] = { ...newDefs[index], type: '法人/非法人组织', birth: '', nation: '', gender: '' };
                                                        } else {
                                                            newDefs[index] = { ...newDefs[index], type: '自然人', regAddress: '', legalRep: '' };
                                                        }
                                                        setFormData({...formData, defendants: newDefs});
                                                    }}
                                                    className="p-1 border bg-white rounded text-xs outline-none"
                                                >
                                                    <option value="person">自然人</option>
                                                    <option value="organization">法人/组织</option>
                                                </select>
                                            </div>
                                            
                                            {index === 0 && (
                                                <div className="mt-4 flex opacity-30 hover:opacity-100 transition-opacity justify-center">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const newDefs = [...formData.defendants, { name: '', gender: '', birth: '', nation: '', job: '', position: '', phone: '', address: '', residence: '', idType: '身份证', id: '', type: '自然人', regAddress: '', legalRep: '' }];
                                                            setFormData({...formData, defendants: newDefs});
                                                        }}
                                                        className="text-[10px] bg-slate-100 border border-slate-300 font-sans px-2 py-0.5 rounded shadow-sm hover:bg-slate-200"
                                                    >
                                                        + 添加被告
                                                    </button>
                                                </div>
                                            )}
                                            {index > 0 && (
                                                <div className="mt-4 flex opacity-30 hover:opacity-100 transition-opacity justify-center">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            const newDefs = [...formData.defendants];
                                                            newDefs.splice(index, 1);
                                                            setFormData({...formData, defendants: newDefs});
                                                        }}
                                                        className="text-[10px] bg-red-50 text-red-600 border border-red-200 font-sans px-2 py-0.5 rounded shadow-sm hover:bg-red-100"
                                                    >
                                                        - 删除此人
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    
                                    <td className="border border-black p-3 w-3/4 space-y-2.5 hover:bg-yellow-50/50 transition-colors">
                                        {!isOrganization ? (
                                            /* Natural Person Fields */
                                            <>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">姓名：</span>
                                                    <input value={defendant.name} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].name = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="font-bold flex-1 border-b border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">性别：</span>
                                                    <div className="flex-1 flex gap-6 items-center">
                                                        <label className="cursor-pointer flex items-center relative pl-5">
                                                            <input type="radio" name={`defendantGender-${index}`} checked={defendant.gender === '男'} onChange={() => {
                                                                const newDefs = [...formData.defendants];
                                                                newDefs[index].gender = '男';
                                                                setFormData({...formData, defendants: newDefs});
                                                            }} className="peer sr-only" />
                                                            <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>男
                                                        </label>
                                                        <label className="cursor-pointer flex items-center relative pl-5">
                                                            <input type="radio" name={`defendantGender-${index}`} checked={defendant.gender === '女'} onChange={() => {
                                                                const newDefs = [...formData.defendants];
                                                                newDefs[index].gender = '女';
                                                                setFormData({...formData, defendants: newDefs});
                                                            }} className="peer sr-only" />
                                                            <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>女
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center flex-[3]">
                                                        <span className="w-[88px] shrink-0">出生日期：</span>
                                                        <input value={defendant.birth} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].birth = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                    <div className="flex items-center flex-[2]">
                                                        <span className="w-12 shrink-0">民族：</span>
                                                        <input value={defendant.nation} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].nation = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center flex-[3]">
                                                        <span className="w-[88px] shrink-0">工作单位：</span>
                                                        <input value={defendant.job} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].job = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                    <div className="flex items-center flex-[2]">
                                                        <span className="w-12 shrink-0">职务：</span>
                                                        <input value={defendant.position} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].position = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">联系电话：</span>
                                                    <input value={defendant.phone} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].phone = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[140px] shrink-0">住所地(户籍所在地)：</span>
                                                    <input value={defendant.address} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].address = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">经常居住地：</span>
                                                    <input value={defendant.residence} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].residence = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">证件类型：</span>
                                                    <input value={defendant.idType} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].idType = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-[88px] shrink-0">证件号码：</span>
                                                    <input value={defendant.id} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].id = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans tracking-widest" />
                                                </div>
                                            </>
                                        ) : (
                                            /* Organization Fields */
                                            <>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        <span className="shrink-0">名称：</span>
                                                        <input value={defendant.name} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].name = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="font-bold flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center">
                                                        <span className="shrink-0">住所地：</span>
                                                        <input value={defendant.address} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].address = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="shrink-0">注册地/登记地：</span>
                                                    <input value={defendant.regAddress} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].regAddress = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center flex-[3]">
                                                        <span className="shrink-0">法定代表人/主要负责人：</span>
                                                        <input value={defendant.legalRep} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].legalRep = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                    <div className="flex items-center flex-[1]">
                                                        <span className="shrink-0">职务：</span>
                                                        <input value={defendant.position} onChange={e => {
                                                            const newDefs = [...formData.defendants];
                                                            newDefs[index].position = e.target.value;
                                                            setFormData({...formData, defendants: newDefs});
                                                        }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 min-w-0" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="shrink-0">联系电话：</span>
                                                    <input value={defendant.phone} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].phone = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 font-sans" />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="shrink-0">统一社会信用代码：</span>
                                                    <input value={defendant.id} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].id = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 font-sans tracking-widest" />
                                                </div>
                                                <div className="flex items-center mt-3 border-t border-dashed border-black pt-2">
                                                    <span className="shrink-0 mr-2">具体组织类型：</span>
                                                    <input value={defendant.type} onChange={e => {
                                                        const newDefs = [...formData.defendants];
                                                        newDefs[index].type = e.target.value;
                                                        setFormData({...formData, defendants: newDefs});
                                                    }} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1" placeholder="例如：有限责任公司、股份有限公司等" />
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                            {/* Facts and Requests Continued block */}
                            <tr>
                                <td colSpan={2} className="border border-black p-0 border-t-2 border-b-2 bg-slate-50/50">
                                    {selectedTemplate === 'traffic' ? (
                                        <div className="flex flex-col">
                                            <div className="border-b border-black p-3 bg-slate-100/50 font-bold text-center tracking-[0.5em]">
                                                诉讼请求
                                            </div>
                                            <div className="p-4 bg-white hover:bg-yellow-50/50 transition-colors cursor-text">
                                                <textarea 
                                                    value={formData.claimsList}
                                                    onChange={e => setFormData({...formData, claimsList: e.target.value})}
                                                    className="w-full min-h-[120px] bg-transparent outline-none resize-y leading-relaxed border-none p-0 focus:ring-0"
                                                    placeholder="在此输入或让AI生成【诉讼请求】或【索赔清单】..."
                                                    style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                />
                                            </div>
                                            <div className="border-t border-b border-black p-3 bg-slate-100/50 font-bold text-center tracking-[0.5em]">
                                                事实与理由
                                            </div>
                                            <div className="flex flex-col bg-white">
                                                {/* Accident Facts */}
                                                <div className="border-b border-black border-dashed flex">
                                                    <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-black border-dashed font-bold p-2 bg-slate-50">1</div>
                                                    <div className="flex-1 p-3 hover:bg-yellow-50/50 transition-colors">
                                                        <div className="font-bold mb-1 text-sm text-slate-700">交通事故发生情况</div>
                                                        <textarea 
                                                            value={formData.accidentFacts}
                                                            onChange={e => setFormData({...formData, accidentFacts: e.target.value})}
                                                            className="w-full min-h-[100px] bg-transparent outline-none resize-y leading-relaxed text-[13px] border-none p-0 focus:ring-0"
                                                            placeholder="发生时间、地点、经过..."
                                                            style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Liability */}
                                                <div className="border-b border-black border-dashed flex">
                                                    <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-black border-dashed font-bold p-2 bg-slate-50">2</div>
                                                    <div className="flex-1 p-3 hover:bg-yellow-50/50 transition-colors">
                                                        <div className="font-bold mb-1 text-sm text-slate-700">交通事故责任认定</div>
                                                        <textarea 
                                                            value={formData.liabilityDetermination}
                                                            onChange={e => setFormData({...formData, liabilityDetermination: e.target.value})}
                                                            className="w-full min-h-[80px] bg-transparent outline-none resize-y leading-relaxed text-[13px] border-none p-0 focus:ring-0"
                                                            placeholder="交警认定结论..."
                                                            style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Insurance */}
                                                <div className="border-b border-black border-dashed flex">
                                                    <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-black border-dashed font-bold p-2 bg-slate-50">3</div>
                                                    <div className="flex-1 p-3 hover:bg-yellow-50/50 transition-colors">
                                                        <div className="font-bold mb-1 text-sm text-slate-700">机动车投保情况</div>
                                                        <textarea 
                                                            value={formData.insuranceStatus}
                                                            onChange={e => setFormData({...formData, insuranceStatus: e.target.value})}
                                                            className="w-full min-h-[80px] bg-transparent outline-none resize-y leading-relaxed text-[13px] border-none p-0 focus:ring-0"
                                                            placeholder="肇事车辆投保交强险和商业险的具体情况..."
                                                            style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Legal Basis / Others */}
                                                <div className="flex">
                                                    <div className="w-10 flex-shrink-0 flex items-center justify-center border-r border-black border-dashed font-bold p-2 bg-slate-50">4</div>
                                                    <div className="flex-1 p-3 hover:bg-yellow-50/50 transition-colors">
                                                        <div className="font-bold mb-1 text-sm text-slate-700">其他情况及法律依据</div>
                                                        <textarea 
                                                            value={formData.otherFacts}
                                                            onChange={e => setFormData({...formData, otherFacts: e.target.value})}
                                                            className="w-full min-h-[100px] bg-transparent outline-none resize-y leading-relaxed text-[13px] border-none p-0 focus:ring-0"
                                                            placeholder="包括伤残鉴定结论、具体索赔依据或其它关联情况..."
                                                            style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            <div className="border-b border-black p-3 bg-slate-100/50 font-bold text-center tracking-[0.5em]">
                                                诉讼请求与事实理由
                                            </div>
                                            <div className="p-4 bg-white hover:bg-yellow-50/50 transition-colors cursor-text relative">
                                                <textarea 
                                                    value={formData.requestsAndFacts}
                                                    onChange={e => setFormData({...formData, requestsAndFacts: e.target.value})}
                                                    className="w-full min-h-[500px] bg-transparent outline-none resize-y leading-relaxed border-none p-0 focus:ring-0"
                                                    placeholder="在此输入或让AI生成提取诉讼请求（如要求赔偿金额）、事实经过以及法律理由..."
                                                    style={{ fontFamily: '"SimSun", "Songti SC", "Times New Roman", serif' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>


                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
export default ComplaintGeneratorView;
