import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Section Components
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import ServiceOptions from "@/components/sections/ServiceOptions";
import Gallery from "@/components/sections/Gallery";
import FAQ from "@/components/sections/FAQ";
import BookCTA from "@/components/sections/BookCTA";
import Footer from "@/components/sections/Footer";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Services />
        <ServiceOptions />
        <Gallery />
        <FAQ />
        <BookCTA />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
