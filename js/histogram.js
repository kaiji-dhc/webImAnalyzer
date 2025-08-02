/**
 * ImageAnalyzer - ヒストグラム機能モジュール
 * ヒストグラムの描画、表示、モーダル機能
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * ヒストグラムチャートの初期化
     */
    initHistogramChart() {
        this.histogramCanvas = document.getElementById('histogramChart');
        this.histogramCtx = this.histogramCanvas?.getContext('2d');
        
        if (!this.histogramCanvas || !this.histogramCtx) {
            console.error('Histogram canvas not found');
            return;
        }
        
        this.histogramCanvas.width = 300;
        this.histogramCanvas.height = 200;
        
        this.drawEmptyHistogram();

        // イベントリスナー
        this.histogramCanvas.addEventListener('click', () => {
            if (this.currentHistogramData) {
                this.openHistogramModal();
            }
        });

        this.histogramCanvas.addEventListener('mousemove', (e) => this.showHistogramTooltip(e));
        this.histogramCanvas.addEventListener('mouseleave', () => this.hideHistogramTooltip());
    },

    /**
     * 空のヒストグラム描画
     * @param {string} channel - チャンネル名
     */
    drawEmptyHistogram(channel = 'brightness') {
        const ctx = this.histogramCtx;
        const canvas = this.histogramCanvas;
        
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 軸線
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 15);
        ctx.lineTo(50, 160);
        ctx.lineTo(280, 160);
        ctx.stroke();
        
        // ラベル
        const channelNames = {
            brightness: '輝度値',
            red: 'R値',
            green: 'G値',
            blue: 'B値',
            'rgb-overlay': 'RGB値'
        };
        
        this.drawHistogramLabels(ctx, channelNames[channel]);
        this.drawHistogramScale(ctx);
    },

        /**
     * ヒストグラム制御の初期化
     */
    initHistogramControls() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 解析中は処理をスキップ
                if (this.isAnalyzing) {
                    console.log('Analysis in progress, skipping mode change');
                    return;
                }
                
                // アクティブボタンの切り替え
                modeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // モード変更
                this.currentHistogramMode = e.target.dataset.mode;
                
                // 安全にヒストグラム更新
                setTimeout(() => {
                    this.safeUpdateHistogram();
                }, 10);
            });
        });

        // 特定値入力の処理
        const specificValueInput = document.getElementById('specificValue');
        if (specificValueInput) {
            specificValueInput.addEventListener('input', (e) => {
                this.handleSpecificValueChange(e.target.value);
            });
            
            specificValueInput.addEventListener('change', (e) => {
                this.handleSpecificValueChange(e.target.value);
            });
        }
    },

      /**
     * 特定値変更の安全な処理
     * @param {string} value - 入力値
     */
    handleSpecificValueChange(value) {
        try {
            const resultElement = document.getElementById('specificResult');
            if (!resultElement) return;

            if (value === '' || this.isAnalyzing) {
                resultElement.textContent = '--';
                return;
            }
            
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
                this.checkSpecificValue(numValue);
            } else {
                resultElement.textContent = '--';
            }
        } catch (error) {
            console.error('Error handling specific value change:', error);
            const resultElement = document.getElementById('specificResult');
            if (resultElement) {
                resultElement.textContent = '--';
            }
        }
    },

      /**
     * ヒストグラムモーダルの初期化
     */
    initHistogramModal() {
        this.histogramLargeCanvas = document.getElementById('histogramChartLarge');
        this.histogramLargeCtx = this.histogramLargeCanvas?.getContext('2d');
        
        if (!this.histogramLargeCanvas || !this.histogramLargeCtx) {
            console.error('Large histogram canvas not found');
            return;
        }
        
        console.log('Histogram modal initialized');
    },

    /**
     * ヒストグラムモーダルを開く
     */
    openHistogramModal() {
        const modal = document.getElementById('histogramModal');
        if (modal && this.currentHistogramData) {
            modal.style.display = 'flex';
            
            if (this.currentHistogramMode === 'rgb-overlay') {
                this.drawRGBOverlayHistogram(
                    this.histogramLargeCtx, 
                    this.histogramLargeCanvas, 
                    this.currentHistogramData, 
                    true
                );
            } else {
                const histogram = this.currentHistogramData[this.currentHistogramMode];
                this.drawHistogram(
                    this.histogramLargeCtx, 
                    this.histogramLargeCanvas, 
                    histogram, 
                    true, 
                    this.currentHistogramMode
                );
            }
            
            this.updateHistogramInfo();
        }
    },

    /**
     * ヒストグラムモーダルを閉じる
     */
    closeHistogramModal() {
        const modal = document.getElementById('histogramModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * ヒストグラム情報の更新
     */
    updateHistogramInfo() {
        if (!this.currentHistogramData) return;
        
        let infoHTML = '';
        
        if (this.currentHistogramMode === 'rgb-overlay') {
            infoHTML = this.generateRGBOverlayInfo();
        } else {
            infoHTML = this.generateSingleChannelInfo();
        }
        
        const infoElement = document.getElementById('histogramInfo');
        if (infoElement) {
            infoElement.innerHTML = infoHTML;
        }
    },

    /**
     * RGB重畳表示用の情報HTML生成
     * @returns {string} HTML文字列
     */
    generateRGBOverlayInfo() {
        const channels = ['red', 'green', 'blue'];
        const channelStats = {};
        
        channels.forEach(channel => {
            const histogram = this.currentHistogramData[channel];
            const stats = this.calculateHistogramStatistics(histogram);
            channelStats[channel] = stats;
        });
        
        return `
            <div class="info-item">
                <div class="info-value" style="color: #ff6b6b;">${channelStats.red.mean.toFixed(1)}</div>
                <div class="info-label">R平均値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #51cf66;">${channelStats.green.mean.toFixed(1)}</div>
                <div class="info-label">G平均値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #339af0;">${channelStats.blue.mean.toFixed(1)}</div>
                <div class="info-label">B平均値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #ff6b6b;">${channelStats.red.median}</div>
                <div class="info-label">R中央値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #51cf66;">${channelStats.green.median}</div>
                <div class="info-label">G中央値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #339af0;">${channelStats.blue.median}</div>
                <div class="info-label">B中央値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #ff6b6b;">${channelStats.red.mode}</div>
                <div class="info-label">R最頻値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #51cf66;">${channelStats.green.mode}</div>
                <div class="info-label">G最頻値</div>
            </div>
            <div class="info-item">
                <div class="info-value" style="color: #339af0;">${channelStats.blue.mode}</div>
                <div class="info-label">B最頻値</div>
            </div>
        `;
    },

    /**
     * 単一チャンネル用の情報HTML生成
     * @returns {string} HTML文字列
     */
    generateSingleChannelInfo() {
        const histogram = this.currentHistogramData[this.currentHistogramMode];
        const stats = this.calculateHistogramStatistics(histogram);
        
        if (!stats) return '';
        
        const channelNames = {
            brightness: '輝度',
            red: 'R',
            green: 'G',
            blue: 'B'
        };
        
        // 四分位数の計算
        const q1Target = stats.totalPixels * 0.25;
        const q3Target = stats.totalPixels * 0.75;
        let q1 = 0, q3 = 0;
        let cumSum = 0;
        
        for (let i = 0; i < histogram.length; i++) {
            cumSum += histogram[i];
            if (q1 === 0 && cumSum >= q1Target) q1 = i;
            if (cumSum >= q3Target) {
                q3 = i;
                break;
            }
        }
        
        return `
            <div class="info-item">
                <div class="info-value">${stats.totalPixels.toLocaleString()}</div>
                <div class="info-label">総画素数</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.mean.toFixed(2)}</div>
                <div class="info-label">平均${channelNames[this.currentHistogramMode]}値</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.median}</div>
                <div class="info-label">中央値</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.mode}</div>
                <div class="info-label">最頻値</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.maxValue.toLocaleString()}</div>
                <div class="info-label">最大画素数</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.stdDev.toFixed(2)}</div>
                <div class="info-label">標準偏差</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.minValue !== -1 ? stats.minValue : '--'}</div>
                <div class="info-label">最小値</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.maxValueIndex !== -1 ? stats.maxValueIndex : '--'}</div>
                <div class="info-label">最大値</div>
            </div>
            <div class="info-item">
                <div class="info-value">${q1}</div>
                <div class="info-label">第1四分位</div>
            </div>
            <div class="info-item">
                <div class="info-value">${q3}</div>
                <div class="info-label">第3四分位</div>
            </div>
            <div class="info-item">
                <div class="info-value">${q3 - q1}</div>
                <div class="info-label">四分位範囲</div>
            </div>
            <div class="info-item">
                <div class="info-value">${stats.maxValueIndex !== -1 ? stats.maxValueIndex - stats.minValue : '--'}</div>
                <div class="info-label">値の範囲</div>
            </div>
        `;
    },

    /**
     * ヒストグラムのラベル描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} channelName - チャンネル名
     */
    drawHistogramLabels(ctx, channelName) {
        // X軸ラベル
        ctx.fillStyle = '#495057';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${channelName} (0-255)`, 165, 195);
        
        // Y軸ラベル
        ctx.save();
        ctx.translate(12, 87);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#495057';
        ctx.font = '10px Arial';
        ctx.fillText('画素数', 0, 0);
        ctx.restore();
    },

    /**
     * ヒストグラムのスケール描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     */
    drawHistogramScale(ctx) {
        ctx.fillStyle = '#6c757d';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        
        const xMarks = [0, 50, 100, 150, 200, 255];
        xMarks.forEach(value => {
            const x = 50 + (value / 255) * 230;
            ctx.fillText(value.toString(), x, 175);
            
            // 目盛り線
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = value === 0 || value === 255 ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(x, 160);
            ctx.lineTo(x, value === 0 || value === 255 ? 170 : 165);
            ctx.stroke();
        });

        // 細かい目盛り
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 0.5;
        for (let i = 25; i < 255; i += 25) {
            if (i % 50 !== 0) {
                const x = 50 + (i / 255) * 230;
                ctx.beginPath();
                ctx.moveTo(x, 160);
                ctx.lineTo(x, 163);
                ctx.stroke();
            }
        }
    },

    /**
     * 安全なヒストグラム更新
     */
    safeUpdateHistogram() {
        try {
            if (!this.currentHistogramData || this.isAnalyzing) return;
            
            const mode = this.currentHistogramMode;
            
            if (mode === 'rgb-overlay') {
                this.drawRGBOverlayHistogram(this.histogramCtx, this.histogramCanvas, this.currentHistogramData);
            } else {
                const histogram = this.currentHistogramData[mode];
                if (histogram) {
                    this.drawHistogram(this.histogramCtx, this.histogramCanvas, histogram, false, mode);
                }
            }
            
            // 特定値確認の更新
            const specificInput = document.getElementById('specificValue');
            if (specificInput?.value?.trim()) {
                this.checkSpecificValue(parseInt(specificInput.value));
            }
            
        } catch (error) {
            console.error('Error in histogram update:', error);
        }
    },

    /**
     * 単一チャンネルヒストグラムの描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {HTMLCanvasElement} canvas - Canvas 要素
     * @param {Array} histogram - ヒストグラムデータ
     * @param {boolean} isLarge - 大きな表示かどうか
     * @param {string} channel - チャンネル名
     */
    drawHistogram(ctx, canvas, histogram, isLarge = false, channel = 'brightness') {
        if (isLarge) {
            this.drawEmptyHistogramLarge(ctx, canvas, channel);
        } else {
            this.drawEmptyHistogram(channel);
        }
        
        if (!histogram || histogram.length === 0) return;
        
        const maxValue = Math.max(...histogram);
        if (maxValue === 0) return;
        
        const colors = this.getChannelColors(channel);
        const params = this.getHistogramParams(isLarge);
        
        // ヒストグラムバーを描画
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = isLarge ? 0.5 : 0.3;
        
        for (let i = 0; i < 256; i++) {
            const value = histogram[i] || 0;
            if (value > 0) {
                const barHeight = (value / maxValue) * params.chartHeight;
                const x = params.leftMargin + (i * params.barWidth);
                const y = params.bottomY - barHeight;
                
                ctx.fillRect(x, y, params.barWidth - (isLarge ? 0.5 : 0.2), barHeight);
                
                if (isLarge && params.barWidth > 2) {
                    ctx.strokeRect(x, y, params.barWidth - 0.5, barHeight);
                }
            }
        }
        
        this.drawHistogramGrid(ctx, params, maxValue, isLarge);
        
        if (isLarge) {
            this.drawHistogramStatistics(ctx, params, histogram, channel, maxValue);
        }
    },

    /**
     * RGB重畳ヒストグラムの描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {HTMLCanvasElement} canvas - Canvas 要素
     * @param {Object} histogramData - ヒストグラムデータ
     * @param {boolean} isLarge - 大きな表示かどうか
     */
    drawRGBOverlayHistogram(ctx, canvas, histogramData, isLarge = false) {
        if (isLarge) {
            this.drawEmptyHistogramLarge(ctx, canvas, 'rgb-overlay');
        } else {
            this.drawEmptyHistogram('rgb-overlay');
        }
        
        const maxR = Math.max(...histogramData.red);
        const maxG = Math.max(...histogramData.green);
        const maxB = Math.max(...histogramData.blue);
        const maxValue = Math.max(maxR, maxG, maxB);
        
        if (maxValue === 0) return;
        
        const params = this.getHistogramParams(isLarge);
        
        const channels = [
            { data: histogramData.red, color: 'rgba(255, 107, 107, 0.6)' },
            { data: histogramData.green, color: 'rgba(81, 207, 102, 0.6)' },
            { data: histogramData.blue, color: 'rgba(51, 154, 240, 0.6)' }
        ];
        
        channels.forEach(channel => {
            ctx.fillStyle = channel.color;
            
            for (let i = 0; i < 256; i++) {
                const value = channel.data[i] || 0;
                if (value > 0) {
                    const barHeight = (value / maxValue) * params.chartHeight;
                    const x = params.leftMargin + (i * params.barWidth);
                    const y = params.bottomY - barHeight;
                    
                    ctx.fillRect(x, y, params.barWidth - (isLarge ? 0.5 : 0.2), barHeight);
                }
            }
        });
        
        this.drawHistogramGrid(ctx, params, maxValue, isLarge);
        
        if (isLarge) {
            this.drawRGBOverlayStatistics(ctx, params, histogramData);
        }
    },

    /**
     * チャンネル色の取得
     * @param {string} channel - チャンネル名
     * @returns {Object} 色情報
     */
    getChannelColors(channel) {
        const colors = {
            brightness: { fill: 'rgba(102, 126, 234, 0.8)', stroke: 'rgba(102, 126, 234, 1)' },
            red: { fill: 'rgba(255, 107, 107, 0.8)', stroke: 'rgba(255, 107, 107, 1)' },
            green: { fill: 'rgba(81, 207, 102, 0.8)', stroke: 'rgba(81, 207, 102, 1)' },
            blue: { fill: 'rgba(51, 154, 240, 0.8)', stroke: 'rgba(51, 154, 240, 1)' }
        };
        return colors[channel] || colors.brightness;
    },

    /**
     * ヒストグラムパラメータの取得
     * @param {boolean} isLarge - 大きな表示かどうか
     * @returns {Object} パラメータ
     */
    getHistogramParams(isLarge) {
        return isLarge ? {
            leftMargin: 80,
            topMargin: 30,
            chartWidth: 1880,
            chartHeight: 320,
            bottomY: 350,
            barWidth: 1880 / 256
        } : {
            leftMargin: 50,
            topMargin: 15,
            chartWidth: 230,
            chartHeight: 145,
            bottomY: 160,
            barWidth: 230 / 256
        };
    },

    /**
     * ヒストグラムグリッドの描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {Object} params - パラメータ
     * @param {number} maxValue - 最大値
     * @param {boolean} isLarge - 大きな表示かどうか
     */
    drawHistogramGrid(ctx, params, maxValue, isLarge) {
        ctx.fillStyle = '#333';
        ctx.font = isLarge ? '11px Arial' : '9px Arial';
        ctx.textAlign = 'right';
        
        const gridLines = isLarge ? 10 : 4;
        for (let i = 1; i <= gridLines; i++) {
            const y = params.bottomY - (i * params.chartHeight / gridLines);
            const value = Math.round((maxValue * i) / gridLines);
            
            ctx.fillText(value.toLocaleString(), params.leftMargin - 5, y + 3);
            
            // 横線（グリッド）
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(params.leftMargin, y);
            ctx.lineTo(params.leftMargin + params.chartWidth, y);
            ctx.stroke();
        }
    },

    /**
     * ヒストグラム統計情報の描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {Object} params - パラメータ
     * @param {Array} histogram - ヒストグラムデータ
     * @param {string} channel - チャンネル名
     * @param {number} maxValue - 最大値
     */
    drawHistogramStatistics(ctx, params, histogram, channel, maxValue) {
        const stats = this.calculateHistogramStatistics(histogram);
        if (!stats) return;
        
        const channelNames = {
            brightness: '輝度',
            red: '赤チャンネル',
            green: '緑チャンネル',
            blue: '青チャンネル'
        };
        
        // 統計情報ボックス
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(params.leftMargin + 10, params.topMargin + 10, 280, 140);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        // ヘッダー
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.fillText(`📊 ${channelNames[channel]} 統計情報`, params.leftMargin + 20, params.topMargin + 30);
        
        // 統計値
        ctx.font = '11px Arial';
        ctx.fillStyle = '#fff';
        const textLines = [
            `総画素数: ${stats.totalPixels.toLocaleString()}`,
            `平均値: ${stats.mean.toFixed(2)}`,
            `中央値: ${stats.median}`,
            `最頻値: ${stats.mode} (${stats.maxValue.toLocaleString()}画素)`,
            `標準偏差: ${stats.stdDev.toFixed(2)}`,
            `値範囲: ${stats.minValue} - ${stats.maxValueIndex}`
        ];
        
        textLines.forEach((line, index) => {
            ctx.fillText(line, params.leftMargin + 20, params.topMargin + 50 + (index * 20));
        });
    },

    /**
     * RGB重畳統計情報の描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {Object} params - パラメータ
     * @param {Object} histogramData - ヒストグラムデータ
     */
    drawRGBOverlayStatistics(ctx, params, histogramData) {
        const channels = ['red', 'green', 'blue'];
        const channelStats = {};
        
        channels.forEach(channel => {
            channelStats[channel] = this.calculateHistogramStatistics(histogramData[channel]);
        });
        
        // 統計情報ボックス
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(params.leftMargin + 10, params.topMargin + 10, 400, 160);
        
        // ヘッダー
        ctx.fillStyle = 'white';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('📊 RGB重畳表示 - 詳細統計', params.leftMargin + 20, params.topMargin + 30);
        
        const channelColors = {
            red: '#ff6b6b',
            green: '#51cf66', 
            blue: '#339af0'
        };
        
        const channelNames = {
            red: 'R',
            green: 'G',
            blue: 'B'
        };
        
        let yOffset = 50;
        channels.forEach((channel) => {
            const stats = channelStats[channel];
            if (!stats) return;
            
            const color = channelColors[channel];
            const name = channelNames[channel];
            
            // チャンネル名
            ctx.fillStyle = color;
            ctx.font = 'bold 11px Arial';
            ctx.fillText(`${name}チャンネル:`, params.leftMargin + 20, params.topMargin + yOffset);
            
            // 統計値
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(`平均: ${stats.mean.toFixed(1)}`, params.leftMargin + 80, params.topMargin + yOffset);
            ctx.fillText(`中央値: ${stats.median}`, params.leftMargin + 150, params.topMargin + yOffset);
            ctx.fillText(`最頻値: ${stats.mode}`, params.leftMargin + 210, params.topMargin + yOffset);
            ctx.fillText(`最大: ${stats.maxValue.toLocaleString()}px`, params.leftMargin + 270, params.topMargin + yOffset);
            
            yOffset += 20;
        });
    },

    /**
     * 大きなヒストグラム用の空描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {HTMLCanvasElement} canvas - Canvas 要素
     * @param {string} channel - チャンネル名
     */
    drawEmptyHistogramLarge(ctx, canvas, channel = 'brightness') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 30);
        ctx.lineTo(80, 350);
        ctx.lineTo(1960, 350);
        ctx.stroke();
        
        const channelNames = {
            brightness: '輝度値',
            red: 'R値',
            green: 'G値',
            blue: 'B値',
            'rgb-overlay': 'RGB値'
        };
        
        ctx.fillStyle = '#495057';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${channelNames[channel]} (0-255) 全256段階表示`, 1020, 385);
    },

    /**
     * ヒストグラムツールチップの表示
     * @param {MouseEvent} e - マウスイベント
     */
    showHistogramTooltip(e) {
        if (!this.currentHistogramData) return;
        
        const rect = this.histogramCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const canvasX = (x / rect.width) * this.histogramCanvas.width;
        
        const chartStartX = 50;
        const chartWidth = 230;
        const value = Math.round(((canvasX - chartStartX) / chartWidth) * 255);
        
        if (value >= 0 && value <= 255) {
            const tooltip = document.getElementById('histogramTooltip');
            if (!tooltip) return;
            
            let tooltipContent = '';
            if (this.currentHistogramMode === 'rgb-overlay') {
                const r = this.currentHistogramData.red[value] || 0;
                const g = this.currentHistogramData.green[value] || 0;
                const b = this.currentHistogramData.blue[value] || 0;
                tooltipContent = `値: ${value}<br>R: ${r}, G: ${g}, B: ${b}`;
            } else {
                const count = this.currentHistogramData[this.currentHistogramMode][value] || 0;
                tooltipContent = `値: ${value}<br>画素数: ${count}`;
            }
            
            tooltip.innerHTML = tooltipContent;
            tooltip.style.left = (e.clientX + 10) + 'px';
            tooltip.style.top = (e.clientY - 30) + 'px';
            tooltip.classList.add('show');
        } else {
            this.hideHistogramTooltip();
        }
    },

    /**
     * ヒストグラムツールチップの非表示
     */
    hideHistogramTooltip() {
        const tooltip = document.getElementById('histogramTooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    },

    /**
     * 特定値の確認
     * @param {number} value - 確認する値
     */
    checkSpecificValue(value) {
        if (!this.currentHistogramData || value === null || value === undefined || 
            isNaN(value) || value < 0 || value > 255) {
            const result = document.getElementById('specificResult');
            if (result) result.textContent = '--';
            return;
        }
        
        let result = '';
        if (this.currentHistogramMode === 'rgb-overlay') {
            const r = this.currentHistogramData.red[value] || 0;
            const g = this.currentHistogramData.green[value] || 0;
            const b = this.currentHistogramData.blue[value] || 0;
            result = `R:${r}, G:${g}, B:${b}`;
        } else {
            const count = this.currentHistogramData[this.currentHistogramMode][value] || 0;
            result = `${count}画素`;
        }
        
        const resultElement = document.getElementById('specificResult');
        if (resultElement) {
            resultElement.textContent = result;
        }
    },

    /**
     * レガシー互換性関数
     */
    updateHistogramDisplay() {
        if (!this.isAnalyzing) {
            setTimeout(() => {
                this.safeUpdateHistogram();
            }, 10);
        }
    }
});