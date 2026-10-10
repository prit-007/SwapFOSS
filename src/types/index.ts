export type ScreenshotType = "landscape" | "portrait";
export type Difficulty = "easy" | "medium" | "hard";

export interface Tool {
  id: string;
  name: string;
  category: string;
  insteadOf: string;
  hook: string;
  bullets?: string[];
  features?: string[];
  setupSteps?: string[];
  details?: string;
  setup: string;
  difficulty: Difficulty;
  link: string;
  repo: string;
  logo?: string;
  screenshot?: string;
  screenshotType?: ScreenshotType;
}

export interface Category {
  label: string;
  color: string;
}

export type Categories = Record<string, Category>;

export interface Highlight {
  word: string;
  color?: string;
}

export interface PostIntro {
  eyebrow: string;
  headline: string;
  subhead: string;
  pills?: string[];
  hl?: Highlight;
}

export interface PostOutro {
  headline: string;
  subhead: string;
}

export interface Post {
  id: string;
  title: string;
  intro: PostIntro;
  tools: string[];
  outro: PostOutro;
  format?: string;
}

export interface ToolManifest {
  tools: string[];
}

export interface PostManifest {
  posts: string[];
}
