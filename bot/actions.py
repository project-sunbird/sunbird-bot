# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/core/actions/#custom-actions/

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
import spacy
#
#
nlp      = spacy.load('en_core_web_sm')


class ActionSubjectCourses(Action):
     def name(self) -> Text:
         return "action_subject_courses"

     def run(self, dispatcher: CollectingDispatcher,
             tracker: Tracker,
             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
         print('running action_subject_courses')
         dispatcher.utter_message(template="utter_fetching_data")
         print(tracker.latest_message.get('entities'))
         elements = [{"type":"subject_courses","entities":tracker.latest_message.get('entities'), "intent" : "subject_courses"}]
         dispatcher.utter_message(json_message=elements)
         #dispatcher.utter_custom_message(*elements)
         #dispatcher.utter_custom_json(elements)
         return []



class FallbackAction(Action):
   def name(self):
      return "fallback_action"

   def run(self, dispatcher, tracker, domain):
      intent_ranking = tracker.latest_message.get('intent_ranking', [])
      doc = nlp(tracker.latest_message.get('text'))
      nouns = []
      adjs  = []
      for token in doc:
          if token.pos_ == 'NOUN':
               nouns.append(token.text)
          if token.pos_ == 'ADJ':
               adjs.append(token.text)
      if len(intent_ranking) > 0 :
            elements = [{"type":"low_confidence","entities":nouns, "adj":adjs, "intent" : "low_confidence"}]
            dispatcher.utter_message(json_message=elements)
      else :
         elements = [{"type":"low_confidence","entities":nouns, "adj":adjs, "intent" : "low_confidence"}]
         dispatcher.utter_message(json_message=elements)
