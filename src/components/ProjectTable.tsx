import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { TodoistProject } from '../types/todoist.js';
import { UIMessageManager } from '../utils/UIMessages.js';

interface ProjectTableProps {
  projects: TodoistProject[];
}

const ProjectTable = ({ projects }: ProjectTableProps) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  
  // Calculate responsive column widths
  const idWidth = 10;
  const colorWidth = 12;
  const sharedWidth = 8;
  const favoriteWidth = 8;
  const nameWidth = Math.max(20, terminalWidth - idWidth - colorWidth - sharedWidth - favoriteWidth - 8);
  
  if (projects.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="yellow">📁 No projects found.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} width="100%">
      <Text color="cyan" bold>📁 Projects found ({projects.length}):</Text>
      <Text></Text>
      
      {/* Header */}
      <Box>
        <Box width={idWidth}>
          <Text bold color="blue">ID</Text>
        </Box>
        <Box width={nameWidth}>
          <Text bold color="blue">Name</Text>
        </Box>
        <Box width={colorWidth}>
          <Text bold color="blue">Color</Text>
        </Box>
        <Box width={sharedWidth}>
          <Text bold color="blue">Shared</Text>
        </Box>
        <Box width={favoriteWidth}>
          <Text bold color="blue">Favorite</Text>
        </Box>
      </Box>
      
      <Box>
        <Text>{'─'.repeat(Math.min(terminalWidth - 2, 120))}</Text>
      </Box>
      
      {/* Rows */}
      {projects.map((project) => (
        <Box key={project.id}>
          <Box width={idWidth}>
            <Text>{project.id}</Text>
          </Box>
          <Box width={nameWidth}>
            <Text>{project.name.length > nameWidth - 3 ? project.name.substring(0, nameWidth - 3) + '...' : project.name}</Text>
          </Box>
          <Box width={colorWidth}>
            <Text color="magenta">{project.color}</Text>
          </Box>
          <Box width={sharedWidth}>
            <Text color={project.is_shared ? "green" : "gray"}>{project.is_shared ? '👥 Yes' : 'No'}</Text>
          </Box>
          <Box width={favoriteWidth}>
            <Text color={project.is_favorite ? "yellow" : "gray"}>{project.is_favorite ? '⭐ Yes' : 'No'}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default ProjectTable;