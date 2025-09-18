import React, { useState } from 'react';
import { useAuth } from './auth-provider';

export function AuthButton() {
  const { user, loading, login, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (loading) {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded cursor-not-allowed">
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {user.profilePicture && (
            <img 
              src={user.profilePicture} 
              alt={user.displayName || user.email} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-left">
            <div className="font-medium text-gray-900">{user.displayName || 'User'}</div>
            <div className="text-xs text-gray-600">{user.email}</div>
            {user.role !== 'user' && (
              <div className="text-xs text-blue-600 font-medium uppercase">
                {user.role.replace('_', ' ')}
              </div>
            )}
          </div>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {user.profilePicture && (
                  <img 
                    src={user.profilePicture} 
                    alt={user.displayName || user.email} 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <div className="font-medium text-gray-900">{user.displayName || 'User'}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  {user.role !== 'user' && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {user.role.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Add profile/settings action here if needed
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Profile Settings
              </button>
              
              {user.role === 'super_admin' && (
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Add admin panel action here
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Admin Panel
                </button>
              )}
              
              <hr className="my-2" />
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      Login with Google
    </button>
  );
}