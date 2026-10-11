import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextVersion } from './version.mjs';

test('first deployment starts at v1.0.0', () => {
  assert.equal(nextVersion([]), 'v1.0.0');
});
test('increments the largest reserved patch, including failed deployment gaps', () => {
  assert.equal(nextVersion(['site-v1.0.9', 'site-v1.0.10', 'site-v1.0.2']), 'v1.0.11');
});
test('ignores unrelated tags', () => {
  assert.equal(nextVersion(['v1.0.99', 'site-v1.0.invalid', 'site-v1.0.0']), 'v1.0.1');
});
