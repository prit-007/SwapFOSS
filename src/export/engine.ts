import JSZip from "jszip";
import { buildSlides, slideFilename, type PostSlide } from "./deep-cards";
import type { Post } from "@/types";

export type Slide = PostSlide;

export interface SlideJob {
  slide: Slide;
  filename: string;
  label: string;
}

export type RenderSlide = (slide: Slide, job: SlideJob) => Promise<Blob>;
export type ProgressFn = (current: number, total: number, message: string) => void;

/** Build the ordered slide list + filenames/labels for a post. */
export function postSlideJobs(post: Post, toolName: (id: string) => string): SlideJob[] {
  const slides = buildSlides(post);
  const total = slides.length;

  return slides.map((slide, i) => {
    const num = i + 1;
    if (slide.type === "intro") {
      return { slide, filename: slideFilename(slide, num, total), label: "intro" };
    }
    if (slide.type === "outro") {
      return { slide, filename: slideFilename(slide, num, total), label: "outro" };
    }
    if (slide.type === "deep") {
      return {
        slide,
        filename: slideFilename(slide, num, total),
        label: `${toolName(slide.tool)} — ${slide.part}`,
      };
    }
    return {
      slide,
      filename: slideFilename(slide, num, total),
      label: toolName(slide.tool),
    };
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
