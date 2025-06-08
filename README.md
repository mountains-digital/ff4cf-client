# FF4CF Client Library

A TypeScript client library for interacting with [FF4CF (Feature Flags for Cloudflare)](https://github.com/mountains-digital/ff4cf) via RPC service bindings in Cloudflare Workers.

## Overview

This library provides helper functions and utilities for checking feature toggle states in your Cloudflare Workers using FF4CF's RPC service binding interface. It enables high-performance, zero-latency feature flag checks within Cloudflare's edge network.

You must have the FF4CF application deployed as a worker in the same CloudFlare account your worker is running in.

## Features

- 🚀 **Ultra-low latency** - Direct RPC calls within Cloudflare's network
- 🔒 **No authentication required** - Service bindings handle security automatically
- 📦 **TypeScript support** - Full type definitions included
- ⚡ **Batch operations** - Check multiple toggles efficiently
- 🧠 **Intelligent caching** - Optional caching layer for frequently accessed toggles
- 🛡️ **Fail-safe design** - Returns `false` on errors to prevent application crashes

## Installation

```bash
# Install the package
npm install @mountains-digital/ff4cf-client
```

## Configuration

### 1. Service Binding Setup

Configure your Cloudflare Worker to use FF4CF as a service binding in your `wrangler.toml`:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"

# RPC Service binding to FF4CF
[[services]]
binding = "FF4CF"
service = "ff4cf"        # Your deployed FF4CF worker name
entrypoint = "FF4CF"     # RPC class name for direct method calls
```

### 2. TypeScript Environment

Define your worker environment interface:

```typescript
interface Env {
  FF4CF: any; // RPC service binding to FF4CF
}
```

## Usage

### Basic Toggle Check

```typescript
import { checkToggle } from "@mountains-digital/ff4cf-client";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Check if a feature is enabled
    const isNewDesignEnabled = await checkToggle(
      env.FF4CF,
      "new-homepage-design",
      "production",
      "my-app"
    );

    if (isNewDesignEnabled) {
      return new Response("New design enabled!");
    } else {
      return new Response("Classic design");
    }
  }
};
```

### Batch Toggle Checks

```typescript
import { checkToggles } from "@mountains-digital/ff4cf-client";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Check multiple toggles at once
    const toggleStates = await checkToggles(env.FF4CF, [
      { name: "new-homepage", environment: "production", appName: "my-app" },
      { name: "dark-mode", environment: "production", appName: "my-app" },
      { name: "beta-features", environment: "production", appName: "my-app" }
    ]);

    return Response.json({
      features: toggleStates,
      timestamp: new Date().toISOString()
    });
  }
};
```

### Cached Toggle Checks

For frequently accessed toggles, use the caching layer to improve performance:

```typescript
import { ToggleCache } from "@mountains-digital/ff4cf-client";

// Initialize cache with 60-second TTL
const toggleCache = new ToggleCache(60);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // This will cache the result for 60 seconds
    const isEnabled = await toggleCache.getToggle(
      env.FF4CF,
      "frequently-checked-feature",
      "production",
      "my-app"
    );

    return new Response(`Feature is ${isEnabled ? 'enabled' : 'disabled'}`);
  }
};
```

## API Reference

### `checkToggle(ff4cfService, toggleName, environment, appName)`

Check if a single feature toggle is enabled.

**Parameters:**

- `ff4cfService: any` - The FF4CF RPC service binding from your environment
- `toggleName: string` - Name of the feature toggle to check
- `environment: string` - Environment to check (e.g., "development", "staging", "production")
- `appName: string` - Name of your application (used for tracking and auto-registration)

**Returns:** `Promise<boolean>` - `true` if enabled, `false` if disabled or on error

### `checkToggles(ff4cfService, toggleConfigs)`

Check multiple feature toggles in a single batch operation.

**Parameters:**

- `ff4cfService: any` - The FF4CF RPC service binding
- `toggleConfigs: ToggleConfig[]` - Array of toggle configurations

**Returns:** `Promise<Record<string, boolean>>` - Object mapping toggle names to their states

### `ToggleCache`

A caching layer for frequently accessed toggles.

**Constructor:**

- `new ToggleCache(cacheTtlSeconds: number = 30)`

**Methods:**

- `getToggle(ff4cfService, toggleName, environment, appName): Promise<boolean>`
- `clearCache(): void`

## Complete Example

Here's a full example of a Cloudflare Worker using FF4CF with this client library:

```typescript
import { checkToggle, checkToggles, ToggleCache } from "@mountains-digital/ff4cf-client";

interface Env {
  FF4CF: any;
}

const toggleCache = new ToggleCache(60);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const appName = "ff4cf-demo";

    switch (url.pathname) {
      case "/":
        return handleHomepage(env.FF4CF, appName);
      
      case "/checkout":
        return handleCheckout(env.FF4CF, appName);
      
      case "/api/features":
        return handleFeatureAPI(env.FF4CF, appName);
      
      default:
        return new Response("Not Found", { status: 404 });
    }
  }
};

async function handleHomepage(ff4cfService: any, appName: string) {
  const newDesignEnabled = await checkToggle(
    ff4cfService,
    "new-homepage-design",
    "production",
    appName
  );

  const html = `
    <html>
      <body style="background: ${newDesignEnabled ? '#modern' : '#classic'}">
        <h1>Welcome to Our Store!</h1>
        <p>Design: ${newDesignEnabled ? 'New' : 'Classic'}</p>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

async function handleCheckout(ff4cfService: any, appName: string) {
  const features = await checkToggles(ff4cfService, [
    { name: "one-click-checkout", environment: "production", appName },
    { name: "express-shipping", environment: "production", appName },
    { name: "guest-checkout", environment: "production", appName }
  ]);

  return Response.json({ checkout_features: features });
}

async function handleFeatureAPI(ff4cfService: any, appName: string) {
  // Use cache for API endpoint that might be called frequently
  const darkModeEnabled = await toggleCache.getToggle(
    ff4cfService,
    "dark-mode",
    "production",
    appName
  );

  return Response.json({
    dark_mode: darkModeEnabled,
    app: appName,
    environment: "production"
  });
}
```

## Performance Benefits

| Metric | HTTP API | RPC Service Binding | Improvement |
|--------|----------|-------------------|-------------|
| **Latency** | 10-50ms | 1-2ms | **95% faster** |
| **Authentication** | JWT required | None | **Zero overhead** |
| **Network hops** | External HTTP | Direct calls | **No serialization** |
| **Error handling** | HTTP status codes | Direct exceptions | **Simpler** |

## Auto-Registration

When you check a toggle that doesn't exist, FF4CF automatically creates it in the disabled state. This means you can start using feature flags in your code immediately without manual setup.

```typescript
// This toggle will be auto-created if it doesn't exist
const newFeatureEnabled = await checkToggle(
  env.FF4CF,
  "brand-new-feature",  // ← Will be created automatically
  "production",
  "my-app"
);
// Returns: false (disabled by default)
```

## Error Handling

The library follows a fail-safe design pattern. If any errors occur (network issues, service unavailable, etc.), the functions return `false` to ensure your application continues to work:

```typescript
// Even if FF4CF is down, your app keeps working
const isEnabled = await checkToggle(env.FF4CF, "feature", "prod", "app");
// Returns: false (safe default) if any error occurs
```

## Related Documentation

- **[Cloudflare Workers Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)** - Official documentation for service bindings
- **[Cloudflare RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/)** - Documentation for RPC in Cloudflare Workers
- **[FF4CF Main Repository](https://github.com/mountains-cloud/ff4cf)** - The main FF4CF feature flag service
- **[Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/)** - TypeScript support in Workers

**Benefits of migration:**

- ✅ **95% faster** response times
- ✅ **No authentication** required
- ✅ **Simpler code** - one line vs multiple
- ✅ **Better error handling** - automatic fail-safe behavior
- ✅ **Zero external dependencies** - works entirely within Cloudflare's network

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/mountains-digital/ff4cf-client/issues)
- **Documentation**: [FF4CF Documentation](https://github.com/mountains-digital/ff4cf)
