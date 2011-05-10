import json
import string
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.utils.encoding import force_unicode
from django.utils.translation import ugettext_lazy as _lazy
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.conf import settings
from django.contrib.sites.models import Site
from django.template.loader import get_template
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.cache import cache_page
from django.core.context_processors import csrf
from ffdemo.utils.render import render_response
from ffdemo.markup.models import Mark, Invitation
from ffdemo.markup.forms import MarkForm
from ffdemo.responsys.forms import EmailSubscribeForm
from django.shortcuts import get_object_or_404
from ffdemo.markup import common
import datetime
import time


@cache_page(15)  # cache for 15 seconds
def home(request):
    mr = settings.MEDIA_ROOT
    return render_response(request, 'home.html', {'mr': mr})


@cache_page(60 * 30)  # cache for 30 minutes
def about(request):
    return render_response(request, 'about.html')


@cache_page(60 * 30)
def about_gml(request):
    return render_response(request, 'gml.html')


@cache_page(60 * 30)
def credits(request):
    return render_response(request, 'credits.html')


@cache_page(60 * 30)
def code(request):
    return render_response(request, 'code.html')


@cache_page(60 * 30)
def mozilla(request):
    return render_response(request, 'mozilla.html')


@cache_page(60 * 30)
def evan(request):
    evan_urls = {
        'laser_url': 'http://graffitiresearchlab.com/projects/laser-tag/',
        'throwies_url': 'http://graffitiresearchlab.com/projects/led-throwies/',
        'glove_url': 'http://whiteglovetracking.com/',
        'eyewriter_url': 'http://www.eyewriter.org/',
        'graffiti_url': 'http://graffitianalysis.com/',
        'jayz_url': 'http://www.youtube.com/watch?v=QftcJtvLr8g',
        'research_url': 'http://www.graffitiresearchlab.com/',
        'fat_url': 'http://fffff.at/',
        'npr_url': 'http://www.npr.org/templates/story/story.php?storyId=124980282',
        'nyt_url': 'http://evan-roth.com/press/High-Tech-Graffiti-Spray-Paint-Is-So-20th-Century-New-York-Times.pdf',
        'liberation_url': 'http://evan-roth.com/press/C-est-graff-docteur.pdf',
        'time_url': 'http://www.time.com/time/photogallery/0,29307,1911799_1912685,00.html',
        'cnn_url': 'http://edition.cnn.com/2010/TECH/web/09/10/gif.images/index.html',
        'guardian_url': 'http://www.guardian.co.uk/search?search=%22evan+roth%22&sitesearch-radio=guardian&go-guardian=Search',
        'abc_url': 'http://abcnews.go.com/Technology/popup?id=2425229',
        'esquire_url': 'http://www.esquire.com/features/best-brightest-2007/graffiti1207',
        'juxtapoz_url': 'http://evan-roth.com/press/juxtapoz-2010-10-oct-eroth.pdf',
    }
    return render_response(request, 'evan-roth.html', evan_urls)

@cache_page(60 * 30)
def collaborators(request):
    return render_response(request, 'other-collaborators.html')

def gml(request, mark_reference):
    mark = get_object_or_404(Mark, reference=mark_reference)
    obj_decoded = simplejson.loads(common.decode_points_obj(mark.points_obj_simplified))
    date_drawn = int(time.mktime(mark.date_drawn.timetuple()))
    context = {'mark': mark, 'obj_decoded': obj_decoded, 'date_drawn': date_drawn}
    response = render_response(request, 'gml.xml', context, mimetype='application/xml')
    response['Content-Disposition'] = "attachment; filename=%s.gml" % mark.reference
    return response


@cache_page(60 * 30)
def manifesto(request):
    return render_response(request, 'manifesto.html')


def mark(request, mark_reference):
    mark = get_object_or_404(Mark, reference=mark_reference)
    return render_response(request, 'mark.html', {'mark': mark})


def makemark(request):
    if request.method == "POST":
        mark_form = MarkForm(request.POST)
    if mark_form.is_valid():
        mark_data = {'points_obj': mark_form.cleaned_data['points_obj'], 'country_code': mark_form.cleaned_data['country_code']}
        common.save_new_mark_with_data(mark_data)
    else:
        mark_form = MarkForm()
    return render_response(request, 'makemark.html', {'form': mark_form})


@cache_page(30)
def community(request):
    if 'offset' in request.GET:
        try:
            offset = int(request.GET['offset'])
            per_page = int(request.GET['per_page'])
        except ValueError:
            return HttpResponseBadRequest()
        top_limit = offset + per_page
        all_marks = Mark.objects.exclude(flaggings__gte=1)[offset:top_limit]
    else:
        all_marks = Mark.objects.exclude(flaggings__gte=1)
    return render_response(request, 'community.html', {'all_marks': all_marks})

@cache_page(60 * 30)
def newsletter(request):
    form = EmailSubscribeForm()
    return render_response(request, 'newsletter.html', {'form': form})

@cache_page(60 * 30)
def home_sammy(request):
    mr = settings.MEDIA_ROOT
    return render_response(request, 'sammy/home.html', {'mr': mr})


@cache_page(15)
def linear_sammy(request):
    return render_response(request, 'sammy/linear.html')


def mark_sammy(request):
    mark = get_object_or_404(Mark, reference=mark_reference)
    return render_response(request, 'sammy/mark.html', {'mark': mark})


def makemark_sammy(request):
    mark_form = MarkForm()
    return render_response(request, 'sammy/makemark.html', {'form': mark_form})


### MODERATION VIEWS
def account_locked(request):
    return render_response(request, 'registration/locked.html')


def list_invites(request):
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/accounts/login/')
    else:
        invites = Invitation.objects.order_by('id')
        context = {'invites': invites}
        return render_response(request, 'list_invites.html', context)


def moderate_sammy(request):
    if not request.user.is_authenticated():
        return HttpResponseRedirect('/accounts/login/')
    else:
        return render_response(request, 'sammy/moderate.html')
