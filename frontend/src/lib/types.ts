export interface Profile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  address: string;
  publicKey: string;
  label: string;
  balance: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  fee: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  txHash: string;
  blockIndex?: number;
  createdAt: string;
  confirmedAt?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AnalyticsSummary {
  wallets: { count: number; totalBalance: number };
  transactions: { total: number; confirmed: number; pending: number; sent: number; volume: number };
  blockchain: { height: number };
  series: Array<{ date: string; count: number; volume: number }>;
}
