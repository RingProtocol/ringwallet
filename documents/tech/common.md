HD Wallet changes this: Deterministic:
Given the same seed, the generated address sequence is always exactly the same.
Hierarchical: It has a hierarchical structure like a folder.
You can create different "branches" for a seed, such as a branch dedicated to receiving payments and a branch dedicated to making change.

It is essential to understand several standard protocols of HD wallet:
BIP-39: Defines how to convert random numbers into human-readable mnemonics (Mnemonic).
BIP-32: Defines the core mathematical formulas for hierarchical structures.
BIP-44: Path standards defined.
For example, the general path of Ethereum is usually: $$m / 44' / 60' / 0' / 0 / 0$$
60' represents Ethereum.
The last number represents the account index (1st address, 2nd address...).
