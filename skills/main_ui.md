# UI structure: three sections (top, middle, bottom)

## Top section
- Left: Chain switch
- Right: Account details (see account_drawer.md)

## Middle section
- First part: Display balance (with small text showing prefix and suffix of current account address below)
- Second part: Main action buttons — Send, Receive, Swap

## Bottom section
- Multi-tab component (see MultiTabs)
- First tab: Token list and balances (component: TokenBalance)
- Second tab: Transaction activity / history (component: TransactionHistory)
