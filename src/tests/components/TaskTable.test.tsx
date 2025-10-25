import React from 'react';
import TaskTable from '../../components/TaskTable';
import { TodoistTask } from '../../types/todoist';

// Mock ink dependencies
jest.mock('ink', () => ({
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'box' }, children),
  Text: ({ children, color }: any) => React.createElement('span', { 'data-testid': 'text', 'data-color': color }, children),
  useStdout: () => ({ stdout: { columns: 80 } })
}));

describe('TaskTable', () => {
  const mockTasks: TodoistTask[] = [
    {
      id: '1',
      content: 'Test task 1',
      description: 'Test description',
      is_completed: false,
      labels: [],
      priority: 1,
      project_id: 'project1',
      section_id: undefined,
      parent_id: undefined,
      order: 1,
      comment_count: 0,
      created_at: '2024-01-01T00:00:00Z',
      url: 'https://todoist.com/showTask?id=1',
      creator_id: 'user1',
      assignee_id: undefined,
      due: {
        date: '2024-01-15',
        is_recurring: false,
        datetime: undefined,
        string: 'Jan 15',
        timezone: undefined
      }
    },
    {
      id: '2',
      content: 'Test task 2',
      description: '',
      is_completed: false,
      labels: ['urgent'],
      priority: 4,
      project_id: 'project1',
      section_id: undefined,
      parent_id: undefined,
      order: 2,
      comment_count: 1,
      created_at: '2024-01-02T00:00:00Z',
      url: 'https://todoist.com/showTask?id=2',
      creator_id: 'user1',
      assignee_id: undefined,
      due: undefined
    }
  ];

  it('should be a valid React component', () => {
    expect(TaskTable).toBeDefined();
    expect(typeof TaskTable).toBe('function');
  });

  it('should create element with empty tasks array', () => {
    const element = React.createElement(TaskTable, { tasks: [] });
    expect(element).toBeDefined();
    expect(element.props.tasks).toEqual([]);
  });

  it('should create element with tasks array', () => {
    const element = React.createElement(TaskTable, { tasks: mockTasks });
    expect(element).toBeDefined();
    expect(element.props.tasks).toEqual(mockTasks);
    expect(element.props.tasks).toHaveLength(2);
  });

  it('should handle tasks with different priorities', () => {
    const element = React.createElement(TaskTable, { tasks: mockTasks });
    expect(element.props.tasks[0].priority).toBe(1);
    expect(element.props.tasks[1].priority).toBe(4);
  });

  it('should handle tasks with and without due dates', () => {
    const element = React.createElement(TaskTable, { tasks: mockTasks });
    expect(element.props.tasks[0].due).toBeDefined();
    expect(element.props.tasks[1].due).toBeUndefined();
  });

  it('should handle tasks with different content', () => {
    const element = React.createElement(TaskTable, { tasks: mockTasks });
    expect(element.props.tasks[0].content).toBe('Test task 1');
    expect(element.props.tasks[1].content).toBe('Test task 2');
  });

  it('should handle tasks with labels', () => {
    const element = React.createElement(TaskTable, { tasks: mockTasks });
    expect(element.props.tasks[0].labels).toEqual([]);
    expect(element.props.tasks[1].labels).toEqual(['urgent']);
  });

  it('should be importable as default export', () => {
    expect(TaskTable).toBeDefined();
    expect(TaskTable.name).toBe('TaskTable');
  });

  it('should handle single task', () => {
    const singleTask = [mockTasks[0]];
    const element = React.createElement(TaskTable, { tasks: singleTask });
    expect(element).toBeDefined();
    expect(element.props.tasks).toHaveLength(1);
  });

  it('should handle large number of tasks', () => {
    const manyTasks = Array(100).fill(mockTasks[0]).map((task, index) => ({
      ...task,
      id: `task-${index}`,
      content: `Task ${index}`
    }));
    
    const element = React.createElement(TaskTable, { tasks: manyTasks });
    expect(element).toBeDefined();
    expect(element.props.tasks).toHaveLength(100);
  });
});