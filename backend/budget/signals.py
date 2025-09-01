from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Expense
from users.models import Notification

@receiver(post_save, sender=Expense)
def create_expense_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.created_by,
            title="Budget updated",
            message=f"New expense '{instance.title}' of {instance.amount} {instance.currency} added to board '{instance.board.title}'."
        )
