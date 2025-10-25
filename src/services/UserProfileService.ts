import { Database } from 'better-sqlite3';
import { UserProfile, UserProfileUpdate, MemoryProvider, MemoryConfig } from '../types/UserProfile.js';
import { DatabaseService } from './DatabaseService.js';
import { logger } from '../utils/logger.js';

export class UserProfileService {
  private db: Database;
  private memoryProvider: MemoryProvider;
  private memoryConfig: MemoryConfig;
  private profileCache: UserProfile | null = null;

  constructor(
    private databaseService: DatabaseService,
    memoryProvider?: MemoryProvider,
    memoryConfig?: MemoryConfig
  ) {
    this.db = databaseService.getDatabase();
    this.memoryProvider = memoryProvider || new LocalMemoryProvider(this.db);
    this.memoryConfig = memoryConfig || {
      provider: 'local',
      encryptionEnabled: false,
      syncEnabled: false
    };
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      // Create user_profiles table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          goals TEXT,
          preferences TEXT,
          context TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user_memory table for additional memory storage
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_memory (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          data TEXT NOT NULL,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES user_profiles (id)
        )
      `);

      logger.debug('UserProfile database tables initialized');
    } catch (error) {
      logger.error('Error initializing UserProfile database:', error);
      throw error;
    }
  }

  async createProfile(profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    const profile: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...profileData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_profiles (id, name, email, goals, preferences, context, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        profile.id,
        profile.name,
        profile.email || null,
        JSON.stringify(profile.goals),
        JSON.stringify(profile.preferences),
        JSON.stringify(profile.context),
        profile.createdAt.toISOString(),
        profile.updatedAt.toISOString()
      );

      this.profileCache = profile;
      logger.debug('User profile created:', { id: profile.id, name: profile.name });

      // Store in memory provider if available
      if (this.memoryProvider) {
        await this.memoryProvider.store(`profile:${profile.id}`, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error creating user profile:', error);
      throw error;
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    if (this.profileCache) {
      return this.profileCache;
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 1');
      const row = stmt.get() as any;

      if (!row) {
        return null;
      }

      const profile: UserProfile = {
        id: row.id,
        name: row.name,
        email: row.email,
        goals: JSON.parse(row.goals || '[]'),
        preferences: JSON.parse(row.preferences || '{}'),
        context: JSON.parse(row.context || '{}'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };

      this.profileCache = profile;
      return profile;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
  }

  async updateProfile(updates: UserProfileUpdate): Promise<UserProfile | null> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) {
      throw new Error('No user profile found to update');
    }

    const updatedProfile: UserProfile = {
      ...currentProfile,
      ...updates,
      preferences: { ...currentProfile.preferences, ...updates.preferences },
      context: { ...currentProfile.context, ...updates.context },
      updatedAt: new Date()
    };

    try {
      const stmt = this.db.prepare(`
        UPDATE user_profiles 
        SET name = ?, email = ?, goals = ?, preferences = ?, context = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        updatedProfile.name,
        updatedProfile.email || null,
        JSON.stringify(updatedProfile.goals),
        JSON.stringify(updatedProfile.preferences),
        JSON.stringify(updatedProfile.context),
        updatedProfile.updatedAt.toISOString(),
        updatedProfile.id
      );

      this.profileCache = updatedProfile;
      logger.debug('User profile updated:', { id: updatedProfile.id });

      // Update in memory provider if available
      if (this.memoryProvider) {
        await this.memoryProvider.store(`profile:${updatedProfile.id}`, updatedProfile);
      }

      return updatedProfile;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async storeMemory(key: string, data: any, tags?: string[]): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('No user profile found');
    }

    try {
      const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const stmt = this.db.prepare(`
        INSERT INTO user_memory (id, user_id, key, data, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      stmt.run(
        memoryId,
        profile.id,
        key,
        JSON.stringify(data),
        JSON.stringify(tags || []),
        now,
        now
      );

      // Store in memory provider if available
      if (this.memoryProvider) {
        await this.memoryProvider.store(key, data);
      }

      logger.debug('Memory stored:', { key, userId: profile.id });
    } catch (error) {
      logger.error('Error storing memory:', error);
      throw error;
    }
  }

  async retrieveMemory(key: string): Promise<any> {
    try {
      // Try memory provider first
      if (this.memoryProvider) {
        const data = await this.memoryProvider.retrieve(key);
        if (data) {
          return data;
        }
      }

      // Fallback to local database
      const stmt = this.db.prepare('SELECT data FROM user_memory WHERE key = ? ORDER BY updated_at DESC LIMIT 1');
      const row = stmt.get(key) as any;

      if (row) {
        return JSON.parse(row.data);
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving memory:', error);
      return null;
    }
  }

  async searchMemory(query: string): Promise<any[]> {
    try {
      // Try memory provider first
      if (this.memoryProvider) {
        const results = await this.memoryProvider.search(query);
        if (results.length > 0) {
          return results;
        }
      }

      // Fallback to local database search
      const stmt = this.db.prepare(`
        SELECT key, data, tags FROM user_memory 
        WHERE key LIKE ? OR data LIKE ? OR tags LIKE ?
        ORDER BY updated_at DESC
      `);

      const searchTerm = `%${query}%`;
      const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[];

      return rows.map(row => ({
        key: row.key,
        data: JSON.parse(row.data),
        tags: JSON.parse(row.tags || '[]')
      }));
    } catch (error) {
      logger.error('Error searching memory:', error);
      return [];
    }
  }

  async hasProfile(): Promise<boolean> {
    const profile = await this.getProfile();
    return profile !== null;
  }

  async deleteProfile(): Promise<void> {
    const profile = await this.getProfile();
    if (!profile) {
      return;
    }

    try {
      // Delete from database
      this.db.prepare('DELETE FROM user_memory WHERE user_id = ?').run(profile.id);
      this.db.prepare('DELETE FROM user_profiles WHERE id = ?').run(profile.id);

      this.profileCache = null;
      logger.debug('User profile deleted:', { id: profile.id });
    } catch (error) {
      logger.error('Error deleting user profile:', error);
      throw error;
    }
  }

  getMemoryConfig(): MemoryConfig {
    return this.memoryConfig;
  }

  async setMemoryProvider(provider: MemoryProvider, config: MemoryConfig): Promise<void> {
    this.memoryProvider = provider;
    this.memoryConfig = config;
    logger.debug('Memory provider updated:', { provider: provider.name, config });
  }
}

// Local memory provider implementation
class LocalMemoryProvider implements MemoryProvider {
  name = 'local';

  constructor(private db: Database) {}

  async store(key: string, data: any): Promise<void> {
    // Local storage is handled by UserProfileService
    return Promise.resolve();
  }

  async retrieve(key: string): Promise<any> {
    // Local retrieval is handled by UserProfileService
    return Promise.resolve(null);
  }

  async search(query: string): Promise<any[]> {
    // Local search is handled by UserProfileService
    return Promise.resolve([]);
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }
}