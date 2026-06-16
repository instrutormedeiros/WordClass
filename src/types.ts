export interface Word {
  text: string;
  value: number;
}

export type SlideType =
  | "pick-answer"
  | "short-answer"
  | "spinner-wheel"
  | "match-pairs"
  | "correct-order"
  | "categorise"
  | "poll"
  | "open-ended"
  | "wordcloud"
  | "brainstorm"
  | "idea-board"
  | "pin-on-image"
  | "ranking"
  | "rating-scale"
  | "qa"
  | "survey"
  | "content"
  | "heading"
  | "list"
  | "diagram"
  | "image"
  | "qr-code"
  | "youtube"
  | "embed";

export interface SlideSettings {
  isOpen: boolean;
  maxWordsPerSubmit: number;
  maxWordLength: number;
  allowMultipleSubmissions: boolean;
  profanityFilter: boolean;
  showResultsToAudience: boolean;
}

export interface Slide {
  id: string;
  type: SlideType;
  question: string;
  words: Record<string, number>;
  options: string[];
  votes: Record<string, number>;
  responses: string[];
  ratings: Record<string, number>;
  content: string;
  settings: SlideSettings;
}

export interface Presentation {
  id: string;
  code: string;
  title: string;
  slides: Slide[];
  currentSlideIndex: number;
  presenterId: string;
  createdAt: number;
  updatedAt: number;
  participantsCount: number;
  version: "live";
}
