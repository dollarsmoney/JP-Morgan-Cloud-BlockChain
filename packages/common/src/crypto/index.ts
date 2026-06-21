import crypto from 'crypto';

/** SHA256 hex digest of an arbitrary string. */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Double SHA256 (as used by many chains) for block hashing. */
export function sha256d(data: string): string {
  return sha256(sha256(data));
}

/**
 * Generate an EC keypair (secp256k1) and a derived wallet address.
 * Address = '0x' + last 20 bytes of sha256(publicKey). Keys returned as hex.
 */
export function generateKeyPair(): { publicKey: string; privateKey: string; address: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });
  const pubHex = publicKey.toString('hex');
  const privHex = privateKey.toString('hex');
  const address = '0x' + sha256(pubHex).slice(-40);
  return { publicKey: pubHex, privateKey: privHex, address };
}

/** Sign a message with a hex-encoded PKCS8 private key. Returns hex signature. */
export function signMessage(message: string, privateKeyHex: string): string {
  const key = crypto.createPrivateKey({
    key: Buffer.from(privateKeyHex, 'hex'),
    format: 'der',
    type: 'pkcs8',
  });
  return crypto.sign('sha256', Buffer.from(message), key).toString('hex');
}

/** Verify a hex signature against a message and hex-encoded SPKI public key. */
export function verifySignature(
  message: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(
      'sha256',
      Buffer.from(message),
      key,
      Buffer.from(signatureHex, 'hex'),
    );
  } catch {
    return false;
  }
}

/** Merkle root of an ordered list of leaf hashes (hex). */
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256('');
  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(left + right));
    }
    level = next;
  }
  return level[0];
}
