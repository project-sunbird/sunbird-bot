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
from configparser import ConfigParser

config = ConfigParser()
# config.read()
#
#
nlp = spacy.load('en_core_web_sm')

redisClient = redis.Redis(host= "localhost" , port = 6379)
redisSessionData = {}

class ActionSubjectCourses(Action):
     def name(self) -> Text:
         return "action_subject_courses"

     def run(self, dispatcher: CollectingDispatcher,
             tracker: Tracker,
             domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
         print('running action_subject_courses')
         dispatcher.utter_message(template="utter_fetching_data")
         print(tracker.latest_message.get('entities'))
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
         # elements = [{
         #   "blocks": [{
         #          "intent": "low_confidence",
         #          "text": "Sorry, I could not understand you. Please press 0 for menu.",
         #          "type": "low_confidence"
         #       }]
         #   }]
         elements = [{"type": "low_confidence", "entities": nouns,
                      "adj": adjs, "intent": "low_confidence"}]
         dispatcher.utter_message(json_message=elements)
      else:
         # elements = [{
         #    "blocks": [{
         #       "intent": "low_confidence",
         #       "text": "Sorry, I could not understand you. Please press 0 for menu.",
         #       "type": "low_confidence"
         #   }]
         # }]
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
      channel_res = requests.get(
            "https://staging.ntp.net.in/api/channel/v1/read/0126632859575746566") 
      print("channel_res",channel_res)
      obj['payload'] = channel_res
      print("obj-->",obj, type(obj))
      self.channel_data[board] = obj
      return self.channel_data[board]['payload']

   def fetch_framework_data(self, board_identifier):
      obj = {}
      obj['time'] = int(round(time.time() * 1000))
      # counter = 0
      # =call the framework api
      print("call the api-framework", self.framework_counter+1)
      grade_mdium_url = "https://staging.ntp.net.in/api/framework/v1/read/" + \
            board_identifier + "?categories=board,medium,gradeLevel,subject" 
      framework_res = requests.get(grade_mdium_url)
      print("framework_res-->",framework_res)
      obj['payload'] = framework_res
      print("obj-->",obj, type(obj))
      self.framework_data[board_identifier] = obj
      return self.framework_data[board_identifier]['payload']

   def check_ttl_get_data(self, channel_data, board,framework_data,board_identifier):
      if bool(board):
         print("inside check_ttl_get_data board")
         last_time = channel_data[board]['time']
      else :
         print("inside check_ttl_get_data else")
         last_time = framework_data[board_identifier]['time']

      # last_time = channel_data[board]['time']
     
      time_compare = last_time+self.ttl
      print("time_compare-->",time_compare)
      print("self.ttl-->",self.ttl)
      current_time = int(round(time.time() * 1000))
      print("current_time-->",current_time)
      if time_compare < current_time:
         print("inside time_compare if")
         if bool(board):
            self.fetch_channel_data(board)
         else:
            self.fetch_framework_data(board_identifier)

         #  self.fetch_channel_data(board)
      if bool(board):
         print("inside time if")
         return self.channel_data[board]['payload']
      else : 
         return self.framework_data[board_identifier]['payload']

      


class ActionContentForm(FormAction):
   #   print("redisClient in python --> ",redisClient)
   #   redisClient.get 
     def name(self) -> Text:
        return "content_form"

     @staticmethod
     def required_slots(tracker: Tracker) -> List[Text]:
      #   print("tracker --> ", tracker)
        return ["board", "medium", "grade"]
      
     # initialize the redis connection pool
      #  rs = redis.Redis(host='localhost', port=6379)
   #   redisGet = redis.get("bot_" + deviceId)
     def board_db(self, value):
        global channel_response

        a = FrameworkApi()
        
        print("a.channel_data-->",a.channel_data)

        if not bool(a.channel_data):
           print("calling a.fetch_channel_data(value)")
           channel_response = a.fetch_channel_data(value)
           print("method1-->",channel_response)
        else:
           cached_boards = a.channel_data.keys()
           print("cached_boards-->",cached_boards)
           print("comparing value in cached_boards",value)
           if value in cached_boards :
              channel_response = a.check_ttl_get_data(a.channel_data,value,"","")
              print("method2-->",channel_response)
              
           else:
              channel_response = a.fetch_channel_data(value)
              print("method1-->",channel_response)
          
        print("inside board_db ", value)
        board_list = []
        
      #   channel_response = requests.get(
      #       "https://staging.ntp.net.in/api/channel/v1/read/0126632859575746566")

        res_json = channel_response.json()

      #   api_matching_board = self.get_board_api_mapped(value)
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
        
      #   print("a.channel_data-->",a.framework_data)

        if not bool(a.framework_data):
           grade_medium_api_response = a.fetch_framework_data(board_identifier)
         #   print("method3-->",grade_medium_api_response)
        else:
           cached_mediums = a.framework_data.keys()
         #   print("cached_mediums-->",cached_mediums)
         #   print("comparing value in cached_mediums",board_identifier)
           if board_identifier in cached_mediums :
            #   
              grade_medium_api_response = a.check_ttl_get_data("","",a.framework_data,board_identifier)
            #   print("grade_medium_api_response method2-->",grade_medium_api_response)
              
           else:
              grade_medium_api_response = a.fetch_framework_data(board_identifier)
            #   print("grade_medium_api_response method1-->",grade_medium_api_response)  
        res_framwork = grade_medium_api_response.json()
        medium_grade_categories = res_framwork['result']['framework']['categories']
        medium_to_compare = ''
        if medium != '':
           medium_to_compare = self.get_medium_mapped(medium.lower())

        
      #   print("medium_to_compare-->", medium_to_compare)

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

      #   grade_to_compare = self.get_grade_mapped(grade.lower())
      #   print("grade_to_compare-->", grade_to_compare)

      #   print("grade_list in grade_db-->", grade_list)
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
  
        print("calling board_db from validate_board")
        board_list = self.board_db(value)
        print("board_list-->",board_list)
        api_matching_board = self.get_board_api_mapped(value.lower())
        if(api_matching_board in board_list):
           board_identifier = api_matching_board
           medium_list = self.medium_grade_db('')
           medium_buttons = []
           for medium in medium_list:
              medium_buttons.append({"text": medium, "value": medium})
              print("medium_buttons-->", medium_buttons)

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
           print("board_buttons-->", board_buttons)
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
      #   """Validate medium."""
        redisSessionData ['medium'] = value
      #   redisSlot =  { "medium":value }
        redisSlot =  json.dumps(redisSessionData)
        self.setRedisKeyValue(tracker.sender_id, redisSlot)
        medium_list = self.medium_grade_db(value)
        api_matching_medium = self.get_medium_mapped(value.lower())
        if (api_matching_medium in medium_list):
           grade_buttons = []
           for grade in grade_list:
              grade_buttons.append({"text": grade, "value": grade})
         #   print("grade_buttons-->", grade_buttons)
           print("tracker.get_slot('medium') -->",tracker.get_slot('medium'))
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
         #   print("medium_buttons-->", medium_buttons)

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
      #   redisSlot =  { "grade":value }
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

        print("inside content_form")
        deviceId = tracker.sender_id
        redisValue = redisClient.get("action_"+ str(deviceId))
      #   print("redisValue-->", redisValue , " and type --> ", type(redisValue))
        redisValue_str = redisValue.decode('utf-8')
      #   print("redisValue_str-->", redisValue_str," and type --> ", type(redisValue_str))

        redisTracker = json.loads(redisValue_str)
      #   print("redisTracker -->",redisTracker, " type ",type(redisTracker)," and dir -->", dir(redisTracker))
      #   print("redisTracker['board'] -->",redisTracker['board'])
      

      #   board = tracker.get_slot('board')
      #   grade = tracker.get_slot('grade')
      #   medium = tracker.get_slot('medium')

        board = redisTracker['board']
        grade = redisTracker['grade']
        medium = redisTracker['medium']

        print('Grade -->', grade)
        print('Medium -->', medium)
        print('Board -->', board)

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
      #   dispatcher.utter_message(text="<span> Great! I understand that you are looking for content of " + board + " board, class " + grade + ", " + medium + " medium .<br>"
      #                            "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>")

        return [SlotSet('board', board), SlotSet('grade', grade), SlotSet('medium', medium)]

     def gererate_diksha_url(self, board, medium, grade):
        print("inside gererate_diksha_url")
        base_url = "https://diksha.gov.in/explore"
        board_url = "?board=" + self.get_board_mapped(board.lower())
        medium_url = "&medium=" + self.get_medium_mapped(medium.lower())
        grade_url = "&gradeLevel=" + self.get_grade_mapped(grade.lower())
        url = base_url + board_url + medium_url + grade_url
        return url

     def get_board_api_mapped(self, board):
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/boards_api.json')
        with open(filename) as boards_api_values:
           data = json.load(boards_api_values)
        return data[board]

     def get_reafactored_board_mapped(self, board_list):
        dirname = os.path.dirname(__file__)
        reafactored_board_list = []
        filename = os.path.join(dirname, 'resources/refactored_board.json')
        with open(filename) as reafactored_boards_values:
           data = json.load(reafactored_boards_values)

           for board in board_list:
            if board in data:
              reafactored_board_list.append(data[board])

            else:
              reafactored_board_list.append(board)
        print("reafactored_board_list-->", reafactored_board_list)
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
      #   expiryInterval = 3600
	   #   redisClient.set('bot_' + key, value)
        redisClient.set('action_' + key, str(value))
