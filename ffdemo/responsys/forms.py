from django import forms


class EmailWidget(forms.widgets.Input):
    input_type = 'email'


class EmailSubscribeForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super(EmailSubscribeForm, self).__init__(*args, **kwargs)

    email = forms.EmailField(required=True, widget=EmailWidget)
    optin = forms.BooleanField(required=True)
    country = forms.CharField(initial='US', min_length=2, max_length=2, required=True)

