#!/bin/bash
#download node and npm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 20.19.2
nvm use 20.19.2


#create our working directory if it doesnt exist
DIR="/home/ec2-user/cloud-dksService"
if [ -d "$DIR" ]; then
  echo "${DIR} exists"
else
  echo "Creating ${DIR} directory"
  mkdir ${DIR}
fi