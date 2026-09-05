import React, { useState, useEffect } from 'react';
import { useModelStore } from '../../store/useModelStore';
import { ProviderType } from '../../types/models';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Zap, 
  ShieldCheck, 
  Sparkles,
  Link as LinkIcon,
  Search,
  KeyRound,
  ExternalLink,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

export function ModelsPage() {
  const { 
    providers, 
    models, 
    roleAssignments, 
    fetchProviders,
    fetchModels,
    addProvider,
    deleteProvider,
    testConnection, 
    discoverModels,
    addManualModel,
    runAutoAssignment,
    isLoading
  } = useModelStore();

  useEffect(() => {
    fetchProviders();
    fetchModels();
  }, [fetchProviders, fetchModels]);

  const [testResult, setTestResult] = useState<{ [id: string]: { success: boolean; message: string; latency?: number } }>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [isAddingManualModel, setIsAddingManualModel] = useState<string | null>(null);

  // New provider form state
  const [selectedType, setSelectedType] = useState<ProviderType>('gemini');
  const [providerName, setProviderName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual model state
  const [manualModelId, setManualModelId] = useState('');
  const [manualModelName, setManualModelName] = useState('');

  const getDefaultName = (type: ProviderType) => {
    switch (type) {
      case 'gemini': return 'Google Gemini';
      case 'openrouter': return 'OpenRouter';
      case 'groq': return 'Groq Cloud';
      case 'nvidia': return 'NVIDIA NIM';
      case 'anthropic': return 'Anthropic';
      case 'openai': return 'OpenAI';
      case 'custom': return 'Custom OpenAI-Compatible';
    }
  };

  const getDefaultBaseUrl = (type: ProviderType) => {
    switch (type) {
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'groq': return 'https://api.groq.com/openai/v1';
      case 'nvidia': return 'https://integrate.api.nvidia.com/v1';
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      default: return '';
    }
  };

  const handleTypeChange = (type: ProviderType) => {
    setSelectedType(type);
    setProviderName(getDefaultName(type));
    setBaseUrl(getDefaultBaseUrl(type));
  };

  const handleAddProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setFormError('API Key is required.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const id = `prov-${selectedType}-${Date.now().toString(36)}`;
      await addProvider({
        id,
        name: providerName.trim() || getDefaultName(selectedType),
        type: selectedType,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined
      });

      // Auto-test and discover
      setTestingId(id);
      const testRes = await testConnection(id);
      setTestResult(prev => ({ ...prev, [id]: testRes }));
      setTestingId(null);

      if (testRes.success) {
        setDiscoveringId(id);
        await discoverModels(id);
        setDiscoveringId(null);
      }

      setIsAddingProvider(false);
      setApiKey('');
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect provider.');
    } finally {
      setIsSubmitting(false);
      setTestingId(null);
      setDiscoveringId(null);
    }
  };

  const handleTest = async (providerId: string) => {
    setTestingId(providerId);
    const res = await testConnection(providerId);
    setTestResult(prev => ({ ...prev, [providerId]: res }));
    setTestingId(null);
    setTimeout(() => {
      setTestResult(prev => {
        const next = { ...prev };
        delete next[providerId];
        return next;
      });
    }, 6000);
  };

  const handleDiscover = async (providerId: string) => {
    setDiscoveringId(providerId);
    const res = await discoverModels(providerId);
    setDiscoveringId(null);
    if (res.success) {
      setTestResult(prev => ({
        ...prev,
        [providerId]: {
          success: true,
          message: `Discovered ${res.count} available models.`
        }
      }));
    } else {
      setTestResult(prev => ({
        ...prev,
        [providerId]: {
          success: false,
          message: 'Model discovery failed. You can add model identifiers manually below.'
        }
      }));
    }
  };

  const handleAddManualModelSubmit = async (providerId: string) => {
    if (!manualModelId.trim()) return;
    await addManualModel(providerId, manualModelId.trim(), manualModelName.trim() || manualModelId.trim());
    setManualModelId('');
    setManualModelName('');
    setIsAddingManualModel(null);
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-6xl mx-auto pb-12 px-4">
      {/* Top Header */}
      <div className="text-center py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Model Providers & Autonomous Routing
        </h1>
        <p className="text-sm text-zinc-500 max-w-2xl mx-auto">
          Connect your API keys. AGENT_OS discovers available models, performs live health probes, evaluates capabilities, and automatically routes each job to the best model.
        </p>
      </div>

      {/* Zero Providers Warning Banner */}
      {providers.length === 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block text-sm">NO AI PROVIDER CONNECTED</span>
              <span>Add at least one API key (Google Gemini, OpenRouter, Groq, NVIDIA, Anthropic, or OpenAI) to activate runtime execution.</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setIsAddingProvider(true);
              handleTypeChange('gemini');
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white shrink-0 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect API Key</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Column: Providers & API Keys */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span>Connected Providers ({providers.length})</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingProvider(!isAddingProvider);
                if (!isAddingProvider) handleTypeChange('gemini');
              }}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Provider</span>
            </Button>
          </div>

          {/* Add Provider Modal / Card */}
          {isAddingProvider && (
            <form onSubmit={handleAddProviderSubmit} className="p-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4 shadow-md">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                <span>Configure AI Provider & Key</span>
              </h3>

              {formError && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-md text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Provider Service</label>
                  <select 
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value as ProviderType)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 font-medium"
                  >
                    <option value="gemini">Google Gemini (Native @google/genai)</option>
                    <option value="openrouter">OpenRouter (Unified Models)</option>
                    <option value="groq">Groq (Ultra High Speed)</option>
                    <option value="nvidia">NVIDIA NIM (DeepSeek / Llama)</option>
                    <option value="anthropic">Anthropic (Claude 3.7 / 3.5)</option>
                    <option value="openai">OpenAI (GPT-4o / o3)</option>
                    <option value="custom">Custom OpenAI-Compatible Endpoint</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Display Name</label>
                  <input 
                    type="text" 
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="e.g. Google Gemini"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100" 
                  />
                </div>
              </div>

              {(selectedType === 'openrouter' || selectedType === 'nvidia' || selectedType === 'groq' || selectedType === 'custom') && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-500">Base URL</label>
                  <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 font-mono" 
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-500 flex justify-between">
                  <span>API Key (Stored Securely on Server Runtime)</span>
                  <span className="text-zinc-400 font-normal">Never exposed to client bundles</span>
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedType === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 font-mono" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsAddingProvider(false)} 
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? 'Verifying...' : 'Save & Test Connection'}
                </Button>
              </div>
            </form>
          )}

          {/* Provider Cards */}
          <div className="space-y-3">
            {providers.map((p) => {
              const providerModels = models.filter(m => m.providerId === p.id);
              const testState = testResult[p.id];
              const isCurrentlyTesting = testingId === p.id;
              const isCurrentlyDiscovering = discoveringId === p.id;

              return (
                <div key={p.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                        p.health === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' :
                        p.health === 'degraded' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60' :
                        'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
                      )}>
                        <Zap className={cn("w-5 h-5", 
                          p.health === 'healthy' ? "text-emerald-500" :
                          p.health === 'degraded' ? "text-amber-500" : "text-zinc-500"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{p.name}</h3>
                          <span className={cn(
                            "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border",
                            p.health === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' :
                            p.health === 'degraded' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700' :
                            'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                          )}>{p.health}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-1">
                          <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {providerModels.length} Models</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Key: {p.apiKey || 'Verified'}</span>
                          {p.lastTested && (
                            <span className="text-[10px] text-zinc-400 hidden sm:inline">Tested {new Date(p.lastTested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(p.id)}
                        disabled={isCurrentlyTesting}
                        className="gap-1.5 text-xs"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{isCurrentlyTesting ? 'Testing...' : 'Test'}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDiscover(p.id)}
                        disabled={isCurrentlyDiscovering}
                        className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isCurrentlyDiscovering ? 'Discovering...' : 'Discover Models'}</span>
                      </Button>
                      {p.id !== 'prov-gemini-env' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteProvider(p.id)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {testState && (
                    <div className={cn(
                      "p-2.5 rounded-lg text-xs flex items-center gap-2",
                      testState.success 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                    )}>
                      {testState.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                      <span>{testState.message}</span>
                    </div>
                  )}

                  {/* Discovered Models for Provider */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Available Registered Models</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingManualModel(isAddingManualModel === p.id ? null : p.id)}
                        className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        + Add Model ID Manually
                      </button>
                    </div>

                    {isAddingManualModel === p.id && (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={manualModelId}
                          onChange={(e) => setManualModelId(e.target.value)}
                          placeholder="Model Identifier (e.g. meta-llama/llama-3-70b)"
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddManualModelSubmit(p.id)}
                          className="text-xs bg-blue-600 text-white"
                        >
                          Register
                        </Button>
                      </div>
                    )}

                    {providerModels.length === 0 ? (
                      <div className="text-xs text-zinc-400 italic py-1">
                        No models discovered yet. Click "Discover Models" or add an identifier manually.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {providerModels.map(m => (
                          <div key={m.id} className="p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/60 rounded-lg text-xs flex justify-between items-center">
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{m.displayName}</div>
                              <div className="text-[10px] font-mono text-zinc-400 truncate">{m.modelIdentifier}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] font-mono bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 block">
                                {m.contextWindow ? `${Math.round(m.contextWindow / 1024)}k ctx` : 'Standard'}
                              </span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                                {Math.round((m.observedSuccessRate || 1.0) * 100)}% Pass
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Model Router Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>Model Router</span>
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={runAutoAssignment}
              className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
            >
              <Sparkles className="w-3 h-3" />
              <span>Re-optimize</span>
            </Button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Autonomous Job Assignment</span>
                <span className="text-[11px] text-zinc-500">
                  {models.length === 0 ? 'No models active' : models.length === 1 ? 'Single Model Mode active' : 'Specialist dynamic routing'}
                </span>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full font-mono",
                models.length > 0 ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-zinc-100 text-zinc-500"
              )}>
                {models.length > 0 ? 'ROUTER READY' : 'IDLE'}
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.entries(roleAssignments).map(([role, assignment]) => {
                const model = models.find(m => m.id === assignment.assignedModelId);
                return (
                  <div key={role} className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        {role.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {model ? model.displayName : <span className="text-zinc-400 italic">Unassigned</span>}
                      </div>
                    </div>
                    {model && (
                      <div className="text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded shrink-0">
                        {Math.round(assignment.score * 100)}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
