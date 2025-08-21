from django.test import TestCase

# Create your tests here.
# tests/test_share_smoke.py
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_share_smoke(user, board_factory):
    client = APIClient()
    client.force_authenticate(user=user)
    board = board_factory(owner=user)

    # 1. enable
    resp = client.post(f"/api/boards/{board.id}/share/enable/")
    assert resp.status_code in (200, 201)
    token = resp.data.get("share_token")
    assert token

    # 2. anonymous GET can read
    anon = APIClient()
    r = anon.get(f"/api/boards/shared/{token}/")
    assert r.status_code == 200

    # 3. anonymous cannot write
    r = anon.post(f"/api/boards/{board.id}/lists/", {"title": "x"}, format="json")
    assert r.status_code in (401, 403)

    # 4. disable
    r = client.post(f"/api/boards/{board.id}/share/disable/")
    assert r.status_code in (200, 204)

    # 5. old link invalid
    r = anon.get(f"/api/boards/shared/{token}/")
    assert r.status_code in (403, 404)

import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from boards.models import Board, List, Card

User = get_user_model()


@pytest.mark.django_db
def test_share_enable_disable_rotate_and_shared_readonly():
    """共享开/关/轮换 + 匿名只读访问 + 旧链接失效"""
    # 登录用户 & 资源
    user = User.objects.create_user(username="tester", password="x")
    board = Board.objects.create(owner=user, title="Readonly project")
    todo = List.objects.create(board=board, title="Readonly todo", position=1)
    Card.objects.create(list=todo, title="Book flights", position=1, budget=Decimal("100.00"), people=2)

    client = APIClient()
    client.force_authenticate(user=user)

    # 1) enable（首次201/后续200）
    r1 = client.post(f"/api/boards/{board.id}/share/enable/")
    assert r1.status_code in (200, 201)
    token = r1.data["share_token"]

    r1b = client.post(f"/api/boards/{board.id}/share/enable/")
    assert r1b.status_code == 200
    assert r1b.data["share_token"] == token  # 幂等不改token

    # 匿名可读共享页
    anon = APIClient()
    r_shared = anon.get(f"/api/boards/shared/{token}/")
    assert r_shared.status_code == 200
    # 返回内容结构不严格限定，只要可读即可
    assert isinstance(r_shared.data, dict) and r_shared.data

    # 2) rotate（开启状态可换token；旧token失效）
    rr = client.post(f"/api/boards/{board.id}/share/rotate/")
    assert rr.status_code == 200
    new_token = rr.data["share_token"]
    assert new_token and new_token != token

    old_read = anon.get(f"/api/boards/shared/{token}/")
    assert old_read.status_code in (403, 404)

    # 3) disable（关闭后，新token也应失效）
    rd = client.post(f"/api/boards/{board.id}/share/disable/")
    assert rd.status_code == 200

    after_disable = anon.get(f"/api/boards/shared/{new_token}/")
    assert after_disable.status_code in (403, 404)


@pytest.mark.django_db
def test_stats_and_budget_endpoints():
    """统计与预算：未登录401，登录200 + 结果非空"""
    user = User.objects.create_user(username="owner", password="x")
    board = Board.objects.create(owner=user, title="Stats project")
    l1 = List.objects.create(board=board, title="L1", position=1)
    l2 = List.objects.create(board=board, title="L2", position=2)

    Card.objects.create(list=l1, title="A", position=1, budget=Decimal("80.00"), people=1)
    Card.objects.create(list=l1, title="B", position=2, budget=Decimal("20.00"), people=1)
    Card.objects.create(list=l2, title="C", position=1, budget=Decimal("50.00"), people=2)

    anon = APIClient()
    assert anon.get(f"/api/boards/{board.id}/stats/").status_code == 401

    authed = APIClient()
    authed.force_authenticate(user=user)

    # stats
    rs = authed.get(f"/api/boards/{board.id}/stats/")
    assert rs.status_code == 200
    assert isinstance(rs.data, dict) and rs.data  # 非空即可；如需更严可断言具体key

    # budget
    rb = authed.get(f"/api/boards/{board.id}/budget/")
    assert rb.status_code == 200
    assert "board_total" in rb.data
    # 80 + 20 + 50 = 150
    assert Decimal(str(rb.data["board_total"])) == Decimal("150.00")
