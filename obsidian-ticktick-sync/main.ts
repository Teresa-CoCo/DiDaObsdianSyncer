import { Plugin, Notice, TFile, WorkspaceLeaf, Menu } from "obsidian";
import { TickTickSettings, DEFAULT_SETTINGS, TickTickProject } from "./src/settings/settings";
import { TickTickClient } from "./src/api/TickTickClient";
import { OAuthManager } from "./src/oauth/OAuthManager";
import { SyncManager } from "./src/sync/SyncManager";
import { SettingsTab } from "./src/settings/SettingsTab";

export default class TickTickSyncPlugin extends Plugin {
  settings: TickTickSettings;
  client: TickTickClient | null = null;
  oauthManager: OAuthManager | null = null;
  syncManager: SyncManager | null = null;
  syncInterval: number | null = null;

  async onload() {
    console.log("Loading TickTick Sync plugin");

    // 加载设置
    await this.loadSettings();

    // 初始化组件
    this.initializeComponents();

    // 注册设置界面
    this.addSettingTab(new SettingsTab(this.app, this));

    // 添加侧边栏同步按钮 (Ribbon icon)
    this.addRibbonIcon("refresh-cw", "Sync TickTick", async () => {
      await this.manualSync();
    });

    // 添加侧边栏新增任务按钮
    this.addRibbonIcon("plus", "Create new task", () => {
      this.showCreateTaskModal();
    });

    // 注册命令
    this.addCommand({
      id: "sync-ticktick",
      name: "Sync now",
      callback: () => this.manualSync(),
    });

    this.addCommand({
      id: "sync-ticktick-create-task",
      name: "Create task from selection",
      editorCallback: (editor, view) => {
        const selection = editor.getSelection();
        if (selection) {
          this.createTaskFromSelection(selection);
        }
      },
    });

    this.addCommand({
      id: "sync-ticktick-create-task-modal",
      name: "Create new task",
      callback: () => this.showCreateTaskModal(),
    });

    this.addCommand({
      id: "sync-ticktick-push-sync",
      name: "Push changes to TickTick",
      callback: () => this.pushSync(),
    });

    // 启动自动同步
    this.startAutoSync();

    // 监听文件变化（用于推送同步）
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && this.settings.targetPagePath) {
          this.handleFileChange(file);
        }
      })
    );

    console.log("TickTick Sync plugin loaded");
  }

  onunload() {
    console.log("Unloading TickTick Sync plugin");
    this.stopAutoSync();
  }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeComponents();
  }

  initializeComponents() {
    if (this.settings.accessToken) {
      this.client = new TickTickClient(this.settings.accessToken);
      this.oauthManager = new OAuthManager(this, this.settings);
      this.syncManager = new SyncManager(this, this.client, this.settings);
    }
  }

  startAutoSync() {
    this.stopAutoSync();
    if (this.settings.autoSync && this.settings.syncInterval > 0) {
      this.syncInterval = window.setInterval(() => {
        this.sync();
      }, this.settings.syncInterval * 60 * 1000); // 转换为毫秒
    }
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async manualSync() {
    if (!this.settings.accessToken) {
      new Notice("Please connect to TickTick first in settings");
      return;
    }

    new Notice("Syncing with TickTick...");
    try {
      await this.sync();
      new Notice("Sync completed!");
    } catch (error) {
      new Notice(`Sync failed: ${error.message}`);
      console.error("Sync error:", error);
    }
  }

  async sync() {
    if (!this.syncManager) {
      throw new Error("Plugin not initialized. Please connect to TickTick first.");
    }
    await this.syncManager.fullSync();
  }

  async pushSync() {
    if (!this.syncManager) {
      new Notice("Please connect to TickTick first in settings");
      return;
    }

    new Notice("Pushing changes to TickTick...");
    try {
      await this.syncManager.syncFromObsidian();
    } catch (error) {
      new Notice(`Push sync failed: ${error.message}`);
      console.error("Push sync error:", error);
    }
  }

  async createTaskFromSelection(content: string) {
    if (!this.client) {
      new Notice("Please connect to TickTick first in settings");
      return;
    }

    if (!this.settings.selectedProjects.length) {
      new Notice("Please select a project in settings");
      return;
    }

    // Create task in the first selected project
    const projectId = this.settings.selectedProjects[0];
    try {
      const task = await this.client.createTask({
        title: content,
        projectId,
      });
      new Notice(`Task created: ${task.title}`);
    } catch (error) {
      new Notice(`Failed to create task: ${error.message}`);
    }
  }

  async showCreateTaskModal() {
    if (!this.client) {
      new Notice("Please connect to TickTick first in settings");
      return;
    }

    if (!this.settings.selectedProjects.length) {
      new Notice("Please select a project in settings");
      return;
    }

    // Get project names
    const projects = await this.getSelectedProjects();
    if (!projects.length) {
      new Notice("No projects selected");
      return;
    }

    // Show modal
    const { Modal, Setting: ObsidianSetting } = await import("obsidian");
    const CreateTaskModal = class extends Modal {
      private plugin: TickTickSyncPlugin;
      private title: string = "";
      private dueDate: string = "";
      private priority: number = 0;
      private projectId: string;
      private projects: { id: string; name: string }[];

      constructor(app: any, plugin: TickTickSyncPlugin, projects: { id: string; name: string }[]) {
        super(app);
        this.plugin = plugin;
        this.projects = projects;
        this.projectId = projects[0]?.id || plugin.settings.selectedProjects[0];
      }

      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Create New Task" });

        // Project selector
        new ObsidianSetting(contentEl)
          .setName("Project")
          .addDropdown((dropdown) => {
            // Add project options
            for (const project of this.projects) {
              dropdown.addOption(project.id, project.name);
            }
            dropdown.setValue(this.projectId);
            dropdown.onChange((value) => {
              this.projectId = value;
            });
          });

        // Title input
        new ObsidianSetting(contentEl)
          .setName("Title")
          .addText((text) =>
            text.setPlaceholder("Task title").onChange((value) => {
              this.title = value;
            })
          );

        // Due date input
        new ObsidianSetting(contentEl)
          .setName("Due Date")
          .addText((text) =>
            text.setPlaceholder("2024-01-15").onChange((value) => {
              this.dueDate = value;
            })
          );

        // Priority dropdown
        new ObsidianSetting(contentEl)
          .setName("Priority")
          .addDropdown((dropdown) => {
            dropdown.addOption("0", "None");
            dropdown.addOption("1", "Low");
            dropdown.addOption("3", "Medium");
            dropdown.addOption("5", "High");
            dropdown.setValue("0");
            dropdown.onChange((value) => {
              this.priority = parseInt(value);
            });
          });

        // Create button
        new ObsidianSetting(contentEl)
          .addButton((button) =>
            button.setButtonText("Create").onClick(async () => {
              if (!this.title.trim()) {
                new Notice("Please enter a title");
                return;
              }

              try {
                const dueDate = this.dueDate
                  ? new Date(this.dueDate).toISOString()
                  : undefined;

                await this.plugin.client!.createTask({
                  title: this.title,
                  projectId: this.projectId,
                  dueDate,
                  priority: this.priority || undefined,
                });

                new Notice("Task created successfully!");
                this.close();
              } catch (error) {
                new Notice(`Failed to create task: ${error.message}`);
              }
            })
          )
          .addButton((button) =>
            button.setButtonText("Cancel").onClick(() => {
              this.close();
            })
          );
      }

      onClose() {
        this.contentEl.empty();
      }
    };

    new CreateTaskModal(this.app, this, projects).open();
  }

  async getSelectedProjects(): Promise<TickTickProject[]> {
    if (!this.client) return [];

    try {
      const allProjects = await this.client.getProjects();
      return allProjects.filter((p) =>
        this.settings.selectedProjects.includes(p.id)
      );
    } catch {
      return [];
    }
  }

  async handleFileChange(file: TFile) {
    if (!this.syncManager || !this.settings.accessToken) return;

    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile && activeFile.path === this.settings.targetPagePath) {
      await this.syncManager.handleObsidianChange(activeFile);
    }
  }

  updateToken(token: string, refreshToken?: string) {
    this.settings.accessToken = token;
    if (refreshToken) {
      this.settings.refreshToken = refreshToken;
    }
    this.saveSettings();
    this.initializeComponents();
  }
}
