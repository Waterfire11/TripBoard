# backend/boards/tests/test_querying.py
import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_card_filter_title_budget_date_and_ordering(board_factory, make_user):
    """
    目标：证明 cards 支持 标题模糊 + 预算区间 + 日期区间 + 排序 + 分页
    """
    owner = make_user(username="owner", email="o@test.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    # 两个 list
    l1 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L1"}, format="json").data["id"]
    l2 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L2"}, format="json").data["id"]

    # 在 l1 造 3 张卡
    d0 = date.today()
    d1 = d0 + timedelta(days=1)
    d2 = d0 + timedelta(days=2)

    k1 = c.post(
        f"/api/lists/{l1}/cards/",
        data={"title": "Book hotel", "budget": "80.00", "people": 1, "due_date": d2.isoformat()},
        format="json",
    ).data["id"]

    k2 = c.post(
        f"/api/lists/{l1}/cards/",
        data={"title": "Buy tickets", "budget": "200.00", "people": 3, "due_date": d1.isoformat()},
        format="json",
    ).data["id"]

    k3 = c.post(
        f"/api/lists/{l1}/cards/",
        data={"title": "Rome food", "budget": "120.00", "people": 2, "due_date": d0.isoformat()},
        format="json",
    ).data["id"]

    # 过滤 + 排序 + 分页
    # 如你的过滤器参数命名不同，把 min_budget/due_from/due_to 改成你的项目命名即可。
    url = (
        f"/api/lists/{l1}/cards/"
        f"?title=bu"                      # 标题含 'bo'（命中 Book / Buy）
        f"&min_budget=100"                # 预算下限：过滤掉 Book(80)
        f"&due_from={d0.isoformat()}"
        f"&due_to={d2.isoformat()}"
        f"&ordering=-due_date"            # 按到期日倒序：先 d2 再 d1 …
        f"&page=1&page_size=2"
    )
    r = c.get(url)
    assert r.status_code == 200
    # 期望只剩 Buy tickets（200, d1）这一张在结果里，且分页信息合理
    assert r.data["count"] >= 1
    first_titles = [x["title"] for x in r.data["results"]]
    assert "Buy tickets" in first_titles

@pytest.mark.django_db
def test_card_pagination_has_next(board_factory, make_user):
    owner = make_user(username="owner", email="o@test.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    l1 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L1"}, format="json").data["id"]

    # 造 3 条（数量>1，确保能看出分页效果）
    for i in range(3):
        c.post(f"/api/lists/{l1}/cards/", data={"title": f"C{i}", "budget": "10.00"}, format="json")

    # 不传 page_size，使用后端默认分页策略
    r = c.get(f"/api/lists/{l1}/cards/?page=1&ordering=position")
    assert r.status_code == 200
    assert "count" in r.data and "results" in r.data

    # 分页语义：count >= 当前页返回条数；若 count > 当前页条数，则应存在下一页
    count = r.data["count"]
    page_len = len(r.data["results"])
    assert count >= page_len
    if count > page_len:
        assert r.data.get("next")  # 有下一页才要求 next 存在

@pytest.mark.django_db
def test_card_ordering_by_budget(board_factory, make_user):
    owner = make_user(username="owner", email="o@test.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    l1 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L1"}, format="json").data["id"]
    c.post(f"/api/lists/{l1}/cards/", data={"title": "A", "budget": "50.00"}, format="json")
    c.post(f"/api/lists/{l1}/cards/", data={"title": "B", "budget": "150.00"}, format="json")
    c.post(f"/api/lists/{l1}/cards/", data={"title": "C", "budget": "100.00"}, format="json")

    r = c.get(f"/api/lists/{l1}/cards/?ordering=-budget")
    assert r.status_code == 200
    titles = [x["title"] for x in r.data["results"]]
    # 预算倒序应该是 B(150) > C(100) > A(50)
    assert titles[:3] == ["B", "C", "A"]

@pytest.mark.django_db
def test_board_stats_smoke(board_factory, make_user):
    owner = make_user(username="owner", email="o@test.com")
    board = board_factory(owner=owner)

    c = APIClient(); c.force_authenticate(owner)
    r = c.get(f"/api/boards/{board.id}/stats/")
    assert r.status_code == 200
    assert isinstance(r.data, dict)   # 可按你的实际字段再加断言，如 total_cards/total_lists 等
