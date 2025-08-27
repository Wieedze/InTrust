"use client";

import type { NextPage } from "next";
import { UniversalDex } from "~~/components/UniversalDex";

const Home: NextPage = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <UniversalDex />
    </div>
  );
};

export default Home;
