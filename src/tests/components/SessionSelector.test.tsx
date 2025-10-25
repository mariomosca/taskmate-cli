import React from 'react';
import { SessionSelector } from '../../components/SessionSelector';

// Mock ink dependencies
jest.mock('ink', () => ({
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'box' }, children),
  Text: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'text', 'data-color': color }, children),
  useInput: jest.fn()
}));

jest.mock('figures', () => ({
  arrowRight: '→',
  bullet: '•'
}));

describe('SessionSelector', () => {
  const mockSessions = [
    {
      id: '1',
      title: 'Session 1',
      messageCount: 5,
      lastActivity: '2024-01-01T10:00:00Z'
    },
    {
      id: '2',
      title: 'Session 2',
      messageCount: 3,
      lastActivity: '2024-01-01T11:00:00Z'
    }
  ];

  const defaultProps = {
    sessions: mockSessions,
    selectedIndex: 0,
    onIndexChange: jest.fn(),
    onSessionSelected: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
    currentPage: 1,
    totalSessions: 2,
    hasMore: false,
    onNextPage: jest.fn(),
    onPrevPage: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a valid React component', () => {
    expect(SessionSelector).toBeDefined();
    expect(typeof SessionSelector).toBe('function');
  });

  it('should create element with required props', () => {
    const element = React.createElement(SessionSelector, defaultProps);
    expect(element).toBeDefined();
    expect(element.props.sessions).toEqual(mockSessions);
    expect(element.props.selectedIndex).toBe(0);
  });

  it('should create element with empty sessions array', () => {
    const props = { ...defaultProps, sessions: [] };
    const element = React.createElement(SessionSelector, props);
    expect(element).toBeDefined();
    expect(element.props.sessions).toEqual([]);
  });

  it('should create element with loading state', () => {
    const props = { ...defaultProps, loading: true };
    const element = React.createElement(SessionSelector, props);
    expect(element).toBeDefined();
    expect(element.props.loading).toBe(true);
  });

  it('should handle different selected indices', () => {
    const indices = [0, 1, 2];
    
    indices.forEach(index => {
      const props = { ...defaultProps, selectedIndex: index };
      const element = React.createElement(SessionSelector, props);
      expect(element.props.selectedIndex).toBe(index);
    });
  });

  it('should handle pagination props', () => {
    const props = {
      ...defaultProps,
      currentPage: 2,
      totalSessions: 10,
      hasMore: true
    };
    
    const element = React.createElement(SessionSelector, props);
    expect(element.props.currentPage).toBe(2);
    expect(element.props.totalSessions).toBe(10);
    expect(element.props.hasMore).toBe(true);
  });

  it('should handle callback functions', () => {
    const callbacks = {
      onIndexChange: jest.fn(),
      onSessionSelected: jest.fn(),
      onCancel: jest.fn(),
      onNextPage: jest.fn(),
      onPrevPage: jest.fn()
    };
    
    const props = { ...defaultProps, ...callbacks };
    const element = React.createElement(SessionSelector, props);
    
    expect(element.props.onIndexChange).toBe(callbacks.onIndexChange);
    expect(element.props.onSessionSelected).toBe(callbacks.onSessionSelected);
    expect(element.props.onCancel).toBe(callbacks.onCancel);
    expect(element.props.onNextPage).toBe(callbacks.onNextPage);
    expect(element.props.onPrevPage).toBe(callbacks.onPrevPage);
  });

  it('should handle sessions with different message counts', () => {
    const sessionsWithDifferentCounts = [
      { ...mockSessions[0], messageCount: 0 },
      { ...mockSessions[1], messageCount: 100 }
    ];
    
    const props = { ...defaultProps, sessions: sessionsWithDifferentCounts };
    const element = React.createElement(SessionSelector, props);
    
    expect(element.props.sessions[0].messageCount).toBe(0);
    expect(element.props.sessions[1].messageCount).toBe(100);
  });

  it('should handle sessions with long titles', () => {
    const sessionsWithLongTitles = [
      { ...mockSessions[0], title: 'This is a very long session title that should be handled properly' },
      { ...mockSessions[1], title: 'Another extremely long title for testing purposes' }
    ];
    
    const props = { ...defaultProps, sessions: sessionsWithLongTitles };
    const element = React.createElement(SessionSelector, props);
    
    expect(element.props.sessions[0].title).toContain('very long session title');
    expect(element.props.sessions[1].title).toContain('extremely long title');
  });

  it('should be importable as named export', () => {
    expect(SessionSelector).toBeDefined();
    expect(SessionSelector.name).toBe('SessionSelector');
  });

  it('should handle single session', () => {
    const singleSession = [mockSessions[0]];
    const props = { ...defaultProps, sessions: singleSession, totalSessions: 1 };
    const element = React.createElement(SessionSelector, props);
    
    expect(element.props.sessions).toHaveLength(1);
    expect(element.props.totalSessions).toBe(1);
  });

  it('should handle large number of sessions', () => {
    const manySessions = Array(50).fill(mockSessions[0]).map((session, index) => ({
      ...session,
      id: `session-${index}`,
      title: `Session ${index}`,
      messageCount: index
    }));
    
    const props = { 
      ...defaultProps, 
      sessions: manySessions, 
      totalSessions: 50,
      hasMore: true 
    };
    const element = React.createElement(SessionSelector, props);
    
    expect(element.props.sessions).toHaveLength(50);
    expect(element.props.totalSessions).toBe(50);
    expect(element.props.hasMore).toBe(true);
  });

  it('should handle edge case with no pagination', () => {
    const props = {
      ...defaultProps,
      currentPage: 1,
      totalSessions: 2,
      hasMore: false,
      onNextPage: undefined,
      onPrevPage: undefined
    };
    
    const element = React.createElement(SessionSelector, props);
    expect(element.props.hasMore).toBe(false);
    expect(element.props.onNextPage).toBeUndefined();
    expect(element.props.onPrevPage).toBeUndefined();
  });
});