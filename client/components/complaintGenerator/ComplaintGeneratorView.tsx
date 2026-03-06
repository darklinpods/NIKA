import React, { useState } from 'react';
import { translations } from '../../translations';
import { 
  Scale, FileText, ChevronRight, Loader2, Sparkles, 
  User, FileSignature, ShieldCheck, Download, 
  FileSearch, CopyPlus, ArrowRight, Wand2, Printer
} from 'lucide-react';
import { extractComplaint, generateComplaintFile, fetchCases } from '../../services/api';

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

  // Cases state
  const [casesList, setCasesList] = useState<any[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState<boolean>(false);

  // Editable Form Data (WYSIWYG Model)
  const [formData, setFormData] = useState<Record<string, any>>({
    plaintiffName: '',
    plaintiffGender: '',
    plaintiffBirth: '',
    plaintiffNation: '',
    plaintiffJob: '',
    plaintiffPosition: '',
    plaintiffPhone: '',
    plaintiffAddress: '',
    plaintiffResidence: '',
    plaintiffIdType: '身份证',
    plaintiffId: '',
    
    defendantName: '',
    defendantGender: '',
    defendantBirth: '',
    defendantNation: '',
    defendantJob: '',
    defendantPosition: '',
    defendantPhone: '',
    defendantAddress: '',
    defendantResidence: '',
    defendantIdType: '身份证',
    defendantId: '',

    defendant2Name: '',
    defendant2Address: '',
    defendant2RegAddress: '',
    defendant2Rep: '',
    defendant2Position: '',
    defendant2Phone: '',
    defendant2Id: '',
    defendant2Type: '',
    
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
            setFormData(prev => ({
                ...prev,
                ...res.data
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

                        <div>
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
                            {/* Plaintiff */}
                            <tr>
                                <td className="border border-black p-3 w-1/4 align-top">
                                    原告（自然人）
                                </td>
                                <td className="border border-black p-3 w-3/4 space-y-2.5 hover:bg-yellow-50/50 transition-colors">
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">姓名：</span>
                                        <input 
                                            value={formData.plaintiffName} 
                                            onChange={e => setFormData({...formData, plaintiffName: e.target.value})} 
                                            className="font-bold flex-1 border-b border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" 
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">性别：</span>
                                        <div className="flex-1 flex gap-6 items-center">
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name="plaintiffGender" checked={formData.plaintiffGender === '男'} onChange={() => setFormData({...formData, plaintiffGender: '男'})} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>男
                                            </label>
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name="plaintiffGender" checked={formData.plaintiffGender === '女'} onChange={() => setFormData({...formData, plaintiffGender: '女'})} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>女
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">出生日期：</span>
                                            <input value={formData.plaintiffBirth} onChange={e => setFormData({...formData, plaintiffBirth: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">民族：</span>
                                            <input value={formData.plaintiffNation} onChange={e => setFormData({...formData, plaintiffNation: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">工作单位：</span>
                                            <input value={formData.plaintiffJob} onChange={e => setFormData({...formData, plaintiffJob: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">职务：</span>
                                            <input value={formData.plaintiffPosition} onChange={e => setFormData({...formData, plaintiffPosition: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">联系电话：</span>
                                        <input value={formData.plaintiffPhone} onChange={e => setFormData({...formData, plaintiffPhone: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[140px] shrink-0">住所地(户籍所在地)：</span>
                                        <input value={formData.plaintiffAddress} onChange={e => setFormData({...formData, plaintiffAddress: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">经常居住地：</span>
                                        <input value={formData.plaintiffResidence} onChange={e => setFormData({...formData, plaintiffResidence: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">证件类型：</span>
                                        <input value={formData.plaintiffIdType} onChange={e => setFormData({...formData, plaintiffIdType: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">证件号码：</span>
                                        <input value={formData.plaintiffId} onChange={e => setFormData({...formData, plaintiffId: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans tracking-widest" />
                                    </div>
                                </td>
                            </tr>

                            {/* Defendant (Natural Person) */}
                            <tr>
                                <td className="border border-black p-3 w-1/4 align-top">
                                    被告（自然人）
                                    <div className="mt-2 flex opacity-30 hover:opacity-100 transition-opacity justify-center">
                                        <button className="text-[10px] bg-slate-100 border border-slate-300 font-sans px-2 py-0.5 rounded shadow-sm hover:bg-slate-200">+ 添加当事人</button>
                                    </div>
                                </td>
                                <td className="border border-black p-3 w-3/4 space-y-2.5 hover:bg-yellow-50/50 transition-colors">
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">姓名：</span>
                                        <input value={formData.defendantName} onChange={e => setFormData({...formData, defendantName: e.target.value})} className="font-bold flex-1 border-b border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">性别：</span>
                                        <div className="flex-1 flex gap-6 items-center">
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name="defendantGender" checked={formData.defendantGender === '男'} onChange={() => setFormData({...formData, defendantGender: '男'})} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>男
                                            </label>
                                            <label className="cursor-pointer flex items-center relative pl-5">
                                                <input type="radio" name="defendantGender" checked={formData.defendantGender === '女'} onChange={() => setFormData({...formData, defendantGender: '女'})} className="peer sr-only" />
                                                <div className="w-4 h-4 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-sm font-bold"></div>女
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">出生日期：</span>
                                            <input value={formData.defendantBirth} onChange={e => setFormData({...formData, defendantBirth: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">民族：</span>
                                            <input value={formData.defendantNation} onChange={e => setFormData({...formData, defendantNation: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="w-[88px] shrink-0">工作单位：</span>
                                            <input value={formData.defendantJob} onChange={e => setFormData({...formData, defendantJob: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[2]">
                                            <span className="w-12 shrink-0">职务：</span>
                                            <input value={formData.defendantPosition} onChange={e => setFormData({...formData, defendantPosition: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">联系电话：</span>
                                        <input value={formData.defendantPhone} onChange={e => setFormData({...formData, defendantPhone: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[140px] shrink-0">住所地(户籍所在地)：</span>
                                        <input value={formData.defendantAddress} onChange={e => setFormData({...formData, defendantAddress: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">经常居住地：</span>
                                        <input value={formData.defendantResidence} onChange={e => setFormData({...formData, defendantResidence: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">证件类型：</span>
                                        <input value={formData.defendantIdType} onChange={e => setFormData({...formData, defendantIdType: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[88px] shrink-0">证件号码：</span>
                                        <input value={formData.defendantId} onChange={e => setFormData({...formData, defendantId: e.target.value})} className="flex-1 border-b border-black outline-none bg-transparent px-1 font-sans tracking-widest" />
                                    </div>
                                </td>
                            </tr>

                            {/* Defendant (Organization) */}
                            <tr>
                                <td className="border border-black p-3 w-1/4 align-top leading-relaxed">
                                    被告（法人、非法人组织）
                                    <div className="mt-2 flex opacity-30 hover:opacity-100 transition-opacity justify-center text-center">
                                        <span className="text-[10px] text-slate-500 font-sans italic block">(例如保险公司)</span>
                                    </div>
                                </td>
                                <td className="border border-black p-3 w-3/4 space-y-2.5 hover:bg-yellow-50/50 transition-colors">
                                    <div className="flex flex-col">
                                        <div className="flex items-center">
                                            <span className="shrink-0">名称：</span>
                                            <input value={formData.defendant2Name} onChange={e => setFormData({...formData, defendant2Name: e.target.value})} className="font-bold flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 focus:bg-blue-50/50 transition-colors" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center">
                                            <span className="shrink-0">住所地（主要办事机构所在地）：</span>
                                            <input value={formData.defendant2Address} onChange={e => setFormData({...formData, defendant2Address: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="shrink-0">注册地/登记地：</span>
                                        <input value={formData.defendant2RegAddress} onChange={e => setFormData({...formData, defendant2RegAddress: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center flex-[3]">
                                            <span className="shrink-0">法定代表人/主要负责人：</span>
                                            <input value={formData.defendant2Rep} onChange={e => setFormData({...formData, defendant2Rep: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                        <div className="flex items-center flex-[1]">
                                            <span className="shrink-0">职务：</span>
                                            <input value={formData.defendant2Position} onChange={e => setFormData({...formData, defendant2Position: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 min-w-0" />
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="shrink-0">联系电话：</span>
                                        <input value={formData.defendant2Phone} onChange={e => setFormData({...formData, defendant2Phone: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 font-sans" />
                                    </div>
                                    <div className="flex items-center">
                                        <span className="shrink-0">统一社会信用代码：</span>
                                        <input value={formData.defendant2Id} onChange={e => setFormData({...formData, defendant2Id: e.target.value})} className="flex-1 border-b border-dashed border-black outline-none bg-transparent px-1 font-sans tracking-widest" />
                                    </div>
                                    <div className="flex text-sm mt-3 border-t border-dashed border-black pt-2">
                                        <span className="shrink-0 mr-2 mt-0.5">类型：</span>
                                        <div className="flex-1 flex flex-wrap gap-x-3 gap-y-2">
                                            {['有限责任公司', '股份有限公司', '上市股份', '其他企业法人', '事业单位', '社会团体', '其他'].map(type => (
                                                <label key={type} className="cursor-pointer flex items-center relative pl-5 tracking-tighter">
                                                    <input type="radio" name="defendant2Type" checked={formData.defendant2Type === type} onChange={() => setFormData({...formData, defendant2Type: type})} className="peer sr-only" />
                                                    <div className="w-3.5 h-3.5 border border-black absolute left-0 flex items-center justify-center peer-checked:after:content-['✓'] after:text-xs font-bold"></div>{type}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            
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

                            <tr>
                                <td colSpan={2} className="border border-black p-6">
                                    <div className="flex justify-end items-end mt-12 mb-8 px-12">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-end gap-2 text-lg mb-6">
                                                <span>起诉人：</span>
                                                <div className="w-32 border-b-2 border-black"></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="w-12 border-b-2 border-black inline-block"></span>年
                                                <span className="w-8 border-b-2 border-black inline-block"></span>月
                                                <span className="w-8 border-b-2 border-black inline-block"></span>日
                                            </div>
                                        </div>
                                    </div>
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
