
const KEY_TOKEN = "KEY_TOKEN";
const SECRET_TOKEN = "SECRET_TOKEN";
const DESCRIPTION_TOKEN = "DESCRIPTION_TOKEN";
const STYLE_TOKEN = "STYLE_TOKEN";

const App = {
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
        },
        clearKeys() {
            localStorage.removeItem(KEY_TOKEN);
            localStorage.removeItem(SECRET_TOKEN);
            this.key = "";
            this.secret = "";
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

Vue.createApp(App).mount('#app')
