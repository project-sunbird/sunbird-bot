FROM rasa/rasa:2.8.6-full as trainer
COPY . /app
RUN rasa train

FROM rasa/rasa:2.8.6-full
COPY --from=trainer /app .
EXPOSE 5005
CMD ["run", "--enable-api"]