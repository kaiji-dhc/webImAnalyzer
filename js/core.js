/**
 * ImageAnalyzer - コアクラス
 * 画像解析アプリケーションのメインクラス
 */

class ImageAnalyzer {
    constructor() {
        console.log('ImageAnalyzer constructor called');
        
        // DOM要素の取得
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas?.getContext('2d');
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        
        // 要素の存在確認
        if (!this.canvas || !this.ctx || !this.dropZone || !this.fileInput) {
            console.error('Required elements not found:', {
                canvas: !!this.canvas,
                ctx: !!this.ctx,
                dropZone: !!this.dropZone,
                fileInput: !!this.fileInput
            });
            return;
        }
        
        // 基本プロパティの初期化
        this.initializeProperties();
        
        // 各機能モジュールの初期化
        this.initializeModules();
        
        console.log('ImageAnalyzer initialized successfully');
    }

    /**
     * プロパティの初期化
     */
    initializeProperties() {
        // 画像関連
        this.currentImage = null;
        this.displayedWidth = 0;
        this.displayedHeight = 0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageMargin = 20;
        this.baseScale = 1;
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 5;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.viewWidth = 0;
        this.viewHeight = 0;
        
        // 描画関連
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentRect = null;
        
        // 解析関連
        this.isAnalyzing = false; // 無限再帰防止フラグ
        this.currentHistogramData = null;
        this.currentHistogramMode = 'brightness';
        
        // ヒストグラム関連
        this.histogramCanvas = null;
        this.histogramCtx = null;
        this.histogramLargeCanvas = null;
        this.histogramLargeCtx = null;
    }

    /**
     * 各機能モジュールの初期化
     */
    initializeModules() {
        console.log('Initializing modules...');
        
        try {
            // イベントリスナーの設定
            this.initEventListeners();
            
            // ヒストグラム機能の初期化
            this.initHistogramChart();
            this.initHistogramModal();
            this.initHistogramControls();
            
            // UI制御の初期化
            this.initUIControls();
            
        } catch (error) {
            console.error('Error initializing modules:', error);
        }
    }

    /**
     * ステータスメッセージの表示
     * @param {string} message - 表示するメッセージ
     */
    setStatusMessage(message) {
        try {
            const status = document.getElementById('status');
            if (status) {
                status.textContent = message;
                status.classList.remove('hidden');
                
                setTimeout(() => {
                    status.classList.add('hidden');
                }, 3000);
            }
            console.log(`[Status] ${message}`);
        } catch (error) {
            console.error('Error setting status:', error);
        }
    }

    /**
     * レガシー互換性のためのステータス更新関数
     * @param {string} message - 表示するメッセージ
     */
    updateStatus(message) {
        this.setStatusMessage(message);
    }

    /**
     * 現在の状態の取得（デバッグ用）
     * @returns {Object} 現在の状態情報
     */
   getState() {
        return {
            hasImage: !!this.currentImage,
            isDrawing: this.isDrawing,
            isAnalyzing: this.isAnalyzing,
            hasAnalysisData: !!this.currentHistogramData,
            histogramMode: this.currentHistogramMode,
            rectSelected: !!this.currentRect
        };
    }

    /**
     * アプリケーションのリセット
     */
    reset() {
        try {
            // 画像関連のリセット
            this.currentImage = null;
            this.displayedWidth = 0;
            this.displayedHeight = 0;
            
            // 描画状態のリセット
            this.isDrawing = false;
            this.currentRect = null;
            
            // 解析データのリセット
            this.isAnalyzing = false;
            this.currentHistogramData = null;
            
            // UI要素のリセット
            this.canvas.classList.add('hidden');
            this.dropZone.classList.remove('hidden');
            const resetBtn = document.getElementById('resetView');
            if (resetBtn) resetBtn.classList.add('hidden');
            
            // ステータス表示
            this.setStatusMessage('アプリケーションをリセットしました');
            
        } catch (error) {
            console.error('Error resetting application:', error);
        }
    }

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
    }

    /**
     * 成功メッセージの表示
     * @param {string} message - 成功メッセージ
     */
    showSuccess(message) {
        this.setStatusMessage(message);
    }
}

// グローバルで利用可能にする
window.ImageAnalyzer = ImageAnalyzer;