import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const GroupJoin: React.FC = () => {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/groups/join', {
        join_code: joinCode,
        password,
      });

      await updateUser({ ...user, groupId: response.data._id });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/groups', {
        name: groupName,
        password,
      });

      await updateUser({ ...user, groupId: response.data._id });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="form-container">
        <div className="text-center">
          <h2 className="form-title">Join or Create a Group</h2>
          <p className="mt-2 text-gray-600">
            Connect with your college mates in a private group chat
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mt-8 flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md focus:outline-none ${
              mode === 'join'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:text-gray-500 border'
            }`}
          >
            Join Existing Group
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md focus:outline-none ${
              mode === 'create'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:text-gray-500 border'
            }`}
          >
            Create New Group
          </button>
        </div>

        {error && (
          <div className="form-error mt-4" role="alert">
            {error}
          </div>
        )}

        {mode === 'join' ? (
          <form onSubmit={handleJoinGroup} className="mt-8 space-y-6">
            <div>
              <label htmlFor="join-code" className="block text-sm font-medium text-gray-700">
                Group Join Code
              </label>
              <input
                id="join-code"
                type="text"
                required
                className="input mt-1"
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div>
              <label htmlFor="join-password" className="block text-sm font-medium text-gray-700">
                Group Password
              </label>
              <input
                id="join-password"
                type="password"
                required
                className="input mt-1"
                placeholder="Enter group password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span className="ml-2">Joining...</span>
                </div>
              ) : (
                'Join Group'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateGroup} className="mt-8 space-y-6">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">
                Group Name
              </label>
              <input
                id="group-name"
                type="text"
                required
                className="input mt-1"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="create-password" className="block text-sm font-medium text-gray-700">
                Group Password
              </label>
              <input
                id="create-password"
                type="password"
                required
                className="input mt-1"
                placeholder="Create group password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Share this password with others who want to join your group
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span className="ml-2">Creating...</span>
                </div>
              ) : (
                'Create Group'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default GroupJoin;