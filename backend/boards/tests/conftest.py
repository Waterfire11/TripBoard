import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "travelboard.settings")  # ← 与 manage.py 保持一致

import django
django.setup()
import pytest
from django.contrib.auth import get_user_model
from boards.models import Board

@pytest.fixture
def make_user(db):
    """既可作为 fixture 形参注入，也可被 import 当函数调用."""
    def _make_user(username="u", email=None, password="pass"):
        if not email:
            email = f"{username}@example.com"
        return get_user_model().objects.create_user(
            username=username, email=email, password=password
        )
    return _make_user

@pytest.fixture
def board_factory(db, make_user):
    """owner 可传用户或用户名；默认会创建一个 owner。"""
    def _factory(owner=None, title="Readonly project"):
        if owner is None:
            owner = make_user("owner")
        elif isinstance(owner, str):
            owner = make_user(owner)
        return Board.objects.create(owner=owner, title=title)
    return _factory