declare module "keccak256" {
  function keccak256(input: string | Buffer): Buffer;
  export = keccak256;
}
