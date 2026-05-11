import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';
import ModalPortal from '../inventory/ModalPortal'; 

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);
  const [editUserId, setEditUserId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editRole, setEditRole] = useState('employee'); // Default mapping from user -> employee
  const [editPassword, setEditPassword] = useState(''); 
  const [deleteLoading, setDeleteLoading] = useState(false); 

  const passwordCriteria = {
    length: editPassword.length >= 8,
    uppercase: /[A-Z]/.test(editPassword),
    lowercase: /[a-z]/.test(editPassword),
    number: /[0-9]/.test(editPassword),
    specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(editPassword),
    noSpaces: !/\s/.test(editPassword)
  }; 

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const pending = data.filter(u => String(u.status).toLowerCase() === 'pending');
      const allOthers = data.filter(u => String(u.status).toLowerCase() !== 'pending');

      setPendingUsers(pending);
      setUsers(allOthers);
    } catch (err) {
      toast.error('Failed to fetch users');
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, approve) => {
    try {
      const newStatus = approve ? 'approved' : 'rejected';
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: newStatus,
          approval_notes: approvalNotes[userId] || '',
          approved_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Database update blocked! You MUST run the SQL RLS policy to allow admins to update profiles.');
        return;
      }

      toast.success(`User ${approve ? 'approved' : 'rejected'} successfully`);
      setApprovalNotes(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setExpandedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('An error occurred updating user status');
      console.error('Approval error:', err);
    }
  };

  const handleNotesChange = (userId, value) => {
    setApprovalNotes(prev => ({
      ...prev,
      [userId]: value
    }));
  };

  const displayUsers = selectedTab === 'pending' ? pendingUsers : users;

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-[#EED2E0] via-[#F5DFE8] to-[#FFE2F0] rounded-lg shadow-[0_4px_8px_rgba(101,54,111,0.2)] p-8 border border-[#D9B5CC]/40">
        <h1 className="text-3xl font-bold text-[#280A4F] mb-2 font-['Satoshi']">User Management</h1>
        <p className="text-[#841c4f] mb-6 font-medium">Manage user accounts and approvals</p>

        <div className="flex gap-4 mb-6 border-b-2 border-[#D9B5CC]">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-6 py-2 font-semibold transition ${
              selectedTab === 'pending'
                ? 'border-b-4 border-[#841c4f] text-[#841c4f] bg-white/50 rounded-t'
                : 'text-[#65366F] hover:text-[#841c4f]'
            }`}
          >
            Pending Users ({pendingUsers.length})
          </button>
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-6 py-2 font-semibold transition ${
              selectedTab === 'all'
                ? 'border-b-4 border-[#841c4f] text-[#841c4f] bg-white/50 rounded-t'
                : 'text-[#65366F] hover:text-[#841c4f]'
            }`}
          >
            All Users ({users.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-[#841c4f]">Loading users...</p>
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#841c4f]">
              {selectedTab === 'pending' 
                ? 'No pending users' 
                : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayUsers.map(user => (
              <div key={user.id} className="border-2 border-[#D9B5CC]/60 rounded-lg bg-white/60 hover:bg-white/80 transition">
                <div
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  className="p-4 cursor-pointer transition flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#280A4F] text-lg">{user.username}</h3>
                      {!user.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200">Disabled</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-2 text-sm">
                      <span className={`px-3 py-1 rounded font-medium capitalize ${
                        String(user.status).toLowerCase() === 'approved'
                          ? 'bg-green-200 text-green-800'
                          : String(user.status).toLowerCase() === 'pending'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-red-200 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                      <span className={`px-3 py-1 rounded font-medium capitalize ${
                        String(user.role || '').toLowerCase() === 'admin'
                          ? 'bg-[#65366F] text-white'
                          : 'bg-[#D9B5CC]/60 text-[#280A4F]'
                      }`}>
                        {String(user.role || '').toLowerCase() === 'user' ? 'Employee' : user.role}
                      </span>
                    </div>
                  </div>
                  <div className="text-[#841c4f] font-bold">
                    {expandedUser === user.id ? '▼' : '▶'}
                  </div>
                </div>

                {expandedUser === user.id && String(user.status).toLowerCase() === 'pending' && (
                  <div className="border-t-2 border-[#D9B5CC]/40 p-4 bg-gradient-to-r from-[#F5DFE8] to-[#FFE2F0]">
                    <label className="block text-sm font-semibold text-[#841c4f] mb-2">
                      Approval Notes (Optional)
                    </label>
                    <textarea
                      value={approvalNotes[user.id] || ''}
                      onChange={(e) => handleNotesChange(user.id, e.target.value)}
                      placeholder="Enter notes for this user..."
                      className="w-full px-3 py-2 border-2 border-[#D9B5CC]/60 rounded-lg focus:outline-none focus:border-[#841c4f] focus:ring-2 focus:ring-[#FFE2F0] mb-4 bg-white/90"
                      rows="3"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(user.id, true)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApprove(user.id, false)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition shadow-md"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
                {selectedTab === 'all' && expandedUser === user.id && (
                  <div className="border-t-2 border-[#D9B5CC]/40 p-4 bg-gradient-to-r from-[#F5DFE8] to-[#FFE2F0] flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setEditUserId(user.id);
                        setEditUsername(user.username);
                        setEditIsActive(user.is_active);
                        // Map 'user' to 'employee' when editing
                        setEditRole(String(user.role || '').toLowerCase() === 'user' ? 'employee' : (user.role || 'employee'));
                        setEditPassword(''); 
                      }}
                      className="px-4 py-2 bg-[#65366F] hover:bg-[#841c4f] text-white rounded-lg font-medium transition shadow-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete user "${user.username}"? This action is irreversible and cannot be undone.`)) return;
                        setDeleteLoading(true);
                        try {
                          const { data, error } = await supabase.rpc('admin_delete_profile', { target_id: user.id });

                          if (error) throw error;
                          if (!data) {
                            throw new Error('No profile row deleted. This may mean you are not an admin or the profile does not exist.');
                          }

                          toast.success(`User "${user.username}" has been deleted successfully`);
                          setEditUserId(null);
                          setExpandedUser(null);
                          setDeleteLoading(false);
                          fetchUsers();
                        } catch (err) {
                          console.error('Delete user error:', err);

                          if (err.message?.includes('RLS') || err.message?.includes('policy')) {
                            toast.error('Delete blocked by RLS policy. Contact your database admin.');
                          } else if (err.message?.includes('foreign key')) {
                            toast.error('Cannot delete user. User has related records. Delete related data first.');
                          } else {
                            toast.error(`Failed to delete user: ${err.message || 'Unknown error'}`);
                          }
                          setDeleteLoading(false);
                        }
                      }}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg font-medium transition shadow-md disabled:cursor-not-allowed"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id).select();
                          if (error) throw error;
                          if (!data || data.length === 0) {
                            toast.error('Database update blocked! Check your RLS policies.');
                            return;
                          }
                          toast.success(user.is_active ? 'User disabled' : 'User re-enabled');
                          fetchUsers();
                        } catch (err) {
                          toast.error('Failed to update user status');
                        }
                      }}
                      className="px-4 py-2 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 rounded-lg font-medium transition shadow-md"
                    >
                      {user.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {editUserId && (
      <ModalPortal>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-gradient-to-br from-[#EED2E0] via-[#F5DFE8] to-[#FFE2F0] rounded-xl p-8 shadow-xl min-w-[320px] sm:min-w-[400px] border-2 border-[#D9B5CC]/60">
          <h3 className="text-2xl font-bold mb-6 text-[#280A4F] font-['Satoshi']">Edit User</h3>
          
          <label className="block text-sm font-semibold text-[#841c4f] mb-2">Username</label>
          <input className="w-full border-2 border-[#D9B5CC]/60 p-3 rounded-lg mb-4 focus:outline-none focus:border-[#841c4f] focus:ring-2 focus:ring-[#FFE2F0] bg-white/90 text-[#280A4F]" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
          
          <label className="block text-sm font-semibold text-[#841c4f] mb-2">Override Password (Optional)</label>
          <input 
            type="text" 
            placeholder="Type new password to override (leave blank to keep current)"
            value={editPassword}
            onChange={e => setEditPassword(e.target.value)}
            className="w-full border-2 border-[#D9B5CC]/60 p-2 rounded-lg mb-4 focus:outline-none focus:border-[#841c4f] focus:ring-2 focus:ring-[#FFE2F0] bg-white/80 text-sm" 
          />
          {editPassword.length > 0 && (
            <div className="mb-4 rounded-2xl border border-[#E0D4EA] bg-[#F9F6FF] p-4 text-sm text-[#4A2B4F]">
              <p className="mb-2 font-semibold text-[#65366F]">Password requirements</p>
              <ul className="space-y-2">
                <li className={`flex items-center gap-2 ${passwordCriteria.length ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                  <span>{passwordCriteria.length ? '✔' : '○'}</span>
                  At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${passwordCriteria.uppercase ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                  <span>{passwordCriteria.uppercase ? '✔' : '○'}</span>
                  Upper and lower case letters
                </li>
                <li className={`flex items-center gap-2 ${passwordCriteria.number ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                  <span>{passwordCriteria.number ? '✔' : '○'}</span>
                  At least one number
                </li>
                <li className={`flex items-center gap-2 ${passwordCriteria.specialChar ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                  <span>{passwordCriteria.specialChar ? '✔' : '○'}</span>
                  At least one special character
                </li>
                <li className={`flex items-center gap-2 ${passwordCriteria.noSpaces ? 'text-emerald-600' : 'text-[#8f5e90]'}`}>
                  <span>{passwordCriteria.noSpaces ? '✔' : '○'}</span>
                  No spaces
                </li>
              </ul>
            </div>
          )}
          
          <label className="block text-sm font-semibold text-[#841c4f] mb-2">Role</label>
          <select className="w-full border-2 border-[#D9B5CC]/60 p-3 rounded-lg mb-4 focus:outline-none focus:border-[#841c4f] focus:ring-2 focus:ring-[#FFE2F0] bg-white/90 text-[#280A4F] font-medium" value={editRole} onChange={e => setEditRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>

          <label className="flex items-center gap-3 mb-6 text-[#841c4f] font-semibold cursor-pointer">
            <input type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} className="w-5 h-5 cursor-pointer accent-[#841c4f]" />
            Active Account
          </label>
          
          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-2 bg-gradient-to-br from-[#841c4f] to-[#65366F] hover:from-[#65366F] hover:to-[#4a2340] text-white rounded-lg font-semibold transition shadow-md"
              onClick={async () => {
                try {
                  const updates = { 
                    username: editUsername, 
                    is_active: editIsActive, 
                    role: editRole 
                  };
                  const { data, error } = await supabase.from('profiles').update(updates).eq('id', editUserId).select();
                  if (error) throw error;
                  if (!data || data.length === 0) {
                    toast.error('Database update blocked! Check your RLS policies.');
                    return;
                  }

                  if (editPassword.trim().length > 0) {
                    if (editPassword.trim().length < 6) {
                      toast.error('Password must be at least 6 characters long.');
                      return;
                    }
                    const failedCriteria = Object.values(passwordCriteria).some((valid) => !valid);
                    if (failedCriteria) {
                      toast.error('Password must meet all requirements: at least 8 characters, include upper and lower case letters, a number, a special character, and contain no spaces.');
                      return;
                    }
                    const { error: passError } = await supabase.rpc('admin_update_user_password', {
                      p_user_id: editUserId,
                      p_new_password: editPassword.trim()
                    });
                    if (passError) throw passError;
                    toast.success('Password successfully overwritten.');
                  }
                  
                  toast.success('User updated successfully');
                  setEditUserId(null);
                  setEditPassword('');
                  fetchUsers();
                } catch (err) {
                  toast.error('Failed to update user');
                  console.error(err);
                }
              }}
            >Save</button>
            <button className="flex-1 px-4 py-2 bg-[#D9B5CC] hover:bg-[#c9a3bb] text-[#280A4F] rounded-lg font-semibold transition shadow-md" onClick={() => { setEditUserId(null); setEditPassword(''); }}>Cancel</button>
          </div>
        </div>
      </div>
      </ModalPortal>
    )}
    </>
  );
};

export default AdminUserManagement;