#!/bin/bash
rm -rf build
rm -rf supersea
yarn build
cp -r build ./supersea
find ./supersea -type f -name '*.map' -delete
version=`cat supersea/manifest.json | jq -r ".version"`
filename="dist/supersea-$version.zip"
mkdir -p dist
zip -r $filename supersea
rm -rf supersea
echo "Created $filename"

