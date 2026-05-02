"""Test script for session management endpoints."""
import requests

BASE_URL = "http://127.0.0.1:8000"

# Step 1: Login as existing user
print("1. Logging in as user@example.com...")
login_response = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={
        "username": "user@example.com",
        "password": "string"
    }
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"✓ Login successful! Token: {token[:20]}...")
    headers = {"Authorization": f"Bearer {token}"}
else:
    print(f"✗ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

# Step 2: Create a session
print("\n2. Creating a session...")
create_response = requests.post(
    f"{BASE_URL}/api/sessions",
    json={"name": "Test Session"},
    headers=headers
)

if create_response.status_code == 201:
    session = create_response.json()
    print(f"✓ Session created successfully!")
    print(f"  - ID: {session['id']}")
    print(f"  - Name: {session['name']}")
    print(f"  - Join Code: {session['join_code']}")
    print(f"  - Owner: {session['owner']['name']} ({session['owner']['email']})")
    print(f"  - Members: {len(session['members'])}")
    join_code = session['join_code']
    session_id = session['id']
else:
    print(f"✗ Session creation failed: {create_response.status_code}")
    print(create_response.text)
    exit(1)

# Step 3: List sessions
print("\n3. Listing sessions...")
list_response = requests.get(
    f"{BASE_URL}/api/sessions",
    headers=headers
)

if list_response.status_code == 200:
    sessions = list_response.json()
    print(f"✓ Found {len(sessions)} session(s)")
    for s in sessions:
        print(f"  - {s['name']} (Code: {s['join_code']}, Members: {s['member_count']})")
else:
    print(f"✗ List sessions failed: {list_response.status_code}")

# Step 4: Get session details
print("\n4. Getting session details...")
get_response = requests.get(
    f"{BASE_URL}/api/sessions/{session_id}",
    headers=headers
)

if get_response.status_code == 200:
    session_details = get_response.json()
    print(f"✓ Session details retrieved")
    print(f"  - Name: {session_details['name']}")
    print(f"  - Members: {len(session_details['members'])}")
else:
    print(f"✗ Get session failed: {get_response.status_code}")

# Step 5: Register a second user
print("\n5. Registering second user...")
register_response = requests.post(
    f"{BASE_URL}/api/auth/register",
    json={
        "email": "bob@example.com",
        "name": "Bob",
        "password": "password123"
    }
)

if register_response.status_code == 201:
    print(f"✓ User registered: {register_response.json()['name']}")
else:
    print(f"Note: User might already exist ({register_response.status_code})")

# Step 6: Login as second user
print("\n6. Logging in as bob@example.com...")
bob_login = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={
        "username": "bob@example.com",
        "password": "password123"
    }
)

if bob_login.status_code == 200:
    bob_token = bob_login.json()["access_token"]
    print(f"✓ Bob logged in successfully!")
    bob_headers = {"Authorization": f"Bearer {bob_token}"}
else:
    print(f"✗ Bob login failed: {bob_login.status_code}")
    exit(1)

# Step 7: Join session as Bob
print(f"\n7. Bob joining session with code {join_code}...")
join_response = requests.post(
    f"{BASE_URL}/api/sessions/join",
    json={"join_code": join_code},
    headers=bob_headers
)

if join_response.status_code == 200:
    joined_session = join_response.json()
    print(f"✓ Bob joined session successfully!")
    print(f"  - Session: {joined_session['name']}")
    print(f"  - Members: {len(joined_session['members'])}")
else:
    print(f"✗ Join session failed: {join_response.status_code}")
    print(join_response.text)

# Step 8: List Bob's sessions
print("\n8. Listing Bob's sessions...")
bob_list = requests.get(
    f"{BASE_URL}/api/sessions",
    headers=bob_headers
)

if bob_list.status_code == 200:
    bob_sessions = bob_list.json()
    print(f"✓ Bob has {len(bob_sessions)} session(s)")
else:
    print(f"✗ List failed: {bob_list.status_code}")

# Step 9: Bob leaves session
print("\n9. Bob leaving session...")
leave_response = requests.delete(
    f"{BASE_URL}/api/sessions/{session_id}/leave",
    headers=bob_headers
)

if leave_response.status_code == 200:
    print(f"✓ Bob left session successfully!")
else:
    print(f"✗ Leave failed: {leave_response.status_code}")

# Step 10: Delete session (as owner)
print("\n10. Deleting session as owner...")
delete_response = requests.delete(
    f"{BASE_URL}/api/sessions/{session_id}",
    headers=headers
)

if delete_response.status_code == 204:
    print(f"✓ Session deleted successfully!")
else:
    print(f"✗ Delete failed: {delete_response.status_code}")

print("\n✅ All tests completed!")
