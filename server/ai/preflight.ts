import { ProviderManager } from './providerManager';
import { ModelRouter } from './modelRouter';
import { validateCredential, getCredentialDiagnostics } from './credentialUtils';
import { ProviderError, classifyProviderError } from './errors';

export interface PreflightCheckResult {
  passed: boolean;
  providerId: string;
  providerType: string;
  selectedModel: string;
  diagnostics: {
    hasCredential: boolean;
    credentialValid: boolean;
    credentialLength: number;
    discoveredModelCount: number;
    probeLatencyMs: number;
  };
  error?: ProviderError;
}

export class ProviderPreflight {
  private providerManager: ProviderManager;
  private router: ModelRouter;

  constructor(providerManager: ProviderManager, router: ModelRouter) {
    this.providerManager = providerManager;
    this.router = router;
  }

  async runPreflight(preferredProviderId?: string): Promise<PreflightCheckResult> {
    await this.providerManager.ready();

    // 1. Check available providers
    const safeProviders = this.providerManager.getAllSafeProviders().filter(p => p.enabled && p.hasKey);
    if (safeProviders.length === 0) {
      const err = new ProviderError({
        code: 'CONFIGURATION_ERROR',
        provider: 'None',
        stage: 'PREFLIGHT',
        retryable: false,
        message: 'No active AI provider with configured API key found. Please configure a provider in Settings.'
      });
      return {
        passed: false,
        providerId: '',
        providerType: '',
        selectedModel: '',
        diagnostics: {
          hasCredential: false,
          credentialValid: false,
          credentialLength: 0,
          discoveredModelCount: 0,
          probeLatencyMs: 0
        },
        error: err
      };
    }

    const providerInfo = preferredProviderId 
      ? safeProviders.find(p => p.id === preferredProviderId) || safeProviders[0]
      : safeProviders[0];

    const config = this.providerManager.getConfig(providerInfo.id);
    if (!config || !config.apiKey) {
      const err = new ProviderError({
        code: 'INVALID_API_KEY',
        provider: providerInfo.name,
        stage: 'PREFLIGHT',
        retryable: false,
        message: `API credential missing for ${providerInfo.name}.`
      });
      return {
        passed: false,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: '',
        diagnostics: {
          hasCredential: false,
          credentialValid: false,
          credentialLength: 0,
          discoveredModelCount: 0,
          probeLatencyMs: 0
        },
        error: err
      };
    }

    // 2. Validate credential formatting and character encoding
    const validation = validateCredential(config.apiKey, providerInfo.name);
    const diag = getCredentialDiagnostics(config.apiKey);

    if (!validation.valid || validation.error) {
      return {
        passed: false,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: '',
        diagnostics: {
          hasCredential: true,
          credentialValid: false,
          credentialLength: diag.length,
          discoveredModelCount: 0,
          probeLatencyMs: 0
        },
        error: validation.error
      };
    }

    // 3. Verify adapter initialization
    const adapter = this.providerManager.getAdapter(providerInfo.id);
    if (!adapter) {
      const err = new ProviderError({
        code: 'PROVIDER_UNAVAILABLE',
        provider: providerInfo.name,
        stage: 'PREFLIGHT',
        retryable: false,
        message: `Adapter initialization failed for ${providerInfo.name}.`
      });
      return {
        passed: false,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: '',
        diagnostics: {
          hasCredential: true,
          credentialValid: true,
          credentialLength: diag.length,
          discoveredModelCount: 0,
          probeLatencyMs: 0
        },
        error: err
      };
    }

    // 4. Discover real models from provider
    let discoveredModels;
    try {
      discoveredModels = await adapter.listModels();
      if (!discoveredModels || discoveredModels.length === 0) {
        throw new Error('No compatible generation models discovered from provider.');
      }
    } catch (discErr: any) {
      const pErr = classifyProviderError(discErr, providerInfo.name, 'DISCOVERY');
      return {
        passed: false,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: '',
        diagnostics: {
          hasCredential: true,
          credentialValid: true,
          credentialLength: diag.length,
          discoveredModelCount: 0,
          probeLatencyMs: 0
        },
        error: pErr
      };
    }

    // Register discovered models with router
    this.router.registerDiscoveredModels(providerInfo.id, discoveredModels);

    // Pick top model for coding/building
    const candidateModel = discoveredModels.find(m => 
      m.modelIdentifier.includes('2.5-flash') ||
      m.modelIdentifier.includes('2.0-flash') ||
      m.modelIdentifier.includes('flash') ||
      m.modelIdentifier.includes('pro')
    ) || discoveredModels[0];

    // 5. Minimal real AI execution probe
    const probeStart = Date.now();
    try {
      const probeRes = await adapter.generate({
        modelIdentifier: candidateModel.modelIdentifier,
        messages: [{ role: 'user', content: 'Reply with exactly: PROVIDER_OK' }],
        maxTokens: 100,
        temperature: 0.1
      });

      const probeLatencyMs = Date.now() - probeStart;
      const text = probeRes.text.trim();

      if (!text) {
        throw new Error('Provider returned empty completion.');
      }

      return {
        passed: true,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: candidateModel.modelIdentifier,
        diagnostics: {
          hasCredential: true,
          credentialValid: true,
          credentialLength: diag.length,
          discoveredModelCount: discoveredModels.length,
          probeLatencyMs
        }
      };
    } catch (probeErr: any) {
      const pErr = classifyProviderError(probeErr, providerInfo.name, 'RUNTIME');
      return {
        passed: false,
        providerId: providerInfo.id,
        providerType: providerInfo.type,
        selectedModel: candidateModel.modelIdentifier,
        diagnostics: {
          hasCredential: true,
          credentialValid: true,
          credentialLength: diag.length,
          discoveredModelCount: discoveredModels.length,
          probeLatencyMs: Date.now() - probeStart
        },
        error: pErr
      };
    }
  }
}
