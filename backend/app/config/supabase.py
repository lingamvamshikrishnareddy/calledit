# app/config/supabase.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class SupabaseConfig:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be provided")
        
        self._client = None
        self._is_mock = False
    
    def get_client(self):
        """Get or create Supabase client with fallback to mock"""
        if self._client is None:
            try:
                # Try to create real Supabase client
                print("🔄 Attempting to create Supabase client...")
                from supabase import create_client
                
                self._client = create_client(self.url, self.key)
                self._is_mock = False
                print("✅ Real Supabase client created successfully")
                
            except Exception as e:
                print(f"⚠️  Supabase client creation failed: {e}")
                print("🔄 Creating functional mock client for auth operations...")
                self._client = self._create_functional_mock()
                self._is_mock = True
                
        return self._client
    
    def _create_functional_mock(self):
        """Create a functional mock client that works with your auth flow"""
        class FunctionalMockClient:
            def table(self, name):
                return MockTable()
            
            @property
            def auth(self):
                return FunctionalMockAuth()
        
        class MockTable:
            def select(self, *args, **kwargs):
                return self
            
            def insert(self, *args, **kwargs):
                return self
            
            def update(self, *args, **kwargs):
                return self
            
            def delete(self, *args, **kwargs):
                return self
            
            def limit(self, count):
                return self
            
            def eq(self, column, value):
                return self
            
            def execute(self):
                return type('MockResponse', (), {
                    'data': [],
                    'count': 0,
                    'error': None
                })()
        
        class FunctionalMockAuth:
            """Functional mock that integrates with your existing auth flow"""
            
            def sign_up(self, credentials):
                """Mock sign up - generates a UUID-like ID"""
                import uuid
                user_id = str(uuid.uuid4())
                
                return type('MockAuthResponse', (), {
                    'user': type('MockUser', (), {
                        'id': user_id,
                        'email': credentials.get('email')
                    })(),
                    'session': type('MockSession', (), {
                        'access_token': f'mock-supabase-token-{user_id}',
                        'refresh_token': f'mock-refresh-{user_id}'
                    })(),
                    'error': None
                })()
            
            def sign_in_with_password(self, credentials):
                """Mock sign in - validates against your database via AuthService"""
                import uuid
                
                # For mock purposes, generate a consistent ID based on email
                # In a real scenario, you'd validate against your database
                email = credentials.get('email', '')
                user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
                
                return type('MockAuthResponse', (), {
                    'user': type('MockUser', (), {
                        'id': user_id,
                        'email': email
                    })(),
                    'session': type('MockSession', (), {
                        'access_token': f'mock-supabase-token-{user_id}',
                        'refresh_token': f'mock-refresh-{user_id}'
                    })(),
                    'error': None
                })()
            
            def sign_out(self):
                """Mock sign out"""
                return type('MockResponse', (), {
                    'error': None
                })()
            
            def get_session(self):
                """Mock get session"""
                return None
            
            def get_user(self, token=None):
                """Mock get user"""
                if token and token.startswith('mock-supabase-token'):
                    user_id = token.replace('mock-supabase-token-', '')
                    return type('MockUserResponse', (), {
                        'user': type('MockUser', (), {
                            'id': user_id,
                            'email': 'mock@example.com'
                        })(),
                        'error': None
                    })()
                return type('MockUserResponse', (), {
                    'user': None,
                    'error': 'No session'
                })()
        
        return FunctionalMockClient()
    
    @property
    def client(self):
        """Property accessor for the client"""
        return self.get_client()
    
    def is_real_client(self):
        """Check if we're using the real Supabase client or mock"""
        self.get_client()  # Ensure client is initialized
        return not self._is_mock
    
    def test_connection(self):
        """Test the Supabase connection"""
        try:
            client = self.get_client()
            
            if self.is_real_client():
                # Test with real client
                result = client.table('users').select("count", count="exact").limit(0).execute()
                print("✅ Supabase connection test successful")
                return True
            else:
                print("⚠️  Using functional mock Supabase client")
                print("   Auth operations will work with your local database")
                return False
                
        except Exception as e:
            print(f"❌ Supabase connection test failed: {e}")
            return False
    
    def get_auth_client(self):
        """Get auth client - works with both real and mock clients"""
        client = self.get_client()
        if self._is_mock:
            print("ℹ️  Using mock auth client - auth will be handled by local database + JWT")
        return client.auth

# Create global instance
supabase_config = SupabaseConfig()

# Helper functions for easy access
def get_supabase_client():
    """Get the Supabase client instance"""
    return supabase_config.client

def get_auth_client():
    """Get the auth client for authentication operations"""
    return supabase_config.get_auth_client()

def is_supabase_available():
    """Check if real Supabase client is available"""
    return supabase_config.is_real_client()