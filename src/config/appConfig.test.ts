import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appConfig, buildAuth0Options, loadAppConfig } from './appConfig';

const originalWindow = globalThis.window;

describe('appConfig & buildAuth0Options', () => {
  beforeEach(() => {
    globalThis.window = {
      location: { origin: 'http://localhost' },
    } as any;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('provides defaults from loadAppConfig', () => {
    const cfg = loadAppConfig();
    expect(cfg.apiBaseUrl).toBeDefined();
    expect(cfg.auth0).toHaveProperty('domain');
    expect(cfg.auth0).toHaveProperty('clientId');
  });

  it('builds auth0 options using config and window origin', () => {
    const opts = buildAuth0Options(appConfig);
    expect(opts.domain).toBe(appConfig.auth0.domain);
    expect(opts.clientId).toBe(appConfig.auth0.clientId);
    expect(opts.authorizationParams.redirect_uri).toBe('http://localhost');
    expect(opts.authorizationParams.scope).toContain('openid');
    expect(opts.authorizationParams.scope).toContain('profile');
    expect(opts.authorizationParams.scope).toContain('email');
    expect(opts.cacheLocation).toBe('localstorage');
  });
});
