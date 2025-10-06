import requests
import json

# Base URL
BASE_URL = "http://localhost:8000"

def test_registration():
    """Test student registration"""
    response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": "test@student.edu",
        "password": "testpassword123",
        "full_name": "Test Student",
        "student_id": "S12345"
    })
    print("Registration Response:", response.json())
    return response.json()

def test_login():
    """Test student login"""
    response = requests.post(f"{BASE_URL}/auth/login", data={
        "email": "test@student.edu",
        "password": "testpassword123"
    })
    print("Login Response:", response.json())
    return response.json()

def test_source_search():
    """Test source search"""
    response = requests.get(f"{BASE_URL}/sources?query=machine learning")
    print("Source Search Response:", response.json())
    return response.json()

if __name__ == "__main__":
    # Test the API
    test_registration()
    token_data = test_login()
    test_source_search()