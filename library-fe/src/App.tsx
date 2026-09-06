import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import BooksPage from "./pages/BooksPage";
import MembersPage from "./pages/MembersPage";
import BorrowingsPage from "./pages/BorrowingsPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/books" replace />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/borrowings" element={<BorrowingsPage />} />
        <Route path="*" element={<Navigate to="/books" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
