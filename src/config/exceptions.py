"""
Configuration-related exceptions for Todoist AI CLI.
"""


class ConfigurationError(Exception):
    """Base exception for configuration errors."""
    pass


class MissingAPIKeyError(ConfigurationError):
    """Raised when required API key is missing."""
    
    def __init__(self, service: str):
        self.service = service
        super().__init__(f"Missing API key for {service}. Please check your .env file.")


class InvalidConfigurationError(ConfigurationError):
    """Raised when configuration values are invalid."""
    
    def __init__(self, field: str, value: str, reason: str = ""):
        self.field = field
        self.value = value
        self.reason = reason
        message = f"Invalid configuration for {field}: {value}"
        if reason:
            message += f" ({reason})"
        super().__init__(message)


class ConfigurationFileError(ConfigurationError):
    """Raised when configuration file cannot be read or parsed."""
    
    def __init__(self, file_path: str, reason: str = ""):
        self.file_path = file_path
        self.reason = reason
        message = f"Error reading configuration file {file_path}"
        if reason:
            message += f": {reason}"
        super().__init__(message)