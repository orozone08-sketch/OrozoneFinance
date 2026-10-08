import {Routes,Route} from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";
import Advances from "./pages/Advances";
import Parties from "./pages/Parties";
import Ads from "./pages/Ads";
import Reports from "./pages/Reports";
import ImportData from "./pages/ImportData";

export default function App(){return <Routes><Route element={<Layout/>}><Route path="/" element={<Dashboard/>}/><Route path="/expenses" element={<Expenses/>}/><Route path="/income" element={<Income/>}/><Route path="/advances" element={<Advances/>}/><Route path="/parties" element={<Parties/>}/><Route path="/ads" element={<Ads/>}/><Route path="/reports" element={<Reports/>}/><Route path="/import" element={<ImportData/>}/></Route></Routes>}
