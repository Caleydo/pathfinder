FROM nginx:alpine

MAINTAINER Samuel Gratzl <samuel.gratzl@datavisyn.io>

ENV PHOVEA_API_SERVER=api
COPY ./deploy/nginx-default.conf /etc/nginx/conf.d/default.conf
CMD sed -i -e "s/PHOVEA_API_SERVER/${PHOVEA_API_SERVER-api}/g" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
COPY ./build /usr/share/nginx/html
