import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Attestation = { model: Uint8Array;
                            suite: Uint8Array;
                            predicate: Uint8Array;
                            evidence: Uint8Array;
                            evaluator: Uint8Array
                          };

export type Witnesses<PS> = {
  evaluatorSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  modelDigest(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  suiteDigest(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  suiteSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  checkResults(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean[]];
  evidenceSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  attest(context: __compactRuntime.CircuitContext<PS>,
         model_0: Uint8Array,
         suite_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type ProvableCircuits<PS> = {
  attest(context: __compactRuntime.CircuitContext<PS>,
         model_0: Uint8Array,
         suite_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
  deriveEvaluatorKey(secret_0: Uint8Array): Uint8Array;
  commitModel(digest_0: Uint8Array): Uint8Array;
  commitSuite(digest_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
  packResults(results_0: boolean[]): Uint8Array;
  countPasses(results_0: boolean[]): bigint;
  commitEvidence(model_0: Uint8Array,
                 suite_0: Uint8Array,
                 predicateId_0: Uint8Array,
                 packed_0: Uint8Array,
                 salt_0: Uint8Array): Uint8Array;
  deriveReleaseKey(model_0: Uint8Array,
                   suite_0: Uint8Array,
                   predicateId_0: Uint8Array): Uint8Array;
  deriveAttestationId(model_0: Uint8Array,
                      suite_0: Uint8Array,
                      predicateId_0: Uint8Array,
                      evidence_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  deriveEvaluatorKey(context: __compactRuntime.CircuitContext<PS>,
                     secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitModel(context: __compactRuntime.CircuitContext<PS>, digest_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitSuite(context: __compactRuntime.CircuitContext<PS>,
              digest_0: Uint8Array,
              salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  packResults(context: __compactRuntime.CircuitContext<PS>, results_0: boolean[]): __compactRuntime.CircuitResults<PS, Uint8Array>;
  countPasses(context: __compactRuntime.CircuitContext<PS>, results_0: boolean[]): __compactRuntime.CircuitResults<PS, bigint>;
  commitEvidence(context: __compactRuntime.CircuitContext<PS>,
                 model_0: Uint8Array,
                 suite_0: Uint8Array,
                 predicateId_0: Uint8Array,
                 packed_0: Uint8Array,
                 salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveReleaseKey(context: __compactRuntime.CircuitContext<PS>,
                   model_0: Uint8Array,
                   suite_0: Uint8Array,
                   predicateId_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deriveAttestationId(context: __compactRuntime.CircuitContext<PS>,
                      model_0: Uint8Array,
                      suite_0: Uint8Array,
                      predicateId_0: Uint8Array,
                      evidence_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  attest(context: __compactRuntime.CircuitContext<PS>,
         model_0: Uint8Array,
         suite_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly evaluator: Uint8Array;
  readonly predicate: Uint8Array;
  readonly threshold: bigint;
  attestations: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Attestation;
    [Symbol.iterator](): Iterator<[Uint8Array, Attestation]>
  };
  releases: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  readonly attestationCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               evaluatorKey_0: Uint8Array,
               predicateId_0: Uint8Array,
               requiredPasses_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
