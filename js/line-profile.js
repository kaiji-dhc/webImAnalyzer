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
        this.mode = 'brightness';
        this.largeCanvas = document.getElementById('lineProfileChartLarge');
        this.largeCtx = this.largeCanvas?.getContext('2d');
        this.largeZoom = 1;
        this.currentValues = null;
        this.initPanZoom();
    }

    setMode(mode) {
        this.mode = mode;
    }

    draw(values) {
        if (!this.ctx || !values) return;
        this.currentValues = values;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);
        const len = values.brightness.length;
        // When only one point is present, drawing a line causes division by zero
        // in the position calculations. In that case simply skip drawing.
        if (len <= 1) {
            return;
        }
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

        const channels = {
            brightness: [{ key: 'brightness', color: 'black' }],
            red: [{ key: 'r', color: 'red' }],
            green: [{ key: 'g', color: 'green' }],
            blue: [{ key: 'b', color: 'blue' }],
            'rgb-overlay': [
                { key: 'r', color: 'red' },
                { key: 'g', color: 'green' },
                { key: 'b', color: 'blue' }
            ]
        };
        (channels[this.mode] || channels.brightness).forEach(ch =>
            drawChannel(values[ch.key], ch.color)
        );
    }

    drawLarge(values) {
        if (!this.largeCtx || !values) return;
        this.currentValues = values;
        const len = values.brightness.length;
        const baseWidth = Math.max(len * 5, 500);
        const width = baseWidth * this.largeZoom;
        this.largeCanvas.width = width;
        const height = this.largeCanvas.height;
        const padding = { top: 20, bottom: 60, left: 40, right: 20 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        this.largeCtx.clearRect(0, 0, width, height);
        const maxVal = 255;
        const step = Math.max(1, Math.floor(5 / this.largeZoom));

        // 軸
        this.largeCtx.strokeStyle = '#dee2e6';
        this.largeCtx.lineWidth = 1;
        this.largeCtx.beginPath();
        this.largeCtx.moveTo(padding.left, padding.top);
        this.largeCtx.lineTo(padding.left, height - padding.bottom);
        this.largeCtx.lineTo(width - padding.right, height - padding.bottom);
        this.largeCtx.stroke();

        // 軸ラベル
        this.largeCtx.fillStyle = '#495057';
        this.largeCtx.font = '12px sans-serif';
        this.largeCtx.textAlign = 'center';
        this.largeCtx.fillText('距離(px)', padding.left + plotWidth / 2, height - padding.bottom + 35);
        this.largeCtx.save();
        this.largeCtx.translate(15, padding.top + plotHeight / 2);
        this.largeCtx.rotate(-Math.PI / 2);
        this.largeCtx.fillText('画素値', 0, 0);
        this.largeCtx.restore();

        this.largeCtx.textAlign = 'left';

        // Avoid divide by zero when the sampled line has only one pixel
        if (len <= 1) {
            return;
        }

        const drawChannel = (data, color) => {
            this.largeCtx.beginPath();
            data.forEach((v, i) => {
                const x = padding.left + (i / (len - 1)) * plotWidth;
                const y = padding.top + (1 - v / maxVal) * plotHeight;
                if (i === 0) this.largeCtx.moveTo(x, y);
                else this.largeCtx.lineTo(x, y);
            });
            this.largeCtx.strokeStyle = color;
            this.largeCtx.lineWidth = 1;
            this.largeCtx.stroke();

            this.largeCtx.font = '10px sans-serif';
            for (let i = 0; i < len; i += step) {
                const x = padding.left + (i / (len - 1)) * plotWidth;
                const y = padding.top + (1 - data[i] / maxVal) * plotHeight;
                this.largeCtx.fillStyle = color;
                this.largeCtx.beginPath();
                this.largeCtx.arc(x, y, 2, 0, Math.PI * 2);
                this.largeCtx.fill();
                this.largeCtx.fillText(data[i], x + 2, y - 4);

                this.largeCtx.fillStyle = '#495057';
                this.largeCtx.textAlign = 'center';
                this.largeCtx.fillText(i, x, height - padding.bottom + 15);
                this.largeCtx.textAlign = 'left';
            }
        };

        const channels = {
            brightness: [{ key: 'brightness', color: 'black' }],
            red: [{ key: 'r', color: 'red' }],
            green: [{ key: 'g', color: 'green' }],
            blue: [{ key: 'b', color: 'blue' }],
            'rgb-overlay': [
                { key: 'r', color: 'red' },
                { key: 'g', color: 'green' },
                { key: 'b', color: 'blue' }
            ]
        };
        (channels[this.mode] || channels.brightness).forEach(ch =>
            drawChannel(values[ch.key], ch.color)
        );
    }

    resetView() {
        this.largeZoom = 1;
        const container = document.querySelector('#lineProfileModal .histogram-scroll-container');
        if (container) container.scrollLeft = 0;
    }

    initPanZoom() {
        if (!this.largeCanvas) return;
        const container = document.querySelector('#lineProfileModal .histogram-scroll-container');
        if (!container) return;
        let isPanning = false;
        let startX = 0;
        let scrollStart = 0;

        this.largeCanvas.addEventListener('mousedown', (e) => {
            isPanning = true;
            startX = e.clientX;
            scrollStart = container.scrollLeft;
            this.largeCanvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            const dx = e.clientX - startX;
            container.scrollLeft = scrollStart - dx;
        });

        window.addEventListener('mouseup', () => {
            isPanning = false;
            this.largeCanvas.style.cursor = 'default';
        });

        this.largeCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            this.largeZoom = Math.min(Math.max(this.largeZoom * zoomFactor, 1), 20);
            this.drawLarge(this.currentValues);
        });
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

        const modeButtons = document.querySelectorAll('.line-profile-mode-selector .mode-btn');
        if (modeButtons.length > 0) {
            modeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    modeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.graph.setMode(btn.dataset.mode);
                    if (this.lastValues) {
                        this.graph.draw(this.lastValues);
                        this.graph.drawLarge(this.lastValues);
                    }
                });
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
        this.graph.resetView();
        this.graph.drawLarge(this.lastValues);
    }

    closeModal() {
        const modal = document.getElementById('lineProfileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}
