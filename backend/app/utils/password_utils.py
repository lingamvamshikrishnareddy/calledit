# app/utils/password_utils.py - Fixed Password hashing utilities
import hashlib
import secrets
from passlib.context import CryptContext
import warnings

# Suppress bcrypt version warnings
warnings.filterwarnings("ignore", category=UserWarning, module="passlib")

# Use bcrypt for password hashing with fallback configuration
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    print(f"⚠️ Bcrypt configuration warning: {e}")
    # Fallback to a simpler configuration
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class PasswordUtils:
    def __init__(self):
        self.pwd_context = pwd_context

    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt or fallback"""
        try:
            return self.pwd_context.hash(password)
        except Exception as e:
            print(f"❌ Password hashing error: {e}")
            # Emergency fallback using PBKDF2
            salt = secrets.token_hex(16)
            return f"pbkdf2:{salt}:{hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()}"

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            # Check if it's our emergency fallback format
            if hashed_password.startswith('pbkdf2:'):
                parts = hashed_password.split(':')
                if len(parts) == 3:
                    salt = parts[1]
                    stored_hash = parts[2]
                    computed_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt.encode(), 100000).hex()
                    return stored_hash == computed_hash
            
            # Use passlib for normal verification
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            print(f"❌ Password verification error: {e}")
            return False

    def generate_salt(self) -> str:
        """Generate a random salt"""
        return secrets.token_hex(16)

    def hash_password_with_salt(self, password: str, salt: str) -> str:
        """Hash password with custom salt (alternative method)"""
        return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()

    def verify_password_with_salt(self, password: str, salt: str, hashed_password: str) -> bool:
        """Verify password with custom salt"""
        computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        return computed_hash == hashed_password