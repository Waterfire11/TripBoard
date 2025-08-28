from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

class User(AbstractUser):
    """
    Custom User model that uses email as the primary identifier.
    Extends Django's AbstractUser to maintain compatibility while
    customizing authentication and adding additional fields.
    """

    # Make email unique and required
    email = models.EmailField(
        unique=True,
        blank=False,
        null=False,
        help_text="Required. Enter a valid email address."
    )

    # Keep the existing name fields from AbstractUser
    # first_name and last_name are inherited from AbstractUser

    # Add timestamp for user creation
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the user account was created"
    )

    # Use email as the username field for authentication
    USERNAME_FIELD = 'email'

    # Fields required when creating a user (in addition to USERNAME_FIELD)
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        """Return string representation of the user."""
        return self.email

    def get_full_name(self):
        """Return the full name of the user."""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username

    def clean(self):
        """Custom validation for the User model."""
        super().clean()

        # Ensure email is lowercase for consistency
        if self.email:
            self.email = self.email.lower()

        # Validate that required fields are present
        if not self.email:
            raise ValidationError({'email': 'Email is required.'})

        if not self.username:
            raise ValidationError({'username': 'Username is required.'})

    def save(self, *args, **kwargs):
        """Override save to ensure clean() is called."""
        self.full_clean()
        super().save(*args, **kwargs)

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} for {self.user.email}"
