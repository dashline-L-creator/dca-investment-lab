const fs=require('fs'),vm=require('vm'),assert=require('assert');let lang='zh-CN',label='EN',writes=0;
const root={get lang(){return lang},set lang(v){lang=v;writes++}},button={get textContent(){return label},set textContent(v){label=v;writes++}};
const box={LANG:'zh',NodeFilter:{SHOW_TEXT:4},document:{documentElement:root,body:{},createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>[]},$:()=>button};vm.createContext(box);
const s=fs.readFileSync('src/js/i18n.js','utf8').split('let pendingLanguage=')[0].replace('__DICT__',fs.readFileSync('src/config/translations.json','utf8'));vm.runInContext(s,box);
for(let i=0;i<20;i++)vm.runInContext('applyLanguage()',box);assert.equal(writes,0);box.LANG='en';vm.runInContext('applyLanguage()',box);assert.equal(writes,2);for(let i=0;i<20;i++)vm.runInContext('applyLanguage()',box);assert.equal(writes,2);
console.log('PASS: unchanged language causes no root/button DOM writes, avoiding translation/notes update loops.');
