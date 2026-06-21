import {
  mineBlock,
  createGenesisBlock,
  validateChain,
  balanceOf,
  calculateTxHash,
  calculateBlockHash,
  SYSTEM_ADDRESS,
  type Block,
  type ChainTransaction,
} from './chain';

const DIFFICULTY = 2; // keep tests fast

function tx(sender: string, receiver: string, amount: string, fee = '0'): ChainTransaction {
  const base = { sender, receiver, amount, fee, timestamp: new Date().toISOString() };
  return { ...base, txHash: calculateTxHash(base) };
}

describe('blockchain core', () => {
  it('mines a block whose hash satisfies the difficulty target', () => {
    const genesis = createGenesisBlock(DIFFICULTY);
    expect(genesis.hash.startsWith('0'.repeat(DIFFICULTY))).toBe(true);
    expect(calculateBlockHash(genesis)).toBe(genesis.hash);
  });

  it('builds and validates a multi-block chain', () => {
    const genesis = createGenesisBlock(DIFFICULTY);
    const b1 = mineBlock(1, genesis.hash, [tx(SYSTEM_ADDRESS, '0xalice', '100')], DIFFICULTY);
    const b2 = mineBlock(2, b1.hash, [tx('0xalice', '0xbob', '30', '1')], DIFFICULTY);
    const chain: Block[] = [genesis, b1, b2];

    expect(validateChain(chain).valid).toBe(true);
  });

  it('detects tampering with a block', () => {
    const genesis = createGenesisBlock(DIFFICULTY);
    const b1 = mineBlock(1, genesis.hash, [tx(SYSTEM_ADDRESS, '0xalice', '100')], DIFFICULTY);
    const chain: Block[] = [genesis, b1];

    // Tamper: change an amount without re-mining.
    chain[1].transactions[0].amount = '999';
    expect(validateChain(chain).valid).toBe(false);
  });

  it('detects broken linkage', () => {
    const genesis = createGenesisBlock(DIFFICULTY);
    const b1 = mineBlock(1, 'deadbeef'.repeat(8), [], DIFFICULTY);
    expect(validateChain([genesis, b1]).valid).toBe(false);
  });

  it('computes balances from confirmed transactions', () => {
    const genesis = createGenesisBlock(DIFFICULTY);
    const b1 = mineBlock(1, genesis.hash, [tx(SYSTEM_ADDRESS, '0xalice', '100')], DIFFICULTY);
    const b2 = mineBlock(2, b1.hash, [tx('0xalice', '0xbob', '30', '1')], DIFFICULTY);
    const chain = [genesis, b1, b2];

    expect(balanceOf(chain, '0xalice')).toBe(69); // 100 - 30 - 1
    expect(balanceOf(chain, '0xbob')).toBe(30);
  });
});
