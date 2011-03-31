from django.template.loader import BaseLoader
from django.template.loaders.app_directories import app_template_dirs
from django.template import TemplateDoesNotExist, Origin
from django.core import urlresolvers
from django.conf import settings
from django.utils import translation
import jinja2


class Template(jinja2.Template):

    def render(self, context):
        # flatten the Django Context into a single dictionary.
        context_dict = {}
        for d in context.dicts:
            context_dict.update(d)

        if settings.TEMPLATE_DEBUG:
            from django.test import signals
            self.origin = Origin(self.filename)
            signals.template_rendered.send(
                sender=self, template=self, context=context)

        return super(Template, self).render(context_dict)


class Loader(BaseLoader):

    is_usable = True
    env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(settings.JINJA_TEMPLATE_DIRS),
            extensions=['jinja2.ext.i18n'])
    env.template_class = Template
    env.install_gettext_translations(translation)

    def load_template(self, template_name, template_dirs=None):
        try:
            template = self.env.get_template(template_name)
        except jinja2.TemplateNotFound:
            raise TemplateDoesNotExist(template_name)
        return template, template.filename
