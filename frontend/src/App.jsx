import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import PriceComparison from './pages/PriceComparison';
import PriceHistory from './pages/PriceHistory';
import PriceAlerts from './pages/PriceAlerts';
import Coupons from './pages/Coupons';
import Alternatives from './pages/Alternatives';
import BasketOptimizer from './pages/BasketOptimizer';
import HonestyIndex from './pages/HonestyIndex';
import ReviewAnalysis from './pages/ReviewAnalysis';
import TCOAnalysis from './pages/TCOAnalysis';
import PriceForecast from './pages/PriceForecast';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetails />} />
          <Route path="compare" element={<PriceComparison />} />
          <Route path="history" element={<PriceHistory />} />
          <Route path="alerts" element={<PriceAlerts />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="alternatives" element={<Alternatives />} />
          <Route path="basket" element={<BasketOptimizer />} />
          <Route path="honesty" element={<HonestyIndex />} />
          <Route path="reviews" element={<ReviewAnalysis />} />
          <Route path="tco" element={<TCOAnalysis />} />
          <Route path="forecast" element={<PriceForecast />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
