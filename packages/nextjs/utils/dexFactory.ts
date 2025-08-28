import { Address } from "viem";

// Vos contrats déployés
export const FACTORY_ADDRESSES = {
  DEX_FACTORY: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6" as Address,
  DEX_ROUTER: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" as Address,
  WETH: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318" as Address,
};

// Interface pour les tokens
export interface Token {
  symbol: string;
  name: string;
  address: Address;
  logo: string;
}

// Liste des tokens supportés (vous pouvez ajouter plus de tokens ici)
export const AVAILABLE_TOKENS: Token[] = [
  {
    symbol: "WTTRUST",
    name: "Wrapped TTRUST",
    address: FACTORY_ADDRESSES.WETH,
    logo: "/intuition.png?v=1",
  },
  {
    symbol: "INTUIT",
    name: "Intuit Token",
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address,
    logo: "/InTrust.png?v=1",
  },
  // Ajoutez ici d'autres tokens ERC20 !
];

// ABIs simplifiés
export const FACTORY_ABI = [
  {
    name: "createPair",
    type: "function",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
  },
  {
    name: "getPair",
    type: "function",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const ROUTER_ABI = [
  {
    name: "swapExactTokensForTokens",
    type: "function",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  },
  {
    name: "getAmountsOut",
    type: "function",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

// Fonctions utiles
export function createTradePath(fromToken: Token, toToken: Token): Address[] {
  return [fromToken.address, toToken.address];
}

export function getDeadline(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
}
