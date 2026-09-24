/**
 * Runs the compiled CLOSED BOOK Compact contract in-process with
 * @midnight-ntwrk/compact-runtime. This executes the real circuit logic
 * (every assert in `attest`) against a local contract state.
 *
 * It does NOT generate a zero-knowledge proof and does NOT talk to a Midnight
 * network. Node only: the runtime loads a WASM module from disk.
 */
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
  type WitnessContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
  pureCircuits,
  type Attestation,
  type Ledger,
} from "../../../contract/src/managed/closed-book/contract/index.js";
import { pad32 } from "../commitments";

export const CONTRACT_INFO = {
  contract: "closed-book.compact",
  circuit: "attest",
  compiler: "0.31.1",
  runtime: "0.16.0",
} as const;

/** Private witness data. Lives only in the evaluator's process. */
export interface ClosedBookPrivateState {
  readonly evaluatorSecret: Uint8Array;
  readonly modelDigest: Uint8Array;
  readonly suiteDigest: Uint8Array;
  readonly suiteSalt: Uint8Array;
  readonly results: readonly boolean[];
  readonly evidenceSalt: Uint8Array;
}

type Ctx = WitnessContext<Ledger, ClosedBookPrivateState>;

export const witnesses = {
  evaluatorSecret: ({ privateState }: Ctx): [ClosedBookPrivateState, Uint8Array] => [
    privateState,
    privateState.evaluatorSecret,
  ],
  modelDigest: ({ privateState }: Ctx): [ClosedBookPrivateState, Uint8Array] => [privateState, privateState.modelDigest],
  suiteDigest: ({ privateState }: Ctx): [ClosedBookPrivateState, Uint8Array] => [privateState, privateState.suiteDigest],
  suiteSalt: ({ privateState }: Ctx): [ClosedBookPrivateState, Uint8Array] => [privateState, privateState.suiteSalt],
  checkResults: ({ privateState }: Ctx): [ClosedBookPrivateState, boolean[]] => [
    privateState,
    [...privateState.results],
  ],
  evidenceSalt: ({ privateState }: Ctx): [ClosedBookPrivateState, Uint8Array] => [
    privateState,
    privateState.evidenceSalt,
  ],
};

const EMPTY_STATE: ClosedBookPrivateState = {
  evaluatorSecret: new Uint8Array(32),
  modelDigest: new Uint8Array(32),
  suiteDigest: new Uint8Array(32),
  suiteSalt: new Uint8Array(32),
  results: [false, false, false, false, false, false],
  evidenceSalt: new Uint8Array(32),
};

const COIN_PUBLIC_KEY = "0".repeat(64);

export class LocalClosedBookContract {
  readonly contract = new Contract<ClosedBookPrivateState>(witnesses);
  private context: CircuitContext<ClosedBookPrivateState>;

  constructor(evaluatorKey: Uint8Array, predicateId: string, requiredPasses: number) {
    const init = this.contract.initialState(
      createConstructorContext(EMPTY_STATE, COIN_PUBLIC_KEY),
      evaluatorKey,
      pad32(predicateId),
      BigInt(requiredPasses),
    );
    this.context = createCircuitContext(
      sampleContractAddress(),
      init.currentZswapLocalState,
      init.currentContractState,
      init.currentPrivateState,
    );
  }

  get ledger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  /**
   * Execute the `attest` circuit with the given private witness. Throws the
   * runtime's CompactError (message "failed assert: ...") if any assertion
   * fails; in that case the contract state is unchanged.
   */
  attest(model: Uint8Array, suite: Uint8Array, privateState: ClosedBookPrivateState): Uint8Array {
    const ctx: CircuitContext<ClosedBookPrivateState> = { ...this.context, currentPrivateState: privateState };
    const result = this.contract.impureCircuits.attest(ctx, model, suite);
    // Drop the witness from the retained context once the call is done.
    this.context = { ...result.context, currentPrivateState: EMPTY_STATE };
    return result.result;
  }

  lookup(id: Uint8Array): Attestation | null {
    const l = this.ledger;
    return l.attestations.member(id) ? l.attestations.lookup(id) : null;
  }

  entries(): Array<[Uint8Array, Attestation]> {
    return [...this.ledger.attestations];
  }
}

export { pureCircuits };
