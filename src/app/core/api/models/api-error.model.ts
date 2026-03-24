export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
  details?: Record<string, string>;
}
