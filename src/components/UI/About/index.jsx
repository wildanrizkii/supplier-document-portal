"use client";
import React from "react";
import { PiLinkSimpleBold } from "react-icons/pi";
import { RiGithubLine } from "react-icons/ri";
import { LuLinkedin } from "react-icons/lu";
import { MdOutlineMail } from "react-icons/md";

const About = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-light text-gray-900 mb-6 tracking-tight">
            Breakdown Drawings
          </h1>
          <div className="w-24 h-0.5 bg-gray-900 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
            A precision tool for technical drawings management and component
            identification
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-16 mb-20">
          {/* Left Column */}
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">
                Overview
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Breakdown Drawings enables precise part tagging on technical
                blueprints with an intuitive, visual interface designed for
                engineering teams.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Seamlessly manage components, maintain comprehensive parts
                databases, and export data for analysis—all within a clean,
                efficient workflow.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">
                Core Features
              </h2>
              <div className="space-y-3">
                {[
                  "Interactive component tagging",
                  "Comprehensive parts management",
                  "Excel export functionality",
                  "Inventory tracking system",
                  "Responsive interface design",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mr-4"></div>
                    <span className="text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">
                Technology Stack
              </h2>
              <div className="space-y-4">
                {[
                  { name: "Next.js", desc: "React framework" },
                  { name: "Supabase", desc: "Backend platform" },
                  { name: "PostgreSQL", desc: "Database system" },
                  { name: "Tailwind CSS", desc: "Styling framework" },
                ].map((tech, index) => (
                  <div key={index} className="border-l-2 border-zinc-300 pl-4">
                    <div className="font-medium text-gray-900">{tech.name}</div>
                    <div className="text-sm text-gray-500">{tech.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">
                Developer
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                Crafted as a specialized solution for technical teams requiring
                precision in breakdown drawings management and component
                tracking.
              </p>

              {/* Social Links */}
              <div className="flex space-x-6">
                {[
                  {
                    icon: PiLinkSimpleBold,
                    href: "https://wildanrizkii.vercel.app/",
                    label: "Portfolio",
                  },
                  {
                    icon: MdOutlineMail,
                    href: "mailto:wildanrizki9560@gmail.com",
                    label: "Email",
                  },
                  {
                    icon: RiGithubLine,
                    href: "https://github.com/wildanrizkii",
                    label: "GitHub",
                  },
                  {
                    icon: LuLinkedin,
                    href: "https://linkedin.com/in/wildanrizkii",
                    label: "LinkedIn",
                  },
                ].map((social, index) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      target={
                        social.href.startsWith("mailto:") ? "_self" : "_blank"
                      }
                      rel={
                        social.href.startsWith("mailto:")
                          ? ""
                          : "noopener noreferrer"
                      }
                      className="p-3 border border-gray-200 rounded-full hover:border-gray-900 hover:bg-gray-50 transition-all duration-200 group"
                      aria-label={social.label}
                    >
                      <IconComponent
                        size={20}
                        className="text-gray-600 group-hover:text-gray-900 transition-colors"
                      />
                    </a>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Quote Section */}
        <div className="text-center pt-10 border-t border-gray-100">
          <blockquote className="text-lg text-gray-500 font-light italic max-w-md mx-auto">
            "Simplicity is the ultimate sophistication in software design."
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default About;
