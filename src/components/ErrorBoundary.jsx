import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center" dir="rtl">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">משהו השתבש</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                        {this.state.error?.message || 'אירעה שגיאה בטעינת הדף.'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCw size={18} /> נסה שוב
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
