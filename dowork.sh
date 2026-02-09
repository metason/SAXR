#!/bin/zsh 
echo "Generate data viz in docu/work:"
python datarepgen.py docu/work
python export3D.py docu/work

