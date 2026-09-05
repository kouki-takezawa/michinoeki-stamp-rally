// モバイル下部タブバー(TabBar.tsx、高さ h-16 = 4rem 固定)の分だけ、
// 他の固定要素(BottomSheetや地図ラッパー)を持ち上げるためのオフセット。
// セーフエリア(ホームインジケーター等)ぶんはタブバー側がpaddingで確保するため、ここでも同じ計算式を使う。
export const MOBILE_TABBAR_SPACE = 'calc(4rem + env(safe-area-inset-bottom))';

// BottomSheetの'peek'(最小)スナップ高さ。地図上のフローティングUI(現在地FAB・プレビューカード等)を
// シート最小時の上端に合わせて配置するため、両側から参照できる値として切り出している。
export const SHEET_PEEK_PX = 128;
