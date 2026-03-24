export type DocumentType =
  | 'ASSOCIATION_PROOF'
  | 'IDENTITY'
  | 'SOCIAL_PROOF'
  | 'MANDATE_PROOF'
  | 'WORD_EXCEL_DOC'
  | 'OTHER';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DocumentDto {
  id: string;
  reservationId: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  documentType: DocumentType;
  status: DocumentStatus;
  uploadedAt: string;
  expiresAt?: string;
  downloadUrl: string;
}

export interface DocumentRuleDto {
  id: string;
  resourceId: string;
  documentType: DocumentType;
  required: boolean;
  maxSizeMb: number;
  allowedMimeTypes: string[];
}
