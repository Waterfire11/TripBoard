import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_invite_email_trims_and_case_insensitive(board_factory, make_user):
    owner  = make_user(username="o", email="o@test.com")
    editor = make_user(username="Ed", email="Editor@Test.com")  # 混合大小写
    board  = board_factory(owner=owner)

    c = APIClient(); c.force_authenticate(owner)

    # 前后空格 + 大小写差异 → 也应成功
    r = c.post(
        f"/api/boards/{board.id}/members/",
        data={"email": "  editor@test.com  ", "role": "editor"},
        format="json",
    )
    assert r.status_code in (200, 201)
    assert r.data.get("email") == editor.email  # 返回的 email 为真实用户邮箱
