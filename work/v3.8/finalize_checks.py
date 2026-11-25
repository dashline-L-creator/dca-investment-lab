from pathlib import Path
q=Path('work/v3.8');p=q/'checks.cjs';s=p.read_text(encoding='utf8');s+='''
el('brandIntro').classList.contains=()=>false;el('brandIntro').hidden=false;vm.runInContext('marketCurvePaths=marketData.map(a=>marketCurveGeometry(a,{x:20,y:30,w:330,h:130}));marketReplayStarted=0;',box);assert.equal(vm.runInContext('marketGlowSources(1000).length',box),5);el('brandIntro').hidden=true;assert.equal(vm.runInContext('marketGlowSources(1000).length',box),0);console.log('PASS: automatic five-curve emitters require no pointer and stop when the intro closes.');
''';p.write_text(s,encoding='utf8')
p=q/'playback.js';s=p.read_text(encoding='utf8').replace("marketGlowEngine=createMarketGlow(intro,$('introMarketGlow'),marketGlowSources,marketPlaybackActive)","if(!matchMedia('(prefers-reduced-motion: reduce)').matches)marketGlowEngine=createMarketGlow(intro,$('introMarketGlow'),marketGlowSources,marketPlaybackActive)");p.write_text(s,encoding='utf8')
