import React from 'react'

interface KPIcardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'info' | 'warning' | 'danger' | 'success';
}

const KPIcard: React.FC<KPIcardProps> = ({ 
  title, 
  value, 
  subtitle, 
  variant = 'default' 
}) => {
  return (
    <div className={`kpi-card kpi-${variant}`}>
      <div className="kpi-content">
        <h3 className="kpi-value">{value}</h3>
        <p className="kpi-title">{title}</p>
        {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
      </div>
    </div>
  )
}

export default KPIcard