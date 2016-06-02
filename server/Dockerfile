FROM node
RUN curl -s https://pagekite.net/pk/ | bash
COPY . /app
RUN cd /app && npm install
EXPOSE 53/udp 5300
CMD sh /app/run.sh
