import { sha256, merkleRoot } from '@blockchain/common';

/** A transaction as it lives on-chain. Amounts are decimal strings to preserve
 *  precision across the wire; arithmetic uses Number which is sufficient for the
 *  platform's token granularity. */
export interface ChainTransaction {
  sender: string; // '0xSYSTEM' for coinbase/faucet/mining-reward
  receiver: string;
  amount: string;
  fee: string;
  signature?: string;
  txHash: string;
  timestamp: string;
}

export interface BlockData {
  index: number;
  timestamp: string;
  previousHash: string;
  nonce: number;
  difficulty: number;
  merkleRoot: string;
  transactions: ChainTransaction[];
}

export interface Block extends BlockData {
  hash: string;
}

export const SYSTEM_ADDRESS = '0xSYSTEM';

/** Deterministic hash over the immutable header fields of a block. */
export function calculateBlockHash(b: BlockData): string {
  return sha256(
    `${b.index}|${b.timestamp}|${b.previousHash}|${b.merkleRoot}|${b.nonce}|${b.difficulty}`,
  );
}

/** Canonical hash for a single transaction (used as its id on-chain). */
export function calculateTxHash(tx: Omit<ChainTransaction, 'txHash'>): string {
  return sha256(`${tx.sender}|${tx.receiver}|${tx.amount}|${tx.fee}|${tx.timestamp}`);
}

/**
 * Merkle leaf for a transaction. Hashes the FULL content (including amount/fee)
 * — not just txHash — so any tampering with a stored transaction invalidates the
 * block's merkle root and therefore its hash, regardless of how txHash was
 * originally derived.
 */
function txLeaf(tx: ChainTransaction): string {
  return sha256(`${tx.txHash}|${tx.sender}|${tx.receiver}|${tx.amount}|${tx.fee}|${tx.timestamp}`);
}

const target = (difficulty: number): string => '0'.repeat(difficulty);

/** Proof-of-Work: increment the nonce until the block hash has `difficulty`
 *  leading zeros. Returns the sealed block including its hash. */
export function mineBlock(
  index: number,
  previousHash: string,
  transactions: ChainTransaction[],
  difficulty: number,
): Block {
  const timestamp = new Date().toISOString();
  const root = merkleRoot(transactions.map(txLeaf));
  const prefix = target(difficulty);

  let nonce = 0;
  let hash = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate: BlockData = {
      index,
      timestamp,
      previousHash,
      nonce,
      difficulty,
      merkleRoot: root,
      transactions,
    };
    hash = calculateBlockHash(candidate);
    if (hash.startsWith(prefix)) {
      return { ...candidate, hash };
    }
    nonce++;
  }
}

/** Build the genesis block (index 0, no transactions). */
export function createGenesisBlock(difficulty: number): Block {
  return mineBlock(0, '0'.repeat(64), [], difficulty);
}

/** Validate hash linkage, recomputed hashes, merkle roots and PoW for the chain. */
export function validateChain(blocks: Block[]): { valid: boolean; message: string } {
  if (blocks.length === 0) return { valid: false, message: 'Empty chain' };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (calculateBlockHash(block) !== block.hash) {
      return { valid: false, message: `Block ${block.index} has an invalid hash` };
    }
    if (!block.hash.startsWith(target(block.difficulty))) {
      return { valid: false, message: `Block ${block.index} does not satisfy proof-of-work` };
    }
    if (merkleRoot(block.transactions.map(txLeaf)) !== block.merkleRoot) {
      return { valid: false, message: `Block ${block.index} has an invalid merkle root` };
    }
    if (i > 0 && block.previousHash !== blocks[i - 1].hash) {
      return { valid: false, message: `Block ${block.index} breaks the chain linkage` };
    }
  }
  return { valid: true, message: 'Chain is valid' };
}

/** Compute the confirmed balance of an address from the chain. */
export function balanceOf(blocks: Block[], address: string): number {
  let balance = 0;
  for (const block of blocks) {
    for (const tx of block.transactions) {
      if (tx.receiver === address) balance += Number(tx.amount);
      if (tx.sender === address) balance -= Number(tx.amount) + Number(tx.fee);
    }
  }
  return balance;
}
