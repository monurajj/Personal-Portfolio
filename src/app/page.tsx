import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Projects } from "@/components/sections/Projects";
import { Monadnocks } from "@/components/sections/Monadnocks";
import { Skills } from "@/components/sections/Skills";
import { BeyondTech } from "@/components/sections/BeyondTech";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Monadnocks />
      <Skills />
      <BeyondTech />
      <Contact />
    </>
  );
}
