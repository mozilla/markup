from django import http
from django.template import RequestContext, loader, Context, TemplateDoesNotExist
from django.conf import settings
from django.utils import translation
from itertools import chain
import traceback


def render_response(request, template, context={}, status=200, mimetype=None, content_type=settings.DEFAULT_CONTENT_TYPE):
    c = RequestContext(request, context)
    return http.HttpResponse(loader.get_template(template).render(c), status=status, mimetype=mimetype, content_type=content_type)
