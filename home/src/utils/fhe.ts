import type { JsonRpcSigner } from 'ethers';

type DecryptRequest = {
  handle: string;
  contractAddress: string;
};

export async function decryptEuint64(
  instance: any,
  signer: JsonRpcSigner,
  userAddress: string | undefined,
  requests: DecryptRequest[],
): Promise<Record<string, bigint>> {
  if (!instance || !signer || !userAddress || requests.length === 0) {
    return {};
  }

  const keypair = instance.generateKeypair();
  const contracts = Array.from(new Set(requests.map((item) => item.contractAddress)));
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';

  const eip712 = instance.createEIP712(keypair.publicKey, contracts, startTimestamp, durationDays);

  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );

  const response = await instance.userDecrypt(
    requests.map((item) => ({ handle: item.handle, contractAddress: item.contractAddress })),
    keypair.privateKey,
    keypair.publicKey,
    signature.replace('0x', ''),
    contracts,
    userAddress,
    startTimestamp,
    durationDays,
  );

  const values: Record<string, bigint> = {};
  for (const request of requests) {
    const value = response[request.handle];
    if (value !== undefined) {
      values[request.handle] = BigInt(value);
    }
  }

  return values;
}
