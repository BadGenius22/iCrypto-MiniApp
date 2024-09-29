import React from "react";
import Image from "next/image";

const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-12 w-auto">
      <Image
        src="/icrypto.png"
        alt="iCrypto Logo"
        width={160}
        height={160}
        className="object-contain"
      />
    </div>
  );
};

export default Logo;
