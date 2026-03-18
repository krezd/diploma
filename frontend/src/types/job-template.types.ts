export type TemplateMode = 'CONSTRUCTOR' | 'SCRIPT';

export interface JobTemplate {
  id: number;
  name: string;
  description?: string;
  username: string;
  isPublic: boolean;
  mode: TemplateMode;
  jobDescJson?: string;
  scriptTemplate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JobTemplateRequest {
  name: string;
  description?: string;
  isPublic: boolean;
  mode: TemplateMode;
  jobDescJson?: string;
  scriptTemplate?: string;
}