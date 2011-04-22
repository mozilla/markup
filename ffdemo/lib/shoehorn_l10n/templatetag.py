"""Monkeypatch to normalize blocktrans msgids to work with tower."""

from tower import strip_whitespace

from django.templatetags import i18n


OldBlockTranslateNode = i18n.BlockTranslateNode

class ShoehornedBlockTranslateNode(OldBlockTranslateNode):
    def render_token_list(self, tokens):
        """Strip whitespace from msgid before letting gettext touch it."""
        rendered = super(ShoehornedBlockTranslateNode, self).render_token_list(
            tokens)
        return strip_whitespace(rendered[0]), rendered[1]


def monkeypatch():
    i18n.BlockTranslateNode = ShoehornedBlockTranslateNode
