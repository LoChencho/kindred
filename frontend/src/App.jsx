import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TimelineView from './pages/TimlineView';
import PersonView from './pages/PersonView';
import LocationView from './pages/LocationView';
import FamilyTreeView from './pages/FamilyTreeView';
import Default from './pages/Default';
import axios from 'axios';
const API_URL = 'http://localhost:8000';

function App() {


  return (
    <Router>
      <Routes>
        <Route path="/" element={<Default />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/people" element={<PersonView />} />
        <Route path="/location" element={<LocationView />} />
        <Route path="/family-tree" element={<FamilyTreeView />} />
      </Routes>
    </Router>
  );
}

export default App;
