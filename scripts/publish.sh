#!/usr/bin/env bash
set -euo pipefail

# Keep this worktree outside the source so --delete only cleans deployment files.
site_dir="$(pwd)/_site"
test -f "$site_dir/index.html"
test -f "$site_dir/CNAME"
test -f "$site_dir/version.json"
publish_dir="$(mktemp -d)"
trap 'git worktree remove --force "$publish_dir"' EXIT
if git ls-remote --exit-code --heads origin gh-pages > /dev/null; then
  git fetch origin gh-pages
  git worktree add --detach "$publish_dir" FETCH_HEAD
else
  git worktree add --detach "$publish_dir" HEAD
  git -C "$publish_dir" switch --orphan pages-output
fi
# Remove stale and hidden files, preserving only the worktree Git metadata.
rsync -a --delete --exclude='.git' "$site_dir/" "$publish_dir/"
touch "$publish_dir/.nojekyll"
git -C "$publish_dir" add --all
git -C "$publish_dir" -c user.name='github-actions[bot]' -c user.email='41898282+github-actions[bot]@users.noreply.github.com' commit --allow-empty -m "Deploy ${SITE_VERSION:?SITE_VERSION is required}"
git -C "$publish_dir" push origin HEAD:refs/heads/gh-pages
