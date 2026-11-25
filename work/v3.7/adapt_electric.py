from pathlib import Path
q=Path('work/v3.7');src=(q/'electric-reference.jsx').read_text(encoding='utf8')
prefix=src[src.index('const BOLT ='):src.index('const ElectricLogo =')].replace('const RASTER = 560;','const RASTER = 320;')
body=src[src.index('    const renderer = new Renderer'):src.index('  }, []);')]
body=body.replace('    return () => {','    const cleanup = () => {')
# Drop the renderer resources on actual page teardown, not on skip/replay.
body=body.replace('    resize();\n    start();','    resize();\n    start();\n    addEventListener(\'pagehide\',()=>cleanup(),{once:true});')
settings="""{color:'#5c50a1',glowColor:'#9b8bcf',scale:.79,intensity:.82,glow:.68,thickness:1.05,strands:2,bend:.24,crackle:.42,arcs:.22,flicker:.10,fill:.035,speed:.85,interactive:false,cursorIntensity:0,cursorRadius:80,theme:'light',onRender:()=>container.parentElement.classList.add('electric-ready')}"""
mask="""function electricMask(){const c=document.createElement('canvas');c.width=c.height=360;const x=c.getContext('2d');x.translate(180,180);x.scale(360,360);x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';x.lineWidth=.024;x.beginPath();x.arc(0,0,.35,-.19,Math.PI*2-.95);x.stroke();x.lineWidth=.028;x.beginPath();x.moveTo(-.19,.105);x.bezierCurveTo(-.14,.10,-.13,-.035,-.095,.005);x.bezierCurveTo(-.04,.07,.005,.04,.065,-.055);x.bezierCurveTo(.11,-.1,.15,-.10,.175,-.155);x.stroke();x.lineWidth=.025;[-.18,-.10,-.02,.06,.14].forEach((v,i)=>{x.beginPath();x.moveTo(v,[.133,.067,.094,0,-.052][i]);x.lineTo(v,.17);x.stroke()});return c}
"""
out="""/* Adapted from ElectricLogo by David Haz / React Bits.
 * MIT + Commons Clause; full notices included with this application.
 * https://reactbits.dev/animations/electric-logo */
async function installElectricIntro(){const container=$('electricLogo');if(!container||matchMedia('(prefers-reduced-motion: reduce)').matches)return;try{
 const {Renderer,Program,Mesh,Triangle,Texture}=await import('__OGL_MODULE_URL__');
"""+prefix+mask+"\n const settingsRef={current:"+settings+"},shapeRef={current:traceShape(electricMask())};\n"+body+"\n }catch(error){container.parentElement.classList.remove('electric-ready');container.textContent='';container.dataset.fallback='static';console.info('Electric logo: static fallback enabled.')}}\ninstallElectricIntro();\n"
(q/'electric.js').write_text(out,encoding='utf8')
print('Adapted actual ElectricLogo shader to an offline vanilla controller')
