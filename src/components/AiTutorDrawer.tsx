import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RotateCcw,
  BrainCircuit,
  MessageSquare,
  HelpCircle,
  Flame
} from "lucide-react";
import type { LearningContext, TutorChatMessage } from "../types";

interface AiTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  learningContext: LearningContext;
  onActionTriggered?: (actionType: "practice" | "repair" | "explain", conceptId?: string) => void;
}

export const AiTutorDrawer: React.FC<AiTutorDrawerProps> = ({
  isOpen,
  onClose,
  learningContext,
  onActionTriggered
}) => {
  const [messages, setMessages] = useState<TutorChatMessage[]>([
    {
      id: "welcome-1",
      role: "model",
      text: `Hello! I am your **MindLoop AI Tutor**. I track your active recall intervals, cognitive bottlenecks, and concept mastery.\n\nAsk me anything about your current topic or check where your cognitive gaps are.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const quickPrompts = [
    { label: "What am I weak at?", query: "What are my current weak concepts and mistakes?" },
    { label: "Why did I get this wrong?", query: "Can you analyze my recent mistake and explain why my answer was wrong?" },
    { label: "Quiz me on this topic", query: `Give me a targeted active recall question on ${learningContext.currentTopic || 'current concept'}!` },
    { label: "What should I learn next?", query: "What is my next best topic to study based on my current mastery?" }
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || isLoading) return;

    const userMsg: TutorChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          learningContext,
          chatHistory: messages.slice(-6).map(m => ({ role: m.role, text: m.text }))
        })
      });

      if (!response.ok) {
        throw new Error("Tutor service unavailable");
      }

      const data = await response.json();
      const modelMsg: TutorChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        text: data.reply || "I am reflecting on your question. Let's practice another question to build your intuition!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: data.suggestedAction
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error("AI Tutor chat error:", err);
      setErrorMsg("Failed to reach AI Tutor. Check network or retry.");
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "model",
          text: "I encountered a brief connection issue. Your current context is preserved. Feel free to retry or ask another question!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Slide-in Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col justify-between"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      MindLoop AI Tutor
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Context-Aware
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Socratic guidance & personalized misconception repair
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Learner Context Live Banner */}
            <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Topic:</span>
                <span className="font-semibold text-indigo-300 truncate max-w-[180px]">
                  {learningContext.currentTopic || "All Courses"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-slate-400">
                  Mastery: <span className="font-bold text-emerald-400">{learningContext.overallMastery ?? 0}%</span>
                </span>
                {learningContext.weakConcepts && learningContext.weakConcepts.length > 0 ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {learningContext.weakConcepts.length} weak
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    0 weak
                  </span>
                )}
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isUser ? "You" : "AI Tutor"} • {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20"
                          : "bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.text}

                      {/* Suggested Action pill */}
                      {msg.suggestedAction && onActionTriggered && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-indigo-300 font-semibold">
                            Recommended Action:
                          </span>
                          <button
                            onClick={() => {
                              onActionTriggered(
                                msg.suggestedAction!.actionType,
                                msg.suggestedAction!.conceptId
                              );
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-sm transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{msg.suggestedAction.label}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-2xl max-w-[60%] text-xs text-slate-400 border border-slate-800">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Synthesizing pedagogical guidance...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp.query)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium whitespace-nowrap transition-colors border border-slate-700/60"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/95">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a question or request a simpler explanation..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-md transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
