import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import TickTickSyncPlugin from "../main";
import { OAuthManager } from "../oauth/OAuthManager";
import { TickTickClient } from "../api/TickTickClient";
import { TickTickProject } from "./settings";

export class SettingsTab extends PluginSettingTab {
  plugin: TickTickSyncPlugin;
  projects: TickTickProject[] = [];

  constructor(app: App, plugin: TickTickSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Header
    containerEl.createEl("h2", { text: "TickTick Sync Settings" });

    // OAuth Section
    this.createOAuthSection(containerEl);

    // Sync Settings
    this.createSyncSection(containerEl);

    // Manual Sync Button
    new Setting(containerEl)
      .setName("Manual Sync")
      .setDesc("Force sync now")
      .addButton((button) =>
        button.setButtonText("Sync Now").onClick(() => {
          this.plugin.manualSync();
        })
      );
  }

  createOAuthSection(containerEl: HTMLElement) {
    const section = containerEl.createDiv("oauth-section");
    section.createEl("h3", { text: "Authentication" });

    // Connection status
    const statusEl = section.createEl("div", {
      cls: "connection-status",
      text: this.plugin.settings.accessToken
        ? "Connected to TickTick"
        : "Not connected",
    });
    if (this.plugin.settings.accessToken) {
      statusEl.style.color = "green";
    } else {
      statusEl.style.color = "red";
    }

    new Setting(section)
      .setName("Client ID")
      .setDesc("Your TickTick API Client ID")
      .addText((text) =>
        text
          .setPlaceholder("Enter Client ID")
          .setValue(this.plugin.settings.clientId)
          .onChange(async (value) => {
            this.plugin.settings.clientId = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(section)
      .setName("Client Secret")
      .setDesc("Your TickTick API Client Secret")
      .addText((text) =>
        text
          .setPlaceholder("Enter Client Secret")
          .setValue(this.plugin.settings.clientSecret)
          .onChange(async (value) => {
            this.plugin.settings.clientSecret = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(section)
      .setName("Get Authorization Code")
      .setDesc("Click to open TickTick authorization page")
      .addButton((button) =>
        button.setButtonText("Open Authorization Page").onClick(async () => {
          if (!this.plugin.settings.clientId || !this.plugin.settings.clientSecret) {
            new Notice("Please enter Client ID and Client Secret first");
            return;
          }

          const oauthManager = new OAuthManager(
            this.plugin,
            this.plugin.settings
          );
          await oauthManager.startManualAuthFlow();
        })
      );

    new Setting(section)
      .setName("Authorization Code")
      .setDesc("Paste the authorization code from the redirect URL")
      .addText((text) =>
        text
          .setPlaceholder("Paste code here (e.g., xxxxxxxx)")
          .setValue(this.plugin.settings.authCode || "")
          .onChange(async (value) => {
            this.plugin.settings.authCode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(section)
      .setName("Connect")
      .setDesc("Exchange authorization code for access token")
      .addButton((button) =>
        button.setButtonText("Connect").onClick(async () => {
          if (!this.plugin.settings.authCode) {
            new Notice("Please get authorization code first");
            return;
          }

          try {
            const oauthManager = new OAuthManager(
              this.plugin,
              this.plugin.settings
            );
            const tokenData = await oauthManager.exchangeAuthCodeForToken(
              this.plugin.settings.authCode
            );

            this.plugin.updateToken(
              tokenData.access_token,
              tokenData.refresh_token
            );

            new Notice("Successfully connected to TickTick!");
            this.display();
          } catch (error) {
            new Notice(`Failed to connect: ${error.message}`);
          }
        })
      );

    new Setting(section)
      .setName("Disconnect")
      .addButton((button) =>
        button.setButtonText("Disconnect").onClick(async () => {
          this.plugin.settings.accessToken = "";
          this.plugin.settings.refreshToken = "";
          this.plugin.settings.authCode = "";
          await this.plugin.saveSettings();
          new Notice("Disconnected from TickTick");
          this.display();
        })
      );
  }

  createSyncSection(containerEl: HTMLElement) {
    const section = containerEl.createDiv("sync-section");
    section.createEl("h3", { text: "Sync Settings" });

    // Target page
    new Setting(section)
      .setName("Target Page")
      .setDesc("The Obsidian page where tasks will be synced")
      .addText((text) =>
        text
          .setPlaceholder("TickTick Tasks")
          .setValue(this.plugin.settings.targetPagePath)
          .onChange(async (value) => {
            this.plugin.settings.targetPagePath = value;
            await this.plugin.saveSettings();
          })
      );

    // Sync interval
    new Setting(section)
      .setName("Sync Interval")
      .setDesc("How often to sync (in minutes)")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("1", "1 minute")
          .addOption("5", "5 minutes")
          .addOption("10", "10 minutes")
          .addOption("30", "30 minutes")
          .addOption("60", "1 hour")
          .setValue(String(this.plugin.settings.syncInterval))
          .onChange(async (value) => {
            this.plugin.settings.syncInterval = parseInt(value);
            await this.plugin.saveSettings();
            this.plugin.startAutoSync();
          })
      );

    // Auto sync toggle
    new Setting(section)
      .setName("Auto Sync")
      .setDesc("Automatically sync at the specified interval")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSync)
          .onChange(async (value) => {
            this.plugin.settings.autoSync = value;
            await this.plugin.saveSettings();
            this.plugin.startAutoSync();
          })
      );

    // Include completed tasks toggle
    new Setting(section)
      .setName("Include Completed Tasks")
      .setDesc("Include completed tasks in sync")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeCompleted)
          .onChange(async (value) => {
            this.plugin.settings.includeCompleted = value;
            await this.plugin.saveSettings();
          })
      );

    // Completed tasks days limit
    new Setting(section)
      .setName("Completed Tasks Range")
      .setDesc("How many days of completed tasks to include")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("1", "1 day")
          .addOption("3", "3 days")
          .addOption("7", "7 days")
          .addOption("14", "14 days")
          .addOption("30", "30 days")
          .setValue(String(this.plugin.settings.completedDaysLimit))
          .onChange(async (value) => {
            this.plugin.settings.completedDaysLimit = parseInt(value);
            await this.plugin.saveSettings();
          })
      );

    // Project selection
    if (this.plugin.settings.accessToken) {
      new Setting(section)
        .setName("Select Projects")
        .setDesc("Choose which TickTick projects to sync");

      this.loadProjects(section);
    }
  }

  async loadProjects(container: HTMLElement) {
    try {
      const client = new TickTickClient(this.plugin.settings.accessToken);
      this.projects = await client.getProjects();

      const projectList = container.createDiv("project-list");

      if (this.projects.length === 0) {
        projectList.createEl("p", { text: "No projects found" });
        return;
      }

      for (const project of this.projects) {
        new Setting(projectList)
          .setName(project.name)
          .setDesc(`Color: ${project.color}`)
          .addToggle((toggle) => {
            const isSelected = this.plugin.settings.selectedProjects.includes(
              project.id
            );
            toggle.setValue(isSelected);
            toggle.onChange(async (selected) => {
              if (selected) {
                if (!this.plugin.settings.selectedProjects.includes(project.id)) {
                  this.plugin.settings.selectedProjects.push(project.id);
                }
              } else {
                this.plugin.settings.selectedProjects =
                  this.plugin.settings.selectedProjects.filter(
                    (id: string) => id !== project.id
                  );
              }
              await this.plugin.saveSettings();
            });
          });
      }
    } catch (error) {
      container.createEl("p", {
        text: `Failed to load projects: ${error.message}`,
        cls: "error-text",
      });
    }
  }
}
