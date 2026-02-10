import logging
import os
from config.settings import LOG_FILE

def setup_logger(name="Mizhou_App"):
    """
    Sets up a logger that writes to:
    1. The console (Terminal)
    2. The log file (logs/app.log)
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if logger.hasHandlers():
        return logger

    file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
    file_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter('%(message)s')
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    return logger