"""Create/update a deployment-only gh-pages branch without touching the worktree.

Run build/check first, then this script, then `git push origin gh-pages`.
GitHub Pages must use the gh-pages branch root. No workflow-write token is needed.
"""
from pathlib import Path
import subprocess
from build import ROOT
def git(*args,input=None,check=True):
    return subprocess.run(['git',*args],cwd=ROOT,input=input,capture_output=True,check=check).stdout.decode().strip()
files={p.name:p.read_bytes() for p in (ROOT/'dist').iterdir() if p.is_file() and p.suffix!='.zip'}
assert 'index.html' in files and '.nojekyll' in files,'Run build.py first'
for p in (ROOT/'licenses').glob('*.txt'):files['licenses/'+p.name]=p.read_bytes()
tree={}
for path,content in files.items():
    node=tree;parts=path.split('/')
    for part in parts[:-1]:node=node.setdefault(part,{})
    node[parts[-1]]=git('hash-object','-w','--stdin',input=content)
def write_tree(node):
    lines=[]
    for name,value in sorted(node.items()):
        if isinstance(value,dict):lines.append('040000 tree '+write_tree(value)+'\t'+name)
        else:lines.append('100644 blob '+value+'\t'+name)
    return git('mktree',input=('\n'.join(lines)+'\n').encode())
root=write_tree(tree)
parent=git('rev-parse','--verify','refs/heads/gh-pages',check=False)
args=['commit-tree',root]
if parent:args+=['-p',parent]
args+=['-m','Deploy latest offline DCA dashboard to GitHub Pages']
commit=git(*args)
git('update-ref','refs/heads/gh-pages',commit)
print('Prepared gh-pages '+commit+' with '+str(len(files))+' files')
