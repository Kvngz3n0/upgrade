"""Error handler utility"""

import json
from functools import wraps
from flask import jsonify

class ErrorHandler:
    """Handle and log errors consistently"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def handle_errors(self, f):
        """Decorator for handling endpoint errors"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except ValueError as e:
                self.logger.warning(f"Validation error: {str(e)}")
                return jsonify({'error': f'Invalid input: {str(e)}'}), 400
            except Exception as e:
                self.logger.error(f"Unhandled error: {str(e)}")
                return jsonify({'error': 'Internal server error'}), 500
        return decorated_function
    
    def log_and_raise(self, message: str, error_type: str = 'Error'):
        """Log and raise an exception"""
        self.logger.error(f"{error_type}: {message}")
        raise Exception(message)
