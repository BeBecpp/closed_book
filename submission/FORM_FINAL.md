# CLOSED BOOK — Midnight Korea Hackathon 2026 · final form answers

Copy each block into the matching field. Fields in [BRACKETS] need your own
registration details; do not guess them.

==================================================
TEAM / PROJECT NAME
==================================================

CLOSED BOOK

==================================================
PARTICIPATION TYPE
==================================================

[FILL FROM LUMA — SOLO OR TEAM]

==================================================
AFFILIATION / NAME
==================================================

[FILL EXACTLY AS REGISTERED ON LUMA]
(If team: name / email / role for every member.)

==================================================
REPRESENTATIVE CONTACT
==================================================

[FILL EMAIL OR DISCORD HANDLE]

==================================================
GITHUB
==================================================

https://github.com/BeBecpp/closed_book

==================================================
MIDNIGHTNTWRK TOPIC
==================================================

Confirmed. The repository topics include `midnightntwrk` (verified with the
GitHub API on 2026-09-27).

==================================================
PROJECT OVERVIEW · 프로젝트 소개
==================================================

EN

CLOSED BOOK is a privacy-preserving AI safety attestation DApp. It lets an evaluator make an AI release claim publicly verifiable without publishing the confidential evaluation behind it.

AI safety evaluation has a transparency paradox. Red-team suites contain sensitive prompts, attack strategies, exploit traces, raw model outputs and evaluator notes. Publishing them exposes the suite, leaks usable attack information and reduces the value of future evaluations. Keeping everything private leaves outsiders no way to check whether a model actually met the claimed release standard.

CLOSED BOOK is a third option.

How it works:
1. The evaluator commits to an exact AI model build and an exact confidential evaluation suite.
2. The six individual safety-check results are supplied as private witness data.
3. A Midnight Compact circuit checks that the evaluator is authorized, that the private model and suite match their public commitments, that the private results satisfy the public release predicate, and that this release has not already been attested.
4. If every condition holds, a public attestation is created with only what verification needs: model commitment, suite commitment, release predicate, evidence commitment, evaluator key, release key and attestation ID. Each attestation has a shareable receipt page.
5. If the private results do not satisfy the predicate (in the demo, a single failed check out of six), the attestation is refused. The public does not learn which check failed, which prompt was used, what the model output was, or what exploit was found.

Try it at https://closed-book.vercel.app: generate a 6/6 attestation, then fail one private check and watch the refusal. The web demo runs the contract's checks in the browser and is labelled "Demo · simulated"; the real zero-knowledge proofs are described under Midnight Implementation.

CLOSED BOOK makes the verdict public and keeps the evidence private.

The proof is public. The evidence isn't.

KR

CLOSED BOOK은 AI 모델 릴리스의 안전성 평가 결과를 공개적으로 검증할 수 있게 하면서도, 평가에 사용된 기밀 데이터는 공개하지 않는 privacy-preserving AI safety attestation DApp입니다.

AI 안전성 평가에는 투명성의 역설(transparency paradox)이 있습니다. Red-team suite에는 민감한 테스트 프롬프트, 공격 전략, exploit trace, 모델의 원본 출력, 평가자 메모가 담겨 있습니다. 이를 공개하면 테스트 세트가 노출되고 공격에 쓰일 수 있는 정보가 유출되며, 이후 평가의 가치도 떨어집니다. 반대로 모든 증거를 비공개로 두면 외부에서는 모델이 실제로 릴리스 기준을 충족했는지 확인할 방법이 없습니다.

CLOSED BOOK은 그 사이의 세 번째 선택지입니다.

사용 흐름:
1. 평가자는 정확한 AI 모델 빌드와 기밀 평가 세트를 cryptographic commitment로 고정합니다.
2. 6개 safety check의 개별 결과는 private witness로 제공됩니다.
3. Midnight의 Compact 회로가 평가자가 등록된 평가자인지, 비공개 모델과 평가 세트가 공개 commitment와 일치하는지, 비공개 결과가 공개 release predicate를 충족하는지, 같은 릴리스가 이미 attestation 되지 않았는지를 검증합니다.
4. 모든 조건을 충족하면 검증에 필요한 최소한의 정보만 담은 public attestation이 생성됩니다: model commitment, suite commitment, release predicate, evidence commitment, evaluator key, release key, attestation ID. 각 attestation에는 공유 가능한 receipt 페이지가 있습니다.
5. 비공개 결과가 predicate를 충족하지 못하면(데모에서는 6개 중 하나만 실패해도) attestation은 거부됩니다. 이때 공개 측은 어떤 check가 실패했는지, 어떤 프롬프트가 사용되었는지, 모델이 무엇을 출력했는지, 어떤 exploit이 발견되었는지 알 수 없습니다.

https://closed-book.vercel.app 에서 직접 확인할 수 있습니다. 6/6 attestation을 생성한 뒤 비공개 check 하나를 실패로 바꾸면 attestation이 거부되는 과정을 볼 수 있습니다. 웹 데모는 컨트랙트의 검증 로직을 브라우저에서 실행하며 "Demo · simulated"로 표시됩니다. 실제 zero-knowledge proof는 Midnight 구현 포인트에서 설명합니다.

CLOSED BOOK은 판정(verdict)은 공개하고, 증거(evidence)는 비공개로 유지합니다.

The proof is public. The evidence isn't.

==================================================
MIDNIGHT IMPLEMENTATION · Midnight 구현 포인트
==================================================

EN

CLOSED BOOK uses Midnight and Compact to prove that confidential evaluation data satisfies a public AI release rule, without revealing the evidence. Privacy is not an optional feature here; it is the reason the protocol exists.

Private witness (never written to the public ledger): evaluator secret, model digest, evaluation-suite digest, suite salt, six private safety-check results, evidence salt.

Public data (only what is needed to identify and verify the release claim): evaluator key, model commitment, suite commitment, release predicate and threshold, evidence commitment, release key, attestation ID. Every public value goes through an explicit disclose(), which the Compact compiler enforces.

Before any attestation is recorded, the attest circuit asserts five conditions:
1. Authorized evaluator: the private evaluator secret derives the registered evaluator key.
2. Exact model binding: the private model digest opens the public model commitment.
3. Exact suite binding: the private suite digest and salt open the public suite commitment.
4. Private release predicate: the six private results meet the public threshold (the demo requires 6 of 6).
5. Release uniqueness: the same model, suite and predicate cannot be attested twice.
If any assertion fails, no proof can be produced and nothing is recorded.

Real zero-knowledge evidence: the contract is compiled with Compact 0.31.1 and its ZKIR is committed. Proving keys are generated in CI with the official toolchain; the 19.5 MB prover key is a CI artifact, and its SHA-256 and the 2,119-byte verifier key are committed. The repository contains a real PLONK proof of the 6/6 case from the compiled attest circuit, produced by the official Midnight proof server 8.1.0, and a second one produced by the official WASM prover. A 5/6 witness is rejected by the constraint system itself ("Failed direct assertion"; the proof server returns HTTP 400), and a threshold-5 control shows the predicate is what refuses it. All of this is recorded, reproducibly, in proofs/evidence.json. These proofs are standalone; they are not yet part of a submitted transaction.

Trust boundary: CLOSED BOOK does not claim that the LLM runs inside zero knowledge. The claim is narrower and precise: an authorized evaluator supplied private evaluation data, bound to an exact model build and an exact suite, and that data satisfies the public release predicate. The evaluator is still trusted for the truthfulness of its measurements.

Network status: the Midnight Preprod deploy, attest, public-indexer and network-verification paths are implemented. A public Preprod deployment is not claimed yet, because funding the wallet still requires the faucet's human step. The app therefore keeps Demo, Local Circuit and Network Verified as separate states and cannot show NETWORK VERIFIED without real network evidence.

Without privacy, the confidential test suite is exposed and loses its value. Without verifiability, outsiders must simply trust the evaluator. Midnight lets CLOSED BOOK keep the evidence private while making the release claim verifiable.

KR

CLOSED BOOK은 Midnight와 Compact를 사용해, 기밀 평가 데이터가 공개된 AI 릴리스 규칙을 충족한다는 사실을 증명하면서도 그 증거 자체는 공개하지 않습니다. 이 프로젝트에서 privacy는 부가 기능이 아니라 프로토콜이 존재하는 이유입니다.

Private witness(public ledger에 기록되지 않음): evaluator secret, model digest, evaluation-suite digest, suite salt, 6개의 비공개 safety-check 결과, evidence salt.

공개 데이터(릴리스 주장을 식별하고 검증하는 데 필요한 값만): evaluator key, model commitment, suite commitment, release predicate와 threshold, evidence commitment, release key, attestation ID. 모든 공개 값은 명시적인 disclose()를 거치며, 이는 Compact 컴파일러가 강제합니다.

Attestation이 기록되기 전에 attest 회로는 다섯 가지 조건을 검증합니다.
1. Authorized evaluator: 비공개 evaluator secret에서 등록된 evaluator key가 도출되어야 합니다.
2. Exact model binding: 비공개 model digest가 공개 model commitment와 일치해야 합니다.
3. Exact suite binding: 비공개 suite digest와 salt가 공개 suite commitment와 일치해야 합니다.
4. Private release predicate: 6개의 비공개 결과가 공개 threshold를 충족해야 합니다(데모에서는 6/6 요구).
5. Release uniqueness: 동일한 model, suite, predicate 조합은 두 번 attestation 될 수 없습니다.
하나라도 실패하면 proof를 생성할 수 없고 아무것도 기록되지 않습니다.

실제 zero-knowledge 증거: 컨트랙트는 Compact 0.31.1로 컴파일되었고, 컴파일된 ZKIR이 저장소에 포함되어 있습니다. Proving key는 CI에서 공식 툴체인으로 생성하며, 19.5 MB prover key는 CI artifact로 보관하고 그 SHA-256과 2,119바이트 verifier key는 저장소에 커밋되어 있습니다. 저장소에는 컴파일된 attest 회로로 만든 6/6 케이스의 실제 PLONK proof가 있습니다. 하나는 Midnight 공식 proof server 8.1.0으로, 다른 하나는 공식 WASM prover로 생성했습니다. 5/6 witness는 ZK constraint system 자체에서 거부되며("Failed direct assertion", proof server는 HTTP 400 반환), threshold 5 대조 실험으로 거부의 원인이 predicate임을 확인했습니다. 이 모든 결과는 proofs/evidence.json에 재현 가능한 형태로 기록되어 있습니다. 이 proof들은 standalone proof이며, 아직 트랜잭션으로 제출되지는 않았습니다.

신뢰 경계: CLOSED BOOK은 LLM 추론이 zero knowledge 안에서 실행된다고 주장하지 않습니다. 증명하는 내용은 더 좁고 정확합니다. 승인된 평가자가 제출한 비공개 평가 데이터가 정확한 모델 빌드와 평가 세트에 바인딩되어 있고, 그 데이터가 공개 release predicate를 충족한다는 것입니다. 평가 입력의 진실성에 대해서는 평가자를 여전히 신뢰해야 합니다.

네트워크 상태: Midnight Preprod 배포, attestation, public indexer, network verification 경로는 구현되어 있습니다. 다만 지갑 충전에 faucet의 수동 단계가 남아 있어 공개 Preprod 배포는 아직 주장하지 않습니다. 따라서 앱은 Demo, Local Circuit, Network Verified 상태를 엄격히 분리하며, 실제 네트워크 증거 없이는 NETWORK VERIFIED를 표시할 수 없습니다.

Privacy가 없으면 기밀 테스트 세트가 노출되어 가치를 잃습니다. 검증 가능성이 없으면 외부에서는 평가자를 그냥 믿을 수밖에 없습니다. Midnight 덕분에 CLOSED BOOK은 보호해야 할 증거는 비공개로 유지하면서, 공개되어야 할 릴리스 주장만 검증 가능하게 만듭니다.

==================================================
PROJECT DECK
==================================================

https://docs.google.com/presentation/d/172x6Z9k-bIHHZIV_NlIJjgeDVpKPzW6Q92kdq6mTeqA/edit?usp=sharing

==================================================
DEMO VIDEO
==================================================

https://youtu.be/lVleHwO8s7Y

==================================================
DEMO URL
==================================================

https://closed-book.vercel.app/

==================================================
ACADEMY
==================================================

Explorer: [UPLOAD CERTIFICATE IF AVAILABLE]
Scholar:  [UPLOAD CERTIFICATE IF AVAILABLE]
