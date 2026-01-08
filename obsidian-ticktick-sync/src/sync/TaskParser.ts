export interface ParsedTask {
  ticktickId?: string;
  projectId: string;
  projectName?: string;
  title: string;
  completed: boolean;
  priority?: number;
  dueDate?: string;
  startDate?: string;
  desc?: string;
  subtasks: ParsedSubTask[];
  rawLine: string;
  needsSync: boolean;
}

export interface ParsedSubTask {
  ticktickId?: string;
  title: string;
  completed: boolean;
  needsSync: boolean;
}

export interface PageSection {
  name: string;
  type: "todo-today" | "todo-tomorrow" | "todo-nodate" | "completed-today" | "completed-yesterday" | "completed-earlier" | "unknown";
  startLine: number;
}

export class TaskParser {
  // Pattern to match checkbox task lines
  // Supports: - [ ] Task, - [x] Task, - [ ] Task (completed), etc.
  private taskPattern = /^(\s*)(-)\s*\[([ x])\]\s*(.*)$/i;

  // Pattern to extract task metadata from title
  // Format: Task Title #project:ProjectName #date(2024-01-15)
  private projectMetaPattern = /#project:([^#\s]+)/i;
  private datePattern = /#date\(([^)]+)\)/i;

  // Pattern for section headers
  private sectionPattern = /^##?\s*(.+)$/;

  parsePageWithSections(content: string): { tasks: ParsedTask[]; sections: PageSection[] } {
    const lines = content.split("\n");
    const tasks: ParsedTask[] = [];
    const sections: PageSection[] = [];

    let currentSection: PageSection = {
      name: "Unknown",
      type: "unknown",
      startLine: 0
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Detect section headers
      const sectionMatch = line.match(this.sectionPattern);
      if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();
        currentSection = this.parseSectionType(sectionName, i);
        sections.push(currentSection);
        continue;
      }

      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Check if this is a task line
      const taskMatch = line.match(this.taskPattern);

      if (taskMatch) {
        const [, leadingSpaces, checkbox, status, rest] = taskMatch;
        const isCompleted = status.toLowerCase() === "x";
        const title = rest.trim();

        // Check for metadata
        const projectMatch = title.match(this.projectMetaPattern);
        const dateMatch = title.match(this.datePattern);

        // Extract date range
        let dueDate: string | undefined;
        let startDate: string | undefined;
        if (dateMatch) {
          const dateContent = dateMatch[1];
          // Parse "2024-01-15 09:00 - 2024-01-15 18:00" or just "2024-01-15"
          const dates = dateContent.split(" - ");
          if (dates.length >= 1) {
            dueDate = this.parseDateString(dates[0]);
          }
          if (dates.length >= 2) {
            startDate = this.parseDateString(dates[0]);
            dueDate = this.parseDateString(dates[1]);
          } else if (currentSection.type.startsWith("todo-") && !isCompleted) {
            // For uncompleted tasks with single date, use as dueDate
            dueDate = this.parseDateString(dates[0]);
          } else {
            // For completed tasks, use as start/completed date
            dueDate = this.parseDateString(dates[0]);
          }
        }

        // Update dueDate based on section for uncompleted tasks
        if (!dateMatch && !isCompleted) {
          if (currentSection.type === "todo-today") {
            dueDate = this.getTodayEnd();
          } else if (currentSection.type === "todo-tomorrow") {
            dueDate = this.getTomorrowEnd();
          }
        }

        const task: ParsedTask = {
          projectId: projectMatch ? projectMatch[1] : "",
          projectName: projectMatch ? projectMatch[1] : undefined,
          title: title
            .replace(this.projectMetaPattern, "")
            .replace(this.datePattern, "")
            .trim(),
          completed: isCompleted,
          dueDate,
          startDate,
          subtasks: [],
          rawLine: line,
          needsSync: false,
        };

        tasks.push(task);
      }
    }

    return { tasks, sections };
  }

  parsePageForTasks(content: string): ParsedTask[] {
    return this.parsePageWithSections(content).tasks;
  }

  private parseSectionType(name: string, lineNum: number): PageSection {
    const lowerName = name.toLowerCase();

    if (lowerName === "to do") {
      return { name, type: "unknown", startLine: lineNum };
    }
    if (lowerName === "completed") {
      return { name, type: "unknown", startLine: lineNum };
    }
    if (lowerName === "today") {
      return { name, type: "todo-today", startLine: lineNum };
    }
    if (lowerName === "tomorrow") {
      return { name, type: "todo-tomorrow", startLine: lineNum };
    }
    if (lowerName === "no date") {
      return { name, type: "todo-nodate", startLine: lineNum };
    }
    if (lowerName === "yesterday") {
      return { name, type: "completed-yesterday", startLine: lineNum };
    }
    if (lowerName === "earlier") {
      return { name, type: "completed-earlier", startLine: lineNum };
    }

    return { name, type: "unknown", startLine: lineNum };
  }

  private parseDateString(dateStr: string): string | undefined {
    try {
      // Try parsing various date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return undefined;
      }
      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  private getTodayEnd(): string {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.toISOString();
  }

  private getTomorrowEnd(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow.toISOString();
  }

  parseTaskTitle(title: string): {
    cleanTitle: string;
    projectId?: string;
    dueDate?: string;
  } {
    const projectMatch = title.match(this.projectMetaPattern);
    const dateMatch = title.match(this.datePattern);

    let dueDate: string | undefined;
    if (dateMatch) {
      dueDate = this.parseDateString(dateMatch[1]);
    }

    return {
      cleanTitle: title
        .replace(this.projectMetaPattern, "")
        .replace(this.datePattern, "")
        .trim(),
      projectId: projectMatch ? projectMatch[1] : undefined,
      dueDate,
    };
  }
}
