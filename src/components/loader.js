class Circle {
    static minCellSize = 100;

    constructor(x, y) {
        this.radius = Math.round(20 + Math.random() * 30); // [20, 50]
        this.position = {
            x: x ?? 0,
            y: y ?? 0
        }
        this.flashSpeed = Math.random() * 0.03
        this.theta = Math.random() * Math.PI * 2;
    }

    static generateCircles(amount, canvasWidth, canvasHeight) {
        const rows = Math.trunc(canvasHeight / this.minCellSize);
        const cols = Math.trunc(canvasWidth / this.minCellSize);

        let cellHeight = Math.trunc(canvasHeight / rows);
        let cellWidth = Math.trunc(canvasWidth / cols);

        const getEmptyCellCenter = (grid, attempts = 10) => {
            if (attempts <= 0) {
                return null;
            }

            const gridRow = Math.trunc(Math.random() * grid.length);
            const gridCol = Math.trunc(Math.random() * grid[gridRow].length);

            if (!grid[gridRow][gridCol]) {
                grid[gridRow][gridCol] = true;
                return {
                    x: cellHeight * (gridCol + 0.5),
                    y: cellWidth * (gridRow + 0.5),
                }
            } else {
                return getEmptyCellCenter(grid, --attempts);
            }
        }

        const grid = [];
        for (let r = 0; r < rows; r++) {
            grid.push([]);
            for(let c = 0; c < cols; c++) {
                grid[r].push(false);
            }
        }

        const circles = [];
        for (let i = 0; i < amount; i++) {
            const cell = getEmptyCellCenter(grid);
            if (cell) {
                circles.push(new Circle(cell.x, cell.y));
            }
        }
        return circles;
    }

    getFillStyle() {
        this.theta += this.flashSpeed;
        const opacity = (Math.sin(this.theta * 2 * Math.PI) + 1) * 50;
        return `rgb(100 100 100 / ${opacity}%)`
    }

    /**
     * @param {CanvasRenderingContext2D} context
     */
    draw(context) {
        context.beginPath();
        context.fillStyle = this.getFillStyle();
        context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI, false);
        context.fill();
    }
}

export class Loader {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas, totalAttempts) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d");
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.totalAttempts = totalAttempts;
        this.attempt = 0;

        /**
         * Stores current animation frame id
         * @type {number}
         * @private
         */
        this.animationId = null;
    }

    showLoading() {
        if (this.animationId) {
            return;
        }
        this.circles = Circle.generateCircles(30, this.canvasWidth, this.canvasHeight);
        this.animationId = window.requestAnimationFrame(this.draw);
    }

    hideLoading() {
        this.animationId && window.cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }

    setAttempt(value) {
        this.attempt = value;
    }

    drawAttempts = () => {
        this.context.fillStyle = "rgba(100 100 100 / 100%)";
        this.context.font = "90px serif";
        this.context.textAlign = "center";
        this.context.strokeStyle = "rgba(10 10 10 / 100%)";
        const text = `Attempt ${this.attempt} out of ${this.totalAttempts}`;
        this.context.fillText(text, this.canvasHeight / 2, this.canvasWidth / 2);
        this.context.strokeText(text, this.canvasHeight / 2, this.canvasWidth / 2);
    }

    draw = () => {
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.circles.forEach(c => c.draw(this.context));
        this.drawAttempts();

        this.animationId = window.requestAnimationFrame(this.draw);
    }
}
