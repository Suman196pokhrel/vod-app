import logging
from colorlog import ColoredFormatter

def setup_logging():
    """Configure colored logging for the application"""
    
    # Create colored formatter
    formatter = ColoredFormatter(
        "%(log_color)s[%(levelname)s]%(reset)s %(blue)s[%(name)s]%(reset)s %(message)s",
        datefmt=None,
        reset=True,
        log_colors={
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red,bg_white',
        },
        secondary_log_colors={},
        style='%'
    )
    
    # Get root logger
    logger = logging.getLogger()
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Create console handler with colored formatter
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    
    return logger