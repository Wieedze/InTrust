"use client";

import type { NextPage } from "next";
import { DexInterface } from "~~/components/DexInterface";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <DexInterface />
    </div>
  );
};

export default Home;
