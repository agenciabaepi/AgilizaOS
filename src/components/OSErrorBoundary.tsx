'use client';

import React, { Component, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary específico para páginas críticas de OS
 * Captura erros JavaScript e fornece fallback com opções de recuperação
 */
export class OSErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 OS Error Boundary capturou erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Chamar callback personalizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log para monitoramento (pode integrar com Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // Aqui você pode integrar com serviços de monitoramento
    // Por enquanto, só console.error detalhado
    console.error('Erro detalhado para monitoramento:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`Tentativa de retry ${this.state.retryCount + 1}/${this.maxRetries}`);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usar ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão com opções de recuperação
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h1>
            
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado nesta página. Não se preocupe, seus dados estão seguros.
            </p>

            {/* Informações do erro (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Detalhes do erro (desenvolvimento):
                </h3>
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Opções de recuperação */}
            <div className="space-y-3">
              {this.state.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente ({this.maxRetries - this.state.retryCount} tentativas restantes)
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Recarregar página
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <FiHome className="w-4 h-4 mr-2" />
                Ir para Dashboard
              </Button>
            </div>

            {/* Informações adicionais */}
            <div className="mt-6 text-xs text-gray-500">
              <p>Se o problema persistir, entre em contato com o suporte.</p>
              <p className="mt-1">
                Código do erro: {this.state.error?.name || 'UNKNOWN'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar Error Boundary com componentes funcionais
 */
export const withOSErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <OSErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </OSErrorBoundary>
  );
  
  WrappedComponent.displayName = `withOSErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default OSErrorBoundary;

import React, { Component, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary específico para páginas críticas de OS
 * Captura erros JavaScript e fornece fallback com opções de recuperação
 */
export class OSErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 OS Error Boundary capturou erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Chamar callback personalizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log para monitoramento (pode integrar com Sentry, LogRocket, etc.)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // Aqui você pode integrar com serviços de monitoramento
    // Por enquanto, só console.error detalhado
    console.error('Erro detalhado para monitoramento:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`Tentativa de retry ${this.state.retryCount + 1}/${this.maxRetries}`);
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback customizado, usar ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão com opções de recuperação
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <FiAlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Ops! Algo deu errado
            </h1>
            
            <p className="text-gray-600 mb-6">
              Ocorreu um erro inesperado nesta página. Não se preocupe, seus dados estão seguros.
            </p>

            {/* Informações do erro (apenas em desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Detalhes do erro (desenvolvimento):
                </h3>
                <p className="text-xs text-red-700 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Opções de recuperação */}
            <div className="space-y-3">
              {this.state.retryCount < this.maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FiRefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente ({this.maxRetries - this.state.retryCount} tentativas restantes)
                </Button>
              )}
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
              >
                <FiRefreshCw className="w-4 h-4 mr-2" />
                Recarregar página
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
              >
                <FiHome className="w-4 h-4 mr-2" />
                Ir para Dashboard
              </Button>
            </div>

            {/* Informações adicionais */}
            <div className="mt-6 text-xs text-gray-500">
              <p>Se o problema persistir, entre em contato com o suporte.</p>
              <p className="mt-1">
                Código do erro: {this.state.error?.name || 'UNKNOWN'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar Error Boundary com componentes funcionais
 */
export const withOSErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <OSErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </OSErrorBoundary>
  );
  
  WrappedComponent.displayName = `withOSErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default OSErrorBoundary;
