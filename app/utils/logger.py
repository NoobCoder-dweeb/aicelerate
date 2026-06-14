from pathlib import Path
import logging
import logging.config

logger_name = "app_logger"
log_file_path = Path(__file__).parent.parent.parent.resolve() / "logs"

# configurations for logger
LOGGING_CONFIG = {
    "version" : 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple_formatter": {
            "format" : "%(asctime)s:%(lineno)d:%(levelname)s:%(name)s - %(message)s",
            "datefmt" : "%Y-%m-%d %H:%M:%S"
        }
    },
    "handlers": {
        "app_file_handler" : {
            "class" : "logging.FileHandler",
            "level" : "DEBUG",
            "formatter" : "simple_formatter",
            "filename" : (log_file_path / "app.log"),
            "mode" : "a",
        },
        "error_file_handler" : {
            "class" : "logging.FileHandler",
            "level" : "ERROR",
            "formatter" : "simple_formatter",
            "filename" : (log_file_path / "errors.log"),
            "mode" : "a",
        },
        "console": {
            "class": "logging.StreamHandler",
            "level" : "DEBUG",
            "formatter" : "simple_formatter",
            "stream" : "ext://sys.stdout"
        }
    },
    "loggers" : {
        "app_logger" : {
            "level" : "DEBUG",
            "handlers" : ["app_file_handler", "error_file_handler"],
            "propagate" : False
        }
    },

    "root" : {
        "level" : "DEBUG",
        "handlers" : ["app_file_handler", "console"],
    },
}

# create relevant log files if they are not existing
if not log_file_path.exists():
    print(log_file_path)
    log_file_path.mkdir(parents=True, exist_ok=True)
    (log_file_path / "app.log").touch() # general info on runtime
    (log_file_path / "errors.log").touch() # logs errors

logging.config.dictConfig(config=LOGGING_CONFIG)

logger = logging.getLogger(name=logger_name)