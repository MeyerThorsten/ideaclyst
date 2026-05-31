/**
 * One interface over both access modes. getSource() picks disk (default) or REST
 * from effective settings. Disk is always used for write-back when REST exposes no
 * suggestion-create endpoint (documented fallback).
 */

import { resolveSettings } from "../settings/store";
import { DiskSource } from "./disk-source";
import { RestSource } from "./rest-source";
import type { ProjectRead, ProjectSummary, ThrelmarkSuggestionFile } from "./types";

export interface ThrelmarkSource {
  listProjects(): Promise<ProjectSummary[]>;
  readProject(id: string): Promise<ProjectRead | null>;
  writeSuggestion(projectId: string, suggestion: ThrelmarkSuggestionFile): Promise<string>;
}

export async function getSource(): Promise<ThrelmarkSource> {
  const settings = await resolveSettings();
  if (settings.roadmapSource === "rest" && settings.baseUrl) {
    return new RestSource(settings.baseUrl, settings.dataDir);
  }
  // Disk is the default, and also the fallback when roadmapSource==="rest" but baseUrl is unset.
  return new DiskSource(settings.dataDir);
}
