import json
import string
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.utils.encoding import force_unicode
from django.utils import translation
from django.utils.translation import ugettext_lazy as _lazy
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.conf import settings
from django.contrib.sites.models import Site
from django.template.loader import get_template
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.core.context_processors import csrf
from ffdemo.utils.render import render_response
from ffdemo.markup.models import Mark
from ffdemo.markup.forms import MarkForm
from django.shortcuts import get_object_or_404
from ffdemo.markup import common


def home(request):
	mr = settings.MEDIA_ROOT
	return render_response(request, 'home.html', {'mr':mr})

def about(request):
    return render_response(request, 'about.html')

def about_gml(request):
    return render_response(request, 'gml.html')

def credits(request):
    return render_response(request, 'credits.html')

def code(request):
    return render_response(request, 'code.html')
def mozilla(request):
    return render_response(request, 'mozilla.html')

def evan(request):
    return render_response(request, 'evan-roth.html')

def gml(request):
    mark = Mark.objects.all()[10]
    obj_decoded = simplejson.loads(common.decode_points_obj(mark.points_obj_simplified))
    context = { 'mark': mark, 'obj_decoded': obj_decoded }
    return render_response(request, 'gml.xml', context, mimetype='application/xml')

def manifesto(request):
    return render_response(request, 'manifesto.html')

def mark(request, mark_reference):
	mark = get_object_or_404(Mark, reference=mark_reference)
	return render_response(request, 'mark.html', {'mark': mark})

def makemark(request):
	if request.method == "POST":
		mark_form = MarkForm(request.POST)
		if mark_form.is_valid():
			mark_data = { 'points_obj': mark_form.cleaned_data['points_obj'], 'country_code': mark_form.cleaned_data['country_code'] }
			common.save_new_mark_with_data(mark_data)
	else:
		mark_form = MarkForm()
	return render_response(request, 'makemark.html', {'form': mark_form})

def community(request):
	if 'offset' in request.GET:
		offset = int(request.GET['offset'])
		per_page = int(request.GET['per_page'])
		top_limit = offset + per_page;
		all_marks = Mark.objects.exclude(flaggings__gte=1)[offset:top_limit]
	else:
		all_marks = Mark.objects.exclude(flaggings__gte=1)
	return render_response(request, 'community.html', {'all_marks': all_marks})

def newsletter(request):
	return render_response(request, 'newsletter.html', {})

def home_sammy(request):
        mr = settings.MEDIA_ROOT
        return render_response(request,'sammy/home.html',{'mr':mr})

def linear_sammy(request):
        return render_response(request, 'sammy/linear.html')

def mark_sammy(request):
        mark = get_object_or_404(Mark, reference=mark_reference)
        return render_response(request, 'sammy/mark.html', {'mark':mark})

def makemark_sammy(request):
	mark_form = MarkForm()
        return render_response(request, 'sammy/makemark.html', {'form': mark_form})


### MODERATION VIEWS
def account_locked(request):
        return render_response(request, 'registration/locked.html')




def moderate_sammy(request):
        if not request.user.is_authenticated():
                return HttpResponseRedirect('/accounts/login/')
        else:
		return render_response(request, 'sammy/moderate.html')
