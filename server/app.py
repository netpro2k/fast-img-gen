#!/usr/bin/env python3

from diffusers import DiffusionPipeline
import torch

def create_pipe(gpu):
    pipe = DiffusionPipeline.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=torch.float16,
        use_safetensors=True,
        variant="fp16",
    )
    pipe.to(f'cuda:{gpu}')
    return pipe

pipes = [create_pipe(gpu) for gpu in range(3)]


from flask import Flask, jsonify, send_file, request
import io
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)

IMAGE_DIR = 'static/images'
os.makedirs(IMAGE_DIR, exist_ok=True)

def generate_image(pipe, prompt, url_root):
    image = pipe(prompt=prompt, num_inference_steps=1, guidance_scale=0.0).images[0]
    image_filename = f"{uuid.uuid4().hex}.png"
    image_path = os.path.join(IMAGE_DIR, image_filename)

    image.save(image_path)

    return f"{url_root}{image_path}"

@app.route('/get-image', methods=['GET'])
def get_image():
    prompt = request.args.get('prompt')

    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(generate_image, pipe, prompt, request.url_root) for pipe in pipes]
        images = [future.result() for future in as_completed(futures)]

    return jsonify(
        prompt = prompt,
        images = images
    )

if __name__ == '__main__':
    app.run(debug = True, host = '0.0.0.0')
