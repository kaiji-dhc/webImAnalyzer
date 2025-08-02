/**
 * ImageAnalyzer - 画像解析モジュール
 * SN比計算、ヒストグラム生成等の解析機能
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * メイン解析実行（エントリーポイント）
     */
    performImageAnalysis() {
        // 無限再帰防止
        if (this.isAnalyzing) {
            console.warn('Analysis already in progress, skipping');
            return;
        }
        
        this.isAnalyzing = true;
        
        try {
            if (!this.currentRect || !this.currentImage) {
                console.error('Missing currentRect or currentImage');
                return;
            }

            console.log('=== Starting Image Analysis ===');
            
            // 元画像座標系での解析領域を計算
            const analysisRegion = this.calculateAnalysisRegion();
            if (!analysisRegion) {
                this.setStatusMessage('解析領域が無効です');
                return;
            }
            
            // 元画像データの抽出
            const imageData = this.extractImageData(analysisRegion);
            if (!imageData) {
                this.setStatusMessage('画像データの取得に失敗');
                return;
            }
            
            // ピクセルデータの解析
            const analysisResults = this.analyzePixelData(imageData);
            if (!analysisResults) {
                this.setStatusMessage('ピクセル解析に失敗');
                return;
            }
            
            // 解析結果の保存と表示更新
            this.saveAnalysisResults(analysisResults);
            this.updateAnalysisDisplay(analysisResults, analysisRegion);
            
            this.setStatusMessage(`解析完了: ${analysisRegion.width} × ${analysisRegion.height} px`);
            
        } catch (error) {
            console.error('Error in image analysis:', error);
            this.setStatusMessage('解析エラー: ' + error.message);
        } finally {
            this.isAnalyzing = false;
        }
        
        console.log('=== Image Analysis Complete ===');
    },

    /**
     * 解析領域の計算（表示座標→元画像座標）
     * @returns {Object|null} 解析領域情報
     */
    calculateAnalysisRegion() {
        const scaleX = this.currentImage.width / this.displayedWidth;
        const scaleY = this.currentImage.height / this.displayedHeight;
        
        // 矩形座標を元画像基準に変換
        const rectStartX = Math.round((this.currentRect.x - this.imageOffsetX) * scaleX);
        const rectStartY = Math.round((this.currentRect.y - this.imageOffsetY) * scaleY);
        const rectWidth = Math.round(this.currentRect.width * scaleX);
        const rectHeight = Math.round(this.currentRect.height * scaleY);
        
        // 元画像の範囲内に制限
        const clampedStartX = Math.max(0, Math.min(this.currentImage.width - 1, rectStartX));
        const clampedStartY = Math.max(0, Math.min(this.currentImage.height - 1, rectStartY));
        const clampedEndX = Math.max(0, Math.min(this.currentImage.width, rectStartX + rectWidth));
        const clampedEndY = Math.max(0, Math.min(this.currentImage.height, rectStartY + rectHeight));
        
        const finalWidth = clampedEndX - clampedStartX;
        const finalHeight = clampedEndY - clampedStartY;
        
        console.log('Analysis region calculated:', {
            original: { x: rectStartX, y: rectStartY, w: rectWidth, h: rectHeight },
            clamped: { x: clampedStartX, y: clampedStartY, w: finalWidth, h: finalHeight }
        });
        
        if (finalWidth <= 0 || finalHeight <= 0) {
            console.error('Invalid analysis region dimensions:', finalWidth, 'x', finalHeight);
            return null;
        }
        
        return {
            x: clampedStartX,
            y: clampedStartY,
            width: finalWidth,
            height: finalHeight
        };
    },

    /**
     * 元画像データの抽出
     * @param {Object} region - 解析領域 {x, y, width, height}
     * @returns {ImageData|null} 画像データ
     */
    extractImageData(region) {
        try {
            // 解析用の隠しCanvas作成
            const analysisCanvas = document.createElement('canvas');
            const analysisCtx = analysisCanvas.getContext('2d');
            
            analysisCanvas.width = region.width;
            analysisCanvas.height = region.height;
            
            // 元画像の指定領域を描画
            analysisCtx.drawImage(
                this.currentImage,
                region.x, region.y, region.width, region.height,
                0, 0, region.width, region.height
            );
            
            // ピクセルデータを取得
            const imageData = analysisCtx.getImageData(0, 0, region.width, region.height);
            
            console.log('Image data extracted:', imageData.data.length, 'bytes');
            
            // メモリクリーンアップ
            analysisCanvas.width = 0;
            analysisCanvas.height = 0;
            
            return imageData;
            
        } catch (error) {
            console.error('Error extracting image data:', error);
            return null;
        }
    },

    /**
     * ピクセルデータの解析
     * @param {ImageData} imageData - 画像データ
     * @returns {Object|null} 解析結果
     */
    analyzePixelData(imageData) {
        const pixels = imageData.data;
        
        if (pixels.length === 0) {
            console.error('No pixel data to analyze');
            return null;
        }
        
        const brightnesses = [];
        const statistics = {
            brightnessHistogram: new Array(256).fill(0),
            redHistogram: new Array(256).fill(0),
            greenHistogram: new Array(256).fill(0),
            blueHistogram: new Array(256).fill(0),
            validPixelCount: 0
        };

        // 各ピクセルを解析
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            // 透明でないピクセルのみ処理
            if (a > 0) {
                // 輝度値計算（ITU-R BT.709標準）
                const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                brightnesses.push(brightness);
                
                // ヒストグラム更新
                if (brightness >= 0 && brightness <= 255) statistics.brightnessHistogram[brightness]++;
                if (r >= 0 && r <= 255) statistics.redHistogram[r]++;
                if (g >= 0 && g <= 255) statistics.greenHistogram[g]++;
                if (b >= 0 && b <= 255) statistics.blueHistogram[b]++;
                
                statistics.validPixelCount++;
            }
        }

        if (brightnesses.length === 0) {
            console.error('No valid brightness data');
            return null;
        }

        // 統計値計算
        const mean = brightnesses.reduce((sum, val) => sum + val, 0) / brightnesses.length;
        const variance = brightnesses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightnesses.length;
        const stdDev = Math.sqrt(variance);
        const snRatio = stdDev > 0 ? mean / stdDev : Infinity;

        console.log('Pixel analysis completed:', {
            totalPixels: brightnesses.length,
            mean: mean.toFixed(2),
            stdDev: stdDev.toFixed(2),
            snRatio: snRatio === Infinity ? '∞' : snRatio.toFixed(2)
        });

        return {
            brightnesses,
            statistics,
            snData: { mean, stdDev, snRatio, pixelCount: brightnesses.length }
        };
    },

    /**
     * 解析結果の保存
     * @param {Object} results - 解析結果
     */
    saveAnalysisResults(results) {
        // ヒストグラムデータを保存
        this.currentHistogramData = {
            brightness: results.statistics.brightnessHistogram,
            red: results.statistics.redHistogram,
            green: results.statistics.greenHistogram,
            blue: results.statistics.blueHistogram
        };
        
        console.log('Analysis results saved to currentHistogramData');
    },

    /**
     * 解析結果の表示更新
     * @param {Object} results - 解析結果
     * @param {Object} region - 解析領域
     */
    updateAnalysisDisplay(results, region) {
        // SN比表示の更新
        this.updateSNRatioDisplay(results.snData);
        
        // ヒストグラム表示の更新（非同期で安全に）
        setTimeout(() => {
            if (this.safeUpdateHistogram) {
                this.safeUpdateHistogram();
            }
        }, 10);
    },

    /**
     * SN比表示の更新
     * @param {Object} snData - SN比データ {mean, stdDev, snRatio, pixelCount}
     */
    updateSNRatioDisplay(snData) {
        try {
            const elements = {
                snRatio: document.getElementById('snRatio'),
                signal: document.getElementById('signalValue'),
                noise: document.getElementById('noiseValue'),
                pixels: document.getElementById('pixelCount'),
                brightness: document.getElementById('avgBrightness')
            };

            if (elements.snRatio) {
                elements.snRatio.textContent = snData.snRatio === Infinity ? '∞' : snData.snRatio.toFixed(2);
            }
            if (elements.signal) {
                elements.signal.textContent = snData.mean.toFixed(1);
            }
            if (elements.noise) {
                elements.noise.textContent = snData.stdDev.toFixed(2);
            }
            if (elements.pixels) {
                elements.pixels.textContent = snData.pixelCount.toLocaleString();
            }
            if (elements.brightness) {
                elements.brightness.textContent = snData.mean.toFixed(1);
            }

            console.log('SN Ratio display updated successfully');
            
        } catch (error) {
            console.error('Error updating SN ratio display:', error);
        }
    },

    /**
     * ヒストグラム統計の計算
     * @param {Array} histogram - ヒストグラムデータ
     * @returns {Object} 統計情報
     */
    calculateHistogramStatistics(histogram) {
        const totalPixels = histogram.reduce((sum, val) => sum + val, 0);
        if (totalPixels === 0) return null;
        
        // 平均値計算
        let sum = 0;
        for (let i = 0; i < histogram.length; i++) {
            sum += i * histogram[i];
        }
        const mean = sum / totalPixels;
        
        // 中央値計算
        let median = 0;
        let cumSum = 0;
        for (let i = 0; i < histogram.length; i++) {
            cumSum += histogram[i];
            if (cumSum >= totalPixels / 2) {
                median = i;
                break;
            }
        }
        
        // 最頻値（モード）
        const maxValue = Math.max(...histogram);
        const mode = histogram.indexOf(maxValue);
        
        // 標準偏差計算
        let variance = 0;
        for (let i = 0; i < histogram.length; i++) {
            const count = histogram[i];
            variance += count * Math.pow(i - mean, 2);
        }
        const stdDev = Math.sqrt(variance / totalPixels);
        
        // 値の範囲
        let minValue = -1, maxValueIndex = -1;
        for (let i = 0; i < histogram.length; i++) {
            if (histogram[i] > 0) {
                if (minValue === -1) minValue = i;
                maxValueIndex = i;
            }
        }
        
        return {
            totalPixels,
            mean,
            median,
            mode,
            stdDev,
            maxValue,
            minValue: minValue !== -1 ? minValue : 0,
            maxValueIndex: maxValueIndex !== -1 ? maxValueIndex : 0,
            range: maxValueIndex !== -1 ? maxValueIndex - minValue : 0
        };
    },

    /**
     * 複数チャンネルの統計比較
     * @returns {Object|null} 比較統計
     */
    getChannelComparison() {
        if (!this.currentHistogramData) return null;
        
        const channels = ['red', 'green', 'blue', 'brightness'];
        const comparison = {};
        
        channels.forEach(channel => {
            const stats = this.calculateHistogramStatistics(this.currentHistogramData[channel]);
            if (stats) {
                comparison[channel] = stats;
            }
        });
        
        return comparison;
    },

    /**
     * レガシー互換性のための関数
     */
    analyzeRegion() {
        this.performImageAnalysis();
    },

    calculateSNRatio(brightnesses) {
        // 新しい解析システムでは不要（互換性のために残す）
        console.log('Legacy calculateSNRatio called - using new analysis system');
    }
});