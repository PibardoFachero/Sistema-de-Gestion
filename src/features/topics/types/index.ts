export type SourceStatus = 'ready' | 'processing' | 'pending';
export type SourceKind = 'Nota' | 'Archivo' | 'Enlace';

export interface TopicSource {
  id: string;
  topicId: string;
  title: string;
  kind: SourceKind;
  content: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  detail: string;
  status: SourceStatus;
  enabledForAi: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedProject {
  id: string;
  name: string;
  description: string;
  detail: string;
  status: string;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
}

export interface Topic {
  id: string;
  userId: string;
  name: string;
  description: string;
  mainNote: string;
  lastEdited: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  sources: TopicSource[];
  project?: LinkedProject;
}

export interface ProjectOption {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
  isLinked?: boolean;
}

export interface CreateTopicInput {
  title: string;
  description?: string;
}

export interface UpdateTopicInput {
  id: string;
  title?: string;
  description?: string;
  mainNote?: string;
}

export interface CreateNoteSourceInput {
  topicId: string;
  title: string;
  content: string;
}

export interface CreateLinkSourceInput {
  topicId: string;
  title: string;
  url: string;
}

export interface CreateFileSourceInput {
  topicId: string;
  title: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
}

export interface CreateProjectWithMilestonesInput {
  name: string;
  description?: string;
  milestones: string[];
}
