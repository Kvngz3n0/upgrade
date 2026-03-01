"""Background task scheduler for cleanup operations"""

import threading
import logging
import time
from datetime import datetime
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class TaskScheduler:
    """Simple background task scheduler"""
    
    def __init__(self):
        """Initialize scheduler"""
        self.tasks = {}
        self.running = False
        self.thread = None
    
    def schedule_recurring(self, task_id: str, func: Callable, interval_seconds: int) -> None:
        """Schedule a recurring task
        
        Args:
            task_id: Unique task identifier
            func: Function to execute
            interval_seconds: Interval between executions
        """
        self.tasks[task_id] = {
            'func': func,
            'interval': interval_seconds,
            'last_run': None,
            'enabled': True
        }
        
        logger.info(f"Scheduled task '{task_id}' with interval {interval_seconds}s")
    
    def start(self) -> None:
        """Start the scheduler"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        
        logger.info("Task scheduler started")
    
    def stop(self) -> None:
        """Stop the scheduler"""
        self.running = False
        
        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info("Task scheduler stopped")
    
    def disable_task(self, task_id: str) -> None:
        """Disable a task"""
        if task_id in self.tasks:
            self.tasks[task_id]['enabled'] = False
            logger.info(f"Task '{task_id}' disabled")
    
    def enable_task(self, task_id: str) -> None:
        """Enable a task"""
        if task_id in self.tasks:
            self.tasks[task_id]['enabled'] = True
            logger.info(f"Task '{task_id}' enabled")
    
    def _run(self) -> None:
        """Main scheduler loop"""
        logger.info("Scheduler loop started")
        
        while self.running:
            now = time.time()
            
            for task_id, task in self.tasks.items():
                if not task['enabled']:
                    continue
                
                last_run = task['last_run']
                interval = task['interval']
                
                # Check if task should run
                if last_run is None or (now - last_run) >= interval:
                    try:
                        logger.debug(f"Executing task: {task_id}")
                        task['func']()
                        task['last_run'] = now
                        logger.debug(f"Task '{task_id}' completed")
                    
                    except Exception as e:
                        logger.error(f"Task '{task_id}' failed: {str(e)}")
            
            # Sleep to avoid busy-waiting
            time.sleep(1)
    
    def get_status(self) -> dict:
        """Get scheduler status"""
        return {
            'running': self.running,
            'tasks': {
                task_id: {
                    'enabled': task['enabled'],
                    'interval': task['interval'],
                    'last_run': task['last_run'],
                    'last_run_readable': datetime.fromtimestamp(task['last_run']).isoformat() 
                                        if task['last_run'] else None
                }
                for task_id, task in self.tasks.items()
            }
        }
