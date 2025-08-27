import pytest
from rest_framework.test import APIClient
from boards.models import BoardMember

@pytest.mark.django_db
def test_owner_cannot_be_demoted_or_deleted(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    board  = board_factory(owner=owner)
    c = APIClient()
    c.force_authenticate(owner)

    # 为了测试删除/降级 owner，先人为创建一条“owner 的成员记录”
    owner_member = BoardMember.objects.create(board=board, user=owner, role="owner")

    # 1) 禁止降级 owner
    r = c.patch(f"/api/boards/{board.id}/members/{owner_member.id}/",
                data={"role": "viewer"}, format="json")
    assert r.status_code == 400

    # 2) 禁止删除 owner
    r = c.delete(f"/api/boards/{board.id}/members/{owner_member.id}/")
    assert r.status_code == 400


@pytest.mark.django_db
def test_cannot_promote_non_owner_to_owner(board_factory, make_user):
    owner   = make_user(username="o", email="o@test.com")
    editor  = make_user(username="e", email="e@test.com")
    other   = make_user(username="x", email="x@test.com")
    board   = board_factory(owner=owner)
    c = APIClient()
    c.force_authenticate(owner)

    # 先邀请一个 editor
    r = c.post(f"/api/boards/{board.id}/members/",
               data={"email": editor.email, "role": "editor"}, format="json")
    assert r.status_code == 201
    mid = r.data["id"]

    # 3) 禁止把非 owner 提升为 owner（PATCH）
    r = c.patch(f"/api/boards/{board.id}/members/{mid}/",
                data={"role": "owner"}, format="json")
    assert r.status_code == 400

    # 4) 禁止直接以 owner 角色邀请非 owner（POST）
    r = c.post(f"/api/boards/{board.id}/members/",
               data={"email": other.email, "role": "owner"}, format="json")
    assert r.status_code == 400
