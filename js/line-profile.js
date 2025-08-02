/**
 * Line profile analysis module
 * Provides line drawing, pixel sampling, graphing and peak detection.
 */

class LineDrawer {
    constructor(imageAnalyzer) {
        this.analyzer = imageAnalyzer;
        this.isDrawing = false;
        this.startPoint = null;
    }

    reset() {
        this.isDrawing = false;
        this.startPoint = null;
    }

    getCanvasPos(e) {
        const rect = this.analyzer.canvas.getBoundingClientRect();
        const scaleX = this.analyzer.canvas.width / rect.width;
        const scaleY = this.analyzer.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    start(e) {
        this.isDrawing = true;
        this.startPoint = this.getCanvasPos(e);
        this.analyzer.redrawCanvas();
    }

    draw(e) {
        if (!this.isDrawing) return;
        const current = this.getCanvasPos(e);
        this.analyzer.redrawCanvas();
        const ctx = this.analyzer.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.startPoint.x, this.startPoint.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
        ctx.restore();
    }

    end(e) {
        if (!this.isDrawing) return null;
        const endPoint = this.getCanvasPos(e);
        this.isDrawing = false;
        this.analyzer.redrawCanvas();
        // Draw final line
        const ctx = this.analyzer.ctx;
        ctx.save();
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.startPoint.x, this.startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.restore();
        return { start: this.startPoint, end: endPoint };
    }
}

class PixelSampler {
    static sample(analyzer, start, end) {
        const img = analyzer.currentImage;
        if (!img) return null;

        const scaleX = img.width / analyzer.displayedWidth;
        const scaleY = img.height / analyzer.displayedHeight;

        const x0 = Math.round((start.x - analyzer.imageOffsetX) * scaleX);
        const y0 = Math.round((start.y - analyzer.imageOffsetY) * scaleY);
        const x1 = Math.round((end.x - analyzer.imageOffsetX) * scaleX);
        const y1 = Math.round((end.y - analyzer.imageOffsetY) * scaleY);

        const dx = Math.abs(x1 - x0);
        const sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0);
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        let x = x0;
        let y = y0;

        const values = { r: [], g: [], b: [], brightness: [] };
        while (true) {
            const pixel = analyzer.getOriginalPixelData(x, y);
            if (pixel) {
                values.r.push(pixel.r);
                values.g.push(pixel.g);
                values.b.push(pixel.b);
                values.brightness.push(pixel.brightness);
            }
            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
        }
        return values;
    }
}

class PeakDetector {
    static findPeaks(values, threshold = 5) {
        const peaks = [];
        for (let i = 1; i < values.length - 1; i++) {
            if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
                if ((values[i] - values[i - 1] > threshold) && (values[i] - values[i + 1] > threshold)) {
                    peaks.push({ index: i, value: values[i] });
                }
            }
        }
        return peaks;
    }
}

class LineGraph {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
    }

    draw(values) {
        if (!this.ctx || !values) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);
        const len = values.brightness.length;
        if (len === 0) return;
        const maxVal = 255;

        const drawChannel = (data, color) => {
            ctx.beginPath();
            data.forEach((v, i) => {
                const x = (i / (len - 1)) * width;
                const y = height - (v / maxVal) * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        drawChannel(values.r, 'red');
        drawChannel(values.g, 'green');
        drawChannel(values.b, 'blue');
        drawChannel(values.brightness, 'black');
    }

    drawLarge(values) {
        const canvas = document.getElementById('lineProfileChartLarge');
        const ctx = canvas?.getContext('2d');
        if (!ctx || !values) return;

        const len = values.brightness.length;
        const width = Math.max(len * 5, 500);
        canvas.width = width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        const maxVal = 255;

        const drawChannel = (data, color, annotate = false) => {
            ctx.beginPath();
            data.forEach((v, i) => {
                const x = (i / (len - 1)) * width;
                const y = height - (v / maxVal) * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (annotate) {
                ctx.fillStyle = color;
                ctx.font = '10px sans-serif';
                for (let i = 0; i < len; i += 5) {
                    const x = (i / (len - 1)) * width;
                    const y = height - (data[i] / maxVal) * height;
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillText(data[i], x + 2, y - 2);
                }
            }
        };

        drawChannel(values.r, 'red');
        drawChannel(values.g, 'green');
        drawChannel(values.b, 'blue');
        drawChannel(values.brightness, 'black', true);
    }
}

class LineAnalyzer {
    constructor(imageAnalyzer) {
        this.imageAnalyzer = imageAnalyzer;
        this.drawer = new LineDrawer(imageAnalyzer);
        this.graph = new LineGraph(document.getElementById('lineProfileChart'));
        this.peakInfo = document.getElementById('peakInfo');
        this.lastValues = null;

        const chart = document.getElementById('lineProfileChart');
        if (chart) {
            chart.addEventListener('click', () => {
                if (this.lastValues) {
                    this.openModal();
                }
            });
        }
    }

    activate() {
        if (!this.imageAnalyzer.currentImage) {
            this.imageAnalyzer.setStatusMessage('まず画像を読み込んでください');
            return;
        }
        this.drawer.reset();
        this.imageAnalyzer.drawMode = 'line';
        this.imageAnalyzer.setStatusMessage('ラインの始点をクリックしてください');
    }

    start(e) {
        this.drawer.start(e);
    }

    draw(e) {
        this.drawer.draw(e);
    }

    end(e) {
        const line = this.drawer.end(e);
        if (!line) return;
        const values = PixelSampler.sample(this.imageAnalyzer, line.start, line.end);
        if (values) {
            this.lastValues = values;
            this.graph.draw(values);
            const peaks = PeakDetector.findPeaks(values.brightness);
            this.displayPeaks(peaks);
        }
        this.imageAnalyzer.drawMode = 'rect';
        if (this.imageAnalyzer.updateModeButtons) {
            this.imageAnalyzer.updateModeButtons('rect');
        }
    }

    displayPeaks(peaks) {
        if (!this.peakInfo) return;
        if (!peaks || peaks.length === 0) {
            this.peakInfo.textContent = 'ピークなし';
            return;
        }
        const text = peaks.map(p => `(${p.index}, ${p.value})`).join(', ');
        this.peakInfo.textContent = `ピーク: ${text}`;
    }

    openModal() {
        const modal = document.getElementById('lineProfileModal');
        if (!modal || !this.lastValues) return;
        modal.style.display = 'flex';
        this.graph.drawLarge(this.lastValues);
    }

    closeModal() {
        const modal = document.getElementById('lineProfileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}
