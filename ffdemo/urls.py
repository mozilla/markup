from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns('',
    (r'^localeurl/', include('localeurl.urls')),
    (r'^i18n/', include('django.conf.urls.i18n')),
)

if settings.DEBUG:
    import os
    import django
    urlpatterns += patterns('',
        (r'^media/admin/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT + '/admin'}),
        (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}),
        (r'^templates/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT + '/assets/templates'}),
    )

urlpatterns += patterns('markup.views',
    (r'^$', 'home'),
    # sammy templates
    (r'linear_sammy.html$', 'linear_sammy'),
    (r'makemark_sammy.html/$', 'makemark_sammy'),
    (r'^about/gml/$', 'about_gml'),
    (r'^about/code/$', 'code'),
    (r'^about/credits/$', 'credits'),
    (r'^about/mozilla/$', 'mozilla'),
    (r'^about/evan-roth/$', 'evan'),
    (r'^about/$', 'about'),
    (r'^manifesto/$', 'manifesto'),
    (r'^makemark/$', 'makemark'),
    (r'^community/$', 'community'),
    (r'^newsletter/$', 'newsletter'),
    (r'^mark/(?P<mark_reference>[a-zA-Z0-9]+)/$', 'mark'),
    (r'gml/(?P<mark_reference>[a-zA-Z0-9]+)/$', 'gml'),
    # Moderation and login
    (r'^accounts/login/$', django.contrib.auth.views.login, {'SSL': settings.REDIRECT_TO_SSL}),
    (r'^accounts/logout/$', django.contrib.auth.views.logout, {'SSL': settings.REDIRECT_TO_SSL}),
    (r'accounts/locked/$', 'account_locked', {'SSL': settings.REDIRECT_TO_SSL}),
    (r'list_invites/$', 'list_invites', {'SSL': settings.REDIRECT_TO_SSL}),
    (r'moderate_sammy.html/$', 'moderate_sammy', {'SSL': settings.REDIRECT_TO_SSL}),
)

urlpatterns += patterns('markup.requests',
    #Requests
    (r'^requests/get_translated_marks?$', 'get_translated_marks'),
    (r'^requests/get_locale_marks?$', 'get_translated_marks'),
    (r'^requests/init_viz_data?$', 'init_viz_data'),
    (r'^requests/set_language?$', 'set_language'),
    (r'^requests/save_mark?$',  'save_mark'),
    (r'^requests/flag_mark?$', 'flag_mark'),
    (r'^requests/get_mark?$', 'get_mark'),
    (r'^requests/all_marks?$', 'all_marks'),
    (r'^requests/marks_by_reference?$', 'marks_by_reference'),
    (r'^requests/marks_by_flagged?$', 'marks_by_flagged'),
    (r'^requests/delete_mark?$', 'delete_mark', {'SSL': settings.REDIRECT_TO_SSL}),
    (r'^requests/approve_mark?$', 'approve_mark', {'SSL': settings.REDIRECT_TO_SSL}),
)
