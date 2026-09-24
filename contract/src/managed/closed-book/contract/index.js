import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

class _Attestation_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))));
  }
  fromValue(value_0) {
    return {
      model: _descriptor_0.fromValue(value_0),
      suite: _descriptor_0.fromValue(value_0),
      predicate: _descriptor_0.fromValue(value_0),
      evidence: _descriptor_0.fromValue(value_0),
      evaluator: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.model).concat(_descriptor_0.toValue(value_0.suite).concat(_descriptor_0.toValue(value_0.predicate).concat(_descriptor_0.toValue(value_0.evidence).concat(_descriptor_0.toValue(value_0.evaluator)))));
  }
}

const _descriptor_3 = new _Attestation_0();

const _descriptor_4 = __compactRuntime.CompactTypeBoolean;

const _descriptor_5 = new __compactRuntime.CompactTypeVector(6, _descriptor_4);

const _descriptor_6 = new __compactRuntime.CompactTypeVector(5, _descriptor_0);

const _descriptor_7 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

const _descriptor_8 = new __compactRuntime.CompactTypeVector(6, _descriptor_0);

const _descriptor_9 = new __compactRuntime.CompactTypeVector(2, _descriptor_0);

const _descriptor_10 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _Either_0 {
  alignment() {
    return _descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_4.fromValue(value_0),
      left: _descriptor_0.fromValue(value_0),
      right: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.is_left).concat(_descriptor_0.toValue(value_0.left).concat(_descriptor_0.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_0();

const _descriptor_12 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_13 = new _ContractAddress_0();

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.evaluatorSecret) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named evaluatorSecret');
    }
    if (typeof(witnesses_0.modelDigest) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named modelDigest');
    }
    if (typeof(witnesses_0.suiteDigest) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named suiteDigest');
    }
    if (typeof(witnesses_0.suiteSalt) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named suiteSalt');
    }
    if (typeof(witnesses_0.checkResults) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named checkResults');
    }
    if (typeof(witnesses_0.evidenceSalt) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named evidenceSalt');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      deriveEvaluatorKey(context, ...args_1) {
        return { result: pureCircuits.deriveEvaluatorKey(...args_1), context };
      },
      commitModel(context, ...args_1) {
        return { result: pureCircuits.commitModel(...args_1), context };
      },
      commitSuite(context, ...args_1) {
        return { result: pureCircuits.commitSuite(...args_1), context };
      },
      packResults(context, ...args_1) {
        return { result: pureCircuits.packResults(...args_1), context };
      },
      countPasses(context, ...args_1) {
        return { result: pureCircuits.countPasses(...args_1), context };
      },
      commitEvidence(context, ...args_1) {
        return { result: pureCircuits.commitEvidence(...args_1), context };
      },
      deriveAttestationId(context, ...args_1) {
        return { result: pureCircuits.deriveAttestationId(...args_1), context };
      },
      attest: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`attest: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const model_0 = args_1[1];
        const suite_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('attest',
                                     'argument 1 (as invoked from Typescript)',
                                     'closed-book.compact line 116 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(model_0.buffer instanceof ArrayBuffer && model_0.BYTES_PER_ELEMENT === 1 && model_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'closed-book.compact line 116 char 1',
                                     'Bytes<32>',
                                     model_0)
        }
        if (!(suite_0.buffer instanceof ArrayBuffer && suite_0.BYTES_PER_ELEMENT === 1 && suite_0.length === 32)) {
          __compactRuntime.typeError('attest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'closed-book.compact line 116 char 1',
                                     'Bytes<32>',
                                     suite_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(model_0).concat(_descriptor_0.toValue(suite_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._attest_0(context,
                                        partialProofData,
                                        model_0,
                                        suite_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = { attest: this.circuits.attest };
    this.provableCircuits = { attest: this.circuits.attest };
  }
  initialState(...args_0) {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const evaluatorKey_0 = args_0[1];
    const predicateId_0 = args_0[2];
    const requiredPasses_0 = args_0[3];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(evaluatorKey_0.buffer instanceof ArrayBuffer && evaluatorKey_0.BYTES_PER_ELEMENT === 1 && evaluatorKey_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'closed-book.compact line 55 char 1',
                                 'Bytes<32>',
                                 evaluatorKey_0)
    }
    if (!(predicateId_0.buffer instanceof ArrayBuffer && predicateId_0.BYTES_PER_ELEMENT === 1 && predicateId_0.length === 32)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 2 (argument 3 as invoked from Typescript)',
                                 'closed-book.compact line 55 char 1',
                                 'Bytes<32>',
                                 predicateId_0)
    }
    if (!(typeof(requiredPasses_0) === 'bigint' && requiredPasses_0 >= 0n && requiredPasses_0 <= 255n)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 3 (argument 4 as invoked from Typescript)',
                                 'closed-book.compact line 55 char 1',
                                 'Uint<0..256>',
                                 requiredPasses_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('attest', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(3n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(4n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(0n),
                                                                                              alignment: _descriptor_10.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.assert(requiredPasses_0 <= 6n,
                            'threshold exceeds number of checks');
    __compactRuntime.assert(requiredPasses_0 > 0n,
                            'threshold must be at least one check');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(evaluatorKey_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(predicateId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(requiredPasses_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_9, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_7, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_8, value_0);
    return result_0;
  }
  _persistentHash_3(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_6, value_0);
    return result_0;
  }
  _evaluatorSecret_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.evaluatorSecret(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('evaluatorSecret',
                                 'return value',
                                 'closed-book.compact line 48 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _modelDigest_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.modelDigest(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('modelDigest',
                                 'return value',
                                 'closed-book.compact line 49 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _suiteDigest_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.suiteDigest(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('suiteDigest',
                                 'return value',
                                 'closed-book.compact line 50 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _suiteSalt_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.suiteSalt(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('suiteSalt',
                                 'return value',
                                 'closed-book.compact line 51 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _checkResults_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.checkResults(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 6 && result_0.every((t) => typeof(t) === 'boolean'))) {
      __compactRuntime.typeError('checkResults',
                                 'return value',
                                 'closed-book.compact line 52 char 1',
                                 'Vector<6, Boolean>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  _evidenceSalt_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.evidenceSalt(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('evidenceSalt',
                                 'return value',
                                 'closed-book.compact line 53 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _deriveEvaluatorKey_0(secret_0) {
    return this._persistentHash_0([new Uint8Array([99, 108, 111, 115, 101, 100, 98, 111, 111, 107, 58, 101, 118, 97, 108, 117, 97, 116, 111, 114, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   secret_0]);
  }
  _commitModel_0(digest_0) {
    return this._persistentHash_0([new Uint8Array([99, 108, 111, 115, 101, 100, 98, 111, 111, 107, 58, 109, 111, 100, 101, 108, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   digest_0]);
  }
  _commitSuite_0(digest_0, salt_0) {
    return this._persistentHash_1([new Uint8Array([99, 108, 111, 115, 101, 100, 98, 111, 111, 107, 58, 115, 117, 105, 116, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   digest_0,
                                   salt_0]);
  }
  _packResults_0(results_0) {
    const mask_0 = (results_0[0] ? 1n : 0n) + (results_0[1] ? 2n : 0n)
                   +
                   (results_0[2] ? 4n : 0n)
                   +
                   (results_0[3] ? 8n : 0n)
                   +
                   (results_0[4] ? 16n : 0n)
                   +
                   (results_0[5] ? 32n : 0n);
    return __compactRuntime.convertFieldToBytes(32,
                                                mask_0,
                                                'closed-book.compact line 83 char 10');
  }
  _countPasses_0(results_0) {
    const total_0 = (results_0[0] ? 1n : 0n) + (results_0[1] ? 1n : 0n)
                    +
                    (results_0[2] ? 1n : 0n)
                    +
                    (results_0[3] ? 1n : 0n)
                    +
                    (results_0[4] ? 1n : 0n)
                    +
                    (results_0[5] ? 1n : 0n);
    return total_0;
  }
  _commitEvidence_0(model_0, suite_0, predicateId_0, packed_0, salt_0) {
    return this._persistentHash_2([new Uint8Array([99, 108, 111, 115, 101, 100, 98, 111, 111, 107, 58, 101, 118, 105, 100, 101, 110, 99, 101, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   model_0,
                                   suite_0,
                                   predicateId_0,
                                   packed_0,
                                   salt_0]);
  }
  _deriveAttestationId_0(model_0, suite_0, predicateId_0, evidence_0) {
    return this._persistentHash_3([new Uint8Array([99, 108, 111, 115, 101, 100, 98, 111, 111, 107, 58, 97, 116, 116, 101, 115, 116, 97, 116, 105, 111, 110, 58, 118, 49, 0, 0, 0, 0, 0, 0, 0]),
                                   model_0,
                                   suite_0,
                                   predicateId_0,
                                   evidence_0]);
  }
  _attest_0(context, partialProofData, model_0, suite_0) {
    const signer_0 = this._deriveEvaluatorKey_0(this._evaluatorSecret_0(context,
                                                                        partialProofData));
    __compactRuntime.assert(this._equal_0(signer_0,
                                          _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_1.toValue(0n),
                                                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value)),
                            'not the registered evaluator');
    __compactRuntime.assert(this._equal_1(this._commitModel_0(this._modelDigest_0(context,
                                                                                  partialProofData)),
                                          model_0),
                            'model commitment mismatch');
    __compactRuntime.assert(this._equal_2(this._commitSuite_0(this._suiteDigest_0(context,
                                                                                  partialProofData),
                                                              this._suiteSalt_0(context,
                                                                                partialProofData)),
                                          suite_0),
                            'suite commitment mismatch');
    const results_0 = this._checkResults_0(context, partialProofData);
    let t_0;
    __compactRuntime.assert((t_0 = this._countPasses_0(results_0),
                             t_0
                             >=
                             _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(2n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { popeq: { cached: false,
                                                                                                   result: undefined } }]).value)),
                            'release predicate not satisfied');
    const evidence_0 = this._commitEvidence_0(model_0,
                                              suite_0,
                                              _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                        partialProofData,
                                                                                                        [
                                                                                                         { dup: { n: 0 } },
                                                                                                         { idx: { cached: false,
                                                                                                                  pushPath: false,
                                                                                                                  path: [
                                                                                                                         { tag: 'value',
                                                                                                                           value: { value: _descriptor_1.toValue(1n),
                                                                                                                                    alignment: _descriptor_1.alignment() } }] } },
                                                                                                         { popeq: { cached: false,
                                                                                                                    result: undefined } }]).value),
                                              this._packResults_0(results_0),
                                              this._evidenceSalt_0(context,
                                                                   partialProofData));
    const id_0 = this._deriveAttestationId_0(model_0,
                                             suite_0,
                                             _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                       partialProofData,
                                                                                                       [
                                                                                                        { dup: { n: 0 } },
                                                                                                        { idx: { cached: false,
                                                                                                                 pushPath: false,
                                                                                                                 path: [
                                                                                                                        { tag: 'value',
                                                                                                                          value: { value: _descriptor_1.toValue(1n),
                                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                                        { popeq: { cached: false,
                                                                                                                   result: undefined } }]).value),
                                             evidence_0);
    __compactRuntime.assert(!_descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_1.toValue(3n),
                                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'attestation already recorded');
    const tmp_0 = { model: model_0,
                    suite: suite_0,
                    predicate:
                      _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                partialProofData,
                                                                                [
                                                                                 { dup: { n: 0 } },
                                                                                 { idx: { cached: false,
                                                                                          pushPath: false,
                                                                                          path: [
                                                                                                 { tag: 'value',
                                                                                                   value: { value: _descriptor_1.toValue(1n),
                                                                                                            alignment: _descriptor_1.alignment() } }] } },
                                                                                 { popeq: { cached: false,
                                                                                            result: undefined } }]).value),
                    evidence: evidence_0,
                    evaluator: signer_0 };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(3n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                                              alignment: _descriptor_3.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 1n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_1.toValue(4n),
                                                                  alignment: _descriptor_1.alignment() } }] } },
                                       { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                                              { value: _descriptor_2.toValue(tmp_1),
                                                                alignment: _descriptor_2.alignment() }
                                                                .value
                                                            )) } },
                                       { ins: { cached: true, n: 1 } }]);
    return id_0;
  }
  _equal_0(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get evaluator() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(0n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get predicate() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(1n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get threshold() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_1.toValue(2n),
                                                                                                   alignment: _descriptor_1.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    attestations: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_10.toValue(0n),
                                                                                                                                 alignment: _descriptor_10.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_1.toValue(3n),
                                                                                                      alignment: _descriptor_1.alignment() } }] } },
                                                                           'size',
                                                                           { popeq: { cached: true,
                                                                                      result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'closed-book.compact line 40 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(key_0.buffer instanceof ArrayBuffer && key_0.BYTES_PER_ELEMENT === 1 && key_0.length === 32)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'closed-book.compact line 40 char 1',
                                     'Bytes<32>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_1.toValue(3n),
                                                                                                     alignment: _descriptor_1.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[3];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_3.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    get attestationCount() {
      return _descriptor_10.fromValue(__compactRuntime.queryLedgerState(context,
                                                                        partialProofData,
                                                                        [
                                                                         { dup: { n: 0 } },
                                                                         { idx: { cached: false,
                                                                                  pushPath: false,
                                                                                  path: [
                                                                                         { tag: 'value',
                                                                                           value: { value: _descriptor_1.toValue(4n),
                                                                                                    alignment: _descriptor_1.alignment() } }] } },
                                                                         { popeq: { cached: true,
                                                                                    result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  evaluatorSecret: (...args) => undefined,
  modelDigest: (...args) => undefined,
  suiteDigest: (...args) => undefined,
  suiteSalt: (...args) => undefined,
  checkResults: (...args) => undefined,
  evidenceSalt: (...args) => undefined
});
export const pureCircuits = {
  deriveEvaluatorKey: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`deriveEvaluatorKey: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const secret_0 = args_0[0];
    if (!(secret_0.buffer instanceof ArrayBuffer && secret_0.BYTES_PER_ELEMENT === 1 && secret_0.length === 32)) {
      __compactRuntime.typeError('deriveEvaluatorKey',
                                 'argument 1',
                                 'closed-book.compact line 67 char 1',
                                 'Bytes<32>',
                                 secret_0)
    }
    return _dummyContract._deriveEvaluatorKey_0(secret_0);
  },
  commitModel: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`commitModel: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const digest_0 = args_0[0];
    if (!(digest_0.buffer instanceof ArrayBuffer && digest_0.BYTES_PER_ELEMENT === 1 && digest_0.length === 32)) {
      __compactRuntime.typeError('commitModel',
                                 'argument 1',
                                 'closed-book.compact line 71 char 1',
                                 'Bytes<32>',
                                 digest_0)
    }
    return _dummyContract._commitModel_0(digest_0);
  },
  commitSuite: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`commitSuite: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const digest_0 = args_0[0];
    const salt_0 = args_0[1];
    if (!(digest_0.buffer instanceof ArrayBuffer && digest_0.BYTES_PER_ELEMENT === 1 && digest_0.length === 32)) {
      __compactRuntime.typeError('commitSuite',
                                 'argument 1',
                                 'closed-book.compact line 75 char 1',
                                 'Bytes<32>',
                                 digest_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('commitSuite',
                                 'argument 2',
                                 'closed-book.compact line 75 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._commitSuite_0(digest_0, salt_0);
  },
  packResults: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`packResults: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const results_0 = args_0[0];
    if (!(Array.isArray(results_0) && results_0.length === 6 && results_0.every((t) => typeof(t) === 'boolean'))) {
      __compactRuntime.typeError('packResults',
                                 'argument 1',
                                 'closed-book.compact line 80 char 1',
                                 'Vector<6, Boolean>',
                                 results_0)
    }
    return _dummyContract._packResults_0(results_0);
  },
  countPasses: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`countPasses: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const results_0 = args_0[0];
    if (!(Array.isArray(results_0) && results_0.length === 6 && results_0.every((t) => typeof(t) === 'boolean'))) {
      __compactRuntime.typeError('countPasses',
                                 'argument 1',
                                 'closed-book.compact line 86 char 1',
                                 'Vector<6, Boolean>',
                                 results_0)
    }
    return _dummyContract._countPasses_0(results_0);
  },
  commitEvidence: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`commitEvidence: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const model_0 = args_0[0];
    const suite_0 = args_0[1];
    const predicateId_0 = args_0[2];
    const packed_0 = args_0[3];
    const salt_0 = args_0[4];
    if (!(model_0.buffer instanceof ArrayBuffer && model_0.BYTES_PER_ELEMENT === 1 && model_0.length === 32)) {
      __compactRuntime.typeError('commitEvidence',
                                 'argument 1',
                                 'closed-book.compact line 92 char 1',
                                 'Bytes<32>',
                                 model_0)
    }
    if (!(suite_0.buffer instanceof ArrayBuffer && suite_0.BYTES_PER_ELEMENT === 1 && suite_0.length === 32)) {
      __compactRuntime.typeError('commitEvidence',
                                 'argument 2',
                                 'closed-book.compact line 92 char 1',
                                 'Bytes<32>',
                                 suite_0)
    }
    if (!(predicateId_0.buffer instanceof ArrayBuffer && predicateId_0.BYTES_PER_ELEMENT === 1 && predicateId_0.length === 32)) {
      __compactRuntime.typeError('commitEvidence',
                                 'argument 3',
                                 'closed-book.compact line 92 char 1',
                                 'Bytes<32>',
                                 predicateId_0)
    }
    if (!(packed_0.buffer instanceof ArrayBuffer && packed_0.BYTES_PER_ELEMENT === 1 && packed_0.length === 32)) {
      __compactRuntime.typeError('commitEvidence',
                                 'argument 4',
                                 'closed-book.compact line 92 char 1',
                                 'Bytes<32>',
                                 packed_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('commitEvidence',
                                 'argument 5',
                                 'closed-book.compact line 92 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._commitEvidence_0(model_0,
                                            suite_0,
                                            predicateId_0,
                                            packed_0,
                                            salt_0);
  },
  deriveAttestationId: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`deriveAttestationId: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const model_0 = args_0[0];
    const suite_0 = args_0[1];
    const predicateId_0 = args_0[2];
    const evidence_0 = args_0[3];
    if (!(model_0.buffer instanceof ArrayBuffer && model_0.BYTES_PER_ELEMENT === 1 && model_0.length === 32)) {
      __compactRuntime.typeError('deriveAttestationId',
                                 'argument 1',
                                 'closed-book.compact line 98 char 1',
                                 'Bytes<32>',
                                 model_0)
    }
    if (!(suite_0.buffer instanceof ArrayBuffer && suite_0.BYTES_PER_ELEMENT === 1 && suite_0.length === 32)) {
      __compactRuntime.typeError('deriveAttestationId',
                                 'argument 2',
                                 'closed-book.compact line 98 char 1',
                                 'Bytes<32>',
                                 suite_0)
    }
    if (!(predicateId_0.buffer instanceof ArrayBuffer && predicateId_0.BYTES_PER_ELEMENT === 1 && predicateId_0.length === 32)) {
      __compactRuntime.typeError('deriveAttestationId',
                                 'argument 3',
                                 'closed-book.compact line 98 char 1',
                                 'Bytes<32>',
                                 predicateId_0)
    }
    if (!(evidence_0.buffer instanceof ArrayBuffer && evidence_0.BYTES_PER_ELEMENT === 1 && evidence_0.length === 32)) {
      __compactRuntime.typeError('deriveAttestationId',
                                 'argument 4',
                                 'closed-book.compact line 98 char 1',
                                 'Bytes<32>',
                                 evidence_0)
    }
    return _dummyContract._deriveAttestationId_0(model_0,
                                                 suite_0,
                                                 predicateId_0,
                                                 evidence_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
