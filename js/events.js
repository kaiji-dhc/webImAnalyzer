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
     * Canvas操作イベントの初期化
     */
    initCanvasEvents() {
        if (!this.canvas) return;

        // マウスダウン - 描画またはパン開始
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.startDrawing(e);
            } else if (e.button === 1 || e.button === 2) {
                this.startPan(e);
            }
        });

        // マウスムーブ - 描画・パン・カーソル情報更新
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panImage(e);
            } else {
                this.drawRectangle(e);
                this.updateCursorInfo(e);
            }
        });

        // マウスアップ - 操作終了
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.endPan();
            } else {
                this.endDrawing(e);
            }
        });

        // マウスリーブ - 操作中止・カーソル情報クリア
        this.canvas.addEventListener('mouseleave', (e) => {
            if (this.isPanning) {
                this.endPan();
            }
            if (this.isDrawing) {
                this.endDrawing(e);
            }
            this.clearCursorInfo();
        });

        // ホイール - ズーム
        this.canvas.addEventListener('wheel', (e) => {
            this.handleWheel(e);
        }, { passive: false });

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