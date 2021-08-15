#!/bin/bash

for f in *.png
do
 filename=$(basename -- "$f")
 extension="${filename##*.}"
 basefile="${filename%.*}"

 echo "Convert $f"
 pnmfile=$basefile.pnm
 svgfile=$basefile.svg

 convert $f $pnmfile              # PNG to PNM
 potrace $pnmfile -s -o $svgfile  # PNM to SVG
done

rm *.pnm
