#!/bin/sh
#
# Switch between development and production mode by adding/removing
# 'unsafe-inline'/'unsafe-eval' instructions into application
# Content-Security-Policy.
#
# Practically, this instruction is needed in development mode for live-server
# live reload to works as intended.
#
# This is a kind of a hack.

if [ "$1" = "-d" ]; then
  sed -e "s/script-src 'self'/script-src 'unsafe-inline' 'unsafe-eval' 'self'/" \
      -i extra/*.html
elif [ "$1" = "-p" ]; then
  sed -e "s/ 'unsafe-inline' 'unsafe-eval'//g" \
      -i extra/*.html
else
  echo "Usage: $(basename $0) [-p|-d]" >&2
  exit 1
fi

