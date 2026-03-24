import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writeFile(
	basePath: string,
	relativePath: string,
	content: string,
	overwrite: boolean,
): { path: string; created: boolean; skipped: boolean } {
	const fullPath = join(basePath, relativePath);
	const dir = dirname(fullPath);

	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	if (existsSync(fullPath) && !overwrite) {
		return { path: fullPath, created: false, skipped: true };
	}

	writeFileSync(fullPath, content, "utf-8");
	return { path: fullPath, created: true, skipped: false };
}

export function ensureDir(path: string): void {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
	}
}
