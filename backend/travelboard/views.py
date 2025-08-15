from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.shortcuts import render,redirect
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.contrib.sessions.models import Session
from django.utils import timezone

def signup(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/')
    else:
        form = UserCreationForm()
    return render(request, 'registration/signup.html', {'form': form})

def home(request):
    return render(request, 'index.html')

@login_required
def me(request):
    return render(request, 'account/me.html')

def sessions(request):
    user_id = str(request.user.id)

    qs = Session.objects.filter(expire_date__gt=timezone.now())
    my_sessions = []
    for s in qs:
        data = s.get_decoded()
        if data.get('_auth_user_id') == user_id:
            my_sessions.append({
                'key': s.session_key,
                'is_current': (s.session_key == request.session.session_key),
                'expires': s.expire_date,
            })

    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'kill_others':
            for s in qs:
                data = s.get_decoded()
                if data.get('_auth_user_id') == user_id and s.session_key != request.session.session_key:
                    s.delete()
            return redirect('sessions')

        if action == 'kill_one':
            key = request.POST.get('key')
            if key and key != request.session.session_key:
                Session.objects.filter(session_key=key).delete()
            return redirect('sessions')

        if action == 'kill_all':
            for s in qs:
                data = s.get_decoded()
                if data.get('_auth_user_id') == user_id:
                    s.delete()
            request.session.flush()
            return redirect('login')

    return render(request, 'account/sessions.html', {'sessions': my_sessions})