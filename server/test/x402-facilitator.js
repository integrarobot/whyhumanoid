// The OFFICIAL x402 facilitator for tests: x402Facilitator (@x402/core/facilitator) with the official EVM "exact"
// facilitator scheme (@x402/evm/exact/facilitator). Payment signatures are verified by that official code (EIP-712 /
// EIP-3009 through viem); only the chain is simulated here: balances, used authorisation nonces, a transaction hash
// and a successful receipt. No network, no funds, no real keys.
import { x402Facilitator } from '@x402/core/facilitator';
import { ExactEvmScheme } from '@x402/evm/exact/facilitator';
import { decodeFunctionData, encodeFunctionResult, getAddress, keccak256, toHex, verifyTypedData } from 'viem';

export const BASE_SEPOLIA = 'eip155:84532';
export const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const ABI = [
  { type: 'function', name: 'transferWithAuthorization', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }, { name: 'v', type: 'uint8' }, { name: 'r', type: 'bytes32' }, { name: 's', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'transferWithAuthorization', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }, { name: 'signature', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'version', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'authorizationState', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }, { name: 'n', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
];

// A simulated Base Sepolia USDC: EIP-3009 transfers with single-use nonces.
export function simulatedChain({ balance = 10n ** 12n, asset = BASE_SEPOLIA_USDC } = {}) {
  const used = new Set();
  const balances = new Map();
  const state = { settled: [], balance };
  const bal = (a) => balances.get(getAddress(a)) ?? state.balance;
  const call = (fn, args) => {
    switch (fn) {
      case 'transferWithAuthorization': {
        const [from, , value, , , nonce] = args;
        if (used.has(`${getAddress(from)}:${nonce}`)) throw new Error('FiatTokenV2: authorization is used or canceled');
        if (bal(from) < BigInt(value)) throw new Error('ERC20: transfer amount exceeds balance');
        return undefined;
      }
      case 'balanceOf': return bal(args[0]);
      case 'name': return 'USDC';
      case 'version': return '2';
      case 'authorizationState': return used.has(`${getAddress(args[0])}:${args[1]}`);
      default: throw new Error(`simulated chain: ${fn} not supported`);
    }
  };
  const signer = {
    getAddresses: () => ['0x000000000000000000000000000000000000fAc1'],
    async readContract({ functionName, args = [] }) {
      if (functionName === 'tryAggregate') {
        return args[1].map(({ callData }) => {
          try {
            const d = decodeFunctionData({ abi: ABI, data: callData });
            const r = call(d.functionName, d.args);
            return { success: true, returnData: r === undefined ? '0x' : encodeFunctionResult({ abi: ABI, functionName: d.functionName, result: r }) };
          } catch { return { success: false, returnData: '0x' }; }
        });
      }
      return call(functionName, args);
    },
    verifyTypedData: (a) => verifyTypedData(a),
    async writeContract({ functionName, args }) {
      if (functionName !== 'transferWithAuthorization') throw new Error(`simulated chain: write ${functionName}`);
      call(functionName, args);
      const [from, to, value, , , nonce] = args;
      used.add(`${getAddress(from)}:${nonce}`);
      balances.set(getAddress(from), bal(from) - BigInt(value));
      const hash = keccak256(toHex(`${from}:${nonce}`));
      state.settled.push({ from: getAddress(from), to: getAddress(to), value: BigInt(value), hash });
      return hash;
    },
    async sendTransaction() { throw new Error('simulated chain: sendTransaction not supported'); },
    async waitForTransactionReceipt({ hash }) { return { status: 'success', transactionHash: hash, blockNumber: 1n, logs: null }; },
    async getCode({ address }) { return getAddress(address) === getAddress(asset) ? '0x6080' : '0x'; },
  };
  return { signer, state, used };
}

// The official facilitator as the FacilitatorClient the resource server calls (verify, settle, getSupported), with
// switches to make settlement fail or the facilitator unreachable.
export function officialFacilitator({ chain = simulatedChain() } = {}) {
  const facilitator = new x402Facilitator().register(BASE_SEPOLIA, new ExactEvmScheme(chain.signer));
  const calls = [];
  // failSettle: a definitive refusal. settleThenThrow: the transfer happens, then the transport fails (the outcome is
  // unknown to the server). throwBeforeSettle: the transport fails and nothing moves. ambiguous: an unclear refusal.
  const control = { failSettle: false, down: false, settleThenThrow: false, throwBeforeSettle: false, ambiguous: false, settleDelayMs: 0 };
  const client = {
    async getSupported() { if (control.down) throw new Error('facilitator down'); return facilitator.getSupported(); },
    async verify(payload, requirements) { calls.push({ op: 'verify', payload }); return facilitator.verify(payload, requirements); },
    async settle(payload, requirements) {
      calls.push({ op: 'settle', payload });
      if (control.settleDelayMs) await new Promise((r) => setTimeout(r, control.settleDelayMs));
      if (control.failSettle) return { success: false, errorReason: 'transaction_failed', transaction: '', network: requirements.network };
      if (control.ambiguous) return { success: false, errorReason: 'settlement_timeout', transaction: '', network: requirements.network };
      if (control.throwBeforeSettle) throw new Error('facilitator connection reset');
      const result = await facilitator.settle(payload, requirements);
      if (control.settleThenThrow) throw new Error('facilitator response timed out');
      return result;
    },
  };
  return { client, chain, calls, control };
}
