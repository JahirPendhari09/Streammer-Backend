FROM ubuntu

RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_24.x  | bash -
RUN apt-get upgrade -y
RUN apt-get install -y nodejs


COPY package.json package.json
COPY package-lock.json package-lock.json
COPY server.js server.js
COPY routes routes
COPY models models
COPY message-queue message-queue
COPY controller controller
COPY connection connection

RUN npm install

ENTRYPOINT [ "node" , "server.js" ]