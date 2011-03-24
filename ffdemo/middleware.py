from django.db import connection
from django.conf import settings
from django.utils.encoding import *
from urlparse import urlparse

class SQLLogMiddleware:
    def process_response(self, request, response): 
        if settings.DEV and connection.queries:
            time = sum([float(q['time']) for q in connection.queries])        
            
            #print u"%d queries in %s seconds:\n" % (len(connection.queries), time)
            # for sql in connection.queries:
              # print u"%s : %s\n" % (sql['time'], force_unicode(sql['sql']))
        return response
        
class DetectReferrer:
    def process_request(self, request):
        if not request.session.get('HTTP_REFERER', False):
            if(request.META.get('HTTP_REFERER')):
                ref = urlparse(request.META.get('HTTP_REFERER'))
                request.session['HTTP_REFERER'] = ref.hostname
                # print u"Referred by: %s" % request.session['HTTP_REFERER']
