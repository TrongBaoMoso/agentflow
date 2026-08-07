#!/usr/bin/env python3
"""Bundle the version 4 Loan Officer programme previews into three
self-contained HTML files.

The design canvas writes inline styles in React's camelCase (fontSize,
borderRadius, …), which a browser ignores in a real style attribute, so every
style attribute is rewritten to kebab-case here. The font and every photograph
are inlined as data URIs, so a published page makes no external request.

    python3 build.py <output-dir>
"""

import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'src'
FONT = HERE / 'montserrat.woff2'
PHOTOS = HERE / 'photos'

PAGES = {
    'ambassador': {
        'file': 'ambassador.html',
        'title': 'Loan Officer Ambassador Program — Loan Factory',
        'preview': 'Loan Officer Ambassador Program — design preview',
        'note': 'Not a live page. Sample data only — forms submit nowhere.',
        'view': 'public',
        'states': True,
    },
    'recruiter': {
        'file': 'recruiter.html',
        'title': 'Producing Loan Officer Recruiter Program — Loan Factory',
        'preview': 'Producing Loan Officer Recruiter Program — design preview',
        'note': 'Not a live page. Sample data only — forms submit nowhere.',
        'view': 'public',
        'states': True,
    },
    'admin': {
        'file': 'admin.html',
        'title': 'Program admin console — Loan Factory',
        'preview': 'Program admin console — design preview',
        'note': 'Not a live page. Sample data only — decisions change nothing outside this screen.',
        'view': 'admin',
        'states': False,
    },
}

TABS = [
    ('recruiter', 'recruiter.html', 'Recruiter'),
    ('ambassador', 'ambassador.html', 'Ambassador'),
    ('admin', 'admin.html', 'Admin console'),
]

# The viewer switcher is shared verbatim with v1…v5 (lf-homepage#2169): two
# labelled groups rather than five numbered pills, and no preview title.
STATES_ANON = [('public', 'Public visitor')]
STATES_AUTH = [
    ('new', 'Not applied'),
    ('submitted', 'Submitted'),
    ('approved', 'Approved'),
    ('denied', 'Not approved'),
]

VIEW_SCRIPT = """
      /* Viewer-state switcher. Blocks that belong to one or more of the five
         states carry data-when="state [state…]". Elements are re-queried on
         every switch because the roster builds its cards in script. */
      ;(function () {
        function apply(view) {
          document.body.setAttribute('data-view', view)
          Array.prototype.forEach.call(document.querySelectorAll('[data-when]'), function (el) {
            el.hidden = el.getAttribute('data-when').split(' ').indexOf(view) === -1
          })
          Array.prototype.forEach.call(document.querySelectorAll('[data-state]'), function (p) {
            p.setAttribute('aria-pressed', String(p.getAttribute('data-state') === view))
          })
          if (typeof window.onViewChange === 'function') window.onViewChange(view)
        }

        window.setView = apply

        Array.prototype.forEach.call(document.querySelectorAll('[data-state]'), function (p) {
          p.addEventListener('click', function () {
            apply(p.getAttribute('data-state'))
          })
        })

        apply(document.body.getAttribute('data-view') || 'anon')
      })()
"""

VERSION_SCRIPT = """
      /* Version switcher, unchanged in behaviour since v1. Each design version
         lives in its own folder beside this one (/lo-programs/v1, /v2, …).
         Options start disabled and enable themselves once the matching file is
         actually there, so dropping in a v6 folder needs no edit here. */
      ;(function () {
        var sel = document.getElementById('verpick')
        if (!sel) return
        var parts = location.pathname.split('/')
        var file = parts.pop() || 'ambassador.html'
        var cur = parts.pop() || 'v4'
        Array.prototype.forEach.call(sel.options, function (o) {
          if (o.value === cur) {
            o.selected = true
            o.disabled = false
          }
        })
        sel.addEventListener('change', function () {
          location.href = '../' + sel.value + '/' + file
        })
        Array.prototype.forEach.call(sel.options, function (o) {
          if (!o.disabled) return
          fetch('../' + o.value + '/' + file, { method: 'HEAD' })
            .then(function (r) {
              if (!r.ok) return
              o.disabled = false
              o.textContent = 'Version ' + o.value.slice(1)
            })
            .catch(function () {})
        })
      })()
"""


# --------------------------------------------------------------------------- #
# The canvas writes style attributes the way React does. Browsers do not.
CAMEL = re.compile(r'([a-z])([A-Z])')


def kebab_declaration(decl: str) -> str:
    if ':' not in decl:
        return decl
    prop, value = decl.split(':', 1)
    return CAMEL.sub(r'\1-\2', prop.strip()).lower() + ':' + value


def kebabify_styles(html: str) -> str:
    def one(match):
        body = ';'.join(kebab_declaration(d) for d in match.group(1).split(';'))
        return 'style="%s"' % body

    return re.sub(r'style="([^"]*)"', one, html)


def data_uri(path: pathlib.Path, mime: str) -> str:
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())


def inline_assets(text: str) -> str:
    text = text.replace('__FONT__', data_uri(FONT, 'font/woff2'))

    def photo(match):
        path = PHOTOS / match.group(1).lower() / (match.group(2) + '.jpg')
        if not path.exists():
            sys.exit('missing photo: %s' % path)
        return data_uri(path, 'image/jpeg')

    return re.sub(r'__IMG_(LG|SM)_([a-z0-9-]+)__', photo, text)


def version_picker() -> str:
    out = [
        '          <label class="pv__ver">',
        '            <span>Design version</span>',
        '            <select id="verpick" aria-label="Switch design version">',
    ]
    for n in range(1, 8):
        v = 'v%d' % n
        if v == 'v4':
            out.append('              <option value="v4">Version 4</option>')
        else:
            out.append(
                '              <option value="%s" disabled>Version %d &mdash; not uploaded yet</option>' % (v, n)
            )
    out += ['            </select>', '          </label>']
    return '\n'.join(out)


def state_group(states, label, cls) -> str:
    buttons = ''.join(
        '<button type="button" class="pv__state" data-state="%s" aria-pressed="false">%s</button>' % (sid, text)
        for sid, text in states
    )
    return (
        '          <div class="vsw-g%s">\n'
        '            <span class="vsw-lbl vsw-lbl--%s">%s</span>\n'
        '            <div class="vsw-btns">%s</div>\n'
        '          </div>' % (' vsw-g--auth' if cls == 'auth' else '', cls, label, buttons)
    )


def toolbar(page: str, cfg: dict) -> str:
    tabs = []
    for pid, href, label in TABS:
        current = ' aria-current="page"' if pid == page else ''
        tabs.append('          <a class="pv__tab" href="%s"%s>%s</a>' % (href, current, label))

    if cfg['states']:
        bottom = (
            '        <div class="vsw">\n'
            + state_group(STATES_ANON, 'Not signed in &mdash; what the public sees', 'anon')
            + '\n'
            + state_group(STATES_AUTH, 'Signed in &mdash; what a Loan Officer sees at each stage', 'auth')
            + '\n        </div>\n'
        )
    else:
        # No applicant states on the console — the canvas puts the signed-in
        # administrator here instead.
        bottom = (
            '        <div style="display:flex;align-items:center;gap:11px">\n'
            '          <img alt="" aria-hidden="true" width="36" height="36" src="__IMG_SM_women-28__" '
            'style="width:36px;height:36px;border-radius:999px;flex:none;object-fit:cover" />\n'
            '          <span style="display:flex;flex-direction:column;line-height:1.3">\n'
            '            <span style="font-size:13px;font-weight:800;color:#ffffff">Renata Callas</span>\n'
            '            <span style="font-size:11px;font-weight:600;color:#8f8a85;letter-spacing:.03em">'
            'Signed in as program administrator</span>\n'
            '          </span>\n        </div>\n'
        )

    return (
        '    <!-- Preview toolbar — review chrome only, removed before implementation. -->\n'
        '    <div class="pv">\n'
        '      <div class="pv__in">\n'
        '        <nav class="pv__tabs" aria-label="Preview pages">\n'
        + '\n'.join(tabs)
        + '\n\n'
        + version_picker()
        + '\n        </nav>\n'
        + bottom
        + '      </div>\n'
        '    </div>\n'
    )


def build(page: str, cfg: dict, out_dir: pathlib.Path) -> None:
    css = (SRC / 'common.css').read_text(encoding='utf-8') + '\n\n' + (SRC / '_chrome.css').read_text(encoding='utf-8')
    body = kebabify_styles((SRC / (page + '.body.html')).read_text(encoding='utf-8'))
    script = (SRC / (page + '.js')).read_text(encoding='utf-8')

    body = '\n'.join('    ' + line if line.strip() else line for line in body.splitlines())
    script = '\n'.join('      ' + line if line.strip() else line for line in script.splitlines())

    html = (
        '<!doctype html>\n'
        '<html lang="en">\n'
        '  <head>\n'
        '    <meta charset="utf-8" />\n'
        '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        '    <meta name="robots" content="noindex, nofollow" />\n'
        '    <title>%s</title>\n'
        '    <style>\n%s\n    </style>\n'
        '  </head>\n'
        '  <body data-view="%s">\n'
        '%s\n'
        '%s\n'
        '    <script>\n%s\n    </script>\n'
        '    <script>%s    </script>\n'
        '    <script>%s    </script>\n'
        '  </body>\n'
        '</html>\n'
        % (cfg['title'], css, cfg['view'], toolbar(page, cfg), body, script, VIEW_SCRIPT, VERSION_SCRIPT)
    )

    html = inline_assets(html)

    for marker, what in (
        ('id="verpick"', 'version picker'),
        ("getElementById('verpick')", 'picker script'),
        ('noindex, nofollow', 'robots meta'),
    ):
        if marker not in html:
            sys.exit('%s: %s missing — anchor moved' % (page, what))

    leftovers = re.findall(r'__[A-Z][A-Z_0-9a-z-]*__', html)
    if leftovers:
        sys.exit('%s: unsubstituted tokens %s' % (page, sorted(set(leftovers))))

    # Any camelCase property left in a style attribute would be silently dropped
    # by the browser, so treat one as a build failure.
    for attr in re.findall(r'style="([^"]*)"', html):
        for decl in attr.split(';'):
            if ':' in decl and CAMEL.search(decl.split(':', 1)[0]):
                sys.exit('%s: camelCase style property survived — %r' % (page, decl.strip()))

    external = [
        ref
        for ref in re.findall(r'(?:src|href)="(?!#|data:|[a-z-]+\.html)([^"]*)"', html)
        if "' +" not in ref and '\n' not in ref
    ]
    if external:
        sys.exit('%s: external asset reference %s' % (page, external))

    dest = out_dir / cfg['file']
    dest.write_text(html, encoding='utf-8')
    print('%-16s %7.1f KB' % (cfg['file'], dest.stat().st_size / 1024))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out_dir = pathlib.Path(sys.argv[1]).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    for page, cfg in PAGES.items():
        build(page, cfg, out_dir)


if __name__ == '__main__':
    main()
