import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

const ADMIN_EMAIL = 'ueservicesllc1@gmail.com';

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user || user.email !== ADMIN_EMAIL) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
