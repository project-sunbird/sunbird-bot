FROM rasa/rasa:1.9.4-full
WORKDIR /app
USER root
RUN python3 -m spacy download en_core_web_sm
RUN python3 -m spacy link -f en_core_web_sm  en_core_web_sm

COPY ./ /app/actions
EXPOSE 5006
CMD ["run", "actions"]
