from pathlib import Path
q=Path('work/v3.8');s=(q/'glow-reference.jsx').read_text(encoding='utf-8-sig');prefix=s[s.index('const VERTEX'):s.index('const GlowCursor =')].replace('const PRESSURE_STEPS = 20','const PRESSURE_STEPS = 12')
body=s[s.index('    const gl = canvas?.getContext'):s.index('  }, []);')]
body=body.replace('      if (!alive || !visible || document.hidden) return;','      if (!alive || !visible || document.hidden || !active()) {blank();last=0;return;}')
body=body.replace('      if (state.ready) emit(s, dt, now);','''      const sources=getSources(now),present=new Set;
      for(const point of sources){present.add(point.id);let e=feeders.get(point.id);if(!e||Math.hypot(e.x-point.x,e.y-point.y)>80){e={x:point.x,y:point.y,px:point.x,py:point.y,vx:0,vy:0,travelled:0};feeders.set(point.id,e)}state.emitter=e;state.pointer={x:point.x,y:point.y,inside:true};state.ready=true;emit(s,dt,now)}
      for(const id of feeders.keys())if(!present.has(id))feeders.delete(id);''')
body=body.replace('      if (quiet && resting) {','      if (quiet && resting && !active()) {')
body=body.replace('      if (!raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame);','      if (!raf && alive && visible && !document.hidden && active()) raf = requestAnimationFrame(frame);')
for line in ["    window.addEventListener('pointermove', onPointerMove, { passive: true });","    window.addEventListener('pointerdown', onPointerDown, { passive: true });","    document.documentElement.addEventListener('pointerleave', onPointerLeave);"]:
 body=body.replace(line,'')
body=body.replace('    return () => {','    const cleanup = () => {')
body+='''
    new MutationObserver(()=>{feeders.clear();if(!active()){cancelAnimationFrame(raf);raf=0;if(state.targets)clearTargets();blank();last=0}else wake()}).observe(container,{attributes:true,attributeFilter:['hidden','class']});
    addEventListener('pagehide',cleanup,{once:true});
    return {wake,cleanup};
'''
out='''/* GlowCursor shader adapted from React Bits by David Haz.
 * MIT + Commons Clause. This version follows real quote curves automatically;
 * there are no mouse or pointer emitters. See reactbits-license.txt. */
function createMarketGlow(container,canvas,getSources,active){try{
'''+prefix+'''
const settingsRef={current:{color:'#8875b6',secondaryColor:'#b58a9b',intensity:.72,trailWidth:2.2,linger:.55,glow:.72,hotspot:.24,followSpeed:1,grain:0,clickBurst:false,quality:'low',theme:'light',maxDevicePixelRatio:1,enabled:true}},feeders=new Map;
'''+body+'''
}catch(error){console.info('Market glow: lightweight fallback enabled.');return null}}
'''
(q/'glow.js').write_text(out,encoding='utf8');print('Adapted actual GlowCursor shader for autonomous curve playback')
