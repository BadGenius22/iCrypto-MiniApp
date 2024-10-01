interface TokenConfig {
  [key: number]: string;
}

const tokenConfig: TokenConfig = {
  1: "0x1234567890123456789012345678901234567890", // Replace with actual token address
  // Add more token mappings as needed
};

export const getTokenAddress = (tokenId: number): string => {
  return tokenConfig[tokenId] || "0x0000000000000000000000000000000000000000";
};
