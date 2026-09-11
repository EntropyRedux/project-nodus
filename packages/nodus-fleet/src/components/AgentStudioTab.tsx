import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Mic,
  MicOff,
  Send,
  FileCode,
  Check,
  X,
  Play,
  Terminal,
  HelpCircle,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Wand2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { DeviceInfo } from '../nodus-common';
import { universalNetworkFetch } from '../services/FleetDirectClient';

export interface AgentStudioTabProps {
  targetDevice?: DeviceInfo;
  availableDevices?: DeviceInfo[];
}

export interface AgentDiffItem {
  id: string;
  filePath: string;
  description: string;
  additions: number;
  deletions: number;
  chunks: Array<{
    type: 'add' | 'del' | 'context';
    content: string;
    lineNo?: number;
  }>;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentQuestionItem {
  id: string;
  question: string;
  isMultiSelect: boolean;
  options: string[];
  selectedIndices: number[];
  answered: boolean;
}

export interface AgentTimelineItem {
  id: string;
  tool: string;
  action: string;
  timestamp: string;
  status: 'running' | 'success' | 'failed';
  details?: string;
}

export const AgentStudioTab: React.FC<AgentStudioTabProps> = ({
  targetDevice,
  availableDevices = []
}) => {
  // Select active workstation host
  const host = targetDevice || availableDevices.find(d => !d.isLocal && d.status !== 'offline') || {
    id: 'redux-pc',
    name: 'Redux (PC)',
    ipAddress: '192.168.1.177',
    status: 'online' as const,
    os: 'windows' as const,
    type: 'desktop' as const,
    isLocal: false
  };

  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'review_required' | 'executing'>('review_required');
  const [activeModel, setActiveModel] = useState<string>('Antigravity Agent (Claude 3.7 Sonnet)');
  const [promptText, setPromptText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);

  // Active Code Diffs awaiting review
  const [diffItems, setDiffItems] = useState<AgentDiffItem[]>([
    {
      id: 'diff-1',
      filePath: 'packages/nodus-desktop/src-tauri/src/commands/pty.rs',
      description: 'Add real-time PTY buffer streaming and condvar wakeups for remote companion terminal control',
      additions: 38,
      deletions: 4,
      status: 'pending',
      chunks: [
        { type: 'context', content: ' pub struct ActivePty {' },
        { type: 'context', content: '     pub master: Box<dyn MasterPty + Send>,' },
        { type: 'context', content: '     pub writer: Arc<Mutex<Box<dyn Write + Send>>>,' },
        { type: 'add', content: '+    pub buffer: Arc<(Mutex<PtyBufferState>, std::sync::Condvar)>,' },
        { type: 'context', content: ' }' },
        { type: 'del', content: '-// Background reader thread: captures stdout/stderr stream from ConPTY' },
        { type: 'add', content: '+// Background reader thread: captures stdout/stderr and notifies network buffer' },
        { type: 'add', content: '+pub fn pull_pty_data(session_id: &str, offset: usize, timeout_ms: u64) -> Result<...>' }
      ]
    },
    {
      id: 'diff-2',
      filePath: 'packages/nodus-fleet/src/components/RemoteTerminal.tsx',
      description: 'Mount interactive @xterm/xterm canvas for streaming ConPTY CLI sessions (AGY / PowerShell)',
      additions: 45,
      deletions: 12,
      status: 'pending',
      chunks: [
        { type: 'del', content: '-// Static line-based buffer renderer' },
        { type: 'add', content: '+import { Terminal as XTerm } from "@xterm/xterm";' },
        { type: 'add', content: '+import { FitAddon } from "@xterm/addon-fit";' },
        { type: 'context', content: ' export const RemoteTerminal: React.FC<RemoteTerminalProps> = ({' },
        { type: 'add', content: '+  // Long-poll streaming loop for real-time ANSI escape code streaming' }
      ]
    }
  ]);

  // Active Clarification Questions
  const [questions, setQuestions] = useState<AgentQuestionItem[]>([
    {
      id: 'q-1',
      question: 'Which terminal rendering mode should be prioritized for low-bandwidth mobile connections?',
      isMultiSelect: false,
      options: [
        '(Recommended) Adaptive ANSI streaming with chunk sequence offsets',
        'Direct raw WebSocket byte pipe with WebGL renderer',
        'Fallback synchronous line-by-line snapshot mode'
      ],
      selectedIndices: [0],
      answered: false
    }
  ]);

  // Agent Activity Timeline
  const [timeline, setTimeline] = useState<AgentTimelineItem[]>([
    {
      id: 't-1',
      tool: 'run_command',
      action: 'npm install @xterm/xterm @xterm/addon-fit',
      timestamp: 'Just now',
      status: 'success',
      details: 'Added 2 packages, audited 255 packages in 10s'
    },
    {
      id: 't-2',
      tool: 'replace_file_content',
      action: 'src-tauri/src/server/mod.rs',
      timestamp: '2m ago',
      status: 'success',
      details: 'Added /api/terminal/pty/pull long-poll streaming endpoint'
    },
    {
      id: 't-3',
      tool: 'replace_file_content',
      action: 'src-tauri/src/commands/pty.rs',
      timestamp: '3m ago',
      status: 'success',
      details: 'Added PtyBufferState with condvar notifications'
    }
  ]);

  const [expandedDiffId, setExpandedDiffId] = useState<string | null>('diff-1');

  // Approve Diff Handler
  const handleApproveDiff = (diffId: string) => {
    setDiffItems(prev => prev.map(d => (d.id === diffId ? { ...d, status: 'approved' } : d)));
    // Send approval signal to Desktop agent endpoint
    universalNetworkFetch(`http://${host.ipAddress}:9120/api/agent/action`, {
      method: 'POST',
      body: { action: 'approve_diff', diffId },
      timeoutMs: 3000
    }).catch(() => {});
  };

  // Reject Diff Handler
  const handleRejectDiff = (diffId: string) => {
    setDiffItems(prev => prev.map(d => (d.id === diffId ? { ...d, status: 'rejected' } : d)));
    universalNetworkFetch(`http://${host.ipAddress}:9120/api/agent/action`, {
      method: 'POST',
      body: { action: 'reject_diff', diffId },
      timeoutMs: 3000
    }).catch(() => {});
  };

  // Option selection
  const handleSelectOption = (questionId: string, optIndex: number) => {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== questionId) return q;
        if (q.isMultiSelect) {
          const exists = q.selectedIndices.includes(optIndex);
          const next = exists
            ? q.selectedIndices.filter(i => i !== optIndex)
            : [...q.selectedIndices, optIndex];
          return { ...q, selectedIndices: next };
        } else {
          return { ...q, selectedIndices: [optIndex] };
        }
      })
    );
  };

  // Question Submission
  const handleSubmitAnswer = (questionId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (!q) return;
    setQuestions(prev => prev.map(item => (item.id === questionId ? { ...item, answered: true } : item)));

    const chosen = q.selectedIndices.map(i => q.options[i]);
    universalNetworkFetch(`http://${host.ipAddress}:9120/api/agent/action`, {
      method: 'POST',
      body: { action: 'answer_question', questionId, answer: chosen },
      timeoutMs: 3000
    }).catch(() => {});
  };

  // Voice Dictation Toggle
  const handleToggleDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechFeedback('Voice dictation requires Chrome/Edge Speech API');
      setTimeout(() => setSpeechFeedback(null), 3000);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechFeedback('Listening... Speak now');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPromptText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setSpeechFeedback(`Heard: "${transcript}"`);
        setTimeout(() => setSpeechFeedback(null), 2500);
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setSpeechFeedback('Dictation ended');
        setTimeout(() => setSpeechFeedback(null), 2000);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (_) {
      setIsRecording(false);
      setSpeechFeedback('Microphone unavailable');
      setTimeout(() => setSpeechFeedback(null), 2000);
    }
  };

  // Prompt Send Handler
  const handleSendPrompt = () => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    // Append to timeline
    setTimeline(prev => [
      {
        id: `t-${Date.now()}`,
        tool: 'user_prompt',
        action: trimmed,
        timestamp: 'Just now',
        status: 'running'
      },
      ...prev
    ]);

    setPromptText('');
    setAgentStatus('thinking');

    // Send to desktop agent server
    universalNetworkFetch(`http://${host.ipAddress}:9120/api/agent/action`, {
      method: 'POST',
      body: { action: 'prompt', prompt: trimmed },
      timeoutMs: 5000
    }).finally(() => {
      setTimeout(() => setAgentStatus('review_required'), 1500);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0E1015] text-slate-100 overflow-hidden select-none font-sans">
      {/* 1. Header Banner & Host Status */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#14171F] border-b border-white/5 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center text-[#A8C7FA] shadow-sm">
            <Sparkles size={20} className="animate-pulse text-[#A8C7FA]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                Antigravity Companion Cockpit
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0842A0]/40 text-[#A8C7FA] border border-[#0842A0]">
                v2.4
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Connected: {host.name} ({host.ipAddress})</span>
              </span>
              <span>·</span>
              <span className="text-slate-300 font-medium">{activeModel}</span>
            </div>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          {agentStatus === 'thinking' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <RefreshCw size={13} className="animate-spin" />
              <span>Agent Thinking & Formulating...</span>
            </div>
          )}
          {agentStatus === 'review_required' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#A8C7FA]/10 border border-[#A8C7FA]/30 text-[#A8C7FA] text-xs font-mono">
              <Clock size={13} />
              <span>Review Required ({diffItems.filter(d => d.status === 'pending').length} Diffs)</span>
            </div>
          )}
          {agentStatus === 'idle' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <CheckCircle2 size={13} />
              <span>Agent Idle · Awaiting Command</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Scrollable Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Section: Pending Code Diffs for Review */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-[#A8C7FA]" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Pending Code Changes & Proposed Diffs
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Tap diff cards to expand / approve
            </span>
          </div>

          {diffItems.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#14171F] border border-white/5 text-center text-slate-400 font-mono text-xs">
              Zero pending diffs. All changes applied and verified.
            </div>
          ) : (
            diffItems.map(diff => {
              const isExpanded = expandedDiffId === diff.id;
              const isPending = diff.status === 'pending';

              return (
                <div
                  key={diff.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden bg-[#14171F] ${
                    diff.status === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : diff.status === 'rejected'
                      ? 'border-rose-500/30 bg-rose-950/10 opacity-60'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => setExpandedDiffId(isExpanded ? null : diff.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white/5 text-[#A8C7FA] shrink-0">
                        <FileCode size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-slate-100 truncate">
                          {diff.filePath}
                        </div>
                        <div className="text-xs text-slate-400 font-sans mt-0.5 line-clamp-1">
                          {diff.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-emerald-400">+{diff.additions}</span>
                        <span className="text-rose-400">-{diff.deletions}</span>
                      </div>

                      {diff.status === 'approved' && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                          <Check size={12} /> Approved
                        </span>
                      )}
                      {diff.status === 'rejected' && (
                        <span className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-medium flex items-center gap-1">
                          <X size={12} /> Rejected
                        </span>
                      )}

                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Code Diff Viewer */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-[#0A0C10] p-4 font-mono text-xs">
                      <div className="rounded-lg overflow-hidden border border-white/5 divide-y divide-white/5 max-h-80 overflow-y-auto leading-relaxed">
                        {diff.chunks.map((chunk, idx) => (
                          <div
                            key={idx}
                            className={`px-3 py-1 whitespace-pre-wrap font-mono ${
                              chunk.type === 'add'
                                ? 'bg-emerald-950/30 text-emerald-300 font-medium'
                                : chunk.type === 'del'
                                ? 'bg-rose-950/30 text-rose-300 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {chunk.content}
                          </div>
                        ))}
                      </div>

                      {/* Touch Action Buttons */}
                      {isPending && (
                        <div className="mt-4 flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleRejectDiff(diff.id)}
                            className="h-9 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-medium flex items-center gap-1.5 active:scale-95 transition"
                          >
                            <X size={14} /> Reject Diff
                          </button>
                          <button
                            onClick={() => handleApproveDiff(diff.id)}
                            className="h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md text-xs font-mono font-semibold flex items-center gap-1.5 active:scale-95 transition"
                          >
                            <Check size={14} /> Approve & Apply Changes
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Section: Clarification Questions (from ask_question) */}
        {questions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-amber-400" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Clarification Questions & Design Decisions
              </h2>
            </div>

            {questions.map(q => (
              <div
                key={q.id}
                className="p-5 rounded-xl bg-[#14171F] border border-amber-500/20 space-y-4"
              >
                <div className="text-sm font-medium text-slate-100 font-sans leading-relaxed">
                  {q.question}
                </div>

                {/* Option Choices */}
                <div className="space-y-2">
                  {q.options.map((opt, idx) => {
                    const isSelected = q.selectedIndices.includes(idx);
                    return (
                      <button
                        key={idx}
                        disabled={q.answered}
                        onClick={() => handleSelectOption(q.id, idx)}
                        className={`w-full text-left p-3 rounded-lg border text-xs font-mono transition flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#A8C7FA]/15 border-[#A8C7FA] text-white font-medium'
                            : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                        } ${q.answered ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-${q.isMultiSelect ? 'md' : 'full'} border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#A8C7FA] border-[#A8C7FA]' : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-[#062E6F] stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!q.answered && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleSubmitAnswer(q.id)}
                      className="h-8 px-4 rounded-lg bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F] font-mono text-xs font-semibold shadow-sm transition active:scale-95"
                    >
                      Submit Response →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Section: Agent Activity & Tool Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Live Agent Execution Log
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-[#14171F] border border-white/5 space-y-3 divide-y divide-white/5">
            {timeline.map(item => (
              <div key={item.id} className="pt-3 first:pt-0 flex items-start justify-between gap-3 font-mono text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 mt-0.5 shrink-0">
                    <Terminal size={12} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium">{item.tool}</span>
                      <span className="text-slate-400">· {item.action}</span>
                    </div>
                    {item.details && (
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {item.details}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Prompt & Voice Input Bar */}
      <div className="p-4 bg-[#14171F] border-t border-white/5 shrink-0">
        <div className="max-w-5xl mx-auto space-y-2">
          {speechFeedback && (
            <div className="text-xs font-mono text-amber-300 animate-fade-in flex items-center gap-1.5">
              <Mic size={12} className="animate-pulse" />
              <span>{speechFeedback}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Voice Dictation Button */}
            <button
              onClick={handleToggleDictation}
              title="Voice Dictation"
              className={`h-11 px-3.5 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                isRecording
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Prompt Input Field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
                placeholder="Instruct agent or dictate command to desktop..."
                className="w-full h-11 px-4 rounded-xl bg-[#0A0C10] border border-white/10 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-[#A8C7FA] transition"
              />
            </div>

            {/* Submit Prompt Button */}
            <button
              onClick={handleSendPrompt}
              disabled={!promptText.trim()}
              className={`h-11 px-5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md transition active:scale-95 ${
                promptText.trim()
                  ? 'bg-[#A8C7FA] hover:bg-[#C2E7FF] text-[#062E6F]'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>Dispatch</span>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
