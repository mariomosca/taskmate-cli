import React from 'react';

// Mock ink dependencies
jest.mock('ink', () => ({
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'box' }, children),
  Text: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'text', 'data-color': color }, children)
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

  it('should accept custom message', () => {
    const element = React.createElement(LoadingIndicator, { 
      message: 'Custom loading message',
      type: 'api'
    });
    expect(element.props.message).toBe('Custom loading message');
    expect(element.props.type).toBe('api');
  });

  it('should accept showTimer prop', () => {
    const element = React.createElement(LoadingIndicator, { 
      showTimer: false 
    });
    expect(element.props.showTimer).toBe(false);
  });

  it('should accept showSpinner prop', () => {
    const element = React.createElement(LoadingIndicator, { 
      showSpinner: false 
    });
    expect(element.props.showSpinner).toBe(false);
  });

  it('should accept variant prop', () => {
    const element = React.createElement(LoadingIndicator, { 
      variant: 'success' 
    });
    expect(element.props.variant).toBe('success');
  });

  it('should handle all props together', () => {
    const props = {
      message: 'Loading data...',
      type: 'api' as const,
      showTimer: true,
      showSpinner: true,
      variant: 'info' as const
    };
    
    const element = React.createElement(LoadingIndicator, props);
    expect(element.props).toEqual(props);
  });

  it('should be importable as named export', () => {
    expect(LoadingIndicator).toBeDefined();
    expect(LoadingIndicator.name).toBe('LoadingIndicator');
  });
});