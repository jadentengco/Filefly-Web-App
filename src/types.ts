export type UserRole = 'freelancer' | 'client' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  createdAt: string;
}

export type SupportedFormat = 
  | 'jpeg' 
  | 'png' 
  | 'webp' 
  | 'pdf' 
  | 'heic' 
  | 'svg' 
  | 'txt'
  | 'bmp';

export interface FileItem {
  id: string;
  userId: string;
  name: string;
  size: number;
  type: string; // MIME type e.g. "image/png"
  extension: string; // e.g. "png"
  uploadedAt: string;
  blob?: Blob;
  dataUrl?: string; // Cacheable or local object URL
  downloadUrl?: string; // Firebase Cloud Storage download URL
  storagePath?: string; // Firebase Cloud Storage path
  clientName?: string; // Optional client or project tag
  tags?: string[]; // Custom tags for categorization (e.g. ["Branding", "Final", "Approved"])
  convertedFromId?: string; // if created via conversion
  conversionFormat?: SupportedFormat;
}

export interface ConversionOptions {
  targetFormat: SupportedFormat;
  quality: number; // 0.1 to 1.0
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  pdfOrientation?: 'portrait' | 'landscape';
  pdfPageSize?: 'a4' | 'letter' | 'fit';
}

export interface ClientPortalSettings {
  id: string;
  userId: string;
  portalName: string;
  welcomeMessage: string;
  allowedFormats: string[];
  allowClientConversion: boolean;
  requireClientName: boolean;
}
