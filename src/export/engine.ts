import JSZip from "jszip";
import type { Post } from "@/types";

export type Slide =
  | { type: "intro" }
  | { type: "tool"; tool: string }
  | { type: "outro" };

export interface SlideJob {
  slide: Slide;
  filename: string;
  label: string;
}

export type RenderSlide = (slide: Slide, job: SlideJob) => Promise<Blob>;
export type ProgressFn = (current: number, total: number, message: string) => void;

/** Build the ordered slide list + filenames/labels for a post. */
export function postSlideJobs(post: Post, toolName: (id: string) => string): SlideJob[] {
  const slides: Slide[] = [
    { type: "intro" },
    ...post.tools.map((tool): Slide => ({ type: "tool", tool })),
    { type: "outro" },
  ];

  return slides.map((slide, i) => {
    const num = String(i + 1).padStart(2, "0");
    if (slide.type === "intro") {
      return { slide, filename: `${num}-intro.png`, label: "intro" };
    }
    if (slide.type === "outro") {
      return { slide, filename: `${num}-outro.png`, label: "outro" };
    }
    return { slide, filename: `${num}-${slide.tool}.png`, label: toolName(slide.tool) };
  });
}

/** Render every slide and bundle the resulting PNGs into a single ZIP. */
export async function buildZip(
  jobs: SlideJob[],
  folder: string,
  render: RenderSlide,
  onProgress?: ProgressFn,
): Promise<{ blob: Blob; fileCount: number }> {
  const zip = new JSZip();
  const dir = zip.folder(folder);
  if (!dir) throw new Error(`Could not create ZIP folder: ${folder}`);

  const total = jobs.length;
  for (let i = 0; i < total; i++) {
    const job = jobs[i];
    onProgress?.(i + 1, total, `Rendering ${job.label}`);
    const blob = await render(job.slide, job);
    dir.file(job.filename, blob);
  }

  onProgress?.(total, total, "Packaging ZIP");
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, fileCount: total };
}
