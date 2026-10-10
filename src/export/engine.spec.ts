import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { postSlideJobs, buildZip } from "./engine";
import type { Post } from "@/types";

const post: Post = {
  id: "post-001",
  title: "T",
  intro: { eyebrow: "e", headline: "h", subhead: "s" },
  tools: ["jellyfin", "streamio"],
  outro: { headline: "h", subhead: "s" },
};

describe("postSlideJobs", () => {
  it("lists intro, tools in order, then outro with numbered filenames", () => {
    const jobs = postSlideJobs(post, (id) => id[0].toUpperCase() + id.slice(1));
    expect(jobs.map((j) => j.filename)).toEqual([
      "01-intro.png",
      "02-jellyfin.png",
      "03-streamio.png",
      "04-outro.png",
    ]);
    expect(jobs.map((j) => j.slide.type)).toEqual(["intro", "tool", "tool", "outro"]);
    expect(jobs[1].label).toBe("Jellyfin");
  });
});

describe("buildZip", () => {
  it("bundles one PNG per slide under the post folder", async () => {
    const jobs = postSlideJobs(post, (id) => id);
    const render = vi.fn(async () => new Blob(["x"], { type: "image/png" }));
    const { blob, fileCount } = await buildZip(jobs, "post-001", render);
    expect(fileCount).toBe(4);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort()).toEqual([
      "post-001/01-intro.png",
      "post-001/02-jellyfin.png",
      "post-001/03-streamio.png",
      "post-001/04-outro.png",
    ]);
    expect(render).toHaveBeenCalledTimes(4);
  });

  it("reports progress for each slide plus packaging", async () => {
    const jobs = postSlideJobs(post, (id) => id);
    const messages: string[] = [];
    await buildZip(
      jobs,
      "post-001",
      async () => new Blob(["x"]),
      (cur, total, msg) => messages.push(`${cur}/${total} ${msg}`),
    );
    expect(messages).toEqual([
      "1/4 Rendering intro",
      "2/4 Rendering jellyfin",
      "3/4 Rendering streamio",
      "4/4 Rendering outro",
      "4/4 Packaging ZIP",
    ]);
  });
});
