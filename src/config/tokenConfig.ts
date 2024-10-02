interface TokenConfig {
  [key: number]: string;
}

const tokenConfig: TokenConfig = {
  1: "0x5e6CB7E728E1C320855587E1D9C6F7972ebdD6D5", // Replace with actual token address
  // Add more token mappings as needed
};

export const getTokenAddress = (tokenId: number): string => {
  return tokenConfig[tokenId] || "0x0000000000000000000000000000000000000000";
};
