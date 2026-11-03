import { lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import Layout from "./components/Layout";
import About from "./pages/About";
import { loadContact, loadImpact, loadNotFound, loadProducts } from "./routes";

const Products = lazy(loadProducts);
const Impact = lazy(loadImpact);
const Contact = lazy(loadContact);
const NotFound = lazy(loadNotFound);

/** Old per-robot URLs now open the showroom with that robot selected. */
function ToShowroom() {
  const { botId } = useParams();
  return <Navigate to={`/products?bot=${botId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<About />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:botId" element={<ToShowroom />} />
        <Route path="impact" element={<Impact />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
