import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./routes/Login";
import Signup from "./routes/Signup";
import Dashboard from "./routes/Dashboard";
import Audience from "./routes/Audience";
import Admin from "./routes/Admin";
import AdminPerformerDetail from "./routes/AdminPerformerDetail";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* default page */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* login */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* performer dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/performer/:uid"
        element={
          <ProtectedRoute>
            <AdminPerformerDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invalid"
        element={
          <h2 style={{ textAlign: "center", fontFamily: "arial, sans-serif" }}>
            Invalid link
          </h2>
        }
      />
      <Route path="/:slug" element={<Audience />} />
    </Routes>
  );
}

export default App;
