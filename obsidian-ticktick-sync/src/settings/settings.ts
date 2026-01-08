export interface TickTickProject {
  id: string;
  name: string;
  color: string;
  closed: boolean;
  groupId?: string;
  viewMode: string;
  permission: string;
  kind: string;
}

export interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  priority?: number;
  status?: number;
  completedTime?: string;
  sortOrder?: number;
  repeatFlag?: string;
  reminders?: string[];
  items?: TickTickSubTask[];
  kind?: string;
}

export interface TickTickSubTask {
  id: string;
  title: string;
  status: number;
  completedTime?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  startDate?: string;
  timeZone?: string;
}

export interface TickTickSettings {
  // OAuth tokens
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;

  // Sync settings
  targetPagePath: string;
  selectedProjects: string[];
  syncInterval: number; // in minutes
  autoSync: boolean;

  // Completed tasks settings
  includeCompleted: boolean;
  completedDaysLimit: number; // How many days of completed tasks to include

  // OAuth config (for internal use)
  clientId: string;
  clientSecret: string;
  // Manual auth code for OAuth flow
  authCode: string;
}

export const DEFAULT_SETTINGS: TickTickSettings = {
  accessToken: "",
  refreshToken: "",
  tokenExpiry: 0,
  targetPagePath: "TickTick Tasks",
  selectedProjects: [],
  syncInterval: 5, // 5 minutes default
  autoSync: true,
  includeCompleted: false,
  completedDaysLimit: 7,
  clientId: "",
  clientSecret: "",
  authCode: "",
};
