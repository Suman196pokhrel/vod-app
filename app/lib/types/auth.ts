export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  is_verified: boolean;
}



export interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  updateUser: (user: Partial<User>) => void;
}