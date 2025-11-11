# Streammer-Backend


## Setup for Message Queue 

### Producer.js file contains the logic that sends the data in message queue. 

#### which has simple email send adds in queue

### Worker.js file runs all the jobs which inside the "notifications" queue one by one.
### write now it is simple Promise setup for demonstration with delay of 5 seconds

### npm i

### make sure that docker is started on desktop so it will start there container automatically

## Run command for docker

### docker run -itd -p 6379:6379 redis

## Sample example for running message queue

###  make sure that you can you different terminal to see results
### push job in message queue: node producer.js
### run jobs in queue : node worker.js


