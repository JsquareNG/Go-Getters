import { LandingNavBar } from "@/components/ui";

const LandingLayout = ({ children }) => {
  return (
    <>
      <LandingNavBar />
      {/* Push content below navbar */}
      <main className="pt-16">{children}</main>
    </>
  );
};

export default LandingLayout;
