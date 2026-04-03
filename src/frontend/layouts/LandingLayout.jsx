import { LandingNavBar } from "@/components/ui";
import ScrollToTopButton from "../components/ui/primitives/scrollButton";
import ScrollToTopOnRouteChange from "../components/ui/primitives/scrollToTop";

const LandingLayout = ({ children }) => {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <LandingNavBar />
      {/* Push content below navbar */}
      <main className="pt-16">{children}</main>

      <ScrollToTopButton />
    </>
  );
};

export default LandingLayout;
