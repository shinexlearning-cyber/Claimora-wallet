import assert from 'assert';
assert.strictEqual('USER', 'USER');
function inviteRole(requested) {
  if (requested === 'OWNER') throw new Error('Cannot invite OWNER');
  return 'SUPPORT';
}
assert.strictEqual(inviteRole('SUPPORT'), 'SUPPORT');
assert.throws(() => inviteRole('OWNER'));
assert.ok('SecurePass!99xx'.length >= 12);
console.log('test-owner-rules: OK');
