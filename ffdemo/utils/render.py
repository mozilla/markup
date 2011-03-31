from django import http
from django.template import RequestContext, loader, Context, TemplateDoesNotExist
from django.conf import settings
from django.utils import translation
from itertools import chain
from jinja2 import FileSystemLoader, Environment
from jinja2 import nodes
from jinja2.ext import Extension
import traceback


env = Environment(extensions=['jinja2.ext.i18n'])
env.install_gettext_translations(translation)


def render_response(request, template, context={}, status=200, mimetype=None, content_type=settings.DEFAULT_CONTENT_TYPE):
    c = RequestContext(request, context)
    return http.HttpResponse(loader.get_template(template).render(c), status=status, mimetype=mimetype, content_type=content_type)
