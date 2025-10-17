import os
from pathlib import Path
from dotenv import load_dotenv

# Get the directory where settings.py is located
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Use explicit path to .env file in backend directory
env_path = BASE_DIR / '.env'

if env_path.exists():
    print(f"Loading .env from: {env_path}")
    # override=True ensures this file takes precedence
    load_dotenv(dotenv_path=env_path, override=True)
else:
    print(f"Warning: .env file not found at: {env_path}")
    print(f"Current working directory: {Path.cwd()}")
    print(f"BASE_DIR: {BASE_DIR}")

class Settings:
    # Gemini API key - loaded from .env file
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Other settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
    
    # Production mode (less verbose logging)
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    def __init__(self):
        if self.DEBUG:
            self._debug_print()
        
        # Validate API key
        if not self.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY not found in .env file. "
                "Please create a .env file in the backend directory with: "
                "GEMINI_API_KEY=your_api_key_here"
            )
        elif len(self.GEMINI_API_KEY) < 30:
            raise ValueError(
                f"GEMINI_API_KEY appears invalid (length: {len(self.GEMINI_API_KEY)}). "
                f"Expected ~39 characters. "
                f"Current value starts with: {self.GEMINI_API_KEY[:10]}..."
            )
    
    def _debug_print(self):
        """Debug output - only shown when DEBUG=true"""
        print("\n" + "="*60)
        print("🔧 SETTINGS INITIALIZATION")
        print("="*60)
        
        print(f"\n✅ Gemini API Key loaded from .env successfully!")
        print(f"   Length: {len(self.GEMINI_API_KEY)} characters")
        print(f"   BASE_DIR: {BASE_DIR}")
        print("="*60 + "\n")

# Create singleton instance
settings = Settings()