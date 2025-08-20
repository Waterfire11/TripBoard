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
