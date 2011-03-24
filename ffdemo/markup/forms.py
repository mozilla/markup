from django.forms import ModelForm
from ffdemo.markup.models import Mark

class MarkForm(ModelForm):
	class Meta:
			model = Mark
			fields = ('points_obj', 'country_code')