import React from "react";
import VideoGrid from "./_components/VideoGrid";
import HomeCarousel from "./_components/HomeCarousel";

const Home = () => {
  return (
    <div className="flex flex-col w-full items-center justify-center py-2 mt-10">
      <HomeCarousel />

        <VideoGrid />

    </div>
  );
};

export default Home;
