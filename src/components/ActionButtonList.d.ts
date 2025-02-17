interface ActionButtonListProps {
    sendHash: (hash: string) => void;
    sendSignMsg: (hash: string) => void;
    sendBalance: (balance: string) => void;
}
export declare const ActionButtonList: ({ sendHash, sendSignMsg, sendBalance }: ActionButtonListProps) => import("react/jsx-runtime").JSX.Element;
export {};
