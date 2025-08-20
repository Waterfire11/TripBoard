import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "travelboard.settings")  # ← 与 manage.py 保持一致

import django
django.setup()
import pytest
from django.contrib.auth import get_user_model
from boards.models import Board

@pytest.fixture
def user(db):
    User = get_user_model()
    return User.objects.create_user(username="tester", password="pass123")

@pytest.fixture
def board_factory(db, user):
    def _create(**kwargs):
        return Board.objects.create(
            owner=user,
            title=kwargs.get("title", "Readonly project"),
            # 其它必填字段按你的模型来（如果有）
        )
    return _create
