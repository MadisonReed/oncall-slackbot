#!/bin/bash

set -x
version=$(cat package.json | jq -r '.version')
echo "building and pushing version $version"
docker build -t iamjk/oncall-slackbot:$version ./ -f Dockerfile
docker push iamjk/oncall-slackbot:$version
