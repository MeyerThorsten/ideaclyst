/** Disk implementation of ThrelmarkSource. Thin wrapper delegating to reader.ts and writer.ts. */

import { listProjectsFromDisk, readProjectFromDisk } from "./reader";
import { writeSuggestionToDisk } from "./writer";
import type { ThrelmarkSource } from "./source";
import type { ProjectRead, ProjectSummary, ThrelmarkSuggestionFile } from "./types";

export class DiskSource implements ThrelmarkSource {
  constructor(private dataDir?: string) {}
  listProjects(): Promise<ProjectSummary[]> {
    return listProjectsFromDisk(this.dataDir);
  }
  readProject(id: string): Promise<ProjectRead | null> {
    return readProjectFromDisk(id, this.dataDir);
  }
  writeSuggestion(projectId: string, suggestion: ThrelmarkSuggestionFile): Promise<string> {
    return writeSuggestionToDisk(projectId, suggestion, this.dataDir);
  }
}
