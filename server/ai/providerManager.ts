import fs from 'fs/promises';
import path from 'path';
import { 
  ProviderAdapter, 
  ProviderConfig, 
  ProviderType, 
  DiscoveredModel 
} from './types';
import { GeminiAdapter } from './adapters/gemini';
import { OpenAICompatibleAdapter } from './adapters/openaiCompatible';
import { AnthropicAdapter } from './adapters/anthropic';

export interface SafeProviderInfo {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  hasKey: boolean;
  keyMasked: string;
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'offline' | 'unknown';
  lastTested?: number;
  lastError?: string;
  latencyMs?: number;
}

const STORAGE_FILE = path.join(process.cwd(), '.agent_providers.json');

export class ProviderManager {
  private adapters: Map<string, ProviderAdapter> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private statuses: Map<string, { health: 'healthy' | 'degraded' | 'offline' | 'unknown'; lastTested?: number; lastError?: string; latencyMs?: number }> = new Map();

  private initPromise: Promise<void>;

  constructor() {
    // 1. Auto-initialize environment Gemini key synchronously if present
    const envGeminiKey = process.env.GEMINI_API_KEY;
    if (envGeminiKey) {
      const geminiConfig: ProviderConfig = {
        id: 'prov-gemini-env',
        name: 'Google Gemini (Workspace Environment)',
        type: 'gemini',
        apiKey: envGeminiKey,
        enabled: true
      };
      this.register(geminiConfig, false);
    }

    this.initPromise = this.init();
  }

  async ready() {
    await this.initPromise;
  }

  private async init() {
    // 1. Try to load saved providers
    try {
      const data = await fs.readFile(STORAGE_FILE, 'utf-8');
      const parsed: ProviderConfig[] = JSON.parse(data);
      for (const config of parsed) {
        this.register(config, false);
      }
    } catch {
      // File doesn't exist yet
    }
  }

  private createAdapter(config: ProviderConfig): ProviderAdapter {
    switch (config.type) {
      case 'gemini':
        return new GeminiAdapter(config.id, config);
      case 'anthropic':
        return new AnthropicAdapter(config.id, config);
      case 'openrouter':
      case 'nvidia':
      case 'groq':
      case 'openai':
      case 'custom':
      default:
        return new OpenAICompatibleAdapter(config.id, config.type, config);
    }
  }

  private maskKey(key: string): string {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  }

  register(config: ProviderConfig, persist = true): SafeProviderInfo {
    this.configs.set(config.id, config);
    const adapter = this.createAdapter(config);
    this.adapters.set(config.id, adapter);

    if (!this.statuses.has(config.id)) {
      this.statuses.set(config.id, { health: 'unknown' });
    }

    if (persist) {
      this.saveToDisk().catch(err => console.error('Failed to persist provider config:', err));
    }

    return this.getSafeInfo(config.id)!;
  }

  deleteProvider(id: string): boolean {
    this.configs.delete(id);
    this.adapters.delete(id);
    this.statuses.delete(id);
    this.saveToDisk().catch(() => {});
    return true;
  }

  private async saveToDisk() {
    try {
      const list = Array.from(this.configs.values()).filter(c => c.id !== 'prov-gemini-env');
      await fs.writeFile(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving providers:', e);
    }
  }

  getSafeInfo(id: string): SafeProviderInfo | null {
    const config = this.configs.get(id);
    if (!config) return null;
    const status = this.statuses.get(id) || { health: 'unknown' };

    return {
      id: config.id,
      name: config.name,
      type: config.type,
      baseUrl: config.baseUrl,
      hasKey: Boolean(config.apiKey),
      keyMasked: this.maskKey(config.apiKey),
      enabled: config.enabled,
      health: status.health,
      lastTested: status.lastTested,
      lastError: status.lastError,
      latencyMs: status.latencyMs
    };
  }

  getAllSafeProviders(): SafeProviderInfo[] {
    return Array.from(this.configs.keys())
      .map(id => this.getSafeInfo(id)!)
      .filter(Boolean);
  }

  getAdapter(id: string): ProviderAdapter | null {
    return this.adapters.get(id) || null;
  }

  getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  async testProvider(id: string): Promise<{ success: boolean; latencyMs: number; message: string; safeInfo: SafeProviderInfo }> {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return { 
        success: false, 
        latencyMs: 0, 
        message: 'Provider adapter not found', 
        safeInfo: this.getSafeInfo(id) || ({} as any) 
      };
    }

    try {
      const result = await adapter.testConnection();
      this.statuses.set(id, {
        health: result.success ? 'healthy' : 'degraded',
        lastTested: Date.now(),
        lastError: result.success ? undefined : result.message,
        latencyMs: result.latencyMs
      });
      return {
        ...result,
        safeInfo: this.getSafeInfo(id)!
      };
    } catch (err: any) {
      this.statuses.set(id, {
        health: 'offline',
        lastTested: Date.now(),
        lastError: err.message,
        latencyMs: 0
      });
      return {
        success: false,
        latencyMs: 0,
        message: err.message,
        safeInfo: this.getSafeInfo(id)!
      };
    }
  }

  async discoverModels(id: string): Promise<DiscoveredModel[]> {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error('Provider adapter not found');
    return adapter.listModels();
  }
}
