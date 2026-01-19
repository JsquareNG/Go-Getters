import NavBar from "../components/ui/landingNavBar";

const LandingLayout = ({ children }) => {
  return (
    <>
      <NavBar />
      {/* Push content below navbar */}
      <main className="pt-16">
        {children}
      </main>
    </>
  );
};

export default LandingLayout;
