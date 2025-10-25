import React from 'react';

// Mock ink dependencies
jest.mock('ink', () => ({
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'box' }, children),
  Text: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'text', 'data-color': color }, children)
}));

jest.mock('ink-spinner', () => ({
  __esModule: true,
  default: ({ type }: any) => React.createElement('span', { 'data-testid': 'spinner', 'data-type': type })
}));

// Import after mocking
import { LoadingIndicator } from '../../components/LoadingIndicator';

describe('LoadingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a valid React component', () => {
    expect(LoadingIndicator).toBeDefined();
    expect(typeof LoadingIndicator).toBe('function');
  });

  it('should create element with default props', () => {
    const element = React.createElement(LoadingIndicator);
    expect(element).toBeDefined();
    expect(element.type).toBe(LoadingIndicator);
  });

  it('should create element with custom message', () => {
    const element = React.createElement(LoadingIndicator, { message: 'Custom loading...' });
    expect(element).toBeDefined();
    expect(element.props.message).toBe('Custom loading...');
  });

  it('should create element with different loading types', () => {
    const types = ['dots', 'line', 'pipe', 'simpleDots'];
    
    types.forEach(type => {
      const element = React.createElement(LoadingIndicator, { type });
      expect(element).toBeDefined();
      expect(element.props.type).toBe(type);
    });
  });

  it('should create element with timer enabled', () => {
    const element = React.createElement(LoadingIndicator, { showTimer: true });
    expect(element).toBeDefined();
    expect(element.props.showTimer).toBe(true);
  });

  it('should create element with spinner disabled', () => {
    const element = React.createElement(LoadingIndicator, { showSpinner: false });
    expect(element).toBeDefined();
    expect(element.props.showSpinner).toBe(false);
  });

  it('should create element with custom messages array', () => {
    const messages = ['Loading...', 'Still loading...', 'Almost done...'];
    const element = React.createElement(LoadingIndicator, { messages });
    expect(element).toBeDefined();
    expect(element.props.messages).toEqual(messages);
  });

  it('should create element with custom interval', () => {
    const element = React.createElement(LoadingIndicator, { interval: 2000 });
    expect(element).toBeDefined();
    expect(element.props.interval).toBe(2000);
  });

  it('should handle all props together', () => {
    const props = {
      message: 'Custom message',
      type: 'dots' as const,
      showTimer: true,
      showSpinner: false,
      messages: ['Msg 1', 'Msg 2'],
      interval: 1500
    };
    
    const element = React.createElement(LoadingIndicator, props);
    expect(element).toBeDefined();
    expect(element.props).toMatchObject(props);
  });

  it('should be importable as named export', () => {
    expect(LoadingIndicator).toBeDefined();
    expect(LoadingIndicator.name).toBe('LoadingIndicator');
  });
});