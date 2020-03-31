action:
	nohup rasa run actions -vv -p 5056 &
bot:
	nohup rasa run -p 5005 --enable-api --cors "*" -vv &
bot-cli:
	rasa run -p 5006 --enable-api --cors "*" -vv
train:
	rasa train
