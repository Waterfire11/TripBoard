from django.apps import AppConfig


class UsersConfig(AppConfig):
    """Configuration for the users app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    verbose_name = 'User Management'
    
    def ready(self):
        """
        Perform initialization tasks when the app is ready.
        This method is called once Django has finished loading all apps.
        """
        # Import signals if you have any
        # from . import signals
        pass