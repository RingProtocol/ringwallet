#!/usr/bin/env python3
"""Reorder chainid.yaml: priority chains first with index 1..35, then rest with index 36+.

Requires PyYAML (e.g. `python3 -m venv .venv && . .venv/bin/activate && pip install pyyaml`).
Run from repo root: `python3 scripts/reorder_chainid_yaml.py`
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Install PyYAML: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
YAML_PATH = ROOT / "docs" / "multichainwallet" / "chainid.yaml"

# Exact - name: values to pull from the chainlist (first match wins)
PRIORITY_NAMES: list[str] = [
    "Ethereum Mainnet",
    "Solana Mainnet",  # stub if missing
    "BNB Smart Chain Mainnet",
    "Tron Mainnet",
    "Base",
    "Bitcoin Mainnet",  # stub if missing
    "Arbitrum One",
    "Hyperliquid EVM Mainnet",
    "Provenance Mainnet",  # stub if missing
    "Plasma Mainnet",
    "Polygon Mainnet",
    "Mantle",
    "Avalanche C-Chain",
    "Sui Mainnet",
    "Ink",
    "zKatana",
    "Poly Network",  # stub if missing
    "Cronos Mainnet",
    "Monad",
    "Aptos Mainnet",
    "Starknet Mainnet",
    "Scroll",
    "OP Mainnet",
    "Flare Mainnet",
    "Stellar Mainnet",
    "Movement EVM",
    "Cardano Mainnet",
    "dYdX Chain Mainnet",
    "Stacks Mainnet",
    "ENI Mainnet",
    "Rootstock Mainnet",
    "Gnosis",
    "MegaETH Mainnet",
    "Linea",
    "Berachain",
]


def stub_solana() -> dict:
    return {
        "name": "Solana Mainnet",
        "title": "Solana Mainnet",
        "chain": "SOL",
        "rpc": ["https://api.mainnet-beta.solana.com", "https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"],
        "features": [],
        "faucets": [],
        "nativeCurrency": {"name": "Solana", "symbol": "SOL", "decimals": 9},
        "infoURL": "https://solana.com",
        "shortName": "sol-mainnet",
        "chainId": 888888801,
        "networkId": 888888801,
        "explorers": [
            {"name": "Solscan", "url": "https://solscan.io", "standard": "none"},
        ],
    }


def stub_bitcoin() -> dict:
    return {
        "name": "Bitcoin Mainnet",
        "title": "Bitcoin Mainnet (non-EVM)",
        "chain": "BTC",
        "rpc": ["https://blockstream.info/api", "https://mempool.space/api"],
        "features": [],
        "faucets": [],
        "nativeCurrency": {"name": "Bitcoin", "symbol": "BTC", "decimals": 8},
        "infoURL": "https://bitcoin.org",
        "shortName": "btc-mainnet",
        "chainId": 888888802,
        "networkId": 888888802,
        "explorers": [
            {"name": "Mempool", "url": "https://mempool.space", "standard": "none"},
        ],
    }


def stub_provenance() -> dict:
    return {
        "name": "Provenance Mainnet",
        "title": "Provenance Mainnet (Cosmos SDK; chain-id pio-mainnet-1)",
        "chain": "HASH",
        "rpc": ["https://grpc.provenance.io:443", "https://api.provenance.io"],
        "features": [],
        "faucets": [],
        "nativeCurrency": {"name": "Hash", "symbol": "HASH", "decimals": 9},
        "infoURL": "https://provenance.io",
        "shortName": "pio-mainnet",
        "chainId": 888888803,
        "networkId": 888888803,
        "explorers": [
            {"name": "Provenance Explorer", "url": "https://explorer.provenance.io", "standard": "none"},
        ],
    }


def stub_poly_network() -> dict:
    return {
        "name": "Poly Network",
        "title": "Poly Network (cross-chain interoperability protocol)",
        "chain": "POLY",
        "rpc": ["https://bridge.poly.network"],
        "features": [],
        "faucets": [],
        "nativeCurrency": {"name": "N/A", "symbol": "N/A", "decimals": 0},
        "infoURL": "https://poly.network",
        "shortName": "poly-network",
        "chainId": 888888804,
        "networkId": 888888804,
        "explorers": [],
    }


STUBS: dict[str, dict] = {
    "Solana Mainnet": stub_solana(),
    "Bitcoin Mainnet": stub_bitcoin(),
    "Provenance Mainnet": stub_provenance(),
    "Poly Network": stub_poly_network(),
}


def find_entry_by_name(chains: list[dict], name: str) -> tuple[int | None, dict | None]:
    for i, ch in enumerate(chains):
        if ch.get("name") == name:
            return i, ch
    return None, None


def insert_index(ch: dict, idx: int) -> dict:
    out = copy.deepcopy(ch)
    out.pop("index", None)
    ordered: dict = {}
    for k, v in out.items():
        ordered[k] = v
        if k == "name":
            ordered["index"] = idx
    return ordered


def main() -> None:
    if not YAML_PATH.is_file():
        print(f"Missing {YAML_PATH}", file=sys.stderr)
        sys.exit(1)

    with open(YAML_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not isinstance(data, list):
        print("Expected root YAML array", file=sys.stderr)
        sys.exit(1)

    chains = data
    used_indices: set[int] = set()
    priority: list[dict] = []

    for name in PRIORITY_NAMES:
        pos, entry = find_entry_by_name(chains, name)
        if entry is not None:
            used_indices.add(pos)
            priority.append(copy.deepcopy(entry))
        elif name in STUBS:
            priority.append(copy.deepcopy(STUBS[name]))
        else:
            print(f"Missing chain and no stub: {name}", file=sys.stderr)
            sys.exit(1)

    for ch in priority:
        if ch.get("name") == "Hyperliquid EVM Mainnet":
            ch["title"] = "Hyperliquid L1 (HyperEVM)"

    remainder: list[dict] = []
    for i, ch in enumerate(chains):
        if i in used_indices:
            continue
        remainder.append(copy.deepcopy(ch))

    out: list[dict] = []
    for i, ch in enumerate(priority, start=1):
        out.append(insert_index(ch, i))

    next_idx = len(priority) + 1
    for ch in remainder:
        out.append(insert_index(ch, next_idx))
        next_idx += 1

    with open(YAML_PATH, "w", encoding="utf-8") as f:
        f.write("---\n")
        yaml.dump(
            out,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=120,
        )

    print(f"Wrote {len(out)} chains to {YAML_PATH}")


if __name__ == "__main__":
    main()
