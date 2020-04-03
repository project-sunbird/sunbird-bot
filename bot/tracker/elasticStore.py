from typing import Optional, Text
from rasa.core.brokers.broker import EventBroker
from rasa.core.domain import Domain
from rasa.core.trackers import DialogueStateTracker
from rasa_core.tracker_store import TrackerStore
from elasticsearch import Elasticsearch
import json
import threading
import time



class ElasticTrackerStore(TrackerStore):

    def __init__(
        self,
        domain: Domain,
        host: Optional[Text] = "",
        db: Optional[Text] = "",
        username: Optional[Text] = None,
        password: Optional[Text] = None,
        auth_source: Optional[Text] = "admin",
        collection: Optional[Text] = "conversations",
        event_broker: Optional[EventBroker] = None,
    ):
        print('initialized tracker')
        self.domain = domain
        self.event_broker = event_broker
        self.username = username
        self.password = password
        self.host     = host
        self.db       = db
        self.esClient = Elasticsearch(['http://'+username+':'+password+'@'+host])



    def save(self, tracker, timeout=None):
        for event in tracker.events:
               t1 = threading.Thread(target = self.persist, args=([event]),)
               t1.start()



    def persist(self,event):
        print('persist called')
        print(event.type_name)
        print('-------------persist called-------------')
        try:
                if event.type_name is 'user':
                    res = self.esClient.index(index=self.db, body={"event": event.type_name , "text": event.text , "entities" : event.entities , "intent" : event.intent.get('name'), "confidence": event.intent.get('confidence'), "timeStamp" :time.time() })
                if event.type_name is 'bot':
                    print(event.data)
                    res = self.esClient.index(index=self.db, body={"event":event.type_name,"payload" : event.data , "timeStamp" :time.time()})
        except Exception as e:
                print(e)



