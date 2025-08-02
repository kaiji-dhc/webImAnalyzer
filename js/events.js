/**
 * ImageAnalyzer - イベント処理モジュール
 * ファイル操作、ドラッグ&ドロップ、Canvas操作のイベントリスナー
 */

Object.assign(ImageAnalyzer.prototype, {
    
    /**
     * 全イベントリスナーの初期化
     */
    initEventListeners() {
        console.log('=== Initializing event listeners ===');
        
        if (!this.dropZone || !this.fileInput) {
            console.error('Required elements not found');
            return;
        }

        // ファイル操作イベント
        this.initFileEvents();
        
        // ドラッグ&ドロップイベント
        this.initDragDropEvents();
        
        // Canvas操作イベント
        this.initCanvasEvents();

        // 描画モード切り替えボタン
        this.initModeButtons();

        // ウィンドウイベント
        this.initWindowEvents();
        
        // パラメータボタンイベント
        this.initParameterEvents();
        
        console.log('=== Event listeners setup complete ===');
    },

    /**
     * ファイル操作イベントの初期化
     */
    initFileEvents() {
        // クリックイベント
        this.dropZone.addEventListener('click', (e) => {
            console.log('✓ Click detected on drop zone');
            e.preventDefault();
            e.stopPropagation();
            this.fileInput.click();
        });

        // ファイル選択イベント
        this.fileInput.addEventListener('change', (e) => {
            console.log('✓ File input change detected:', e.target.files.length);
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log('Selected file:', file.name, file.type, file.size);
                this.loadImage(file);
            }
            e.target.value = ''; // 同じファイルを再選択可能にする
        });
    },

    /**
     * ドラッグ&ドロップイベントの初期化
     */
    initDragDropEvents() {
        // ドラッグエンター
        this.dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        // ドラッグオーバー
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.add('drag-over');
        });

        // ドラッグリーブ
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = this.dropZone.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || 
                e.clientY < rect.top || e.clientY > rect.bottom) {
                this.dropZone.classList.remove('drag-over');
            }
        });

        // ドロップ
        this.dropZone.addEventListener('drop', (e) => {
            console.log('✓ DROP EVENT detected');
            e.preventDefault();
            e.stopPropagation();
            this.dropZone.classList.remove('drag-over');
            
            const files = e.dataTransfer ? e.dataTransfer.files : null;
            if (files && files.length > 0) {
                const file = files[0];
                console.log('Dropped file:', file.name, file.type, file.size);
                this.loadImage(file);
            }
        });

        // ページ全体のドラッグ&ドロップを制御
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    },

    /**
     * 描画モード切り替えボタンの初期化
     */
    initModeButtons() {
        const roiBtn = document.getElementById('roiModeBtn');
        const lineBtn = document.getElementById('lineModeBtn');
        if (!roiBtn || !lineBtn) return;

        roiBtn.addEventListener('click', () => {
            this.drawMode = 'rect';
            this.updateModeButtons('rect');
            this.setStatusMessage('矩形モード');
            if (this.currentRect) {
                this.redrawCanvas();
                const r = this.currentRect;
                this.drawSelectionRectangle(r.x, r.y, r.x + r.width, r.y + r.height);
            }
            if (this.currentHistogramData) {
                setTimeout(() => this.safeUpdateHistogram(), 10);
            }
        });

        lineBtn.addEventListener('click', () => {
            if (!this.lineAnalyzer) return;
            this.lineAnalyzer.activate();
            this.updateModeButtons('line');
        });
    },

    /**
     * 描画モードボタンの状態更新
     */
    updateModeButtons(mode) {
        const roiBtn = document.getElementById('roiModeBtn');
        const lineBtn = document.getElementById('lineModeBtn');
        if (!roiBtn || !lineBtn) return;

        if (mode === 'line') {
            lineBtn.classList.add('active');
            roiBtn.classList.remove('active');
        } else {
            roiBtn.classList.add('active');
            lineBtn.classList.remove('active');
        }
    },

    /**
     * Canvas操作イベントの初期化
     */
    initCanvasEvents() {
        if (!this.canvas) return;

        // マウスダウン
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.drawMode === 'rect') {
                this.startDrawing(e);
            } else if (this.drawMode === 'line' && this.lineAnalyzer) {
                this.lineAnalyzer.start(e);
            }
        });

        // マウスムーブ
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.drawMode === 'rect') {
                this.drawRectangle(e);
            } else if (this.drawMode === 'line' && this.lineAnalyzer) {
                this.lineAnalyzer.draw(e);
            }
            this.updateCursorInfo(e);
        });

        // マウスアップ
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.drawMode === 'rect') {
                this.endDrawing(e);
            } else if (this.drawMode === 'line' && this.lineAnalyzer) {
                this.lineAnalyzer.end(e);
            }
        });

        // マウスリーブ - 描画中止・カーソル情報クリア
        this.canvas.addEventListener('mouseleave', (e) => {
            if (this.drawMode === 'rect') {
                if (this.isDrawing) {
                    this.endDrawing(e);
                }
            } else if (this.drawMode === 'line' && this.lineAnalyzer && this.lineAnalyzer.drawer.isDrawing) {
                this.lineAnalyzer.end(e);
            }
            this.clearCursorInfo();
        });

        // コンテキストメニュー無効化
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    },

    /**
     * ウィンドウイベントの初期化
     */
    initWindowEvents() {
        // ウィンドウリサイズ
        window.addEventListener('resize', () => {
            if (this.currentImage) {
                setTimeout(() => {
                    this.displayImage();
                }, 100);
            }
        });

        // キーボードイベント（ESCキーでモーダル閉じる）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const lineModal = document.getElementById('lineProfileModal');
                if (lineModal && lineModal.style.display === 'flex') {
                    if (this.lineAnalyzer) this.lineAnalyzer.closeModal();
                    return;
                }
                const modal = document.getElementById('histogramModal');
                if (modal && modal.style.display === 'flex') {
                    this.closeHistogramModal();
                }
            }
        });

        // モーダルクリックで閉じる
        const modal = document.getElementById('histogramModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'histogramModal') {
                    this.closeHistogramModal();
                }
            });
        }
        const lineModal = document.getElementById('lineProfileModal');
        if (lineModal) {
            lineModal.addEventListener('click', (e) => {
                if (e.target.id === 'lineProfileModal' && this.lineAnalyzer) {
                    this.lineAnalyzer.closeModal();
                }
            });
        }
    },

    /**
     * パラメータボタンイベントの初期化
     */
    initParameterEvents() {
        const saveBtn = document.getElementById('saveParams');
        const clearBtn = document.getElementById('clearParams');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveParameters();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearParameters();
            });
        }
    },
});