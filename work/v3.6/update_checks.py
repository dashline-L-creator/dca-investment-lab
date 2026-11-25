from pathlib import Path
p=Path('work/v3.6/verify_cloud.cjs');s=p.read_text(encoding='utf8');s=s.replace("cloud=fs.readFileSync('work/v3.6/cloud3d.js','utf8')","cloud=['cloud3d.js','ridge.js','morph.js','orbit.js'].map(n=>fs.readFileSync('work/v3.6/'+n,'utf8')).join('\\n')")
s=s.replace('clearRect(){},','clearRect(){},createLinearGradient:()=>({addColorStop(){}}),')
s=s.replace('document:{getElementById:el,querySelectorAll:()=>[]}',"document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){},hidden:false},window:{addEventListener(){}},performance:{now:()=>1000},IntersectionObserver:class{constructor(fn){this.fn=fn}observe(){this.fn([{isIntersecting:true}])}}")
s=s.replace(",y=-.69+(Date.parse(p.r[0]+'T00:00:00Z')-cloudScene.from)/(cloudScene.to-cloudScene.from)*1.38",'')
s=s.replace('Math.abs(y-p.y)>1e-12','(p.y<-.66||p.y>.52)')
s=s.replace("if(selected!==hit.r[0])", "if(!starts.includes(selected))")
s=s.replace('四资产收益星图','四资产收益山脊').replace('correct return/date/asset coordinates','correct return/normalized height/asset coordinates')
needle="console.log('PASS:',cases,"
at=s.index(needle)
s=s[:at]+'''// Spring coordinates return exactly to data; a settled globe is finite.
let sample={x:73,y:180};for(let i=0;i<500;i++){let c={w:390,h:360,mid:170},flat=morphPosition(sample,i,500,c,0),ball=morphPosition(sample,i,500,c,1);if(flat.x!==sample.x||flat.y!==sample.y||!Number.isFinite(ball.x+ball.y))throw Error('Invalid morph coordinates')}
morphAmount=0;morphVelocity=0;morphTarget=1;for(let i=0;i<300;i++)morphStep(1/60);if(morphAmount!==1)throw Error('Globe spring failed to settle');morphTarget=0;for(let i=0;i<300;i++)morphStep(1/60);if(morphAmount!==0||morphVelocity!==0)throw Error('Data positions not restored');
// The user's stop-on-touch and restart-on-reset rule overrides reference inertia.
view='distribution';installOrbit();orbitVisible=true;orbitEnabled=true;cloudMode='3d';paintCloud(1);yaw=cloudYaw;orbitLast=1000;orbitTick(1050);if(cloudYaw<=yaw)throw Error('Auto orbit not advancing');cv.onpointerdown({button:0,pointerId:3,clientX:100,clientY:100});if(orbitEnabled)throw Error('Touch failed to stop orbit');cv.onpointerup({pointerId:3,clientX:100,clientY:100});if(orbitEnabled)throw Error('Release incorrectly resumed orbit');cloudResetView();if(!orbitEnabled||cloudYaw!==-.48||cloudZoom!==1)throw Error('Reset failed to restart orbit');orbitStop();yaw=cloudYaw;orbitTick(1200);if(yaw!==cloudYaw)throw Error('Paused orbit moved');
console.log('PASS: spring settles to exact data coordinates; automatic orbit, touch pause, persistent pause after release, reset restart.');
''' +s[at:]
p.write_text(s,encoding='utf8');print('Updated geometry and interaction checks')
