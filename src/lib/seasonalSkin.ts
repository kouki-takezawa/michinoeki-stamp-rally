export interface SeasonalSkin {
  name: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
}

const SKINS: Record<'spring' | 'summer' | 'autumn' | 'winter', SeasonalSkin> = {
  spring: { name: '桜', bgFrom: '#fdf1f3', bgTo: '#fbdee4', accent: '#e08aa0' },
  summer: { name: '新緑', bgFrom: '#f0f7ee', bgTo: '#dcefd6', accent: '#4a9c4a' },
  autumn: { name: '紅葉', bgFrom: '#fdf3e7', bgTo: '#f7ddb8', accent: '#c9781f' },
  winter: { name: '雪', bgFrom: '#f1f6fa', bgTo: '#dbe9f5', accent: '#5b87ad' },
};

export function currentSeasonalSkin(date = new Date()): SeasonalSkin {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return SKINS.spring;
  if (month >= 6 && month <= 8) return SKINS.summer;
  if (month >= 9 && month <= 11) return SKINS.autumn;
  return SKINS.winter;
}
