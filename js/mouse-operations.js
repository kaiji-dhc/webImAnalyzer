/**
 * ImageAnalyzer - マウス操作モジュール
 * マウスによる矩形描画、カーソル情報表示等の機能
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * 矩形描画開始
     * @param {MouseEvent} e - マウスイベント
     */
    startDrawing(e) {
        if (!this.currentImage) return;

        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        this.startX = (e.clientX - rect.left) * scaleX;
        this.startY = (e.clientY - rect.top) * scaleY;
        
        this.canvas.classList.add('drawing');
        this.setStatusMessage('矩形を描画中...');
    },

    /**
     * パン開始
     * @param {MouseEvent} e - マウスイベント
     */
    startPan(e) {
        if (!this.currentImage) return;

        this.isPanning = true;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.panStartX = (e.clientX - rect.left) * scaleX;
        this.panStartY = (e.clientY - rect.top) * scaleY;

        this.canvas.classList.add('panning');
    },

    /**
     * パン処理
     * @param {MouseEvent} e - マウスイベント
     */
    panImage(e) {
        if (!this.isPanning) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        this.panX += currentX - this.panStartX;
        this.panY += currentY - this.panStartY;
        this.panStartX = currentX;
        this.panStartY = currentY;

        this.redrawCanvas();
    },

    /**
     * パン終了
     */
    endPan() {
        this.isPanning = false;
        this.canvas.classList.remove('panning');
    },

    /**
     * ホイールによるズーム
     * @param {WheelEvent} e - ホイールイベント
     */
    handleWheel(e) {
        if (!this.currentImage) return;
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomFactor));
        this.redrawCanvas();
    },

    /**
     * 矩形描画中
     * @param {MouseEvent} e - マウスイベント
     */
    drawRectangle(e) {
        if (!this.isDrawing || !this.currentImage) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        // 画像を再描画
        this.redrawCanvas();
        
        // 矩形の描画
        this.drawSelectionRectangle(this.startX, this.startY, currentX, currentY);
    },

    /**
     * 選択矩形の描画
     * @param {number} startX - 開始X座標
     * @param {number} startY - 開始Y座標
     * @param {number} currentX - 現在X座標
     * @param {number} currentY - 現在Y座標
     */
    drawSelectionRectangle(startX, startY, currentX, currentY) {
        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectWidth = Math.abs(currentX - startX);
        const rectHeight = Math.abs(currentY - startY);

        this.ctx.save();
        
        // 半透明の塗りつぶし
        this.ctx.fillStyle = 'rgba(255, 71, 87, 0.2)';
        this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        
        // 枠線
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        
        // 角のグリップ（ハンドル）
        const gripSize = 6;
        this.ctx.fillStyle = '#ff4757';
        const grips = [
            [rectX - gripSize/2, rectY - gripSize/2],                    // 左上
            [rectX + rectWidth - gripSize/2, rectY - gripSize/2],        // 右上
            [rectX - gripSize/2, rectY + rectHeight - gripSize/2],       // 左下
            [rectX + rectWidth - gripSize/2, rectY + rectHeight - gripSize/2] // 右下
        ];
        
        grips.forEach(([x, y]) => {
            this.ctx.fillRect(x, y, gripSize, gripSize);
        });
        
        this.ctx.restore();

        // サイズ情報を表示
        if (rectWidth > 20 && rectHeight > 20) {
            this.showRectangleSize(rectX, rectY, rectWidth, rectHeight);
        }
    },

    /**
     * 矩形サイズ情報の表示
     * @param {number} rectX - 矩形X座標
     * @param {number} rectY - 矩形Y座標
     * @param {number} rectWidth - 矩形幅
     * @param {number} rectHeight - 矩形高さ
     */
    showRectangleSize(rectX, rectY, rectWidth, rectHeight) {
        if (!this.currentImage || this.displayedWidth === 0 || this.displayedHeight === 0) return;
        
        // 元画像サイズに変換
        const scaleX = this.currentImage.width / this.displayedWidth;
        const scaleY = this.currentImage.height / this.displayedHeight;
        
        const originalWidth = Math.round(rectWidth * scaleX);
        const originalHeight = Math.round(rectHeight * scaleY);
        
        // サイズ表示の背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(rectX, rectY - 25, 140, 20);
        
        // サイズテキスト
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`${originalWidth} × ${originalHeight} px`, rectX + 5, rectY - 10);
    },

    /**
     * 矩形描画終了
     * @param {MouseEvent} e - マウスイベント
     */
    endDrawing(e) {
        if (!this.isDrawing || !this.currentImage) return;
        
        this.isDrawing = false;
        this.canvas.classList.remove('drawing');
        
        // 最終座標を計算
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const endX = (e.clientX - rect.left) * scaleX;
        const endY = (e.clientY - rect.top) * scaleY;

        // 矩形を画像範囲内に制限
        const rectData = this.calculateClampedRectangle(this.startX, this.startY, endX, endY);
        
        if (rectData.width > 3 && rectData.height > 3) {
            this.currentRect = rectData;
            
            // 解析実行（非同期で安全に）
            setTimeout(() => {
                if (this.performImageAnalysis) {
                    this.performImageAnalysis();
                }
            }, 10);
            
        } else {
            this.setStatusMessage('矩形が小さすぎます - より大きな領域を選択してください');
            this.redrawCanvas(); // 矩形を消去
        }
    },

    /**
     * 矩形の範囲制限計算
     * @param {number} startX - 開始X座標
     * @param {number} startY - 開始Y座標
     * @param {number} endX - 終了X座標
     * @param {number} endY - 終了Y座標
     * @returns {Object} 制限された矩形データ
     */
    calculateClampedRectangle(startX, startY, endX, endY) {
        const imageLeft = this.imageOffsetX;
        const imageTop = this.imageOffsetY;
        const imageRight = this.imageOffsetX + this.displayedWidth;
        const imageBottom = this.imageOffsetY + this.displayedHeight;

        const rectLeft = Math.max(imageLeft, Math.min(startX, endX));
        const rectTop = Math.max(imageTop, Math.min(startY, endY));
        const rectRight = Math.min(imageRight, Math.max(startX, endX));
        const rectBottom = Math.min(imageBottom, Math.max(startY, endY));

        return {
            x: rectLeft,
            y: rectTop,
            width: rectRight - rectLeft,
            height: rectBottom - rectTop
        };
    },

    /**
     * カーソル情報の更新
     * @param {MouseEvent} e - マウスイベント
     */
    updateCursorInfo(e) {
        if (!this.currentImage) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        // 元画像座標に変換
        const originalCoords = this.displayToOriginalCoords(canvasX, canvasY);
        
        if (!originalCoords) {
            this.clearCursorInfo();
            return;
        }

        // 座標を表示
        this.updateCoordinateDisplay(originalCoords.x, originalCoords.y);

        // 元画像からピクセル情報を取得
        const pixelData = this.getOriginalPixelData(originalCoords.x, originalCoords.y);
        if (pixelData) {
            this.updatePixelDisplay(pixelData);
        } else {
            this.clearCursorInfo();
        }
    },

    /**
     * 座標表示の更新
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    updateCoordinateDisplay(x, y) {
        const cursorXElem = document.getElementById('cursorX');
        const cursorYElem = document.getElementById('cursorY');
        
        if (cursorXElem) cursorXElem.textContent = x;
        if (cursorYElem) cursorYElem.textContent = y;
    },

    /**
     * ピクセル情報表示の更新
     * @param {Object} pixelData - ピクセルデータ {r, g, b, brightness}
     */
    updatePixelDisplay(pixelData) {
        const elements = {
            pixelR: document.getElementById('pixelR'),
            pixelG: document.getElementById('pixelG'),
            pixelB: document.getElementById('pixelB'),
            pixelBrightness: document.getElementById('pixelBrightness')
        };
        
        if (elements.pixelR) {
            elements.pixelR.textContent = `R: ${pixelData.r}`;
            elements.pixelR.style.color = '#ff6b6b';
        }
        if (elements.pixelG) {
            elements.pixelG.textContent = `G: ${pixelData.g}`;
            elements.pixelG.style.color = '#51cf66';
        }
        if (elements.pixelB) {
            elements.pixelB.textContent = `B: ${pixelData.b}`;
            elements.pixelB.style.color = '#339af0';
        }
        if (elements.pixelBrightness) {
            elements.pixelBrightness.textContent = pixelData.brightness;
        }
    },

    /**
     * カーソル情報のクリア
     */
    clearCursorInfo() {
        const elements = [
            { id: 'cursorX', text: '--' },
            { id: 'cursorY', text: '--' },
            { id: 'pixelR', text: 'R: --' },
            { id: 'pixelG', text: 'G: --' },
            { id: 'pixelB', text: 'B: --' },
            { id: 'pixelBrightness', text: '--' }
        ];
        
        elements.forEach(({ id, text }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
                element.style.color = '';
            }
        });
    },

    /**
     * マウス座標をCanvas座標に変換
     * @param {MouseEvent} e - マウスイベント
     * @returns {Object} Canvas座標 {x, y}
     */
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    /**
     * 現在選択されている矩形の情報を取得
     * @returns {Object|null} 矩形情報（元画像座標系）
     */
    getCurrentRectangleInfo() {
        if (!this.currentRect || !this.currentImage) return null;
        
        const scaleInfo = this.getScaleInfo();
        if (!scaleInfo) return null;
        
        // 表示座標から元画像座標に変換
        const originalX = Math.round((this.currentRect.x - this.imageOffsetX) * scaleInfo.scaleX);
        const originalY = Math.round((this.currentRect.y - this.imageOffsetY) * scaleInfo.scaleY);
        const originalWidth = Math.round(this.currentRect.width * scaleInfo.scaleX);
        const originalHeight = Math.round(this.currentRect.height * scaleInfo.scaleY);
        
        return {
            x: originalX,
            y: originalY,
            width: originalWidth,
            height: originalHeight,
            displayRect: this.currentRect
        };
    }
});