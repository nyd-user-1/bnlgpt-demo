import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/layouts/AppLayout";
import Chat from "@/pages/Chat";
import References from "@/pages/References";
import Resources from "@/pages/Resources";
import Endf from "@/pages/Endf";
import Search from "@/pages/Search";
import Features from "@/pages/Features";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Chat />} />
              <Route path="/new-chat" element={<Chat />} />
              <Route path="/c/:sessionId" element={<Chat />} />
              <Route path="/references" element={<References />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/endf" element={<Endf />} />
              <Route path="/search" element={<Search />} />
              <Route path="/features" element={<Features />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
