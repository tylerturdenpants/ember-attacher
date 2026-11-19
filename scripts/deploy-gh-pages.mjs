#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const distDir = resolve(process.argv[2] || 'dist');
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();

const worktreeDir = mkdtempSync(join(tmpdir(), 'ember-attacher-gh-pages-'));

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, stdio: 'inherit' });
}

try {
  git(['fetch', 'origin', 'gh-pages']);
  git(['worktree', 'add', '--detach', worktreeDir, 'origin/gh-pages']);

  for (const entry of readdirSync(worktreeDir)) {
    if (entry === '.git') continue;
    rmSync(join(worktreeDir, entry), { recursive: true, force: true });
  }

  cpSync(distDir, worktreeDir, { recursive: true });
  git(['add', '--all'], worktreeDir);

  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: worktreeDir,
    encoding: 'utf8',
  }).trim();

  if (!status) {
    console.log('No changes to deploy to gh-pages.');
  } else {
    git(['commit', '-m', `Deploy gh-pages from commit ${headSha}`], worktreeDir);
    git(['push', 'origin', 'HEAD:refs/heads/gh-pages'], worktreeDir);
  }
} finally {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', worktreeDir], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
  } catch {
    rmSync(worktreeDir, { recursive: true, force: true });
  }
}
