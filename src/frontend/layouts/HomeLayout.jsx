import { Header } from "@/components/ui";

const HomeLayout = ({ children }) => {
  return (
    <>
      <Header />
      {/* Push content below navbar */}
      <main className="pt-16">{children}</main>
    </>
  );
};

export default HomeLayout;
