import { buildZip, postSlideJobs, type RenderSlide } from "./engine";
import { introCardHTML, outroCardHTML, toolCardHTML } from "./cards";
import { deepCardHTML } from "./deep-cards";
import { renderCard } from "./render";
import { PRESETS, type PresetKey } from "./presets";
import type { Categories, Post, Tool } from "@/types";

export interface PostZipOptions {
  post: Post;
  tools: Tool[];
  categories: Categories;
  presetKey: PresetKey;
  lightTheme: boolean;
  onProgress?: (current: number, total: number, message: string) => void;
}

/** Render every slide of a post and bundle the PNGs into a ZIP blob. */
export async function buildPostZip(
  opts: PostZipOptions,
): Promise<{ blob: Blob; fileCount: number }> {
  const preset = PRESETS[opts.presetKey] ?? PRESETS.linkedin;
  const toolMap = new Map(opts.tools.map((t) => [t.id, t]));
  const jobs = postSlideJobs(opts.post, (id) => toolMap.get(id)?.name ?? id);
  const total = jobs.length;

  const render: RenderSlide = async (slide, job) => {
    const index = jobs.indexOf(job) + 1;
    if (slide.type === "intro") {
      return renderCard(introCardHTML(opts.post, preset, opts.lightTheme, total, opts.tools));
    }
    if (slide.type === "outro") {
      return renderCard(outroCardHTML(opts.post, preset, opts.lightTheme, total));
    }
    const tool = toolMap.get(slide.tool)!;
    const cat = opts.categories[tool.category] ?? { label: tool.category, color: "#888" };
    if (slide.type === "deep") {
      return renderCard(
        deepCardHTML(slide.part, tool, cat, { index, total, preset, light: opts.lightTheme }),
      );
    }
    return renderCard(toolCardHTML(tool, cat, preset, opts.lightTheme));
  };

  return buildZip(jobs, opts.post.id, render, opts.onProgress);
}
