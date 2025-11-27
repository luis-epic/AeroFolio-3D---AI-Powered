/**
 * Centralized environment variable configuration
 * Validates and provides type-safe access to environment variables
 */

/**
 * Get the Gemini API key from environment variables
 * Supports multiple variable names for flexibility
 */
export const getApiKey = (): string => {
  // Try different possible variable names
  const keys = [
    import.meta.env.VITE_API_KEY,
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GOOGLE_API_KEY,
    // Fallback to process.env for compatibility (Vite replaces these at build time)
    (typeof process !== 'undefined' && (process as any).env?.VITE_API_KEY),
    (typeof process !== 'undefined' && (process as any).env?.API_KEY),
    (typeof process !== 'undefined' && (process as any).env?.GOOGLE_API_KEY),
    (typeof process !== 'undefined' && (process as any).env?.GEMINI_API_KEY),
  ].filter(Boolean) as string[];
  
  if (keys.length === 0) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ API_KEY not found. Running in demo mode.');
      console.warn('💡 Set VITE_API_KEY in your .env.local file');
    }
    return '';
  }
  
  return keys[0];
};

/**
 * Environment configuration interface
 */
export interface EnvConfig {
  apiKey: string;
  isDevelopment: boolean;
  isProduction: boolean;
  nodeEnv: string;
}

/**
 * Get complete environment configuration
 */
export const getEnvConfig = (): EnvConfig => {
  return {
    apiKey: getApiKey(),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    nodeEnv: import.meta.env.MODE || 'development',
  };
};

/**
 * Validate required environment variables
 * Logs warnings in development mode
 */
export const validateEnv = (): void => {
  const config = getEnvConfig();
  const warnings: string[] = [];
  
  if (!config.apiKey && config.isDevelopment) {
    warnings.push('VITE_API_KEY (or VITE_GEMINI_API_KEY, VITE_GOOGLE_API_KEY)');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Missing environment variables:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn('💡 Create a .env.local file with the required variables');
  }
};

/**
 * Check if API key is configured
 */
export const hasApiKey = (): boolean => {
  return getApiKey().length > 0;
};


