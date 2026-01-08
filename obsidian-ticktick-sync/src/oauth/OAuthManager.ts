import { Notice } from "obsidian";
import TickTickSyncPlugin from "../main";
import { TickTickSettings } from "../settings/settings";

const AUTH_URL = "https://dida365.com/oauth/authorize";
const TOKEN_URL = "https://dida365.com/oauth/token";

export class OAuthManager {
  private plugin: TickTickSyncPlugin;
  private settings: TickTickSettings;

  constructor(plugin: TickTickSyncPlugin, settings: TickTickSettings) {
    this.plugin = plugin;
    this.settings = settings;
  }

  async startManualAuthFlow(): Promise<void> {
    const redirectUri = "http://localhost"; // Placeholder - not actually used for callback
    const scope = "tasks:read tasks:write";
    const state = this.generateState();

    const authUrl = new URL(AUTH_URL);
    authUrl.searchParams.set("client_id", this.settings.clientId);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");

    new Notice("Opening TickTick authorization page...");
    window.open(authUrl.toString());
  }

  async exchangeAuthCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const credentials = btoa(
      `${this.settings.clientId}:${this.settings.clientSecret}`
    );

    const params = new URLSearchParams();
    params.set("code", code);
    params.set("grant_type", "authorization_code");
    params.set("redirect_uri", "http://localhost");
    params.set("scope", "tasks:read tasks:write");

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.settings.refreshToken) {
      return null;
    }

    try {
      const credentials = btoa(
        `${this.settings.clientId}:${this.settings.clientSecret}`
      );

      const params = new URLSearchParams();
      params.set("refresh_token", this.settings.refreshToken);
      params.set("grant_type", "refresh_token");
      params.set("scope", "tasks:read tasks:write");

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();

      this.plugin.updateToken(
        tokenData.access_token,
        tokenData.refresh_token
      );

      return tokenData.access_token;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}
