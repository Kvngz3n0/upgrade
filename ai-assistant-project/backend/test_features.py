#!/usr/bin/env python3
"""
Test script for AI Assistant with web capabilities
Tests all new features: web fetching, image management, context, scheduler
"""

import requests
import json
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:5000/api"
COLORS = {
    'GREEN': '\033[92m',
    'RED': '\033[91m',
    'YELLOW': '\033[93m',
    'BLUE': '\033[94m',
    'RESET': '\033[0m'
}

def print_header(text):
    """Print test section header"""
    print(f"\n{COLORS['BLUE']}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{COLORS['RESET']}\n")

def print_success(text):
    """Print success message"""
    print(f"{COLORS['GREEN']}✓ {text}{COLORS['RESET']}")

def print_error(text):
    """Print error message"""
    print(f"{COLORS['RED']}✗ {text}{COLORS['RESET']}")

def print_info(text):
    """Print info message"""
    print(f"{COLORS['YELLOW']}ℹ {text}{COLORS['RESET']}")

def test_health():
    """Test 1: Health check"""
    print_header("Test 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health")
        data = response.json()
        
        if response.status_code == 200 and data.get('status') == 'ok':
            print_success("Server is healthy")
            print(f"  Service: {data.get('service')}")
            return True
        else:
            print_error("Server health check failed")
            return False
    except Exception as e:
        print_error(f"Connection failed: {e}")
        return False

def test_web_fetch():
    """Test 2: Manual web fetching"""
    print_header("Test 2: Manual Web Fetching")
    try:
        url = "https://www.python.org"
        response = requests.post(
            f"{BASE_URL}/fetch-web",
            json={"url": url},
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print_success(f"Fetched web page: {url}")
                print(f"  Title: {data.get('title', 'N/A')}")
                print(f"  Status: {data.get('status')}")
                print(f"  Images found: {data.get('images_found', 0)}")
                print(f"  Links found: {data.get('links_found', 0)}")
                return True
            else:
                print_error(f"Web fetch returned error: {data.get('error')}")
                return False
        else:
            print_error(f"Web fetch failed with status {response.status_code}")
            return False
    except requests.Timeout:
        print_error("Web fetch timed out (check internet connection)")
        return False
    except Exception as e:
        print_error(f"Web fetch error: {e}")
        return False

def test_chat_with_web():
    """Test 3: Chat with auto web fetching"""
    print_header("Test 3: Chat with Auto Web Fetching")
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json={"message": "What is Python programming?", "fetch_web": True},
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print_success("Chat with web fetching succeeded")
                print(f"  Response: {data.get('response', '')[:100]}...")
                
                has_web = bool(data.get('web_data'))
                has_images = bool(data.get('images'))
                
                if has_web:
                    print_success("  Web data included in response")
                    print(f"    URL: {data['web_data'].get('url')}")
                else:
                    print_info("  No web data in response")
                
                if has_images:
                    print_success(f"  Images stored: {len(data['images'])}")
                else:
                    print_info("  No images stored")
                
                return True
            else:
                print_error(f"Chat failed: {data.get('error')}")
                return False
        else:
            print_error(f"Chat failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Chat error: {e}")
        return False

def test_chat_no_web():
    """Test 4: Chat without web fetching"""
    print_header("Test 4: Chat Without Web Fetching")
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json={"message": "Hello, how are you?", "fetch_web": False}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                print_success("Chat without web fetching succeeded")
                print(f"  Response: {data.get('response', '')[:100]}...")
                
                if not data.get('web_data'):
                    print_success("  No web data (as expected)")
                else:
                    print_error("  Web data included (unexpected)")
                
                return True
            else:
                print_error(f"Chat failed: {data.get('error')}")
                return False
        else:
            print_error(f"Chat failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Chat error: {e}")
        return False

def test_images():
    """Test 5: Get stored images"""
    print_header("Test 5: Get Stored Images")
    try:
        response = requests.get(f"{BASE_URL}/images?limit=10")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                images = data.get('images', [])
                print_success(f"Retrieved images list")
                print(f"  Total images stored: {data.get('total', 0)}")
                
                if images:
                    # Show first image details
                    img = images[0]
                    print(f"  First image:")
                    print(f"    URL: {img.get('url', 'N/A')[:60]}...")
                    print(f"    Size: {img.get('size_bytes', 0)} bytes")
                    print(f"    Created: {img.get('created_at', 'N/A')}")
                    print(f"    Expires: {img.get('expires_at', 'N/A')}")
                    print(f"    Accessed: {img.get('accessed_count', 0)} times")
                else:
                    print_info("  No images stored yet")
                
                return True
            else:
                print_error(f"Failed to get images: {data.get('error')}")
                return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Images error: {e}")
        return False

def test_context():
    """Test 6: Get context"""
    print_header("Test 6: Get Context")
    try:
        response = requests.get(f"{BASE_URL}/context?query=Python")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                context_items = data.get('context', [])
                print_success("Retrieved context")
                print(f"  Total context items: {data.get('total', 0)}")
                
                if context_items:
                    # Show first context
                    ctx = context_items[0]
                    print(f"  First context:")
                    print(f"    Type: {ctx.get('type', 'N/A')}")
                    print(f"    Source: {ctx.get('source', 'N/A')[:60]}...")
                    print(f"    Relevance: {ctx.get('relevance', 0):.2f}")
                else:
                    print_info("  No context stored yet")
                
                return True
            else:
                print_error(f"Failed to get context: {data.get('error')}")
                return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Context error: {e}")
        return False

def test_scheduler():
    """Test 7: Scheduler status"""
    print_header("Test 7: Task Scheduler Status")
    try:
        response = requests.get(f"{BASE_URL}/scheduler/status")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                scheduler = data.get('scheduler', {})
                print_success("Retrieved scheduler status")
                print(f"  Running: {scheduler.get('running', False)}")
                
                tasks = scheduler.get('tasks', {})
                if tasks:
                    for task_id, task_info in tasks.items():
                        print(f"  Task: {task_id}")
                        print(f"    Enabled: {task_info.get('enabled', False)}")
                        print(f"    Interval: {task_info.get('interval', 0)}s")
                        print(f"    Last run: {task_info.get('last_run', 'Never')}")
                else:
                    print_info("  No tasks scheduled")
                
                return True
            else:
                print_error(f"Failed to get scheduler status: {data.get('error')}")
                return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Scheduler error: {e}")
        return False

def test_memory():
    """Test 8: Memory operations"""
    print_header("Test 8: Memory Operations")
    try:
        # Store a memory
        store_response = requests.post(
            f"{BASE_URL}/memory/store",
            json={
                "key": "test_user",
                "value": "Test User 123",
                "importance": 0.9
            }
        )
        
        if store_response.status_code == 200:
            print_success("Memory stored successfully")
            
            # Recall the memory
            recall_response = requests.get(f"{BASE_URL}/memory/recall?key=test_user")
            
            if recall_response.status_code == 200:
                data = recall_response.json()
                if data.get('success'):
                    print_success("Memory recalled successfully")
                    print(f"  Stored value: {data.get('value')}")
                    return True
                else:
                    print_error(f"Failed to recall: {data.get('error')}")
                    return False
            else:
                print_error(f"Recall failed with status {recall_response.status_code}")
                return False
        else:
            print_error(f"Store failed with status {store_response.status_code}")
            return False
    except Exception as e:
        print_error(f"Memory error: {e}")
        return False

def test_history():
    """Test 9: Conversation history"""
    print_header("Test 9: Conversation History")
    try:
        response = requests.get(f"{BASE_URL}/chat/history?limit=5")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                history = data.get('history', [])
                print_success("Retrieved conversation history")
                print(f"  Total messages: {data.get('total', 0)}")
                
                if history:
                    print(f"  Latest message:")
                    msg = history[0]
                    print(f"    User: {msg.get('user_input', 'N/A')[:60]}...")
                    print(f"    AI: {msg.get('ai_response', 'N/A')[:60]}...")
                else:
                    print_info("  No history yet")
                
                return True
            else:
                print_error(f"Failed to get history: {data.get('error')}")
                return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"History error: {e}")
        return False

def test_learning():
    """Test 10: Learning progress"""
    print_header("Test 10: Learning Progress")
    try:
        response = requests.get(f"{BASE_URL}/learning/progress")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success'):
                progress = data.get('progress', {})
                print_success("Retrieved learning progress")
                print(f"  Total interactions: {progress.get('total_interactions', 0)}")
                print(f"  Average rating: {progress.get('avg_rating', 0):.2f}")
                print(f"  Learned preferences: {progress.get('learned_preferences', 0)}")
                
                learnings = data.get('top_learnings', [])
                if learnings:
                    print(f"  Top learnings:")
                    for learning in learnings[:3]:
                        print(f"    - {learning.get('word', 'N/A')}: {learning.get('confidence', 0):.2f}")
                
                return True
            else:
                print_error(f"Failed to get progress: {data.get('error')}")
                return False
        else:
            print_error(f"Request failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Learning error: {e}")
        return False

def main():
    """Run all tests"""
    print(f"\n{COLORS['BLUE']}")
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║     AI Assistant with Web Capabilities - Test Suite          ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print(f"{COLORS['RESET']}")
    
    print_info(f"Starting tests at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_info(f"Server: {BASE_URL}")
    
    # Run tests
    tests = [
        ("Health Check", test_health),
        ("Web Fetching", test_web_fetch),
        ("Chat with Web", test_chat_with_web),
        ("Chat without Web", test_chat_no_web),
        ("Images", test_images),
        ("Context", test_context),
        ("Scheduler", test_scheduler),
        ("Memory", test_memory),
        ("History", test_history),
        ("Learning", test_learning),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print_error(f"Test failed with exception: {e}")
            results[test_name] = False
        
        # Small delay between tests
        time.sleep(0.5)
    
    # Print summary
    print_header("Test Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{COLORS['GREEN']}PASS{COLORS['RESET']}" if result else f"{COLORS['RED']}FAIL{COLORS['RESET']}"
        print(f"  {test_name:<30} {status}")
    
    print(f"\n{COLORS['BLUE']}{'─'*60}{COLORS['RESET']}")
    
    if passed == total:
        print_success(f"All {total} tests passed! ✓")
        return 0
    else:
        print_error(f"{passed}/{total} tests passed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
