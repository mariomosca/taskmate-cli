import { UserContextService } from './UserContextService.js';
import { UserProfileService } from './UserProfileService.js';
import { DatabaseService } from './DatabaseService.js';
import { LLMService } from './LLMService.js';
import { UserProfile } from '../types/UserProfile.js';
import { Session } from '../types/index.js';

export interface EnhancedUserContext {
  userProfile?: UserProfile;
  sessionHistory: {
    recentSessions: Session[];
    totalSessions: number;
    averageSessionLength: number;
    commonTopics: string[];
    preferredTimeSlots: string[];
  };
  behaviorPatterns: {
    communicationStyle: string;
    taskPreferences: string[];
    workingHours: string;
    productivityPeaks: string[];
  };
  contextualInsights: {
    currentFocus: string[];
    suggestedActions: string[];
    relevantMemories: any[];
  };
  generatedAt: Date;
  cacheExpiry: Date;
}

export class EnhancedUserContextService {
  private userContextService: UserContextService;
  private userProfileService: UserProfileService;
  private contextCache: EnhancedUserContext | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(
    private databaseService: DatabaseService,
    private llmService: LLMService,
    userProfileService?: UserProfileService
  ) {
    this.userContextService = new UserContextService(databaseService, llmService);
    this.userProfileService = userProfileService || new UserProfileService(databaseService);
  }

  async generateEnhancedContext(): Promise<EnhancedUserContext> {
    // Check cache first
    if (this.contextCache && new Date() < this.contextCache.cacheExpiry) {
      console.log('📋 Using cached enhanced user context');
      return this.contextCache;
    }

    console.log('🔄 Generating enhanced user context...');
    const startTime = Date.now();

    try {
      // Get user profile
      const userProfile = await this.getUserProfile();
      
      // Get session history analysis
      const sessionHistory = await this.analyzeSessionHistory();
      
      // Extract behavior patterns
      const behaviorPatterns = await this.extractBehaviorPatterns(userProfile, sessionHistory);
      
      // Generate contextual insights
      const contextualInsights = await this.generateContextualInsights(userProfile, sessionHistory);

      const enhancedContext: EnhancedUserContext = {
        userProfile,
        sessionHistory,
        behaviorPatterns,
        contextualInsights,
        generatedAt: new Date(),
        cacheExpiry: new Date(Date.now() + this.cacheExpiry)
      };

      // Cache the result
      this.contextCache = enhancedContext;

      const duration = Date.now() - startTime;
      console.log(`✅ Enhanced context generated in ${duration}ms`);

      return enhancedContext;
    } catch (error) {
      console.error('❌ Error generating enhanced context:', error);
      
      // Fallback to basic context
      return this.generateFallbackContext();
    }
  }

  private async getUserProfile(): Promise<UserProfile | undefined> {
    try {
      const profile = await this.userProfileService.getProfile();
      return profile || undefined;
    } catch (error) {
      console.log('ℹ️  No user profile found, using anonymous context');
      return undefined;
    }
  }

  private async analyzeSessionHistory(): Promise<EnhancedUserContext['sessionHistory']> {
    const recentSessions = await this.databaseService.getRecentSessions(10);
    const stats = await this.databaseService.getSessionStats();
    
    // Analyze common topics from session names and messages
    const commonTopics = await this.extractCommonTopics(recentSessions);
    
    // Analyze preferred time slots
    const preferredTimeSlots = this.analyzeTimePatterns(recentSessions);
    
    // Calculate average session length
    const averageSessionLength = await this.calculateAverageSessionLength(recentSessions);

    return {
      recentSessions,
      totalSessions: stats.totalSessions,
      averageSessionLength,
      commonTopics,
      preferredTimeSlots
    };
  }

  private async extractCommonTopics(sessions: Session[]): Promise<string[]> {
    const topics: { [key: string]: number } = {};
    
    for (const session of sessions) {
      // Extract topics from session names
      const words = session.name.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['task', 'session', 'chat', 'conversation'].includes(word));
      
      words.forEach(word => {
        topics[word] = (topics[word] || 0) + 1;
      });

      // Analyze recent messages for additional context
      try {
        const messages = await this.databaseService.getSessionMessages(session.id, 5);
        messages.forEach(message => {
          if (message.role === 'user') {
            const messageWords = message.content.toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 4)
              .slice(0, 10); // Limit to avoid noise
            
            messageWords.forEach(word => {
              topics[word] = (topics[word] || 0) + 0.5; // Lower weight for message content
            });
          }
        });
      } catch (error) {
        // Continue if message analysis fails
      }
    }

    // Return top 5 topics
    return Object.entries(topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private analyzeTimePatterns(sessions: Session[]): string[] {
    const timeSlots: { [key: string]: number } = {};
    
    sessions.forEach(session => {
      const hour = new Date(session.createdAt).getHours();
      let timeSlot: string;
      
      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
      else if (hour >= 18 && hour < 22) timeSlot = 'evening';
      else timeSlot = 'night';
      
      timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1;
    });

    return Object.entries(timeSlots)
      .sort(([, a], [, b]) => b - a)
      .map(([slot]) => slot);
  }

  private async calculateAverageSessionLength(sessions: Session[]): Promise<number> {
    let totalMessages = 0;
    
    for (const session of sessions) {
      try {
        const messageCount = await this.databaseService.getMessageCount(session.id);
        totalMessages += messageCount;
      } catch (error) {
        // Continue if count fails
      }
    }
    
    return sessions.length > 0 ? Math.round(totalMessages / sessions.length) : 0;
  }

  private async extractBehaviorPatterns(
    userProfile?: UserProfile,
    sessionHistory?: EnhancedUserContext['sessionHistory']
  ): Promise<EnhancedUserContext['behaviorPatterns']> {
    return {
      communicationStyle: userProfile?.preferences.communicationStyle || 'casual',
      taskPreferences: userProfile?.preferences.taskPriorities || sessionHistory?.commonTopics || [],
      workingHours: userProfile?.preferences.workingHours || '9:00-18:00',
      productivityPeaks: sessionHistory?.preferredTimeSlots || ['morning', 'afternoon']
    };
  }

  private async generateContextualInsights(
    userProfile?: UserProfile,
    sessionHistory?: EnhancedUserContext['sessionHistory']
  ): Promise<EnhancedUserContext['contextualInsights']> {
    const currentFocus = [
      ...(userProfile?.context.currentProjects || []),
      ...(sessionHistory?.commonTopics.slice(0, 3) || [])
    ];

    const suggestedActions = this.generateSuggestedActions(userProfile, sessionHistory);
    
    // Get relevant memories from user profile service
    const relevantMemories = await this.getRelevantMemories(currentFocus);

    return {
      currentFocus,
      suggestedActions,
      relevantMemories
    };
  }

  private generateSuggestedActions(
    userProfile?: UserProfile,
    sessionHistory?: EnhancedUserContext['sessionHistory']
  ): string[] {
    const suggestions: string[] = [];
    
    if (userProfile?.goals.length) {
      suggestions.push(`Focus on your goal: ${userProfile.goals[0]}`);
    }
    
    if (sessionHistory?.commonTopics.length) {
      suggestions.push(`Continue working on: ${sessionHistory.commonTopics[0]}`);
    }
    
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 11) {
      suggestions.push('Good morning! Start with your most important task');
    } else if (currentHour >= 14 && currentHour <= 16) {
      suggestions.push('Afternoon focus time - tackle complex problems');
    }
    
    return suggestions.slice(0, 3);
  }

  private async getRelevantMemories(topics: string[]): Promise<any[]> {
    const memories: any[] = [];
    
    for (const topic of topics.slice(0, 3)) {
      try {
        const topicMemories = await this.userProfileService.searchMemory(topic);
        memories.push(...topicMemories.slice(0, 2));
      } catch (error) {
        // Continue if memory search fails
      }
    }
    
    return memories;
  }

  private generateFallbackContext(): EnhancedUserContext {
    return {
      userProfile: undefined,
      sessionHistory: {
        recentSessions: [],
        totalSessions: 0,
        averageSessionLength: 0,
        commonTopics: [],
        preferredTimeSlots: []
      },
      behaviorPatterns: {
        communicationStyle: 'casual',
        taskPreferences: [],
        workingHours: '9:00-18:00',
        productivityPeaks: ['morning']
      },
      contextualInsights: {
        currentFocus: [],
        suggestedActions: ['Welcome to TaskMate! Start by creating your first task.'],
        relevantMemories: []
      },
      generatedAt: new Date(),
      cacheExpiry: new Date(Date.now() + this.cacheExpiry)
    };
  }

  // Async context generation for background updates
  async generateContextAsync(): Promise<void> {
    try {
      console.log('🔄 Starting background context generation...');
      await this.generateEnhancedContext();
      console.log('✅ Background context generation completed');
    } catch (error) {
      console.error('❌ Background context generation failed:', error);
    }
  }

  // Get formatted context for LLM
  getFormattedContext(context: EnhancedUserContext): string {
    const sections: string[] = [];

    // User Profile Section
    if (context.userProfile) {
      sections.push(`👤 User Profile:
- Name: ${context.userProfile.name}
- Goals: ${context.userProfile.goals.join(', ')}
- Communication Style: ${context.userProfile.preferences.communicationStyle}
- Working Hours: ${context.userProfile.preferences.workingHours}
- Current Projects: ${context.userProfile.context.currentProjects?.join(', ') || 'None'}
- Skills: ${context.userProfile.context.skills?.join(', ') || 'Not specified'}`);
    }

    // Session History Section
    if (context.sessionHistory.totalSessions > 0) {
      sections.push(`📊 Session History:
- Total Sessions: ${context.sessionHistory.totalSessions}
- Average Messages per Session: ${context.sessionHistory.averageSessionLength}
- Common Topics: ${context.sessionHistory.commonTopics.join(', ')}
- Preferred Time Slots: ${context.sessionHistory.preferredTimeSlots.join(', ')}`);
    }

    // Current Focus Section
    if (context.contextualInsights.currentFocus.length > 0) {
      sections.push(`🎯 Current Focus:
${context.contextualInsights.currentFocus.map(focus => `- ${focus}`).join('\n')}`);
    }

    // Suggested Actions Section
    if (context.contextualInsights.suggestedActions.length > 0) {
      sections.push(`💡 Suggested Actions:
${context.contextualInsights.suggestedActions.map(action => `- ${action}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  // Clear cache manually
  clearCache(): void {
    this.contextCache = null;
    console.log('🗑️  Enhanced context cache cleared');
  }
}

export default EnhancedUserContextService;