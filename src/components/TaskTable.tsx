import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { TodoistTask } from '../types/todoist.js';
import { UIMessageManager } from '../utils/UIMessages.js';

interface TaskTableProps {
  tasks: TodoistTask[];
}

const TaskTable = ({ tasks }: TaskTableProps) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  
  // Calculate responsive column widths
  const idWidth = 10;
  const prioWidth = 6;
  const dateWidth = 12;
  const contentWidth = Math.max(30, terminalWidth - idWidth - prioWidth - dateWidth - 8); // 8 for padding/margins
  
  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="yellow">📋 No tasks found.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      <Text color="cyan" bold>📋 Tasks found ({tasks.length}):</Text>
      <Text></Text>
      
      {/* Header */}
      <Box>
        <Box width={idWidth}>
          <Text bold color="blue">ID</Text>
        </Box>
        <Box width={prioWidth}>
          <Text bold color="blue">Prio</Text>
        </Box>
        <Box width={contentWidth}>
          <Text bold color="blue">Content</Text>
        </Box>
        <Box width={dateWidth}>
          <Text bold color="blue">Due Date</Text>
        </Box>
      </Box>
      
      <Box>
        <Text>{'─'.repeat(Math.min(terminalWidth - 2, 120))}</Text>
      </Box>
      
      {/* Rows */}
      {tasks.map((task, index) => (
        <Box key={task.id}>
          <Box width={idWidth}>
            <Text>{task.id}</Text>
          </Box>
          <Box width={prioWidth}>
            <Text color="red">{task.priority > 0 ? '●'.repeat(task.priority) : '-'}</Text>
          </Box>
          <Box width={contentWidth}>
            <Text>{task.content.length > contentWidth - 3 ? task.content.substring(0, contentWidth - 3) + '...' : task.content}</Text>
          </Box>
          <Box width={dateWidth}>
            <Text color="green">{task.due ? task.due.date : 'N/A'}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default TaskTable;