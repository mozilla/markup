from django.db import connection
from django.conf import settings
from django.utils.encoding import *
from urlparse import urlparse

import re
from django import http
import django.core.exceptions
from django.core import urlresolvers
from django.http import HttpResponseRedirect
from django.utils import translation
import localeurl
from localeurl import utils

from django.http import HttpResponseRedirect, HttpResponsePermanentRedirect, get_host


class SQLLogMiddleware:
    def process_response(self, request, response):
        if settings.DEV and connection.queries:
            time = sum([float(q['time']) for q in connection.queries])
        return response


class DetectReferrer:
    def process_request(self, request):
        if not request.session.get('HTTP_REFERER', False):
            if(request.META.get('HTTP_REFERER')):
                ref = urlparse(request.META.get('HTTP_REFERER'))
                request.session['HTTP_REFERER'] = ref.hostname

# SSL Middleware
# via: http://djangosnippets.org/snippets/85/

# __license__ = "Python"
# __copyright__ = "Copyright (C) 2007, Stephen Zabel"
# __author__ = "Stephen Zabel - sjzabel@gmail.com"
# __contributors__ = "Jay Parlar - parlar@gmail.com"

SSL = 'SSL'


class SSLRedirect:

    process_view(self, request, view_func, view_args, view_kwargs):
        if SSL in view_kwargs:
            secure = view_kwargs[SSL]
            del view_kwargs[SSL]
        else:
            secure = False

        if not secure == self._is_secure(request):
            return self._redirect(request, secure)

    def _is_secure(self, request):
        if request.is_secure():
            return True

        #Handle the Webfaction case until this gets resolved in the request.is_secure()
        if 'HTTP_X_FORWARDED_SSL' in request.META:
            return request.META['HTTP_X_FORWARDED_SSL'] == 'on'

        return False

    def _redirect(self, request, secure):
        protocol = secure and "https" or "http"
        newurl = "%s://%s%s" % (protocol, get_host(request), request.get_full_path())
        if settings.DEBUG and request.method == 'POST':
            raise RuntimeError(
        """Django can't perform a SSL redirect while maintaining POST data.
           Please structure your views so that redirects only occur during GETs.""")

        return HttpResponsePermanentRedirect(newurl)
