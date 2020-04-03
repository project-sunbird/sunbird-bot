FROM rasa/rasa:1.9.4-full
COPY . /app
RUN rasa train

FROM rasa/rasa:1.9.4-full
COPY --from=0 /app .
EXPOSE 5005
CMD ["run", "--enable-api"]