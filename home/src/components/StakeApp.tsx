import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { Header } from './Header';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CUSDT_ADDRESS, CUSDT_ABI, CIPHERSTAKE_ADDRESS, CIPHERSTAKE_ABI } from '../config/contracts';
import { decryptEuint64 } from '../utils/fhe';
import '../styles/StakeApp.css';

type DisplayValue = {
  value: string;
  locked: boolean;
};

type BalancesState = {
  wallet: DisplayValue;
  staked: DisplayValue;
  total: DisplayValue;
};

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const SECONDS_IN_DAY = 24n * 60n * 60n;

function parseAmount(input: string): bigint | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (!/^\d*(\.\d{0,6})?$/.test(trimmed)) return null;

  const [integerPart, fractional = ''] = trimmed.split('.');
  const normalizedFraction = (fractional + '000000').slice(0, 6);
  const joined = `${integerPart}${normalizedFraction}`.replace(/^0+/, '');
  return BigInt(joined === '' ? '0' : joined);
}

function formatAmount(value: bigint): string {
  const decimals = 1_000_000n;
  const integer = value / decimals;
  const fraction = value % decimals;
  if (fraction === 0n) {
    return integer.toString();
  }
  const fractionStr = fraction.toString().padStart(6, '0').replace(/0+$/, '');
  return `${integer.toString()}.${fractionStr}`;
}

export function StakeApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { instance, isLoading: isInstanceLoading, error: instanceError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [balances, setBalances] = useState<BalancesState>({
    wallet: { value: '0', locked: false },
    staked: { value: '0', locked: false },
    total: { value: '0', locked: false },
  });
  const [mintAmount, setMintAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [isMinting, setIsMinting] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [status, setStatus] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);

  const resetStatus = useCallback(() => setStatus(null), []);

  const addressesConfigured = CUSDT_ADDRESS !== ZERO_ADDRESS && CIPHERSTAKE_ADDRESS !== ZERO_ADDRESS;

  const refreshBalances = useCallback(async () => {
    if (!publicClient || !address || !addressesConfigured) {
      setBalances({
        wallet: { value: '0', locked: false },
        staked: { value: '0', locked: false },
        total: { value: '0', locked: false },
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const [walletHandle, stakeHandle, totalHandle] = await Promise.all([
        publicClient.readContract({
          address: CUSDT_ADDRESS,
          abi: CUSDT_ABI,
          functionName: 'confidentialBalanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: CIPHERSTAKE_ADDRESS,
          abi: CIPHERSTAKE_ABI,
          functionName: 'stakeOf',
          args: [address],
        }),
        publicClient.readContract({
          address: CIPHERSTAKE_ADDRESS,
          abi: CIPHERSTAKE_ABI,
          functionName: 'totalStaked',
        }),
      ]) as [`0x${string}`, `0x${string}`, `0x${string}`];

      const requests: { handle: string; contractAddress: string }[] = [];
      if (walletHandle !== ZERO_HASH) {
        requests.push({ handle: walletHandle, contractAddress: CUSDT_ADDRESS });
      }
      if (stakeHandle !== ZERO_HASH) {
        requests.push({ handle: stakeHandle, contractAddress: CIPHERSTAKE_ADDRESS });
      }
      if (totalHandle !== ZERO_HASH) {
        requests.push({ handle: totalHandle, contractAddress: CIPHERSTAKE_ADDRESS });
      }

      if (!instance || !signerPromise || requests.length === 0) {
        setBalances({
          wallet: { value: walletHandle === ZERO_HASH ? '0' : 'Locked', locked: walletHandle !== ZERO_HASH },
          staked: { value: stakeHandle === ZERO_HASH ? '0' : 'Locked', locked: stakeHandle !== ZERO_HASH },
          total: { value: totalHandle === ZERO_HASH ? '0' : 'Locked', locked: totalHandle !== ZERO_HASH },
        });
        return;
      }

      const signer = await signerPromise;
      if (!signer) {
        setBalances({
          wallet: { value: walletHandle === ZERO_HASH ? '0' : 'Locked', locked: walletHandle !== ZERO_HASH },
          staked: { value: stakeHandle === ZERO_HASH ? '0' : 'Locked', locked: stakeHandle !== ZERO_HASH },
          total: { value: totalHandle === ZERO_HASH ? '0' : 'Locked', locked: totalHandle !== ZERO_HASH },
        });
        return;
      }

      const decrypted = await decryptEuint64(instance, signer, address, requests);

      setBalances({
        wallet: {
          value: walletHandle === ZERO_HASH ? '0' : formatAmount(decrypted[walletHandle] ?? 0n),
          locked: walletHandle !== ZERO_HASH && decrypted[walletHandle] === undefined,
        },
        staked: {
          value: stakeHandle === ZERO_HASH ? '0' : formatAmount(decrypted[stakeHandle] ?? 0n),
          locked: stakeHandle !== ZERO_HASH && decrypted[stakeHandle] === undefined,
        },
        total: {
          value: totalHandle === ZERO_HASH ? '0' : formatAmount(decrypted[totalHandle] ?? 0n),
          locked: totalHandle !== ZERO_HASH && decrypted[totalHandle] === undefined,
        },
      });
    } catch (error) {
      console.error('Failed to refresh balances', error);
      setStatus({ tone: 'error', text: 'Unable to decrypt balances. Refresh access and try again.' });
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, address, instance, signerPromise, addressesConfigured]);

  useEffect(() => {
    if (isConnected) {
      refreshBalances();
    } else {
      setBalances({
        wallet: { value: '0', locked: false },
        staked: { value: '0', locked: false },
        total: { value: '0', locked: false },
      });
    }
  }, [isConnected, refreshBalances]);

  const requireSigner = useCallback(async () => {
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Wallet signer unavailable');
    }
    return signer;
  }, [signerPromise]);

  const handleMint = useCallback(async () => {
    resetStatus();
    if (!addressesConfigured) {
      setStatus({ tone: 'error', text: 'Contract addresses are not configured.' });
      return;
    }
    if (!isConnected || !address) {
      setStatus({ tone: 'error', text: 'Please connect your wallet first.' });
      return;
    }

    const parsed = parseAmount(mintAmount);
    if (parsed === null || parsed === 0n) {
      setStatus({ tone: 'error', text: 'Enter a valid amount greater than zero.' });
      return;
    }

    try {
      setIsMinting(true);
      const signer = await requireSigner();
      const contract = new Contract(CUSDT_ADDRESS, CUSDT_ABI, signer);
      const tx = await contract.mint(address, parsed);
      setStatus({ tone: 'info', text: 'Minting transaction submitted...' });
      await tx.wait();
      setStatus({ tone: 'success', text: 'Minted cUSDT successfully.' });
      setMintAmount('');
      await refreshBalances();
    } catch (error) {
      console.error('Mint failed', error);
      setStatus({ tone: 'error', text: 'Mint failed. Check console for details.' });
    } finally {
      setIsMinting(false);
    }
  }, [address, isConnected, mintAmount, refreshBalances, requireSigner, resetStatus]);

  const handleAuthorize = useCallback(async () => {
    resetStatus();
    if (!addressesConfigured) {
      setStatus({ tone: 'error', text: 'Contract addresses are not configured.' });
      return;
    }
    if (!isConnected) {
      setStatus({ tone: 'error', text: 'Connect your wallet to set an operator.' });
      return;
    }

    try {
      setIsAuthorizing(true);
      const signer = await requireSigner();
      const contract = new Contract(CUSDT_ADDRESS, CUSDT_ABI, signer);
      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
      const expiry = currentTimestamp + 30n * SECONDS_IN_DAY;
      const tx = await contract.setOperator(CIPHERSTAKE_ADDRESS, expiry);
      setStatus({ tone: 'info', text: 'Authorizing CipherStake as operator...' });
      await tx.wait();
      setStatus({ tone: 'success', text: 'Operator permissions active for 30 days.' });
    } catch (error) {
      console.error('Authorization failed', error);
      setStatus({ tone: 'error', text: 'Authorization failed. See console for details.' });
    } finally {
      setIsAuthorizing(false);
    }
  }, [isConnected, requireSigner, resetStatus]);

  const handleStake = useCallback(async () => {
    resetStatus();
    if (!addressesConfigured) {
      setStatus({ tone: 'error', text: 'Contract addresses are not configured.' });
      return;
    }
    if (!isConnected || !instance) {
      setStatus({ tone: 'error', text: 'Connect wallet and ensure encryption is ready.' });
      return;
    }

    const parsed = parseAmount(stakeAmount);
    if (parsed === null || parsed === 0n) {
      setStatus({ tone: 'error', text: 'Enter a stake amount greater than zero.' });
      return;
    }

    try {
      setIsStaking(true);
      const signer = await requireSigner();
      const encrypted = await instance
        .createEncryptedInput(CIPHERSTAKE_ADDRESS, address)
        .add64(parsed)
        .encrypt();

      const contract = new Contract(CIPHERSTAKE_ADDRESS, CIPHERSTAKE_ABI, signer);
      const tx = await contract.stake(encrypted.handles[0], encrypted.inputProof);
      setStatus({ tone: 'info', text: 'Stake transaction submitted...' });
      await tx.wait();
      setStatus({ tone: 'success', text: 'Stake completed.' });
      setStakeAmount('');
      await refreshBalances();
    } catch (error) {
      console.error('Stake failed', error);
      setStatus({ tone: 'error', text: 'Stake failed. Check console for details.' });
    } finally {
      setIsStaking(false);
    }
  }, [address, instance, isConnected, refreshBalances, requireSigner, resetStatus, stakeAmount]);

  const handleWithdraw = useCallback(async () => {
    resetStatus();
    if (!addressesConfigured) {
      setStatus({ tone: 'error', text: 'Contract addresses are not configured.' });
      return;
    }
    if (!isConnected || !instance) {
      setStatus({ tone: 'error', text: 'Connect wallet and ensure encryption is ready.' });
      return;
    }

    const parsed = parseAmount(withdrawAmount);
    if (parsed === null || parsed === 0n) {
      setStatus({ tone: 'error', text: 'Enter a withdrawal amount greater than zero.' });
      return;
    }

    try {
      setIsWithdrawing(true);
      const signer = await requireSigner();
      const encrypted = await instance
        .createEncryptedInput(CIPHERSTAKE_ADDRESS, address)
        .add64(parsed)
        .encrypt();

      const contract = new Contract(CIPHERSTAKE_ADDRESS, CIPHERSTAKE_ABI, signer);
      const tx = await contract.unstake(encrypted.handles[0], encrypted.inputProof);
      setStatus({ tone: 'info', text: 'Withdrawal transaction submitted...' });
      await tx.wait();
      setStatus({ tone: 'success', text: 'Withdrawal completed.' });
      setWithdrawAmount('');
      await refreshBalances();
    } catch (error) {
      console.error('Withdraw failed', error);
      setStatus({ tone: 'error', text: 'Withdraw failed. Check console for details.' });
    } finally {
      setIsWithdrawing(false);
    }
  }, [address, instance, isConnected, refreshBalances, requireSigner, resetStatus, withdrawAmount]);

  const handleRefreshPermissions = useCallback(async () => {
    resetStatus();
    if (!addressesConfigured) {
      setStatus({ tone: 'error', text: 'Contract addresses are not configured.' });
      return;
    }
    if (!isConnected) {
      setStatus({ tone: 'error', text: 'Connect your wallet to refresh access.' });
      return;
    }

    try {
      setIsRefreshing(true);
      const signer = await requireSigner();
      const contract = new Contract(CIPHERSTAKE_ADDRESS, CIPHERSTAKE_ABI, signer);
      await contract.refreshMyStakeAccess();
      await contract.requestTotalAccess();
      setStatus({ tone: 'success', text: 'Decryption access refreshed.' });
      await refreshBalances();
    } catch (error) {
      console.error('Refresh access failed', error);
      setStatus({ tone: 'error', text: 'Failed to refresh access permissions.' });
    } finally {
      setIsRefreshing(false);
    }
  }, [isConnected, refreshBalances, requireSigner, resetStatus]);

  const isReady = useMemo(() => !isInstanceLoading && !instanceError, [isInstanceLoading, instanceError]);

  return (
    <div className="stake-app">
      <Header />

      {/* Animated background elements */}
      <div className="background-decoration">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <main className="stake-main">
        <section className="hero">
          <h2>Confidential Staking for cUSDT</h2>
          <p>
            Mint confidential cUSDT, authorize CipherStake as your operator, and manage private staking positions.
            All balances remain encrypted while still under your control.
          </p>
        </section>

        {status && (
          <div className={`status-banner status-${status.tone}`}>
            {status.text}
          </div>
        )}

        {!addressesConfigured && (
          <div className="status-banner status-error">
            Update cUSDT and CipherStake addresses in <code>src/config/contracts.ts</code> before using the dApp.
          </div>
        )}

        {instanceError && (
          <div className="status-banner status-error">
            Encryption service failed to initialize. Please retry after reloading the page.
          </div>
        )}

        {!isConnected ? (
          <div className="empty-state-large">
            <div className="empty-state-icon">🔒</div>
            <h3>Connect Your Wallet</h3>
            <p>Connect your wallet to start minting and staking confidential cUSDT.</p>
          </div>
        ) : (
          <div className="layout-grid">
            {/* Left Panel - Statistics */}
            <aside className="stats-panel">
              <div className="stats-panel-header">
                <h3>Your Portfolio</h3>
                <button
                  onClick={refreshBalances}
                  disabled={!addressesConfigured || isRefreshing}
                  className="refresh-icon-button"
                  title="Refresh balances"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
              </div>

              <div className="stat-large">
                <div className="stat-large-label">
                  <span>Wallet Balance</span>
                  {balances.wallet.locked && <span className="lock-badge">🔒 Locked</span>}
                </div>
                <div className="stat-large-value">
                  {balances.wallet.locked ? '•••••••' : balances.wallet.value}
                </div>
                <div className="stat-large-unit">cUSDT</div>
              </div>

              <div className="stat-divider"></div>

              <div className="stat-medium">
                <div className="stat-medium-label">
                  <span>Staked Amount</span>
                  {balances.staked.locked && <span className="lock-badge-small">🔒</span>}
                </div>
                <div className="stat-medium-value">
                  {balances.staked.locked ? '•••••••' : `${balances.staked.value} cUSDT`}
                </div>
              </div>

              <div className="stat-medium">
                <div className="stat-medium-label">
                  <span>Total Vaulted</span>
                  {balances.total.locked && <span className="lock-badge-small">🔒</span>}
                </div>
                <div className="stat-medium-value">
                  {balances.total.locked ? '•••••••' : `${balances.total.value} cUSDT`}
                </div>
              </div>

              <button
                onClick={handleRefreshPermissions}
                disabled={!addressesConfigured || isRefreshing || !isReady}
                className="unlock-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
                {isRefreshing ? 'Refreshing Access...' : 'Unlock Encrypted Data'}
              </button>
            </aside>

            {/* Right Panel - Actions */}
            <section className="actions-panel">
              <div className="action-card-new">
                <div className="action-header">
                  <div className="action-icon mint-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Mint cUSDT</h3>
                    <p>Issue fresh confidential tokens to your wallet</p>
                  </div>
                </div>
                <input
                  className="action-input-new"
                  placeholder="Amount (e.g. 100.5)"
                  value={mintAmount}
                  onChange={(event) => setMintAmount(event.target.value)}
                />
                <button
                  onClick={handleMint}
                  disabled={!addressesConfigured || !isConnected || isMinting || !isReady}
                  className="primary-button-new"
                >
                  {isMinting ? 'Minting...' : 'Mint Tokens'}
                </button>
              </div>

              <div className="action-card-new">
                <div className="action-header">
                  <div className="action-icon authorize-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Authorize CipherStake</h3>
                    <p>Grant operator permissions for 30 days</p>
                  </div>
                </div>
                <button
                  onClick={handleAuthorize}
                  disabled={!addressesConfigured || !isConnected || isAuthorizing || !isReady}
                  className="primary-button-new"
                >
                  {isAuthorizing ? 'Authorizing...' : 'Set Operator'}
                </button>
              </div>

              <div className="action-card-new">
                <div className="action-header">
                  <div className="action-icon stake-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Stake cUSDT</h3>
                    <p>Lock tokens into the vault for rewards</p>
                  </div>
                </div>
                <input
                  className="action-input-new"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(event) => setStakeAmount(event.target.value)}
                />
                <button
                  onClick={handleStake}
                  disabled={!addressesConfigured || !isConnected || isStaking || !isReady}
                  className="primary-button-new"
                >
                  {isStaking ? 'Staking...' : 'Stake Now'}
                </button>
              </div>

              <div className="action-card-new">
                <div className="action-header">
                  <div className="action-icon withdraw-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </div>
                  <div>
                    <h3>Withdraw Stake</h3>
                    <p>Unstake tokens back to your wallet</p>
                  </div>
                </div>
                <input
                  className="action-input-new"
                  placeholder="Amount to withdraw"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                />
                <button
                  onClick={handleWithdraw}
                  disabled={!addressesConfigured || !isConnected || isWithdrawing || !isReady}
                  className="secondary-button-new"
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
