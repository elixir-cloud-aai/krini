"""
Web adapters package - Framework-specific HTTP implementations
"""

from .web.flask_adapter import FlaskWebAdapter

try:
    from .web.fastapi_adapter import FastAPIWebAdapter
except ImportError:
    # FastAPI not installed
    FastAPIWebAdapter = None

__all__ = ['FlaskWebAdapter', 'FastAPIWebAdapter']
