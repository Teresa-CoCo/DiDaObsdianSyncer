import { TickTickTask, TickTickProject, TickTickSubTask } from "../settings/settings";

const API_BASE = "https://api.dida365.com";

export interface CreateTaskRequest {
  title: string;
  projectId: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  reminders?: string[];
  repeatFlag?: string;
  priority?: number;
  sortOrder?: number;
  items?: CreateSubTaskRequest[];
}

export interface CreateSubTaskRequest {
  title: string;
  startDate?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  timeZone?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
  projectId: string;
  status?: number;
  completedTime?: string;
}

export class TickTickClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    // Some endpoints return empty response
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  // Project APIs
  async getProjects(): Promise<TickTickProject[]> {
    return this.request<TickTickProject[]>("/open/v1/project");
  }

  async getProject(projectId: string): Promise<TickTickProject> {
    return this.request<TickTickProject>(`/open/v1/project/${projectId}`);
  }

  async createProject(data: {
    name: string;
    color?: string;
    viewMode?: string;
    kind?: string;
  }): Promise<TickTickProject> {
    return this.request<TickTickProject>("/open/v1/project", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    projectId: string,
    data: Partial<{
      name: string;
      color: string;
      viewMode: string;
      kind: string;
    }>
  ): Promise<TickTickProject> {
    return this.request<TickTickProject>(`/open/v1/project/${projectId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request(`/open/v1/project/${projectId}`, {
      method: "DELETE",
    });
  }

  // Task APIs
  async getProjectTasks(projectId: string): Promise<TickTickTask[]> {
    const data = await this.request<{ tasks: TickTickTask[] }>(
      `/open/v1/project/${projectId}/data`
    );
    return data.tasks || [];
  }

  async getTask(projectId: string, taskId: string): Promise<TickTickTask> {
    return this.request<TickTickTask>(
      `/open/v1/project/${projectId}/task/${taskId}`
    );
  }

  async createTask(data: CreateTaskRequest): Promise<TickTickTask> {
    return this.request<TickTickTask>("/open/v1/task", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: string, data: UpdateTaskRequest): Promise<TickTickTask> {
    return this.request<TickTickTask>(`/open/v1/task/${taskId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.request(
      `/open/v1/project/${projectId}/task/${taskId}/complete`,
      { method: "POST" }
    );
  }

  async uncompleteTask(projectId: string, taskId: string): Promise<void> {
    // Uncomplete by setting status back to 0
    await this.updateTask(taskId, {
      id: taskId,
      projectId,
      status: 0,
    });
  }

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.request(`/open/v1/project/${projectId}/task/${taskId}`, {
      method: "DELETE",
    });
  }
}
