import { buildZip, postSlideJobs, type RenderSlide } from "./engine";
import { introCardHTML, outroCardHTML, toolCardHTML } from "./cards";
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
  const total = opts.post.tools.length + 2;
  const jobs = postSlideJobs(opts.post, (id) => toolMap.get(id)?.name ?? id);

  const render: RenderSlide = async (slide) => {
    if (slide.type === "intro") {
      return renderCard(introCardHTML(opts.post, preset, opts.lightTheme, total, opts.tools));
    }
    if (slide.type === "outro") {
      return renderCard(outroCardHTML(opts.post, preset, opts.lightTheme, total));
    }
    const tool = toolMap.get(slide.tool)!;
    const cat = opts.categories[tool.category] ?? { label: tool.category, color: "#888" };
    return renderCard(toolCardHTML(tool, cat, preset, opts.lightTheme));
  };

  return buildZip(jobs, opts.post.id, render, opts.onProgress);
}
