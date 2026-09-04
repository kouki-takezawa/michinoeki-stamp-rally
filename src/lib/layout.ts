// モバイル下部タブバー(TabBar.tsx、高さ h-16 = 4rem 固定)の分だけ、
// 他の固定要素(BottomSheetや地図ラッパー)を持ち上げるためのオフセット。
// セーフエリア(ホームインジケーター等)ぶんはタブバー側がpaddingで確保するため、ここでも同じ計算式を使う。
export const MOBILE_TABBAR_SPACE = 'calc(4rem + env(safe-area-inset-bottom))';
