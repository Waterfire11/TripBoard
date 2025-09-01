from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Board, Card
from users.models import Notification

@receiver(post_save, sender=Board)
def create_board_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.owner,
            title="New board created",
            message=f"Your new board '{instance.title}' has been created."
        )

@receiver(post_save, sender=Board)
def create_default_lists(sender, instance, created, **kwargs):
    if created:
        from .models import List  # Import here to avoid circular
        List.objects.bulk_create([
            List(board=instance, title='To Plan', position=0),
            List(board=instance, title='In Progress', position=1),
            List(board=instance, title='Booked', position=2),
            List(board=instance, title='Completed', position=3),
        ])

@receiver(m2m_changed, sender=Card.assigned_members.through)
def card_assigned_notification(sender, instance, action, pk_set, **kwargs):
    if action == 'post_add':
        for pk in pk_set:
            user = instance.assigned_members.get(pk=pk)
            Notification.objects.create(
                user=user,
                title="Task assigned to you",
                message=f"You have been assigned to the task '{instance.title}' in board '{instance.list.board.title}'."
            )