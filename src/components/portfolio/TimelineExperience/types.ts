export interface TimelineEntry {
  type: 'education' | 'professional';
  start: string;
  end?: string;
  title: string;
  institution?: string;
  company?: string;
  location?: string;
  lat?: number;
  lng?: number;
  description: string;
  skills?: string[];
  logo?: string;
  portrait?: string;
  portraitPosition?: string;
  website?: string;
}

export interface TimelineSerializedEntry extends TimelineEntry {
  id?: string;
}

export interface TimelineEntryView extends TimelineEntry {
  index: number;
  railX: number;
  cityKey: string | null;
  shortTitle: string;
}

export interface TimelineSegment {
  kind: 'intro' | 'entry' | 'gap';
  start: number;
  end: number;
  entryIndex?: number;
  fromIndex?: number;
  toIndex?: number;
}

export interface TimelineModel {
  entries: TimelineEntryView[];
  segments: TimelineSegment[];
  totalUnits: number;
  config: {
    introUnits: number;
    entryUnits: number;
    gapUnits: number;
  };
}

export interface ScrollState {
  phase: 'intro' | 'entry' | 'gap';
  activeIndex: number | null;
  activeTrack: TimelineEntry['type'] | null;
  playheadX: number;
  transitionProgress: number;
}
