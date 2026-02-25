// components/PurchaseOrderForm/PurchaseOrderErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class PurchaseOrderErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('PurchaseOrder Error:', error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="p-4 border border-[var(--accent-red-dark)] bg-[var(--accent-red-light)] rounded-md">
                    <h3 className="text-sm font-medium text-[var(--danger-color)] mb-2">
                        Something went wrong
                    </h3>
                    <p className="text-xs text-[var(--danger-color)]">
                        Please refresh the page or try again later.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default PurchaseOrderErrorBoundary;