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
#
#
nlp = spacy.load('en_core_web_sm')


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


class ActionContentForm(FormAction):
     def name(self) -> Text:
        return "content_form"

     @staticmethod
     def required_slots(tracker: Tracker) -> List[Text]:
        return ["board", "medium", "grade"]

     def submit(self, dispatcher: CollectingDispatcher,
                tracker: Tracker,
                domain: Dict[Text, Any]) -> List[Dict]:
        base_url = "https://diksha.gov.in/explore"

        board_url = "https://staging.ntp.net.in/api/channel/v1/read/0126632859575746566"

        filter_url = "https://staging.ntp.net.in/api/framework/v1/read/ka_k-12_1?categories=board,medium,gradeLevel,subject"

        print("inside content_form")

        board = tracker.get_slot('board')
        grade = tracker.get_slot('grade')
        medium = tracker.get_slot('medium')

        print('Grade -->', grade)
        print('Medium -->', medium)
        print('Board -->', board)

        channel_response = requests.get(
            "https://staging.ntp.net.in/api/channel/v1/read/0126632859575746566")
      #   print("board_response-->", response.json())
        res_json = channel_response.json()
      #   print("type-->", type(response.json()))
      #   print("result-->",res_json['result']['channel']['frameworks'])
        api_matching_board = self.get_board_api_mapped(board.lower())
        print("api_matching_board-->", api_matching_board)
        channels = res_json['result']['channel']['frameworks']
        for channel in channels:
         # print("x-->",x)
         if api_matching_board in channel['identifier']:
            board_identifier = channel['identifier']
            print("present in the list-->")
            print("x[identifier]-->", channel['identifier'])

        if board_identifier:
           print("inside if-->")
           grade_mdium_url = "https://staging.ntp.net.in/api/framework/v1/read/" + \
               board_identifier + "?categories=board,medium,gradeLevel,subject"
           print("grade_mdium_url-->", grade_mdium_url)
           grade_medium_api_response = requests.get(grade_mdium_url)
           res_framwork = grade_medium_api_response.json()
           categories = res_framwork['result']['framework']['categories']
         #   print("frameworks-->",categories)

           grade_to_compare = self.get_grade_mapped(grade.lower())
           print("grade_to_compare-->", grade_to_compare)

           medium_to_compare = self.get_medium_mapped(medium.lower())
           print("medium_to_compare-->", medium_to_compare)

           for category in categories:
              if "medium" in category["code"]:
                 print("medium matched-->", category["code"])
                 for term in category["terms"]:
                    if medium_to_compare in term["description"]:
                       print("medium matched")
                       break
                  #   else :
                  #      print("this medium is not available")
                     #   dispatcher.utter_message(text = "this medium is not available for the mentioned board")

            #   if "gradeLevel" in category["code"] :
            #      print("gradeLevel matched-->", category["code"])
            #      for term in category["terms"]:
            #         if grade_to_compare in term["description"]:
            #            print("grade matched")

                  #   else :
                  #      print("this grade is not available")
                     #   dispatcher.utter_message(text = "this grade is not available for the mentioned medium")

           board_url = "?board=" + self.get_board_mapped(board.lower())
           medium_url = "&medium=" + self.get_medium_mapped(medium.lower())
           grade_url = "&gradeLevel=" + self.get_grade_mapped(grade.lower())
           url = base_url + board_url + medium_url + grade_url

         #   returnObject = [{"type":"buttons","data":{"text":"<span> Great! I understand that you are looking for content of "+ board + " board, class " + grade + ", " + medium + " medium .<br>"
         #    "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>","intent":"greet","buttons":[]}}]
         #   print("returnObject-->",returnObject)
         #   dispatcher.utter_message(json_message = returnObject)

           print("Great! I understand that you are looking for content of " + board + " board, class " + grade + ", " + medium + " medium .<br>"
                 "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>")

         #   elements = [{
         #       "type": "buttons",
         #       "data": {
         #           "text": "Please visit <a target='_blank' href='https://diksha.gov.in/ch/explore/?utm_source=Tara'>DIKSHA CHANDIGARH</a><br>Select the Medium and Class to view relevant subject textbook on the board website.<br>",
         #           "intent": "greet",
         #           "buttons": [{
         #               "text": "Go Back",
         #               "value": "99",
         #           },
         #               {
         #               "text": "Main Menu",
         #               "value": "0",
         #           }]
         #       }
         #   }]
         #   elements = [{"type":"button", "data" : {"intent" : "greet", "buttons" : [] "text" : "<span> Great! I understand that you are looking for content of "+ board + " board, class " + grade + ", " + medium + " medium .<br>"
         #    "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>"} }]

         #   dispatcher.utter_message(json_message=elements)


         #   dispatcher.utter_message(
         #   text = {
         #      "data": {
         #        "text": "<span> Great! I understand that you are looking for content of "+ board + " board, class " + grade + ", " + medium + " medium .<br>"
         #    "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>"
         #      }
         #   }
         #   )
           elements = [{
                  "blocks": [{
                     "intent": "greet",
                     "text": "<span> Great! I understand that you are looking for content of " + board + " board, class " + grade + ", " + medium + " medium .<br>"
                              "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>",
                     "type": "response"
                  }]
               }]
           dispatcher.utter_message(json_message=elements)
         #   elements = [{"type":"weather_action","entities":tracker.latest_message.get('entities'), "loc" : "abc", "intent" : "weather_action"}]
         #   dispatcher.utter_message(json_message=elements)
         #   dispatcher.utter_message(text="<span> Great! I understand that you are looking for content of " + board + " board, class " + grade + ", " + medium + " medium .<br>"
         #    "Please visit: <a target='_blank' href='" + url + "'> DIKSHA " + board + " Board</a></span>")
        else:
           print("enter valid board")
        return [SlotSet('board', board), SlotSet('grade', grade), SlotSet('medium', medium)]

   #   def gererate_diksha_url(self):

     def get_board_api_mapped(self, board):
      #   print("get_board_mapped called")
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/boards_api.json')
        with open(filename) as boards_api_values:
           data = json.load(boards_api_values)
           print("data in api mapping-->", data[board])
        return data[board]

     def get_board_mapped(self, board):
      #   print("get_board_mapped called")
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/boards.json')
        with open(filename) as boards_values:
           data = json.load(boards_values)
           print("data in board-->", data[board])
        return data[board]

     def get_medium_mapped(self, medium):
      #   print("get_medium_mapped called")
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/mediums.json')
        with open(filename) as mediums_values:
           data = json.load(mediums_values)
         #   print("data in medium-->",data)
        return data[medium]

     def get_grade_mapped(self, grade):
      #   print("get_grade_mapped called")
        data = ''
        dirname = os.path.dirname(__file__)
        filename = os.path.join(dirname, 'resources/grades.json')
        with open(filename) as grades_values:
           data = json.load(grades_values)
         #   print("data in grade-->",data)
        return data[grade]
