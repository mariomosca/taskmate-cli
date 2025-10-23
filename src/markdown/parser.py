"""
Markdown parser for extracting context and content from markdown files.
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class MarkdownSection:
    """Represents a section in a markdown document."""
    title: str
    level: int
    content: str
    line_start: int
    line_end: int
    subsections: List['MarkdownSection']


@dataclass
class MarkdownMetadata:
    """Metadata extracted from markdown frontmatter."""
    title: Optional[str] = None
    author: Optional[str] = None
    date: Optional[str] = None
    tags: List[str] = None
    description: Optional[str] = None
    custom_fields: Dict[str, Any] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.custom_fields is None:
            self.custom_fields = {}


@dataclass
class MarkdownDocument:
    """Represents a parsed markdown document."""
    file_path: Path
    metadata: MarkdownMetadata
    sections: List[MarkdownSection]
    raw_content: str
    word_count: int
    reading_time_minutes: int


class MarkdownParser:
    """Parser for markdown files with context extraction capabilities."""
    
    def __init__(self):
        self.heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        self.frontmatter_pattern = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
        self.code_block_pattern = re.compile(r'```[\s\S]*?```', re.MULTILINE)
        self.inline_code_pattern = re.compile(r'`[^`]+`')
        self.link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
        self.image_pattern = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
        
    def parse_file(self, file_path: Path) -> MarkdownDocument:
        """Parse a markdown file and return a structured document."""
        if not file_path.exists():
            raise FileNotFoundError(f"Markdown file not found: {file_path}")
        
        if not file_path.suffix.lower() in ['.md', '.markdown']:
            raise ValueError(f"File is not a markdown file: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract frontmatter
        metadata = self._parse_frontmatter(content)
        
        # Remove frontmatter from content
        content_without_frontmatter = self._remove_frontmatter(content)
        
        # Parse sections
        sections = self._parse_sections(content_without_frontmatter)
        
        # Calculate statistics
        word_count = self._count_words(content_without_frontmatter)
        reading_time = max(1, word_count // 200)  # Assume 200 words per minute
        
        return MarkdownDocument(
            file_path=file_path,
            metadata=metadata,
            sections=sections,
            raw_content=content,
            word_count=word_count,
            reading_time_minutes=reading_time
        )
    
    def _parse_frontmatter(self, content: str) -> MarkdownMetadata:
        """Extract and parse YAML frontmatter."""
        match = self.frontmatter_pattern.match(content)
        if not match:
            return MarkdownMetadata()
        
        frontmatter_text = match.group(1)
        metadata = MarkdownMetadata()
        
        # Simple YAML parsing (basic key-value pairs)
        for line in frontmatter_text.split('\n'):
            line = line.strip()
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip().strip('"\'')
                
                if key == 'title':
                    metadata.title = value
                elif key == 'author':
                    metadata.author = value
                elif key == 'date':
                    metadata.date = value
                elif key == 'description':
                    metadata.description = value
                elif key == 'tags':
                    # Handle tags as comma-separated or YAML list
                    if value.startswith('[') and value.endswith(']'):
                        # YAML list format
                        tags_str = value[1:-1]
                        metadata.tags = [tag.strip().strip('"\'') for tag in tags_str.split(',')]
                    else:
                        # Comma-separated format
                        metadata.tags = [tag.strip() for tag in value.split(',')]
                else:
                    metadata.custom_fields[key] = value
        
        return metadata
    
    def _remove_frontmatter(self, content: str) -> str:
        """Remove frontmatter from content."""
        return self.frontmatter_pattern.sub('', content)
    
    def _parse_sections(self, content: str) -> List[MarkdownSection]:
        """Parse content into hierarchical sections."""
        lines = content.split('\n')
        sections = []
        current_sections = {}  # level -> section
        
        for i, line in enumerate(lines):
            heading_match = self.heading_pattern.match(line)
            if heading_match:
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()
                
                # Close previous sections at this level and deeper
                for l in list(current_sections.keys()):
                    if l >= level:
                        section = current_sections[l]
                        section.line_end = i - 1
                        del current_sections[l]
                
                # Create new section
                section = MarkdownSection(
                    title=title,
                    level=level,
                    content="",
                    line_start=i,
                    line_end=len(lines) - 1,  # Will be updated when section ends
                    subsections=[]
                )
                
                # Add to parent section or root
                if level == 1:
                    sections.append(section)
                else:
                    # Find parent section
                    parent_level = level - 1
                    while parent_level > 0 and parent_level not in current_sections:
                        parent_level -= 1
                    
                    if parent_level > 0 and parent_level in current_sections:
                        current_sections[parent_level].subsections.append(section)
                    else:
                        sections.append(section)
                
                current_sections[level] = section
        
        # Extract content for each section
        for section in self._flatten_sections(sections):
            section.content = self._extract_section_content(lines, section)
        
        return sections
    
    def _flatten_sections(self, sections: List[MarkdownSection]) -> List[MarkdownSection]:
        """Flatten nested sections into a list."""
        result = []
        for section in sections:
            result.append(section)
            result.extend(self._flatten_sections(section.subsections))
        return result
    
    def _extract_section_content(self, lines: List[str], section: MarkdownSection) -> str:
        """Extract content for a section."""
        start = section.line_start + 1  # Skip the heading line
        end = section.line_end + 1
        
        # Find the actual end of this section's content
        for subsection in section.subsections:
            if subsection.line_start < end:
                end = subsection.line_start
        
        content_lines = lines[start:end]
        return '\n'.join(content_lines).strip()
    
    def _count_words(self, content: str) -> int:
        """Count words in content, excluding code blocks."""
        # Remove code blocks
        content = self.code_block_pattern.sub('', content)
        content = self.inline_code_pattern.sub('', content)
        
        # Remove markdown formatting
        content = re.sub(r'[#*_`\[\]()]', '', content)
        
        # Count words
        words = content.split()
        return len([word for word in words if word.strip()])
    
    def extract_context_summary(self, document: MarkdownDocument, max_length: int = 500) -> str:
        """Extract a context summary from the document."""
        summary_parts = []
        
        # Add title if available
        if document.metadata.title:
            summary_parts.append(f"Title: {document.metadata.title}")
        
        # Add description if available
        if document.metadata.description:
            summary_parts.append(f"Description: {document.metadata.description}")
        
        # Add main sections
        for section in document.sections[:3]:  # First 3 main sections
            if section.content:
                content_preview = section.content[:100] + "..." if len(section.content) > 100 else section.content
                summary_parts.append(f"{section.title}: {content_preview}")
        
        summary = "\n".join(summary_parts)
        
        # Truncate if too long
        if len(summary) > max_length:
            summary = summary[:max_length] + "..."
        
        return summary
    
    def extract_key_points(self, document: MarkdownDocument) -> List[str]:
        """Extract key points from the document."""
        key_points = []
        
        # Extract from bullet points and numbered lists
        list_pattern = re.compile(r'^[\s]*[-*+]\s+(.+)$|^[\s]*\d+\.\s+(.+)$', re.MULTILINE)
        
        for section in document.sections:
            matches = list_pattern.findall(section.content)
            for match in matches:
                point = match[0] or match[1]
                if point and len(point.strip()) > 10:  # Filter out very short points
                    key_points.append(point.strip())
        
        return key_points[:10]  # Return top 10 key points
    
    def search_content(self, document: MarkdownDocument, query: str) -> List[Tuple[str, str, int]]:
        """Search for content in the document."""
        results = []
        query_lower = query.lower()
        
        # Search in metadata
        if document.metadata.title and query_lower in document.metadata.title.lower():
            results.append(("Title", document.metadata.title, 0))
        
        if document.metadata.description and query_lower in document.metadata.description.lower():
            results.append(("Description", document.metadata.description, 0))
        
        # Search in sections
        for section in self._flatten_sections(document.sections):
            if query_lower in section.title.lower():
                results.append(("Section Title", section.title, section.line_start))
            
            if query_lower in section.content.lower():
                # Find the specific line
                lines = section.content.split('\n')
                for i, line in enumerate(lines):
                    if query_lower in line.lower():
                        results.append(("Content", line.strip(), section.line_start + i + 1))
        
        return results