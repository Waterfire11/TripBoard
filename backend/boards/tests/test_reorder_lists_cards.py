import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_lists_are_sorted_and_reorder_stable(board_factory, make_user):
    owner = make_user("owner@ex.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    # 造 3 个 list
    ids = []
    for i in range(3):
        r = c.post(f"/api/boards/{board.id}/lists/", data={"title": f"L{i+1}"}, format="json")
        assert r.status_code == 201
        ids.append(r.data["id"])

    # GET 默认应按 position、created_at 稳定排序
    r = c.get(f"/api/boards/{board.id}/lists/?ordering=position,created_at")
    assert r.status_code == 200
    got = [x["id"] for x in r.data["results"]]
    assert got == ids

    # 调换 0 和 2
    r = c.post(f"/api/boards/{board.id}/lists/reorder/", data={"ordered_ids": [ids[2], ids[1], ids[0]]}, format="json")
    assert r.status_code == 200

    r = c.get(f"/api/boards/{board.id}/lists/?ordering=position,created_at")
    got = [x["id"] for x in r.data["results"]]
    assert got == [ids[2], ids[1], ids[0]]

@pytest.mark.django_db
def test_move_cards_between_lists(board_factory, make_user):
    owner = make_user("owner@ex.com")
    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    # 两个 list
    l1 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "A"}, format="json").data["id"]
    l2 = c.post(f"/api/boards/{board.id}/lists/", data={"title": "B"}, format="json").data["id"]

    # 在 l1 造两张卡
    k1 = c.post(f"/api/lists/{l1}/cards/", data={"title": "C1"}, format="json").data["id"]
    k2 = c.post(f"/api/lists/{l1}/cards/", data={"title": "C2"}, format="json").data["id"]

    # 把 k1 移到 l2，放到第 0 位
    r = c.post(f"/api/cards/{k1}/reorder/", data={"to_list": l2, "to_position": 0}, format="json")
    assert r.status_code == 200

    # 校验 l2 有 k1 且在首位，l1 只剩 k2
    r = c.get(f"/api/lists/{l2}/cards/?ordering=position")
    assert [x["id"] for x in r.data["results"]] == [k1]
    r = c.get(f"/api/lists/{l1}/cards/?ordering=position")
    assert [x["id"] for x in r.data["results"]] == [k2]
