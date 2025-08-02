/**
 * ImageAnalyzer - UI制御モジュール
 * パラメータ操作、ヒストグラム制御、その他のUI制御機能
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * UI制御の初期化
     */
    initUIControls() {
        console.log('Initializing UI controls...');
        console.log('UI controls initialized');
    },
    
    /**
     * パラメータ保存機能
     */
    saveParameters() {
        try {
            const headers = [
                '撮影日時',
                'シャッタースピード',
                'F値',
                'ISO感度',
                'アナログゲイン',
                'デジタルゲイン',
                'ホワイトバランス',
                'R値',
                'G値',
                'B値',
                'SN比',
                '信号値',
                '雑音値',
                '画素数',
                '平均輝度',
                '解析領域サイズ',
                '矩形左上X',
                '矩形左上Y',
                '矩形右上X',
                '矩形右上Y',
                '矩形左下X',
                '矩形左下Y',
                '矩形右下X',
                '矩形右下Y'
            ];

            // 矩形座標の計算
            let rectCoords = ['', '', '', '', '', '', '', ''];
            if (this.currentRect && this.currentImage) {
                const scaleX = this.currentImage.width / this.displayedWidth;
                const scaleY = this.currentImage.height / this.displayedHeight;
                
                const x1 = Math.round((this.currentRect.x - this.imageOffsetX) * scaleX);
                const y1 = Math.round((this.currentRect.y - this.imageOffsetY) * scaleY);
                const x2 = Math.round((this.currentRect.x - this.imageOffsetX + this.currentRect.width) * scaleX);
                const y2 = Math.round((this.currentRect.y - this.imageOffsetY + this.currentRect.height) * scaleY);
                
                const clampedX1 = Math.max(0, Math.min(this.currentImage.width - 1, x1));
                const clampedY1 = Math.max(0, Math.min(this.currentImage.height - 1, y1));
                const clampedX2 = Math.max(0, Math.min(this.currentImage.width - 1, x2));
                const clampedY2 = Math.max(0, Math.min(this.currentImage.height - 1, y2));
                
                rectCoords = [
                    clampedX1,  // 左上X
                    clampedY1,  // 左上Y
                    clampedX2,  // 右上X
                    clampedY1,  // 右上Y
                    clampedX1,  // 左下X
                    clampedY2,  // 左下Y
                    clampedX2,  // 右下X
                    clampedY2   // 右下Y
                ];
            }

            // データ配列の作成
            const data = [
                new Date().toLocaleString('ja-JP'),
                this.getInputValue('shutterSpeed'),
                this.getInputValue('aperture'),
                this.getInputValue('iso'),
                this.getInputValue('analogGain'),
                this.getInputValue('digitalGain'),
                this.getInputValue('whiteBalance'),
                this.getInputValue('rValue'),
                this.getInputValue('gValue'),
                this.getInputValue('bValue'),
                this.getDisplayValue('snRatio'),
                this.getDisplayValue('signalValue'),
                this.getDisplayValue('noiseValue'),
                this.getDisplayValue('pixelCount'),
                this.getDisplayValue('avgBrightness'),
                this.getAnalysisRegionSize(),
                ...rectCoords
            ];

            // CSV生成とダウンロード
            const csvContent = [
                headers.map(h => `"${h}"`).join(','),
                data.map(d => `"${d}"`).join(',')
            ].join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `camera_analysis_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.setStatusMessage('CSVファイル（矩形座標付き）を保存しました');
            
        } catch (error) {
            console.error('Error saving parameters:', error);
            this.setStatusMessage('パラメータ保存中にエラーが発生しました');
        }
    },

    /**
     * パラメータクリア機能
     */
    clearParameters() {
        try {
            const inputs = [
                'shutterSpeed', 'aperture', 'iso', 'analogGain', 
                'digitalGain', 'whiteBalance', 'rValue', 'gValue', 'bValue'
            ];
            
            inputs.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = '';
                }
            });

            this.setStatusMessage('パラメータをクリアしました');
            
        } catch (error) {
            console.error('Error clearing parameters:', error);
            this.setStatusMessage('パラメータクリア中にエラーが発生しました');
        }
    },

    /**
     * 入力要素の値を取得
     * @param {string} id - 要素のID
     * @returns {string} 入力値（空の場合は空文字）
     */
    getInputValue(id) {
        const element = document.getElementById(id);
        return element ? (element.value || '') : '';
    },

    /**
     * 表示要素の値を取得
     * @param {string} id - 要素のID
     * @returns {string} 表示値（'--'の場合は空文字）
     */
    getDisplayValue(id) {
        const element = document.getElementById(id);
        if (!element) return '';
        
        const value = element.textContent || '';
        return value === '--' ? '' : value;
    },

    /**
     * 解析領域サイズの取得
     * @returns {string} 解析領域サイズ（幅×高さ）
     */
    getAnalysisRegionSize() {
        if (!this.currentRect || !this.currentImage) return '';
        
        try {
            const scaleX = this.currentImage.width / this.displayedWidth;
            const scaleY = this.currentImage.height / this.displayedHeight;
            const originalWidth = Math.round(this.currentRect.width * scaleX);
            const originalHeight = Math.round(this.currentRect.height * scaleY);
            return `${originalWidth}×${originalHeight}`;
        } catch (error) {
            console.error('Error getting analysis region size:', error);
            return '';
        }
    },

    /**
     * ヒストグラムモードの切り替え
     * @param {string} mode - 新しいモード
     */
    switchHistogramMode(mode) {
        if (this.isAnalyzing) {
            console.log('Analysis in progress, skipping mode switch');
            return;
        }
        
        this.currentHistogramMode = mode;
        
        // モードボタンの更新
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // ヒストグラム更新
        setTimeout(() => {
            this.safeUpdateHistogram();
        }, 10);
    },

    /**
     * UI要素の有効/無効切り替え
     * @param {boolean} enabled - 有効化フラグ
     */
    setUIEnabled(enabled) {
        try {
            // ヒストグラムモードボタン
            const modeButtons = document.querySelectorAll('.mode-btn');
            modeButtons.forEach(btn => {
                btn.disabled = !enabled;
            });
            
            // 特定値入力
            const specificInput = document.getElementById('specificValue');
            if (specificInput) {
                specificInput.disabled = !enabled;
            }
            
            // パラメータボタン
            const saveBtn = document.getElementById('saveParams');
            const clearBtn = document.getElementById('clearParams');
            if (saveBtn) saveBtn.disabled = !enabled;
            if (clearBtn) clearBtn.disabled = !enabled;
            
        } catch (error) {
            console.error('Error setting UI enabled state:', error);
        }
    },

    /**
     * 解析状態に応じたUI更新
     * @param {boolean} isAnalyzing - 解析中フラグ
     */
    updateUIForAnalysis(isAnalyzing) {
        this.setUIEnabled(!isAnalyzing);
        
        if (isAnalyzing) {
            this.setStatusMessage('解析中...');
        }
    },

    /**
     * エラーメッセージの表示
     * @param {string} message - エラーメッセージ
     * @param {Error} error - エラーオブジェクト（オプション）
     */
    showError(message, error = null) {
        console.error(message, error);
        this.setStatusMessage(`エラー: ${message}`);
        
        // デバッグモードの場合、詳細エラー情報を表示
        if (window.DEBUG_MODE && error) {
            console.error('Detailed error:', error.stack);
        }
    },

    /**
     * 成功メッセージの表示
     * @param {string} message - 成功メッセージ
     */
    showSuccess(message) {
        this.setStatusMessage(message);
    },

    /**
     * RGB入力値の同期更新
     */
    syncRGBInputs() {
        const rInput = document.getElementById('rValue');
        const gInput = document.getElementById('gValue');
        const bInput = document.getElementById('bValue');
        
        if (!rInput || !gInput || !bInput) return;
        
        // 現在のピクセル情報から値を取得
        const rText = document.getElementById('pixelR')?.textContent || 'R: --';
        const gText = document.getElementById('pixelG')?.textContent || 'G: --';
        const bText = document.getElementById('pixelB')?.textContent || 'B: --';
        
        // RGB値を抽出して入力フィールドに設定
        const rMatch = rText.match(/R:\s*(\d+)/);
        const gMatch = gText.match(/G:\s*(\d+)/);
        const bMatch = bText.match(/B:\s*(\d+)/);
        
        if (rMatch) rInput.value = rMatch[1];
        if (gMatch) gInput.value = gMatch[1];
        if (bMatch) bInput.value = bMatch[1];
    }
});