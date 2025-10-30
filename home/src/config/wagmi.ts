import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'CipherStake',
  projectId: '00000000000000000000000000000000', // Replace with WalletConnect project ID
  chains: [sepolia],
  ssr: false,
});
