import { SiteHeader } from "../sections/SiteHeader.jsx";
import { HeroSection } from "../sections/HeroSection.jsx";
import { VisualSection } from "../sections/VisualSection.jsx";
import { FeatureScrollSection } from "../sections/FeatureScrollSection.jsx";
import { TestimonialSection } from "../sections/TestimonialSection.jsx";
import { BottomCtaSection } from "../sections/BottomCtaSection.jsx";
import { SiteFooter } from "../sections/SiteFooter.jsx";

export function LandingPage() {
  return (
    <div className="landing-layout">
      <SiteHeader />
      <div className="landing-container">
        <main className="landing-main">
          <HeroSection />
          <VisualSection />
          <FeatureScrollSection />
        </main>
      </div>
      <TestimonialSection />
      <BottomCtaSection />
      <SiteFooter />
    </div>
  );
}
