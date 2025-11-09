export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  is_verified: boolean;
}



export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
//   refresh:()=>Promise<void>;
}