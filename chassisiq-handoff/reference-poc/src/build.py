import pathlib
p=pathlib.Path('.')
css=(p/'styles.css').read_text()
js='\n'.join((p/f).read_text() for f in ['data.js','api.js','charts.js','app1.js','app2.js'])
html=f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ChassisIQ: cost and specification studio (POC for Amber)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body>
<script>
{js}
</script></body></html>'''
pathlib.Path('dist').mkdir(exist_ok=True)
(p/'dist'/'index.html').write_text(html)
print(len(html))
