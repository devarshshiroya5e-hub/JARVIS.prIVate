import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar, TabType } from './components/Sidebar';
import { CentralCore } from './components/CentralCore';
import { ConversationPanel } from './components/ConversationPanel';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { DashboardView } from './components/DashboardView';
import { PcControlView } from './components/PcControlView';
import { ApplicationsView } from './components/ApplicationsView';
import { FileManagerView } from './components/FileManagerView';
import { BrowserControlView } from './components/BrowserControlView';
import { VisionScreenView } from './components/VisionScreenView';
import { AutomationsView } from './components/AutomationsView';
import { MemoryView } from './components/MemoryView';
import { SettingsView } from './components/SettingsView';
import { WindowsBridgeModal } from './components/WindowsBridgeModal';
import { SafetyConfirmModal } from './components/SafetyConfirmModal';
import { StartupSequenceModal } from './components/StartupSequenceModal';

import {
  JarvisStatus,
  LanguageMode,
  ChatMessage,
  ActivityLogEntry,
  SystemMetrics,
  AutomationRoutine,
  MemoryItem,
  AppSettings,
} from './types';

import { api } from './services/api';
import { voiceEngine } from './services/voice';
import { wsClient } from './services/websocket';

export function App() {
  const [status, setStatus] = useState<JarvisStatus>('IDLE');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [language, setLanguage] = useState<LanguageMode>('auto');
  const [isBooting, setIsBooting] = useState(true);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);
  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    toolName: string;
    args: Record<string, any>;
    warningText: string;
  }>({
    isOpen: false,
    toolName: '',
    args: {},
    warningText: '',
  });

  // Fast built-in Gemini route is the default. OpenRouter remains available in Settings.
  const [settings, setSettings] = useState<AppSettings>({
    aiProvider: 'gemini',
    geminiModel: 'gemini-2.5-flash-lite',
    openRouterApiKey: '',
    openRouterModel: 'google/gemini-2.5-flash-lite',
    language: 'auto',
    voiceGender: 'male',
    voiceRate: 1.05,
    voicePitch: 1.0,
    voiceVolume: 1.0,
    wakeWordEnabled: true,
    requireConfirmForDangerous: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'jarvis',
      text: 'Good day, Sir. JARVIS desktop core is online and standing by. How may I assist you with your Windows PC today?',
      hindiText: 'नमस्ते! जार्विस सिस्टम सक्रिय है। आज मैं आपकी पीसी में कैसे सहायता करूँ?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      title: 'JARVIS Kernel v2.4 Booted',
      type: 'system',
      status: 'success',
      detail: 'Hardware interfaces and speech recognition online.',
    },
  ]);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [routines, setRoutines] = useState<AutomationRoutine[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [appPaths, setAppPaths] = useState<Record<string, string>>({});
  const [isExecutingRoutineId, setIsExecutingRoutineId] = useState<string | null>(null);

  const addLog = useCallback(
    (title: string, type: ActivityLogEntry['type'], status: ActivityLogEntry['status'] = 'success', detail?: string) => {
      setActivityLogs((prev) => [
        {
          id: String(Date.now()) + Math.random().toString(36).substr(2, 4),
          timestamp: new Date().toLocaleTimeString(),
          title,
          type,
          status,
          detail,
        },
        ...prev.slice(0, 99),
      ]);
    },
    []
  );

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await api.getSystemMetrics();
      setSystemMetrics(data);
      setIsOnline(true);
    } catch (_) {
      setIsOnline(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [routinesData, memoriesData, settingsData] = await Promise.all([
        api.getAutomations(),
        api.getMemories(),
        api.getSettings(),
      ]);
      setRoutines(routinesData);
      setMemories(memoriesData);
      if (settingsData && Object.keys(settingsData).length > 0) {
        setSettings((prev) => ({ ...prev, ...settingsData }));
      }
    } catch (e) {
      console.error('Failed to load initial data', e);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
    loadInitialData();

    const unsubStatus = wsClient.onStatusChange((connected, source) => {
      if (source === 'agent') {
        setIsAgentConnected(connected);
        addLog(
          connected ? 'Windows Local Agent Connected' : 'Windows Local Agent Disconnected',
          'system',
          connected ? 'success' : 'warning'
        );
      } else if (source === 'backend') {
        setIsOnline(connected);
      }
    });

    const unsubMsg = wsClient.onMessage((msg) => {
      if (msg.type === 'system_metrics' && msg.payload?.metrics) {
        setSystemMetrics(msg.payload.metrics);
        setIsAgentConnected(true);
      } else if (msg.type === 'tool_result') {
        addLog(
          `Agent Tool Result: ${msg.payload?.toolName || 'tool'}`,
          'tool',
          msg.payload?.error ? 'error' : 'success',
          JSON.stringify(msg.payload?.result || msg.payload?.error)
        );
      }
    });

    const timer = setInterval(refreshMetrics, 4000);
    return () => {
      clearInterval(timer);
      unsubStatus();
      unsubMsg();
    };
  }, [refreshMetrics, loadInitialData, addLog]);

  useEffect(() => {
    voiceEngine.onResult = (transcript) => {
      addLog(`Voice Recognized: "${transcript}"`, 'voice', 'success');
      void handleProcessUserPrompt(transcript);
    };

    voiceEngine.onWakeWord = (word) => {
      addLog(`Wake Word Triggered: "${word}"`, 'voice', 'success');
      setStatus('LISTENING');
    };

    voiceEngine.onError = (message) => {
      setIsListening(false);
      setStatus('ERROR');
      addLog(message, 'voice', 'error');
      window.setTimeout(() => setStatus('IDLE'), 1500);
    };

    voiceEngine.onStateChange = (listening) => {
      setIsListening(listening);
      if (listening) setStatus('LISTENING');
      else if (!isLoadingPrompt) setStatus('IDLE');
    };

    return () => {
      voiceEngine.onResult = undefined;
      voiceEngine.onWakeWord = undefined;
      voiceEngine.onError = undefined;
      voiceEngine.stopListening();
    };
  }, [addLog, isLoadingPrompt]);

  const handleToggleMic = async () => {
    if (isListening) {
      voiceEngine.stopListening();
      setIsListening(false);
      setStatus('IDLE');
      addLog('Microphone Standby', 'voice', 'info');
      return;
    }

    const started = await voiceEngine.startListening(language);
    if (started) {
      setIsListening(true);
      setStatus('LISTENING');
      addLog('Microphone Active — speak your command', 'voice', 'info');
    } else {
      setIsListening(false);
      setStatus('IDLE');
    }
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'auto' ? 'en' : prev === 'en' ? 'hi' : 'auto';
      voiceEngine.setLanguage(next);
      addLog(`Language changed to: ${next.toUpperCase()}`, 'system', 'info');
      return next;
    });
  };

  const handleProcessUserPrompt = async (text: string) => {
    if (!text.trim() || isLoadingPrompt) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingPrompt(true);
    setStatus('THINKING');
    addLog(`Processing Intent: "${text.trim()}"`, 'intent', 'info');

    try {
      const response = await api.processJarvisPrompt(text, messages, settings, language);

      if (response.toolCalls?.length) {
        setStatus('EXECUTING');
        for (const tc of response.toolCalls) {
          addLog(`Executed: ${tc.name}`, 'tool', 'success', JSON.stringify(tc.arguments));
        }
      }

      const replyText = response.text || response.reply || 'Action completed, Sir.';
      const hindiText = response.hindiText || response.hindiReply;

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'jarvis',
          text: replyText,
          hindiText,
          toolCalls: response.toolCalls,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setStatus('SPEAKING');
      await voiceEngine.speak(
        replyText,
        language,
        settings.voiceGender,
        settings.voiceRate,
        settings.voicePitch
      );

      void refreshMetrics();
      void api.getMemories().then(setMemories);
    } catch (err: any) {
      console.error('Error processing prompt', err);
      setStatus('ERROR');
      addLog(`Execution Error: ${err.message || 'Unknown error'}`, 'error', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'jarvis',
          text: `I encountered an operational issue while executing that command: ${err.message || 'Service unreachable'}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingPrompt(false);
      setTimeout(() => setStatus('IDLE'), 400);
    }
  };

  const handleExecuteTool = async (toolName: string, args: Record<string, any>) => {
    setStatus('EXECUTING');
    addLog(`Direct Tool Call: ${toolName}`, 'tool', 'info', JSON.stringify(args));
    try {
      const res = await api.executeTool(toolName, args);
      addLog(`Tool ${toolName} completed`, 'tool', 'success', JSON.stringify(res.result || {}));
      void refreshMetrics();
    } catch (e: any) {
      addLog(`Tool ${toolName} failed`, 'error', 'error', e.message);
    } finally {
      setStatus('IDLE');
    }
  };

  const handleRequestDangerousAction = (toolName: string, args: Record<string, any>, warningText: string) => {
    if (!settings.requireConfirmForDangerous) {
      void handleExecuteTool(toolName, args);
      return;
    }
    setSafetyModal({ isOpen: true, toolName, args, warningText });
    addLog(`Safety Check Prompted for: ${toolName}`, 'safety', 'info');
  };

  const handleConfirmDangerousAction = () => {
    const { toolName, args } = safetyModal;
    setSafetyModal({ isOpen: false, toolName: '', args: {}, warningText: '' });
    void handleExecuteTool(toolName, args);
  };

  const handleLaunchApp = (appName: string) => {
    void handleExecuteTool('open_application', { appName });
  };

  const handleCloseApp = (processName: string) => {
    void handleExecuteTool('close_application', { processName });
  };

  const handleKillProcess = (processName: string) => {
    handleRequestDangerousAction(
      'close_application',
      { processName },
      `Terminate process ${processName}? Any unsaved process state will end.`
    );
  };

  const handleExecuteRoutine = async (id: string) => {
    setIsExecutingRoutineId(id);
    setStatus('EXECUTING');
    addLog(`Starting Routine: ${id}`, 'intent', 'info');
    try {
      const res = await api.executeAutomation(id);
      addLog(`Routine completed with ${res.results?.length || 0} steps`, 'tool', 'success');
      void refreshMetrics();
    } catch (e: any) {
      addLog(`Routine failed: ${e.message}`, 'error', 'error');
    } finally {
      setIsExecutingRoutineId(null);
      setStatus('IDLE');
    }
  };

  const handleCreateRoutine = async (routine: Partial<AutomationRoutine>) => {
    try {
      const created = await api.createAutomation(routine);
      setRoutines((prev) => [...prev, created]);
      addLog(`Created Routine: ${routine.name}`, 'system', 'success');
    } catch (e: any) {
      addLog(`Failed to create routine: ${e.message}`, 'error', 'error');
    }
  };

  const handleAddMemory = async (mem: { category: string; key: string; value: string }) => {
    try {
      const created = await api.addMemory(mem);
      setMemories((prev) => [...prev, created]);
      addLog(`Stored Memory: ${mem.key}`, 'system', 'success');
    } catch (e: any) {
      addLog(`Failed to store memory: ${e.message}`, 'error', 'error');
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      addLog(`Deleted Memory: ${id}`, 'system', 'info');
    } catch (e: any) {
      addLog(`Failed to delete memory: ${e.message}`, 'error', 'error');
    }
  };

  const handleClearMemories = async () => {
    try {
      await api.clearMemories();
      setMemories([]);
      addLog('All Memories Cleared', 'system', 'info');
    } catch (e: any) {
      addLog(`Failed to clear memories: ${e.message}`, 'error', 'error');
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await api.saveSettings(newSettings);
    addLog('Configuration Saved', 'system', 'success');
  };

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-800 font-sans flex flex-col relative overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-900">
      {isBooting && <StartupSequenceModal onComplete={() => setIsBooting(false)} />}

      <TopBar
        status={status}
        isListening={isListening}
        onToggleMic={handleToggleMic}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenBridge={() => setBridgeModalOpen(true)}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        settings={settings}
        isOnline={isOnline}
        isAgentConnected={isAgentConnected}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'home' && (
            <div className="space-y-6">
              <CentralCore
                status={status}
                isListening={isListening}
                onToggleMic={handleToggleMic}
                onQuickCommand={handleProcessUserPrompt}
                language={language}
                isAgentConnected={isAgentConnected}
              />
              <div className="w-full h-[580px]">
                <ConversationPanel
                  messages={messages}
                  onSendMessage={handleProcessUserPrompt}
                  isListening={isListening}
                  onToggleMic={handleToggleMic}
                  language={language}
                  isLoading={isLoadingPrompt}
                />
              </div>
            </div>
          )}

          {activeTab === 'conversations' && (
            <div className="h-[calc(100vh-8rem)]">
              <ConversationPanel
                messages={messages}
                onSendMessage={handleProcessUserPrompt}
                isListening={isListening}
                onToggleMic={handleToggleMic}
                language={language}
                isLoading={isLoadingPrompt}
              />
            </div>
          )}

          {activeTab === 'pc_control' && (
            <PcControlView onExecuteTool={handleExecuteTool} onRequestDangerousAction={handleRequestDangerousAction} />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              onLaunchApp={handleLaunchApp}
              onCloseApp={handleCloseApp}
              appPaths={appPaths}
              onSaveAppPath={(n, p) => setAppPaths({ ...appPaths, [n]: p })}
            />
          )}

          {activeTab === 'files' && (
            <FileManagerView
              onExecuteTool={handleExecuteTool}
              onRequestDangerousAction={handleRequestDangerousAction}
            />
          )}

          {activeTab === 'browser' && <BrowserControlView onExecuteTool={handleExecuteTool} />}

          {activeTab === 'automations' && (
            <AutomationsView
              routines={routines}
              onExecuteRoutine={handleExecuteRoutine}
              onCreateRoutine={handleCreateRoutine}
              isExecutingId={isExecutingRoutineId}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryView
              memories={memories}
              onAddMemory={handleAddMemory}
              onDeleteMemory={handleDeleteMemory}
              onClearMemories={handleClearMemories}
            />
          )}

          {activeTab === 'vision' && <VisionScreenView onExecuteTool={handleExecuteTool} settings={settings} />}

          {activeTab === 'system' && (
            <DashboardView metrics={systemMetrics} onRefresh={refreshMetrics} onKillProcess={handleKillProcess} />
          )}

          {activeTab === 'settings' && <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />}
        </main>
      </div>

      <WindowsBridgeModal isOpen={bridgeModalOpen} onClose={() => setBridgeModalOpen(false)} />

      <SafetyConfirmModal
        isOpen={safetyModal.isOpen}
        toolName={safetyModal.toolName}
        args={safetyModal.args}
        warningText={safetyModal.warningText}
        onConfirm={handleConfirmDangerousAction}
        onCancel={() => setSafetyModal({ isOpen: false, toolName: '', args: {}, warningText: '' })}
      />
    </div>
  );
}

export default App;
