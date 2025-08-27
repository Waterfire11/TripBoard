# backend/boards/tests/test_collab_permissions.py
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_viewer_cannot_create_list_or_card(board_factory, make_user):
    owner = make_user("o@x.com")
    board = board_factory(owner=owner)
    viewer = make_user("v@x.com")

    c = APIClient(); c.force_authenticate(owner)
    # 邀请 viewer
    r = c.post(f"/api/boards/{board.id}/members/",
               data={"email": viewer.email, "role": "viewer"},
               format="json")
    assert r.status_code == 201, r.data

    # viewer 登录
    v = APIClient(); v.force_authenticate(viewer)

    # 1) viewer 不能创建 list
    r = v.post(f"/api/boards/{board.id}/lists/", data={"title": "L"}, format="json")
    assert r.status_code in (403, 401)

    # 2) 造一个 list，再验证 viewer 不能创建 card
    l = c.post(f"/api/boards/{board.id}/lists/", data={"title": "L1"}, format="json").data["id"]
    r = v.post(f"/api/lists/{l}/cards/", data={"title": "C"}, format="json")
    assert r.status_code in (403, 401)

    # 3) viewer 仍然可以 GET
    r = v.get(f"/api/boards/{board.id}/lists/")
    assert r.status_code == 200
