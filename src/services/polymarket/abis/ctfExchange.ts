export const CTF_EXCHANGE_V1_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
          { internalType: 'address', name: 'maker', type: 'address' },
          { internalType: 'address', name: 'signer', type: 'address' },
          { internalType: 'address', name: 'taker', type: 'address' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'makerAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'takerAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'expiration', type: 'uint256' },
          { internalType: 'uint256', name: 'nonce', type: 'uint256' },
          { internalType: 'uint256', name: 'feeRateBps', type: 'uint256' },
          { internalType: 'uint8', name: 'side', type: 'uint8' },
          { internalType: 'uint8', name: 'signatureType', type: 'uint8' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'struct Order',
        name: 'order',
        type: 'tuple',
      },
      { internalType: 'uint256', name: 'fillAmount', type: 'uint256' },
    ],
    name: 'fillOrder',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'cancelled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getFeeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const CONDITIONAL_TOKENS_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'conditionId', type: 'bytes32' },
      { internalType: 'uint256[]', name: 'indexSets', type: 'uint256[]' },
    ],
    name: 'getCollectionId',
    outputs: [
      { internalType: 'bytes32', name: 'collectionId', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'oracle', type: 'address' },
      { internalType: 'bytes32', name: 'questionId', type: 'bytes32' },
      { internalType: 'uint256', name: 'outcomeSlotCount', type: 'uint256' },
    ],
    name: 'getConditionId',
    outputs: [
      { internalType: 'bytes32', name: 'conditionId', type: 'bytes32' },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'parentCollectionId', type: 'bytes32' },
      { internalType: 'bytes32', name: 'conditionId', type: 'bytes32' },
      { internalType: 'uint256', name: 'indexSet', type: 'uint256' },
    ],
    name: 'getPositionId',
    outputs: [{ internalType: 'uint256', name: 'positionId', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const

export const ERC20_APPROVE_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
] as const
