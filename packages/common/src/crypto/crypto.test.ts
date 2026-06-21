import {
  sha256,
  sha256d,
  generateKeyPair,
  signMessage,
  verifySignature,
  merkleRoot,
} from './index';

describe('crypto primitives', () => {
  it('sha256 is deterministic and 64 hex chars', () => {
    const h = sha256('hello');
    expect(h).toHaveLength(64);
    expect(sha256('hello')).toBe(h);
    expect(sha256('hello2')).not.toBe(h);
  });

  it('sha256d double-hashes', () => {
    expect(sha256d('abc')).toBe(sha256(sha256('abc')));
  });

  it('generates a keypair with a 0x address', () => {
    const kp = generateKeyPair();
    expect(kp.address).toMatch(/^0x[0-9a-f]{40}$/);
    expect(kp.publicKey).toBeTruthy();
    expect(kp.privateKey).toBeTruthy();
  });

  it('signs and verifies a message', () => {
    const kp = generateKeyPair();
    const msg = 'transfer:10:0xabc';
    const sig = signMessage(msg, kp.privateKey);
    expect(verifySignature(msg, sig, kp.publicKey)).toBe(true);
    expect(verifySignature('tampered', sig, kp.publicKey)).toBe(false);
  });

  it('computes a stable merkle root', () => {
    const leaves = [sha256('a'), sha256('b'), sha256('c')];
    const root = merkleRoot(leaves);
    expect(root).toHaveLength(64);
    expect(merkleRoot(leaves)).toBe(root);
  });
});
