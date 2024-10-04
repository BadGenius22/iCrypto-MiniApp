interface TokenConfig {
  [key: number]: string;
}

const tokenConfig: TokenConfig = {
  1: "0x9742Ee81F7D6C0005FB4856660392FE618a941c0", // Replace with actual token address
  // Add more token mappings as needed
};

export const getTokenAddress = (tokenId: number): string => {
  return tokenConfig[tokenId] || "0x0000000000000000000000000000000000000000";
};
