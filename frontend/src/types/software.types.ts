export type PackageStatus = 'AVAILABLE' | 'DEPRECATED' | 'BROKEN' | 'INSTALLING';

export interface SoftwarePackage {
  id: number;
  name: string;
  version: string;
  category?: string;
  description?: string;
  installPath?: string;
  moduleFilePath?: string;
  installedBy?: string;
  status: PackageStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ScanResult {
  added: number;
  restored: number;
  markedBroken: number;
}

export interface RegisterSoftwareRequest {
  name: string;
  version: string;
  category?: string;
  description?: string;
  moduleContent?: string;
}

export interface UpdateSoftwareRequest {
  category?: string;
  description?: string;
  installedBy?: string;
}