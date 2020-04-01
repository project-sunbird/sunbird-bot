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
        host: Optional[Text] = "elastic_endpoint",
        db: Optional[Text] = "index",
        username: Optional[Text] = None,
        password: Optional[Text] = None,
        auth_source: Optional[Text] = "admin",
        collection: Optional[Text] = "conversations",
        event_broker: Optional[EventBroker] = None,
    ):
        print('initialized tracker')
        self.domain       = domain
        self.event_broker = event_broker
        self.username     = username
        self.password     = password
        self.host         = host
        self.db           = db
        self.esClient     = Elasticsearch(['http://'+username+':'+password+'@'+host])



    def save(self, tracker, timeout=None):
        print('save event called')
        for event in tracker.events:
            persistenceObj = {}
            if event.type_name is 'user':
                res = self.esClient.index(index=self.db, body={"event": event.type_name , "text": event.text , "entities" : event.entities , "intent" : event.intent['name'], "confidence":event.intent['confidence'], "timeStamp" :time.time() })
            if event.type_name is 'bot':
                res = self.esClient.index(index=self.db, body={"event":event.type_name,"data" : event.data , "timeStamp" :time.time()})
