from django.apps import AppConfig

class BudgetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'budget'

    def ready(self):
        import budget.signals  # noqa: F401 - Import to connect signals
