/**
 * ImageAnalyzer - 画像処理モジュール
 * 画像の読み込み、表示、座標変換等の機能
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * 画像ファイルの読み込み
     * @param {File} file - 読み込む画像ファイル
     */
    loadImage(file) {
        console.log('Loading image:', file.name, file.type, file.size);
        
        // ファイル形式チェック
        if (!file.type.match(/^image\/(jpeg|jpg|png|bmp|tiff|tif|webp|gif)$/i)) {
            alert('画像ファイルを選択してください。（JPEG、PNG、BMP、TIFF、WebP、GIF対応）');
            return;
        }

        // ファイルサイズチェック（50MB制限）
        if (file.size > 50 * 1024 * 1024) {
            alert('ファイルサイズが大きすぎます。50MB以下のファイルを選択してください。');
            return;
        }

        this.setStatusMessage('画像を読み込み中...');

        const reader = new FileReader();
        
        reader.onload = (e) => {
            console.log('FileReader loaded successfully');
            const img = new Image();
            
            img.onload = () => {
                console.log('Image loaded:', img.width, 'x', img.height);
                this.currentImage = img;
                this.showImageCanvas();
                this.resetAnalysisData();
                
                // DOM更新を待ってから画像表示
                setTimeout(() => {
                    this.displayImage();
                }, 50);
            };
            
            img.onerror = (error) => {
                console.error('Image load error:', error);
                alert('画像の読み込みに失敗しました。ファイルが破損している可能性があります。');
                this.setStatusMessage('画像の読み込みに失敗しました');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            alert('ファイルの読み込みに失敗しました。');
            this.setStatusMessage('ファイルの読み込みに失敗しました');
        };
        
        reader.readAsDataURL(file);
    },

    /**
     * UI要素の表示切り替え（ドロップゾーン→キャンバス）
     */
    showImageCanvas() {
        this.dropZone.classList.add('hidden');
        this.canvas.classList.remove('hidden');
    },

    /**
     * 解析データのリセット
     */
    resetAnalysisData() {
        this.currentRect = null;
        this.currentHistogramData = null;
        
        // SN比表示をリセット
        const elements = ['snRatio', 'signalValue', 'noiseValue', 'pixelCount', 'avgBrightness'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
        
        // カーソル情報をクリア
        this.clearCursorInfo();
        
        // 特定値入力をクリア
        const specificInput = document.getElementById('specificValue');
        const specificResult = document.getElementById('specificResult');
        if (specificInput) specificInput.value = '';
        if (specificResult) specificResult.textContent = '--';
        
        // ヒストグラムをリセット
        if (this.drawEmptyHistogram) {
            this.drawEmptyHistogram();
        }
    },

    /**
     * 画像の表示
     */
    displayImage() {
        if (!this.currentImage) {
            console.error('No image to display');
            return;
        }

        try {
            const imagePanel = document.querySelector('.image-panel');
            const panelRect = imagePanel.getBoundingClientRect();
            
            // 利用可能サイズの計算
            const availableWidth = Math.max(300, panelRect.width - 80);
            const availableHeight = Math.max(200, panelRect.height - 180);
            
            const { width: originalWidth, height: originalHeight } = this.currentImage;
            const displayAreaWidth = availableWidth - (this.imageMargin * 2);
            const displayAreaHeight = availableHeight - (this.imageMargin * 2);

            // スケール計算
            const scaleToFit = Math.min(displayAreaWidth / originalWidth, displayAreaHeight / originalHeight);
            const minScale = Math.min(200 / originalWidth, 150 / originalHeight);
            const finalScale = Math.max(minScale, Math.min(scaleToFit, 3.0));
            
            this.displayedWidth = originalWidth * finalScale;
            this.displayedHeight = originalHeight * finalScale;

            console.log('Display size:', this.displayedWidth, 'x', this.displayedHeight, 'Scale:', finalScale);

            // Canvas設定
            this.canvas.width = this.displayedWidth + (this.imageMargin * 2);
            this.canvas.height = this.displayedHeight + (this.imageMargin * 2);
            this.imageOffsetX = this.imageMargin;
            this.imageOffsetY = this.imageMargin;

            // 描画
            this.redrawCanvas();
            
            const statusMessage = `画像表示完了: ${Math.round(this.displayedWidth)} × ${Math.round(this.displayedHeight)} px (スケール: ${(finalScale * 100).toFixed(1)}%)`;
            this.setStatusMessage(statusMessage);
            
        } catch (error) {
            console.error('Error displaying image:', error);
            this.setStatusMessage('画像の表示中にエラーが発生しました');
        }
    },

    /**
     * Canvasの再描画（画像のみ）
     */
    redrawCanvas() {
        if (!this.currentImage) return;
        
        // キャンバスクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景
        this.ctx.fillStyle = '#e9ecef';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 画像描画
        this.ctx.drawImage(
            this.currentImage, 
            this.imageOffsetX, 
            this.imageOffsetY, 
            this.displayedWidth, 
            this.displayedHeight
        );
        
        // 画像境界線
        this.ctx.strokeStyle = '#6c757d';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
            this.imageOffsetX - 0.5, 
            this.imageOffsetY - 0.5, 
            this.displayedWidth + 1, 
            this.displayedHeight + 1
        );
    },

    /**
     * 元画像から1ピクセルの純粋なデータを取得
     * @param {number} originalX - 元画像のX座標
     * @param {number} originalY - 元画像のY座標
     * @returns {Object|null} ピクセルデータ {r, g, b, a, brightness}
     */
    getOriginalPixelData(originalX, originalY) {
        if (!this.currentImage) return null;
        
        // 境界チェック
        if (originalX < 0 || originalX >= this.currentImage.width || 
            originalY < 0 || originalY >= this.currentImage.height) {
            return null;
        }

        try {
            // 1ピクセル用の隠しCanvas
            const pixelCanvas = document.createElement('canvas');
            const pixelCtx = pixelCanvas.getContext('2d');
            pixelCanvas.width = 1;
            pixelCanvas.height = 1;
            
            // 元画像から1ピクセルを描画
            pixelCtx.drawImage(
                this.currentImage,
                originalX, originalY, 1, 1,
                0, 0, 1, 1
            );
            
            // ピクセルデータを取得
            const imageData = pixelCtx.getImageData(0, 0, 1, 1);
            const pixel = imageData.data;
            
            const result = {
                r: pixel[0],
                g: pixel[1],
                b: pixel[2],
                a: pixel[3],
                brightness: Math.round(0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2])
            };
            
            // メモリ解放
            pixelCanvas.width = 0;
            pixelCanvas.height = 0;
            
            return result;
            
        } catch (error) {
            console.warn('Failed to get pixel data:', error);
            return null;
        }
    },

    /**
     * 座標変換: 表示座標 → 元画像座標
     * @param {number} displayX - 表示X座標
     * @param {number} displayY - 表示Y座標
     * @returns {Object|null} 元画像座標 {x, y}
     */
    displayToOriginalCoords(displayX, displayY) {
        if (!this.currentImage || this.displayedWidth === 0 || this.displayedHeight === 0) {
            return null;
        }
        
        // 画像領域内の座標に変換
        const imageX = displayX - this.imageOffsetX;
        const imageY = displayY - this.imageOffsetY;
        
        // 画像領域内かチェック
        if (imageX < 0 || imageX >= this.displayedWidth || 
            imageY < 0 || imageY >= this.displayedHeight) {
            return null;
        }
        
        // 元画像座標に変換
        // Math.round を使用すると右端/下端付近で width/height を超える値に丸められることがあるため
        // Math.floor で切り捨て、さらに最大値を width-1 / height-1 に制限する
        const originalX = Math.min(
            Math.floor((imageX / this.displayedWidth) * this.currentImage.width),
            this.currentImage.width - 1
        );
        const originalY = Math.min(
            Math.floor((imageY / this.displayedHeight) * this.currentImage.height),
            this.currentImage.height - 1
        );

        return { x: originalX, y: originalY };
    },

    /**
     * 座標変換: 元画像座標 → 表示座標
     * @param {number} originalX - 元画像X座標
     * @param {number} originalY - 元画像Y座標
     * @returns {Object|null} 表示座標 {x, y}
     */
    originalToDisplayCoords(originalX, originalY) {
        if (!this.currentImage || this.displayedWidth === 0 || this.displayedHeight === 0) {
            return null;
        }
        
        // 元画像の範囲内かチェック
        if (originalX < 0 || originalX >= this.currentImage.width ||
            originalY < 0 || originalY >= this.currentImage.height) {
            return null;
        }
        
        // 表示座標に変換
        const imageX = (originalX / this.currentImage.width) * this.displayedWidth;
        const imageY = (originalY / this.currentImage.height) * this.displayedHeight;
        
        const displayX = imageX + this.imageOffsetX;
        const displayY = imageY + this.imageOffsetY;
        
        return { x: displayX, y: displayY };
    },

    /**
     * 画像のスケール情報を取得
     * @returns {Object} スケール情報
     */
    getScaleInfo() {
        if (!this.currentImage || this.displayedWidth === 0 || this.displayedHeight === 0) {
            return null;
        }
        
        return {
            scaleX: this.currentImage.width / this.displayedWidth,
            scaleY: this.currentImage.height / this.displayedHeight,
            originalWidth: this.currentImage.width,
            originalHeight: this.currentImage.height,
            displayedWidth: this.displayedWidth,
            displayedHeight: this.displayedHeight
        };
    }
});