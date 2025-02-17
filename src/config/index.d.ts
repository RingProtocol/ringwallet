import type { AppKitNetwork } from '@reown/appkit/networks';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
export declare const projectId: any;
export declare const metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
};
export declare const networks: [AppKitNetwork, ...AppKitNetwork[]];
export declare const ethersAdapter: EthersAdapter;
