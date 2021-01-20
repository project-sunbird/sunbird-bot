# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/core/actions/#custom-actions/

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.forms import FormAction
import spacy
from rasa_sdk.events import SlotSet
import json
import os.path
import requests
import datetime
import time
import redis
from config import config
from configparser import ConfigParser

nlp = spacy.load('en_core_web_sm')

redisClient = redis.Redis(host= config.REDIS_HOST , port = config.REDIS_PORT)
redisSessionData = {}

class ActionSubjectCourses(Action):
     def name(self) -> Text:
         return "action_subject_courses"

     def run(self, dispatcher: CollectingDispatcher,
             tracker: Tracker,
             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
         dispatcher.utter_message(template="utter_fetching_data")
         elements = [{"type": "subject_courses", "entities": tracker.latest_message.get(
             'entities'), "intent": "subject_courses"}]
         dispatcher.utter_message(json_message=elements)
         return []


class FallbackAction(Action):
   def name(self):
      return "fallback_action"

   def run(self, dispatcher, tracker, domain):
      intent_ranking = tracker.latest_message.get('intent_ranking', [])
      doc = nlp(tracker.latest_message.get('text'))
      nouns = []
      adjs = []
      for token in doc:
          if token.pos_ == 'NOUN':
               nouns.append(token.text)
          if token.pos_ == 'ADJ':
               adjs.append(token.text)
      if len(intent_ranking) > 0:
         elements = [{"type": "low_confidence", "entities": nouns,
                      "adj": adjs, "intent": "low_confidence"}]
         dispatcher.utter_message(json_message=elements)
      else:
         elements = [{"type": "low_confidence", "entities": nouns,
                      "adj": adjs, "intent": "low_confidence"}]
         dispatcher.utter_message(json_message=elements)


class FrameworkApi:
   channel_data = {}
   framework_data = {}
   channel_counter=0
   framework_counter =0 
   ttl = 7200000

   def fetch_channel_data(self, board):
      obj = {}
      obj['time'] = int(round(time.time() * 1000))
      print("call the api-channel",self.channel_counter+1)
      channel_res = requests.get(config.CHANNEL_API) 
      print("channel_res",channel_res)
      obj['payload'] = channel_res
      print("obj-->",obj, type(obj))
      self.channel_data[board] = obj
      return self.channel_data[board]['payload']

   def fetch_framework_data(self, board_identifier):
      obj = {}
      obj['time'] = int(round(time.time() * 1000))
      print("call the api-framework", self.framework_counter+1)
      grade_mdium_url = config.FRAMEWORK_API + \
            board_identifier + config.FRAMEWORK_FILTER
      framework_res = requests.get(grade_mdium_url)
      print("framework_res-->",framework_res)
      obj['payload'] = framework_res
      print("obj-->",obj, type(obj))
      self.framework_data[board_identifier] = obj
      return self.framework_data[board_identifier]['payload']

   def check_ttl_get_data(self, channel_data, board,framework_data,board_identifier):
      if bool(board):
         last_time = channel_data[board]['time']
      else :
         last_time = framework_data[board_identifier]['time']

      time_compare = last_time+self.ttl
      current_time = int(round(time.time() * 1000))
      if time_compare < current_time:
         if bool(board):
            self.fetch_channel_data(board)
         else:
            self.fetch_framework_data(board_identifier)

      if bool(board):
         return self.channel_data[board]['payload']
      else : 
         return self.framework_data[board_identifier]['payload']




class ActionContentForm(FormAction):
     def name(self) -> Text:
        return "content_form"

     @staticmethod
     def required_slots(tracker: Tracker) -> List[Text]:
        return ["board", "medium", "grade"]

     def board_db(self, value):
        global channel_response
        a = FrameworkApi()
        if not bool(a.channel_data):
           channel_response = a.fetch_channel_data(value)
        else:
           cached_boards = a.channel_data.keys()
           if value in cached_boards :
              channel_response = a.check_ttl_get_data(a.channel_data,value,"","")

           else:
              channel_response = a.fetch_channel_data(value)

        board_list = []
        res_json = channel_response.json()
        channels = res_json['result']['channel']['frameworks']
        for channel in channels:
         board_list.append(channel['identifier'])

        return board_list

     def medium_grade_db(self, medium):
        medium_list = []
        global grade_list
        grade_list = []
        global medium_grade_categories

        a = FrameworkApi()

        if not bool(a.framework_data):
           grade_medium_api_response = a.fetch_framework_data(board_identifier)
        else:
           cached_mediums = a.framework_data.keys()
           if board_identifier in cached_mediums :
              grade_medium_api_response = a.check_ttl_get_data("","",a.framework_data,board_identifier)
           else:
              grade_medium_api_response = a.fetch_framework_data(board_identifier)

        res_framwork = grade_medium_api_response.json()
        medium_grade_categories = res_framwork['result']['framework']['categories']
        medium_to_compare = ''
        if medium != '':
           medium_to_compare = self.get_medium_mapped(medium.lower())


        for category in medium_grade_categories:
              if "medium" in category["code"]:
                 for term in category["terms"]:
                    medium_list.append(term['name'])
                    if medium_to_compare != '' and medium_to_compare in term["name"]:
                       for association in term["associations"]:
                          if association["category"] == "gradeLevel":
                             grade_list.append(association['description'])

                       break
        return medium_list

     def grade_db(self, grade):

        return grade_list

     def validate_board(self,
                        value: Text,
                        dispatcher: CollectingDispatcher,
                        tracker: Tracker,
                        domain: Dict[Text, Any]) -> Text:

        global board_identifier
        redisSessionData ['board'] = value
        redisSlot =  json.dumps(redisSessionData)
        self.setRedisKeyValue(tracker.sender_id, redisSlot)

        board_list = self.board_db(value)
        api_matching_board = self.get_board_api_mapped(value.lower())
        if(api_matching_board in board_list):
           board_identifier = api_matching_board
           medium_list = self.medium_grade_db('')
           medium_buttons = []
           for medium in medium_list:
              medium_buttons.append({"text": medium, "value": medium})

           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Please choose the medium  <br>",
                   "buttons": medium_buttons,
                   "type": "response"
               }]
           }]

           dispatcher.utter_message(json_message=elements)
           return value
        else:
           reafactored_board_list = []
           reafactored_board_list = self.get_reafactored_board_mapped(
               board_list)
           board_buttons = []
           for board in reafactored_board_list:
              board_buttons.append({"text": board, "value": board})
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Sorry ! Available boards are : <br> ",
                   "buttons": board_buttons,
                   "type": "response"
               }]
           }]

           dispatcher.utter_message(json_message=elements)
           return None

     def validate_medium(self,
                         value: Text,
                         dispatcher: CollectingDispatcher,
                         tracker: Tracker,
                         domain: Dict[Text, Any]) -> Text:
        redisSessionData ['medium'] = value
        redisSlot =  json.dumps(redisSessionData)
        self.setRedisKeyValue(tracker.sender_id, redisSlot)
        medium_list = self.medium_grade_db(value)
        api_matching_medium = self.get_medium_mapped(value.lower())
        if (api_matching_medium in medium_list):
           grade_buttons = []
           for grade in grade_list:
              grade_buttons.append({"text": grade, "value": grade})
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Please choose the grade  <br> ",
                   "buttons": grade_buttons,
                   "type": "response"
               }]
           }]
           dispatcher.utter_message(json_message=elements)
           return value
        else:
           medium_buttons = []
           for medium in medium_list:
              medium_buttons.append({"text": medium, "value": medium})

           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Sorry ! Available mediums for {board} board are : <br>".format(board=tracker.get_slot('board')),
                   "buttons": medium_buttons,
                   "type": "response"
               }]
           }]

           dispatcher.utter_message(json_message=elements)
           return None

     def validate_grade(self,
                        value: Text,
                        dispatcher: CollectingDispatcher,
                        tracker: Tracker,
                        domain: Dict[Text, Any]) -> Text:

        redisSessionData ['grade'] = value
        redisSlot =  json.dumps(redisSessionData)
        self.setRedisKeyValue(tracker.sender_id, redisSlot)
        grades = self.grade_db(value)
        api_matching_grade = self.get_grade_mapped(value.lower())
        if (api_matching_grade in grades):
           return value
        else:
           grade_buttons = []
           for grade in grade_list:
              grade_buttons.append({"text": grade, "value": grade})
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Available grades for {medium} medium in {board} board are : <br> ".format(
                       medium=tracker.get_slot('medium'), board=tracker.get_slot('board')),
                   "buttons": grade_buttons,
                   "type": "response"
               }]
           }]
           dispatcher.utter_message(json_message=elements)
           return None

     def submit(self, dispatcher: CollectingDispatcher,
                tracker: Tracker,
                domain: Dict[Text, Any]) -> List[Dict]:

        deviceId = tracker.sender_id
        redisValue = redisClient.get("action_"+ str(deviceId))
        redisValue_str = redisValue.decode('utf-8')

        redisTracker = json.loads(redisValue_str)

        board = redisTracker['board']
        grade = redisTracker['grade']
        medium = redisTracker['medium']

        url = self.gererate_diksha_url(board, medium, grade)

        elements = [{
            "blocks": [{
                "intent": "greet",
                "text": "<span> Great! I understand that you are looking for content of " + board + " board, class " + grade + ", " + medium + " medium .<br>"
                    "Please visit: <a target='_blank' href='" + url +
                    "'> DIKSHA " + board + " Board</a></span>",
                    "type": "response"
                    }]
        }]
        dispatcher.utter_message(json_message=elements)

        return [SlotSet('board', board), SlotSet('grade', grade), SlotSet('medium', medium)]

     def gererate_diksha_url(self, board, medium, grade):
        base_url = "https://diksha.gov.in/explore"
        board_url = "?board=" + self.get_board_mapped(board.lower())
        medium_url = "&medium=" + self.get_medium_mapped(medium.lower())
        grade_url = "&gradeLevel=" + self.get_grade_mapped(grade.lower())
        url = base_url + board_url + medium_url + grade_url
        return url

     def get_board_api_mapped(self, board):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'config/boards_api.json')
        with open(filename) as boards_api_values:
           data = json.load(boards_api_values)
           print("data in get_board_api_mapped-->",data)
        return data[board]

     def get_reafactored_board_mapped(self, board_list):
        dirname = os.path.dirname(__file__)
        reafactored_board_list = []
        filename = os.path.join(dirname, 'config/refactored_board.json')
        with open(filename) as reafactored_boards_values:
           data = json.load(reafactored_boards_values)

           for board in board_list:
            if board in data:
              reafactored_board_list.append(data[board])

            else:
              reafactored_board_list.append(board)
        return reafactored_board_list

     def get_board_mapped(self, board):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/boards.json')
        with open(filename) as boards_values:
           data = json.load(boards_values)
        return data[board]

     def get_medium_mapped(self, medium):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/mediums.json')
        with open(filename) as mediums_values:
           data = json.load(mediums_values)
        return data[medium]

     def get_grade_mapped(self, grade):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/grades.json')
        with open(filename) as grades_values:
           data = json.load(grades_values)
        return data[grade]

     def setRedisKeyValue (self,key, value):
        redisClient.set('action_' + key, str(value))
