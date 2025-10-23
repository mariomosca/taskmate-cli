#!/usr/bin/env python3
"""
Test script for markdown parser and context management functionality.
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from markdown.parser import MarkdownParser
from markdown.context import ContextManager


def test_markdown_parser():
    """Test the markdown parser functionality."""
    print("🧪 Testing Markdown Parser...")
    
    # Initialize parser
    parser = MarkdownParser()
    
    # Test file path
    test_file = Path("test_document.md")
    
    if not test_file.exists():
        print("❌ Test file not found!")
        return False
    
    try:
        # Parse the test document
        print(f"📖 Parsing {test_file}...")
        document = parser.parse_file(test_file)
        
        # Test metadata extraction
        print("\n📋 Metadata:")
        print(f"  Title: {document.metadata.title}")
        print(f"  Author: {document.metadata.author}")
        print(f"  Date: {document.metadata.date}")
        print(f"  Tags: {document.metadata.tags}")
        print(f"  Description: {document.metadata.description}")
        
        # Test content analysis
        print(f"\n📊 Content Analysis:")
        print(f"  Word count: {document.word_count}")
        print(f"  Reading time: {document.reading_time_minutes} minutes")
        print(f"  Sections: {len(document.sections)}")
        
        # Test section hierarchy
        print(f"\n📑 Section Hierarchy:")
        for section in document.sections:
            indent = "  " * (section.level - 1)
            print(f"{indent}• {section.title} (Level {section.level})")
        
        # Test context summary
        print(f"\n📝 Context Summary:")
        summary = parser.extract_context_summary(document)
        print(summary)
        
        # Test key points extraction
        print(f"\n🔑 Key Points:")
        key_points = parser.extract_key_points(document)
        for i, point in enumerate(key_points, 1):
            print(f"  {i}. {point}")
        
        # Test content search
        print(f"\n🔍 Search Test (query: 'AI'):")
        search_results = parser.search_content(document, "AI")
        for result in search_results[:3]:  # Show first 3 results
            print(f"  • {result}")
        
        print("\n✅ Markdown parser test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing markdown parser: {e}")
        return False


def test_context_manager():
    """Test the context manager functionality."""
    print("\n🧪 Testing Context Manager...")
    
    try:
        # Initialize context manager
        context_manager = ContextManager(max_context_items=5)
        
        # Test file path
        test_file = Path("test_document.md")
        
        if not test_file.exists():
            print("❌ Test file not found!")
            return False
        
        # Add file to context
        print(f"📁 Adding {test_file} to context...")
        success = context_manager.add_file(test_file)
        
        if not success:
            print("❌ Failed to add file to context!")
            return False
        
        # Test context summary
        print(f"\n📄 Context Summary:")
        summary = context_manager.get_context_summary()
        print(summary)
        
        # Test context stats
        print(f"\n📊 Context Statistics:")
        stats = context_manager.get_context_stats()
        print(f"  Total files: {stats['total_files']}")
        print(f"  Total words: {stats['total_words']:,}")
        print(f"  Total sections: {stats['total_sections']}")
        
        # Test AI context
        print(f"\n🤖 AI Context (first 500 chars):")
        ai_context = context_manager.get_context_for_ai()
        print(ai_context[:500] + "..." if len(ai_context) > 500 else ai_context)
        
        # Test file details
        print(f"\n📋 File Details:")
        details = context_manager.get_file_details(test_file)
        if details:
            print(f"  Title: {details['title']}")
            print(f"  Word count: {details['word_count']}")
            print(f"  Reading time: {details['reading_time']} minutes")
            print(f"  Sections: {details['sections']}")
            print(f"  Access count: {details['access_count']}")
        
        # Test search
        print(f"\n🔍 Context Search (query: 'parser'):")
        search_results = context_manager.search_context("parser")
        for result in search_results:
            print(f"  File: {result['file']}")
            print(f"  Matches: {len(result['matches'])}")
        
        # Test context export/import
        print(f"\n💾 Testing Export/Import:")
        exported_data = context_manager.export_context()
        print(f"  Exported {len(exported_data['context_items'])} items")
        
        # Clear and import
        context_manager.clear_context()
        context_manager.import_context(exported_data)
        print(f"  Imported {len(context_manager.context_items)} items")
        
        print("\n✅ Context manager test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing context manager: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Starting Markdown Parser and Context Manager Tests\n")
    
    # Test markdown parser
    parser_success = test_markdown_parser()
    
    # Test context manager
    context_success = test_context_manager()
    
    # Summary
    print(f"\n📊 Test Results:")
    print(f"  Markdown Parser: {'✅ PASS' if parser_success else '❌ FAIL'}")
    print(f"  Context Manager: {'✅ PASS' if context_success else '❌ FAIL'}")
    
    if parser_success and context_success:
        print(f"\n🎉 All tests passed! The markdown parser is ready for use.")
        return 0
    else:
        print(f"\n💥 Some tests failed. Please check the implementation.")
        return 1


if __name__ == "__main__":
    exit(main())