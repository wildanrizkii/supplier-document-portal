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
            Portal Dokumen CMW
          </h1>
          <div className="w-24 h-0.5 bg-gray-900 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto">
            A comprehensive document management system with automated expiration
            notifications and intelligent monitoring
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
                Portal CMW streamlines document management with intelligent
                upload capabilities and automated expiration monitoring designed
                for organizations requiring strict document compliance.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Stay ahead of critical deadlines with automated email
                notifications, comprehensive document tracking, and seamless
                file management—all within an intuitive, user-friendly
                interface.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-gray-900 mb-6">
                Core Features
              </h2>
              <div className="space-y-3">
                {[
                  "Secure document upload system",
                  "Automated expiration notifications",
                  "Email alert management",
                  "Document tracking & monitoring",
                  "Responsive dashboard interface",
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
                Developed as a specialized solution for organizations requiring
                automated document management with proactive expiration
                monitoring and seamless notification systems.
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
            "Efficiency in document management prevents tomorrow's compliance
            issues."
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default About;
