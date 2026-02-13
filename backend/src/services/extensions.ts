import { FeatureFlagService } from './featureFlag.js';
import { Logger } from './observability.js';

/**
 * Sittara Extension Engine
 * Architecture points for future AI and External Integrations.
 */

export interface Extension {
    name: string;
    version: string;
    initialize: () => Promise<void>;
}

export class ExtensionRegistry {
    private static extensions: Map<string, Extension> = new Map();

    /**
     * Register a new architectural extension.
     * Checks for a feature flag before initialization.
     */
    static async register(extension: Extension, flagKey?: string) {
        if (flagKey) {
            const isEnabled = await FeatureFlagService.isEnabled(flagKey);
            if (!isEnabled) {
                Logger.info(`Extension ${extension.name} is disabled by feature flag ${flagKey}`);
                return;
            }
        }

        try {
            await extension.initialize();
            this.extensions.set(extension.name, extension);
            Logger.info(`Extension ${extension.name} v${extension.version} localized and initialized.`);
        } catch (error) {
            Logger.error(`Failed to initialize extension ${extension.name}:`, { error });
        }
    }

    static getExtension(name: string) {
        return this.extensions.get(name);
    }
}

/**
 * Placeholder for future AI Extension
 */
export const AIExtension: Extension = {
    name: 'ai-engine',
    version: '1.0.0-beta',
    initialize: async () => {
        // Here we would initialize OpenAI/VertexAI clients
        console.log('--- [FUTURE] AI Extension Initialized ---');
    }
};
