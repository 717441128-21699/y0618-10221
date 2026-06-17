import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import ControlCharts from "@/pages/ControlCharts";
import Capability from "@/pages/Capability";
import Pareto from "@/pages/Pareto";
import Comparison from "@/pages/Comparison";
import Reports from "@/pages/Reports";
import ReportPreview from "@/pages/ReportPreview";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="control-charts" element={<ControlCharts />} />
          <Route path="capability" element={<Capability />} />
          <Route path="pareto" element={<Pareto />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:reportId" element={<ReportPreview />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
