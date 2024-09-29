"use client";
import Footer from "src/components/Footer";
import WalletWrapper from "src/components/WalletWrapper";
import { WEBSITE_LINK } from "src/links";
import { useAccount } from "wagmi";
import LoginButton from "../components/LoginButton";
import SignupButton from "../components/SignupButton";
import TaskSection from "../components/TaskSection";
import Logo from "../components/Logo";
import HeroSection from "../components/HeroSection";
import Leaderboard from "../components/Leaderboard";

export default function Page() {
  const { address } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col">
      <header className="bg-white shadow-md py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a
            href={WEBSITE_LINK}
            title="iCrypto Media"
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            <Logo />
          </a>
          <div className="flex items-center gap-3">
            <SignupButton />
            {!address && <LoginButton />}
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HeroSection />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {address ? (
              <TaskSection
                address={address}
                initialProgress={null} // You might want to fetch this data
              />
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <WalletWrapper
                  className="w-full max-w-md mx-auto"
                  text="Masuk untuk mulai belajar"
                />
              </div>
            )}
          </div>
          <div>
            <Leaderboard />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
