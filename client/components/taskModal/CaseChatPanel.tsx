import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Send, MessageSquare, Loader, User, Bot, FileText, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchChatHistory, sendChatMessage, deleteChatMessage, addKnowledgeText } from '../../services/api';
import { t } from '../../translations';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface CaseChatPanelHandle {
    sendMessage: (text: string) => void;
}

interface CaseChatPanelProps {
    caseId: string;
    theme: 'light' | 'dark';
    caseType?: string;
    onRefreshCase?: () => void;
    onSaveDocument?: (content: string, suggestedTitle: string) => void;
}

export const CaseChatPanel = forwardRef<CaseChatPanelHandle, CaseChatPanelProps>(({ caseId, theme, caseType, onRefreshCase, onSaveDocument }, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({ sendMessage: (text: string) => handleSendMessage(text) }));

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
            const res = await sendChatMessage(caseId, text);
            if (res.success) {
                // Replace temp and add real one + AI response
                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== 'temp-u');
                    return [...filtered, res.userMessage, res.aiMessage];
                });
                if (onRefreshCase) onRefreshCase();
            }
        } catch (err) {
            console.error("Chat Error:", err);
            alert(t.chatFailed);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        await deleteChatMessage(messageId);
        setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const handleLike = async (msg: Message) => {
        if (likedIds.has(msg.id)) return;
        const title = msg.content.replace(/\s+/g, ' ').slice(0, 20);
        await addKnowledgeText(title, msg.content, 'notebook_lm');
        setLikedIds(prev => new Set(prev).add(msg.id));
    };

    const handleDislike = (msgId: string) => {
        setDislikedIds(prev => new Set(prev).add(msgId));
    };

    if (isInitialLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader className="animate-spin text-blue-500" size={24} />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-[#f5f5f7]'}`}>
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
                        <div className="max-w-[85%] flex flex-col gap-1">
                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
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
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-1 px-1">
                                    <button title="好评，存入知识库" onClick={() => handleLike(msg)}
                                        className={`p-1 rounded transition-colors ${likedIds.has(msg.id) ? 'text-green-500 cursor-default' : 'text-slate-400 hover:text-green-500'}`}
                                        disabled={likedIds.has(msg.id)}>
                                        <ThumbsUp size={13} />
                                    </button>
                                    <button title="差评" onClick={() => handleDislike(msg.id)}
                                        className={`p-1 rounded transition-colors ${dislikedIds.has(msg.id) ? 'text-slate-300 cursor-default' : 'text-slate-400 hover:text-slate-600'}`}
                                        disabled={dislikedIds.has(msg.id)}>
                                        <ThumbsDown size={13} />
                                    </button>
                                    <button title="删除" onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 size={13} />
                                    </button>
                                    {onSaveDocument && (
                                        <button title="保存为案件文书" onClick={() => onSaveDocument(msg.content, 'AI 生成文书')}
                                            className="p-1 rounded text-slate-400 hover:text-blue-500 transition-colors">
                                            <FileText size={13} />
                                        </button>
                                    )}
                                </div>
                            )}
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
            <div className={`px-4 py-3 border-t shrink-0 ${theme === 'dark' ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all
                    ${theme === 'dark' ? 'bg-slate-800 border-white/10 focus-within:border-blue-500/50' : 'bg-slate-50 border-slate-200 focus-within:border-blue-400'}`}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={t.chatPlaceholder || '向 AI 提问关于此案件的内容...'}
                        className={`flex-1 bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-slate-100 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim() || isLoading}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${input.trim() && !isLoading
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-700'}`}
                    >
                        <Send size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
});
