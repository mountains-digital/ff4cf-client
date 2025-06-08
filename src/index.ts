// src/index.ts
// filepath: /path/to/ff4cf-client/src/index.ts
/**
 * FF4CF RPC Client Library
 * Helper functions for checking feature toggles via RPC service binding
 */

export interface ToggleStateResponse {
  enabled: boolean;
  toggleName: string;
  environment: string;
}

export interface ToggleStateError {
  error: string;
}

export interface FF4CFService {
  checkToggle(toggleName: string, environment: string, appName: string): Promise<boolean>;
}

export interface ToggleConfig {
  name: string;
  environment: string;
  appName: string;
}

/**
 * Check if a feature toggle is enabled via RPC call
 * @param ff4cfService - The FF4CF RPC service binding
 * @param toggleName - Name of the toggle to check
 * @param environment - Environment to check (e.g., "development", "staging", "production")
 * @param appName - Name of the application requesting the toggle
 * @returns Promise resolving to boolean indicating if toggle is enabled
 */
export async function checkToggle(
  ff4cfService: FF4CFService,
  toggleName: string,
  environment: string,
  appName: string
): Promise<boolean> {
  try {
    return await ff4cfService.checkToggle(toggleName, environment, appName);
  } catch (error) {
    console.error("Error checking toggle state via RPC:", error);
    return false; // Fail safe - return false on error
  }
}

/**
 * Batch check multiple toggles at once via RPC calls
 * @param ff4cfService - The FF4CF RPC service binding
 * @param toggles - Array of toggle configurations to check
 * @returns Promise resolving to object with toggle states
 */
export async function checkToggles(
  ff4cfService: FF4CFService,
  toggles: ToggleConfig[]
): Promise<Record<string, boolean>> {
  const results = await Promise.allSettled(
    toggles.map(toggle => 
      ff4cfService.checkToggle(toggle.name, toggle.environment, toggle.appName)
        .then((enabled: boolean) => ({ name: toggle.name, enabled }))
    )
  );

  const toggleStates: Record<string, boolean> = {};
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      toggleStates[result.value.name] = result.value.enabled;
    } else {
      console.error(`Failed to check toggle ${toggles[index].name}:`, result.reason);
      toggleStates[toggles[index].name] = false; // Fail safe
    }
  });

  return toggleStates;
}

/**
 * Advanced toggle checker with caching support for RPC calls
 * This is useful for frequently accessed toggles to reduce RPC service calls
 */
export class ToggleCache {
  private cache = new Map<string, { value: boolean; expires: number }>();
  private readonly cacheTtlMs: number;

  constructor(cacheTtlSeconds: number = 30) {
    this.cacheTtlMs = cacheTtlSeconds * 1000;
  }

  async getToggle(
    ff4cfService: FF4CFService,
    toggleName: string,
    environment: string,
    appName: string
  ): Promise<boolean> {
    const cacheKey = `${toggleName}:${environment}:${appName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    const enabled = await ff4cfService.checkToggle(toggleName, environment, appName);
    
    this.cache.set(cacheKey, {
      value: enabled,
      expires: Date.now() + this.cacheTtlMs
    });

    return enabled;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export everything as default for convenience
export default {
  checkToggle,
  checkToggles,
  ToggleCache
};
