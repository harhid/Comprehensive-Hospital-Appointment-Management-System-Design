// File: src/App.jsx
import React, { useState } from 'react';
import './App.css';

function RegisterUser({ onRegister, hospitals }) {
  const [userData, setUserData] = useState({
    name: '', gender: '', dob: '', unique_id: '',
    qualifications: '', specializations: '', experience: '',
    role: 'patient', hospital: '', location: '', departments: '',
    consultation_fee: '', slot_date: '', start_time: '', end_time: '',
  });

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedDepartments = userData.departments?.split(',').map(d => d.trim()) || [];
    const normalizedSpecializations = userData.specializations?.split(',').map(s => s.trim()) || [];

    const userWithId = {
      ...userData,
      id: Date.now(),
      departments: normalizedDepartments,
      specializations: normalizedSpecializations,
      slots: [],
      bookings: [],
    };

    if (userData.role === 'doctor') {
      const selectedHospital = hospitals.find(h => h.name === userData.hospital);
      const deptMatch = selectedHospital?.departments?.some(dept =>
        normalizedSpecializations.map(s => s.toLowerCase()).includes(dept.toLowerCase())
      );
      if (!selectedHospital || !deptMatch) {
        alert('Invalid hospital or mismatched specialization/department.');
        return;
      }

      const doctor = hospitals.flatMap(h => h.doctors || []).find(d => d.unique_id === userData.unique_id);
      const newStart = new Date(`${userData.slot_date}T${userData.start_time}`);
      const newEnd = new Date(`${userData.slot_date}T${userData.end_time}`);

      if (doctor && doctor.slots?.some(slot => {
        const slotStart = new Date(`${slot.date}T${slot.start_time}`);
        const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
        return newStart < slotEnd && newEnd > slotStart;
      })) {
        alert('Slot overlaps with an existing one.');
        return;
      }

      userWithId.slots.push({
        id: `${Date.now()}-slot`,
        date: userData.slot_date,
        start_time: userData.start_time,
        end_time: userData.end_time,
        fee: userData.consultation_fee,
        hospital: userData.hospital,
      });
    }

    onRegister(userWithId);
    alert('User registered successfully');
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2>Register User</h2>
      <input name="name" placeholder="Name" className="input" onChange={handleChange} />
      <input name="gender" placeholder="Gender" className="input" onChange={handleChange} />
      <input type="date" name="dob" className="input" onChange={handleChange} />
      <input name="unique_id" placeholder="Unique ID" className="input" onChange={handleChange} />
      <select name="role" className="input" onChange={handleChange}>
        <option value="admin">Admin</option>
        <option value="doctor">Doctor</option>
        <option value="patient">Patient</option>
      </select>
      {userData.role === 'doctor' && (
        <>
          <input name="qualifications" placeholder="Qualifications" className="input" onChange={handleChange} />
          <input name="specializations" placeholder="Specializations (comma separated)" className="input" onChange={handleChange} />
          <input name="experience" placeholder="Experience" className="input" onChange={handleChange} />
          <input name="hospital" placeholder="Hospital" className="input" onChange={handleChange} />
          <input name="consultation_fee" placeholder="Fee" className="input" onChange={handleChange} />
          <input type="date" name="slot_date" className="input" onChange={handleChange} />
          <input type="time" name="start_time" className="input" onChange={handleChange} />
          <input type="time" name="end_time" className="input" onChange={handleChange} />
        </>
      )}
      {userData.role === 'admin' && (
        <>
          <input name="hospital" placeholder="Hospital Name" className="input" onChange={handleChange} />
          <input name="location" placeholder="Location" className="input" onChange={handleChange} />
          <input name="departments" placeholder="Departments (comma separated)" className="input" onChange={handleChange} />
        </>
      )}
      <button type="submit" className="btn btn-primary">Register</button>
    </form>
  );
}

function UserList({ users }) {
  return (
    <div className="card">
      <h3>Registered Users</h3>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            ID: {u.id} | Name: {u.name} | Role: {u.role}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  const handleRegister = (userWithId) => {
    setUsers(prev => [...prev, userWithId]);
  };

  return (
    <div className="container">
      <RegisterUser onRegister={handleRegister} hospitals={
        users.filter(u => u.role === 'admin').map(admin => ({
          name: admin.hospital,
          location: admin.location,
          departments: admin.departments,
          doctors: users.filter(d => d.role === 'doctor' && d.hospital === admin.hospital)
        }))
      } />
      <UserList users={users} />
      <hr />
      <input
        className="input"
        placeholder="Enter User ID to View Dashboard"
        onChange={e => setCurrentUserId(e.target.value)}
      />
      {currentUserId && (
        <DashboardSelector users={users} currentUserId={currentUserId} />
      )}
    </div>
  );
}

function DashboardSelector({ users, currentUserId }) {
  const user = users.find(u => u.id === parseInt(currentUserId));
  if (!user) return <p>No user selected</p>;

  if (user.role === 'admin') {
    const hospital = user.hospital;
    const doctors = users.filter(u => u.role === 'doctor' && u.hospital === hospital);
    let totalConsultations = 0;
    let totalRevenue = 0;
    const revenueByDoctor = {};
    const revenueByDepartment = {};

    doctors.forEach(doc => {
      doc.slots.forEach(slot => {
        const bookings = users.filter(u => u.role === 'patient' && u.bookings?.some(b => b.slotId === slot.id));
        const fee = parseFloat(slot.fee || 0);
        const count = bookings.length;
        totalConsultations += count;
        totalRevenue += count * fee;
        revenueByDoctor[doc.name] = (revenueByDoctor[doc.name] || 0) + (count * fee);

        doc.specializations.forEach(dept => {
          revenueByDepartment[dept] = (revenueByDepartment[dept] || 0) + (count * fee);
        });
      });
    });

    return (
      <div className="card">
        <h2>Admin Dashboard - {hospital}</h2>
        <p>Total Consultations: {totalConsultations}</p>
        <p>Total Revenue: ₹{totalRevenue}</p>
        <h4>Revenue by Doctor:</h4>
        <ul>
          {Object.entries(revenueByDoctor).map(([name, rev]) => (
            <li key={name}>{name}: ₹{rev}</li>
          ))}
        </ul>
        <h4>Revenue by Department:</h4>
        <ul>
          {Object.entries(revenueByDepartment).map(([dept, rev]) => (
            <li key={dept}>{dept}: ₹{rev}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (user.role === 'doctor') {
    const consultations = users.filter(u => u.role === 'patient').flatMap(p => p.bookings || []).filter(b => b.doctorId === user.id);
    const earningsByHospital = {};
    let totalEarnings = 0;

    consultations.forEach(b => {
      totalEarnings += b.amount * 0.6;
      earningsByHospital[b.hospital] = (earningsByHospital[b.hospital] || 0) + (b.amount * 0.6);
    });

    return (
      <div className="card">
        <h2>Doctor Dashboard - {user.name}</h2>
        <p>Total Consultations: {consultations.length}</p>
        <p>Total Earnings: ₹{totalEarnings.toFixed(2)}</p>
        <h4>Earnings by Hospital:</h4>
        <ul>
          {Object.entries(earningsByHospital).map(([h, amt]) => (
            <li key={h}>{h}: ₹{amt.toFixed(2)}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (user.role === 'patient') {
    return (
      <div className="card">
        <h2>Patient History - {user.name}</h2>
        <ul>
          {(user.bookings || []).map((b, i) => (
            <li key={i}>
              Doctor ID: {b.doctorId}, Hospital: {b.hospital}, Date: {b.date}, Time: {b.time}, Fee: ₹{b.amount}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

export default App;
export { RegisterUser, DashboardSelector };
