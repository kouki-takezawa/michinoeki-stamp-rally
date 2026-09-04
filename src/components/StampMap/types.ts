import type { CheckinRecord, Station } from '../../lib/types';

export interface PrefectureRow {
  prefecture: string;
  total: number;
  done: number;
}

export type CheckedStation = Station & CheckinRecord;
