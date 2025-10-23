"""
Context management service for markdown files and AI conversations.
"""

from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime

from .parser import MarkdownParser, MarkdownDocument


@dataclass
class ContextItem:
    """Represents a context item from a markdown file."""
    file_path: Path
    title: str
    content: str
    summary: str
    key_points: List[str]
    tags: List[str]
    added_at: datetime
    last_accessed: datetime
    access_count: int = 0


@dataclass
class ContextManager:
    """Manages context from multiple markdown files."""
    
    def __init__(self, max_context_items: int = 10):
        self.max_context_items = max_context_items
        self.parser = MarkdownParser()
        self.context_items: Dict[str, ContextItem] = {}
        self.active_files: Set[Path] = set()
    
    def add_file(self, file_path: Path) -> bool:
        """Add a markdown file to the context."""
        try:
            # Parse the markdown file
            document = self.parser.parse_file(file_path)
            
            # Create context item
            context_item = ContextItem(
                file_path=file_path,
                title=document.metadata.title or file_path.stem,
                content=document.raw_content,
                summary=self.parser.extract_context_summary(document),
                key_points=self.parser.extract_key_points(document),
                tags=document.metadata.tags,
                added_at=datetime.now(),
                last_accessed=datetime.now()
            )
            
            # Add to context
            file_key = str(file_path)
            self.context_items[file_key] = context_item
            self.active_files.add(file_path)
            
            # Manage context size
            self._manage_context_size()
            
            return True
            
        except Exception as e:
            print(f"Error adding file to context: {e}")
            return False
    
    def remove_file(self, file_path: Path) -> bool:
        """Remove a file from the context."""
        file_key = str(file_path)
        if file_key in self.context_items:
            del self.context_items[file_key]
            self.active_files.discard(file_path)
            return True
        return False
    
    def get_context_summary(self) -> str:
        """Get a summary of all context items."""
        if not self.context_items:
            return "No context files loaded."
        
        summary_parts = []
        summary_parts.append(f"📄 Active Context ({len(self.context_items)} files):")
        summary_parts.append("")
        
        for item in sorted(self.context_items.values(), key=lambda x: x.last_accessed, reverse=True):
            summary_parts.append(f"• {item.title}")
            summary_parts.append(f"  File: {item.file_path.name}")
            summary_parts.append(f"  Summary: {item.summary[:100]}...")
            if item.key_points:
                summary_parts.append(f"  Key points: {len(item.key_points)} items")
            summary_parts.append("")
        
        return "\n".join(summary_parts)
    
    def get_context_for_ai(self) -> str:
        """Get formatted context for AI conversations."""
        if not self.context_items:
            return ""
        
        context_parts = []
        context_parts.append("=== CONTEXT FROM MARKDOWN FILES ===")
        context_parts.append("")
        
        for item in sorted(self.context_items.values(), key=lambda x: x.last_accessed, reverse=True):
            # Update access info
            item.last_accessed = datetime.now()
            item.access_count += 1
            
            context_parts.append(f"File: {item.file_path.name}")
            context_parts.append(f"Title: {item.title}")
            context_parts.append("")
            context_parts.append("Summary:")
            context_parts.append(item.summary)
            context_parts.append("")
            
            if item.key_points:
                context_parts.append("Key Points:")
                for point in item.key_points[:5]:  # Limit to 5 key points
                    context_parts.append(f"• {point}")
                context_parts.append("")
            
            if item.tags:
                context_parts.append(f"Tags: {', '.join(item.tags)}")
                context_parts.append("")
            
            context_parts.append("---")
            context_parts.append("")
        
        context_parts.append("=== END CONTEXT ===")
        return "\n".join(context_parts)
    
    def search_context(self, query: str) -> List[Dict]:
        """Search across all context items."""
        results = []
        
        for item in self.context_items.values():
            # Parse document for search
            try:
                document = self.parser.parse_file(item.file_path)
                search_results = self.parser.search_content(document, query)
                
                if search_results:
                    results.append({
                        "file": item.file_path.name,
                        "title": item.title,
                        "matches": search_results
                    })
            except Exception:
                continue
        
        return results
    
    def get_file_details(self, file_path: Path) -> Optional[Dict]:
        """Get detailed information about a specific file."""
        file_key = str(file_path)
        if file_key not in self.context_items:
            return None
        
        item = self.context_items[file_key]
        
        try:
            document = self.parser.parse_file(file_path)
            
            return {
                "file_path": str(file_path),
                "title": item.title,
                "summary": item.summary,
                "word_count": document.word_count,
                "reading_time": document.reading_time_minutes,
                "sections": len(document.sections),
                "key_points": item.key_points,
                "tags": item.tags,
                "added_at": item.added_at.isoformat(),
                "last_accessed": item.last_accessed.isoformat(),
                "access_count": item.access_count,
                "metadata": {
                    "author": document.metadata.author,
                    "date": document.metadata.date,
                    "description": document.metadata.description
                }
            }
        except Exception:
            return None
    
    def clear_context(self) -> None:
        """Clear all context items."""
        self.context_items.clear()
        self.active_files.clear()
    
    def get_context_stats(self) -> Dict:
        """Get statistics about the current context."""
        if not self.context_items:
            return {
                "total_files": 0,
                "total_words": 0,
                "total_sections": 0,
                "most_accessed": None,
                "recently_added": None
            }
        
        total_words = 0
        total_sections = 0
        
        for item in self.context_items.values():
            try:
                document = self.parser.parse_file(item.file_path)
                total_words += document.word_count
                total_sections += len(document.sections)
            except Exception:
                continue
        
        # Find most accessed and recently added
        most_accessed = max(self.context_items.values(), key=lambda x: x.access_count)
        recently_added = max(self.context_items.values(), key=lambda x: x.added_at)
        
        return {
            "total_files": len(self.context_items),
            "total_words": total_words,
            "total_sections": total_sections,
            "most_accessed": {
                "file": most_accessed.file_path.name,
                "count": most_accessed.access_count
            },
            "recently_added": {
                "file": recently_added.file_path.name,
                "added_at": recently_added.added_at.isoformat()
            }
        }
    
    def _manage_context_size(self) -> None:
        """Manage context size by removing least recently used items."""
        if len(self.context_items) <= self.max_context_items:
            return
        
        # Sort by last accessed time and remove oldest
        sorted_items = sorted(
            self.context_items.items(),
            key=lambda x: x[1].last_accessed
        )
        
        items_to_remove = len(self.context_items) - self.max_context_items
        
        for i in range(items_to_remove):
            file_key, item = sorted_items[i]
            del self.context_items[file_key]
            self.active_files.discard(item.file_path)
    
    def export_context(self) -> Dict:
        """Export context data for persistence."""
        return {
            "max_context_items": self.max_context_items,
            "context_items": {
                key: {
                    "file_path": str(item.file_path),
                    "title": item.title,
                    "summary": item.summary,
                    "key_points": item.key_points,
                    "tags": item.tags,
                    "added_at": item.added_at.isoformat(),
                    "last_accessed": item.last_accessed.isoformat(),
                    "access_count": item.access_count
                }
                for key, item in self.context_items.items()
            }
        }
    
    def import_context(self, data: Dict) -> None:
        """Import context data from persistence."""
        self.max_context_items = data.get("max_context_items", 10)
        self.context_items.clear()
        self.active_files.clear()
        
        for key, item_data in data.get("context_items", {}).items():
            file_path = Path(item_data["file_path"])
            
            # Only import if file still exists
            if file_path.exists():
                context_item = ContextItem(
                    file_path=file_path,
                    title=item_data["title"],
                    content="",  # Will be loaded when needed
                    summary=item_data["summary"],
                    key_points=item_data["key_points"],
                    tags=item_data["tags"],
                    added_at=datetime.fromisoformat(item_data["added_at"]),
                    last_accessed=datetime.fromisoformat(item_data["last_accessed"]),
                    access_count=item_data["access_count"]
                )
                
                self.context_items[key] = context_item
                self.active_files.add(file_path)