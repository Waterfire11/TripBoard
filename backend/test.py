import requests

BASE_URL = "http://localhost:8000/api"
USERNAME = "alice"
PASSWORD = "secret123"



def login():
    url = f"{BASE_URL}/auth/token/"
    payload = {"username": USERNAME, "password": PASSWORD}
    response = requests.post(url, json=payload)
    assert response.status_code == 200, "Login must be successful"
    tokens = response.json()
    print("✅ Login success")
    return tokens["access"], tokens["refresh"]



def refresh_token(refresh):
    url = f"{BASE_URL}/auth/token/refresh/"
    payload = {"refresh": refresh}
    response = requests.post(url, json=payload)
    assert response.status_code == 200, "Refresh should return 200"
    print("🔁 Token refreshed")
    return response.json()["access"]



def list_boards(access_token):
    url = f"{BASE_URL}/boards/"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    assert response.status_code == 200, "List boards must return 200"
    boards = response.json()
    print("📋 Boards retrieved:", boards)
    return boards[0]["id"] if boards else None



def create_board(access_token, title="My Travel Kanban"):
    url = f"{BASE_URL}/boards/"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"title": title}
    response = requests.post(url, json=payload, headers=headers)
    assert response.status_code == 201, "Creating board should return 201"
    board = response.json()
    print("🆕 Board created:", board)
    return board["id"]



def create_card(access_token, board_id, title="Book a ticket", position=0):
    url = f"{BASE_URL}/cards/"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {
        "board": board_id,
        "title": title,
        "position": position
    }
    response = requests.post(url, json=payload, headers=headers)
    assert response.status_code == 201, "Creating card should return 201"
    card = response.json()
    print("📌 Card created:", card)
    return card["id"]



if __name__ == "__main__":
    access_token, refresh_token_str = login()
    access_token = refresh_token(refresh_token_str)

    board_id = list_boards(access_token)
    if board_id is None:
        board_id = create_board(access_token)

    card_id = create_card(access_token, board_id)
    print("🎉 All steps completed successfully")