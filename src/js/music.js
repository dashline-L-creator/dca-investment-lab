// Public provider URL only; no audio is copied or redistributed with the build.
function installMusic(){
 const button=$('musicBtn'),volume=$('musicVolume'),status=$('musicStatus');
 const audio=new Audio();audio.preload='none';audio.loop=true;
 const source='https://music.163.com/song/media/outer/url?id=1930226368.mp3';
 let wanted=true,failed=false,attempt=0,entered=false;
 try{const saved=localStorage.getItem('dca-music-volume');if(saved!==null&&Number.isFinite(+saved))volume.value=Math.max(0,Math.min(100,+saved))}catch{}
 audio.volume=+volume.value/100;
 function show(text,playing=false){button.textContent=translate(text);button.setAttribute('aria-pressed',String(playing));}
 function quiet(){attempt++;audio.pause();}
 async function play(){
  if(!wanted||!entered||document.hidden)return;
  const token=++attempt;failed=false;status.textContent='';show('音乐：加载中');
  if(!audio.src)audio.src=source;
  try{await audio.play();if(token!==attempt){if(!wanted||!entered||document.hidden)audio.pause();return;}show('Ⅱ 音乐',true)}
  catch(error){if(token!==attempt)return;if(error.name==='NotAllowedError'){show('▶ 播放音乐');status.textContent=translate('点击开启音乐')}else{failed=true;show('↻ 重试音乐');status.textContent=translate('音源暂不可用，可前往网易云收听')}}
 }
 audio.addEventListener('error',()=>{if(!wanted)return;failed=true;show('↻ 重试音乐');status.textContent=translate('音源暂不可用，可前往网易云收听')});
 button.onclick=()=>{if(!audio.paused){wanted=false;quiet();show('▶ 播放音乐');status.textContent=''}else{wanted=true;if(failed)audio.load();play()}};
 volume.oninput=()=>{audio.volume=+volume.value/100;try{localStorage.setItem('dca-music-volume',volume.value)}catch{}};
 // Dispatch synchronously from the intro click/key handler, before its exit animation.
 document.addEventListener('dca-enter',()=>{entered=true;if(wanted&&audio.paused)play()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){quiet();show('▶ 播放音乐')}else if(wanted)play()});

}
installMusic();
