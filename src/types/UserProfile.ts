export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  goals: string[];
  preferences: {
    workingHours?: string;
    communicationStyle?: 'direct' | 'detailed' | 'casual';
    taskPriorities?: string[];
    preferredLLM?: 'claude' | 'gemini';
    language?: string;
  };
  context: {
    currentProjects?: string[];
    interests?: string[];
    skills?: string[];
    workDomain?: string;
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  goals?: string[];
  preferences?: Partial<UserProfile['preferences']>;
  context?: Partial<UserProfile['context']>;
}

export interface MemoryProvider {
  name: string;
  store(key: string, data: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  search(query: string): Promise<any[]>;
  isAvailable(): Promise<boolean>;
}

export interface MemoryConfig {
  provider: 'local' | 'external';
  externalProvider?: string;
  encryptionEnabled: boolean;
  syncEnabled: boolean;
}