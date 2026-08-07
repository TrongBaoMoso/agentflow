#!/usr/bin/env python3
"""Bundle the version 4 Loan Officer programme previews into three
self-contained HTML files: font and every photograph become data URIs so the
published page makes no external request at all.

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

STATES = [
    ('public', '1 · Public'),
    ('new', '2 · Not applied'),
    ('submitted', '3 · Submitted'),
    ('approved', '4 · Approved'),
    ('denied', '5 · Not approved'),
]

PAGES = {
    'ambassador': {
        'file': 'ambassador.html',
        'title': 'Loan Officer Ambassador Program — Loan Factory',
        'preview': 'Loan Officer Ambassador Program — design preview',
        'note': 'Not a live page. Sample data only — forms submit nowhere.',
        'states': True,
    },
    'recruiter': {
        'file': 'recruiter.html',
        'title': 'Producing Loan Officer Recruiter Program — Loan Factory',
        'preview': 'Producing Loan Officer Recruiter Program — design preview',
        'note': 'Not a live page. Sample data only — forms submit nowhere.',
        'states': True,
    },
    'admin': {
        'file': 'admin.html',
        'title': 'Program admin — Loan Factory',
        'preview': 'Loan Officer Programs — admin console preview',
        'note': 'Administrators only. Names, NMLS numbers, photographs and '
                'statuses are invented; nothing here is a real registration.',
        'states': False,
    },
}

TABS = [
    ('ambassador', 'ambassador.html', 'Ambassador'),
    ('recruiter', 'recruiter.html', 'Recruiter'),
    ('admin', 'admin.html', 'Admin console'),
]

VIEW_SCRIPT = """
      /* Viewer-state switcher. Every block that belongs to one or more of the
         five states carries data-when="state [state…]"; switching hides the
         rest. Admin has no pills, so the call is a no-op there. */
      ;(function () {
        var blocks = document.querySelectorAll('[data-when]')
        var pills = document.querySelectorAll('[data-state]')

        window.setView = function (view) {
          document.body.setAttribute('data-view', view)
          Array.prototype.forEach.call(blocks, function (el) {
            el.hidden = el.getAttribute('data-when').split(' ').indexOf(view) === -1
          })
          Array.prototype.forEach.call(pills, function (p) {
            p.setAttribute('aria-pressed', String(p.getAttribute('data-state') === view))
          })
        }

        Array.prototype.forEach.call(pills, function (p) {
          p.addEventListener('click', function () {
            window.setView(p.getAttribute('data-state'))
          })
        })

        window.setView(document.body.getAttribute('data-view') || 'public')
      })()
"""

VERSION_SCRIPT = """
      /* Version switcher, unchanged in behaviour since v1. Each design version
         lives in its own folder beside this one (/lo-programs/v1, /v2, …).
         Options start disabled and enable themselves once the matching file is
         actually there, so dropping in a v5 folder needs no edit here. */
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


def data_uri(path: pathlib.Path, mime: str) -> str:
    return 'data:%s;base64,%s' % (mime, base64.b64encode(path.read_bytes()).decode())


def version_picker(current: str) -> str:
    out = [
        '          <label class="pv__ver">',
        '            <span>Design version</span>',
        '            <select id="verpick" aria-label="Switch design version">',
    ]
    for n in range(1, 7):
        v = 'v%d' % n
        if v == current:
            out.append('              <option value="%s">Version %d</option>' % (v, n))
        else:
            out.append(
                '              <option value="%s" disabled>Version %d &mdash; not uploaded yet</option>'
                % (v, n)
            )
    out += ['            </select>', '          </label>']
    return '\n'.join(out)


def toolbar(page: str, cfg: dict) -> str:
    tabs = []
    for pid, href, label in TABS:
        current = ' aria-current="page"' if pid == page else ''
        tabs.append('          <a class="pv__tab" href="%s"%s>%s</a>' % (href, current, label))

    states = ''
    if cfg['states']:
        pills = '\n'.join(
            '              <button type="button" class="pv__state" data-state="%s" aria-pressed="%s">%s</button>'
            % (sid, 'true' if sid == 'public' else 'false', label)
            for sid, label in STATES
        )
        states = (
            '\n        <div style="min-width:0">\n'
            '          <div class="pv__caption" id="pv-as">Viewing the page as</div>\n'
            '          <div class="pv__states" role="group" aria-labelledby="pv-as">\n'
            + pills
            + '\n          </div>\n        </div>'
        )

    return (
        '    <!-- Preview toolbar — review chrome only, removed before implementation. -->\n'
        '    <div class="pv">\n'
        '      <div class="pv__in">\n'
        '        <nav class="pv__tabs" aria-label="Preview pages">\n'
        + '\n'.join(tabs)
        + '\n\n'
        + version_picker('v4')
        + '\n        </nav>\n'
        '        <div class="pv__meta">\n'
        '          <div style="min-width:0">\n'
        '            <div class="pv__title">%s</div>\n'
        '            <div class="pv__note">%s</div>\n'
        '          </div>%s\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n' % (cfg['preview'], cfg['note'], states)
    )


def inline_assets(text: str) -> str:
    text = text.replace('__FONT__', data_uri(FONT, 'font/woff2'))

    def photo(match):
        name = match.group(1)
        path = PHOTOS / (name + '.jpg')
        if not path.exists():
            sys.exit('missing photo: %s' % path)
        return data_uri(path, 'image/jpeg')

    return re.sub(r'__IMG_([a-z0-9-]+)__', photo, text)


def build(page: str, cfg: dict, out_dir: pathlib.Path) -> None:
    css = (SRC / 'common.css').read_text(encoding='utf-8')
    body = (SRC / (page + '.body.html')).read_text(encoding='utf-8')
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
        '    <script>%s    </script>\n'
        '    <script>%s    </script>\n'
        '    <script>\n%s\n    </script>\n'
        '  </body>\n'
        '</html>\n'
        % (
            cfg['title'],
            css,
            'admin' if page == 'admin' else 'public',
            toolbar(page, cfg),
            body,
            VIEW_SCRIPT,
            VERSION_SCRIPT,
            script,
        )
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

    # Anything still pointing outside the file is a bug. String-concatenation
    # sites inside the scripts ( src="' + a.photo + '" ) resolve at runtime to
    # an already-inlined data URI, so they are not real references.
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
