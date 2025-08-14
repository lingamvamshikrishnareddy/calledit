# app/utils/password_utils.py - Password Utilities
import bcrypt

class PasswordUtils:
    def __init__(self):
        self.rounds = 12  # bcrypt rounds for hashing
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        # Convert string to bytes
        password_bytes = password.encode('utf-8')
        
        # Generate salt and hash password
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        # Return as string
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            # Convert strings to bytes
            password_bytes = password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            
            # Verify password
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception as e:
            print(f"Password verification error: {e}")
            return False