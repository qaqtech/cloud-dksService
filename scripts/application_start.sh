#!/bin/bash

#give permission for everything in the express-app directory
sudo chmod -R 777 /home/ec2-user/cloud-dksService

#navigate into our working directory where we have all our github files
cd /home/ec2-user/cloud-dksService

#add npm and node to path
export NVM_DIR="$HOME/.nvm"	
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # loads nvm	
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # loads nvm bash_completion (node is in path now)

#install node modules
npm install
npm install -g pm2
#start our node app in the background
if [ -f ".env" ]; then
   sudo rm .env
fi
# else
touch .env
echo CACHED_URL=$(aws ssm get-parameters --region ap-southeast-1 --names cached_url --with-decryption --output text --query Parameters[0].Value) >> /home/ec2-user/cloud-dksService/.env

cd /home/ec2-user/cloud-dksService
if  ps -ef | grep -v grep | grep -qi "dksservice"; then
    echo "Process running"
    pm2 restart dksservice.js
else
    echo "Process Not running"
    pm2 start dksservice.js
fi


