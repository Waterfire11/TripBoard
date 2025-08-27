import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_members_list_is_paginated_for_collaborator(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    viewer = make_user(username="v", email="v@test.com")
    board  = board_factory(owner=owner)

    # 让 viewer 成为协作者
    from boards.models import BoardMember
    BoardMember.objects.create(board=board, user=viewer, role="viewer")

    c = APIClient(); c.force_authenticate(viewer)

    r = c.get(f"/api/boards/{board.id}/members/")
    assert r.status_code == 200

    # 统一按 results 取数据（我们在视图保证有这个结构）
    assert isinstance(r.data, dict)
    assert "results" in r.data
    assert isinstance(r.data["results"], list)


@pytest.mark.django_db
def test_invite_member_is_idempotent_with_status(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    editor = make_user(username="e", email="e@test.com")
    board  = board_factory(owner=owner)

    c = APIClient(); c.force_authenticate(owner)

    # 第一次邀请：201
    r1 = c.post(f"/api/boards/{board.id}/members/",
                data={"email": editor.email, "role": "editor"}, format="json")
    assert r1.status_code == 201

    # 第二次同一人同一角色：200（幂等）
    r2 = c.post(f"/api/boards/{board.id}/members/",
                data={"email": editor.email, "role": "editor"}, format="json")
    assert r2.status_code == 200
