import os
from pathlib import Path
from dotenv import load_dotenv

# Get the directory where settings.py is located
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Use explicit path to .env file in backend directory
env_path = BASE_DIR / '.env'

if env_path.exists():
    print(f"Loading .env from: {env_path}")
    load_dotenv(dotenv_path=env_path, override=True)
else:
    print(f"⚠️ Warning: .env file not found at: {env_path}")
    print(f"Current working directory: {Path.cwd()}")
    print(f"BASE_DIR: {BASE_DIR}")


class Settings:
    """
    Application settings loader with auto API key rotation support.
    """
    def __init__(self):
        # Load multiple Gemini API keys from environment variables
        # Format in .env:
        # GEMINI_API_KEYS=key1,key2,key3,...
        api_keys_raw = os.getenv("GEMINI_API_KEYS", "")
        if not api_keys_raw:
            raise ValueError(
                "❌ GEMINI_API_KEYS not found in .env file.\n"
                "Please create a .env file with:\n"
                "GEMINI_API_KEYS=key1,key2,key3"
            )

        # Split and clean keys
        self.api_keys = [k.strip() for k in api_keys_raw.split(",") if k.strip()]
        if not self.api_keys:
            raise ValueError("❌ No valid API keys found in GEMINI_API_KEYS.")

        self.current_key_index = 0
        self.GEMINI_API_KEY = self.api_keys[self.current_key_index]

        # Other settings
        self.UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
        self.MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
        self.DEBUG = os.getenv("DEBUG", "false").lower() == "true"

        if self.DEBUG:
            self._debug_print()

    def rotate_key(self):
        """
        Rotates to the next available API key in the list.
        """
        if len(self.api_keys) <= 1:
            print("⚠️ Only one API key configured. Cannot rotate.")
            return self.GEMINI_API_KEY

        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        self.GEMINI_API_KEY = self.api_keys[self.current_key_index]
        print(f"🔄 Switched to next Gemini API Key (index: {self.current_key_index})")
        return self.GEMINI_API_KEY

    def get_current_key(self):
        return self.GEMINI_API_KEY

    def _debug_print(self):
        """Debug output - only shown when DEBUG=true"""
        print("\n" + "="*60)
        print("🔧 SETTINGS INITIALIZATION")
        print("="*60)
        print(f"✅ Loaded {len(self.api_keys)} Gemini API keys")
        print(f"Current Key Index: {self.current_key_index}")
        print(f"Current Key (start): {self.GEMINI_API_KEY[:10]}...")
        print(f"BASE_DIR: {BASE_DIR}")
        print("="*60 + "\n")


# Singleton instance
settings = Settings()
