import pytest
from pytest_django.fixtures import client
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from boards.models import BoardMember

@pytest.fixture
def user(make_user):
    # 让原先用 `user` 的测试也能工作
    return make_user()

User = get_user_model()

def make_user(username: str, email: str, password: str = "x12345678"):
    """
    兼容两种情况：
    - 默认 User（USERNAME_FIELD == "username"）：需要 username，email 可选
    - 自定义以 email 登录（USERNAME_FIELD == "email"）：只需要 email；如果模型里也有 username 字段，就顺便塞一个
    """
    fields = {"password": password}

    has_username = any(f.name == "username" for f in User._meta.get_fields())
    has_email = any(f.name == "email" for f in User._meta.get_fields())

    if getattr(User, "USERNAME_FIELD", "username") == "email":
        # 以 email 登录
        if has_email:
            fields["email"] = email
        if has_username:
            fields["username"] = username
    else:
        # 以 username 登录（Django 默认）
        fields[User.USERNAME_FIELD] = username
        if has_email:
            fields["email"] = email

    return User.objects.create_user(**fields)

@pytest.mark.django_db
def test_collab_can_read_and_edit_cards(board_factory, user):
    client = APIClient()
    owner = make_user("owner", "o@test.com")
    client.force_authenticate(user=owner)
    board = board_factory(owner=owner)

    editor = make_user("editor", "e@test.com")
    viewer = make_user("viewer", "v@test.com")

    # 1) Owner 邀请成员
    BoardMember.objects.update_or_create(
        board=board, user=editor, defaults={"role": "editor"}
    )
    BoardMember.objects.update_or_create(
        board=board, user=viewer, defaults={"role": "viewer"}
    )

    # 2) editor 可以创建卡片
    c2 = APIClient(); c2.force_authenticate(user=editor)
    # 先建一个 list
    r = c2.post(f"/api/boards/{board.id}/lists/", {"title": "L1"}, format="json")
    # 注意：这里如果 List 仍只有 Owner 可写，请改用 Owner 建 list；本例假定 editor 也能写 List
    assert r.status_code in (201, 403)
    if r.status_code == 403:
        # Owner 代建 list
        r = client.post(f"/api/boards/{board.id}/lists/", {"title": "L1"}, format="json")
        assert r.status_code == 201
    list_id = r.data["id"]

    r = c2.post(f"/api/lists/{list_id}/cards/", {"title": "C1"}, format="json")
    assert r.status_code == 201

    # 3) viewer 只能读，不能写
    c3 = APIClient(); c3.force_authenticate(user=viewer)
    r = c3.get(f"/api/lists/{list_id}/cards/")
    assert r.status_code == 200
    r = c3.post(f"/api/lists/{list_id}/cards/", {"title": "nope"}, format="json")
    assert r.status_code in (403, 405)

@pytest.mark.django_db
def test_owner_can_manage_members(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    editor = make_user(username="e", email="e@test.com")
    viewer = make_user(username="v", email="v@test.com")

    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(owner)

    # 邀请 editor
    r = c.post(f"/api/boards/{board.id}/members/", data={"email": editor.email, "role": "editor"}, format="json")
    assert r.status_code == 201
    eid = r.data["id"]

    # 列表里应有 editor
    r = c.get(f"/api/boards/{board.id}/members/")
    assert r.status_code == 200

    # 兼容：如果有分页就是 dict["results"]，否则直接就是 list
    data = r.data
    results = data["results"] if isinstance(data, dict) and "results" in data else data

    # 断言里用 results
    assert any(m.get("email") == editor.email for m in results)

    # 将 editor 改为 viewer
    r = c.patch(f"/api/boards/{board.id}/members/{eid}/", data={"role": "viewer"}, format="json")
    assert r.status_code == 200

    # 删除成员
    r = c.delete(f"/api/boards/{board.id}/members/{eid}/")
    assert r.status_code == 204


@pytest.mark.django_db
def test_non_owner_cannot_manage_members(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    editor = make_user(username="e", email="e@test.com")
    other  = make_user(username="x", email="x@test.com")

    board = board_factory(owner=owner)
    c = APIClient(); c.force_authenticate(editor)

    # 非 owner 创建应被拒
    r = c.post(f"/api/boards/{board.id}/members/", data={"email": other.email, "role": "viewer"}, format="json")
    assert r.status_code in (403, 401)