declare module "merkletreejs" {
  export class MerkleTree {
    constructor(leaves: Buffer[], hashFunction: Function, options?: any);
    getHexRoot(): string;
    getHexProof(leaf: Buffer): string[];
  }
}
