"use client";
import React from "react";

const Footer = () => {
  return (
    <footer className="w-full text-gray-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-center">
        <p className="text-center sm:text-left">
          &copy; {new Date().getFullYear()} PT. Cipta Mandiri Wirasakti. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
