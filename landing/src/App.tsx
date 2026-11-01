import { FinalCta } from "./components/FinalCta";
import { Footer } from "./components/Footer";
import { GuideSection } from "./components/GuideSection";
import { Hero } from "./components/Hero";
import { QueriesSection } from "./components/QueriesSection";
import { Statement } from "./components/Statement";
import { TopBar } from "./components/TopBar";

export default function App() {
  return (
    <>
      <TopBar />
      <main>
        <Hero />
        <Statement />
        <QueriesSection />
        <GuideSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
