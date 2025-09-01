from django.apps import AppConfig

<<<<<<< HEAD

class BoardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'boards'
=======
class BoardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'boards'

    def ready(self):
        import boards.signals  # noqa: F401 - Import to connect signals
>>>>>>> gitlab/tripboard-import
