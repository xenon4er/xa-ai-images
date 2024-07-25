<script setup>
import {Loader} from './components/loader';
import {KEY_TOKEN, SECRET_TOKEN, DESCRIPTION_TOKEN, STYLE_TOKEN, styles} from './core/constants';
</script>

<template>
  <div class="content">
    <form class="container p-4 border-end border-secondary-subtle">
      <details v-bind:open="isAPISettingsOpened">
        <summary class="mb-2">API Settings</summary>
        <div class="row mb-3 form-floating">
          <input class="form-control" placeholder="key" id="keyControl" v-model="key" type="password" autocomplete="off">
          <label for="keyControl">Key</label>
        </div>
        <div class="row mb-3 form-floating">
          <input class="form-control" placeholder="secret" id="secretControl" v-model="secret" type="password" autocomplete="off">
          <label for="secretControl">Secret</label>
        </div>
        <div class="row mb-2">
          <div class="col-12 d-flex justify-content-between">
            <button type="button" class="btn btn-danger" v-bind:disabled="!(key && secret)" @click="saveKeys">Save to Local Storage</button>
            <button type="button" class="btn btn-primary" v-if="hasStoredKeys" @click="clearKeys">Clear Keys</button>
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-12 form-text">
            You don't have to store the keys.
          </div>
        </div>
      </details>
      <div class="row mb-1">
        <label class="col-12 col-form-label">Style:</label>
      </div>
      <div class="row mb-3">
        <div class="col-12">
          <div class="form-check" v-for="s in styles">
            <input class="form-check-input" type="radio" :value="s" v-model="style" v-bind:id="'style_' + s">
            <label class="form-check-label" v-bind:for="'style_' + s">
              {{ s }}
            </label>
          </div>
        </div>
      </div>
      <div class="row mb-3 form-floating">
        <textarea class="form-control" placeholder="Description" v-model="description" id="description"
          rows="10"></textarea>
        <label for="description">Description</label>
      </div>
      <div class="row mb-3">
        <button type="button" class="btn btn-success" v-on:click="submit" v-bind:disabled="isLoading">Generate</button>
      </div>
      <div class="row mb-3">
        <button type="button" class="btn btn-info" v-on:click="copyImageToClipboard" v-bind:disabled="isLoading">{{
          isCopyToClipboardSuccessfully ? 'Copied!' : 'Copy to Clipboard' }}</button>
      </div>
    </form>
    <div class="d-flex justify-content-center align-items-center">
      <canvas class="border border-secondary-subtle" ref="canvas" id="canvas" height="800px" width="800px"></canvas>
    </div>
  </div>
</template>

<script>
export default {
  data() {
        const styles = [
            "UHD",
            "KANDINSKY",
            "DEFAULT",
            "ANIME"
        ];
        return {
            isLoading: false,
            status: "None",
            description: "",
            styles,
            style: undefined,
            key: "",
            secret: "",
            isAPISettingsOpened: true,
            isCopyToClipboardSuccessfully: false,
            hasStoredKeys: false
        }
    },
    mounted() {
        this.canvas = this.$refs.canvas;
        this.loader = new Loader(this.canvas);
        this.description = localStorage.getItem(DESCRIPTION_TOKEN) ?? "";
        this.style = localStorage.getItem(STYLE_TOKEN) ?? this.styles[0];
        this.key = localStorage.getItem(KEY_TOKEN) ?? "";
        this.secret = localStorage.getItem(SECRET_TOKEN) ?? "";
        this.isAPISettingsOpened = !(this.key || this.secret);
        this.updateHasStoredKeys();
    },
    methods: {
        setLoading(value) {
            this.isLoading = value;
            value
                ? this.loader.showLoading()
                : this.loader.hideLoading();
        },
        saveKeys() {
            localStorage.setItem(KEY_TOKEN, this.key);
            localStorage.setItem(SECRET_TOKEN, this.secret);
            this.updateHasStoredKeys();
        },
        clearKeys() {
            localStorage.removeItem(KEY_TOKEN);
            localStorage.removeItem(SECRET_TOKEN);
            this.key = "";
            this.secret = "";
            this.updateHasStoredKeys();
        },
        updateHasStoredKeys() {
          this.hasStoredKeys = !!(this.key || this.secret);
        },
        getAccessHeaders() {
            return {
                "X-Key": `Key ${this.key}`,
                "X-Secret": `Secret ${this.secret}`,
            };
        },
        async submit() {
            localStorage.setItem(DESCRIPTION_TOKEN, this.description);
            localStorage.setItem(STYLE_TOKEN, this.style);
            this.setLoading(true);
            const uuid = await this.getImageUUID(this.description, this.style);
            const images = await this.checkImageStatus(uuid);
            this.setLoading(false);
            if (images) {
                this.draw(images[0]);
            }
        },
        async getImageUUID(query, style) {
            const form = new FormData();
            form.append("model_id", "4");
            form.append("params", new Blob([JSON.stringify({
                "type": "GENERATE",
                "style": style,
                "width": 1024,
                "height": 1024,
                "num_images": 1,
                "negativePromptUnclip": "яркие цвета, кислотность, высокая контрастность",
                "generateParams": {
                    "query": query,
                }
            })], { type: 'application/json' }));
            const imageReq = await fetch("https://api-key.fusionbrain.ai/key/api/v1/text2image/run", {
                method: "POST",
                body: form,
                headers: this.getAccessHeaders(),
            });
            const imageReqResult = await imageReq.json();

            this.status = imageReqResult?.status;

            return imageReqResult.uuid;
        },
        async checkImageStatus(uuid, attempts = 20, delay = 4000) {
            while (attempts > 0) {
                const req = await fetch(`https://api-key.fusionbrain.ai/key/api/v1/text2image/status/${uuid}`, {
                    method: "GET",
                    headers: this.getAccessHeaders(),
                });

                const data = await req.json();
                this.status = data.status;;
                if (data.status == 'DONE') {
                    return data.images;
                }

                attempts -= 1;

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, delay);
                })
            }

            this.status = "ERROR";
        },
        draw(base64Image) {
            const ctx = this.canvas.getContext("2d");

            const image = new Image();
            image.onload = () => {
                ctx.drawImage(image, 0, 0, image.width, image.height,
                                     0, 0, this.canvas.width, this.canvas.height);
            };
            image.src = `data:image/png;base64, ${base64Image}`;
        },
        copyImageToClipboard() {
            try {
                this.canvas.toBlob((blob) => {
                    navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': blob
                        }),
                    ]);
                })
                this.copyImageToClipboardSuccess();
            } catch (error) {
                console.error(error);
            }
        },
        copyImageToClipboardSuccess() {
            this.isCopyToClipboardSuccessfully = true;
            setTimeout(() => {
                this.isCopyToClipboardSuccessfully = false;
            }, 2000);
        }
    },
}
</script>

<style scoped>
.content {
  display: grid;
  grid-template-columns: 340px auto;
  column-gap: 24px;

  min-width: 0;
  min-height: 0;
  height: 100%;
}
</style>
