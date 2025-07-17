export interface VerificationResult {
  success: boolean;
  message: string;
  userInfo?: {
    username: string;
    profileMessage: string;
  };
}

export interface IPlatformVerificationService {
  generateVerificationCode(username: string, userId: number): Promise<string>;
  verify(username: string, userId: number): Promise<VerificationResult>;
}
