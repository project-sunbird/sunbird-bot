FROM rasa/rasa:1.9.4-full as trainer
COPY . /app
RUN rasa train

FROM rasa/rasa:1.9.4-full
COPY --from=trainer /app .
EXPOSE 5005
CMD ["run", "--enable-api"]