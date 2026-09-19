export interface RegisterFormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterFormData, string[]>>;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof LoginFormData, string[]>>;
}
