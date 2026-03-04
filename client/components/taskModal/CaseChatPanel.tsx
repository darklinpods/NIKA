import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader, Sparkles, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchChatHistory, sendChatMessage } from '../../services/api';
import { translations } from '../../translations';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

interface CaseChatPanelProps {
    caseId: string;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
}

export const CaseChatPanel: React.FC<CaseChatPanelProps> = ({ caseId, theme, lang }) => {
    const t = translations[lang] as any;
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const shortcuts = [
        { label: t.sc_timeline, prompt: t.sc_timelinePrompt },
        { label: t.sc_focus, prompt: t.sc_focusPrompt },
        { label: t.sc_strategy, prompt: t.sc_strategyPrompt },
        { label: t.sc_evidence, prompt: t.sc_evidencePrompt }
    ];

    useEffect(() => {
        loadHistory();
    }, [caseId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadHistory = async () => {
        try {
            setIsInitialLoading(true);
            const res = await fetchChatHistory(caseId);
            if (res.success) {
                setMessages(res.data);
            }
        } catch (err) {
            console.error("Failed to load chat history", err);
        } finally {
            setIsInitialLoading(false);
        }
    };

    const handleSendMessage = async (customContent?: string) => {
        const text = customContent || input.trim();
        if (!text || isLoading) return;

        setInput('');
        setIsLoading(true);

        // Optimistic update for UI (temporary message)
        const tempUserMsg: Message = {
            id: 'temp-u',
            role: 'user',
            content: text,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const res = await sendChatMessage(caseId, text, lang);
            if (res.success) {
                // Replace temp and add real one + AI response
                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== 'temp-u');
                    return [...filtered, res.userMessage, res.aiMessage];
                });
            }
        } catch (err) {
            console.error("Chat Error:", err);
            alert(t.chatFailed);
        } finally {
            setIsLoading(false);
        }
    };

    if (isInitialLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader className="animate-spin text-blue-500" size={24} />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden ${theme === 'dark' ? 'bg-slate-900/30' : 'bg-slate-100/50'}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center gap-2 border-slate-200 dark:border-white/5">
                <Sparkles className="text-blue-500" size={18} />
                <h3 className="font-bold text-sm tracking-tight">Case Copilot</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase font-bold">RAG Active</span>
            </div>

            {/* Chat List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                            <MessageSquare className="text-slate-400" size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold">{t.startBrainstorming}</p>
                            <p className="text-xs text-slate-500 max-w-[200px]">
                                {t.chatWelcomeText}
                            </p>
                        </div>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${msg.role === 'user'
                            ? (theme === 'dark' ? 'bg-blue-600 border-blue-500' : 'bg-blue-500 border-blue-400')
                            : (theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm')
                            }`}>
                            {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-500" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : (theme === 'dark' ? 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-white/5' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm')
                            }`}>
                            <div className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-2 ${msg.role === 'user'
                                ? 'prose-invert prose-p:text-white prose-strong:text-white prose-headings:text-white'
                                : (theme === 'dark' ? 'prose-invert' : 'prose-slate')
                                }`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content.replace(/\\n/g, '\n')}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <Bot size={14} className="text-blue-500" />
                        </div>
                        <div className={`rounded-2xl px-4 py-3 bg-opacity-50 flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50 border border-slate-100 shadow-sm'}`}>
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-slate-200 dark:border-white/5 space-y-4">
                {/* Shortcuts */}
                <div className="flex flex-wrap gap-2">
                    {shortcuts.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(s.prompt)}
                            disabled={isLoading}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${theme === 'dark'
                                ? 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-blue-400'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="relative group">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={t.chatPlaceholder}
                        className={`w-full min-h-[100px] max-h-[200px] p-4 pr-12 rounded-2xl text-sm border outline-none transition-all resize-none custom-scrollbar ${theme === 'dark'
                            ? 'bg-slate-900/50 border-white/10 text-slate-100 focus:border-blue-500 focus:bg-slate-900 shadow-xl'
                            : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400 focus:shadow-lg'
                            }`}
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-3 bottom-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isLoading
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md transform hover:scale-105 active:scale-95'
                            : 'bg-slate-500/10 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        <Send size={16} />
                    </button>
                </div>
                <p className="text-[9px] text-center text-slate-500 font-medium">
                    {t.chatWarning}
                </p>
            </div>
        </div>
    );
};
