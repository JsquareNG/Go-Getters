import { Header } from "@/components/ui";

const HomeLayout = ({ children }) => {
  return (
    <>
      <Header />
      <main className="pt-16">{children}</main>
    </>
  );
};

export default HomeLayout;
