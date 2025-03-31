<script setup>
import { Loader } from './components/loader';
import debounce from "lodash/debounce";
import { KEY_TOKEN, SECRET_TOKEN, DESCRIPTION_TOKEN, STYLE_TOKEN, styles } from './core/constants';
</script>

<template>
  <div class="container-fluid h-100">
    <div class="row h-100">
      <div class="col-12 col-sm-12 col-lg-4 col-xl-3">
        <form class="container p-4">
          <details v-bind:open="isAPISettingsOpened">
            <summary class="mb-2">API Settings</summary>
            <div class="row mb-3">
              <div class="col-12">
                <a class="icon-link" title="Step-by-step guide on API key management"
                  href="https://fusionbrain.ai/docs/doc/poshagovaya-instrukciya-po-upravleniu-api-kluchami/"
                  target="_blank">
                  How to create keys
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                    class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                    <path fill-rule="evenodd"
                      d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5" />
                    <path fill-rule="evenodd"
                      d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                  </svg>
                </a>
              </div>
            </div>
            <div class="row mb-3 form-floating">
              <input class="form-control" placeholder="key" id="keyControl" v-model="key" type="password"
                autocomplete="off">
              <label for="keyControl">Key</label>
            </div>
            <div class="row mb-3 form-floating">
              <input class="form-control" placeholder="secret" id="secretControl" v-model="secret" type="password"
                autocomplete="off">
              <label for="secretControl">Secret</label>
            </div>
            <div class="row mb-2">
              <div class="col-12 d-flex justify-content-between">
                <button type="button" class="btn btn-danger" v-bind:disabled="!(key && secret)" @click="saveKeys">Save
                  to
                  Local Storage</button>
                <button type="button" class="btn btn-primary" v-if="hasStoredKeys" @click="clearKeys">Clear
                  Keys</button>
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
            <textarea class="form-control" placeholder="Description" v-model="description" id="description" rows="10"
              @keyup.ctrl.enter="submit"></textarea>
            <label for="description">Description</label>
          </div>
          <div class="row mb-3">
            <button type="button" class="btn btn-success" v-on:click="submit"
              v-bind:disabled="isLoading">Generate</button>
          </div>
          <div class="row mb-3">
            <button type="button" class="btn btn-info" v-on:click="copyImageToClipboard" v-bind:disabled="isLoading || !image">{{
              isCopyToClipboardSuccessfully ? 'Copied!' : 'Copy to Clipboard' }}</button>
          </div>
        </form>
      </div>
      <div class="col-12 col-sm-12 col-lg-8 col-xl-9 d-flex p-4">
        <div class="flex-grow-1 d-flex justify-content-center align-items-center" style="min-width: 0;">
          <canvas class="border border-secondary-subtle" v-bind:width="canvasWidth" v-bind:height="canvasHeight"
            ref="canvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const totalAttempts = 30;
export default {
  data() {
    return {
      isLoading: false,
      status: "None",
      description: "",
      styles: [
        "UHD",
        "KANDINSKY",
        "DEFAULT",
        "ANIME"
      ],
      style: undefined,
      key: "",
      secret: "",
      isAPISettingsOpened: true,
      isCopyToClipboardSuccessfully: false,
      hasStoredKeys: false,
      canvasHeight: 512,
      canvasWidth: 512,
      image: null,
      imageSize: 1024,
      modelId: null,
      url: "https://api-key.fusionbrain.ai/key/api/v1",
    }
  },
  computed: {
    canvas: function () {
      return this.$refs.canvas;
    },
  },
  mounted() {
    this.loader = new Loader(this.canvas, totalAttempts);
    this.description = localStorage.getItem(DESCRIPTION_TOKEN) ?? "";
    this.style = localStorage.getItem(STYLE_TOKEN) ?? this.styles[0];
    this.key = localStorage.getItem(KEY_TOKEN) ?? "";
    this.secret = localStorage.getItem(SECRET_TOKEN) ?? "";
    this.isAPISettingsOpened = !(this.key || this.secret);
    this.updateHasStoredKeys();
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  },
  methods: {
    beforeDestroy() {
      window.removeEventListener("resize", this.handleResize);
    },
    handleResize: function () {
      const oldSize = this.canvasWidth;
      const newSize = Math.min(this.canvas.parentNode.offsetWidth, 800);
      this.canvasHeight = newSize;
      this.canvasWidth = newSize;
      if (oldSize !== newSize) {
        this.loader.resize();
      }

      if (this.image) {
        debounce(() => this.drawImage(this.image), 100)();
      }
    },
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
      if (this.isLoading) {
        return;
      }
      this.image = null;
      localStorage.setItem(DESCRIPTION_TOKEN, this.description);
      localStorage.setItem(STYLE_TOKEN, this.style);
      this.setLoading(true);
      const uuid = await this.getImageUUID(this.description, this.style);
      const images = await this.checkImageStatus(uuid);
      this.setLoading(false);
      if (images) {
        this.image = await this.loadImage(images[0]);
        this.drawImage(this.image);
      }
    },
    async getModelId() {
      if (!this.modelId) {
        const modelsIdReq = await fetch(`${this.url}/pipelines`, {
            method: "GET",
            headers: this.getAccessHeaders(),
        });

        const models = await modelsIdReq.json();
        this.modelId = models[0].id;
      }

      return this.modelId;

    },
    async getImageUUID(query, style) {
      const form = new FormData();
      const modelId = await this.getModelId();
      form.append("pipeline_id", modelId);
      form.append("params", new Blob([JSON.stringify({
        "type": "GENERATE",
        "style": style,
        "width": this.imageSize,
        "height": this.imageSize,
        "numImages": 1,
        "negativePromptDecoder": "яркие цвета, кислотность, высокая контрастность",
        "generateParams": {
          "query": query,
        }
      })], { type: 'application/json' }));
      const imageReq = await fetch(`${this.url}/pipeline/run`, {
        method: "POST",
        body: form,
        headers: this.getAccessHeaders(),
      });
      const imageReqResult = await imageReq.json();

      this.status = imageReqResult?.status;

      return imageReqResult.uuid;
    },
    async checkImageStatus(uuid, attempts = totalAttempts, delay = 3000) {
      while (attempts > 0) {
        this.loader.setAttempt(totalAttempts - attempts + 1);
        const req = await fetch(`${this.url}/pipeline/status/${uuid}`, {
          method: "GET",
          headers: this.getAccessHeaders(),
        });

        const data = await req.json();
        this.status = data.status;
        if (data.status == 'DONE') {
          return data.result.files;
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
    async loadImage(base64Image) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          resolve(image);
        };
        image.src = `data:image/png;base64, ${base64Image}`;
      })
    },
    drawImage(image) {
      const ctx = this.canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, image.width, image.height,
        0, 0, this.canvas.scrollWidth, this.canvas.scrollHeight);
    },
    async copyImageToClipboard() {
      try {
        const blob = await new Promise((resolve) => {
          const canvas = document.createElement("canvas");
          canvas.width = this.image.width;
          canvas.height = this.image.height;
          const context = canvas.getContext("2d");
          context.drawImage(this.image, 0, 0);

          canvas.toBlob(blob => {
            resolve(blob);
          })
        });

        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
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

<style scoped></style>
