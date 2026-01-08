import { Notice, TFile, Editor } from "obsidian";
import TickTickSyncPlugin from "../main";
import { TickTickClient } from "../api/TickTickClient";
import { TickTickSettings, TickTickTask } from "../settings/settings";
import { TaskParser, ParsedTask, PageSection } from "./TaskParser";
import { TaskMapper } from "./TaskMapper";

// Task categorization helper
interface TaskWithProject extends TickTickTask {
  projectName?: string;
  previousDueDate?: string;
  previousStatus?: number;
}

interface TaskGroup {
  today: TaskWithProject[];
  yesterday: TaskWithProject[];
  tomorrow: TaskWithProject[];
  noDate: TaskWithProject[];
}

// Stored task state for change detection
interface StoredTaskState {
  id: string;
  title: string;
  status: number;
  dueDate?: string;
}

export class SyncManager {
  private plugin: TickTickSyncPlugin;
  private client: TickTickClient;
  private settings: TickTickSettings;
  private parser: TaskParser;
  private mapper: TaskMapper;
  private lastSyncContent: string = "";

  constructor(
    plugin: TickTickSyncPlugin,
    client: TickTickClient,
    settings: TickTickSettings
  ) {
    this.plugin = plugin;
    this.client = client;
    this.settings = settings;
    this.parser = new TaskParser();
    this.mapper = new TaskMapper();
  }

  async fullSync(): Promise<void> {
    if (!this.settings.selectedProjects.length) {
      new Notice("No projects selected for sync");
      return;
    }

    // Fetch and filter tasks from selected projects
    const filteredTasks: TaskWithProject[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const completedCutoff = new Date(
      today.getTime() - this.settings.completedDaysLimit * 24 * 60 * 60 * 1000
    );

    for (const projectId of this.settings.selectedProjects) {
      try {
        const tasks = await this.client.getProjectTasks(projectId);
        const project = await this.client.getProject(projectId);

        for (const task of tasks) {
          // Filter by status
          const isCompleted = task.status === 2;

          // If not including completed tasks, skip completed ones
          if (!this.settings.includeCompleted && isCompleted) {
            continue;
          }

          // If including completed tasks, filter by date range
          if (this.settings.includeCompleted && isCompleted) {
            if (task.completedTime) {
              const completedDate = new Date(task.completedTime);
              if (completedDate < completedCutoff) {
                continue; // Skip old completed tasks
              }
            }
          }

          // Add project name to task
          filteredTasks.push({
            ...task,
            projectName: project.name,
            previousDueDate: task.dueDate,
            previousStatus: task.status,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch tasks for project ${projectId}:`, error);
        new Notice(`Failed to sync project: ${error.message}`);
      }
    }

    // Generate Obsidian content
    const content = await this.generatePageContent(filteredTasks, today, yesterday, tomorrow);

    // Save the content for comparison on next sync
    this.lastSyncContent = content;

    // Write to target page
    await this.writeToPage(content);

    new Notice(`Synced ${filteredTasks.length} tasks`);
  }

  async syncFromObsidian(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(
      this.settings.targetPagePath + (this.settings.targetPagePath.endsWith(".md") ? "" : ".md")
    );

    if (!file || !(file instanceof TFile)) {
      new Notice("Target page not found. Please create it first.");
      return;
    }

    const content = await this.app.vault.read(file);
    const { tasks, sections } = this.parser.parsePageWithSections(content);

    let syncCount = 0;
    let errorCount = 0;

    // Get project IDs by name
    const projectIdByName = new Map<string, string>();
    try {
      const projects = await this.client.getProjects();
      for (const project of projects) {
        projectIdByName.set(project.name, project.id);
      }
    } catch (error) {
      console.error("Failed to get projects:", error);
    }

    for (const task of tasks) {
      if (!task.projectName) continue;

      const projectId = projectIdByName.get(task.projectName);
      if (!projectId) continue;

      // Find the section this task is in to determine due date changes
      const taskSection = this.findTaskSection(task, sections);

      try {
        // Handle existing tasks
        if (task.ticktickId) {
          const existingTask = await this.client.getTask(projectId, task.ticktickId);

          // Check for status changes
          const wasCompleted = existingTask.status === 2;
          const isNowCompleted = task.completed;

          if (wasCompleted && !isNowCompleted) {
            // Uncomplete task
            await this.client.updateTask(task.ticktickId, {
              id: task.ticktickId,
              projectId,
              status: 0,
            });
            syncCount++;
            new Notice(`Reopened: ${task.title}`);
          } else if (!wasCompleted && isNowCompleted) {
            // Complete task
            await this.client.completeTask(projectId, task.ticktickId);
            syncCount++;
            new Notice(`Completed: ${task.title}`);
          }

          // Check for title changes
          if (existingTask.title !== task.title) {
            await this.client.updateTask(task.ticktickId, {
              id: task.ticktickId,
              projectId,
              title: task.title,
            });
            syncCount++;
          }

          // Check for due date changes based on section
          const newDueDate = this.getDueDateFromSection(taskSection);
          if (newDueDate !== existingTask.dueDate) {
            await this.client.updateTask(task.ticktickId, {
              id: task.ticktickId,
              projectId,
              dueDate: newDueDate || undefined,
            });
            syncCount++;
            new Notice(`Updated date: ${task.title}`);
          }
        }
        // Handle new tasks (without ticktickId but have project)
        else if (projectId && task.title.trim()) {
          const newTask = await this.client.createTask({
            title: task.title,
            projectId,
            dueDate: task.dueDate,
          });
          syncCount++;
          new Notice(`Created: ${task.title}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to sync task "${task.title}":`, error);
      }
    }

    if (syncCount > 0) {
      new Notice(`Synced ${syncCount} changes to TickTick`);
    }

    if (errorCount > 0) {
      new Notice(`${errorCount} tasks failed to sync`);
    }
  }

  private findTaskSection(task: ParsedTask, sections: PageSection[]): PageSection | null {
    // Simple implementation - find the last section before this task
    // In a real implementation, we would track line numbers
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].type !== "unknown") {
        return sections[i];
      }
    }
    return null;
  }

  private getDueDateFromSection(section: PageSection | null): string | undefined {
    if (!section) return undefined;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (section.type) {
      case "todo-today":
        // Set to end of today
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        return todayEnd.toISOString();

      case "todo-tomorrow":
        // Set to end of tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        return tomorrow.toISOString();

      case "todo-nodate":
        // Clear the due date
        return undefined;

      case "completed-today":
      case "completed-yesterday":
      case "completed-earlier":
        // For completed tasks, we don't change the due date
        return undefined;

      default:
        return undefined;
    }
  }

  async handleObsidianChange(file: TFile): Promise<void> {
    // Debounce file changes to avoid too many API calls
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await this.syncFromObsidian();
  }

  async createTaskFromObsidian(
    title: string,
    projectId: string
  ): Promise<TickTickTask | null> {
    try {
      const task = await this.client.createTask({
        title,
        projectId,
      });
      return task;
    } catch (error) {
      console.error("Failed to create task:", error);
      return null;
    }
  }

  async deleteTask(taskId: string, projectId: string): Promise<void> {
    try {
      await this.client.deleteTask(projectId, taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
      throw error;
    }
  }

  async completeTask(taskId: string, projectId: string): Promise<void> {
    try {
      await this.client.completeTask(projectId, taskId);
    } catch (error) {
      console.error("Failed to complete task:", error);
      throw error;
    }
  }

  private async generatePageContent(
    tasks: TaskWithProject[],
    today: Date,
    yesterday: Date,
    tomorrow: Date
  ): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push("# TickTick Tasks");
    lines.push(`Last synced: ${new Date().toLocaleString()}`);
    lines.push("");

    // Separate uncompleted and completed tasks
    const uncompletedTasks = tasks.filter((t) => t.status !== 2);
    const completedTasks = tasks.filter((t) => t.status === 2);

    // Categorize uncompleted tasks by due date
    const uncompletedGroups: TaskGroup = {
      today: [],
      yesterday: [],
      tomorrow: [],
      noDate: [],
    };

    for (const task of uncompletedTasks) {
      const category = this.categorizeTaskByDate(
        task,
        today,
        yesterday,
        tomorrow
      );
      uncompletedGroups[category].push(task);
    }

    // Categorize completed tasks by completed time
    const completedGroups: TaskGroup = {
      today: [],
      yesterday: [],
      tomorrow: [],
      noDate: [],
    };

    for (const task of completedTasks) {
      if (task.completedTime) {
        const completedDate = new Date(task.completedTime);
        const completedDay = new Date(
          completedDate.getFullYear(),
          completedDate.getMonth(),
          completedDate.getDate()
        );

        if (completedDay.getTime() === today.getTime()) {
          completedGroups.today.push(task);
        } else if (completedDay.getTime() === yesterday.getTime()) {
          completedGroups.yesterday.push(task);
        } else {
          completedGroups.noDate.push(task);
        }
      } else {
        completedGroups.noDate.push(task);
      }
    }

    // Output uncompleted tasks section
    if (uncompletedTasks.length > 0) {
      lines.push("## To Do");
      lines.push("");

      // Today
      if (uncompletedGroups.today.length > 0) {
        lines.push("### Today");
        for (const task of uncompletedGroups.today) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }

      // Tomorrow
      if (uncompletedGroups.tomorrow.length > 0) {
        lines.push("### Tomorrow");
        for (const task of uncompletedGroups.tomorrow) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }

      // No due date
      if (uncompletedGroups.noDate.length > 0) {
        lines.push("### No Date");
        for (const task of uncompletedGroups.noDate) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }
    }

    // Output completed tasks section (if any)
    if (completedTasks.length > 0) {
      lines.push("## Completed");
      lines.push("");

      // Today
      if (completedGroups.today.length > 0) {
        lines.push("### Today");
        for (const task of completedGroups.today) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }

      // Yesterday
      if (completedGroups.yesterday.length > 0) {
        lines.push("### Yesterday");
        for (const task of completedGroups.yesterday) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }

      // Earlier
      if (completedGroups.noDate.length > 0) {
        lines.push("### Earlier");
        for (const task of completedGroups.noDate) {
          lines.push(this.mapper.taskToMarkdown(task, task.projectName));
          lines.push("");
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  private categorizeTaskByDate(
    task: TaskWithProject,
    today: Date,
    yesterday: Date,
    tomorrow: Date
  ): keyof TaskGroup {
    if (!task.dueDate && !task.startDate) {
      return "noDate";
    }

    const dateStr = task.dueDate || task.startDate;
    const taskDate = new Date(dateStr);
    const taskDay = new Date(
      taskDate.getFullYear(),
      taskDate.getMonth(),
      taskDate.getDate()
    );

    if (taskDay.getTime() === today.getTime()) {
      return "today";
    } else if (taskDay.getTime() === yesterday.getTime()) {
      return "yesterday";
    } else if (taskDay.getTime() === tomorrow.getTime()) {
      return "tomorrow";
    } else {
      return "noDate";
    }
  }

  private async writeToPage(content: string): Promise<void> {
    const path = this.settings.targetPagePath;

    // Check if page exists
    let file = this.app.vault.getAbstractFileByPath(
      path.endsWith(".md") ? path : path + ".md"
    );

    if (file && file instanceof TFile) {
      // Update existing file
      await this.app.vault.modify(file, content);
    } else {
      // Create new file
      const newPath = path.endsWith(".md") ? path : path + ".md";
      await this.app.vault.create(newPath, content);
    }
  }

  private get app() {
    return this.plugin.app;
  }
}
