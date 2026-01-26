#!/bin/bash

for file in locales/*.po; do
    echo "Compiling $file to ${file%.po}.mo"
    msgfmt "$file" -o "${file%.po}.mo"
done
