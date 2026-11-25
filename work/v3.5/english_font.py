from pathlib import Path
import requests,re,base64,io
from fontTools.ttLib import TTFont
q=Path('work/v3.5');s=requests.Session();s.trust_env=False
url='https://fonts.loli.net/css2?family=IBM+Plex+Sans:wght@400;600&display=swap'
r=s.get(url,headers={'User-Agent':'Mozilla/5.0'},timeout=35);r.raise_for_status();css=r.text;(q/'IBM-Plex-Sans-source.css').write_text(css,encoding='utf8')
blocks=css.split('@font-face')
for weight in [400,600]:
 matches=[block for block in blocks if re.search(r'font-weight:\s*'+str(weight)+r'\s*;',block) and 'U+0000-00FF' in block]
 if not matches:matches=[block for block in blocks if re.search(r'font-weight:\s*'+str(weight)+r'\s*;',block)]
 assert matches,'Missing weight '+str(weight)
 target=re.search(r'url\([\"\']?(https[^)\"\']+)',matches[-1]).group(1);r=s.get(target,timeout=40);r.raise_for_status();font=TTFont(io.BytesIO(r.content));font.flavor='woff2';font.save(q/f'IBMPlexSans-{weight}.woff2');print(weight,(q/f'IBMPlexSans-{weight}.woff2').stat().st_size)
r=s.get('https://api.github.com/repos/google/fonts/contents/ofl/ibmplexsans/OFL.txt',timeout=30);r.raise_for_status();(q/'IBMPlexSans-OFL.txt').write_bytes(base64.b64decode(r.json()['content']))
p=q/'template.html';t=p.read_text(encoding='utf8').replace('"__CJK_FAMILY__","Lab Sans",sans-serif','"__CJK_FAMILY__","Lab English","Lab Sans",sans-serif').replace('html[lang=en] body,html[lang=en] .intro-title{font-family:"Lab Sans",sans-serif}','html[lang=en] body,html[lang=en] .intro-title{font-family:"Lab English",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}');t=t.replace('__FONTCSS__','html[lang=en] h1,html[lang=en] h2,html[lang=en] h3,html[lang=en] .intro-title{font-weight:600}html[lang=en] body{font-weight:400}\n__FONTCSS__');p.write_text(t,encoding='utf8')
p=q/'build.py';t=p.read_text(encoding='utf8').replace("[('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers')]","[('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers'),('IBMPlexSans','Lab English')]").replace("(q if name=='NotoSansSC' else p)","(q if name in ['NotoSansSC','IBMPlexSans'] else p)");t += "\nshutil.copy2(q/'IBMPlexSans-OFL.txt',o/'IBMPlexSans-OFL.txt')\n";p.write_text(t,encoding='utf8')
print('IBM Plex Sans embedded; English headings 600, body 400; financial numerals preserved.')
