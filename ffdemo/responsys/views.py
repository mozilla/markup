import datetime

try:
    from django.conf import settings
except ImportError:
    settings = {}

from django.http import HttpResponseRedirect
from django.shortcuts import redirect

from django.utils import translation

from ffdemo.utils.render import render_response

from  . import forms

try:
    if not settings.RESPONSYS or \
       not settings.RESPONSYS_CAMPAIGN:
        raise Exception("Please configure Responsys in settings.py")
except AttributeError:
    raise Exception("Please configure Responsys in settings.py")

from . import responsys

def subscribe(request):
    """ Subscribe a new email address to our contact list """
    form = forms.EmailSubscribeForm(request.POST or None)
    if request.method == 'POST':
        if form.is_valid():
            data = form.cleaned_data
            responsys.subscribe(settings.RESPONSYS_CAMPAIGN, 
                                data['email'],
                                'text',
                                responsys.make_source_url(request),
                                translation.get_language(),
                                data['country'])

            return HttpResponseRedirect('/')
     # Not a POST or an Error 
    return render_response(request, 'newsletter.html', {
            'locale': translation.get_language(), 
            'form': form,
            })
