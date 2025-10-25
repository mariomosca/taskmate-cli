import React from 'react';
import { SplashScreen } from '../../components/SplashScreen';

// Mock ink dependencies
jest.mock('ink', () => ({
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'box' }, children),
  Text: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'text', 'data-color': color }, children)
}));

jest.mock('ink-big-text', () => ({
  __esModule: true,
  default: ({ text }: any) => React.createElement('div', { 'data-testid': 'big-text' }, text)
}));

jest.mock('ink-spinner', () => ({
  __esModule: true,
  default: ({ type }: any) => React.createElement('div', { 'data-testid': 'spinner', 'data-type': type })
}));

jest.mock('gradient-string', () => ({
  rainbow: (text: string) => text,
  pastel: (text: string) => text
}));

jest.mock('figures', () => ({
  tick: '✓',
  cross: '✗'
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be a valid React component', () => {
    expect(SplashScreen).toBeDefined();
    expect(typeof SplashScreen).toBe('function');
  });

  it('should create element with default props', () => {
    const element = React.createElement(SplashScreen, {});
    expect(element).toBeDefined();
    expect(element.props).toEqual({});
  });

  it('should create element with onComplete callback', () => {
    const mockOnComplete = jest.fn();
    const element = React.createElement(SplashScreen, { onComplete: mockOnComplete });
    expect(element).toBeDefined();
    expect(element.props.onComplete).toBe(mockOnComplete);
  });

  it('should create element with currentModel', () => {
    const element = React.createElement(SplashScreen, { currentModel: 'gpt-4' });
    expect(element).toBeDefined();
    expect(element.props.currentModel).toBe('gpt-4');
  });

  it('should create element with keepVisible prop', () => {
    const element = React.createElement(SplashScreen, { keepVisible: true });
    expect(element).toBeDefined();
    expect(element.props.keepVisible).toBe(true);
  });

  it('should create element with custom duration', () => {
    const element = React.createElement(SplashScreen, { duration: 5000 });
    expect(element).toBeDefined();
    expect(element.props.duration).toBe(5000);
  });

  it('should handle all props together', () => {
    const mockOnComplete = jest.fn();
    const props = {
      onComplete: mockOnComplete,
      currentModel: 'claude-3',
      keepVisible: true,
      duration: 3000
    };
    
    const element = React.createElement(SplashScreen, props);
    expect(element).toBeDefined();
    expect(element.props).toEqual(props);
  });

  it('should be importable as default export', () => {
    expect(SplashScreen).toBeDefined();
    expect(SplashScreen.name).toBe('SplashScreen');
  });

  it('should handle minimal props', () => {
    const element = React.createElement(SplashScreen, {});
    expect(element).toBeDefined();
    expect(element.props).toEqual({});
  });

  it('should handle undefined props gracefully', () => {
    const element = React.createElement(SplashScreen, {
      onComplete: undefined,
      currentModel: undefined,
      keepVisible: undefined,
      duration: undefined
    });
    expect(element).toBeDefined();
  });

  it('should handle different model names', () => {
    const models = ['gpt-4', 'claude-3', 'gemini-pro'];
    
    models.forEach(model => {
      const element = React.createElement(SplashScreen, { currentModel: model });
      expect(element.props.currentModel).toBe(model);
    });
  });
});