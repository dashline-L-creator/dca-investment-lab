"""Build the offline HTML from one source tree. No external Python dependencies."""
from pathlib import Path
import base64,json,re,os,hashlib
ROOT=Path(__file__).resolve().parents[1]
def read(path):return (ROOT/path).read_text(encoding='utf-8-sig')
def encoded(path):return base64.b64encode((ROOT/path).read_bytes()).decode()
def build():
    s=read('src/template.html')
    config=json.loads(read('src/config/font-project.json'))
    family=config['family'];url=config.get('cssUrl','')
    assert re.fullmatch(r'[\w \-]+',family)
    assert not url or re.fullmatch(r'https://use\.typekit\.net/[A-Za-z0-9]+\.css',url)
    link='<link id="adobe-font-project" rel="stylesheet" href="'+url+'">' if url else ''
    s=s.replace('__CJK_FAMILY__',family).replace('__ADOBE_FONT__',link)
    css=''
    for name,alias in [('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers'),('IBMPlexSans','Lab English')]:
        for weight in [400,600]:
            css+='@font-face{font-family:"'+alias+'";font-style:normal;font-weight:'+str(weight)+';font-display:swap;src:url(data:font/woff2;base64,'+encoded(f'assets/fonts/{name}-{weight}.woff2')+') format("woff2");}'
    js=lambda name:read('src/js/'+name+'.js')
    replacements={
        '__DATA__':read('data/research/dca.json'), '__FONTCSS__':css,
        '__I18N__':js('i18n').replace('__DICT__',read('src/config/translations.json')),
        '__ELECTRIC_JS__':js('electric').replace('__OGL_MODULE_URL__','data:text/javascript;base64,'+encoded('vendor/ogl.bundle.mjs')),
        '__GOLD_JS__':js('gold')+'\n'+js('sessions'), '__GLOW_JS__':js('glow'),
        '__MARKETS_JS__':js('markets').replace('__PLAYBACK_JS__',js('playback')).replace('__MARKET_SNAPSHOT__',read('data/market/snapshot.json')),
        '__INTRO_JS__':js('intro'), '__FIELD_JS__':js('linefield'),
        '__CLOUD_JS__':js('cloud3d')+'\n'+js('histogram3d'), '__MORPH_JS__':js('morph'),
        '__ORBIT_JS__':js('orbit'), '__MOUSE_JS__':js('mouse'), '__FAVICON__':read('src/favicon.html'),
        '__CLEAN_JS__':js('clean'), '__AXIS_JS__':js('axis'),
        '__RESPONSIVE_CSS__':read('src/styles/responsive.css'), '__RESPONSIVE_JS__':js('responsive'),
    }
    for key,value in replacements.items():s=s.replace(key,value)
    assert not re.search(r'__[A-Z][A-Z_]+__',s),'Unresolved build placeholder'
    # Fixed CRLF output matches the original Windows v3.10 distribution on every OS.
    out=ROOT/'dist';out.mkdir(exist_ok=True)
    (out/'index.html').write_bytes(s.replace('\r\n','\n').replace('\n','\r\n').encode('utf8'))
    cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
    (cache/'app.js').write_text(re.findall(r'<script>(.*?)</script>',s,re.S)[0].strip()+'\n',encoding='utf8')
    digest=hashlib.sha256((out/'index.html').read_bytes()).hexdigest()
    (out/'SHA256.json').write_text(json.dumps({'index.html':digest},indent=2)+'\n',encoding='utf8')
    print('Built dist/index.html ('+str((out/'index.html').stat().st_size)+' bytes)')
if __name__=='__main__':build()
