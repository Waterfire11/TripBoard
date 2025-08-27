import datetime as dt
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_card_filter_and_search(board_factory, make_user):
    owner = make_user(username="o", email="o@test.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    # 新建一个 list
    r = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L1"}, format="json")
    assert r.status_code == 201
    list_id = r.data["id"]

    # 新建三张卡
    cards = [
        {"title": "Book flights", "budget": "1000.00", "people": 2, "due_date": None},
        {"title": "Buy books",    "budget": "200.00",  "people": 1, "due_date": "2025-12-31"},
        {"title": "hotel",        "budget": "500.00",  "people": 3, "due_date": "2025-06-01"},
    ]
    for i, data in enumerate(cards):
        data["position"] = i + 1
        r = c.post(f"/api/lists/{list_id}/cards/", data=data, format="json")
        assert r.status_code == 201

    # 1) search=book 应命中 title 包含 "book" 的两张
    r = c.get(f"/api/lists/{list_id}/cards/?search=book")
    assert r.status_code == 200
    assert len(r.data["results"]) == 2

    # 2) budget 过滤  >= 300
    r = c.get(f"/api/lists/{list_id}/cards/?budget__gte=300")
    assert r.status_code == 200
    budgets = [x["budget"] for x in r.data["results"]]
    assert all(float(b) >= 300 for b in budgets)

    # 3) 到期时间 <= 2025-08-01
    r = c.get(f"/api/lists/{list_id}/cards/?due_date__lte=2025-08-01")
    assert r.status_code == 200
    titles = [x["title"] for x in r.data["results"]]
    assert set(titles) == {"hotel"}  # 只有 2025-06-01
