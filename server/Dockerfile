FROM nvidia/cuda:12.1.1-devel-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y python3 python3-pip

RUN mkdir -p /app
WORKDIR /app

COPY requirements.txt /app
RUN pip3 install -r requirements.txt

RUN mkdir -p /huggingface

COPY . /app

CMD python3 app.py
