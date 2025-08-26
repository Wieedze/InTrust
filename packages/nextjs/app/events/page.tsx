"use client";

import type { NextPage } from "next";

// Temporary disabled - migrating to Factory Pattern
const Events: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <div className="text-center mb-8">
          <div className="text-5xl">📊</div>
          <h1 className="text-4xl font-bold">Events Migration</h1>
          <p className="text-2xl mt-3">
            This page is temporarily disabled while we migrate to the new Factory Pattern.
          </p>
          <p className="text-xl mt-2 text-gray-500">Events tracking will be restored for the new universal DEX soon!</p>
        </div>
      </div>
    </div>
  );
};

export default Events;
