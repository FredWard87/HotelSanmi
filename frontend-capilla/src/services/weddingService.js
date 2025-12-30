import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export async function createVisit(payload) {
  const res = await axios.post(`${API}/api/weddings/appointments`, payload);
  return res.data;
}

export async function listVisits() {
  const res = await axios.get(`${API}/api/weddings/appointments`, authHeaders());
  return res.data;
}

export async function getVisit(id) {
  const res = await axios.get(`${API}/api/weddings/appointments/${id}`, authHeaders());
  return res.data;
}

export async function updateVisit(id, payload) {
  const res = await axios.put(`${API}/api/weddings/appointments/${id}`, payload, authHeaders());
  return res.data;
}

export async function deleteVisit(id) {
  const res = await axios.delete(`${API}/api/weddings/appointments/${id}`, authHeaders());
  return res.data;
}

export async function updateVisitStatus(id, status) {
  const res = await axios.patch(`${API}/api/weddings/appointments/${id}/status`, { status }, authHeaders());
  return res.data;
}
