export type RpcId = number | string | null;

export type RpcBlockTag = 'latest' | 'earliest' | 'pending' | `0x${string}`;

export interface JsonRpcRequest<TParams extends readonly unknown[] = readonly unknown[]> {
  jsonrpc: '2.0';
  id: RpcId;
  method: string;
  params: TParams;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccess<TResult> {
  jsonrpc: '2.0';
  id: RpcId;
  result: TResult;
}

export interface JsonRpcFailure {
  jsonrpc: '2.0';
  id: RpcId;
  error: JsonRpcError;
}

export type JsonRpcResponse<TResult> = JsonRpcSuccess<TResult> | JsonRpcFailure;

export interface RpcTransport {
  request<TResult>(method: string, params?: readonly unknown[]): Promise<TResult>;
}

export interface NativeBalanceOptions {
  blockTag?: RpcBlockTag;
}

export interface NativeBalanceReader {
  getBalance(address: string, options?: NativeBalanceOptions): Promise<bigint>;
  getFormattedBalance(address: string, options?: NativeBalanceOptions): Promise<string>;
}

export interface GasPriceReader {
  getGasPrice(): Promise<bigint>;
}

export interface BlockNumberReader {
  getBlockNumber(): Promise<bigint>;
}
