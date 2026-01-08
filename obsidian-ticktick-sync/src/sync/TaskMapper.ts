import { TickTickTask, TickTickSubTask } from "../settings/settings";

export class TaskMapper {
  taskToMarkdown(task: TickTickTask, projectName?: string): string {
    const lines: string[] = [];

    // Checkbox
    const checkbox = this.isCompleted(task.status) ? "[x]" : "[ ]";

    // Title with metadata
    let title = task.title;
    // 项目名称代替projectId
    if (projectName) {
      title += ` #project:${projectName}`;
    }

    // Priority indicator
    const priorityIndicator = this.priorityToIndicator(task.priority);

    // Time range: startDate ~ dueDate
    const timeStr = this.formatTimeRange(task.startDate, task.dueDate);

    // Main task line
    lines.push(`- ${checkbox} ${priorityIndicator}${title}${timeStr}`);

    // Add description if exists
    if (task.desc && task.desc.trim()) {
      lines.push(`  > ${task.desc}`);
    }

    // Add subtasks
    if (task.items && task.items.length > 0) {
      for (const item of task.items) {
        const itemLine = this.subTaskToMarkdown(item);
        lines.push(`  ${itemLine}`);
      }
    }

    return lines.join("\n");
  }

  subTaskToMarkdown(subTask: TickTickSubTask): string {
    const checkbox = subTask.status === 1 ? "[x]" : "[ ]";
    return `- ${checkbox} ${subTask.title}`;
  }

  markdownToTask(line: string): {
    title: string;
    completed: boolean;
    priority: number;
    dueDate?: string;
  } {
    // Remove checkbox
    const cleaned = line.replace(/^\s*-\s*\[([ x])\]\s*/i, "");

    // Parse priority indicator
    let priority = 0;
    let title = cleaned;

    // Priority icons: 🔴=High, 🟡=Medium, 🟢=Low
    if (title.startsWith("🔴 ")) {
      priority = 5;
      title = title.slice(3);
    } else if (title.startsWith("🟡 ")) {
      priority = 3;
      title = title.slice(3);
    } else if (title.startsWith("🟢 ")) {
      priority = 1;
      title = title.slice(3);
    }

    // Remove metadata
    title = title.replace(/\s+#project:\w+/gi, "");

    // Remove time range #date(2024-01-15 09:00 - 2024-01-15 18:00)
    const timeMatch = title.match(/#date\(.+\)/);
    if (timeMatch) {
      title = title.replace(/#date\(.+\)/, "").trim();
    }

    return {
      title: title.trim(),
      completed: false, // Will be determined by checkbox
      priority,
      dueDate: undefined,
    };
  }

  formatTimeRange(startDate?: string, dueDate?: string): string {
    if (!startDate && !dueDate) {
      return "";
    }

    const start = startDate ? this.formatDateForDisplay(startDate) : null;
    const end = dueDate ? this.formatDateForDisplay(dueDate) : null;

    if (start && end) {
      if (start === end) {
        return ` #date(${start})`;
      }
      return ` #date(${start} - ${end})`;
    } else if (start) {
      return ` #date(${start})`;
    } else if (end) {
      return ` #date(${end})`;
    }

    return "";
  }

  formatDateForDisplay(dateString: string): string {
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      // For all-day tasks, just show date
      if (dateString.includes("T00:00:00") || dateString.endsWith("T00:00:00.000Z")) {
        return `${date.getFullYear()}-${month}-${day}`;
      }

      return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  }

  priorityToIndicator(priority?: number): string {
    switch (priority) {
      case 5:
        return "🔴 "; // High
      case 3:
        return "🟡 "; // Medium
      case 1:
        return "🟢 "; // Low
      default:
        return "";
    }
  }

  indicatorToPriority(indicator: string): number {
    switch (indicator.trim()) {
      case "🔴":
        return 5;
      case "🟡":
        return 3;
      case "🟢":
        return 1;
      default:
        return 0;
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  parseDate(dateStr: string): string | undefined {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return undefined;
      }
      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  // Convert Task to API request format
  taskToCreateRequest(task: Partial<TickTickTask>): Record<string, unknown> {
    return {
      title: task.title,
      projectId: task.projectId,
      content: task.content,
      desc: task.desc,
      isAllDay: task.isAllDay,
      startDate: task.startDate,
      dueDate: task.dueDate,
      timeZone: task.timeZone || "Asia/Shanghai",
      priority: task.priority,
      sortOrder: task.sortOrder,
      repeatFlag: task.repeatFlag,
      reminders: task.reminders,
    };
  }

  // Convert API response to Task
  apiResponseToTask(response: Record<string, unknown>): TickTickTask {
    return {
      id: response.id as string,
      projectId: response.projectId as string,
      title: response.title as string,
      content: response.content as string,
      desc: response.desc as string,
      isAllDay: response.isAllDay as boolean,
      startDate: response.startDate as string,
      dueDate: response.dueDate as string,
      timeZone: response.timeZone as string,
      priority: response.priority as number,
      status: response.status as number,
      completedTime: response.completedTime as string,
      sortOrder: response.sortOrder as number,
      repeatFlag: response.repeatFlag as string,
      reminders: response.reminders as string[],
      kind: response.kind as string,
    };
  }

  private isCompleted(status?: number): boolean {
    return status === 1 || status === 2;
  }
}
