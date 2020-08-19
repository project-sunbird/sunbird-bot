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

     def board_db(self, value):
        print("inside board_db ", value)
        board_list = []
        global channel_response
        channel_response = requests.get(
            "https://staging.ntp.net.in/api/channel/v1/read/0126632859575746566")

        res_json = channel_response.json()

        api_matching_board = self.get_board_api_mapped(value)
        channels = res_json['result']['channel']['frameworks']
        for channel in channels:
         board_list.append(channel['identifier'])

        return board_list, res_json

     def medium_grade_db(self, medium):
        medium_list = []
        global grade_list
        grade_list = []
        global medium_grade_categories
        grade_mdium_url = "https://staging.ntp.net.in/api/framework/v1/read/" + \
            board_identifier + "?categories=board,medium,gradeLevel,subject"
        grade_medium_api_response = requests.get(grade_mdium_url)
        res_framwork = grade_medium_api_response.json()
        medium_grade_categories = res_framwork['result']['framework']['categories']

        medium_to_compare = self.get_medium_mapped(medium.lower())
        print("medium_to_compare-->", medium_to_compare)

        for category in medium_grade_categories:
              if "medium" in category["code"]:
                 for term in category["terms"]:
                    medium_list.append(term['name'])
                    if medium_to_compare in term["name"]:
                       medium_available = True
                       for association in term["associations"]:
                          if association["category"] == "gradeLevel":
                             grade_list.append(association['description'])

                       print("medium matched-->", medium_available)
                       break
        return medium_list

     def grade_db(self, grade):

        grade_to_compare = self.get_grade_mapped(grade.lower())
        print("grade_to_compare-->", grade_to_compare)

        print("grade_list in grade_db-->", grade_list)
        return grade_list

     def validate_board(self,
                        value: Text,
                        dispatcher: CollectingDispatcher,
                        tracker: Tracker,
                        domain: Dict[Text, Any]) -> Text:
        global board_identifier
        board_list, res_json = self.board_db(value)
        api_matching_board = self.get_board_api_mapped(value.lower())
        if(api_matching_board in board_list):
           board_identifier = api_matching_board
           return value
        else:
           get_reafactored_board = []
           get_reafactored_board = self.get_reafactored_board_mapped(
               board_list)
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Available boards are {board} : <br> ".format(board=get_reafactored_board),
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
      #   """Validate cuisine value."""
        medium_list = self.medium_grade_db(value)
        api_matching_medium = self.get_medium_mapped(value.lower())
        if (api_matching_medium in medium_list):
           return value
        else:
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Available mediums for {board} board are : <br> {medium}".format(
                       board=tracker.get_slot('board'), medium=medium_list),
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
        grades = self.grade_db(value)
        api_matching_grade = self.get_grade_mapped(value.lower())
        if (api_matching_grade in grades):
           return value
        else:
           elements = [{
               "blocks": [{
                   "intent": "greet",
                   "text": "Available grades for {medium} medium in {board} board are : <br> {grades}".format(
                       medium=tracker.get_slot('medium'), board=tracker.get_slot('board'), grades=grade_list),
                   "type": "response"
               }]
           }]
           dispatcher.utter_message(json_message=elements)
           return None

     def submit(self, dispatcher: CollectingDispatcher,
                tracker: Tracker,
                domain: Dict[Text, Any]) -> List[Dict]:

        print("inside content_form")

        board = tracker.get_slot('board')
        grade = tracker.get_slot('grade')
        medium = tracker.get_slot('medium')

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
