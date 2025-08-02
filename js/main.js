/**
 * ImageAnalyzer - メインアプリケーション
 * アプリケーションの初期化とグローバル制御
 */

// グローバル変数
let imageAnalyzerInstance = null;

/**
 * グローバル関数定義
 */

/**
 * ヒストグラムモーダルを閉じる（グローバル関数）
 */
function closeHistogramModal() {
    if (imageAnalyzerInstance) {
        imageAnalyzerInstance.closeHistogramModal();
    } else {
        // フォールバック: 直接DOM操作
        const modal = document.getElementById('histogramModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

/**
 * アプリケーションの初期化
 */
function initializeApplication() {
    console.log('Initializing Image Analyzer Application...');
    
    try {
        // ImageAnalyzerインスタンスの作成
        imageAnalyzerInstance = new ImageAnalyzer();
        
        if (!imageAnalyzerInstance) {
            throw new Error('Failed to create ImageAnalyzer instance');
        }
        
        console.log('ImageAnalyzer initialized successfully');
        
        // デバッグ用のグローバル参照
        if (window.DEBUG_MODE || window.location.hostname === 'localhost') {
            window.imageAnalyzer = imageAnalyzerInstance;
            console.log('Debug mode: imageAnalyzer available globally');
        }
        
        // 初期状態の設定
        setupInitialState();
        
        // 追加のイベントリスナー
        setupGlobalEventListeners();
        
        console.log('Application initialization complete');
        
    } catch (error) {
        console.error('Failed to initialize ImageAnalyzer:', error);
        
        // ユーザーに分かりやすいエラーメッセージを表示
        showInitializationError(error);
    }
}

/**
 * 初期状態の設定
 */
function setupInitialState() {
    try {
        // ローディング状態の解除
        document.body.classList.remove('loading');
        
        // バージョン情報の表示（開発時のみ）
        if (window.DEBUG_MODE) {
            console.log('Image Analyzer v1.0.0');
            console.log('Browser:', navigator.userAgent);
            console.log('Canvas support:', !!document.createElement('canvas').getContext);
            console.log('File API support:', !!(window.File && window.FileReader && window.FileList && window.Blob));
        }
        
        // 必要な要素の存在確認
        const requiredElements = [
            'imageCanvas',
            'dropZone', 
            'fileInput',
            'histogramChart',
            'histogramModal'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.warn('Missing elements:', missingElements);
        }
        
    } catch (error) {
        console.error('Error in initial setup:', error);
    }
}

/**
 * グローバルイベントリスナーの設定
 */
function setupGlobalEventListeners() {
    // エラーハンドリング
    window.addEventListener('error', (e) => {
        console.error('Global error:', e.error);
        
        if (imageAnalyzerInstance) {
            imageAnalyzerInstance.showError('予期しないエラーが発生しました', e.error);
        }
    });
    
    // 未処理のPromiseエラー
    window.addEventListener('unhandledrejection', (e) => {
        console.error('Unhandled promise rejection:', e.reason);
        
        if (imageAnalyzerInstance) {
            imageAnalyzerInstance.showError('非同期処理でエラーが発生しました', e.reason);
        }
    });
    
    // ページの離脱前警告（解析中の場合）
    window.addEventListener('beforeunload', (e) => {
        if (imageAnalyzerInstance && imageAnalyzerInstance.isAnalyzing) {
            e.preventDefault();
            e.returnValue = '解析処理が実行中です。ページを離れますか？';
            return e.returnValue;
        }
    });
    
    // ページの可視性変更
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Page hidden');
        } else {
            console.log('Page visible');
            // ページが再表示された時の処理（必要に応じて）
        }
    });
}

/**
 * 初期化エラーの表示
 * @param {Error} error - エラーオブジェクト
 */
function showInitializationError(error) {
    const errorMessage = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #ff4757;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
        ">
            <h3 style="color: #ff4757; margin-bottom: 10px;">⚠️ 初期化エラー</h3>
            <p style="margin-bottom: 15px;">
                アプリケーションの初期化に失敗しました。
            </p>
            <p style="font-size: 0.9em; color: #666; margin-bottom: 15px;">
                ページを再読み込みしてください。<br>
                問題が続く場合は、ブラウザのコンソールでエラー詳細を確認してください。
            </p>
            <button onclick="location.reload()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            ">
                ページを再読み込み
            </button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorMessage);
}

/**
 * アプリケーションのリセット
 */
function resetApplication() {
    if (imageAnalyzerInstance) {
        try {
            imageAnalyzerInstance.reset();
            console.log('Application reset successfully');
        } catch (error) {
            console.error('Error resetting application:', error);
            // 強制リロード
            location.reload();
        }
    }
}

/**
 * デバッグ情報の出力
 */
function debugInfo() {
    if (!imageAnalyzerInstance) {
        console.log('ImageAnalyzer not initialized');
        return;
    }
    
    const state = imageAnalyzerInstance.getState();
    console.log('Current state:', state);
    
    console.log('Canvas size:', {
        canvas: `${imageAnalyzerInstance.canvas?.width}×${imageAnalyzerInstance.canvas?.height}`,
        displayed: `${imageAnalyzerInstance.displayedWidth}×${imageAnalyzerInstance.displayedHeight}`,
        original: imageAnalyzerInstance.currentImage ? 
            `${imageAnalyzerInstance.currentImage.width}×${imageAnalyzerInstance.currentImage.height}` : 'none'
    });
    
    if (imageAnalyzerInstance.currentHistogramData) {
        console.log('Histogram data available:', Object.keys(imageAnalyzerInstance.currentHistogramData));
    }
}

/**
 * パフォーマンス情報の出力
 */
function performanceInfo() {
    if (performance && performance.memory) {
        console.log('Memory usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        });
    }
    
    if (performance.getEntriesByType) {
        const measures = performance.getEntriesByType('measure');
        if (measures.length > 0) {
            console.log('Performance measures:', measures);
        }
    }
}

// グローバルスコープに関数を公開（デバッグ用）
if (window.DEBUG_MODE) {
    window.resetApplication = resetApplication;
    window.debugInfo = debugInfo;
    window.performanceInfo = performanceInfo;
}

/**
 * DOMContentLoaded時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application initialization...');
    
    // 少し遅延させて初期化（DOM要素の完全な準備を待つ）
    setTimeout(() => {
        initializeApplication();
    }, 100);
});

/**
 * 緊急時のフォールバック処理
 */
setTimeout(() => {
    if (!imageAnalyzerInstance) {
        console.warn('Application not initialized after 5 seconds, attempting emergency initialization...');
        try {
            initializeApplication();
        } catch (error) {
            console.error('Emergency initialization failed:', error);
            showInitializationError(error);
        }
    }
}, 5000);

// アプリケーション情報をコンソールに出力
console.log('%c📷 Camera Image Analyzer', 'font-size: 16px; font-weight: bold; color: #667eea;');
console.log('%cLoading application modules...', 'color: #6c757d;');