# Chatbot-core
Core dialogue engine for chatbots


# Getting the chatbot running on docker locally (docker-compose)
- Install Docker
- Clone this repo and *cd* to the cloned repo
- Execute the following command `docker-compose -f stack.yml up` This command would build the bot and the router images and run them along with redis as a container.

Run the below curl to check if the bot is up and running. A successful setup would return the following response **'Hi there! Please press 0 for menu.'**. 

```
    curl -X POST \
        http://localhost:4000/bot \
        -H 'content-type: application/json' \
        -d '{
            "Body": "Hi",
            "From": "123"
        }'
```

# Getting the chatbot running on docker swarm in production (assumes SSL)
- Install Docker and initialise a docker swarm by running `docker swarm init`
- Clone this repo and *cd* to the cloned repo
- `cd clonedrepo/bot`
- `docker build --tag rasachatbot:0.0.1 .` This would build a docker image for the rasa bot
- `cd clonedrepo/router`
- `docker build --tag rasachatrouter:0.0.1 .` This would build a docker image for the router that will integrate with Rasa bot
- Push these images to a public repo so that you can reference the images from the prod.yml. You can test locally without this step, but it is mandatory to push to a public repo if you have a multi-node swarm
- Make the below changes in prod.yml 
    - Update the bot and router to images that you built above
    - Update the path to the site.key, crt and cabundle.
- Execute `docker stack deploy --compose-file prod.yml bot` and this will deploy all the services to the docker swarm. Run `docker swarm leave --force` to purge the swarm and services

Run the below curl to check if the bot is up and running. A successful setup would return the following response **'Hi there! Please press 0 for menu.'**. 

```
    curl -X POST \
        http://IP:4000/bot \
        -H 'content-type: application/json' \
        -d '{
            "Body": "Hi",
            "From": "123"
        }'
```

# Getting the chatbot running on a VM

## Router Module (A node js application to interface between the chat client and bot server)
- Installation:
    - install node and npm
    - `npm install` to install dependencies

- configuration:
    - "config/config.js" can be modified if needed to change ports and other parameters

- Starting the services:
    - `node appRest` to start the REST endpoint
    - `node appSocket` to start Socket endpoint

## Bot module
- Installation:
    - install latest anaconda environment
    - run `conda env create -f environment.yml` to install python dependencies. This step creates a virtual environment named rasa with python 3.6 and all dependencies
    - activate the environment `conda activate rasa`. 
    - `conda deactivate` to de-activate the environment

- configuration:
    - modify config.yml if needed to change NLU components for training or change policies
    - modify endpoints.yml if needed to change action server endpoint

- Starting the services:
    - start RASA core server by running `make bot` or `rasa run -p 5005 --enable-api --cors "*" -vv`
    - start RASA action endpoint server by running `make action` or `rasa run actions -vv -p 5056`

# Integration Instructions

- REST integration
    Method: Post
    Endpoint: `http://<IP>:<PORT>/bot`
    Body:
    {
        "Body": "Hi",
        "From": "AC6436e7066283ef84c88a05392cc0fcd6"
    }
    Header:
    {'content-type': 'application/json'}

    *Body - User message
    *From - session id (uuid or some Session/ User identifier)

    - Response:  Text based response

    - Curl request for the same:

		```
        curl -X POST \
        http://<IP>:<PORT>/bot \
        -H 'content-type: application/json' \
        -d '{
            "Body": "Hi",
            "From": "AC6436e7066283ef84c88a05392cc0fcd6"
        }'
		```

- Socket Integration
    - Socket message body sample(using socket.io):
    - Request:
        Url: http://52.173.240.27:4005
        Body:
        ["user_uttered",{"message":"what are the timelines for portal?","customData":{"userId":"123"}}]
    - Response: 
        ["bot_uttered",{"text":"please choose from CBSE or State Board, other bords are not handled as of yet. 1. CBSE \n 2. State Board","intent":"template_ans_demo","type":"response"}]
