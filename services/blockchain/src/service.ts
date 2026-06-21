import {
  AppError,
  ErrorCode,
  Topics,
  EventTypes,
  buildEvent,
  publishEvent,
  businessCounter,
  createLogger,
} from '@blockchain/common';
import { prisma } from './prisma';
import { config } from './config';
import {
  Block,
  ChainTransaction,
  createGenesisBlock,
  mineBlock as powMine,
  validateChain,
  balanceOf,
  calculateTxHash,
  SYSTEM_ADDRESS,
} from './chain';

const log = createLogger('blockchain-service');

// In-memory mempool of pending transactions awaiting inclusion in a block.
const mempool: ChainTransaction[] = [];

let mining = false;

/** Map a persisted block (+ its txs) into the in-memory Block shape. */
function toBlock(row: {
  index: number;
  timestamp: Date;
  previousHash: string;
  hash: string;
  nonce: bigint;
  difficulty: number;
  merkleRoot: string;
  transactions: Array<{
    sender: string;
    receiver: string;
    amount: { toString(): string };
    fee: { toString(): string };
    signature: string | null;
    txHash: string;
    timestamp: Date;
  }>;
}): Block {
  return {
    index: row.index,
    timestamp: row.timestamp.toISOString(),
    previousHash: row.previousHash,
    hash: row.hash,
    nonce: Number(row.nonce),
    difficulty: row.difficulty,
    merkleRoot: row.merkleRoot,
    transactions: row.transactions.map((t) => ({
      sender: t.sender,
      receiver: t.receiver,
      amount: t.amount.toString(),
      fee: t.fee.toString(),
      signature: t.signature ?? undefined,
      txHash: t.txHash,
      timestamp: t.timestamp.toISOString(),
    })),
  };
}

async function loadChain(limit?: number): Promise<Block[]> {
  const rows = await prisma.block.findMany({
    orderBy: { index: 'asc' },
    include: { transactions: true },
    ...(limit ? { take: limit } : {}),
  });
  return rows.map(toBlock);
}

async function getLatestBlock(): Promise<Block | null> {
  const row = await prisma.block.findFirst({
    orderBy: { index: 'desc' },
    include: { transactions: true },
  });
  return row ? toBlock(row) : null;
}

/** Persist a sealed block and its transactions atomically. */
async function persistBlock(block: Block): Promise<void> {
  await prisma.block.create({
    data: {
      index: block.index,
      timestamp: new Date(block.timestamp),
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: BigInt(block.nonce),
      difficulty: block.difficulty,
      merkleRoot: block.merkleRoot,
      transactions: {
        create: block.transactions.map((t) => ({
          sender: t.sender,
          receiver: t.receiver,
          amount: t.amount,
          fee: t.fee,
          signature: t.signature,
          txHash: t.txHash,
          timestamp: new Date(t.timestamp),
        })),
      },
    },
  });
}

/** Create the genesis block on first boot if the chain is empty. */
export async function ensureGenesis(): Promise<void> {
  const count = await prisma.block.count();
  if (count === 0) {
    const genesis = createGenesisBlock(config.difficulty);
    await persistBlock(genesis);
    log.info({ hash: genesis.hash }, 'Genesis block created');
  }
}

export function submitTransaction(input: {
  sender: string;
  receiver: string;
  amount: string;
  fee?: string;
  signature?: string;
  txHash?: string;
}): { accepted: boolean; txHash: string; mempoolSize: number } {
  const timestamp = new Date().toISOString();
  const base = {
    sender: input.sender,
    receiver: input.receiver,
    amount: input.amount,
    fee: input.fee ?? '0',
    timestamp,
  };
  const txHash = input.txHash || calculateTxHash(base);

  if (mempool.some((t) => t.txHash === txHash)) {
    return { accepted: true, txHash, mempoolSize: mempool.length };
  }
  mempool.push({ ...base, signature: input.signature, txHash });
  businessCounter.inc({ name: 'tx_submitted' });
  return { accepted: true, txHash, mempoolSize: mempool.length };
}

/** Mine the next block from mempool transactions (+ a coinbase reward). */
export async function mine(minerAddress?: string): Promise<Block> {
  if (mining) throw new AppError(ErrorCode.UNAVAILABLE, 'A block is already being mined');
  mining = true;
  try {
    const latest = (await getLatestBlock()) ?? (await ensureGenesis(), await getLatestBlock());
    if (!latest) throw AppError.internal('Chain not initialized');

    const miner = minerAddress || config.minerAddress;
    const included = mempool.splice(0, config.blockTxLimit);

    // Coinbase / mining-reward transaction.
    const rewardBase = {
      sender: SYSTEM_ADDRESS,
      receiver: miner,
      amount: String(config.miningReward),
      fee: '0',
      timestamp: new Date().toISOString(),
    };
    const reward: ChainTransaction = { ...rewardBase, txHash: calculateTxHash(rewardBase) };

    const block = powMine(
      latest.index + 1,
      latest.hash,
      [reward, ...included],
      config.difficulty,
    );
    await persistBlock(block);
    businessCounter.inc({ name: 'block_mined' });
    log.info(
      { index: block.index, hash: block.hash, txs: block.transactions.length },
      'Block mined',
    );

    // Announce the block and verify each included (non-coinbase) transaction.
    await publishEvent(
      Topics.BLOCKCHAIN,
      buildEvent(EventTypes.BLOCK_MINED, {
        index: block.index,
        hash: block.hash,
        minerAddress: miner,
        reward: config.miningReward,
        transactions: block.transactions.map((t) => ({
          txHash: t.txHash,
          sender: t.sender,
          receiver: t.receiver,
          amount: t.amount,
          fee: t.fee,
        })),
      }),
      block.hash,
    );
    for (const t of included) {
      await publishEvent(
        Topics.BLOCKCHAIN,
        buildEvent(EventTypes.TX_VERIFIED, { txHash: t.txHash, blockIndex: block.index }),
        t.txHash,
      );
    }
    return block;
  } finally {
    mining = false;
  }
}

/** Called by the event consumer when a transaction is created elsewhere. */
export async function ingestAndMaybeMine(tx: {
  sender: string;
  receiver: string;
  amount: string;
  fee?: string;
  txHash?: string;
  signature?: string;
}): Promise<void> {
  submitTransaction(tx);
  if (config.autoMine && mempool.length > 0) {
    await mine();
  }
}

export async function getChain(limit?: number): Promise<{ blocks: Block[]; length: number }> {
  const blocks = await loadChain(limit);
  const total = await prisma.block.count();
  return { blocks, length: total };
}

export async function getBlock(index: number): Promise<Block> {
  const row = await prisma.block.findUnique({
    where: { index },
    include: { transactions: true },
  });
  if (!row) throw AppError.notFound(`Block ${index} not found`);
  return toBlock(row);
}

export async function validate(): Promise<{ valid: boolean; message: string }> {
  return validateChain(await loadChain());
}

export async function getBalance(address: string): Promise<number> {
  return balanceOf(await loadChain(), address);
}

export const mempoolSize = (): number => mempool.length;
