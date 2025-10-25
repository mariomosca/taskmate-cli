import React from 'react';

// Mock per tutti i componenti di @inkjs/ui
export const Spinner = ({ type }: any) => 
  React.createElement('span', { 'data-testid': 'spinner', 'data-type': type });

export const StatusMessage = ({ children, variant }: any) => 
  React.createElement('div', { 'data-testid': 'status-message', 'data-variant': variant }, children);

export const Alert = ({ children, variant, title }: any) => 
  React.createElement('div', { 'data-testid': 'alert', 'data-variant': variant, 'data-title': title }, children);

export const Badge = ({ children, color }: any) => 
  React.createElement('span', { 'data-testid': 'badge', 'data-color': color }, children);

export const TextInput = ({ value, onChange, placeholder }: any) => 
  React.createElement('input', { 
    'data-testid': 'text-input', 
    value, 
    onChange: (e: any) => onChange && onChange(e.target.value),
    placeholder 
  });

export const Select = ({ items, onSelect }: any) => 
  React.createElement('select', { 
    'data-testid': 'select',
    onChange: (e: any) => onSelect && onSelect(items[e.target.selectedIndex])
  }, items?.map((item: any, index: number) => 
    React.createElement('option', { key: index, value: index }, item.label || item)
  ));

export const ThemeProvider = ({ children, theme }: any) => 
  React.createElement('div', { 'data-testid': 'theme-provider' }, children);

export const defaultTheme = {
  colors: {
    primary: '#007acc',
    secondary: '#6c757d',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8'
  }
};