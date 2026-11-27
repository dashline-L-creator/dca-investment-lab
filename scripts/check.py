"""One command for build and all regression checks; requires Python 3.10+ and Node 20+."""
from pathlib import Path
import os,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
subprocess.run([sys.executable,str(ROOT/'scripts/build.py')],check=True)
subprocess.run(['node','--check','.cache/app.js'],check=True)
subprocess.run(['node','--check',str(ROOT/'src/js/motion.js')],check=True)
for path in sorted((ROOT/'tests').glob('check*.cjs')):
    print('\n'+path.name,flush=True)
    subprocess.run(['node',str(path)],check=True)
print('\nAll checks passed.')
